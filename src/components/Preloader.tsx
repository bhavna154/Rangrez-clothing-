import React, { useState, useEffect } from 'react';
import { RangrezLogo } from './RangrezLogo.tsx';

export const Preloader: React.FC = () => {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFading(true);
      const removeTimer = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(removeTimer);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0B0D12] flex flex-col items-center justify-center transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <RangrezLogo variant="full" size="lg" light={true} />
        <div className="w-16 h-0.5 bg-gradient-to-r from-[#254587] via-[#E07A24] to-[#8E2834] rounded-full mt-2" />
      </div>
    </div>
  );
};
