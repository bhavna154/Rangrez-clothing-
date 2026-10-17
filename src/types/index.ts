export type TShirtFit = 'Oversized' | 'Relaxed' | 'Regular Boxy' | 'Drop Shoulder' | 'Classic Fit';
export type PrintType = 'Direct-to-Garment (DTG)' | 'Screen Print' | 'High-Density Puff' | 'Vintage Discharge';
export type TShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface ProductColor {
  name: string;
  hex: string;
  secondaryHex?: string; // Optional two-tone swatch (body colour & ring/collar colour for ringer tees)
  photos?: string[];      // Separate photos uploaded for this colour (front, back, model, etc.)
  price?: number;         // Optional different selling price for this colour
  mrp?: number;           // Optional MRP for this colour
}

export interface ProductVariant {
  id: string;
  colorName: string;
  colorHex: string;
  secondaryHex?: string;
  size: TShirtSize;
  productSku: string; // Internal SKU
  storeSku: string;   // Qikink store SKU
  stock: number;
  price?: number;     // Selling price for this variant (defaults to colour price or base product price)
  mrp?: number;       // Optional MRP for this variant
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // Selling price (the price the customer pays)
  mrp?: number;  // Optional MRP / original price. When mrp > price, shows strikethrough & % OFF badge
  saleLabel?: string; // Optional sale label text (e.g. "Launch offer")
  saleStartDate?: string; // Optional ISO string or datetime for sale start
  saleEndDate?: string;   // Optional ISO string or datetime for sale end
  fit: TShirtFit;
  printType: PrintType;
  gsm?: number; // e.g. 240
  fabric?: string; // e.g. "100% Combed Ringspun Cotton"
  careInstructions?: string;
  deliveryTime?: string; // Optional delivery/dispatch time from admin (e.g. "Dispatched in 2-3 days")
  shippingOffer?: string; // Optional shipping offer from admin (e.g. "Free shipping above ₹1499")
  images: string[]; // General product photos (fallback when color has no photos)
  colors: ProductColor[];
  sizes: TShirtSize[];
  variants: ProductVariant[];
  qikinkDesignReference?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'COD' | 'RAZORPAY' | 'PHONEPE';
export type PaymentStatus = 'PENDING' | 'PAID' | 'COD_PENDING' | 'FAILED';
export type FulfillmentStatus = 'UNFULFILLED' | 'SENT_TO_QIKINK' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'FAILED';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  colorName: string;
  colorHex: string;
  size: TShirtSize;
  productSku: string;
  storeSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isSandboxSku?: boolean;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  email: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Order {
  id: string;
  orderNumber: string; // <= 15 chars, e.g. RZ-9821
  customerId?: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentDetails?: {
    transactionId?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    phonepeTransactionId?: string;
  };
  fulfillmentStatus: FulfillmentStatus;
  subtotal: number;
  shippingFee: number;
  codFee: number;
  discount: number;
  couponCode?: string;
  totalAmount: number; // For COD this is "Total Payable", for prepaid it is "Total Paid"
  qikinkOrderId?: string;
  qikinkAwb?: string;
  qikinkStatus?: string;
  qikinkError?: string;
  trackingUrl?: string;
  orderAccessToken?: string; // Private cryptographic token allowing customer to view their specific order
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  maxUses?: number;
  usedCount: number;
  expiryDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  savedAddresses: ShippingAddress[];
  wishlist: string[]; // product IDs
  createdAt: string;
}

export interface SetupStatus {
  qikinkConfigured: boolean;
  qikinkSandbox: boolean;
  razorpayConfigured: boolean;
  phonepeConfigured: boolean;
  emailConfigured: boolean;
  adminConfigured: boolean;
  firebaseConfigured?: boolean;
  firestoreConnected?: boolean;
  firestoreError?: string;
  databaseStatusLabel?: string;
  credentialDiagnostics?: {
    sourceName: string;
    sourceLength?: number;
    projectIdPresent: boolean;
    projectIdLength?: number;
    clientEmailPresent: boolean;
    clientEmailValid: boolean;
    clientEmailLength?: number;
    privateKeyPresent: boolean;
    privateKeyValid: boolean;
    privateKeyLength?: number;
    missingOrInvalidFields: string[];
  };
}

export interface ApiLog {
  id: string;
  timestamp: string;
  service: string;
  endpoint: string;
  method: string;
  status: number;
  durationMs: number;
  requestSnippet?: string;
  responseSnippet?: string;
  error?: string;
}

export interface BrandSettings {
  logoUrl?: string;
  iconUrl?: string;
  heroManImage?: string;
  heroWomanImage?: string;
  tileHimImage?: string;
  tileHerImage?: string;
  lookbookImages?: string[];
  heroHeading?: string;
  heroSubline?: string;
  // Shipping, delivery and coverage claims configured in admin
  deliveryTimeText?: string;
  shippingOfferText?: string;
  freeShippingThreshold?: number;
  pincodeCoverageText?: string;
}

