// ==============================================================================
// Tumic Spices — Meta WhatsApp Cloud API Integration Module
// Dispatches order notification messages to the store administrator/owner
// using official Meta Graph API v21.0.
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '..', '.env');

/**
 * Safely retrieves WhatsApp Cloud API configuration from environment variables or .env file.
 */
export function getWhatsAppConfig() {
  // Dynamically load from .env file if not in process.env
  if (fs.existsSync(ENV_PATH)) {
    try {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const idx = line.indexOf('=');
        if (idx > -1) {
          const k = line.substring(0, idx).trim();
          const v = line.substring(idx + 1).trim();
          if (!process.env[k] || process.env[k] !== v) process.env[k] = v;
        }
      });
    } catch (e) {}
  }

  const accessToken = (process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_WA_TOKEN || '').trim();
  const phoneNumberId = (process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const recipientPhone = (
    process.env.ADMIN_WHATSAPP_PHONE || 
    process.env.WHATSAPP_RECIPIENT_PHONE || 
    process.env.ADMIN_PHONE || 
    '918604446189'
  ).trim();
  const apiVersion = (process.env.WHATSAPP_API_VERSION || 'v21.0').trim();

  return {
    accessToken,
    phoneNumberId,
    recipientPhone: normalizeWhatsAppPhone(recipientPhone),
    apiVersion
  };
}

/**
 * Checks if WhatsApp Cloud API credentials are configured.
 */
export function isWhatsAppConfigured() {
  const config = getWhatsAppConfig();
  return Boolean(config.accessToken && config.phoneNumberId && config.recipientPhone);
}

/**
 * Normalizes phone numbers into international digits (E.164 without leading plus).
 * e.g., "+91 86044 46189" -> "918604446189", "8604446189" (10 digits) -> "918604446189"
 */
export function normalizeWhatsAppPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`; // Default to India country code if 10-digit mobile is provided
  }
  return digits;
}

/**
 * Formats a clean, professional WhatsApp text notification for new orders.
 * Includes: Customer Name, Phone, Delivery Address, Products & Quantities, Total Amount, Order ID.
 */
export function formatOrderWhatsAppMessage(order) {
  const customer = order.customer || {};
  const items = order.items || [];

  const itemsList = items.map((item, idx) => {
    const name = item.name || 'Spice Product';
    const weight = item.weight ? ` (${item.weight})` : '';
    const qty = item.quantity || 1;
    const price = item.price || 0;
    const itemTotal = price * qty;
    return `  ${idx + 1}. *${name}*${weight}\n     Qty: *${qty}* | Price: ₹${price} | Total: ₹${itemTotal}`;
  }).join('\n\n');

  const addressLine = [
    customer.address,
    customer.city,
    customer.state,
    customer.pin ? `PIN: ${customer.pin}` : ''
  ].filter(Boolean).join(', ');

  const odooRef = order.odooInvoiceName || order.odooInvoiceId 
    ? `\n🧾 *Odoo Invoice:* #${order.odooInvoiceName || order.odooInvoiceId}` 
    : '';

  return `🌶️ *NEW TUMIC SPICES ORDER RECEIVED!*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📦 *Order ID:* #${order.id}${odooRef}\n` +
    `📅 *Order Date:* ${order.date || new Date().toLocaleDateString('en-IN')}\n\n` +
    `👤 *CUSTOMER DETAILS:*\n` +
    `• *Name:* ${customer.name || 'N/A'}\n` +
    `• *Phone:* +${normalizeWhatsAppPhone(customer.phone) || customer.phone || 'N/A'}\n` +
    (customer.email ? `• *Email:* ${customer.email}\n` : '') +
    `• *Address:* ${addressLine || 'N/A'}\n\n` +
    `🛒 *PRODUCTS ORDERED:*\n` +
    `${itemsList || '  (No items specified)'}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total Amount:* ₹${order.totalAmount || 0} (Free Shipping)\n` +
    `💳 *Payment Method:* ${order.paymentMethod || 'Cash on Delivery'}\n` +
    `📊 *Order Status:* ${order.orderStatus || 'Confirmed'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `Please prepare the batch for packaging and dispatch! 🚀`;
}

/**
 * Sends order notification to the store owner/admin via Meta WhatsApp Cloud API.
 * Guaranteed to be non-blocking: catches all errors so orders are never rolled back on failure.
 */
export async function sendOrderWhatsAppNotification(order) {
  const config = getWhatsAppConfig();

  if (!isWhatsAppConfigured()) {
    const missing = [];
    if (!config.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
    if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!config.recipientPhone) missing.push('ADMIN_WHATSAPP_PHONE');

    const warnMsg = `[WhatsApp Cloud API] Notification skipped: Missing environment variables (${missing.join(', ')}). Set them in .env to enable instant order alerts.`;
    console.warn(warnMsg);
    return {
      sent: false,
      error: warnMsg,
      missingConfig: missing
    };
  }

  const messageBody = formatOrderWhatsAppMessage(order);
  const endpoint = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: config.recipientPhone,
    type: 'text',
    text: {
      preview_url: false,
      body: messageBody
    }
  };

  console.log(`[WhatsApp Cloud API] Dispatching order alert for Order #${order.id} to admin (${config.recipientPhone})...`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorDetail = responseData.error 
        ? `${responseData.error.message} (Code: ${responseData.error.code})` 
        : `HTTP ${response.status} ${response.statusText}`;
      
      console.error(`[WhatsApp Cloud API Error for Order #${order.id}]:`, errorDetail);
      return {
        sent: false,
        error: errorDetail,
        status: response.status
      };
    }

    const messageId = responseData.messages && responseData.messages[0] ? responseData.messages[0].id : null;
    console.log(`[WhatsApp Cloud API Success] Message sent for Order #${order.id}! Message ID: ${messageId}`);

    return {
      sent: true,
      messageId: messageId,
      recipient: config.recipientPhone,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error(`[WhatsApp Cloud API Network Error for Order #${order.id}]:`, err.message);
    return {
      sent: false,
      error: `Network error sending WhatsApp alert: ${err.message}`
    };
  }
}
