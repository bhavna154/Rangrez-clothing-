# RANGREZ — Premium T-Shirt Store ("Wear the Colours of Your Story")

RANGREZ is an artisanal, production-grade direct-to-consumer premium streetwear t-shirt house built with React, Vite, TypeScript, Tailwind CSS, Framer Motion, and an Express backend. It features an automated Print-on-Demand (POD) integration with Qikink, multi-provider Indian payment gateways (Razorpay, PhonePe, Cash on Delivery), and a comprehensive management back-office.

---

## Zero-Dependency Start (Add Keys Later)
The application is built to run immediately with **zero configured keys**. You can explore the storefront, browse the empty catalog, customize and add real products through the admin portal, place real Cash on Delivery (COD) orders, and test all customer accounts and checkout flows without needing any live external accounts upfront.

When you are ready to connect external services:
1. Provide your `ADMIN_SECRET_KEY` to unlock the `/admin` portal.
2. Add your `QIKINK_*` credentials (sandbox or live) for automatic order routing.
3. Add `RAZORPAY_*` or `PHONEPE_*` credentials to enable prepaid digital payments.

---

## Environment Variables Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `ADMIN_SECRET_KEY` | **Required to access `/admin`**. No default password. | `your_secret_admin_token_here` |
| `QIKINK_CLIENT_ID` | Qikink API Client ID | *Leave blank until configured* |
| `QIKINK_CLIENT_SECRET` | Qikink Live client secret | *Leave blank until configured* |
| `QIKINK_SANDBOX_SECRET` | Qikink Sandbox client secret | *Leave blank until configured* |
| `QIKINK_SANDBOX_MODE` | `"true"` for sandbox testing, `"false"` for live production | `"true"` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | *Leave blank to hide Razorpay* |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | *Leave blank* |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | *Leave blank* |
| `PHONEPE_MERCHANT_ID` | PhonePe Merchant ID | *Leave blank to hide PhonePe* |
| `PHONEPE_SALT_KEY` | PhonePe Salt Key | *Leave blank* |
| `PHONEPE_SALT_INDEX` | PhonePe Salt Index | `"1"` |
| `PHONEPE_ENV` | `"UAT"` or `"PROD"` | `"UAT"` |
| `RESEND_API_KEY` | Resend API key for transactional emails | *Optional* |
| `PORT` | Node server listen port | `3000` |

---

## Deployment Instructions

### 1. Render.com
1. Create a new **Web Service** from your GitHub repository.
2. Select **Node** environment.
3. Set Build Command: `npm install && npm run build`
4. Set Start Command: `npm start` (or `npx tsx server.ts`)
5. In **Environment Variables**, configure:
   - `ADMIN_SECRET_KEY`: (your choice of secret)
   - `NODE_ENV`: `production`
   - Plus any Qikink, Razorpay, or PhonePe credentials.
6. Deploy!

### 2. Railway.app
1. Click **New Project** -> **Deploy from GitHub repo**.
2. Railway detects the Node.js project automatically.
3. In the service **Variables** tab, add your `ADMIN_SECRET_KEY` and optional payment/fulfillment keys.
4. Set start command to `npm start` (or `npx tsx server.ts`).
5. Generate a public domain under service **Settings**.

### 3. Vercel
1. Import repository on Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Add environment variables in Vercel project settings.

---

## Architecture & Features

- **No Fake Data Policy**: Starts with a pristine empty catalog and zero stats. Real data is created through customer actions and admin entries.
- **Qikink POD Integration**:
  - Automatically fetches access tokens via `POST /token`.
  - Routes orders via `POST /order/create`.
  - In sandbox mode, automatically maps items to verified Qikink test SKUs (`MRnHs-Bk-L`, `MVnHs-Bk-M`, `MRnHs-Nb-S`).
  - Converts all customer address strings to pure ASCII to prevent character encoding rejection.
  - Automatic exponential backoff retries (max 3) and 30 req/min rate limit compliance.
- **Indian Payment Methods**:
  - Razorpay (UPI, Netbanking, Cards)
  - PhonePe Payment Gateway (SHA256 checksum)
  - Cash on Delivery (COD) with transparent fee calculation and "Total Payable" display.
- **Storefront**:
  - Mobile-first, responsive navigation drawer, sticky purchase bar.
  - Interactive pincode estimator (verifies Indian 6-digit postal codes).
  - Size chart modal with metric & imperial measurements.
  - Full search, filter, and sorting.
  - Customer account: Order tracking, address book, wishlist.
