import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Product, Order, Coupon, Customer, ApiLog, BrandSettings } from '../src/types/index.ts';
import {
  isFirebaseConfigured,
  inspectFirebaseCredentials,
  verifyFirestoreConnection,
  getCachedFirestoreHealth,
  fetchAllFromFirestore,
  saveToFirestore,
  deleteFromFirestore,
  getDocFromFirestore
} from './firebase.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

export interface StoreData {
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  customers: Customer[];
  logs: ApiLog[];
  messages: Array<{ id: string; name: string; email: string; phone?: string; subject: string; message: string; createdAt: string }>;
  newsletter: Array<{ email: string; createdAt: string }>;
  brandSettings: BrandSettings;
  revokedSessions?: string[];
}

const defaultBrandSettings: BrandSettings = {
  logoUrl: '',
  iconUrl: '',
  heroManImage: '/src/assets/images/hero_male_tee_1791638393383.jpg',
  heroWomanImage: '/src/assets/images/hero_female_tee_1791638403875.jpg',
  tileHimImage: '/src/assets/images/hero_male_tee_1791638393383.jpg',
  tileHerImage: '/src/assets/images/hero_female_tee_1791638403875.jpg',
  lookbookImages: [
    '/src/assets/images/lookbook_indigo_dye_1791638414373.jpg',
    '/src/assets/images/lookbook_urban_street_1791638440171.jpg',
    '/src/assets/images/hero_male_tee_1791638393383.jpg',
    '/src/assets/images/hero_female_tee_1791638403875.jpg'
  ],
  heroHeading: 'WEAR THE COLOURS OF YOUR STORY',
  heroSubline: 'Premium printed oversized tees',
  deliveryTimeText: '',
  shippingOfferText: '',
  freeShippingThreshold: undefined,
  pincodeCoverageText: ''
};

const initialData: StoreData = {
  products: [],
  orders: [],
  coupons: [],
  customers: [],
  logs: [],
  messages: [],
  newsletter: [],
  brandSettings: defaultBrandSettings,
  revokedSessions: []
};

class Database {
  private data: StoreData = initialData;
  private isLoaded = false;
  private firestoreConnected = false;
  private firestoreError?: string;

  constructor() {
    this.ensureDataDirectory();
    this.load();
    this.initFirestoreSync();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (err) {
        console.error('Failed to create data directory:', err);
      }
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = {
          products: Array.isArray(parsed.products) ? parsed.products : [],
          orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          coupons: Array.isArray(parsed.coupons) ? parsed.coupons : [],
          customers: Array.isArray(parsed.customers) ? parsed.customers : [],
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
          messages: Array.isArray(parsed.messages) ? parsed.messages : [],
          newsletter: Array.isArray(parsed.newsletter) ? parsed.newsletter : [],
          brandSettings: parsed.brandSettings && typeof parsed.brandSettings === 'object'
            ? { ...defaultBrandSettings, ...parsed.brandSettings }
            : defaultBrandSettings,
          revokedSessions: Array.isArray(parsed.revokedSessions) ? parsed.revokedSessions : []
        };
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Error loading db file, initializing with empty store:', err);
      this.data = initialData;
      this.save();
    }
    this.isLoaded = true;
  }

  private async initFirestoreSync() {
    const creds = inspectFirebaseCredentials();
    if (creds.source === 'NONE') {
      this.firestoreConnected = false;
      this.firestoreError = undefined;
      return;
    }

    console.log('[Firebase] Cloud credentials detected. Testing live connection via "healthcheck" collection...');
    const health = await verifyFirestoreConnection(true);

    if (!health.success) {
      this.firestoreConnected = false;
      this.firestoreError = health.error || 'Connection failed';
      console.error(`[Firebase] ERROR: Cloud Firestore live connection test failed: ${this.firestoreError}`);
      console.error('[Firebase] Firestore synchronization suspended. Credentials or permissions must be resolved.');
      return;
    }

    this.firestoreConnected = true;
    this.firestoreError = undefined;

    try {
      console.log('[Firebase] Live connection verified. Synchronizing Firestore collections with local cache...');

      // 1. Products
      const cloudProducts = await fetchAllFromFirestore<Product>('products');
      if (cloudProducts.length > 0) {
        this.data.products = cloudProducts;
        this.save();
        console.log(`[Firebase] Synced ${cloudProducts.length} products from Firestore`);
      } else if (this.data.products.length > 0) {
        let allSucceeded = true;
        let seededCount = 0;
        for (const p of this.data.products) {
          const ok = await saveToFirestore('products', p.id, p);
          if (!ok) {
            allSucceeded = false;
            break;
          }
          seededCount++;
        }
        if (allSucceeded && seededCount > 0) {
          console.log(`[Firebase] Seeded ${seededCount} products into Firestore`);
        } else {
          console.error(`[Firebase] Product seeding halted: write failed after ${seededCount} items`);
        }
      }

      // 2. Brand Settings
      const cloudSettings = await getDocFromFirestore<BrandSettings>('settings', 'brand');
      if (cloudSettings) {
        this.data.brandSettings = { ...defaultBrandSettings, ...cloudSettings };
        this.save();
        console.log('[Firebase] Synced brand settings from Firestore');
      } else if (this.data.brandSettings) {
        await saveToFirestore('settings', 'brand', this.data.brandSettings);
      }

      // 3. Orders
      const cloudOrders = await fetchAllFromFirestore<Order>('orders');
      if (cloudOrders.length > 0) {
        const localIds = new Set(this.data.orders.map(o => o.id));
        for (const o of cloudOrders) {
          if (!localIds.has(o.id)) {
            this.data.orders.push(o);
          }
        }
        this.save();
      } else if (this.data.orders.length > 0) {
        for (const o of this.data.orders) {
          await saveToFirestore('orders', o.id, o);
        }
      }

      // 4. Coupons
      const cloudCoupons = await fetchAllFromFirestore<Coupon>('coupons');
      if (cloudCoupons.length > 0) {
        this.data.coupons = cloudCoupons;
        this.save();
      } else if (this.data.coupons.length > 0) {
        for (const c of this.data.coupons) {
          await saveToFirestore('coupons', c.id, c);
        }
      }
    } catch (err: any) {
      this.firestoreError = err?.message || String(err);
      console.error('[Firebase] Sync error:', this.firestoreError);
    }
  }

  private save() {
    try {
      this.ensureDataDirectory();
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Failed to save db file:', err);
    }
  }

  // Products
  getProducts(): Product[] {
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id || p.slug === id);
  }

  saveProduct(product: Product): Product {
    const index = this.data.products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      this.data.products[index] = { ...product, updatedAt: new Date().toISOString() };
    } else {
      this.data.products.push(product);
    }
    this.save();

    // Firestore async sync
    if (isFirebaseConfigured()) {
      saveToFirestore('products', product.id, product).catch(err => {
        console.error('[Firebase] saveProduct background error:', err);
      });
    }

    return product;
  }

  deleteProduct(id: string): boolean {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter(p => p.id !== id);
    if (this.data.products.length !== before) {
      this.save();

      // Firestore async sync
      if (isFirebaseConfigured()) {
        deleteFromFirestore('products', id).catch(err => {
          console.error('[Firebase] deleteProduct background error:', err);
        });
      }

      return true;
    }
    return false;
  }

  // Orders
  getOrders(): Order[] {
    return this.data.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.data.orders.find(o => o.id === id || o.orderNumber === id);
  }

  saveOrder(order: Order): Order {
    const index = this.data.orders.findIndex(o => o.id === order.id);
    if (index >= 0) {
      this.data.orders[index] = { ...order, updatedAt: new Date().toISOString() };
    } else {
      this.data.orders.push(order);
    }
    this.save();

    // Firestore async sync
    if (isFirebaseConfigured()) {
      saveToFirestore('orders', order.id, order).catch(err => {
        console.error('[Firebase] saveOrder background error:', err);
      });
    }

    return order;
  }

  // Coupons
  getCoupons(): Coupon[] {
    return this.data.coupons;
  }

  getCouponByCode(code: string): Coupon | undefined {
    return this.data.coupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase() && c.isActive);
  }

  saveCoupon(coupon: Coupon): Coupon {
    const index = this.data.coupons.findIndex(c => c.id === coupon.id);
    if (index >= 0) {
      this.data.coupons[index] = coupon;
    } else {
      this.data.coupons.push(coupon);
    }
    this.save();

    if (isFirebaseConfigured()) {
      saveToFirestore('coupons', coupon.id, coupon).catch(err => {
        console.error('[Firebase] saveCoupon background error:', err);
      });
    }

    return coupon;
  }

  deleteCoupon(id: string): boolean {
    const before = this.data.coupons.length;
    this.data.coupons = this.data.coupons.filter(c => c.id !== id);
    if (this.data.coupons.length !== before) {
      this.save();

      if (isFirebaseConfigured()) {
        deleteFromFirestore('coupons', id).catch(err => {
          console.error('[Firebase] deleteCoupon background error:', err);
        });
      }

      return true;
    }
    return false;
  }

  // Customers
  getCustomerByEmail(email: string): Customer | undefined {
    return this.data.customers.find(c => c.email.toLowerCase() === email.trim().toLowerCase());
  }

  getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find(c => c.id === id);
  }

  saveCustomer(customer: Customer): Customer {
    const index = this.data.customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      this.data.customers[index] = customer;
    } else {
      this.data.customers.push(customer);
    }
    this.save();

    if (isFirebaseConfigured()) {
      saveToFirestore('customers', customer.id, customer).catch(err => {
        console.error('[Firebase] saveCustomer background error:', err);
      });
    }

    return customer;
  }

  // Logs
  addLog(log: Omit<ApiLog, 'id' | 'timestamp'>): ApiLog {
    const entry: ApiLog = {
      ...log,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    this.data.logs.unshift(entry);
    if (this.data.logs.length > 100) {
      this.data.logs = this.data.logs.slice(0, 100);
    }
    this.save();

    if (isFirebaseConfigured()) {
      saveToFirestore('logs', entry.id, entry).catch(() => {});
    }

    return entry;
  }

  getLogs(): ApiLog[] {
    return this.data.logs;
  }

  // Messages & Newsletter
  addMessage(msg: { name: string; email: string; phone?: string; subject: string; message: string }) {
    const entry = {
      ...msg,
      id: `msg_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.messages.push(entry);
    this.save();

    if (isFirebaseConfigured()) {
      saveToFirestore('messages', entry.id, entry).catch(() => {});
    }

    return entry;
  }

  addNewsletter(email: string) {
    const exists = this.data.newsletter.some(n => n.email.toLowerCase() === email.trim().toLowerCase());
    if (!exists) {
      const entry = { email: email.trim().toLowerCase(), createdAt: new Date().toISOString() };
      this.data.newsletter.push(entry);
      this.save();

      if (isFirebaseConfigured()) {
        saveToFirestore('newsletter', Buffer.from(email).toString('hex').slice(0, 20), entry).catch(() => {});
      }
    }
    return true;
  }

  // Brand Settings
  getBrandSettings(): BrandSettings {
    return this.data.brandSettings || defaultBrandSettings;
  }

  saveBrandSettings(settings: Partial<BrandSettings>): BrandSettings {
    this.data.brandSettings = {
      ...this.getBrandSettings(),
      ...settings
    };
    this.save();

    if (isFirebaseConfigured()) {
      saveToFirestore('settings', 'brand', this.data.brandSettings).catch(err => {
        console.error('[Firebase] saveBrandSettings background error:', err);
      });
    }

    return this.data.brandSettings;
  }

  // Session & Auth Persistence
  revokeSession(token: string) {
    if (!this.data.revokedSessions) {
      this.data.revokedSessions = [];
    }
    if (!this.data.revokedSessions.includes(token)) {
      this.data.revokedSessions.push(token);
      if (this.data.revokedSessions.length > 1000) {
        this.data.revokedSessions = this.data.revokedSessions.slice(-1000);
      }
      this.save();
    }
  }

  isSessionRevoked(token: string): boolean {
    return Array.isArray(this.data.revokedSessions) && this.data.revokedSessions.includes(token);
  }

  // Persistent Storage Diagnostics
  getStorageStatus() {
    const creds = inspectFirebaseCredentials();
    const isConfigured = creds.source !== 'NONE';
    const cachedHealth = getCachedFirestoreHealth();
    const isConnected = cachedHealth ? cachedHealth.success : this.firestoreConnected;
    const activeError = cachedHealth?.error || this.firestoreError;

    let provider: string;
    let providerKey: 'firestore' | 'firestore_error' | 'local_file';

    if (!isConfigured) {
      provider = 'Local JSON File (data/store.json) - NOT persistent across redeploys';
      providerKey = 'local_file';
    } else if (isConnected) {
      provider = 'Google Cloud Firestore (Connected & Verified)';
      providerKey = 'firestore';
    } else {
      provider = 'Google Cloud Firestore (Connection FAILED)';
      providerKey = 'firestore_error';
    }

    return {
      provider,
      providerKey,
      cloudSynced: isConnected,
      firebaseConfigured: isConfigured,
      firestoreConnected: isConnected,
      firestoreError: activeError,
      credentialDiagnostics: creds.diagnostics,
      projectId: creds.projectId || null,
      clientEmail: creds.clientEmail || null,
      filePath: DB_FILE,
      counts: {
        products: this.data.products.length,
        orders: this.data.orders.length,
        coupons: this.data.coupons.length,
        customers: this.data.customers.length,
        logs: this.data.logs.length,
        messages: this.data.messages.length,
        newsletter: this.data.newsletter.length
      },
      requiredEnvVars: [
        'FIREBASE_SERVICE_ACCOUNT_JSON (Recommended)',
        'or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      ]
    };
  }
}

export const db = new Database();
