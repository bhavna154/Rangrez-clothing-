import React, { useState, useEffect, useRef } from 'react';
import {
  Lock, KeyRound, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Send,
  Package, ShoppingCart, Tag, Activity, Plus, Trash2, Edit3, Image, Upload, Eye, EyeOff, Sliders,
  Database, Save, FileText, HardDrive, ClipboardPaste, Clock, Smartphone, AlertCircle, Download, Palette, Sparkles
} from 'lucide-react';
import type { Product, ProductColor, Order, Coupon, SetupStatus, ApiLog, TShirtFit, PrintType, TShirtSize, ProductVariant, BrandSettings } from '../types/index.ts';
import { useToast } from '../context/ToastContext.tsx';
import { useBrand } from '../context/BrandContext.tsx';
import { RangrezLogo } from '../components/RangrezLogo.tsx';
import { ProductPhotoUploader } from '../components/ProductPhotoUploader.tsx';
import { compressAndResizeImage, uploadImageToServer } from '../utils/imageCompressor.ts';
import { calculateDiscountPercent } from '../utils/pricing.ts';

const ALL_SIZES: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const ALL_FITS: TShirtFit[] = ['Oversized', 'Relaxed', 'Regular Boxy', 'Drop Shoulder', 'Classic Fit'];
const ALL_PRINTS: PrintType[] = [
  'Direct-to-Garment (DTG)',
  'Screen Print',
  'High-Density Puff',
  'Vintage Discharge'
];

const initialProductFormState = {
  name: '',
  description: '',
  price: 1199,
  mrp: undefined as number | undefined,
  saleLabel: '',
  saleStartDate: '',
  saleEndDate: '',
  fit: 'Relaxed' as TShirtFit,
  printType: 'Direct-to-Garment (DTG)' as PrintType,
  gsm: 180 as number | undefined,
  fabric: '100% Combed Ringspun Cotton',
  careInstructions: '',
  deliveryTime: '',
  shippingOffer: '',
  images: [] as string[],
  colors: [] as ProductColor[],
  sizes: ['S', 'M', 'L', 'XL'] as TShirtSize[],
  qikinkDesignReference: '',
  isActive: true,
  variants: [] as ProductVariant[]
};

export const AdminPage: React.FC = () => {
  // 12-Hour session token that survives page reloads and mobile app switching
  const [token, setToken] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('rangrez_admin_token');
      const expStr = localStorage.getItem('rangrez_admin_token_exp');
      if (stored && expStr) {
        if (Date.now() < Number(expStr)) {
          return stored;
        } else {
          localStorage.removeItem('rangrez_admin_token');
          localStorage.removeItem('rangrez_admin_token_exp');
        }
      }
    } catch {}
    return null;
  });

  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(() => {
    try {
      const expStr = localStorage.getItem('rangrez_admin_token_exp');
      if (expStr && Date.now() >= Number(expStr)) {
        return 'Your admin session has expired (12-hour limit). Please log in again to continue.';
      }
    } catch {}
    return null;
  });

  const [secretInput, setSecretInput] = useState('');
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [storageStatus, setStorageStatus] = useState<any>(null);
  const [showStorageModal, setShowStorageModal] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const { showToast } = useToast();
  const { brandSettings, updateBrandSettings } = useBrand();

  // Active sub-tab
  const [activeTab, setActiveTab] = useState<'status' | 'products' | 'orders' | 'coupons' | 'brand'>('status');

  // Brand Settings form state
  const [brandForm, setBrandForm] = useState<BrandSettings>(brandSettings);
  const [savingBrand, setSavingBrand] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState<string | null>(null);

  useEffect(() => {
    if (brandSettings) {
      setBrandForm(brandSettings);
    }
  }, [brandSettings]);

  // Stats
  const [stats, setStats] = useState<{
    totalRevenue: number;
    pendingCodRevenue: number;
    orderCount: number;
    aov: number;
    pendingFulfillment: number;
    productCount: number;
  }>({ totalRevenue: 0, pendingCodRevenue: 0, orderCount: 0, aov: 0, pendingFulfillment: 0, productCount: 0 });

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);

  // Qikink ping state
  const [pingResult, setPingResult] = useState<{ ok: boolean; status: number; message: string; mode?: string } | null>(null);
  const [pingLoading, setPingLoading] = useState(false);

  // Add / Edit Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState(initialProductFormState);

  // Bulk SKU Paste modal
  const [bulkSkuText, setBulkSkuText] = useState('');
  const [showBulkSkuModal, setShowBulkSkuModal] = useState(false);

  // New coupon form
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FLAT',
    discountValue: 10,
    minOrderAmount: 999,
    maxDiscount: 500,
    maxUses: 100,
    expiryDate: ''
  });

  // Load Setup Status
  const fetchStatus = () => {
    fetch('/api/setup-status')
      .then(res => res.json())
      .then(data => setSetupStatus(data))
      .catch(() => {});
  };

  const [testingFirestore, setTestingFirestore] = useState(false);

  const handleTestFirestore = async () => {
    if (!token) return;
    setTestingFirestore(true);
    try {
      const res = await fetch('/api/admin/test-firestore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Firestore test write/read to "healthcheck" collection succeeded!', 'success');
      } else {
        showToast(`Firestore test failed: ${data.error || 'Connection failed'}`, 'error');
      }
      fetchStatus();
    } catch (err: any) {
      showToast(`Firestore test request error: ${err.message}`, 'error');
    } finally {
      setTestingFirestore(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSessionExpired = (msg?: string) => {
    try {
      localStorage.removeItem('rangrez_admin_token');
      localStorage.removeItem('rangrez_admin_token_exp');
    } catch {}
    setToken(null);
    setSessionExpiredNotice(msg || 'Your admin session has expired (12-hour limit). Please log in again to continue.');
    showToast('Session expired. Please log in again.', 'error');
  };

  // Fetch admin data once authenticated
  const loadAdminData = () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    const checkAuthResponse = (res: Response) => {
      if (res.status === 401) {
        handleSessionExpired();
        return false;
      }
      return true;
    };

    // Stats
    fetch('/api/admin/stats', { headers })
      .then(res => {
        if (!checkAuthResponse(res)) return null;
        return res.json();
      })
      .then(data => { if (data && !data.error) setStats(data); })
      .catch(() => {});

    // Storage Status
    fetch('/api/admin/storage-status', { headers })
      .then(res => {
        if (!checkAuthResponse(res)) return null;
        return res.json();
      })
      .then(data => { if (data && !data.error) setStorageStatus(data); })
      .catch(() => {});

    // Products (including inactive)
    fetch('/api/products?admin=true', { headers })
      .then(res => {
        if (!checkAuthResponse(res)) return null;
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => {});

    // Orders
    fetch('/api/orders', { headers })
      .then(res => {
        if (!checkAuthResponse(res)) return null;
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setOrders(data); })
      .catch(() => {});

    // Coupons
    fetch('/api/coupons', { headers })
      .then(res => {
        if (!checkAuthResponse(res)) return null;
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setCoupons(data); })
      .catch(() => {});

    // Logs
    fetch('/api/admin/logs', { headers })
      .then(res => {
        if (!checkAuthResponse(res)) return null;
        return res.json();
      })
      .then(data => { if (Array.isArray(data)) setLogs(data); })
      .catch(() => {});
  };

  useEffect(() => {
    if (token) {
      loadAdminData();
    }
  }, [token, activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: secretInput.trim() })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        const expTime = data.expiresAt || (Date.now() + 12 * 60 * 60 * 1000);
        try {
          localStorage.setItem('rangrez_admin_token', data.token);
          localStorage.setItem('rangrez_admin_token_exp', String(expTime));
        } catch {}
        setToken(data.token);
        setSessionExpiredNotice(null);
        showToast('Admin authenticated for 12 hours', 'success');
        setSecretInput('');
      } else {
        showToast(data.error || 'Authentication denied', 'error');
      }
    } catch {
      showToast('Network error during authentication', 'error');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (token) {
      fetch('/api/admin/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    try {
      localStorage.removeItem('rangrez_admin_token');
      localStorage.removeItem('rangrez_admin_token_exp');
    } catch {}
    setToken(null);
    setSessionExpiredNotice(null);
    showToast('Admin signed out', 'info');
  };

  const handlePingQikink = async () => {
    if (!token) return;
    setPingLoading(true);
    setPingResult(null);

    try {
      const res = await fetch('/api/admin/qikink/ping', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPingResult(data);
      if (data.ok) {
        showToast(`Qikink API Ping Successful (${data.mode})`, 'success');
      } else {
        showToast(data.message || 'Qikink Ping Failed', 'error');
      }
      // Refresh logs
      loadAdminData();
    } catch (err: any) {
      showToast('Network error pinging Qikink', 'error');
    } finally {
      setPingLoading(false);
    }
  };

  const handleResendToQikink = async (orderId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/resend-qikink`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Dispatched to Qikink! Order ID: ${data.qikinkOrderId}`, 'success');
      } else {
        showToast(data.error || 'Qikink rejected order', 'error');
      }
      loadAdminData();
    } catch {
      showToast('Error resending order', 'error');
    }
  };

  // Form Safety & Auto-Save Drafts
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  // Open Product Modal (with draft restoration for new products)
  const openProductModal = (prod?: Product) => {
    if (prod) {
      setEditingProduct(prod);
      setProductForm({
        name: prod.name,
        description: prod.description || '',
        price: prod.price,
        mrp: prod.mrp,
        saleLabel: prod.saleLabel || '',
        saleStartDate: prod.saleStartDate || '',
        saleEndDate: prod.saleEndDate || '',
        fit: prod.fit || 'Oversized',
        printType: prod.printType || 'Direct-to-Garment (DTG)',
        gsm: prod.gsm,
        fabric: prod.fabric || '',
        careInstructions: prod.careInstructions || '',
        deliveryTime: prod.deliveryTime || '',
        shippingOffer: prod.shippingOffer || '',
        images: prod.images || [],
        colors: prod.colors && prod.colors.length > 0
          ? prod.colors
          : prod.variants && prod.variants.length > 0
          ? Array.from(
              new Map(
                prod.variants.map(v => [
                  v.colorName.trim().toLowerCase(),
                  {
                    name: v.colorName.trim(),
                    hex: v.colorHex || '#111827',
                    secondaryHex: v.secondaryHex,
                    photos: []
                  }
                ])
              ).values()
            )
          : [],
        sizes: prod.sizes || ['S', 'M', 'L', 'XL'],
        qikinkDesignReference: prod.qikinkDesignReference || '',
        isActive: prod.isActive ?? true,
        variants: prod.variants || []
      });
      setDraftRestored(false);
      setIsFormDirty(false);
    } else {
      setEditingProduct(null);
      // Check for saved draft
      try {
        const rawDraft = localStorage.getItem('rangrez_product_form_draft');
        if (rawDraft) {
          const draft = JSON.parse(rawDraft);
          if (draft && draft.form && !draft.editingProductId) {
            setProductForm(draft.form);
            setDraftSavedAt(draft.savedAt || 'earlier session');
            setDraftRestored(true);
            setIsFormDirty(false);
            setShowProductModal(true);
            return;
          }
        }
      } catch {}

      setProductForm(initialProductFormState);
      setDraftRestored(false);
      setIsFormDirty(false);
    }
    setShowProductModal(true);
  };

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem('rangrez_product_form_draft');
    } catch {}
    setProductForm(initialProductFormState);
    setDraftRestored(false);
    setDraftSavedAt(null);
    setIsFormDirty(false);
    showToast('Draft discarded. Fresh form loaded.', 'info');
  };

  const handleSaveAsDraft = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const draftObj = {
      form: productForm,
      editingProductId: editingProduct?.id || null,
      savedAt: timeStr
    };
    try {
      localStorage.setItem('rangrez_product_form_draft', JSON.stringify(draftObj));
    } catch {}
    setDraftSavedAt(timeStr);
    setDraftRestored(true);
    setIsFormDirty(false);
    showToast(`Draft saved locally at ${timeStr}`, 'success');
  };

  const handleCloseProductModal = () => {
    if (isFormDirty) {
      if (window.confirm('You have unsaved changes in your product form. Would you like to keep them as a draft before closing? Click OK to save draft, or Cancel to exit without saving.')) {
        handleSaveAsDraft();
      }
    }
    setShowProductModal(false);
    setEditingProduct(null);
    setIsFormDirty(false);
  };

  // Warn before browser reload or navigation if form has unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (showProductModal && isFormDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [showProductModal, isFormDirty]);

  // Debounced auto-save draft every few seconds
  useEffect(() => {
    if (!showProductModal || !isFormDirty) return;
    const timer = setTimeout(() => {
      if (productForm.name.trim() || productForm.description.trim() || productForm.images.some(Boolean)) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        try {
          localStorage.setItem(
            'rangrez_product_form_draft',
            JSON.stringify({
              form: productForm,
              editingProductId: editingProduct?.id || null,
              savedAt: timeStr
            })
          );
          setDraftSavedAt(timeStr);
        } catch {}
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [productForm, showProductModal, isFormDirty, editingProduct]);

  // Generate or regenerate variant matrix
  const regenerateVariants = (colors = productForm.colors, sizes = productForm.sizes) => {
    const variants: ProductVariant[] = [];
    const baseSlug = (productForm.name || 'TEE')
      .replace(/[^A-Za-z0-9]/g, '')
      .toUpperCase()
      .slice(0, 5);

    colors.forEach(c => {
      const colorCode = c.name.slice(0, 3).toUpperCase();
      sizes.forEach(s => {
        const productSku = `RZ-${baseSlug}-${colorCode}-${s}`;
        // Preserve existing storeSku if already entered
        const existing = productForm.variants.find(
          v => v.colorName.toLowerCase() === c.name.toLowerCase() && v.size === s
        );

        variants.push({
          id: existing?.id || `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          colorName: c.name,
          colorHex: c.hex,
          secondaryHex: c.secondaryHex,
          size: s,
          productSku,
          storeSku: existing?.storeSku || productSku,
          stock: existing?.stock ?? 50,
          price: existing?.price ?? c.price ?? productForm.price,
          mrp: existing?.mrp ?? c.mrp ?? productForm.mrp
        });
      });
    });

    setProductForm(prev => ({ ...prev, variants }));
    setIsFormDirty(true);
  };

  const handleApplyPriceToAll = () => {
    const basePrice = Number(productForm.price) || 0;
    const baseMrp = productForm.mrp ? Number(productForm.mrp) : undefined;

    const updatedColors = productForm.colors.map(c => ({
      ...c,
      price: basePrice,
      mrp: baseMrp
    }));

    const updatedVariants = productForm.variants.map(v => ({
      ...v,
      price: basePrice,
      mrp: baseMrp
    }));

    setProductForm(prev => ({
      ...prev,
      colors: updatedColors,
      variants: updatedVariants
    }));
    setIsFormDirty(true);
    showToast(`Applied Selling Price ₹${basePrice}${baseMrp ? ` (MRP ₹${baseMrp})` : ''} to all colours and sizes`, 'success');
  };

  const handleAddColor = () => {
    const newColor: ProductColor = {
      name: '',
      hex: '#FFFFFF',
      secondaryHex: undefined,
      photos: [],
      price: productForm.price,
      mrp: productForm.mrp
    };
    setProductForm(prev => ({
      ...prev,
      colors: [...prev.colors, newColor]
    }));
    setIsFormDirty(true);
  };

  const handleUpdateColor = (index: number, updates: Partial<ProductColor>) => {
    setProductForm(prev => {
      const copy = [...prev.colors];
      const oldColor = copy[index];
      const updated = { ...oldColor, ...updates };
      copy[index] = updated;

      // Sync matching variants in matrix if colorName, hex, price, or mrp changes
      const nextVariants = prev.variants.map(v => {
        if (oldColor.name && v.colorName.toLowerCase() === oldColor.name.toLowerCase()) {
          return {
            ...v,
            colorName: updated.name || v.colorName,
            colorHex: updated.hex,
            secondaryHex: updated.secondaryHex,
            price: updated.price !== undefined ? updated.price : v.price,
            mrp: updated.mrp !== undefined ? updated.mrp : v.mrp
          };
        }
        return v;
      });

      return { ...prev, colors: copy, variants: nextVariants };
    });
    setIsFormDirty(true);
  };

  const handleRemoveColor = (index: number) => {
    setProductForm(prev => {
      const removedColor = prev.colors[index];
      const nextColors = prev.colors.filter((_, i) => i !== index);
      const nextVariants = prev.variants.filter(
        v => !removedColor.name || v.colorName.toLowerCase() !== removedColor.name.toLowerCase()
      );
      return { ...prev, colors: nextColors, variants: nextVariants };
    });
    setIsFormDirty(true);
  };

  const handleToggleSize = (size: TShirtSize) => {
    setProductForm(prev => {
      const exists = prev.sizes.includes(size);
      const nextSizes = exists
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size];
      const sorted = ALL_SIZES.filter(s => nextSizes.includes(s));
      return { ...prev, sizes: sorted };
    });
    setIsFormDirty(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!productForm.name || !productForm.price) {
      showToast('Product name and price are required', 'error');
      return;
    }

    const payload = {
      ...productForm,
      images: productForm.images.filter(img => img.trim().length > 0)
    };

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        // Clear draft on successful publish
        try {
          localStorage.removeItem('rangrez_product_form_draft');
        } catch {}
        setIsFormDirty(false);
        setDraftRestored(false);
        showToast(editingProduct ? 'Product updated' : 'Product published to catalog', 'success');
        setShowProductModal(false);
        setEditingProduct(null);
        loadAdminData();
      } else {
        showToast(data.error || 'Failed to save product', 'error');
      }
    } catch {
      showToast('Network error saving product', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!token || !confirm('Permanently delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Product removed', 'info');
        loadAdminData();
      }
    } catch {
      showToast('Failed to delete product', 'error');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(couponForm)
      });
      if (res.ok) {
        showToast(`Coupon ${couponForm.code} created`, 'success');
        setShowCouponModal(false);
        loadAdminData();
      }
    } catch {
      showToast('Failed to create coupon', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Coupon removed', 'info');
        loadAdminData();
      }
    } catch {
      showToast('Failed to delete coupon', 'error');
    }
  };

  // Bulk SKU Paste Processor (format: color\tsize\tstoreSku or sku per line)
  const applyBulkSkus = () => {
    const lines = bulkSkuText.split('\n');
    const updated = [...productForm.variants];

    lines.forEach(line => {
      const parts = line.split(/[,\t]+/).map(s => s.trim());
      if (parts.length >= 3) {
        const [cName, size, sku] = parts;
        const target = updated.find(
          v => v.colorName.toLowerCase() === cName.toLowerCase() && v.size.toUpperCase() === size.toUpperCase()
        );
        if (target) target.storeSku = sku;
      } else if (parts.length === 2) {
        const [size, sku] = parts;
        const target = updated.find(v => v.size.toUpperCase() === size.toUpperCase());
        if (target) target.storeSku = sku;
      }
    });

    setProductForm(prev => ({ ...prev, variants: updated }));
    setShowBulkSkuModal(false);
    setBulkSkuText('');
    showToast('Bulk SKUs applied to variant matrix', 'success');
  };

  // Compression & Upload helper for Brand & Media assets from Phone Gallery
  const handleBrandFileUpload = async (file: File, onDone: (url: string) => void, assetKey?: string) => {
    try {
      if (assetKey) setUploadingAsset(assetKey);
      showToast('Compressing photo from gallery (max 1600px)...', 'info');
      const compressed = await compressAndResizeImage(file, 1600, 1600, 0.85);
      let finalUrl = compressed.dataUrl;
      if (token) {
        showToast('Saving photo to persistent storage...', 'info');
        finalUrl = await uploadImageToServer(compressed, token);
      }
      onDone(finalUrl);
      showToast('Photo uploaded & resized successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      if (assetKey) setUploadingAsset(null);
    }
  };

  // --------------------------------------------------------------------------
  // LOGIN SCREEN (Strictly requires ADMIN_SECRET_KEY in env)
  // --------------------------------------------------------------------------
  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-white">
        <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-6">
            <RangrezLogo variant="full" size="lg" light={true} />
          </div>

          <h1 className="text-xl font-bold font-serif-brand text-center mb-1">
            Atelier Back-Office
          </h1>
          <p className="text-xs text-[#9CA3AF] text-center mb-6">
            Authorized management console for RANGREZ
          </p>

          {/* Session Expired Notice if 12-hour token ended */}
          {sessionExpiredNotice && (
            <div className="p-4 bg-amber-950/40 border border-amber-900 rounded-xl text-xs text-amber-200 flex items-start gap-2.5 mb-5">
              <Clock className="w-4 h-4 text-[#E07A24] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#E07A24]">Session Expired</p>
                <p className="mt-0.5">{sessionExpiredNotice}</p>
              </div>
            </div>
          )}

          {/* Hard rule check: If ADMIN_SECRET_KEY is unset on server, show warning & disable */}
          {setupStatus && !setupStatus.adminConfigured ? (
            <div className="p-4 bg-amber-950/40 border border-amber-900 rounded-xl text-xs text-amber-200 space-y-2 mb-4">
              <div className="flex items-center gap-2 font-bold text-[#E07A24]">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                ADMIN_SECRET_KEY Unset
              </div>
              <p>
                Set <code className="bg-black/50 px-1 py-0.5 rounded font-mono">ADMIN_SECRET_KEY</code> in your environment variables to enable administrator login.
              </p>
              <p className="text-[11px] text-gray-400">
                In AI Studio or hosting platforms (Render/Railway), add the secret in your project configuration panel.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Admin Secret Key *
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={secretInput}
                    onChange={e => setSecretInput(e.target.value)}
                    placeholder="Enter ADMIN_SECRET_KEY value"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24] font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {loginLoading ? 'Verifying Key...' : 'Unlock Admin Portal'}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-[#1C212E] text-[11px] text-center text-gray-500">
            Strict credential validation &middot; Zero mock passwords permitted
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // AUTHENTICATED ADMIN DASHBOARD
  // --------------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-white space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#232938]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold font-serif-brand">
              Atelier Management Console
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
              Session Active
            </span>
          </div>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Store operations &middot; Qikink POD Fulfilment &middot; Real Order Logs
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowStorageModal(true)}
            className="px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded-lg text-xs font-semibold text-gray-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
            title="Database & Storage Architecture Guide"
          >
            <Database className="w-3.5 h-3.5 text-[#E07A24]" />
            <span className="hidden sm:inline">Storage Guide</span>
          </button>
          <button
            onClick={loadAdminData}
            className="p-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded-lg text-gray-300 hover:text-white transition-colors cursor-pointer"
            title="Refresh Store Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 bg-[#1A1E29] hover:bg-rose-950/60 hover:text-rose-300 border border-[#2B3245] text-xs font-medium rounded-lg text-gray-300 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#1C212E] pb-3">
        <button
          onClick={() => setActiveTab('status')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'status' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Setup Status & Live Logs
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'products' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          T-Shirt Catalog ({products.length})
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'orders' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Orders Queue ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'coupons' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          Coupons ({coupons.length})
        </button>

        <button
          onClick={() => setActiveTab('brand')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'brand' ? 'bg-[#E07A24] text-white' : 'text-gray-400 hover:text-white hover:bg-[#12151D]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Settings &gt; Brand &amp; Media
        </button>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 1. SETUP STATUS & LOGS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'status' && (
        <div className="space-y-8">
          {/* Real Metrics Banner (Starts at 0, computed ONLY from real orders) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#12151D] border border-[#232938] p-5 rounded-xl">
              <span className="text-xs text-gray-400 block mb-1">Total Verified Revenue</span>
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                ₹{stats.totalRevenue}
              </span>
              {stats.pendingCodRevenue > 0 && (
                <span className="text-[10px] text-amber-400 block mt-1">
                  + ₹{stats.pendingCodRevenue} Pending COD
                </span>
              )}
            </div>

            <div className="bg-[#12151D] border border-[#232938] p-5 rounded-xl">
              <span className="text-xs text-gray-400 block mb-1">Real Orders Count</span>
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                {stats.orderCount}
              </span>
              <span className="text-[10px] text-gray-500 block mt-1">
                Zero fake orders
              </span>
            </div>

            <div className="bg-[#12151D] border border-[#232938] p-5 rounded-xl">
              <span className="text-xs text-gray-400 block mb-1">Average Order Value (AOV)</span>
              <span className="text-xl font-bold font-mono text-white tabular-nums">
                ₹{stats.aov}
              </span>
            </div>

            <div className="bg-[#12151D] border border-[#232938] p-5 rounded-xl">
              <span className="text-xs text-gray-400 block mb-1">Pending Fulfilment</span>
              <span className="text-xl font-bold font-mono text-[#E07A24] tabular-nums">
                {stats.pendingFulfillment}
              </span>
            </div>
          </div>

          {/* Setup Status Panel (Shows configured as YES/NO only, NEVER the values!) */}
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232938]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Environment Keys & Integration Status
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  Masked validation. Actual secret tokens are kept strictly in server environment memory.
                </p>
              </div>

              {/* Database & Mode indicators */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Clear Database Persistence Status */}
                <span className={`text-xs px-3 py-1.5 rounded-lg font-bold font-mono flex items-center gap-1.5 border shadow-sm ${
                  setupStatus?.firestoreConnected
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                    : setupStatus?.firebaseConfigured
                    ? 'bg-rose-950 text-rose-300 border-rose-600'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}>
                  {setupStatus?.firestoreConnected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Database: Firestore connected</span>
                    </>
                  ) : setupStatus?.firebaseConfigured ? (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Database: Firestore connection FAILED</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      <span>Database: local file (NOT persistent)</span>
                    </>
                  )}
                </span>

                {/* Mode switch indicator */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">Qikink:</span>
                  <span className={`text-xs px-2.5 py-1 rounded font-bold font-mono ${
                    setupStatus?.qikinkSandbox
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                  }`}>
                    {setupStatus?.qikinkSandbox ? 'SANDBOX' : 'LIVE PRODUCTION'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Database Engine */}
              <div className={`p-4 rounded-lg border flex items-start justify-between ${
                setupStatus?.firestoreConnected
                  ? 'bg-[#0B0D12] border-emerald-800/60'
                  : setupStatus?.firebaseConfigured
                  ? 'bg-rose-950/30 border-rose-600'
                  : 'bg-amber-950/20 border-amber-800/70'
              }`}>
                <div>
                  <h4 className="text-xs font-semibold text-white">Database</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Persistence Status</p>
                </div>
                {setupStatus?.firestoreConnected ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-4 h-4" /> FIRESTORE CONNECTED
                  </span>
                ) : setupStatus?.firebaseConfigured ? (
                  <span className="text-xs font-bold text-rose-400 flex items-center gap-1 font-mono">
                    <XCircle className="w-4 h-4" /> FIRESTORE FAILED
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1 font-mono">
                    <AlertTriangle className="w-4 h-4" /> LOCAL FILE
                  </span>
                )}
              </div>

              {/* Qikink */}
              <div className="bg-[#0B0D12] p-4 rounded-lg border border-[#232938] flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Qikink API</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">POD Order Dispatch</p>
                </div>
                {setupStatus?.qikinkConfigured ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> YES
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> NO
                  </span>
                )}
              </div>

              {/* Razorpay */}
              <div className="bg-[#0B0D12] p-4 rounded-lg border border-[#232938] flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Razorpay</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Cards, UPI & Netbanking</p>
                </div>
                {setupStatus?.razorpayConfigured ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> YES
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> NO
                  </span>
                )}
              </div>

              {/* PhonePe */}
              <div className="bg-[#0B0D12] p-4 rounded-lg border border-[#232938] flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">PhonePe</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">UPI Gateway</p>
                </div>
                {setupStatus?.phonepeConfigured ? (
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> YES
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> NO
                  </span>
                )}
              </div>

              {/* Cash on Delivery */}
              <div className="bg-[#0B0D12] p-4 rounded-lg border border-[#232938] flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white">Cash on Delivery</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">Pan-India Courier</p>
                </div>
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> ACTIVE
                </span>
              </div>
            </div>

            {/* Persistent Storage Diagnostic Banner */}
            <div className={`bg-[#0B0D12] border rounded-xl p-5 space-y-4 ${
              setupStatus?.firestoreConnected
                ? 'border-emerald-800/60'
                : setupStatus?.firebaseConfigured
                ? 'border-rose-600'
                : 'border-[#232938]'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-lg border ${
                    setupStatus?.firestoreConnected
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                      : setupStatus?.firebaseConfigured
                      ? 'bg-rose-950 text-rose-400 border-rose-700'
                      : 'bg-[#1A1E29] text-[#E07A24] border-[#2B3245]'
                  }`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white">Database &amp; Media Storage</h4>
                      <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${
                        setupStatus?.firestoreConnected
                          ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                          : setupStatus?.firebaseConfigured
                          ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                          : 'bg-amber-950/80 text-amber-300 border-amber-700'
                      }`}>
                        {setupStatus?.firestoreConnected
                          ? 'Database: Firestore connected'
                          : setupStatus?.firebaseConfigured
                          ? 'Database: Firestore connection FAILED'
                          : 'Database: local file (NOT persistent)'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Active Storage Engine:{' '}
                      <span className={`font-mono font-semibold ${
                        setupStatus?.firestoreConnected
                          ? 'text-emerald-300'
                          : setupStatus?.firebaseConfigured
                          ? 'text-rose-400'
                          : 'text-amber-300'
                      }`}>
                        {setupStatus?.firestoreConnected
                          ? 'Google Cloud Firestore (Firebase Admin SDK) - Connected & Verified'
                          : setupStatus?.firebaseConfigured
                          ? 'Google Cloud Firestore - Authentication/Connection Failed'
                          : 'Local JSON File (data/store.json) - NOT persistent across redeploys'}
                      </span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Products ({products.length}), orders ({orders.length}), coupons ({coupons.length}) &amp; gallery photos.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {setupStatus?.firebaseConfigured && (
                    <button
                      type="button"
                      disabled={testingFirestore}
                      onClick={handleTestFirestore}
                      className="px-3.5 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                      title="Run a real write and read test to 'healthcheck' collection"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-[#E07A24] ${testingFirestore ? 'animate-spin' : ''}`} />
                      <span>{testingFirestore ? 'Testing Live Write/Read...' : 'Test Firestore Connection'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowStorageModal(true)}
                    className="px-4 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-[#E07A24]" />
                    <span>Cloud Storage Keys</span>
                  </button>
                </div>
              </div>

              {/* Show Firestore Error Details clearly when Firebase variables are set but healthcheck failed */}
              {setupStatus?.firebaseConfigured && !setupStatus?.firestoreConnected && (
                <div className="mt-3 p-4 bg-rose-950/40 border border-rose-700/80 rounded-lg space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-300 font-bold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Firestore Healthcheck Failed — Data is currently falling back to local memory</span>
                  </div>
                  {setupStatus?.firestoreError && (
                    <div className="p-2.5 bg-black/70 rounded border border-rose-900 font-mono text-[11px] text-rose-200 whitespace-pre-wrap break-all">
                      {setupStatus.firestoreError}
                    </div>
                  )}
                  {setupStatus?.credentialDiagnostics?.missingOrInvalidFields &&
                    setupStatus.credentialDiagnostics.missingOrInvalidFields.length > 0 && (
                      <div className="text-[11px] text-rose-300 space-y-1 pt-1">
                        <span className="font-semibold text-rose-200">Credential checks:</span>
                        <ul className="list-disc list-inside space-y-0.5">
                          {setupStatus.credentialDiagnostics.missingOrInvalidFields.map((errItem, idx) => (
                            <li key={idx} className="font-mono">{errItem}</li>
                          ))}
                        </ul>
                      </div>
                  )}
                  <p className="text-[11px] text-gray-400 pt-1">
                    Tip: Use <span className="font-mono text-amber-300">FIREBASE_SERVICE_ACCOUNT_JSON</span> with the entire JSON service account key. The server automatically fixes newline breaks in the private key.
                  </p>
                </div>
              )}
            </div>

            {/* Ping Qikink Action */}
            <div className="pt-4 border-t border-[#232938] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-white">Direct Qikink Token Health Check</h4>
                <p className="text-[11px] text-[#9CA3AF]">
                  Invokes <code className="text-[#E07A24]">POST /token</code> against the live/sandbox endpoint using configured secrets and displays response.
                </p>
              </div>

              <button
                onClick={handlePingQikink}
                disabled={pingLoading}
                className="px-4 py-2 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {pingLoading ? 'Pinging Endpoint...' : 'Ping Qikink API Now'}
              </button>
            </div>

            {pingResult && (
              <div className={`p-4 rounded-lg border text-xs ${
                pingResult.ok
                  ? 'bg-emerald-950/40 border-emerald-900 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-900 text-rose-200'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold">HTTP Status: {pingResult.status}</span>
                  <span className="font-mono">{pingResult.mode}</span>
                </div>
                <p>{pingResult.message}</p>
              </div>
            )}
          </div>

          {/* Live Execution Logs (Masked secrets) */}
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Live External API Execution Log
              </h3>
              <span className="text-xs text-gray-400 font-mono">{logs.length} logged events</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0D12] text-gray-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Endpoint</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Response Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C212E] font-mono">
                  {logs.length > 0 ? (
                    logs.map(log => (
                      <tr key={log.id} className="hover:bg-[#161922]">
                        <td className="py-2.5 px-3 text-gray-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{log.service}</td>
                        <td className="py-2.5 px-3 text-gray-300 max-w-[200px] truncate" title={log.endpoint}>
                          {log.endpoint.replace('https://', '')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.status >= 200 && log.status < 300
                              ? 'bg-emerald-950 text-emerald-400'
                              : 'bg-rose-950 text-rose-400'
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 tabular-nums">
                          {log.durationMs}ms
                        </td>
                        <td className="py-2.5 px-3 text-gray-300 max-w-xs truncate" title={log.responseSnippet}>
                          {log.responseSnippet || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                        No external API requests logged yet. Ping Qikink or place an order to record real requests.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. PRODUCTS MANAGEMENT TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold font-serif-brand">T-Shirt Silhouette Inventory</h2>
              <p className="text-xs text-[#9CA3AF]">
                Manage garments, variant-level Qikink SKUs, and stock quantities.
              </p>
            </div>

            <button
              onClick={() => openProductModal()}
              className="px-4 py-2 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              Add New T-Shirt Design
            </button>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(prod => (
                <div key={prod.id} className="bg-[#12151D] border border-[#232938] rounded-xl p-5 flex flex-col justify-between space-y-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-24 bg-[#171B26] rounded-lg border border-[#2B3245] overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.images[0] ? (
                        <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-gray-500 font-serif">RZ</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`w-2 h-2 rounded-full ${prod.isActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        <span className="text-[11px] text-gray-400">{prod.isActive ? 'Active' : 'Draft'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">{prod.name}</h3>
                        {prod.saleLabel && (
                          <span className="px-1.5 py-0.2 bg-[#E07A24]/20 border border-[#E07A24]/40 text-[#E07A24] text-[9px] font-bold rounded uppercase">
                            {prod.saleLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">
                        {prod.fit} &middot; {prod.gsm ? `${prod.gsm} GSM &middot; ` : ''}
                        <span className="text-white font-bold">₹{prod.price}</span>
                        {prod.mrp && Number(prod.mrp) > Number(prod.price) && (
                          <span className="text-gray-500 ml-1.5">
                            (MRP <span className="line-through">₹{prod.mrp}</span> &middot; <span className="text-emerald-400">{calculateDiscountPercent(prod.mrp, prod.price)}% OFF</span>)
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Variants: {prod.variants?.length || 0} registered &middot; Colours: {prod.colors?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#1C212E] flex items-center justify-between">
                    <span className="text-xs text-[#9CA3AF] font-mono">
                      Qikink Ref: {prod.qikinkDesignReference || 'None'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openProductModal(prod)}
                        className="p-1.5 bg-[#1A1E29] hover:bg-[#232938] rounded text-gray-300 hover:text-white cursor-pointer"
                        title="Edit Product"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1.5 bg-[#1A1E29] hover:bg-rose-950 text-gray-400 hover:text-rose-400 rounded"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-12 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">Catalog Is Clean & Empty</h3>
              <p className="text-xs text-[#9CA3AF] max-w-sm mx-auto mb-6">
                As per your configuration, no dummy items are seeded. Click below to add your first real printed t-shirt.
              </p>
              <button
                onClick={() => openProductModal()}
                className="px-6 py-2.5 bg-[#E07A24] text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer hover:bg-[#C96617]"
              >
                Create First Garment
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. ORDERS QUEUE TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold font-serif-brand">Orders & Fulfillment Queue</h2>
              <p className="text-xs text-[#9CA3AF]">
                Real customer orders, live Qikink order dispatch status, and courier tracking.
              </p>
            </div>
          </div>

          <div className="bg-[#12151D] border border-[#232938] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0B0D12] text-gray-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Qikink Fulfilment</th>
                    <th className="py-3 px-4">AWB Tracking</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C212E]">
                  {orders.length > 0 ? (
                    orders.map(order => (
                      <tr key={order.id} className="hover:bg-[#161922]">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {order.orderNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-white">{order.shippingAddress.fullName}</p>
                          <p className="text-[11px] text-gray-400">{order.shippingAddress.city}, {order.shippingAddress.pincode}</p>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white tabular-nums">
                          ₹{order.totalAmount}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {order.paymentMethod}: {order.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.fulfillmentStatus === 'SENT_TO_QIKINK'
                                ? 'bg-sky-950 text-sky-400 border border-sky-800'
                                : order.fulfillmentStatus === 'FAILED'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-gray-800 text-gray-300'
                            }`}>
                              {order.fulfillmentStatus}
                            </span>
                            {order.qikinkOrderId && (
                              <p className="text-[10px] font-mono text-gray-400 mt-1">
                                Qikink ID: {order.qikinkOrderId}
                              </p>
                            )}
                            {order.qikinkError && (
                              <p className="text-[10px] text-rose-400 mt-1 max-w-xs truncate" title={order.qikinkError}>
                                Error: {order.qikinkError}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-300">
                          {/* Real AWB only if Qikink returns it */}
                          {order.qikinkAwb ? (
                            <span className="text-emerald-400 font-bold">{order.qikinkAwb}</span>
                          ) : (
                            <span className="text-gray-500 italic">None yet</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleResendToQikink(order.id)}
                            className="px-2.5 py-1 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded text-[11px] font-medium text-white transition-colors cursor-pointer"
                          >
                            Resend to Qikink
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No orders have been placed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. COUPONS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold font-serif-brand">Promotional Coupons</h2>
              <p className="text-xs text-[#9CA3AF]">
                Manage promotional codes and discounts.
              </p>
            </div>
            <button
              onClick={() => setShowCouponModal(true)}
              className="px-4 py-2 bg-[#E07A24] text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create Coupon
            </button>
          </div>

          <div className="bg-[#12151D] border border-[#232938] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B0D12] text-gray-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Min Spend</th>
                  <th className="py-3 px-4">Uses</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C212E] font-mono">
                {coupons.length > 0 ? (
                  coupons.map(c => (
                    <tr key={c.id} className="hover:bg-[#161922]">
                      <td className="py-3 px-4 font-bold text-[#E07A24]">{c.code}</td>
                      <td className="py-3 px-4 text-white">
                        {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% Off` : `₹${c.discountValue} Flat`}
                      </td>
                      <td className="py-3 px-4 text-gray-300">₹{c.minOrderAmount}</td>
                      <td className="py-3 px-4 text-gray-300">
                        {c.usedCount} {c.maxUses ? `/ ${c.maxUses}` : ''}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${c.isActive ? 'bg-emerald-950 text-emerald-400' : 'bg-gray-800 text-gray-400'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="p-1 text-gray-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                      No active coupons. Create one to test promo discount flows.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. SETTINGS > BRAND & MEDIA TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'brand' && (
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#232938]">
            <div>
              <h2 className="text-lg font-bold font-serif-brand">Settings &gt; Brand &amp; Media Assets</h2>
              <p className="text-xs text-[#9CA3AF]">
                Configure the official brand logo, favicon, hero split photos, category tiles, and lookbook imagery.
              </p>
            </div>
            <button
              onClick={async () => {
                setSavingBrand(true);
                const ok = await updateBrandSettings(brandForm, token || undefined);
                setSavingBrand(false);
                if (ok) {
                  showToast('Brand and media assets saved successfully', 'success');
                } else {
                  showToast('Failed to save brand settings', 'error');
                }
              }}
              disabled={savingBrand}
              className="px-6 py-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-md"
            >
              {savingBrand ? 'Saving Assets...' : 'Save All Brand Settings'}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Col: Logo & Favicon */}
            <div className="space-y-6">
              
              {/* Logo Card */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Primary Brand Logo
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">Navbar &middot; Footer &middot; Invoice</span>
                </div>

                {/* Preview */}
                <div className="p-6 bg-[#0B0D12] rounded-xl border border-[#232938] flex flex-col items-center justify-center min-h-[100px] text-center">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest mb-3">Live Logo Preview (Dark Background)</span>
                  {brandForm.logoUrl ? (
                    <img src={brandForm.logoUrl} alt="Logo Preview" className="max-h-12 w-auto object-contain" />
                  ) : (
                    <RangrezLogo variant="horizontal" size="lg" light={true} />
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Logo Image URL or Base64 Data URI
                    </label>
                    <input
                      type="text"
                      value={brandForm.logoUrl || ''}
                      onChange={e => setBrandForm({ ...brandForm, logoUrl: e.target.value })}
                      placeholder="Leave empty to use official vector Rangrez logo, or paste URL"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="px-3.5 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-[#E07A24]" />
                      {uploadingAsset === 'logo' ? 'Compressing...' : 'Upload Logo (Gallery/PNG)'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAsset === 'logo'}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandFileUpload(file, url => setBrandForm({ ...brandForm, logoUrl: url }), 'logo');
                        }}
                      />
                    </label>

                    {brandForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setBrandForm({ ...brandForm, logoUrl: '' })}
                        className="text-xs text-gray-400 hover:text-white underline cursor-pointer"
                      >
                        Reset to Vector Mark
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Favicon & Icon Card */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Favicon &amp; App Icon
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">Browser Tab Icon</span>
                </div>

                <div className="p-4 bg-[#0B0D12] rounded-xl border border-[#232938] flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#1A1E29] rounded-lg border border-[#2B3245] flex items-center justify-center p-2">
                    {brandForm.iconUrl ? (
                      <img src={brandForm.iconUrl} alt="Icon Preview" className="w-full h-full object-contain" />
                    ) : (
                      <RangrezLogo variant="icon" size="sm" light={true} />
                    )}
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-white">R Dye Drop Favicon</p>
                    <p className="text-gray-400">Displayed in browser tabs and mobile bookmarks.</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Favicon Image URL / Base64
                    </label>
                    <input
                      type="text"
                      value={brandForm.iconUrl || ''}
                      onChange={e => setBrandForm({ ...brandForm, iconUrl: e.target.value })}
                      placeholder="Leave empty for official R dye drop vector favicon"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono"
                    />
                  </div>

                  <label className="inline-flex px-3.5 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] rounded text-white text-xs font-semibold cursor-pointer items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#E07A24]" />
                    {uploadingAsset === 'favicon' ? 'Compressing...' : 'Upload Custom Favicon'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingAsset === 'favicon'}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleBrandFileUpload(file, url => setBrandForm({ ...brandForm, iconUrl: url }), 'favicon');
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Hero Copywriting */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
                  Hero Copywriting
                </h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Hero Heading</label>
                    <input
                      type="text"
                      value={brandForm.heroHeading || ''}
                      onChange={e => setBrandForm({ ...brandForm, heroHeading: e.target.value })}
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-serif-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Hero Sub-line</label>
                    <input
                      type="text"
                      value={brandForm.heroSubline || ''}
                      onChange={e => setBrandForm({ ...brandForm, heroSubline: e.target.value })}
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Col: Home Split Photos, Category Tiles & Lookbook */}
            <div className="space-y-6">
              
              {/* Hero Split Photos */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
                  Hero Split Banner Photos
                </h3>

                {/* Hero Man */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-gray-300">Hero Left Photo (Man Lookbook)</label>
                    <label className="text-[11px] text-[#E07A24] cursor-pointer hover:underline">
                      {uploadingAsset === 'heroMan' ? 'Compressing...' : 'Upload from Gallery'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAsset === 'heroMan'}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandFileUpload(file, url => setBrandForm({ ...brandForm, heroManImage: url }), 'heroMan');
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-20 bg-[#0B0D12] rounded border border-[#232938] overflow-hidden shrink-0">
                      {brandForm.heroManImage && (
                        <img src={brandForm.heroManImage} alt="Man" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={brandForm.heroManImage || ''}
                      onChange={e => setBrandForm({ ...brandForm, heroManImage: e.target.value })}
                      placeholder="Image URL or Base64"
                      className="flex-1 bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Hero Woman */}
                <div className="space-y-2 text-xs pt-2">
                  <div className="flex justify-between items-center">
                    <label className="font-semibold text-gray-300">Hero Right Photo (Woman Lookbook)</label>
                    <label className="text-[11px] text-[#E07A24] cursor-pointer hover:underline">
                      {uploadingAsset === 'heroWoman' ? 'Compressing...' : 'Upload from Gallery'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingAsset === 'heroWoman'}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleBrandFileUpload(file, url => setBrandForm({ ...brandForm, heroWomanImage: url }), 'heroWoman');
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="w-16 h-20 bg-[#0B0D12] rounded border border-[#232938] overflow-hidden shrink-0">
                      {brandForm.heroWomanImage && (
                        <img src={brandForm.heroWomanImage} alt="Woman" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={brandForm.heroWomanImage || ''}
                      onChange={e => setBrandForm({ ...brandForm, heroWomanImage: e.target.value })}
                      placeholder="Image URL or Base64"
                      className="flex-1 bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Large Tiles "For Him" & "For Her" */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
                  Two Large Tiles ("For Him" &amp; "For Her")
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold block text-gray-300">Tile "For Him" Image</label>
                      <label className="text-[11px] text-[#E07A24] cursor-pointer hover:underline">
                        {uploadingAsset === 'tileHim' ? 'Compressing...' : 'Upload from Gallery'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAsset === 'tileHim'}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleBrandFileUpload(file, url => setBrandForm({ ...brandForm, tileHimImage: url }), 'tileHim');
                          }}
                        />
                      </label>
                    </div>
                    <div className="w-full h-28 bg-[#0B0D12] rounded border border-[#232938] overflow-hidden">
                      {brandForm.tileHimImage && (
                        <img src={brandForm.tileHimImage} alt="For Him" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={brandForm.tileHimImage || ''}
                      onChange={e => setBrandForm({ ...brandForm, tileHimImage: e.target.value })}
                      placeholder="Image URL or path"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded p-1.5 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-semibold block text-gray-300">Tile "For Her" Image</label>
                      <label className="text-[11px] text-[#E07A24] cursor-pointer hover:underline">
                        {uploadingAsset === 'tileHer' ? 'Compressing...' : 'Upload from Gallery'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingAsset === 'tileHer'}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleBrandFileUpload(file, url => setBrandForm({ ...brandForm, tileHerImage: url }), 'tileHer');
                          }}
                        />
                      </label>
                    </div>
                    <div className="w-full h-28 bg-[#0B0D12] rounded border border-[#232938] overflow-hidden">
                      {brandForm.tileHerImage && (
                        <img src={brandForm.tileHerImage} alt="For Her" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={brandForm.tileHerImage || ''}
                      onChange={e => setBrandForm({ ...brandForm, tileHerImage: e.target.value })}
                      placeholder="Image URL or path"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded p-1.5 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Lookbook Gallery Imagery */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#232938]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Lookbook Gallery (4 Frames)
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">Home Lookbook</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {[0, 1, 2, 3].map(idx => (
                    <div key={idx} className="space-y-1.5 bg-[#0B0D12] p-2.5 rounded-lg border border-[#232938]">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-mono uppercase">Frame 0{idx + 1}</span>
                        <label className="text-[10px] text-[#E07A24] cursor-pointer hover:underline">
                          {uploadingAsset === `lookbook-${idx}` ? 'Compressing...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingAsset === `lookbook-${idx}`}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleBrandFileUpload(file, url => {
                                  const copy = [...(brandForm.lookbookImages || [])];
                                  copy[idx] = url;
                                  setBrandForm({ ...brandForm, lookbookImages: copy });
                                }, `lookbook-${idx}`);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="w-full h-24 bg-[#1A1E29] rounded overflow-hidden">
                        {brandForm.lookbookImages?.[idx] && (
                          <img src={brandForm.lookbookImages[idx]} alt={`Lookbook ${idx + 1}`} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={brandForm.lookbookImages?.[idx] || ''}
                        onChange={e => {
                          const copy = [...(brandForm.lookbookImages || [])];
                          copy[idx] = e.target.value;
                          setBrandForm({ ...brandForm, lookbookImages: copy });
                        }}
                        placeholder="Image URL"
                        className="w-full bg-[#12151D] border border-[#2B3245] rounded p-1 text-white font-mono text-[10px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Store-wide Shipping, Delivery & Policy Claims */}
              <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-4 lg:col-span-2">
                <div className="flex justify-between items-center pb-3 border-b border-[#232938]">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Store-Wide Shipping, Delivery &amp; Policy Claims
                  </h3>
                  <span className="text-[11px] text-gray-500 font-mono">Product Page &middot; Cart &middot; FAQ</span>
                </div>
                <p className="text-xs text-gray-400">
                  Configure real delivery and shipping offer claims. If a field is left empty, that claim is completely hidden across the store.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Store-Wide Delivery / Dispatch Time
                    </label>
                    <input
                      type="text"
                      value={brandForm.deliveryTimeText || ''}
                      onChange={e => setBrandForm({ ...brandForm, deliveryTimeText: e.target.value })}
                      placeholder="e.g. Dispatched in 2-3 business days (leave empty to hide)"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#E07A24]"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Shown in product Shipping &amp; Delivery accordion</span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Store-Wide Shipping Offer Claim
                    </label>
                    <input
                      type="text"
                      value={brandForm.shippingOfferText || ''}
                      onChange={e => setBrandForm({ ...brandForm, shippingOfferText: e.target.value })}
                      placeholder="e.g. Free shipping above ₹1499 (leave empty to hide)"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#E07A24]"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Shown next to product price &amp; in policies</span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Free Shipping Minimum Cart Value (₹)
                    </label>
                    <input
                      type="number"
                      value={brandForm.freeShippingThreshold ?? ''}
                      onChange={e => setBrandForm({ ...brandForm, freeShippingThreshold: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="e.g. 1499 (leave empty to hide free shipping bar in bag)"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono text-xs focus:outline-none focus:border-[#E07A24]"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">If empty, free delivery progress bar in cart is hidden</span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      PIN Code Coverage Description
                    </label>
                    <input
                      type="text"
                      value={brandForm.pincodeCoverageText || ''}
                      onChange={e => setBrandForm({ ...brandForm, pincodeCoverageText: e.target.value })}
                      placeholder="e.g. Available across serviceable PIN codes (leave empty to hide claims)"
                      className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-[#E07A24]"
                    />
                    <span className="text-[10px] text-gray-500 mt-0.5 block">Replaces hardcoded 26,000+ PIN codes claims</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-[#232938] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 text-white space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#232938]">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold font-serif-brand">
                  {editingProduct ? 'Edit Silhouette' : 'Add New T-Shirt Silhouette'}
                </h3>
                {isFormDirty && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCloseProductModal}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Auto-Saved Draft Restored Banner */}
            {draftRestored && (
              <div className="bg-[#E07A24]/10 border border-[#E07A24]/40 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#E07A24]">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    Auto-saved draft restored {draftSavedAt ? `from ${draftSavedAt}` : ''}. You can continue editing or discard.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1 bg-[#1A1E29] hover:bg-rose-950/50 hover:text-rose-300 text-gray-300 rounded border border-[#2B3245] text-[11px] font-semibold cursor-pointer"
                >
                  Discard Draft
                </button>
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Design Name *</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={e => {
                      setProductForm({ ...productForm, name: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. Madder Void Heavyweight Tee"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                {/* Pricing, MRP, Discounts & Sale Offer Module */}
                <div className="sm:col-span-2 bg-[#0B0D12] border border-[#232938] rounded-xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1C212E]">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-[#E07A24]" />
                        <span>Pricing &amp; Discount Configuration</span>
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        Set selling price, optional MRP for strikethrough &amp; % OFF badges, promotional label, and schedule.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyPriceToAll}
                      className="px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] hover:border-[#E07A24] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Apply base selling price and MRP to all colours and variant sizes in the matrix"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#E07A24]" />
                      <span>Apply this price to all colours and sizes</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {/* Selling Price */}
                    <div>
                      <label className="block font-semibold text-gray-200 mb-1">
                        Selling Price (₹) *
                      </label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={productForm.price || ''}
                        onChange={e => {
                          setProductForm({ ...productForm, price: Number(e.target.value) });
                          setIsFormDirty(true);
                        }}
                        placeholder="e.g. 1199"
                        className="w-full bg-[#12151D] border border-[#232938] rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-[#E07A24]"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        The actual price the customer pays at checkout
                      </span>
                    </div>

                    {/* MRP / Original Price */}
                    <div>
                      <label className="block font-semibold text-gray-200 mb-1">
                        MRP / Original Price (₹) <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={productForm.mrp !== undefined ? productForm.mrp : ''}
                        onChange={e => {
                          const val = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                          setProductForm({ ...productForm, mrp: val });
                          setIsFormDirty(true);
                        }}
                        placeholder="e.g. 1599 (leave blank for no MRP)"
                        className="w-full bg-[#12151D] border border-[#232938] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-[#E07A24]"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        Shown strikethrough ONLY when higher than selling price
                      </span>
                    </div>

                    {/* Sale Label Text */}
                    <div>
                      <label className="block font-semibold text-gray-200 mb-1">
                        Sale Label Text <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={productForm.saleLabel || ''}
                        onChange={e => {
                          setProductForm({ ...productForm, saleLabel: e.target.value });
                          setIsFormDirty(true);
                        }}
                        placeholder="e.g. Launch offer, Festive Drop"
                        className="w-full bg-[#12151D] border border-[#232938] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#E07A24]"
                      />
                      <span className="text-[10px] text-gray-400 block mt-1">
                        E.g. &quot;Launch offer&quot; badge on card and product page
                      </span>
                    </div>
                  </div>

                  {/* Customer Price Preview Box */}
                  <div className="bg-[#12151D] border border-[#1C212E] rounded-lg p-3 text-xs">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                        Customer Display Preview:
                      </span>
                      {productForm.saleLabel && productForm.saleLabel.trim() && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#E07A24]/20 border border-[#E07A24]/40 text-[#E07A24] text-[10px] font-bold uppercase tracking-wider">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>{productForm.saleLabel}</span>
                        </span>
                      )}
                    </div>

                    <div className="mt-1.5 flex items-center gap-2.5 flex-wrap">
                      <span className="text-base font-bold text-white font-mono">
                        ₹{productForm.price || 0}
                      </span>
                      {productForm.mrp && Number(productForm.mrp) > Number(productForm.price) ? (
                        <>
                          <span className="text-sm text-gray-500 line-through font-mono">
                            ₹{productForm.mrp}
                          </span>
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-mono">
                            {calculateDiscountPercent(productForm.mrp, productForm.price)}% OFF
                          </span>
                          <span className="text-xs text-emerald-400">
                            (Customer saves ₹{productForm.mrp - productForm.price})
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-gray-400">
                          {productForm.mrp && Number(productForm.mrp) <= Number(productForm.price)
                            ? '(MRP ≤ Selling Price: Strikethrough & % OFF hidden. Only selling price shows)'
                            : '(No MRP entered: Only selling price ₹' + (productForm.price || 0) + ' will show)'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Optional Sale Start Date & End Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1C212E] text-xs">
                    <div>
                      <label className="block font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Sale Start Date &amp; Time <span className="text-gray-500 font-normal">(Optional)</span></span>
                      </label>
                      <input
                        type="datetime-local"
                        value={productForm.saleStartDate || ''}
                        onChange={e => {
                          setProductForm({ ...productForm, saleStartDate: e.target.value });
                          setIsFormDirty(true);
                        }}
                        className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#E07A24]"
                      />
                      <span className="text-[10px] text-gray-500 block mt-0.5">
                        Discount/label will only activate on or after this date.
                      </span>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span>Sale End Date &amp; Time <span className="text-gray-500 font-normal">(Optional)</span></span>
                      </label>
                      <input
                        type="datetime-local"
                        value={productForm.saleEndDate || ''}
                        onChange={e => {
                          setProductForm({ ...productForm, saleEndDate: e.target.value });
                          setIsFormDirty(true);
                        }}
                        className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-1.5 text-white focus:outline-none focus:border-[#E07A24]"
                      />
                      <span className="text-[10px] text-gray-500 block mt-0.5">
                        Discount/label will automatically expire after this date.
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Fit Silhouette</label>
                  <select
                    value={productForm.fit}
                    onChange={e => {
                      setProductForm({ ...productForm, fit: e.target.value as TShirtFit });
                      setIsFormDirty(true);
                    }}
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  >
                    {ALL_FITS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Print Technique</label>
                  <select
                    value={productForm.printType}
                    onChange={e => {
                      setProductForm({ ...productForm, printType: e.target.value as PrintType });
                      setIsFormDirty(true);
                    }}
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  >
                    {ALL_PRINTS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Fabric Composition</label>
                  <input
                    type="text"
                    value={productForm.fabric || ''}
                    onChange={e => {
                      setProductForm({ ...productForm, fabric: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. 100% Combed Ringspun Cotton (leave empty to hide)"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Fabric Weight (GSM)</label>
                  <input
                    type="number"
                    value={productForm.gsm || ''}
                    onChange={e => {
                      setProductForm({ ...productForm, gsm: e.target.value ? Number(e.target.value) : undefined });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. 240 (leave empty to hide)"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Delivery / Dispatch Time</label>
                  <input
                    type="text"
                    value={productForm.deliveryTime || ''}
                    onChange={e => {
                      setProductForm({ ...productForm, deliveryTime: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. Dispatched in 2-3 business days (leave empty to use Settings)"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Shipping Offer</label>
                  <input
                    type="text"
                    value={productForm.shippingOffer || ''}
                    onChange={e => {
                      setProductForm({ ...productForm, shippingOffer: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. Free shipping above ₹1499 (leave empty to use Settings)"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Qikink Design Reference</label>
                  <input
                    type="text"
                    value={productForm.qikinkDesignReference}
                    onChange={e => {
                      setProductForm({ ...productForm, qikinkDesignReference: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="Qikink design ID or name"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Care Instructions</label>
                  <textarea
                    rows={2}
                    value={productForm.careInstructions || ''}
                    onChange={e => {
                      setProductForm({ ...productForm, careInstructions: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="e.g. Machine wash cold inside-out, tumble dry low (leave empty to hide line on product page)"
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Garment Description</label>
                  <textarea
                    rows={2}
                    value={productForm.description}
                    onChange={e => {
                      setProductForm({ ...productForm, description: e.target.value });
                      setIsFormDirty(true);
                    }}
                    placeholder="Artisanal narrative, motif inspiration, cut specifications..."
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white focus:outline-none focus:border-[#E07A24]"
                  />
                </div>
              </div>

              {/* Garment Colours & Swatches (Strictly Defined with Hex Swatches & Per-Colour Photos) */}
              <div className="pt-4 border-t border-[#232938] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-[#E07A24]" />
                      <span>Garment Colours &amp; Swatches ({productForm.colors.length})</span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Give each colour its own hex swatch (supports two-tone for ringer tees), and upload photos separately for each colour (Front, Back, Model).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="px-3 py-1.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Colour</span>
                  </button>
                </div>

                {productForm.colors.length === 0 ? (
                  <div className="p-6 bg-[#0B0D12] border border-dashed border-[#232938] rounded-xl text-center space-y-2">
                    <Palette className="w-6 h-6 mx-auto text-gray-500" />
                    <p className="text-xs font-semibold text-white">No colours defined yet</p>
                    <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                      Colours and sizes come strictly from your saved SKU matrix. Add at least one colour to generate variants and upload colour-specific photos.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddColor}
                      className="mt-2 px-3.5 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-medium text-white rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#E07A24]" />
                      Add First Colour
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productForm.colors.map((c, cIdx) => {
                      const swatchBackground = c.secondaryHex
                        ? `linear-gradient(135deg, ${c.hex} 50%, ${c.secondaryHex} 50%)`
                        : c.hex;

                      return (
                        <div key={cIdx} className="bg-[#0B0D12] border border-[#232938] rounded-xl p-4 space-y-3.5">
                          {/* Colour Header */}
                          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#1C212E]">
                            <div className="flex items-center gap-2.5">
                              {/* Swatch Preview Circle */}
                              <div
                                className="w-6 h-6 rounded-full border-2 border-white/20 shadow-xs shrink-0"
                                style={{ background: swatchBackground }}
                                title={`Swatch preview: ${c.name || 'Unnamed'}`}
                              />
                              <span className="text-xs font-bold text-white uppercase tracking-wider">
                                {c.name ? c.name : `Colour #${cIdx + 1}`}
                              </span>
                              {c.secondaryHex && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-[#1A1E29] border border-[#2B3245] text-amber-400 font-mono rounded">
                                  Two-Tone
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveColor(cIdx)}
                              className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                              title="Delete Colour"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Colour Inputs Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                            {/* Colour Name */}
                            <div>
                              <label className="block font-semibold text-gray-300 mb-1">
                                Colour Name *
                              </label>
                              <input
                                type="text"
                                required
                                value={c.name}
                                onChange={e => handleUpdateColor(cIdx, { name: e.target.value })}
                                placeholder="e.g. Vintage White / Forest Green"
                                className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-2 text-white focus:outline-none focus:border-[#E07A24]"
                              />
                            </div>

                            {/* Body Colour Swatch (Hex) */}
                            <div>
                              <label className="block font-semibold text-gray-300 mb-1">
                                Body Swatch (Hex) *
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={c.hex || '#FFFFFF'}
                                  onChange={e => handleUpdateColor(cIdx, { hex: e.target.value })}
                                  className="w-9 h-9 p-0.5 bg-[#12151D] border border-[#232938] rounded cursor-pointer shrink-0"
                                  title="Pick body colour hex"
                                />
                                <input
                                  type="text"
                                  value={c.hex}
                                  onChange={e => handleUpdateColor(cIdx, { hex: e.target.value })}
                                  placeholder="#FFFFFF"
                                  className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-[#E07A24]"
                                />
                              </div>
                            </div>

                            {/* Two-tone / Ringer Tee Option */}
                            <div className="sm:col-span-2 lg:col-span-1 flex flex-col justify-end">
                              <label className="flex items-center gap-2 text-gray-300 cursor-pointer py-2">
                                <input
                                  type="checkbox"
                                  checked={Boolean(c.secondaryHex)}
                                  onChange={e => {
                                    handleUpdateColor(cIdx, {
                                      secondaryHex: e.target.checked ? '#1E293B' : undefined
                                    });
                                  }}
                                  className="rounded border-[#232938] text-[#E07A24] focus:ring-0 cursor-pointer"
                                />
                                <span className="font-semibold text-gray-300">
                                  Two-Tone / Ringer Swatch
                                </span>
                              </label>

                              {c.secondaryHex !== undefined && (
                                <div className="flex items-center gap-2 mt-1">
                                  <input
                                    type="color"
                                    value={c.secondaryHex}
                                    onChange={e => handleUpdateColor(cIdx, { secondaryHex: e.target.value })}
                                    className="w-9 h-9 p-0.5 bg-[#12151D] border border-[#232938] rounded cursor-pointer shrink-0"
                                    title="Pick ring / collar colour hex"
                                  />
                                  <input
                                    type="text"
                                    value={c.secondaryHex}
                                    onChange={e => handleUpdateColor(cIdx, { secondaryHex: e.target.value })}
                                    placeholder="#1E293B"
                                    className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-[#E07A24]"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Optional Different Price for this Colour */}
                          <div className="pt-2 border-t border-[#1C212E] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block font-semibold text-gray-300 mb-1">
                                Selling Price for this Colour (₹) <span className="text-gray-500 font-normal">(Optional override)</span>
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={c.price !== undefined ? c.price : ''}
                                onChange={e => {
                                  const val = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                                  handleUpdateColor(cIdx, { price: val });
                                }}
                                placeholder={`Inherits base price (₹${productForm.price || 0})`}
                                className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-[#E07A24]"
                              />
                              <span className="text-[10px] text-gray-500 block mt-0.5">
                                Leave blank to inherit base price (₹{productForm.price || 0})
                              </span>
                            </div>

                            <div>
                              <label className="block font-semibold text-gray-300 mb-1">
                                MRP for this Colour (₹) <span className="text-gray-500 font-normal">(Optional override)</span>
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={c.mrp !== undefined ? c.mrp : ''}
                                onChange={e => {
                                  const val = e.target.value.trim() === '' ? undefined : Number(e.target.value);
                                  handleUpdateColor(cIdx, { mrp: val });
                                }}
                                placeholder={productForm.mrp ? `Inherits base MRP (₹${productForm.mrp})` : 'No MRP'}
                                className="w-full bg-[#12151D] border border-[#232938] rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-[#E07A24]"
                              />
                              <span className="text-[10px] text-gray-500 block mt-0.5">
                                Strikethrough MRP for this shade (only shown if higher than selling price)
                              </span>
                            </div>
                          </div>

                          {/* Photos Upload for this Colour Specifically */}
                          <div className="pt-2 border-t border-[#1C212E]">
                            <ProductPhotoUploader
                              images={c.photos || []}
                              onChange={newPhotos => handleUpdateColor(cIdx, { photos: newPhotos })}
                              token={token}
                              compact={true}
                              title={`Photos for ${c.name || `Colour #${cIdx + 1}`} (Front, Back, Model)`}
                              subtitle={`Photos uploaded here show on the product page when the customer selects ${c.name || 'this colour'}.`}
                              onError={msg => showToast(msg, 'error')}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sizes Available */}
              <div className="pt-4 border-t border-[#232938] space-y-2">
                <label className="block text-xs font-semibold text-white">
                  Available Sizes for Variant Matrix
                </label>
                <p className="text-[11px] text-gray-400">
                  Select which sizes exist for this garment silhouette.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_SIZES.map(s => {
                    const isChecked = productForm.sizes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleToggleSize(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                          isChecked
                            ? 'bg-[#E07A24] border-[#E07A24] text-white'
                            : 'bg-[#0B0D12] border-[#232938] text-gray-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* General Product Photos (Fallback Gallery) */}
              <div className="pt-4 border-t border-[#232938]">
                <ProductPhotoUploader
                  images={productForm.images}
                  onChange={imgs => {
                    setProductForm(prev => ({ ...prev, images: imgs }));
                    setIsFormDirty(true);
                  }}
                  token={token}
                  title={`General Product Photos (Fallback Gallery - ${productForm.images.filter(Boolean).length})`}
                  subtitle="Shown if a colour does not have its own photos uploaded, or as the default product gallery."
                  onError={msg => showToast(msg, 'error')}
                />
              </div>

              {/* Variant Matrix Generator */}
              <div className="pt-4 border-t border-[#232938] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                      Variant SKU Matrix ({productForm.variants.length} SKU items)
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Colours and sizes shown to customers come strictly from this saved matrix.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => regenerateVariants()}
                      className="px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-medium rounded text-white cursor-pointer"
                    >
                      Regenerate Matrix
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkSkuModal(true)}
                      className="px-3 py-1.5 bg-[#E07A24] text-white text-xs font-semibold rounded cursor-pointer hover:bg-[#C96617]"
                    >
                      Bulk Paste SKUs
                    </button>
                  </div>
                </div>

                {/* Mobile Variant Cards (< sm screens) */}
                <div className="block sm:hidden space-y-3 max-h-72 overflow-y-auto pr-1">
                  {productForm.variants.map((v, idx) => (
                    <div key={idx} className="bg-[#0B0D12] border border-[#232938] rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{
                              background: v.secondaryHex
                                ? `linear-gradient(135deg, ${v.colorHex} 50%, ${v.secondaryHex} 50%)`
                                : v.colorHex
                            }}
                          />
                          <span className="text-xs font-semibold text-white">{v.colorName}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-[#1A1E29] border border-[#2B3245] text-white text-xs font-bold rounded">
                          {v.size}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-gray-400 block mb-1">Product SKU</label>
                          <input
                            type="text"
                            value={v.productSku}
                            onChange={e => {
                              const copy = [...productForm.variants];
                              copy[idx].productSku = e.target.value;
                              setProductForm({ ...productForm, variants: copy });
                              setIsFormDirty(true);
                            }}
                            className="w-full bg-[#12151D] border border-[#232938] rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-[#E07A24]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-sky-400 block mb-1">Qikink Store SKU</label>
                          <input
                            type="text"
                            value={v.storeSku}
                            onChange={e => {
                              const copy = [...productForm.variants];
                              copy[idx].storeSku = e.target.value;
                              setProductForm({ ...productForm, variants: copy });
                              setIsFormDirty(true);
                            }}
                            placeholder="Store SKU"
                            className="w-full bg-[#12151D] border border-[#232938] rounded px-2.5 py-1.5 text-xs text-sky-400 font-mono focus:border-sky-400"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-gray-400">Stock &amp; Price:</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">Qty:</span>
                            <input
                              type="number"
                              value={v.stock}
                              onChange={e => {
                                const copy = [...productForm.variants];
                                copy[idx].stock = Number(e.target.value);
                                setProductForm({ ...productForm, variants: copy });
                                setIsFormDirty(true);
                              }}
                              className="w-14 bg-[#12151D] border border-[#232938] rounded px-1.5 py-1 text-xs text-white font-mono text-right"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">₹</span>
                            <input
                              type="number"
                              value={v.price !== undefined ? v.price : productForm.price}
                              onChange={e => {
                                const copy = [...productForm.variants];
                                copy[idx].price = e.target.value ? Number(e.target.value) : productForm.price;
                                setProductForm({ ...productForm, variants: copy });
                                setIsFormDirty(true);
                              }}
                              className="w-16 bg-[#12151D] border border-[#232938] rounded px-1.5 py-1 text-xs text-white font-mono text-right"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Variant Table (>= sm screens) */}
                <div className="hidden sm:block max-h-60 overflow-y-auto overflow-x-auto border border-[#232938] rounded-lg">
                  <table className="w-full min-w-[550px] text-left text-xs font-mono">
                    <thead className="bg-[#0B0D12] text-gray-400 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Color</th>
                        <th className="py-2 px-3">Size</th>
                        <th className="py-2 px-3">Product SKU</th>
                        <th className="py-2 px-3">Qikink Store SKU</th>
                        <th className="py-2 px-3">Stock</th>
                        <th className="py-2 px-3">Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1C212E]">
                      {productForm.variants.map((v, idx) => (
                        <tr key={idx} className="hover:bg-[#161922]">
                          <td className="py-2 px-3 flex items-center gap-1.5 font-sans">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-white/20"
                              style={{
                                background: v.secondaryHex
                                  ? `linear-gradient(135deg, ${v.colorHex} 50%, ${v.secondaryHex} 50%)`
                                  : v.colorHex
                              }}
                            />
                            {v.colorName}
                          </td>
                          <td className="py-2 px-3 font-bold text-white">{v.size}</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.productSku}
                              onChange={e => {
                                const copy = [...productForm.variants];
                                copy[idx].productSku = e.target.value;
                                setProductForm({ ...productForm, variants: copy });
                                setIsFormDirty(true);
                              }}
                              className="bg-transparent border-b border-[#232938] text-white w-full focus:outline-none focus:border-[#E07A24]"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={v.storeSku}
                              onChange={e => {
                                const copy = [...productForm.variants];
                                copy[idx].storeSku = e.target.value;
                                setProductForm({ ...productForm, variants: copy });
                                setIsFormDirty(true);
                              }}
                              className="bg-transparent border-b border-[#232938] text-sky-400 w-full focus:outline-none focus:border-sky-400"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={v.stock}
                              onChange={e => {
                                const copy = [...productForm.variants];
                                copy[idx].stock = Number(e.target.value);
                                setProductForm({ ...productForm, variants: copy });
                                setIsFormDirty(true);
                              }}
                              className="bg-transparent border-b border-[#232938] text-white w-14 focus:outline-none"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={v.price !== undefined ? v.price : productForm.price}
                              onChange={e => {
                                const copy = [...productForm.variants];
                                copy[idx].price = e.target.value ? Number(e.target.value) : productForm.price;
                                setProductForm({ ...productForm, variants: copy });
                                setIsFormDirty(true);
                              }}
                              className="bg-transparent border-b border-[#232938] text-white w-16 focus:outline-none focus:border-[#E07A24] font-mono"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Actions Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#232938]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAsDraft}
                    className="px-3.5 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-gray-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-[#E07A24]" />
                    <span>Save as Draft</span>
                  </button>
                  {draftSavedAt && (
                    <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">
                      Draft saved at {draftSavedAt}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseProductModal}
                    className="px-4 py-2 bg-[#1A1E29] hover:bg-[#232938] text-gray-300 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer transition-colors"
                  >
                    Save &amp; Publish
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk SKU Paste Modal (Mobile & Desktop optimized) */}
      {showBulkSkuModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#12151D] border border-[#232938] rounded-2xl max-w-lg w-full p-5 sm:p-6 text-white space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#232938]">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4 text-[#E07A24]" />
                Bulk Paste Qikink SKUs
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkSkuModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Format each line as: <code className="text-[#E07A24]">Color, Size, StoreSku</code> or <code className="text-sky-400">Size, StoreSku</code>
            </p>

            {/* Mobile helper buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    setBulkSkuText(text);
                    showToast('Pasted from clipboard', 'success');
                  } catch {
                    showToast('Clipboard access restricted. Please paste into textarea.', 'info');
                  }
                }}
                className="px-2.5 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-[11px] text-[#E07A24] font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Paste from Phone Clipboard
              </button>

              <button
                type="button"
                onClick={() => {
                  const colorsToUse = productForm.colors.filter(c => c.name.trim().length > 0);
                  const activeColors = colorsToUse.length > 0 ? colorsToUse : [{ name: 'White', hex: '#FFFFFF' }];
                  const sample = activeColors.flatMap(c =>
                    productForm.sizes.map(s => `${c.name}, ${s}, QK-${c.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'TEE'}-${s}`)
                  ).join('\n');
                  setBulkSkuText(sample);
                  showToast('Sample template inserted', 'info');
                }}
                className="px-2.5 py-1.5 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-[11px] text-gray-300 font-semibold rounded-lg cursor-pointer"
              >
                Insert Template
              </button>
            </div>

            <textarea
              rows={8}
              value={bulkSkuText}
              onChange={e => setBulkSkuText(e.target.value)}
              placeholder={"Format: Color Name, Size, Qikink Store SKU\nForest Green, S, QK-GRN-S\nForest Green, M, QK-GRN-M\nNavy Blue, L, QK-NVY-L"}
              className="w-full bg-[#0B0D12] border border-[#232938] rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-[#E07A24]"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#232938]">
              <span className="text-[11px] text-gray-500 font-mono">
                {bulkSkuText.trim() ? `${bulkSkuText.trim().split('\n').length} line(s) entered` : 'No text entered'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkSkuModal(false)}
                  className="px-3.5 py-2 bg-[#1A1E29] text-xs font-semibold rounded-lg text-gray-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyBulkSkus}
                  className="px-4 py-2 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Apply to Matrix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#12151D] border border-[#232938] rounded-xl max-w-md w-full p-6 text-white space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider">Create New Coupon</h3>
            <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FIRST10"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Type</label>
                  <select
                    value={couponForm.discountType}
                    onChange={e => setCouponForm({ ...couponForm, discountType: e.target.value as any })}
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Discount Value *</label>
                  <input
                    type="number"
                    required
                    value={couponForm.discountValue}
                    onChange={e => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                    className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Min Order Amount (₹)</label>
                <input
                  type="number"
                  value={couponForm.minOrderAmount}
                  onChange={e => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })}
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-3 py-1.5 bg-[#1A1E29] text-xs font-semibold rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#E07A24] text-white text-xs font-bold rounded"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Persistent Cloud Database & File Storage Modal */}
      {showStorageModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#12151D] border border-[#232938] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 text-white space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-[#232938]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#1A1E29] rounded-lg text-[#E07A24]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif-brand">Persistent Storage &amp; Database Guide</h3>
                  <p className="text-xs text-gray-400">Where data is stored and how to connect cloud persistence</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="text-gray-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current Engine Status */}
            <div className="p-4 bg-[#0B0D12] rounded-xl border border-[#232938] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-300">Active Storage Architecture:</span>
                <span className="font-mono text-[#E07A24] font-bold">
                  {storageStatus?.provider || 'Atomic Local Disk JSON + /uploads'}
                </span>
              </div>
              <p className="text-gray-400">
                All garments, customer orders, coupon codes, and brand images are saved to disk with atomic write protection. Admin authentication is secured with 12-hour cryptographic tokens that survive page reloads and app switches.
              </p>
            </div>

            {/* Cloud Persistence Instructions (Firebase Only) */}
            <div className="space-y-4 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-[#E07A24] text-xs">
                To Connect Persistent Cloud Database (Zero Data Loss on Server Redeploy)
              </h4>

              <div className="p-4 bg-[#0B0D12] rounded-xl border border-[#232938] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-[#E07A24]" />
                    Google Cloud Firestore (Firebase Admin SDK)
                  </span>
                  <span className="text-[10px] bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800">
                    Firestore Only
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-[#12151D] rounded-lg border border-[#232938] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-400">Option 1 (Recommended — Single Variable):</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-mono">
                        Auto-fixes private_key newlines
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Paste the entire downloaded Firebase service account JSON into one environment variable:
                    </p>
                    <pre className="p-2.5 bg-[#0B0D12] rounded text-[11px] font-mono text-emerald-300 overflow-x-auto border border-[#1C212E]">
{`FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"rangrez-clothing",...}'`}
                    </pre>
                  </div>

                  <div className="p-3 bg-[#12151D] rounded-lg border border-[#232938] space-y-1.5">
                    <span className="font-bold text-xs text-gray-300">Option 2 (Separate Environment Variables):</span>
                    <pre className="p-2.5 bg-[#0B0D12] rounded text-[11px] font-mono text-gray-300 overflow-x-auto border border-[#1C212E]">
{`FIREBASE_PROJECT_ID="rangrez-clothing"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@rangrez-clothing.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."`}
                    </pre>
                  </div>
                </div>

                <div className="p-3 bg-[#1A1E29]/60 rounded-lg text-[11px] text-gray-300 space-y-1">
                  <p className="font-semibold text-[#E07A24]">How to download your service account key:</p>
                  <p>1. Open <span className="text-white font-mono">console.firebase.google.com</span> &rarr; select project <strong className="text-white">rangrez clothing</strong></p>
                  <p>2. Tap Gear icon &rarr; <strong>Project settings</strong> &rarr; <strong>Service accounts</strong> tab</p>
                  <p>3. Tap <strong>Generate new private key</strong> &rarr; copy the JSON contents into <span className="font-mono text-emerald-300">FIREBASE_SERVICE_ACCOUNT_JSON</span></p>
                </div>
              </div>
            </div>

            {/* One-click backup export */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#232938]">
              <button
                type="button"
                onClick={() => {
                  const dataToExport = {
                    products,
                    orders,
                    coupons,
                    brandSettings,
                    exportedAt: new Date().toISOString()
                  };
                  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `rangrez_backup_${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast('Store backup downloaded to device', 'success');
                }}
                className="px-4 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-semibold rounded-lg text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#E07A24]" />
                <span>Download Store Backup JSON</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStorageModal(false)}
                className="px-5 py-2 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
