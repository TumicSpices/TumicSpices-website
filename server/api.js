import { getAllOrders, getOrderById, saveOrder, updateOrderOdooStatus, updateOrderWhatsAppStatus } from './ordersStore.js';
import { syncOrderToOdoo, isOdooConfigured, getOdooConfig, testOdooConnection, updateEnvFile } from './odoo.js';
import { sendOrderWhatsAppNotification, isWhatsAppConfigured, getWhatsAppConfig } from './whatsapp.js';

function parseRequestBody(req) {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) {
      try {
        const str = req.body.toString('utf-8');
        return Promise.resolve(str ? JSON.parse(str) : {});
      } catch (err) {
        return Promise.resolve({});
      }
    }
    if (typeof req.body === 'object') {
      return Promise.resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(JSON.parse(req.body));
      } catch (err) {
        return Promise.resolve({});
      }
    }
  }
  if (req.readableEnded || req.complete) {
    return Promise.resolve({});
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON request body'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(statusCode).json(data);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.end(JSON.stringify(data));
}

export function createApiMiddleware() {
  return async function apiMiddleware(req, res, next) {
    // Extract pathname safely across local Vite Connect, Vercel Serverless, and Proxies
    let rawPath = req.headers?.['x-matched-path'] || req.headers?.['x-forwarded-url'] || req.originalUrl || req.url || '/';
    
    // In Vercel rewrites, destination could be /api/index.js or /api/index
    if (rawPath.startsWith('/api/index.js') || rawPath.startsWith('/api/index') || rawPath === '/api') {
      if (req.headers?.['x-matched-path']) {
        rawPath = req.headers['x-matched-path'];
      } else if (req.query?.slug) {
        const slug = Array.isArray(req.query.slug) ? req.query.slug.join('/') : req.query.slug;
        rawPath = `/api/${slug}`;
      }
    }

    const host = req.headers?.['x-forwarded-host'] || req.headers?.host || 'localhost';
    const parsedUrl = new URL(rawPath.startsWith('/') ? `http://${host}${rawPath}` : rawPath);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;

    // Handle CORS preflight
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.end();
    }

    // 1. Health check, Odoo & WhatsApp Config Status (Safe - Zero Secret Exposure)
    if (req.method === 'GET' && pathname === '/api/odoo/status') {
      const config = getOdooConfig();
      const waConfig = getWhatsAppConfig();
      return sendJson(res, 200, {
        status: 'online',
        odooConfigured: isOdooConfigured(),
        hasUrl: Boolean(config.url && config.url !== 'https://your-instance.odoo.com'),
        hasDb: Boolean(config.db),
        hasUsername: Boolean(config.username),
        hasApiKey: Boolean(config.apiKey),
        odooUrl: config.url !== 'https://your-instance.odoo.com' ? config.url : '',
        odooDb: config.db,
        odooUsername: config.username,
        whatsappConfigured: isWhatsAppConfigured(),
        whatsappRecipient: waConfig.recipientPhone ? `+${waConfig.recipientPhone}` : '',
        environment: process.env.NODE_ENV || 'development'
      });
    }

    // 2. Phase 1 Test Function: Test Connection with Odoo Enterprise Instance
    if (req.method === 'GET' && pathname === '/api/odoo/test-connection') {
      try {
        const result = await testOdooConnection();
        return sendJson(res, result.connected ? 200 : 400, result);
      } catch (err) {
        return sendJson(res, 500, { connected: false, error: err.message });
      }
    }

    // 3. Save Odoo Config Endpoint (Admin setup - server-side .env update)
    if (req.method === 'POST' && pathname === '/api/odoo/save-config') {
      try {
        const body = await parseRequestBody(req);
        const { odooUrl, odooDb, odooUsername, odooApiKey } = body;

        const updates = {};
        if (odooUrl) updates.ODOO_URL = odooUrl.trim();
        if (odooDb) updates.ODOO_DB = odooDb.trim();
        if (odooUsername) updates.ODOO_USERNAME = odooUsername.trim();
        if (odooApiKey) updates.ODOO_API_KEY = odooApiKey.trim();

        updateEnvFile(updates);

        // Run connection test immediately
        const testRes = await testOdooConnection();

        // If connected, sync any existing pending orders
        if (testRes.connected) {
          const orders = getAllOrders();
          for (const ord of orders) {
            if (ord.odooSyncStatus !== 'synced') {
              try {
                const sRes = await syncOrderToOdoo(ord);
                updateOrderOdooStatus(ord.id, sRes);
              } catch (e) {}
            }
          }
        }

        return sendJson(res, 200, {
          success: true,
          connectionTest: testRes
        });
      } catch (err) {
        console.error('[API /api/odoo/save-config] Error:', err);
        return sendJson(res, 400, { success: false, error: err.message });
      }
    }

    // 4. Customer Order Creation Endpoint
    if (req.method === 'POST' && pathname === '/api/orders/create') {
      try {
        const orderData = await parseRequestBody(req);

        // Comprehensive validation
        if (!orderData.items || orderData.items.length === 0) {
          return sendJson(res, 400, { success: false, error: 'Your cart is empty. Please add spice products before checking out.' });
        }

        const cust = orderData.customer || {};
        if (!cust.name || cust.name.trim().length <= 2) {
          return sendJson(res, 400, { success: false, error: 'Full customer name is required (minimum 3 characters).' });
        }
        
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!cust.phone || !phoneRegex.test(cust.phone.replace(/\D/g, ''))) {
          return sendJson(res, 400, { success: false, error: 'Please enter a valid 10-digit Indian mobile number.' });
        }
        
        if (!cust.address || cust.address.trim().length <= 10) {
          return sendJson(res, 400, { success: false, error: 'Complete delivery address is required (minimum 10 characters).' });
        }
        
        if (!cust.city || cust.city.trim().length <= 2) {
          return sendJson(res, 400, { success: false, error: 'Delivery city is required.' });
        }
        
        const pinRegex = /^\d{6}$/;
        if (!cust.pin || !pinRegex.test(cust.pin.trim())) {
          return sendJson(res, 400, { success: false, error: 'Please enter a valid 6-digit Indian PIN code.' });
        }

        // Generate Order ID if not supplied
        const orderId = orderData.id || `TUMIC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        
        const initialOrder = {
          ...orderData,
          id: orderId,
          odooSyncStatus: isOdooConfigured() ? 'pending' : 'not_configured',
          paymentStatus: orderData.paymentStatus || (orderData.paymentMethod?.includes('Cash') ? 'unpaid' : 'pending'),
          orderStatus: 'Confirmed',
          createdAt: new Date().toISOString()
        };

        // 1. Persist order locally first
        const saved = saveOrder(initialOrder);

        // 2. Synchronize to Odoo Enterprise (Customer -> Customer Invoice -> action_post)
        let odooResult = { success: false, error: 'Odoo not configured' };
        if (isOdooConfigured()) {
          console.log(`[API] Triggering Odoo sync for Order #${orderId}...`);
          odooResult = await syncOrderToOdoo(saved);
          updateOrderOdooStatus(orderId, odooResult);
        } else {
          console.log(`[API] Odoo credentials not configured in .env; saved order #${orderId} locally.`);
        }

        const orderWithOdoo = getOrderById(orderId) || saved;

        // 3. Dispatch WhatsApp order notification via official Meta WhatsApp Cloud API
        // Non-blocking: failures are logged and recorded, but never roll back or cancel the order
        let waResult = { sent: false, error: 'WhatsApp not configured' };
        try {
          waResult = await sendOrderWhatsAppNotification(orderWithOdoo);
          updateOrderWhatsAppStatus(orderId, waResult);
        } catch (waErr) {
          console.error(`[API] WhatsApp notification dispatch error for Order #${orderId}:`, waErr.message);
          waResult = { sent: false, error: waErr.message };
          updateOrderWhatsAppStatus(orderId, waResult);
        }

        const finalOrder = getOrderById(orderId) || orderWithOdoo;

        return sendJson(res, 200, {
          success: true,
          order: finalOrder,
          odooSynced: odooResult.success,
          odooSalesOrder: odooResult.salesOrderName || null,
          odooInvoice: odooResult.invoiceName || odooResult.invoiceNumber || null,
          odooError: odooResult.success ? null : odooResult.error,
          odooEmailSent: Boolean(odooResult.emailSent),
          odooEmailError: odooResult.emailError || null,
          whatsappSent: Boolean(waResult.sent),
          whatsappMessageId: waResult.messageId || null,
          whatsappError: waResult.sent ? null : waResult.error
        });
      } catch (err) {
        console.error('[API /api/orders/create] Error:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // 5. Order Status Lookup Endpoint (For Customers & Tracking)
    if (req.method === 'GET' && pathname === '/api/orders/lookup') {
      try {
        const queryParam = searchParams.get('query') || (req.query && req.query.query) || '';
        const query = queryParam.toLowerCase().trim().replace(/#/g, '');
        if (!query) {
          return sendJson(res, 400, { success: false, error: 'Please enter an Order ID or Mobile Number.' });
        }

        const orders = getAllOrders();
        const found = orders.find(o => 
          (o.id && o.id.toLowerCase().includes(query)) ||
          (o.customer?.phone && o.customer.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))) ||
          (o.odooInvoiceName && o.odooInvoiceName.toLowerCase().includes(query))
        );

        if (!found) {
          return sendJson(res, 404, { success: false, error: `No order found matching "${query}". Please check the Order ID or phone number.` });
        }

        return sendJson(res, 200, {
          success: true,
          order: found
        });
      } catch (err) {
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // 5. Admin Orders List
    if (req.method === 'GET' && pathname === '/api/admin/orders') {
      try {
        const orders = getAllOrders();
        return sendJson(res, 200, {
          success: true,
          total: orders.length,
          odooConfigured: isOdooConfigured(),
          orders: orders
        });
      } catch (err) {
        console.error('[API /api/admin/orders] Error:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // 6. Admin Retry Odoo Sync
    if (req.method === 'POST' && pathname === '/api/admin/orders/retry-sync') {
      try {
        const body = await parseRequestBody(req);
        const { orderId } = body;

        if (!orderId) {
          return sendJson(res, 400, { success: false, error: 'orderId is required' });
        }

        const order = getOrderById(orderId);
        if (!order) {
          return sendJson(res, 404, { success: false, error: `Order ${orderId} not found` });
        }

        console.log(`[API] Admin retrying Odoo sync for Order #${orderId}...`);
        const odooResult = await syncOrderToOdoo(order);
        const updated = updateOrderOdooStatus(orderId, odooResult);

        return sendJson(res, 200, {
          success: odooResult.success,
          order: updated,
          odooError: odooResult.success ? null : odooResult.error,
          odooEmailSent: Boolean(odooResult.emailSent),
          odooEmailError: odooResult.emailError || null
        });
      } catch (err) {
        console.error('[API /api/admin/orders/retry-sync] Error:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // Fallthrough to Vite static / dev server
    next();
  };
}
