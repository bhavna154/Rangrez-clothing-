import React, { createContext, useContext, useState, useEffect } from 'react';
import type { OrderItem, Product, TShirtSize } from '../types/index.ts';
import { useToast } from './ToastContext.tsx';

interface CartContextType {
  cart: OrderItem[];
  addToCart: (product: Product, colorName: string, colorHex: string, size: TShirtSize, quantity?: number, customImage?: string) => void;
  updateQuantity: (productId: string, colorName: string, size: TShirtSize, quantity: number) => void;
  removeFromCart: (productId: string, colorName: string, size: TShirtSize) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (open: boolean) => void;
  wishlist: string[];
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'rangrez_cart_v1';
const WISHLIST_STORAGE_KEY = 'rangrez_wishlist_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<OrderItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to persist cart:', e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
    } catch (e) {
      console.error('Failed to persist wishlist:', e);
    }
  }, [wishlist]);

  const addToCart = (
    product: Product,
    colorName: string,
    colorHex: string,
    size: TShirtSize,
    quantity = 1,
    customImage?: string
  ) => {
    // Find matching variant to grab variant SKUs
    const variant = product.variants?.find(
      v => v.colorName.toLowerCase() === colorName.toLowerCase() && v.size === size
    );

    // Pick color for custom price or photos
    const matchingColor = product.colors?.find(
      c => c.name.toLowerCase() === colorName.toLowerCase()
    );
    const unitPrice = variant?.price ?? matchingColor?.price ?? product.price;

    const productSku = variant?.productSku || `${product.id}-${colorName}-${size}`;
    const storeSku = variant?.storeSku || productSku;
    const resolvedProductImage =
      customImage ||
      (matchingColor?.photos && matchingColor.photos.length > 0 ? matchingColor.photos[0] : null) ||
      product.images[0] ||
      '';

    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.productId === product.id && item.colorName === colorName && item.size === size
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const updatedQty = next[existingIndex].quantity + quantity;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: updatedQty,
          totalPrice: updatedQty * unitPrice,
          productImage: resolvedProductImage || next[existingIndex].productImage
        };
        return next;
      } else {
        const newItem: OrderItem = {
          productId: product.id,
          productName: product.name,
          productImage: resolvedProductImage,
          colorName,
          colorHex,
          size,
          productSku,
          storeSku,
          quantity,
          unitPrice,
          totalPrice: quantity * unitPrice
        };
        return [...prev, newItem];
      }
    });

    showToast(`Added "${product.name}" (${size}) to your bag`, 'success');
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (productId: string, colorName: string, size: TShirtSize, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, colorName, size);
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId && item.colorName === colorName && item.size === size) {
          return {
            ...item,
            quantity,
            totalPrice: quantity * item.unitPrice
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string, colorName: string, size: TShirtSize) => {
    setCart(prev =>
      prev.filter(
        item => !(item.productId === productId && item.colorName === colorName && item.size === size)
      )
    );
    showToast('Item removed from your bag', 'info');
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId: string) => {
    setWishlist(prev => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from saved atelier pieces', 'info');
        return prev.filter(id => id !== productId);
      } else {
        showToast('Saved to your atelier wishlist', 'success');
        return [...prev, productId];
      }
    });
  };

  const isInWishlist = (productId: string) => wishlist.includes(productId);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        subtotal,
        itemCount,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        wishlist,
        toggleWishlist,
        isInWishlist
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
