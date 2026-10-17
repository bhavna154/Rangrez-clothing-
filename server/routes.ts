import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.ts';
import { qikink } from './qikink.ts';
import {
  isFirebaseConfigured,
  inspectFirebaseCredentials,
  verifyFirestoreConnection,
  getCachedFirestoreHealth,
  saveImageToFirestore,
  getImageFromFirestore
} from './firebase.ts';
import type { Product, Order, Coupon, Customer, TShirtSize, PaymentMethod, PaymentStatus } from '../src/types/index.ts';

export const apiRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');

// Ensure persistent uploads directory
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
}

// 12-Hour Admin Session duration (survives restarts & app switching)
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function generateAdminToken(secretKey: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = {
    role: 'admin',
    iat: Date.now(),
    exp: expiresAt,
    jti: crypto.randomBytes(16).toString('hex')
  };
  const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(b64Payload)
    .digest('base64url');
  return { token: `${b64Payload}.${signature}`, expiresAt };
}

function verifyAdminToken(token: string | undefined, secretKey: string): { valid: boolean; reason?: string; expiresAt?: number } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'No admin token provided.' };
  }
  if (db.isSessionRevoked(token)) {
    return { valid: false, reason: 'This admin session has been signed out.' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid session token format.' };
  }

  const [b64Payload, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', secretKey)
    .update(b64Payload)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, reason: 'Invalid session credentials.' };
  }

  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) {
      return { valid: false, reason: 'Your admin session has expired (12-hour limit). Please log in again.' };
    }
    return { valid: true, expiresAt: payload.exp };
  } catch {
    return { valid: false, reason: 'Corrupt session token data.' };
  }
}

// Admin Auth Middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const configuredSecret = process.env.ADMIN_SECRET_KEY?.trim();
  if (!configuredSecret) {
    return res.status(403).json({ error: 'ADMIN_SECRET_KEY is not configured on the server. Please set it in environment.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Admin access required', code: 'UNAUTHORIZED' });
  }
  const token = authHeader.split(' ')[1];
  const check = verifyAdminToken(token, configuredSecret);
  if (!check.valid) {
    return res.status(401).json({
      error: check.reason || 'Session expired or invalid. Please log in again.',
      code: 'SESSION_EXPIRED'
    });
  }
  next();
}

// -------------------------------------------------------------
// 1. SETUP STATUS & ADMIN AUTH
// -------------------------------------------------------------

apiRouter.get('/setup-status', async (req: Request, res: Response) => {
  const isSandbox = (process.env.QIKINK_SANDBOX_MODE ?? 'true').toLowerCase() === 'true';
  const qikinkClient = Boolean(process.env.QIKINK_CLIENT_ID?.trim());
  const qikinkSecret = Boolean(
    isSandbox
      ? (process.env.QIKINK_SANDBOX_SECRET?.trim() || process.env.QIKINK_CLIENT_SECRET?.trim())
      : process.env.QIKINK_CLIENT_SECRET?.trim()
  );

  const creds = inspectFirebaseCredentials();
  const isConfigured = creds.source !== 'NONE';

  let firestoreConnected = false;
  let firestoreError: string | undefined = undefined;

  if (isConfigured) {
    if (creds.diagnostics.missingOrInvalidFields.length > 0) {
      firestoreConnected = false;
      firestoreError = creds.diagnostics.missingOrInvalidFields.join('; ');
    } else {
      const health = await verifyFirestoreConnection(false);
      firestoreConnected = health.success;
      firestoreError = health.error;
    }
  }

  let databaseStatusLabel: string;
  if (!isConfigured) {
    databaseStatusLabel = 'Database: local file (NOT persistent)';
  } else if (firestoreConnected) {
    databaseStatusLabel = 'Database: Firestore connected';
  } else {
    databaseStatusLabel = 'Database: Firestore connection FAILED';
  }

  res.json({
    qikinkConfigured: Boolean(qikinkClient && qikinkSecret),
    qikinkSandbox: isSandbox,
    razorpayConfigured: Boolean(process.env.RAZORPAY_KEY_ID?.trim() && process.env.RAZORPAY_KEY_SECRET?.trim()),
    phonepeConfigured: Boolean(process.env.PHONEPE_MERCHANT_ID?.trim() && process.env.PHONEPE_SALT_KEY?.trim()),
    emailConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    adminConfigured: Boolean(process.env.ADMIN_SECRET_KEY?.trim()),
    firebaseConfigured: isConfigured,
    firestoreConnected,
    firestoreError,
    credentialDiagnostics: creds.diagnostics,
    databaseStatusLabel
  });
});

// Real-time Firestore Connection Test for Admin Console
apiRouter.post('/admin/test-firestore', requireAdmin, async (req: Request, res: Response) => {
  const creds = inspectFirebaseCredentials();
  if (creds.source === 'NONE') {
    return res.status(400).json({
      success: false,
      error: 'No Firebase credentials configured in environment variables.',
      diagnostics: creds.diagnostics
    });
  }

  if (creds.diagnostics.missingOrInvalidFields.length > 0) {
    return res.status(400).json({
      success: false,
      error: creds.diagnostics.missingOrInvalidFields.join('; '),
      diagnostics: creds.diagnostics
    });
  }

  const result = await verifyFirestoreConnection(true);
  res.json({
    success: result.success,
    error: result.error,
    diagnostics: creds.diagnostics
  });
});

apiRouter.get('/brand-settings', (req: Request, res: Response) => {
  res.json(db.getBrandSettings());
});

apiRouter.put('/brand-settings', requireAdmin, (req: Request, res: Response) => {
  const updated = db.saveBrandSettings(req.body);
  res.json(updated);
});

apiRouter.post('/admin/login', (req: Request, res: Response) => {
  const configuredSecret = process.env.ADMIN_SECRET_KEY?.trim();
  if (!configuredSecret) {
    return res.status(403).json({
      error: 'ADMIN_SECRET_KEY is not configured on the server. Please set it in your environment variables to enable admin access.'
    });
  }

  const { secretKey } = req.body;
  if (!secretKey || typeof secretKey !== 'string') {
    return res.status(400).json({ error: 'Please provide secret key' });
  }

  // Constant-time comparison
  const secretKeyBuffer = Buffer.from(secretKey.trim());
  const configuredBuffer = Buffer.from(configuredSecret);

  if (secretKeyBuffer.length !== configuredBuffer.length || !crypto.timingSafeEqual(secretKeyBuffer, configuredBuffer)) {
    return res.status(401).json({ error: 'Invalid secret key' });
  }

  // Issue 12-hour cryptographically signed token
  const { token, expiresAt } = generateAdminToken(configuredSecret);

  res.json({
    token,
    expiresAt,
    expiresIn: SESSION_DURATION_MS,
    message: 'Admin authenticated successfully. Session valid for 12 hours.'
  });
});

apiRouter.post('/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    db.revokeSession(token);
  }
  res.json({ success: true, message: 'Admin signed out successfully.' });
});

apiRouter.get('/admin/verify', (req: Request, res: Response) => {
  const configuredSecret = process.env.ADMIN_SECRET_KEY?.trim();
  if (!configuredSecret) return res.status(403).json({ valid: false });
  const token = req.headers.authorization?.split(' ')[1];
  const check = verifyAdminToken(token, configuredSecret);
  if (check.valid) {
    return res.json({ valid: true, expiresAt: check.expiresAt });
  }
  res.status(401).json({ valid: false, error: check.reason, code: 'SESSION_EXPIRED' });
});

// Storage Diagnostics endpoint
apiRouter.get('/admin/storage-status', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getStorageStatus());
});

// Image serving endpoint (Loads from Cloud Firestore with local /uploads fallback)
apiRouter.get('/images/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    if (isFirebaseConfigured()) {
      const imgDoc = await getImageFromFirestore(id);
      if (imgDoc && imgDoc.base64) {
        const buffer = Buffer.from(imgDoc.base64, 'base64');
        res.setHeader('Content-Type', imgDoc.contentType || 'image/webp');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('ETag', `"${id}"`);
        return res.send(buffer);
      }
    }
  } catch (err) {
    console.error(`[Images] Error fetching image "${id}" from Firestore:`, err);
  }

  // Fallback to local uploads directory
  try {
    const files = fs.readdirSync(UPLOADS_DIR);
    const matched = files.find(f => f.startsWith(id) || f === id);
    if (matched) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('ETag', `"${matched}"`);
      return res.sendFile(path.join(UPLOADS_DIR, matched));
    }
  } catch {}

  res.status(404).json({ error: 'Image not found' });
});

// Photo Upload endpoint (Saves to Cloud Firestore with local /uploads fallback)
apiRouter.post('/upload', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { dataUrl, name, files } = req.body;

    // Helper to process a single dataUrl
    const saveBase64Image = async (dUrl: string, customName?: string) => {
      const match = dUrl.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid image data URL format');
      }

      const rawExt = match[1].toLowerCase();
      const ext = rawExt === 'jpeg' ? 'jpg' : rawExt === 'svg+xml' ? 'svg' : rawExt;
      const contentType = rawExt === 'svg+xml' || rawExt === 'svg' ? 'image/svg+xml' : `image/${rawExt}`;
      const base64Data = match[2];
      const buffer = Buffer.from(base64Data, 'base64');

      // 25MB max per image check
      if (buffer.length > 25 * 1024 * 1024) {
        throw new Error('Image exceeds 25MB limit');
      }

      const safeBaseName = (customName || 'img')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 30);
      const imageId = `${safeBaseName}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const fileName = `${imageId}.${ext}`;
      const filePath = path.join(UPLOADS_DIR, fileName);

      // Save local backup file
      fs.writeFileSync(filePath, buffer);

      let publicUrl = `/uploads/${fileName}`;

      // Store directly in Cloud Firestore (no Firebase Storage)
      if (isFirebaseConfigured()) {
        try {
          const cloudUrl = await saveImageToFirestore(imageId, fileName, contentType, base64Data, buffer.length);
          if (cloudUrl) {
            publicUrl = cloudUrl;
          }
        } catch (cloudErr) {
          console.error('[Firebase Admin] Cloud Firestore image save failed, using local fallback:', cloudErr);
        }
      }

      return {
        url: publicUrl,
        fileName,
        size: buffer.length
      };
    };

    if (Array.isArray(files) && files.length > 0) {
      const uploaded = [];
      for (const f of files) {
        const item = await saveBase64Image(f.dataUrl || f, f.name);
        uploaded.push(item);
      }
      return res.json({
        urls: uploaded.map(u => u.url),
        files: uploaded
      });
    }

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Please provide dataUrl for image upload' });
    }

    const saved = await saveBase64Image(dataUrl, name);
    res.json({
      url: saved.url,
      fileName: saved.fileName,
      size: saved.size
    });
  } catch (err: any) {
    console.error('Image upload failed:', err);
    res.status(500).json({ error: err.message || 'Failed to save uploaded image' });
  }
});

apiRouter.post('/admin/qikink/ping', requireAdmin, async (req: Request, res: Response) => {
  const result = await qikink.ping();
  res.status(result.status).json(result);
});

apiRouter.get('/admin/logs', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getLogs());
});

apiRouter.get('/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const orders = db.getOrders();
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const pendingCodRevenue = orders
    .filter(o => o.paymentStatus === 'COD_PENDING')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const orderCount = orders.length;
  const aov = orderCount > 0 ? Math.round(totalRevenue / (orders.filter(o => o.paymentStatus === 'PAID').length || 1)) : 0;
  const pendingFulfillment = orders.filter(o => o.fulfillmentStatus === 'UNFULFILLED' || o.fulfillmentStatus === 'FAILED').length;
  const fulfilledOrders = orders.filter(o => o.fulfillmentStatus === 'SENT_TO_QIKINK' || o.fulfillmentStatus === 'DELIVERED').length;

  res.json({
    totalRevenue,
    pendingCodRevenue,
    orderCount,
    aov,
    pendingFulfillment,
    fulfilledOrders,
    productCount: db.getProducts().length
  });
});

// -------------------------------------------------------------
// 2. PRODUCTS API
// -------------------------------------------------------------

apiRouter.get('/products', (req: Request, res: Response) => {
  let products = db.getProducts();

  // If not admin query, filter only active products
  const isAdmin = req.query.admin === 'true';
  if (!isAdmin) {
    products = products.filter(p => p.isActive);
  }

  // Filter by fit
  const fit = req.query.fit as string;
  if (fit && fit !== 'all') {
    products = products.filter(p => p.fit.toLowerCase() === fit.toLowerCase());
  }

  // Filter by size
  const size = req.query.size as string;
  if (size && size !== 'all') {
    products = products.filter(p => p.sizes.includes(size as TShirtSize));
  }

  // Search
  const search = (req.query.search as string)?.toLowerCase()?.trim();
  if (search) {
    products = products.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search) ||
      p.fit.toLowerCase().includes(search) ||
      p.printType.toLowerCase().includes(search)
    );
  }

  // Sort
  const sort = req.query.sort as string;
  if (sort === 'price-low') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-high') {
    products.sort((a, b) => b.price - a.price);
  } else if (sort === 'name') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Newest first
    products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json(products);
});

apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const product = db.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

apiRouter.post('/products', requireAdmin, (req: Request, res: Response) => {
  const body = req.body;
  if (!body.name || !body.price) {
    return res.status(400).json({ error: 'Product name and price are required' });
  }

  const id = `prod_${Date.now()}`;
  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  const newProduct: Product = {
    id,
    slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
    name: body.name.trim(),
    description: body.description?.trim() || '',
    price: Number(body.price),
    fit: body.fit || 'Oversized',
    printType: body.printType || 'Direct-to-Garment (DTG)',
    gsm: Number(body.gsm) || 240,
    fabric: body.fabric || '100% Combed Ringspun Cotton',
    careInstructions: body.careInstructions || 'Machine wash cold inside-out, tumble dry low or hang dry. Do not iron directly on print.',
    images: Array.isArray(body.images) && body.images.length > 0 ? body.images : [],
    colors: Array.isArray(body.colors) && body.colors.length > 0 ? body.colors : [{ name: 'Deep Indigo', hex: '#254587' }],
    sizes: Array.isArray(body.sizes) && body.sizes.length > 0 ? body.sizes : ['S', 'M', 'L', 'XL'],
    variants: Array.isArray(body.variants) ? body.variants : [],
    qikinkDesignReference: body.qikinkDesignReference?.trim(),
    isActive: body.isActive !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.saveProduct(newProduct);
  res.status(201).json(newProduct);
});

apiRouter.put('/products/:id', requireAdmin, (req: Request, res: Response) => {
  const existing = db.getProductById(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const body = req.body;
  const updated: Product = {
    ...existing,
    name: body.name !== undefined ? body.name.trim() : existing.name,
    description: body.description !== undefined ? body.description.trim() : existing.description,
    price: body.price !== undefined ? Number(body.price) : existing.price,
    fit: body.fit || existing.fit,
    printType: body.printType || existing.printType,
    gsm: body.gsm !== undefined ? Number(body.gsm) : existing.gsm,
    fabric: body.fabric || existing.fabric,
    careInstructions: body.careInstructions || existing.careInstructions,
    images: Array.isArray(body.images) ? body.images : existing.images,
    colors: Array.isArray(body.colors) ? body.colors : existing.colors,
    sizes: Array.isArray(body.sizes) ? body.sizes : existing.sizes,
    variants: Array.isArray(body.variants) ? body.variants : existing.variants,
    qikinkDesignReference: body.qikinkDesignReference !== undefined ? body.qikinkDesignReference.trim() : existing.qikinkDesignReference,
    isActive: body.isActive !== undefined ? Boolean(body.isActive) : existing.isActive,
    updatedAt: new Date().toISOString()
  };

  db.saveProduct(updated);
  res.json(updated);
});

apiRouter.delete('/products/:id', requireAdmin, (req: Request, res: Response) => {
  const deleted = db.deleteProduct(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true, message: 'Product deleted' });
});

// -------------------------------------------------------------
// 3. COUPONS API
// -------------------------------------------------------------

apiRouter.get('/coupons', requireAdmin, (req: Request, res: Response) => {
  res.json(db.getCoupons());
});

apiRouter.post('/coupons', requireAdmin, (req: Request, res: Response) => {
  const { code, discountType, discountValue, minOrderAmount, maxDiscount, maxUses, expiryDate } = req.body;
  if (!code || !discountValue) {
    return res.status(400).json({ error: 'Coupon code and discount value are required' });
  }

  const coupon: Coupon = {
    id: `coup_${Date.now()}`,
    code: code.trim().toUpperCase(),
    discountType: discountType || 'PERCENTAGE',
    discountValue: Number(discountValue),
    minOrderAmount: Number(minOrderAmount) || 0,
    maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
    maxUses: maxUses ? Number(maxUses) : undefined,
    usedCount: 0,
    expiryDate: expiryDate || undefined,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  db.saveCoupon(coupon);
  res.status(201).json(coupon);
});

apiRouter.delete('/coupons/:id', requireAdmin, (req: Request, res: Response) => {
  const deleted = db.deleteCoupon(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Coupon not found' });
  res.json({ success: true });
});

apiRouter.post('/coupons/validate', (req: Request, res: Response) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Enter a coupon code' });

  const coupon = db.getCouponByCode(code);
  if (!coupon) {
    return res.status(404).json({ valid: false, error: 'Invalid or inactive coupon code' });
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return res.status(400).json({ valid: false, error: 'This coupon has expired' });
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return res.status(400).json({ valid: false, error: 'This coupon has reached its usage limit' });
  }

  const amount = Number(subtotal) || 0;
  if (amount < coupon.minOrderAmount) {
    return res.status(400).json({
      valid: false,
      error: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
    });
  }

  let discount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discount = (amount * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, amount);

  res.json({
    valid: true,
    code: coupon.code,
    discount: Math.round(discount),
    coupon
  });
});

// -------------------------------------------------------------
// 4. ORDERS & CHECKOUT API
// -------------------------------------------------------------

apiRouter.get('/orders', requireAdmin, (req: Request, res: Response) => {
  const orders = db.getOrders();
  // Most recent first
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(orders);
});

apiRouter.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // 1. Admin access: Requires valid ADMIN_SECRET_KEY session token
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET_KEY?.trim() || '';
  if (authHeader && authHeader.startsWith('Bearer ') && adminSecret) {
    const token = authHeader.split(' ')[1];
    if (verifyAdminToken(token, adminSecret).valid) {
      return res.json(order);
    }
  }

  // 2. Customer privacy enforcement: A customer may ONLY see their own order.
  // Validate cryptographically via orderAccessToken, or by matching email / phone
  const queryToken = (req.query.token as string)?.trim() || (req.headers['x-order-token'] as string)?.trim();
  const queryEmail = (req.query.email as string)?.trim().toLowerCase();
  const queryPhone = (req.query.phone as string)?.trim();

  const tokenMatches = Boolean(queryToken && order.orderAccessToken && queryToken === order.orderAccessToken);
  const emailMatches = Boolean(queryEmail && order.shippingAddress.email.toLowerCase() === queryEmail);
  const phoneMatches = Boolean(
    queryPhone &&
    order.shippingAddress.phone.replace(/[^0-9]/g, '').slice(-10) === queryPhone.replace(/[^0-9]/g, '').slice(-10)
  );

  if (tokenMatches || emailMatches || phoneMatches) {
    return res.json(order);
  }

  // Deny public enumeration of other customers' orders
  return res.status(403).json({
    error: 'Access restricted: Please enter the phone number or email used during checkout to view this order receipt.',
    verificationRequired: true
  });
});

// Public Order Creation (COD or initiating order)
apiRouter.post('/orders', async (req: Request, res: Response) => {
  const { items, shippingAddress, paymentMethod, couponCode } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine1 || !shippingAddress.pincode) {
    return res.status(400).json({ error: 'Complete shipping address is required' });
  }

  // Calculate pricing server-side to prevent tampering
  let subtotal = 0;
  const isSandbox = (process.env.QIKINK_SANDBOX_MODE ?? 'true').toLowerCase() === 'true';

  const orderItems = items.map(item => {
    const product = db.getProductById(item.productId);
    const unitPrice = product ? product.price : Number(item.unitPrice || 0);
    const qty = Math.max(1, Number(item.quantity || 1));
    const totalPrice = unitPrice * qty;
    subtotal += totalPrice;

    return {
      productId: item.productId,
      productName: item.productName || product?.name || 'T-Shirt',
      productImage: item.productImage || product?.images?.[0] || '',
      colorName: item.colorName,
      colorHex: item.colorHex,
      size: item.size,
      productSku: item.productSku || `${item.productId}-${item.colorName}-${item.size}`,
      storeSku: item.storeSku || item.productSku || '',
      quantity: qty,
      unitPrice,
      totalPrice,
      isSandboxSku: isSandbox
    };
  });

  // Calculate Shipping (Free above ₹1499, else ₹99)
  const shippingFee = subtotal >= 1499 ? 0 : 99;
  const codFee = paymentMethod === 'COD' ? 60 : 0;

  // Coupon discount calculation
  let discount = 0;
  if (couponCode) {
    const coupon = db.getCouponByCode(couponCode);
    if (coupon && (!coupon.expiryDate || new Date(coupon.expiryDate) >= new Date()) && subtotal >= coupon.minOrderAmount) {
      if (coupon.discountType === 'PERCENTAGE') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
      } else {
        discount = coupon.discountValue;
      }
      discount = Math.min(discount, subtotal);
      coupon.usedCount += 1;
      db.saveCoupon(coupon);
    }
  }

  const totalAmount = Math.max(0, subtotal + shippingFee + codFee - discount);

  // Generate unique order number <= 15 chars (e.g. RZ-849204)
  const orderNumber = `RZ${Math.floor(100000 + Math.random() * 900000)}`;

  const orderId = `order_${Date.now()}`;
  const initialPaymentStatus: PaymentStatus = paymentMethod === 'COD' ? 'COD_PENDING' : 'PENDING';

  const newOrder: Order = {
    id: orderId,
    orderNumber,
    items: orderItems,
    shippingAddress,
    paymentMethod: paymentMethod as PaymentMethod,
    paymentStatus: initialPaymentStatus,
    fulfillmentStatus: 'UNFULFILLED',
    subtotal,
    shippingFee,
    codFee,
    discount,
    couponCode: discount > 0 ? couponCode : undefined,
    totalAmount,
    orderAccessToken: crypto.randomBytes(24).toString('hex'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.saveOrder(newOrder);

  // If COD, push immediately to Qikink if configured
  if (paymentMethod === 'COD') {
    if (qikink.isConfigured()) {
      try {
        const qikinkRes = await qikink.pushOrder(newOrder);
        if (qikinkRes.success) {
          newOrder.fulfillmentStatus = 'SENT_TO_QIKINK';
          newOrder.qikinkOrderId = qikinkRes.qikinkOrderId;
          newOrder.qikinkAwb = qikinkRes.awb;
          newOrder.qikinkStatus = 'Created in Qikink';
        } else {
          newOrder.fulfillmentStatus = 'FAILED';
          newOrder.qikinkError = qikinkRes.error;
        }
        db.saveOrder(newOrder);
      } catch (err: any) {
        console.error('Qikink COD auto-push failed:', err);
        newOrder.fulfillmentStatus = 'FAILED';
        newOrder.qikinkError = err.message;
        db.saveOrder(newOrder);
      }
    }
  }

  res.status(201).json(newOrder);
});

// Admin Resend to Qikink
apiRouter.post('/orders/:id/resend-qikink', requireAdmin, async (req: Request, res: Response) => {
  const order = db.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const result = await qikink.pushOrder(order);
  if (result.success) {
    order.fulfillmentStatus = 'SENT_TO_QIKINK';
    order.qikinkOrderId = result.qikinkOrderId;
    if (result.awb) order.qikinkAwb = result.awb;
    order.qikinkError = undefined;
    order.qikinkStatus = 'Dispatched to Qikink';
    db.saveOrder(order);
    res.json({ success: true, order, qikinkOrderId: result.qikinkOrderId, awb: result.awb });
  } else {
    order.fulfillmentStatus = 'FAILED';
    order.qikinkError = result.error;
    db.saveOrder(order);
    res.status(400).json({ success: false, error: result.error });
  }
});

// -------------------------------------------------------------
// 5. PAYMENTS API (Razorpay & PhonePe)
// -------------------------------------------------------------

apiRouter.get('/payments/config', (req: Request, res: Response) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID?.trim() || null,
    phonepeEnabled: Boolean(process.env.PHONEPE_MERCHANT_ID?.trim() && process.env.PHONEPE_SALT_KEY?.trim())
  });
});

// Razorpay Order Creation
apiRouter.post('/payments/razorpay/create-order', async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    return res.status(400).json({ error: 'Razorpay is not configured on this server.' });
  }

  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(order.totalAmount * 100), // amount in paise
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: order.id,
          customerEmail: order.shippingAddress.email
        }
      })
    });

    const data = await razorpayRes.json();
    if (!razorpayRes.ok) {
      throw new Error(data.error?.description || 'Razorpay order creation failed');
    }

    res.json({
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency,
      keyId: keyId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Razorpay order creation failed' });
  }
});

// Razorpay Payment Verification
apiRouter.post('/payments/razorpay/verify', async (req: Request, res: Response) => {
  const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keySecret) {
    return res.status(400).json({ error: 'Razorpay secret not configured' });
  }

  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Signature validation: HMAC-SHA256(order_id + "|" + payment_id, secret)
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    order.paymentStatus = 'FAILED';
    db.saveOrder(order);
    return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
  }

  // Payment verified!
  order.paymentStatus = 'PAID';
  order.paymentDetails = {
    razorpayOrderId,
    razorpayPaymentId,
    transactionId: razorpayPaymentId
  };
  db.saveOrder(order);

  // Auto push to Qikink
  if (qikink.isConfigured()) {
    try {
      const qRes = await qikink.pushOrder(order);
      if (qRes.success) {
        order.fulfillmentStatus = 'SENT_TO_QIKINK';
        order.qikinkOrderId = qRes.qikinkOrderId;
        order.qikinkAwb = qRes.awb;
      } else {
        order.fulfillmentStatus = 'FAILED';
        order.qikinkError = qRes.error;
      }
      db.saveOrder(order);
    } catch (err: any) {
      console.error('Qikink prepaid push failed:', err);
    }
  }

  res.json({ success: true, order });
});

// PhonePe Payment Initiation
apiRouter.post('/payments/phonepe/initiate', async (req: Request, res: Response) => {
  const { orderId, callbackUrl } = req.body;
  const merchantId = process.env.PHONEPE_MERCHANT_ID?.trim();
  const saltKey = process.env.PHONEPE_SALT_KEY?.trim();
  const saltIndex = process.env.PHONEPE_SALT_INDEX?.trim() || '1';
  const env = (process.env.PHONEPE_ENV?.trim() || 'UAT').toUpperCase();

  if (!merchantId || !saltKey) {
    return res.status(400).json({ error: 'PhonePe gateway is not configured.' });
  }

  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const transactionId = `TXN_${order.orderNumber}_${Date.now()}`;
  const host = env === 'PROD' ? 'https://api.phonepe.com/apis/hermes' : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

  const payload = {
    merchantId,
    merchantTransactionId: transactionId,
    merchantUserId: order.shippingAddress.email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 36) || 'USER1',
    amount: Math.round(order.totalAmount * 100), // paise
    redirectUrl: `${callbackUrl}?orderId=${order.id}&txnId=${transactionId}`,
    redirectMode: 'POST',
    callbackUrl: `${process.env.APP_URL || ''}/api/webhooks/phonepe`,
    mobileNumber: order.shippingAddress.phone.replace(/[^0-9]/g, '').slice(-10),
    paymentInstrument: {
      type: 'PAY_PAGE'
    }
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const stringToHash = base64Payload + '/pg/v1/pay' + saltKey;
  const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + saltIndex;

  try {
    const response = await fetch(`${host}/pg/v1/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'Accept': 'application/json'
      },
      body: JSON.stringify({ request: base64Payload })
    });

    const data = await response.json();
    if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
      res.json({
        redirectUrl: data.data.instrumentResponse.redirectInfo.url,
        merchantTransactionId: transactionId
      });
    } else {
      res.status(400).json({ error: data.message || 'PhonePe initialization rejected' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'PhonePe request error' });
  }
});

// PhonePe Callback / Status verification
apiRouter.post('/payments/phonepe/status', async (req: Request, res: Response) => {
  const { orderId, transactionId } = req.body;
  const merchantId = process.env.PHONEPE_MERCHANT_ID?.trim();
  const saltKey = process.env.PHONEPE_SALT_KEY?.trim();
  const saltIndex = process.env.PHONEPE_SALT_INDEX?.trim() || '1';
  const env = (process.env.PHONEPE_ENV?.trim() || 'UAT').toUpperCase();

  if (!merchantId || !saltKey) {
    return res.status(400).json({ error: 'PhonePe credentials not configured' });
  }

  const order = db.getOrderById(orderId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const host = env === 'PROD' ? 'https://api.phonepe.com/apis/hermes' : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  const statusEndpoint = `/pg/v1/status/${merchantId}/${transactionId}`;
  const stringToHash = statusEndpoint + saltKey;
  const checksum = crypto.createHash('sha256').update(stringToHash).digest('hex') + '###' + saltIndex;

  try {
    const response = await fetch(`${host}${statusEndpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': merchantId
      }
    });

    const data = await response.json();
    if (data.code === 'PAYMENT_SUCCESS') {
      order.paymentStatus = 'PAID';
      order.paymentDetails = { phonepeTransactionId: transactionId, transactionId };
      db.saveOrder(order);

      // Push to Qikink
      if (qikink.isConfigured()) {
        try {
          const qRes = await qikink.pushOrder(order);
          if (qRes.success) {
            order.fulfillmentStatus = 'SENT_TO_QIKINK';
            order.qikinkOrderId = qRes.qikinkOrderId;
            order.qikinkAwb = qRes.awb;
          }
          db.saveOrder(order);
        } catch (err) {
          console.error('Qikink auto push failed:', err);
        }
      }

      res.json({ success: true, status: 'SUCCESS', order });
    } else {
      order.paymentStatus = 'FAILED';
      db.saveOrder(order);
      res.json({ success: false, status: data.code, message: data.message });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Status check failed' });
  }
});

// -------------------------------------------------------------
// 6. CUSTOMER ACCOUNT & PROFILE API
// -------------------------------------------------------------

apiRouter.post('/customer/auth', (req: Request, res: Response) => {
  const { email, name, phone } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  let customer = db.getCustomerByEmail(email);
  if (!customer) {
    customer = {
      id: `cust_${Date.now()}`,
      name: name?.trim() || email.split('@')[0],
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      savedAddresses: [],
      wishlist: [],
      createdAt: new Date().toISOString()
    };
    db.saveCustomer(customer);
  }

  // Generate lightweight session token
  const token = Buffer.from(`${customer.id}:${Date.now()}`).toString('base64');
  res.json({ customer, token });
});

apiRouter.get('/customer/me', (req: Request, res: Response) => {
  const customerId = req.query.id as string;
  if (!customerId) return res.status(400).json({ error: 'Customer ID required' });

  const customer = db.getCustomerById(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  res.json(customer);
});

apiRouter.post('/customer/addresses', (req: Request, res: Response) => {
  const { customerId, address } = req.body;
  const customer = db.getCustomerById(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  customer.savedAddresses.push(address);
  db.saveCustomer(customer);
  res.json(customer);
});

apiRouter.delete('/customer/addresses/:index', (req: Request, res: Response) => {
  const customerId = req.query.customerId as string;
  const index = parseInt(req.params.index, 10);
  const customer = db.getCustomerById(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  if (index >= 0 && index < customer.savedAddresses.length) {
    customer.savedAddresses.splice(index, 1);
    db.saveCustomer(customer);
  }
  res.json(customer);
});

apiRouter.post('/customer/wishlist/toggle', (req: Request, res: Response) => {
  const { customerId, productId } = req.body;
  const customer = db.getCustomerById(customerId);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });

  const exists = customer.wishlist.includes(productId);
  if (exists) {
    customer.wishlist = customer.wishlist.filter(id => id !== productId);
  } else {
    customer.wishlist.push(productId);
  }
  db.saveCustomer(customer);
  res.json(customer);
});

apiRouter.get('/customer/orders', (req: Request, res: Response) => {
  const email = (req.query.email as string)?.trim().toLowerCase();
  const phone = (req.query.phone as string)?.trim();

  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone required' });
  }

  const allOrders = db.getOrders();
  const matching = allOrders.filter(o => {
    const emailMatches = email && o.shippingAddress.email.toLowerCase() === email;
    const phoneMatches = phone && o.shippingAddress.phone.replace(/[^0-9]/g, '').slice(-10) === phone.replace(/[^0-9]/g, '').slice(-10);
    return emailMatches || phoneMatches;
  });

  matching.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(matching);
});

// -------------------------------------------------------------
// 7. PINCODE CHECKER API (Real Indian Postal Codes)
// -------------------------------------------------------------

apiRouter.get('/pincode/:code', (req: Request, res: Response) => {
  const code = req.params.code?.trim();
  if (!/^[1-9][0-9]{5}$/.test(code)) {
    return res.status(400).json({ valid: false, error: 'Enter a valid 6-digit Indian PIN code' });
  }

  // Determine regional zone from first digit:
  // 1,2: North | 3,4: West | 5,6: South | 7,8: East | 9: Army
  const firstDigit = code.charAt(0);
  let zone = 'National Zone';
  let deliveryDays = '4-6 business days';

  if (['1', '2'].includes(firstDigit)) {
    zone = 'North India (Delhi, Punjab, UP, Haryana, Rajasthan)';
    deliveryDays = '3-5 business days';
  } else if (['3', '4'].includes(firstDigit)) {
    zone = 'West India (Maharashtra, Gujarat, Goa, MP)';
    deliveryDays = '3-4 business days';
  } else if (['5', '6'].includes(firstDigit)) {
    zone = 'South India (Karnataka, TN, Kerala, AP, Telangana)';
    deliveryDays = '2-4 business days';
  } else if (['7', '8'].includes(firstDigit)) {
    zone = 'East & North-East India (WB, Bihar, Odisha, Assam)';
    deliveryDays = '4-6 business days';
  }

  res.json({
    valid: true,
    pincode: code,
    zone,
    estimatedDays: deliveryDays,
    codAvailable: true,
    expressAvailable: true
  });
});

// -------------------------------------------------------------
// 8. NEWSLETTER & CONTACT API
// -------------------------------------------------------------

apiRouter.post('/newsletter', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address required' });
  }

  db.addNewsletter(email);
  res.json({ success: true, message: 'Welcome to the Rangrez Atelier newsletter.' });
});

apiRouter.post('/contact', (req: Request, res: Response) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  const entry = db.addMessage({ name, email, phone, subject: subject || 'General Inquiry', message });
  res.json({ success: true, message: 'Your message has been received. Our concierge will reply within 24 hours.', id: entry.id });
});
