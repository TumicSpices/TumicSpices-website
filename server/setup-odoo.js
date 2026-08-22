import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { testOdooConnection, syncOrderToOdoo, updateEnvFile, getOdooConfig } from './odoo.js';
import { getAllOrders, updateOrderOdooStatus } from './ordersStore.js';

// Read .env into process.env natively
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ENV_PATH = path.join(__dirname, '..', '.env');

if (fs.existsSync(ENV_PATH)) {
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx > -1) {
      const k = line.substring(0, idx).trim();
      const v = line.substring(idx + 1).trim();
      if (!process.env[k]) process.env[k] = v;
    }
  });
}

const args = process.argv.slice(2);

async function main() {
  console.log('================================================================');
  console.log('🌶️ Tumic Spices — Odoo 19 Enterprise JSON-2 API Tool');
  console.log('================================================================\n');

  if (args[0] === 'test' || args.length === 0) {
    const config = getOdooConfig();
    console.log(`Connecting to Odoo 19 JSON-2 API at: ${config.url}/json/2 (DB: ${config.db})...\n`);
    
    const result = await testOdooConnection();
    console.log('Connection Test Result:', JSON.stringify(result, null, 2));

    if (result.connected) {
      console.log('\n✅ Successfully connected to Odoo 19 Enterprise via JSON-2 REST API!');
      console.log(`User: ${result.user?.name} (${result.user?.login}, ID: ${result.user?.id})`);
      console.log(`Company: ${result.company?.name} (Currency: ${result.company?.currency})`);
      console.log(`API Protocol: ${result.apiType}`);
    } else {
      console.log('\n❌ Connection test failed:', result.error);
    }
    return;
  }

  if (args[0] === 'config') {
    const url = args[1];
    const db = args[2];
    const apiKey = args[3];

    if (!url || !apiKey) {
      console.error('Usage: node server/setup-odoo.js config <ODOO_URL> <ODOO_DB> <API_KEY>');
      process.exit(1);
    }

    updateEnvFile({
      ODOO_URL: url.trim(),
      ODOO_DB: (db || 'tumicspices').trim(),
      ODOO_API_KEY: apiKey.trim()
    });

    console.log('✅ Odoo credentials saved to .env!');
    console.log('Testing connection now...\n');
    const result = await testOdooConnection();
    console.log(result.connected ? '✅ Connected successfully!' : `❌ Error: ${result.error}`);
    return;
  }

  if (args[0] === 'sync-all') {
    console.log('Synchronizing orders with Odoo 19 Enterprise...');
    const orders = getAllOrders();
    let synced = 0;
    for (const order of orders) {
      console.log(`\nSyncing Website Order #${order.id} for ${order.customer?.name}...`);
      const res = await syncOrderToOdoo(order);
      updateOrderOdooStatus(order.id, res);
      if (res.success) {
        console.log(`✅ Order #${order.id} synced to Odoo! Sales Order: ${res.salesOrderName}, Invoice: ${res.invoiceName || 'Pending'}`);
        synced++;
      } else {
        console.log(`❌ Order #${order.id} failed: ${res.error}`);
      }
    }
    console.log(`\nSummary: ${synced}/${orders.length} orders synced to Odoo.`);
    return;
  }

  console.log('Commands available:');
  console.log('  node server/setup-odoo.js test                      - Read-only test of Odoo 19 JSON-2 API connection');
  console.log('  node server/setup-odoo.js config <URL> <DB> <KEY>   - Set Odoo credentials in .env');
  console.log('  node server/setup-odoo.js sync-all                  - Sync all orders to Odoo');
}

main();
