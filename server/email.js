import nodemailer from 'nodemailer';
import { callOdooJson2 } from './odoo.js';

let cachedTransporter = null;
let cachedSmtpConfig = null;

/**
 * Resolves SMTP configuration from environment variables or dynamically from Odoo ir.mail_server.
 */
export async function getSmtpConfig() {
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = (process.env.SMTP_USER || process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_EMAIL || 'realtumicspices@gmail.com').trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();

  if (pass) {
    return { host, port, user, pass };
  }

  // Fallback: Dynamically retrieve configured SMTP credentials from Odoo ir.mail_server
  try {
    const servers = await callOdooJson2('ir.mail_server', 'search_read', {
      domain: [['id', '=', 1]],
      fields: ['id', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass']
    });

    if (servers && servers[0] && servers[0].smtp_pass) {
      return {
        host: servers[0].smtp_host || 'smtp.gmail.com',
        port: servers[0].smtp_port || 587,
        user: servers[0].smtp_user || user,
        pass: servers[0].smtp_pass
      };
    }
  } catch (err) {
    console.warn('[Email] Could not load SMTP credentials from Odoo ir.mail_server:', err.message);
  }

  return { host, port, user, pass: '' };
}

/**
 * Creates or returns a cached Nodemailer transporter.
 */
export async function getTransporter() {
  const config = await getSmtpConfig();

  if (!config.pass) {
    return null;
  }

  if (
    cachedTransporter &&
    cachedSmtpConfig &&
    cachedSmtpConfig.user === config.user &&
    cachedSmtpConfig.pass === config.pass
  ) {
    return cachedTransporter;
  }

  cachedSmtpConfig = config;
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return cachedTransporter;
}

/**
 * Sends a rich, itemized admin order notification email directly via SMTP.
 */
export async function sendAdminOrderEmail(order, invResult = {}) {
  const recipient = (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    'realtumicspices@gmail.com'
  ).trim();

  if (!recipient) {
    console.warn('[Admin Email] No admin notification email configured.');
    return { sent: false, error: 'Recipient email not configured' };
  }

  try {
    const transporter = await getTransporter();
    if (!transporter) {
      const errMsg = 'SMTP credentials not found in environment (SMTP_PASS) or Odoo ir.mail_server';
      console.warn(`[Admin Email] ${errMsg}`);
      return { sent: false, error: errMsg };
    }

    const cust = order.customer || {};
    const items = order.items || [];
    const invoiceNum =
      invResult.invoiceNumber ||
      order.odooInvoiceName ||
      order.odooInvoiceId ||
      'Pending Odoo Confirmation';

    const itemsHtml = items
      .map(
        (item, idx) => `
      <tr style="border-bottom: 1px solid #E5E7EB;">
        <td style="padding: 12px 10px; font-weight: 600; color: #1F2937;">
          ${idx + 1}. ${item.name}
          <div style="font-size: 12px; color: #6B7280; font-weight: 400;">Variant: ${item.weight || '100g'}</div>
        </td>
        <td style="padding: 12px 10px; text-align: center; color: #374151; font-weight: 700;">${item.quantity || 1}</td>
        <td style="padding: 12px 10px; text-align: right; color: #374151;">₹${item.price || 0}</td>
        <td style="padding: 12px 10px; text-align: right; font-weight: 700; color: #A71935;">₹${(item.price || 0) * (item.quantity || 1)}</td>
      </tr>
    `
      )
      .join('');

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

    console.log(`[Admin Email] Sending direct SMTP email for Order #${order.id} to ${recipient}...`);
    const info = await transporter.sendMail({
      from: `"Tumic Spices Orders" <${cachedSmtpConfig?.user || 'realtumicspices@gmail.com'}>`,
      to: recipient,
      subject: `🌶️ New Order Received: #${order.id} - ₹${order.totalAmount || 0} (${cust.name || 'Customer'})`,
      html: htmlBody
    });

    console.log(`[Admin Email] ✅ Direct SMTP email accepted by Google:`, {
      messageId: info.messageId,
      accepted: info.accepted,
      response: info.response
    });

    return {
      sent: true,
      messageId: info.messageId,
      response: info.response,
      recipient
    };
  } catch (err) {
    console.error(`[Admin Email] Direct SMTP delivery failed for Order #${order.id}:`, err.message);
    return { sent: false, error: err.message, recipient };
  }
}
