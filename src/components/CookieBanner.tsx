import React, { useState, useEffect } from 'react';

export const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('rangrez_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('rangrez_cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('rangrez_cookie_consent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-40 bg-[#12151D] border border-[#232938] rounded-xl p-4 shadow-2xl text-white">
      <h4 className="text-xs font-semibold text-white mb-1">Atelier Privacy & Experience</h4>
      <p className="text-xs text-[#9CA3AF] leading-relaxed mb-3">
        We use essential cookies to maintain your shopping bag and authenticate your account sessions. No third-party ad brokers.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={handleAccept}
          className="px-3.5 py-1.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          Accept Preferences
        </button>
        <button
          onClick={handleDecline}
          className="px-3 py-1.5 bg-[#1A1E29] hover:bg-[#232938] text-gray-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
        >
          Essential Only
        </button>
      </div>
    </div>
  );
};
