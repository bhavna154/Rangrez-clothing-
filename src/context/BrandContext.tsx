import React, { createContext, useContext, useState, useEffect } from 'react';
import type { BrandSettings } from '../types/index.ts';

interface BrandContextType {
  brandSettings: BrandSettings;
  updateBrandSettings: (newSettings: Partial<BrandSettings>, adminToken?: string) => Promise<boolean>;
  refreshBrandSettings: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: BrandSettings = {
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

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const refreshBrandSettings = async () => {
    try {
      const res = await fetch('/api/brand-settings');
      if (res.ok) {
        const data = await res.json();
        setBrandSettings(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Failed to load brand settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshBrandSettings();
  }, []);

  // Set favicon dynamically to the R dye drop mark
  useEffect(() => {
    const faviconUrl = brandSettings.iconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130"><rect width="100%" height="100%" fill="%230B0D12"/><path d="M28 20 H76 C94 20 102 32 102 46 C102 60 92 68 76 70 L98 108 H78 L58 72 H46 V108 H28 V20 Z M46 36 V56 H74 C82 56 86 52 86 46 C86 40 82 36 74 36 H46 Z" fill="%23FFFFFF"/><path d="M48 64 C48 64 52 76 52 84 C52 94 44 102 36 102 C28 102 20 94 20 84 C20 76 28 66 38 60 C38 60 48 64 48 64 Z" fill="%23E07A24"/></svg>';

    let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = faviconUrl;
  }, [brandSettings.iconUrl]);

  const updateBrandSettings = async (newSettings: Partial<BrandSettings>, adminToken?: string): Promise<boolean> => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (adminToken) {
        headers['Authorization'] = `Bearer ${adminToken}`;
      }

      const res = await fetch('/api/brand-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify(newSettings)
      });

      if (res.ok) {
        const updated = await res.json();
        setBrandSettings(updated);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <BrandContext.Provider
      value={{
        brandSettings,
        updateBrandSettings,
        refreshBrandSettings,
        isLoading
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) throw new Error('useBrand must be used within BrandProvider');
  return context;
};
