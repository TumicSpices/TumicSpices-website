import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In Vercel serverless / AWS Lambda, use os.tmpdir(), otherwise local server/data
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_VERSION || process.env.LAMBDA_TASK_ROOT);
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'tumic-data') : path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

// In-memory fallback cache
let memoryOrders = [];

// Ensure data directory and orders.json exist
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(ORDERS_FILE)) {
      fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    // In serverless read-only contexts, gracefully fallback to memory
    console.warn('[OrdersStore] Disk storage initialized in memory mode:', err.message);
  }
}

export function getAllOrders() {
  ensureStorage();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const raw = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryOrders = parsed;
      }
      return parsed;
    }
  } catch (err) {
    console.error('[OrdersStore] Error reading orders from disk, using memory cache:', err.message);
  }
  return memoryOrders;
}

export function getOrderById(id) {
  const orders = getAllOrders();
  return orders.find(o => o.id === id) || null;
}

export function saveOrder(order) {
  ensureStorage();
  const orders = getAllOrders();
  const existingIdx = orders.findIndex(o => o.id === order.id);

  if (existingIdx > -1) {
    orders[existingIdx] = { ...orders[existingIdx], ...order, updatedAt: new Date().toISOString() };
  } else {
    orders.unshift({
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  memoryOrders = orders;

  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[OrdersStore] Saved order to in-memory store (disk read-only):', err.message);
  }

  return order;
}

export function updateOrderOdooStatus(orderId, odooResult) {
  ensureStorage();
  const orders = getAllOrders();
  const order = orders.find(o => o.id === orderId);

  if (!order) {
    throw new Error(`Order ${orderId} not found`);
  }

  if (odooResult.success) {
    order.odooSyncStatus = 'synced';
    order.odooPartnerId = odooResult.partnerId;
    order.odooOrderId = odooResult.salesOrderId;
    order.odooOrderName = odooResult.salesOrderName;
    order.odooInvoiceId = odooResult.invoiceId;
    order.odooInvoiceName = odooResult.invoiceName;
    order.odooSyncedAt = new Date().toISOString();
    order.odooError = null;
    order.odooEmailSent = Boolean(odooResult.emailSent);
    if (odooResult.emailSent) {
      order.odooEmailSentAt = new Date().toISOString();
      order.odooEmailError = null;
    } else if (odooResult.emailError) {
      order.odooEmailError = odooResult.emailError;
    }
    order.adminEmailSent = Boolean(odooResult.adminEmailSent);
    if (odooResult.adminEmailSent) {
      order.adminEmailSentAt = new Date().toISOString();
      order.adminEmailRecipient = odooResult.adminEmailRecipient || 'realtumicspices@gmail.com';
      order.adminEmailError = null;
    } else if (odooResult.adminEmailError) {
      order.adminEmailError = odooResult.adminEmailError;
    }
  } else {
    order.odooSyncStatus = 'failed';
    order.odooError = odooResult.error || 'Odoo sync failed';
    order.odooFailedAt = new Date().toISOString();
    order.odooEmailSent = false;
    order.adminEmailSent = false;
  }

  order.updatedAt = new Date().toISOString();
  memoryOrders = orders;

  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[OrdersStore] Updated Odoo status in memory:', err.message);
  }

  return order;
}

export function updateOrderWhatsAppStatus(orderId, waResult) {
  ensureStorage();
  const orders = getAllOrders();
  const order = orders.find(o => o.id === orderId);

  if (!order) return null;

  order.whatsappSent = Boolean(waResult.sent);
  if (waResult.sent) {
    order.whatsappMessageId = waResult.messageId || null;
    order.whatsappSentAt = waResult.timestamp || new Date().toISOString();
    order.whatsappRecipient = waResult.recipient || null;
    order.whatsappError = null;
  } else {
    order.whatsappError = waResult.error || 'WhatsApp notification failed';
    order.whatsappFailedAt = new Date().toISOString();
  }

  order.updatedAt = new Date().toISOString();
  memoryOrders = orders;

  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[OrdersStore] Updated WhatsApp status in memory:', err.message);
  }

  return order;
}

export function updateOrderStatus(orderId, newStatus, extraUpdates = {}) {
  ensureStorage();
  const orders = getAllOrders();
  const order = orders.find(o => o.id === orderId || (o.odooInvoiceName && o.odooInvoiceName === orderId));

  if (!order) return null;

  order.orderStatus = newStatus;
  if (extraUpdates && typeof extraUpdates === 'object') {
    Object.assign(order, extraUpdates);
  }
  order.updatedAt = new Date().toISOString();
  memoryOrders = orders;

  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[OrdersStore] Updated order status in memory:', err.message);
  }

  return order;
}

