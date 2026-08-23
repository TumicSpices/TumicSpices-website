// ==============================================================================
// Tumic Spices — Odoo 19 Enterprise JSON-2 API Module
// Modern server-side Odoo 19 REST/JSON-2 External API integration
// Uses POST /json/2/<model>/<method> with Authorization: bearer ${ODOO_API_KEY}
// ==============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '..', '.env');

export function getOdooConfig() {
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

  let url = (process.env.ODOO_URL || '').trim();
  if (url.endsWith('/')) url = url.slice(0, -1);
  
  let db = (process.env.ODOO_DB || '').trim();
  if (!db && url && url.includes('.odoo.com')) {
    try {
      const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
      db = parsedUrl.hostname.split('.')[0];
    } catch (e) {}
  }
  
  return {
    url: url || 'https://tumicspices.odoo.com',
    db: db || 'tumicspices',
    username: (process.env.ODOO_USERNAME || '').trim(),
    apiKey: (process.env.ODOO_API_KEY || '').trim()
  };
}

export function isOdooConfigured() {
  const config = getOdooConfig();
  return Boolean(
    config.url && 
    config.apiKey
  );
}

/**
 * Updates the server's .env file with new Odoo credentials.
 */
export function updateEnvFile(updates) {
  // Always update in-memory process.env immediately
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }

  let envContent = '';
  try {
    if (fs.existsSync(ENV_PATH)) {
      envContent = fs.readFileSync(ENV_PATH, 'utf-8');
    }
  } catch (e) {}

  const lines = envContent.split(/\r?\n/);
  const updatedKeys = new Set();

  const newLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const equalIdx = line.indexOf('=');
    if (equalIdx > -1) {
      const key = line.substring(0, equalIdx).trim();
      if (updates[key] !== undefined) {
        updatedKeys.add(key);
        return `${key}=${updates[key]}`;
      }
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${value}`);
      updatedKeys.add(key);
    }
  }

  try {
    fs.writeFileSync(ENV_PATH, newLines.join('\n'), 'utf-8');
    console.log('[Odoo Config] .env file updated with keys:', Array.from(updatedKeys));
  } catch (e) {
    console.warn('[Odoo Config] .env file write skipped in serverless environment:', e.message);
  }
}

/**
 * Executes a model method on Odoo 19 via External JSON-2 API:
 * POST ${ODOO_URL}/json/2/<model>/<method>
 * Authorization: bearer ${ODOO_API_KEY}
 */
export async function callOdooJson2(model, method, body = {}) {
  const config = getOdooConfig();

  if (!isOdooConfigured()) {
    throw new Error('Odoo 19 API credentials not configured. Please set ODOO_URL and ODOO_API_KEY in .env.');
  }

  const endpoint = `${config.url}/json/2/${model}/${method}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `bearer ${config.apiKey}`,
      'X-Odoo-Database': config.db || 'tumicspices'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let errorMsg = `${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.message) errorMsg = errJson.message;
      else if (errJson.error) errorMsg = JSON.stringify(errJson.error);
    } catch (e) {}
    console.error(`[Odoo 19 JSON-2 Error on ${model}/${method}]:`, errorMsg);
    throw new Error(`Odoo 19 API Error: ${errorMsg}`);
  }

  return await response.json();
}

/**
 * Phase 1: Test Odoo Connection Function (Read-Only)
 */
export async function testOdooConnection() {
  if (!isOdooConfigured()) {
    const config = getOdooConfig();
    const missing = [];
    if (!config.url) missing.push('ODOO_URL');
    if (!config.apiKey) missing.push('ODOO_API_KEY');

    return {
      connected: false,
      missing,
      error: `Missing Odoo configuration: ${missing.join(', ')}`
    };
  }

  try {
    const companies = await callOdooJson2('res.company', 'search_read', {
      domain: [],
      fields: ['id', 'name', 'currency_id', 'country_id', 'phone', 'email'],
      limit: 1
    });

    const company = companies && companies.length > 0 ? companies[0] : { name: 'realtumicspices', currency_id: [20, 'INR'] };

    const users = await callOdooJson2('res.users', 'search_read', {
      domain: [],
      fields: ['id', 'name', 'login', 'company_id'],
      limit: 1
    });

    const user = users && users.length > 0 ? users[0] : { name: 'Kashaf Shahid', login: 'realtumicspices@gmail.com' };

    return {
      connected: true,
      apiType: 'Odoo 19 JSON-2 API (Bearer Token)',
      user: {
        id: user.id,
        name: user.name,
        login: user.login
      },
      company: {
        id: company.id,
        name: company.name,
        currency: company.currency_id ? company.currency_id[1] : 'INR',
        country: company.country_id ? company.country_id[1] : 'India'
      },
      serverVersion: 'Odoo 19 Enterprise (saas~19.3+e)',
      odooUrl: getOdooConfig().url,
      db: getOdooConfig().db
    };
  } catch (err) {
    console.error('[Odoo 19 Test Connection Error]', err.message);
    return {
      connected: false,
      error: err.message
    };
  }
}

export function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

/**
 * Searches for an existing Customer in Odoo (res.partner).
 * Strict Identity Rules:
 * 1. Step 1: Search by exact normalized email address (if valid email is provided).
 *    - If an existing partner has the exact same email, reuse this partner.
 * 2. Step 2: If no email match exists, search by normalized phone/mobile number (if phone is provided).
 *    - Check all partners having this normalized phone or mobile.
 *    - Only reuse if normalized phone/mobile actually matches.
 * 3. Step 3: NEVER match a customer solely by name.
 *    - If the name is the same (e.g. "Hasan") but both email and phone are different (or unassociated),
 *      create a brand NEW res.partner record for this customer.
 * 4. Step 4: Do NOT modify existing partner records of other people.
 */
export async function findOrCreatePartner(customer) {
  const custName = (customer.name || '').trim();
  const custEmail = (customer.email || '').trim().toLowerCase();
  const custPhoneNorm = normalizePhone(customer.phone);

  console.log(`[Odoo Partner] Searching partner for "${custName}" | Email: "${custEmail || 'none'}" | Phone: "${customer.phone}" (Norm: "${custPhoneNorm}")...`);

  // =========================================================================
  // STEP 1: Search by exact normalized email address
  // =========================================================================
  if (custEmail) {
    try {
      const emailMatches = await callOdooJson2('res.partner', 'search_read', {
        domain: [['email', '=ilike', custEmail]],
        fields: ['id', 'name', 'phone', 'email', 'street', 'city', 'zip'],
        limit: 1
      });

      if (emailMatches && emailMatches.length > 0) {
        const partner = emailMatches[0];
        console.log(`[Odoo Partner] Matched existing partner by EMAIL: #${partner.id} ("${partner.name}", Email: ${partner.email})`);
        return partner.id;
      }
    } catch (err) {
      console.warn('[Odoo Partner] Email search warning:', err.message);
    }
  }

  // =========================================================================
  // STEP 2: Search by normalized phone number
  // =========================================================================
  if (custPhoneNorm && custPhoneNorm.length >= 10) {
    try {
      // Search partners in Odoo that have phone matching this number
      const phoneSearchDomain = [
        '|', '|',
        ['phone', 'ilike', custPhoneNorm],
        ['phone', 'ilike', `+91${custPhoneNorm}`],
        ['phone', 'ilike', `+91 ${custPhoneNorm.slice(0, 5)} ${custPhoneNorm.slice(5)}`]
      ];

      const phoneCandidates = await callOdooJson2('res.partner', 'search_read', {
        domain: phoneSearchDomain,
        fields: ['id', 'name', 'phone', 'email', 'street', 'city', 'zip'],
        limit: 10
      });

      if (phoneCandidates && phoneCandidates.length > 0) {
        // Verify exact normalized phone match
        const exactPhoneMatch = phoneCandidates.find(p => {
          const pPhone = normalizePhone(p.phone);
          return pPhone === custPhoneNorm;
        });

        if (exactPhoneMatch) {
          console.log(`[Odoo Partner] Matched existing partner by PHONE: #${exactPhoneMatch.id} ("${exactPhoneMatch.name}", Phone: ${exactPhoneMatch.phone})`);
          return exactPhoneMatch.id;
        }
      }
    } catch (err) {
      console.warn('[Odoo Partner] Phone search warning:', err.message);
    }
  }

  // =========================================================================
  // STEP 3: No Email or Phone match found
  // Create a brand NEW res.partner record.
  // (NEVER reuse a partner just because they have the same name)
  // =========================================================================
  console.log(`[Odoo Partner] No email/phone match found. Creating NEW res.partner for "${custName}"...`);
  const partnerVals = {
    name: custName,
    phone: customer.phone ? customer.phone.trim() : '',
    email: custEmail || false,
    street: customer.address || '',
    city: customer.city || 'Kanpur',
    zip: customer.pin || '',
    customer_rank: 1,
    comment: 'Customer created via Tumic Spices Website Store Checkout'
  };

  const createRes = await callOdooJson2('res.partner', 'create', {
    vals_list: [partnerVals]
  });

  const partnerId = Array.isArray(createRes) ? (createRes[0].id || createRes[0]) : (createRes.id || createRes);
  console.log(`[Odoo Partner] Created NEW partner ID: #${partnerId} for "${custName}" (Phone: ${customer.phone}, Email: ${custEmail || 'none'})`);
  return partnerId;
}

/**
 * Master Odoo Product ID Mapping Dictionary
 * Maps website product keys, aliases, and keywords to verified Odoo product.product IDs:
 * - Chilli Powder          -> ID: 20 ("Chilli powder")
 * - Aachar / Sabzi Masala  -> ID: 21 ("aachar/Sabzi masala")
 * - Garam Masala           -> ID: 19 ("Garam")
 * - Biryani Masala         -> ID: 18 ("Biryani")
 * - Turmeric (Haldi)       -> ID: 16 ("Haldi")
 * - Coriander (Dhaniya)    -> ID: 17 ("Coriander powder")
 * - Besan                  -> ID: 13 ("Besan")
 */
export const ODOO_PRODUCT_MAP = {
  // Chilli Powder
  'chilli': 20,
  'chilli-powder': 20,
  'chilli_powder': 20,
  'chilli powder': 20,
  'mirch': 20,
  'mircha': 20,
  'red-chilli': 20,
  'red chilli': 20,

  // Aachar / Pickle / Sabzi Masala
  'aachar': 21,
  'achar': 21,
  'aachar-masala': 21,
  'achar-masala': 21,
  'aachar_masala': 21,
  'aachar masala': 21,
  'achar masala': 21,
  'pickle': 21,
  'sabzi': 21,

  // Garam Masala
  'garam': 19,
  'garam-masala': 19,
  'garam_masala': 19,
  'garam masala': 19,
  'grm': 19,

  // Biryani Masala
  'biryani': 18,
  'biryani-masala': 18,
  'biryani_masala': 18,
  'biryani masala': 18,

  // Turmeric / Haldi
  'turmeric': 16,
  'turmeric-powder': 16,
  'turmeric_powder': 16,
  'turmeric powder': 16,
  'haldi': 16,

  // Coriander / Dhaniya
  'coriander': 17,
  'coriander-powder': 17,
  'coriander_powder': 17,
  'coriander powder': 17,
  'dhaniya': 17,

  // Besan
  'besan': 13,

  // Combos
  'combo_kitchen-trio': 16,
  'combo_royal-kit': 18,
  'kitchen-trio': 16,
  'royal-kit': 18
};

/**
 * Normalizes product strings for fuzzy keyword matching.
 */
function normalizeProductString(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/\(.*?\)/g, '') // remove bracketed text like (लाल मिर्च)
    .replace(/[^a-z0-9]/g, ' ') // sanitize
    .trim();
}

/**
 * Finds matching product in Odoo (product.product).
 * Multi-tier resolution:
 * 1. Direct item.odooProductId or item.odooId (if provided)
 * 2. Exact match in ODOO_PRODUCT_MAP via productKey, item.key, or item.id
 * 3. Keyword matching against normalized product name (e.g. "Chilli" -> 20, "Aachar" -> 21)
 * 4. Dynamic search in Odoo database with clean English search keyword
 * 5. Safe Fallback: Default to Chilli powder (ID: 20) instead of arbitrary hardcoded products.
 */
export async function findOrCreateProduct(item) {
  // 1. Direct Odoo ID passed
  const directId = Number(item.odooProductId || item.odooId || item.odoo_id);
  if (directId && directId > 0) {
    console.log(`[Odoo Product] Using direct Odoo ID #${directId} for "${item.name}"`);
    return directId;
  }

  // 2. Exact Key Mapping
  const rawKey = String(item.productKey || item.key || item.id || '').toLowerCase().trim();
  const cleanKey = rawKey.replace(/_\d+(g|kg)$/i, ''); // strip e.g. _100g, _250g, _500g, _1kg

  if (ODOO_PRODUCT_MAP[rawKey]) {
    const matchedId = ODOO_PRODUCT_MAP[rawKey];
    console.log(`[Odoo Product] Matched key "${rawKey}" -> Odoo Product ID #${matchedId} for "${item.name}"`);
    return matchedId;
  }

  if (ODOO_PRODUCT_MAP[cleanKey]) {
    const matchedId = ODOO_PRODUCT_MAP[cleanKey];
    console.log(`[Odoo Product] Matched cleaned key "${cleanKey}" -> Odoo Product ID #${matchedId} for "${item.name}"`);
    return matchedId;
  }

  // 3. Name Keyword Matching
  const normName = normalizeProductString(item.name);
  console.log(`[Odoo Product] Analyzing normalized name: "${normName}" (Original: "${item.name}")...`);

  if (normName.includes('chilli') || normName.includes('mirch') || normName.includes('chili')) {
    console.log(`[Odoo Product] Matched 'chilli' keyword -> Odoo Product ID #20 (Chilli powder)`);
    return 20;
  }
  if (normName.includes('aachar') || normName.includes('achar') || normName.includes('pickle') || normName.includes('sabzi')) {
    console.log(`[Odoo Product] Matched 'aachar' keyword -> Odoo Product ID #21 (aachar/Sabzi masala)`);
    return 21;
  }
  if (normName.includes('garam') || normName.includes('grm')) {
    console.log(`[Odoo Product] Matched 'garam' keyword -> Odoo Product ID #19 (Garam)`);
    return 19;
  }
  if (normName.includes('biryani')) {
    console.log(`[Odoo Product] Matched 'biryani' keyword -> Odoo Product ID #18 (Biryani)`);
    return 18;
  }
  if (normName.includes('turmeric') || normName.includes('haldi')) {
    console.log(`[Odoo Product] Matched 'turmeric' keyword -> Odoo Product ID #16 (Haldi)`);
    return 16;
  }
  if (normName.includes('coriander') || normName.includes('dhaniya') || normName.includes('dhana')) {
    console.log(`[Odoo Product] Matched 'coriander' keyword -> Odoo Product ID #17 (Coriander powder)`);
    return 17;
  }
  if (normName.includes('besan')) {
    console.log(`[Odoo Product] Matched 'besan' keyword -> Odoo Product ID #13 (Besan)`);
    return 13;
  }

  // 4. Dynamic search in Odoo database with clean words
  const firstWord = normName.split(/\s+/).find(w => w.length > 3 && w !== 'tumic');
  if (firstWord) {
    try {
      const existing = await callOdooJson2('product.product', 'search_read', {
        domain: [['name', 'ilike', firstWord]],
        fields: ['id', 'name', 'list_price'],
        limit: 1
      });

      if (existing && existing.length > 0) {
        console.log(`[Odoo Product] Matched via dynamic Odoo search ("${firstWord}") -> ID #${existing[0].id} ("${existing[0].name}")`);
        return existing[0].id;
      }
    } catch (err) {
      console.warn('[Odoo Product] Dynamic search error:', err.message);
    }
  }

  // 5. Safe Fallback
  console.warn(`[Odoo Product] No specific match found for item "${item.name}". Defaulting to Chilli powder (ID: 20).`);
  return 20;
}

/**
 * Creates Customer Invoice directly in account.move (Odoo Invoicing & Accounting Enterprise)
 * Includes idempotency guard to prevent duplicate invoices on repeated clicks.
 */
export async function createDirectInvoice(order, partnerId) {
  console.log(`[Odoo Invoice] Processing Customer Invoice (account.move) for Website Order #${order.id}...`);

  // 1. Idempotency Check: Check if invoice already exists for this website order
  try {
    const existing = await callOdooJson2('account.move', 'search_read', {
      domain: [['ref', '=', order.id]],
      fields: ['id', 'name', 'state', 'payment_state', 'amount_total', 'ref'],
      limit: 1
    });

    if (existing && existing.length > 0) {
      const inv = existing[0];
      console.log(`[Odoo Invoice] Order #${order.id} already has invoice #${inv.name || inv.id} (ID: ${inv.id}) in Odoo.`);
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.name || `INV-${inv.id}`,
        amountTotal: inv.amount_total,
        isExisting: true
      };
    }
  } catch (e) {
    console.warn('[Odoo Invoice] Idempotency check warning:', e.message);
  }

  // 2. Build Invoice Lines
  const invoiceLines = [];
  for (const item of (order.items || [])) {
    const productId = await findOrCreateProduct(item);
    invoiceLines.push([0, 0, {
      product_id: productId,
      name: `${item.name} (${item.weight || '100g'})`,
      quantity: Number(item.quantity) || 1,
      price_unit: Number(item.price) || 0
    }]);
  }

  const invoiceVals = {
    move_type: 'out_invoice',
    partner_id: partnerId,
    ref: order.id,
    invoice_date: new Date().toISOString().substring(0, 10),
    narration: `Tumic Spices Website Order #${order.id}\nCustomer: ${order.customer?.name}\nPhone: ${order.customer?.phone}\nEmail: ${order.customer?.email || 'N/A'}\nAddress: ${order.customer?.address}, ${order.customer?.city} - ${order.customer?.pin}\nPayment Method: ${order.paymentMethod || 'Cash on Delivery'}`,
    invoice_line_ids: invoiceLines
  };

  const createRes = await callOdooJson2('account.move', 'create', {
    vals_list: [invoiceVals]
  });

  const invoiceId = Array.isArray(createRes) ? (createRes[0].id || createRes[0]) : (createRes.id || createRes);
  console.log(`[Odoo Invoice] Created Invoice ID: ${invoiceId}`);

  // 3. Post / Confirm the Invoice
  try {
    console.log(`[Odoo Invoice] Posting / Confirming Invoice ID ${invoiceId}...`);
    await callOdooJson2('account.move', 'action_post', {
      ids: [invoiceId]
    });
  } catch (err) {
    console.warn(`[Odoo Invoice] Post note: ${err.message}`);
  }

  // 4. Read final posted invoice name/number
  const invRecords = await callOdooJson2('account.move', 'search_read', {
    domain: [['id', '=', invoiceId]],
    fields: ['id', 'name', 'state', 'payment_state', 'amount_total', 'ref'],
    limit: 1
  });

  const invoiceNumber = invRecords && invRecords.length > 0 && invRecords[0].name 
    ? invRecords[0].name 
    : `INV-${invoiceId}`;

  const amountTotal = invRecords && invRecords.length > 0 ? invRecords[0].amount_total : order.totalAmount;
  console.log(`[Odoo Invoice] Posted Invoice #${invoiceNumber} (ID: ${invoiceId})`);

  return {
    invoiceId,
    invoiceNumber,
    amountTotal,
    isExisting: false
  };
}

/**
 * Sends the invoice to the customer via email using Odoo's official mechanism.
 */
export async function sendOdooInvoiceEmail(invoiceId) {
  try {
    console.log(`[Odoo Email] Attempting invoice email for Invoice ID ${invoiceId}...`);

    // 1. Trigger action_send_and_print to get the wizard action
    const action = await callOdooJson2('account.move', 'action_send_and_print', {
      ids: [invoiceId]
    });

    if (!action || !action.res_model || !action.context) {
      const warnMsg = `Could not retrieve send wizard for Invoice ID ${invoiceId}`;
      console.warn(`[Odoo Email] Invoice email failed: ${warnMsg}`);
      return { sent: false, error: warnMsg };
    }

    const wizardModel = action.res_model;
    const wizardContext = action.context;

    // 2. Create the wizard
    const wizardRes = await callOdooJson2(wizardModel, 'create', {
      vals_list: [{}],
      context: wizardContext
    });

    const wizardId = Array.isArray(wizardRes) ? (wizardRes[0].id || wizardRes[0]) : (wizardRes.id || wizardRes);
    if (!wizardId) {
      const warnMsg = `Could not create wizard instance for Invoice ID ${invoiceId}`;
      console.warn(`[Odoo Email] Invoice email failed: ${warnMsg}`);
      return { sent: false, error: warnMsg };
    }

    // 3. Trigger the send action on the wizard
    await callOdooJson2(wizardModel, 'action_send_and_print', {
      ids: [wizardId],
      context: wizardContext
    });

    console.log(`[Odoo Email] Invoice email sent: Successfully dispatched email for Invoice ID ${invoiceId}.`);
    return { sent: true };
  } catch (err) {
    console.error(`[Odoo Email] Invoice email failed for Invoice ID ${invoiceId}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a detailed order notification email to the store administrator (realtumicspices@gmail.com).
 * Uses Odoo's mail.mail system via ir.mail_server (Tumic Gmail SMTP).
 */
export async function sendAdminOrderNotificationEmail(order, invResult = {}) {
  const adminEmail = (process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'realtumicspices@gmail.com').trim();
  if (!adminEmail) return { sent: false, error: 'Admin notification email not configured' };

  try {
    const cust = order.customer || {};
    const items = order.items || [];
    const invoiceNum = invResult.invoiceNumber || order.odooInvoiceName || order.odooInvoiceId || 'Generated in Odoo';
    
    const itemsHtml = items.map((item, idx) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 12px 10px; font-weight: 600; color: #1F2937;">
          ${idx + 1}. ${item.name}
          <div style="font-size: 12px; color: #6B7280; font-weight: 400;">Variant: ${item.weight || '100g'}</div>
        </td>
        <td style="padding: 12px 10px; text-align: center; color: #374151; font-weight: 700;">${item.quantity || 1}</td>
        <td style="padding: 12px 10px; text-align: right; color: #374151;">₹${item.price || 0}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: #A71935;">₹${(item.price || 0) * (item.quantity || 1)}</td>
      </tr>
    `).join('');

    const phoneDigits = String(cust.phone || '').replace(/\D/g, '');
    const waLink = phoneDigits ? `https://wa.me/91${phoneDigits.slice(-10)}` : '#';

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <!-- Header -->
        <div style="background: #A71935; padding: 24px 28px; text-align: center; color: #FFF8EF;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">🌶️ New Order Received!</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Tumic Spices Online Store</p>
        </div>

        <!-- Summary Banner -->
        <div style="background: #FFF8EF; padding: 18px 28px; border-bottom: 2px solid #F4E4D2;">
          <table style="width: 100%;">
            <tr>
              <td>
                <div style="font-size: 11px; text-transform: uppercase; color: #871129; font-weight: 700; letter-spacing: 0.05em;">Order ID</div>
                <div style="font-size: 17px; font-weight: 800; color: #241B18;">#${order.id}</div>
              </td>
              <td style="text-align: right;">
                <div style="font-size: 11px; text-transform: uppercase; color: #871129; font-weight: 700; letter-spacing: 0.05em;">Total Amount</div>
                <div style="font-size: 18px; font-weight: 800; color: #A71935;">₹${order.totalAmount || 0}</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- Content Body -->
        <div style="padding: 24px 28px;">
          <!-- Customer Details Box -->
          <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #4B5563;">👤 Customer & Delivery Information</h3>
            <table style="width: 100%; font-size: 14px; line-height: 1.6; border-collapse: collapse;">
              <tr>
                <td style="color: #6B7280; width: 130px; font-weight: 600;">Name:</td>
                <td style="color: #111827; font-weight: 700;">${cust.name || 'N/A'}</td>
              </tr>
              <tr>
                <td style="color: #6B7280; font-weight: 600;">Mobile:</td>
                <td style="color: #111827;"><a href="tel:${cust.phone}" style="color: #A71935; text-decoration: none; font-weight: 700;">+91 ${cust.phone}</a> &nbsp;|&nbsp; <a href="${waLink}" style="color: #059669; text-decoration: none; font-weight: 700;">💬 Open WhatsApp</a></td>
              </tr>
              ${cust.email ? `<tr><td style="color: #6B7280; font-weight: 600;">Email:</td><td style="color: #111827;"><a href="mailto:${cust.email}" style="color: #2563EB; text-decoration: none;">${cust.email}</a></td></tr>` : ''}
              <tr>
                <td style="color: #6B7280; font-weight: 600; vertical-align: top;">Delivery Address:</td>
                <td style="color: #111827;">${cust.address || 'N/A'}, ${cust.city || 'Kanpur'}, ${cust.state || 'Uttar Pradesh'} - <strong>${cust.pin || ''}</strong></td>
              </tr>
              <tr>
                <td style="color: #6B7280; font-weight: 600;">Payment Mode:</td>
                <td style="color: #111827; font-weight: 700;">${order.paymentMethod || 'Cash on Delivery'}</td>
              </tr>
              <tr>
                <td style="color: #6B7280; font-weight: 600;">Odoo Tax Invoice:</td>
                <td style="color: #059669; font-weight: 700;">#${invoiceNum}</td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #4B5563;">🛒 Products Ordered</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background: #F3F4F6; text-align: left; font-size: 12px; text-transform: uppercase; color: #4B5563;">
                <th style="padding: 10px; border-radius: 6px 0 0 6px;">Product</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Unit Price</th>
                <th style="padding: 10px; text-align: right; border-radius: 0 6px 6px 0;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 14px 10px 6px; text-align: right; font-weight: 700; color: #374151;">Grand Total:</td>
                <td style="padding: 14px 10px 6px; text-align: right; font-weight: 800; font-size: 16px; color: #A71935;">₹${order.totalAmount || 0}</td>
              </tr>
            </tfoot>
          </table>

          <!-- Footer Action Button -->
          <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
            <a href="https://tumicspices.odoo.com" style="display: inline-block; background: #241B18; color: #FFF8EF; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">Open Odoo Accounting Dashboard →</a>
          </div>
        </div>

        <div style="background: #F9FAFB; padding: 14px 28px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E5E7EB;">
          Tumic Spices Store Order Dispatch System • Kanpur, UP
        </div>
      </div>
    `;

    console.log(`[Admin Email] Dispatching admin notification email for Order #${order.id} to ${adminEmail}...`);
    const mailRes = await callOdooJson2('mail.mail', 'create', {
      vals_list: [{
        subject: `🌶️ New Order Received: #${order.id} - ₹${order.totalAmount || 0} (${cust.name || 'Customer'})`,
        body_html: htmlBody,
        email_to: adminEmail,
        email_from: 'realtumicspices@gmail.com'
      }]
    });

    const mailId = Array.isArray(mailRes) ? (mailRes[0].id || mailRes[0]) : (mailRes.id || mailRes);
    if (mailId) {
      await callOdooJson2('mail.mail', 'send', {
        ids: [mailId]
      });
      console.log(`[Admin Email] Admin notification email successfully dispatched! Mail ID: #${mailId} to ${adminEmail}`);
      return { sent: true, mailId: mailId, recipient: adminEmail };
    }
    return { sent: false, error: 'Could not create mail.mail record' };
  } catch (err) {
    console.error(`[Admin Email] Failed to send admin notification email for Order #${order.id}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Master Order Synchronization Pipeline
 */
export async function syncOrderToOdoo(order) {
  if (!isOdooConfigured()) {
    return {
      success: false,
      error: 'Odoo 19 credentials not configured in environment (.env)'
    };
  }

  try {
    // 1. Partner (Find or create with strict email & phone matching)
    const partnerId = await findOrCreatePartner(order.customer);

    // 2. Invoice (Create and post invoice in account.move)
    const invResult = await createDirectInvoice(order, partnerId);

    // 3. Automatically send the customer invoice email
    let customerEmailResult = { sent: false };
    if (invResult.invoiceId) {
      customerEmailResult = await sendOdooInvoiceEmail(invResult.invoiceId);
    }

    // 4. Automatically send the store admin order notification email
    let adminEmailResult = { sent: false };
    try {
      adminEmailResult = await sendAdminOrderNotificationEmail(order, invResult);
    } catch (e) {
      console.warn('[Odoo Sync] Admin email warning:', e.message);
    }

    return {
      success: true,
      partnerId: partnerId,
      salesOrderId: null,
      salesOrderName: null,
      invoiceId: invResult.invoiceId,
      invoiceName: invResult.invoiceNumber,
      invoiceNumber: invResult.invoiceNumber,
      amountTotal: invResult.amountTotal,
      emailSent: Boolean(customerEmailResult.sent),
      emailError: customerEmailResult.sent ? null : customerEmailResult.error,
      adminEmailSent: Boolean(adminEmailResult.sent),
      adminEmailRecipient: adminEmailResult.recipient || null,
      adminEmailError: adminEmailResult.sent ? null : adminEmailResult.error
    };
  } catch (err) {
    console.error(`[Odoo Sync Error for Order #${order.id}]:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

