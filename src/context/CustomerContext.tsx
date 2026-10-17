import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Customer, ShippingAddress } from '../types/index.ts';
import { useToast } from './ToastContext.tsx';

interface CustomerContextType {
  customer: Customer | null;
  token: string | null;
  login: (email: string, name?: string, phone?: string) => Promise<boolean>;
  logout: () => void;
  saveAddress: (address: ShippingAddress) => Promise<void>;
  deleteAddress: (index: number) => Promise<void>;
  isLoading: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const CUSTOMER_STORAGE_KEY = 'rangrez_customer_v1';
const TOKEN_STORAGE_KEY = 'rangrez_cust_token_v1';

export const CustomerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem(CUSTOMER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (customer) {
      localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(CUSTOMER_STORAGE_KEY);
    }
  }, [customer]);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  const login = async (email: string, name?: string, phone?: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/customer/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, phone })
      });
      const data = await res.json();
      if (res.ok && data.customer) {
        setCustomer(data.customer);
        setToken(data.token);
        showToast(`Welcome to Rangrez Atelier, ${data.customer.name}`, 'success');
        return true;
      } else {
        showToast(data.error || 'Authentication failed', 'error');
        return false;
      }
    } catch (err: any) {
      showToast('Network error while authenticating', 'error');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCustomer(null);
    setToken(null);
    showToast('Signed out of your account', 'info');
  };

  const saveAddress = async (address: ShippingAddress) => {
    if (!customer) return;
    try {
      const res = await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id, address })
      });
      const data = await res.json();
      if (res.ok) {
        setCustomer(data);
        showToast('Shipping address saved to your account', 'success');
      }
    } catch {
      showToast('Failed to save address', 'error');
    }
  };

  const deleteAddress = async (index: number) => {
    if (!customer) return;
    try {
      const res = await fetch(`/api/customer/addresses/${index}?customerId=${customer.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setCustomer(data);
        showToast('Address removed', 'info');
      }
    } catch {
      showToast('Failed to remove address', 'error');
    }
  };

  return (
    <CustomerContext.Provider
      value={{
        customer,
        token,
        login,
        logout,
        saveAddress,
        deleteAddress,
        isLoading
      }}
    >
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) throw new Error('useCustomer must be used within CustomerProvider');
  return context;
};
