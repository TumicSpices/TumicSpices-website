# 🌶️ Tumic Spices — Official Web Application

> **"Asli Masala, Tumic Wala"** — Pure, handcrafted authentic Indian spices directly from Kanpur.

Modern high-performance e-commerce web application with interactive 3D product showcase, live cart & checkout, order tracking, real-time **Odoo 19 Enterprise** synchronization, and **Meta WhatsApp Cloud API** instant order alerts.

---

## 🚀 Features

- **Interactive 3D Product Experience**: Canvas-driven 3D spice packaging viewer with frame-by-frame scrubbing.
- **Product Catalog**: Full catalog for Chilli Powder, Garam Masala, Biryani Masala, Turmeric Powder, Coriander Powder, and Aachar Masala with gram selection (100g, 200g, 500g, 1kg) and combo packs.
- **Cart & Smooth Checkout**: Sliding drawer cart, quantity management, live delivery estimation, pin-code validation, and instant order generation.
- **Customer Order Tracking**: Real-time order lookup by Order ID or phone number.
- **Admin Control Panel**: View incoming orders, retry Odoo synchronization, and test live connections.
- **Odoo 19 Enterprise Integration**: Server-side JSON-2 REST API creating customer contacts, posting customer invoices, and mapping SKUs.
- **Meta WhatsApp Cloud API**: Automated non-blocking instant WhatsApp notification sent to store administrators upon order placement.
- **Vercel Serverless Ready**: Production-ready deployment setup with zero-config serverless API routes.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES Modules), Vanilla CSS Design System, [Vite](https://vitejs.dev/)
- **Backend / API**: Node.js, Vercel Serverless Functions (`/api/*`), Vite Connect Middleware (for local dev)
- **Integrations**:
  - Odoo 19 Enterprise JSON-2 REST API
  - Meta WhatsApp Cloud API (Graph API v21.0)
  - Lucide Icons & Canvas Confetti

---

## 💻 Local Development

### 1. Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/TumicSpices/TumicSpices-website.git
cd TumicSpices-website

# Install dependencies
npm install
```

### 3. Environment Setup
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

### 4. Start Local Dev Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. Both frontend and backend `/api/*` endpoints run concurrently.

### 5. Build for Production
```bash
npm run build
```
Production build will be generated in `dist/`.

---

## ☁️ Deploy to Vercel

This repository is pre-configured for seamless 1-click deployment on **Vercel**.

### Step 1: Import Project to Vercel
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** > **"Project"**.
3. Select `TumicSpices/TumicSpices-website` from your GitHub repositories.

### Step 2: Build & Output Settings
Vercel automatically detects the configuration via `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### Step 3: Environment Variables
Add the following environment variables in your Vercel Project Settings (**Settings** > **Environment Variables**):

| Variable Name | Description | Example |
| :--- | :--- | :--- |
| `ODOO_URL` | Your Odoo 19 Enterprise URL | `https://tumicspices.odoo.com` |
| `ODOO_DB` | Odoo database name | `tumicspices` |
| `ODOO_USERNAME` | Odoo integration user login/email | `integration@tumicspices.com` |
| `ODOO_API_KEY` | Odoo user API key | `your_odoo_api_key` |
| `WHATSAPP_ACCESS_TOKEN` | Meta WhatsApp Cloud API access token | `EAA...` |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta WhatsApp sender phone ID | `123456789012345` |
| `ADMIN_WHATSAPP_PHONE` | Owner/Admin WhatsApp phone with country code | `918604446189` |
| `WHATSAPP_API_VERSION` | Meta Graph API Version | `v21.0` |
| `ADMIN_SECRET_PIN` | Admin Dashboard access PIN | `8604` |

### Step 4: Click Deploy!
Your website and serverless APIs will be live immediately.

---

## 📂 Project Structure

```
├── api/                    # Vercel Serverless Function entry point
│   └── index.js            # Serverless API routing bridge
├── public/                 # Static assets & 3D frames
│   ├── assets/             # Logos, spice pack images, banners
│   └── frames/             # 3D interactive sequence frames
├── server/                 # Core server & business logic
│   ├── api.js              # Universal API routes & handlers
│   ├── odoo.js             # Odoo 19 JSON-2 API client
│   ├── ordersStore.js      # Orders persistence layer
│   └── whatsapp.js         # Meta WhatsApp Cloud API dispatcher
├── src/                    # Frontend source code
│   ├── main.js             # Store logic, cart, tracking, 3D viewer
│   └── style.css           # Premium typography & design system
├── index.html              # Main application page
├── vercel.json             # Vercel deployment configuration
├── vite.config.js          # Vite build & local API middleware
├── package.json            # Dependencies & build scripts
└── .env.example            # Environment template
```

---

## 🔒 Security

- Sensitive credentials (`.env`) are excluded from version control via `.gitignore`.
- API keys and tokens are strictly accessed server-side and never exposed to client browsers.
- CORS preflight and strict payload validation enabled on all order endpoints.

---

## 📄 License

Proprietary © 2026 Tumic Spices. All rights reserved.
