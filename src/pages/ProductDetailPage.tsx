import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Ruler, Truck, RefreshCw, Heart, Check, Sparkles, Tag } from 'lucide-react';
import type { Product, ProductColor, TShirtSize } from '../types/index.ts';
import { useCart } from '../context/CartContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useBrand } from '../context/BrandContext.tsx';
import { SizeChartModal } from '../components/SizeChartModal.tsx';
import { PincodeChecker } from '../components/PincodeChecker.tsx';
import { RangrezLogo } from '../components/RangrezLogo.tsx';
import { isDiscountActive, calculateDiscountPercent, isSaleLabelActive } from '../utils/pricing.ts';

interface ProductDetailPageProps {
  idOrSlug: string;
  navigate: (path: string) => void;
}

const ALL_SIZE_ORDER: TShirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ idOrSlug, navigate }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<TShirtSize>('L');
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const { addToCart, isInWishlist, toggleWishlist } = useCart();
  const { showToast } = useToast();
  const { brandSettings } = useBrand();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${idOrSlug}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setProduct(data);
        } else {
          setProduct(null);
        }
      })
      .catch(err => {
        console.error('Failed to load product:', err);
        setProduct(null);
      })
      .finally(() => setLoading(false));
  }, [idOrSlug]);

  // 1. Available Colours: Strictly from product's saved SKU matrix (variants)
  const availableColors = useMemo<ProductColor[]>(() => {
    if (!product || !product.variants || product.variants.length === 0) return [];
    const colorMap = new Map<string, ProductColor>();
    product.variants.forEach(v => {
      if (!v.colorName) return;
      const key = v.colorName.trim().toLowerCase();
      if (!colorMap.has(key)) {
        const saved = product.colors?.find(c => c.name.trim().toLowerCase() === key);
        colorMap.set(key, {
          name: v.colorName.trim(),
          hex: saved?.hex || v.colorHex || '#111827',
          secondaryHex: saved?.secondaryHex || v.secondaryHex,
          photos: saved?.photos && saved.photos.length > 0 ? saved.photos : undefined
        });
      }
    });
    return Array.from(colorMap.values());
  }, [product]);

  // 2. Photos per Colour: When customer taps a colour swatch, switch gallery and main photo to that colour's photos.
  // If a colour has no photos, show product's general photos. Never show photos of another colour.
  const activeGalleryImages = useMemo(() => {
    if (!product) return [];
    if (selectedColor?.photos && selectedColor.photos.filter(Boolean).length > 0) {
      return selectedColor.photos.filter(Boolean);
    }
    return (product.images || []).filter(Boolean);
  }, [product, selectedColor]);

  // Reset image view to front/first shot whenever colour changes
  useEffect(() => {
    setSelectedImageIndex(0);
  }, [selectedColor?.name]);

  // 3. Available Sizes: All sizes (XS, S, M, L, XL, XXL) that exist in the SKU matrix for this colour
  const availableSizes = useMemo(() => {
    if (!product || !selectedColor || !product.variants || product.variants.length === 0) return [];
    const sizesInMatrix = new Set<TShirtSize>();
    product.variants
      .filter(v => v.colorName?.trim().toLowerCase() === selectedColor.name.trim().toLowerCase())
      .forEach(v => {
        sizesInMatrix.add(v.size);
      });
    return ALL_SIZE_ORDER.filter(s => sizesInMatrix.has(s));
  }, [product, selectedColor]);

  // Synchronize selectedColor when availableColors change
  useEffect(() => {
    if (availableColors.length > 0) {
      const match = availableColors.find(c => c.name.toLowerCase() === selectedColor?.name.toLowerCase());
      if (!match) {
        setSelectedColor(availableColors[0]);
      }
    } else {
      setSelectedColor(null);
    }
  }, [availableColors]);

  // Synchronize selectedSize when availableSizes or selectedColor change (prefer in-stock size)
  useEffect(() => {
    if (availableSizes.length > 0 && selectedColor) {
      const currentVariant = product?.variants?.find(
        v => v.colorName?.trim().toLowerCase() === selectedColor.name.trim().toLowerCase() && v.size === selectedSize
      );

      // If current size doesn't exist or is out of stock, auto-select the first in-stock size if available
      if (!currentVariant || currentVariant.stock <= 0) {
        const inStockSize = availableSizes.find(s => {
          const v = product?.variants?.find(
            item => item.colorName?.trim().toLowerCase() === selectedColor.name.trim().toLowerCase() && item.size === s
          );
          return v && v.stock > 0;
        });
        if (inStockSize) {
          setSelectedSize(inStockSize);
        } else if (!availableSizes.includes(selectedSize)) {
          setSelectedSize(availableSizes[0]);
        }
      }
    }
  }, [availableSizes, selectedColor?.name, product]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-pulse">
          <div className="bg-[#12151D] aspect-4/5 rounded-2xl" />
          <div className="space-y-6">
            <div className="h-8 bg-[#12151D] rounded w-3/4" />
            <div className="h-4 bg-[#12151D] rounded w-1/4" />
            <div className="h-24 bg-[#12151D] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-white">
        <h2 className="text-2xl font-bold font-serif-brand mb-2">T-Shirt Silhouette Not Found</h2>
        <p className="text-sm text-gray-400 mb-6">The requested garment could not be retrieved from the catalog.</p>
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 bg-[#E07A24] text-white text-xs font-semibold uppercase tracking-wider rounded-lg cursor-pointer"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  // Find active variant SKU in the matrix
  const activeVariant = product.variants?.find(
    v => v.colorName.trim().toLowerCase() === selectedColor?.name.trim().toLowerCase() && v.size === selectedSize
  );

  // Price & MRP resolution (per-variant, then per-colour, then base product)
  const price = activeVariant?.price ?? selectedColor?.price ?? product.price;
  const mrp = activeVariant?.mrp ?? selectedColor?.mrp ?? product.mrp;
  const hasDiscount = isDiscountActive(mrp, price, product.saleStartDate, product.saleEndDate);
  const discountPercent = hasDiscount ? calculateDiscountPercent(mrp!, price) : 0;
  const hasSaleLabel = isSaleLabelActive(product.saleLabel, product.saleStartDate, product.saleEndDate);

  const isVariantOutOfStock = activeVariant ? activeVariant.stock <= 0 : false;
  const wishlisted = isInWishlist(product.id);

  // Dynamic shipping offer: ONLY from admin fields
  const effectiveShippingOffer = product.shippingOffer?.trim() || brandSettings.shippingOfferText?.trim() || '';

  // Dynamic delivery / dispatch time: ONLY from admin fields
  const effectiveDeliveryTime = product.deliveryTime?.trim() || brandSettings.deliveryTimeText?.trim() || '';

  // Dynamic PIN code coverage description: ONLY from admin settings
  const effectivePincodeText = brandSettings.pincodeCoverageText?.trim() || '';

  // Metadata items above heading (Zero-pill rule): ONLY non-empty fields
  const metaItems = [
    product.fit?.trim() || null,
    product.gsm && Number(product.gsm) > 0 ? `${product.gsm} GSM` : null,
    product.printType?.trim() || null
  ].filter(Boolean);

  const handleAddToCart = () => {
    if (!selectedColor) {
      showToast('Please select a colour', 'error');
      return;
    }
    if (!selectedSize || availableSizes.length === 0) {
      showToast('Please select a size', 'error');
      return;
    }
    if (isVariantOutOfStock) {
      showToast('This size is currently sold out in this colour', 'error');
      return;
    }
    const selectedPhoto = activeGalleryImages[0] || product.images[0] || '';
    addToCart(product, selectedColor.name, selectedColor.hex, selectedSize, quantity, selectedPhoto);
  };

  const handleBuyNow = () => {
    if (!selectedColor || !selectedSize || isVariantOutOfStock) {
      handleAddToCart();
      return;
    }
    const selectedPhoto = activeGalleryImages[0] || product.images[0] || '';
    addToCart(product, selectedColor.name, selectedColor.hex, selectedSize, quantity, selectedPhoto);
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-28 md:pb-16">
      {/* Back button */}
      <button
        onClick={() => navigate('/shop')}
        className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-white transition-colors mb-8 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Collection
      </button>

      {/* Main Grid: Gallery Left, Sticky Purchase Module Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left: Gallery (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Display Image */}
          <div className="relative aspect-4/5 bg-[#171B26] border border-[#232938] rounded-2xl overflow-hidden flex items-center justify-center">
            {activeGalleryImages && activeGalleryImages.length > 0 ? (
              <img
                src={activeGalleryImages[selectedImageIndex] || activeGalleryImages[0]}
                alt={`${product.name} - ${selectedColor?.name || 'view'}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={e => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <RangrezLogo variant="full" size="md" light={true} />
                <p className="text-xs text-gray-400 mt-3 font-mono uppercase tracking-wider">Bespoke Atelier Design</p>
              </div>
            )}

            {/* Wishlist Button on image */}
            <button
              onClick={() => toggleWishlist(product.id)}
              className={`absolute top-4 right-4 p-3 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                wishlisted
                  ? 'bg-[#8E2834] text-white shadow-lg'
                  : 'bg-[#0B0D12]/70 text-gray-300 hover:text-white hover:bg-[#0B0D12]'
              }`}
              aria-label="Wishlist"
            >
              <Heart className={`w-5 h-5 ${wishlisted ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Thumbnails row */}
          {activeGalleryImages && activeGalleryImages.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {activeGalleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-24 rounded-lg overflow-hidden border-2 shrink-0 transition-colors cursor-pointer ${
                    selectedImageIndex === idx ? 'border-[#E07A24]' : 'border-[#232938] hover:border-gray-500'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
          <div>
            {/* Unboxed Metadata Header (Zero-Pill Rule) - Only non-empty fields */}
            {metaItems.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2 font-medium">
                {metaItems.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span aria-hidden="true">&middot;</span>}
                    <span>{item}</span>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Optional Sale Label Badge */}
            {hasSaleLabel && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#E07A24]/15 border border-[#E07A24]/40 text-[#E07A24] text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{product.saleLabel}</span>
                </span>
              </div>
            )}

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-serif-brand leading-tight">
              {product.name}
            </h1>

            {/* Real Selling Price, Optional Strikethrough MRP & % OFF badge */}
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
                ₹{price}
              </span>

              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-500 line-through font-mono tabular-nums">
                    ₹{mrp}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-mono tabular-nums">
                    {discountPercent}% OFF
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    (Save ₹{mrp! - price})
                  </span>
                </>
              )}

              <span className="text-xs text-gray-400 font-medium">
                Inclusive of all taxes
                {effectiveShippingOffer ? (
                  <>
                    <span className="mx-1.5 text-gray-600">&middot;</span>
                    <span className="text-emerald-400">{effectiveShippingOffer}</span>
                  </>
                ) : null}
              </span>
            </div>
          </div>

          {/* Description */}
          {product.description?.trim() && (
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              {product.description}
            </p>
          )}

          {/* Color Selector: STRICTLY colours existing in SKU matrix */}
          {availableColors.length > 0 && (
            <div>
              <div className="flex justify-between items-center text-xs mb-2.5">
                <span className="font-semibold text-gray-300">
                  Colour: <span className="text-white font-bold">{selectedColor?.name}</span>
                </span>
              </div>
              <div className="flex items-center gap-3">
                {availableColors.map(color => {
                  const isSelected = selectedColor?.name.toLowerCase() === color.name.toLowerCase();
                  const swatchBg = color.secondaryHex
                    ? `linear-gradient(135deg, ${color.hex} 50%, ${color.secondaryHex} 50%)`
                    : color.hex;

                  return (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`relative w-9 h-9 rounded-full border-2 transition-transform cursor-pointer flex items-center justify-center shadow-xs ${
                        isSelected ? 'border-[#E07A24] scale-110 shadow-md ring-2 ring-[#E07A24]/40' : 'border-gray-700 hover:border-gray-400'
                      }`}
                      style={{ background: swatchBg }}
                      title={color.secondaryHex ? `${color.name} (Two-Tone Swatch)` : color.name}
                      aria-label={`Select ${color.name}`}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector: STRICTLY sizes existing in SKU matrix for this color */}
          {availableSizes.length > 0 && (
            <div>
              <div className="flex justify-between items-center text-xs mb-2.5">
                <span className="font-semibold text-gray-300">
                  Size: <span className="text-white font-bold">{selectedSize}</span>
                  {isVariantOutOfStock && (
                    <span className="ml-2 text-rose-400 font-normal">(Sold out in this shade)</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setSizeChartOpen(true)}
                  className="text-[#E07A24] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Size & Dimension Chart
                </button>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {availableSizes.map(size => {
                  const isSelected = selectedSize === size;
                  const variant = product.variants?.find(
                    v => v.colorName.trim().toLowerCase() === selectedColor?.name.trim().toLowerCase() && v.size === size
                  );
                  const isOut = variant ? variant.stock <= 0 : false;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={isOut}
                      onClick={() => !isOut && setSelectedSize(size)}
                      className={`py-2 text-xs font-mono font-bold rounded-lg border transition-all text-center flex items-center justify-center ${
                        isOut
                          ? 'bg-[#12151D]/40 border-[#1C212E] text-gray-500 line-through decoration-rose-500/80 decoration-2 opacity-50 cursor-not-allowed pointer-events-none'
                          : isSelected
                          ? 'bg-[#E07A24] border-[#E07A24] text-white shadow-md cursor-pointer'
                          : 'bg-[#12151D] border-[#232938] text-gray-300 hover:border-gray-500 hover:text-white cursor-pointer'
                      }`}
                      title={isOut ? `${size} (Sold Out)` : size}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* SKU and variant reference */}
              {activeVariant && (
                <p className="text-[11px] text-gray-500 font-mono mt-2">
                  SKU: {activeVariant.productSku} {activeVariant.storeSku ? `(Store: ${activeVariant.storeSku})` : ''}
                </p>
              )}
            </div>
          )}

          {/* Desktop Purchase CTAs */}
          <div className="hidden sm:flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              disabled={isVariantOutOfStock}
              className="flex-1 py-3 px-6 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isVariantOutOfStock ? 'Sold Out' : 'Add to Bag'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isVariantOutOfStock}
              className="flex-1 py-3 px-6 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-lg shadow-orange-950/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isVariantOutOfStock ? 'Sold Out' : 'Buy Now'}
            </button>
          </div>

          {/* Pincode checker */}
          <PincodeChecker />

          {/* Fabric, Care & Delivery details: ONLY from fields filled in admin! */}
          <div className="border-t border-[#232938] pt-4 space-y-3 text-xs text-[#9CA3AF]">
            
            {/* 1. Fabric Composition: ONLY if fabric or gsm is filled */}
            {(product.fabric?.trim() || (product.gsm && Number(product.gsm) > 0)) && (
              <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-[#E07A24] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Fabric Composition:</strong>
                  <p>
                    {[
                      product.fabric?.trim() || null,
                      product.gsm && Number(product.gsm) > 0 ? `${product.gsm} GSM` : null
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* 2. Care Instructions: ONLY if careInstructions is filled */}
            {product.careInstructions?.trim() && (
              <div className="flex items-start gap-3">
                <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white">Care Instructions:</strong>
                  <p>{product.careInstructions.trim()}</p>
                </div>
              </div>
            )}

            {/* 3. Shipping & Delivery: ONLY if deliveryTime, shippingOffer, or pincodeText are filled */}
            {(() => {
              const deliveryParts = [
                effectiveDeliveryTime,
                effectiveShippingOffer,
                effectivePincodeText
              ].filter(Boolean);

              if (deliveryParts.length === 0) return null;

              return (
                <div className="flex items-start gap-3">
                  <Truck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Shipping & Delivery:</strong>
                    <p>{deliveryParts.join('. ')}</p>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Sticky Mobile Add to Cart Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0D12]/95 backdrop-blur-md border-t border-[#232938] p-3 flex items-center justify-between gap-3 shadow-2xl max-h-[14vh]">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{product.name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
            <span className="text-[#E07A24] font-bold">₹{price}</span>
            <span>&middot;</span>
            <span>{selectedSize}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAddToCart}
            disabled={isVariantOutOfStock}
            className="px-4 py-2.5 bg-[#E07A24] text-white text-xs font-bold uppercase tracking-wider rounded-lg whitespace-nowrap cursor-pointer shadow-md disabled:opacity-50"
          >
            {isVariantOutOfStock ? 'Sold Out' : 'Add to Bag'}
          </button>
        </div>
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal
        isOpen={sizeChartOpen}
        onClose={() => setSizeChartOpen(false)}
        fitName={product.fit}
      />
    </div>
  );
};
