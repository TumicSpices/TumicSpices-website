import { getAllOrders, getOrderById, saveOrder, updateOrderOdooStatus, updateOrderWhatsAppStatus, updateOrderStatus } from './ordersStore.js';
import { syncOrderToOdoo, fetchOdooOrders, updateOdooOrderStatus, isOdooConfigured, getOdooConfig, testOdooConnection, updateEnvFile } from './odoo.js';
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

function getAdminSecretPin() {
  getOdooConfig(); // Ensures .env is parsed if available
  return (process.env.ADMIN_SECRET_PIN || '8604').trim();
}

function verifyAdminAuth(req) {
  const adminPin = getAdminSecretPin();
  const authHeader = req.headers?.['authorization'] || '';
  const pinHeader = req.headers?.['x-admin-pin'] || '';

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token && token === adminPin) return true;
  }

  if (pinHeader && pinHeader.trim() === adminPin) return true;
  if (req.query?.pin && req.query.pin.trim() === adminPin) return true;

  return false;
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
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-pin');
      return res.end();
    }

    // 0. Admin PIN Verification Endpoint
    if (req.method === 'POST' && pathname === '/api/admin/verify') {
      try {
        const body = await parseRequestBody(req);
        const pin = String(body.pin || '').trim();
        const adminPin = getAdminSecretPin();

        if (pin && pin === adminPin) {
          return sendJson(res, 200, {
            success: true,
            authenticated: true,
            message: 'Admin authorization successful.'
          });
        }
        return sendJson(res, 401, {
          success: false,
          authenticated: false,
          error: 'Invalid Admin Secret PIN.'
        });
      } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
      }
    }

    // 1. Health check & Odoo status (Protected details: sensitive URLs & usernames only visible to authenticated admins)
    if (req.method === 'GET' && pathname === '/api/odoo/status') {
      const isAuthorized = verifyAdminAuth(req);
      const config = getOdooConfig();
      const waConfig = getWhatsAppConfig();

      const responseData = {
        status: 'online',
        odooConfigured: isOdooConfigured()
      };

      if (isAuthorized) {
        responseData.hasUrl = Boolean(config.url && config.url !== 'https://your-instance.odoo.com');
        responseData.hasDb = Boolean(config.db);
        responseData.hasUsername = Boolean(config.username);
        responseData.hasApiKey = Boolean(config.apiKey);
        responseData.odooUrl = config.url !== 'https://your-instance.odoo.com' ? config.url : '';
        responseData.odooDb = config.db;
        responseData.odooUsername = config.username;
        responseData.whatsappConfigured = isWhatsAppConfigured();
        responseData.whatsappRecipient = waConfig.recipientPhone ? `+${waConfig.recipientPhone}` : '';
        responseData.environment = process.env.NODE_ENV || 'production';
      }

      return sendJson(res, 200, responseData);
    }

    // 2. Admin Test Connection with Odoo Enterprise Instance (Protected)
    if (req.method === 'GET' && pathname === '/api/odoo/test-connection') {
      if (!verifyAdminAuth(req)) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized: Admin authorization required.' });
      }
      try {
        const result = await testOdooConnection();
        return sendJson(res, result.connected ? 200 : 400, result);
      } catch (err) {
        return sendJson(res, 500, { connected: false, error: err.message });
      }
    }

    // 3. Save Odoo Config Endpoint (Admin-only server-side update) (Protected)
    if (req.method === 'POST' && pathname === '/api/odoo/save-config') {
      if (!verifyAdminAuth(req)) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized: Admin authorization required.' });
      }
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
        
        console.log(`[API /api/orders/create] Order #${orderId} received. Items count: ${orderData.items?.length || 0}. Odoo configured: ${isOdooConfigured()}`);

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
          console.warn(`[API] ODOO SYNC SKIPPED for Order #${orderId}: ODOO_API_KEY environment variable is not configured in Vercel.`);
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
          adminEmailSent: Boolean(odooResult.adminEmailSent),
          adminEmailRecipient: odooResult.adminEmailRecipient || null,
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

        const digitsQuery = query.replace(/\D/g, '');
        const isPhoneSearch = digitsQuery.length >= 6;

        const matchOrder = (o) => {
          const matchId = o.id && o.id.toLowerCase().replace(/#/g, '').trim() === query;
          const matchInv = o.odooInvoiceName && o.odooInvoiceName.toLowerCase().replace(/#/g, '').trim() === query;
          const phoneDigits = o.customer?.phone ? o.customer.phone.replace(/\D/g, '') : '';
          const matchPhone = isPhoneSearch && phoneDigits && (phoneDigits === digitsQuery || phoneDigits.endsWith(digitsQuery));
          return Boolean(matchId || matchInv || matchPhone);
        };

        const orders = getAllOrders();
        let found = orders.find(matchOrder);

        if (!found && isOdooConfigured()) {
          try {
            const odooOrders = await fetchOdooOrders(50);
            found = odooOrders.find(matchOrder);
          } catch (e) {}
        }

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

    // 5. Admin Orders List (Protected & Real-time Odoo Sync)
    if (req.method === 'GET' && pathname === '/api/admin/orders') {
      if (!verifyAdminAuth(req)) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized: Admin authorization required.' });
      }
      try {
        const localOrders = getAllOrders();
        let odooOrders = [];
        try {
          odooOrders = await fetchOdooOrders(100);
        } catch (oe) {
          console.warn('[API /api/admin/orders] Odoo fetch warning:', oe.message);
        }

        // Merge without duplicates: Odoo records + any local-only pending orders
        const ordersMap = new Map();

        // 1. Add Odoo orders first (Cloud Source of Truth)
        odooOrders.forEach(o => {
          if (o.id) ordersMap.set(o.id.toLowerCase(), o);
          if (o.odooInvoiceName) ordersMap.set(o.odooInvoiceName.toLowerCase(), o);
          if (o.odooInvoiceId) ordersMap.set(`odoo_inv_${o.odooInvoiceId}`, o);
        });

        // 2. Add or enrich with local orders
        localOrders.forEach(lo => {
          const key1 = lo.id ? lo.id.toLowerCase() : null;
          const key2 = lo.odooInvoiceName ? lo.odooInvoiceName.toLowerCase() : null;
          const key3 = lo.odooInvoiceId ? `odoo_inv_${lo.odooInvoiceId}` : null;

          const existing = (key1 && ordersMap.get(key1)) || (key2 && ordersMap.get(key2)) || (key3 && ordersMap.get(key3));
          if (existing) {
            if (lo.customer?.phone && !existing.customer?.phone) existing.customer.phone = lo.customer.phone;
            if (lo.customer?.address && !existing.customer?.address) existing.customer.address = lo.customer.address;
            if (lo.customer?.pin && !existing.customer?.pin) existing.customer.pin = lo.customer.pin;
            if (lo.paymentMethod) existing.paymentMethod = lo.paymentMethod;
            if (lo.items && lo.items.length > 0 && (!existing.items || existing.items.length === 0)) existing.items = lo.items;
          } else {
            ordersMap.set(key1 || `local_${Date.now()}_${Math.random()}`, lo);
          }
        });

        const unifiedOrders = Array.from(new Set(ordersMap.values())).sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || 0).getTime();
          return dateB - dateA;
        });

        return sendJson(res, 200, {
          success: true,
          total: unifiedOrders.length,
          odooConfigured: isOdooConfigured(),
          orders: unifiedOrders
        });
      } catch (err) {
        console.error('[API /api/admin/orders] Error:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // 6. Admin Retry Odoo Sync (Protected)
    if (req.method === 'POST' && pathname === '/api/admin/orders/retry-sync') {
      if (!verifyAdminAuth(req)) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized: Admin authorization required.' });
      }
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

    // 7. Admin Update Order Lifecycle Status (Protected & Persisted in Odoo 19)
    if (req.method === 'POST' && pathname === '/api/admin/orders/update-status') {
      if (!verifyAdminAuth(req)) {
        return sendJson(res, 401, { success: false, error: 'Unauthorized: Admin authorization required.' });
      }
      try {
        const body = await parseRequestBody(req);
        const { orderId, odooInvoiceId, status } = body;

        if (!status) {
          return sendJson(res, 400, { success: false, error: 'status is required' });
        }

        const validStatuses = ['Pending Confirmation', 'Confirmed', 'Getting Shipped', 'Shipped', 'Delivered', 'Cancelled'];
        const matchedStatus = validStatuses.find(s => s.toLowerCase() === String(status).trim().toLowerCase());

        if (!matchedStatus) {
          return sendJson(res, 400, {
            success: false,
            error: `Invalid status. Allowed statuses: ${validStatuses.join(', ')}`
          });
        }

        let updatedOdoo = null;
        let invoiceIdToUpdate = odooInvoiceId;

        // If invoice ID wasn't provided, look it up in Odoo
        if (!invoiceIdToUpdate && orderId && isOdooConfigured()) {
          try {
            const odooOrders = await fetchOdooOrders(50);
            const found = odooOrders.find(o => o.id === orderId || (o.odooInvoiceName && o.odooInvoiceName === orderId));
            if (found && found.odooInvoiceId) {
              invoiceIdToUpdate = found.odooInvoiceId;
            }
          } catch (oe) {}
        }

        if (invoiceIdToUpdate) {
          updatedOdoo = await updateOdooOrderStatus(invoiceIdToUpdate, matchedStatus);
        }

        if (orderId) {
          updateOrderStatus(orderId, matchedStatus);
        }

        console.log(`[API /api/admin/orders/update-status] Order #${orderId || invoiceIdToUpdate} updated to "${matchedStatus}". Odoo result:`, updatedOdoo?.success);

        return sendJson(res, 200, {
          success: true,
          orderId: orderId || `INV-${invoiceIdToUpdate}`,
          odooInvoiceId: invoiceIdToUpdate || null,
          status: matchedStatus,
          odooPersisted: Boolean(updatedOdoo?.success)
        });
      } catch (err) {
        console.error('[API /api/admin/orders/update-status] Error:', err);
        return sendJson(res, 500, { success: false, error: err.message });
      }
    }

    // Fallthrough to Vite static / dev server
    next();
  };
}
