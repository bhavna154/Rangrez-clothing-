import React from 'react';
import { useBrand } from '../context/BrandContext.tsx';

interface RangrezLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'horizontal';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  light?: boolean;
}

/**
 * The official RANGREZ "R" Icon with the artisanal dye drop.
 * Faithfully depicts the bold geometric R with an artisanal dye droplet falling from the inner curve.
 */
export const RangrezIcon: React.FC<{
  className?: string;
  size?: number;
  dropColor?: string;
}> = ({ className = 'w-8 h-8', size, dropColor = '#E07A24' }) => {
  const { brandSettings } = useBrand();

  // If a custom icon file was uploaded via Admin > Settings > Brand
  if (brandSettings?.iconUrl) {
    return (
      <img
        src={brandSettings.iconUrl}
        alt="RANGREZ"
        className={`object-contain ${className}`}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 120 130"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="RANGREZ Mark"
    >
      {/* Top loop, stem, and right leg of R */}
      <path
        d="M26 18 H76 C94 18 104 30 104 46 C104 60 94 70 78 72 L100 110 H78 L58 74 H44 V110 H26 V18 Z M44 34 V58 H74 C82 58 88 54 88 46 C88 38 82 34 74 34 H44 Z"
        fill="currentColor"
      />
      {/* Artisanal dye droplet falling from the inner curve of R */}
      <path
        d="M48 64 C48 64 53 76 53 84 C53 95 44 103 35 103 C26 103 18 95 18 84 C18 76 27 66 38 60 C38 60 48 64 48 64 Z"
        fill={dropColor}
      />
      {/* Elegant diagonal stroke facet on R leg */}
      <path
        d="M48 62 L78 100 L72 104 L42 66 Z"
        fill="currentColor"
        opacity="0.3"
      />
    </svg>
  );
};

/**
 * Official geometric RANGREZ wordmark
 */
export const RangrezWordmark: React.FC<{ className?: string }> = ({
  className = 'text-xl tracking-[0.25em]'
}) => {
  return (
    <span
      className={`font-extrabold tracking-[0.22em] uppercase font-sans select-none whitespace-nowrap ${className}`}
    >
      RANGREZ
    </span>
  );
};

/**
 * Complete RANGREZ Brand Logo (supports custom admin override image or native vector)
 * Features the R icon with dye drop and the word RANGREZ in white on dark background.
 */
export const RangrezLogo: React.FC<RangrezLogoProps> = ({
  className = '',
  variant = 'horizontal',
  size = 'md',
  light = true
}) => {
  const { brandSettings } = useBrand();

  const colorClass = light ? 'text-white' : 'text-[#0B0D12]';

  // If a custom logo image was uploaded via Admin > Settings > Brand
  if (brandSettings?.logoUrl) {
    const imgHeights = {
      sm: 'h-6 sm:h-7',
      md: 'h-8 sm:h-9',
      lg: 'h-12 sm:h-14',
      xl: 'h-16 sm:h-20'
    };

    return (
      <div className={`inline-flex items-center shrink-0 ${className}`}>
        <img
          src={brandSettings.logoUrl}
          alt="RANGREZ"
          className={`object-contain w-auto ${imgHeights[size]}`}
          onError={e => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  // Size scalers
  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-7 h-7 sm:w-8 sm:h-8',
    lg: 'w-10 h-10 sm:w-12 sm:h-12',
    xl: 'w-14 h-14 sm:w-16 sm:h-16'
  };

  const textSizes = {
    sm: 'text-xs sm:text-sm tracking-[0.2em]',
    md: 'text-base sm:text-lg lg:text-xl tracking-[0.24em]',
    lg: 'text-2xl sm:text-3xl tracking-[0.28em]',
    xl: 'text-3xl sm:text-4xl tracking-[0.3em]'
  };

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center shrink-0 ${colorClass} ${className}`}>
        <RangrezIcon className={iconSizes[size]} dropColor="#E07A24" />
      </div>
    );
  }

  if (variant === 'full') {
    // Stacked Icon on top, wordmark below
    return (
      <div className={`inline-flex flex-col items-center gap-2 text-center shrink-0 ${colorClass} ${className}`}>
        <RangrezIcon className={iconSizes[size]} dropColor="#E07A24" />
        <RangrezWordmark className={textSizes[size]} />
      </div>
    );
  }

  // Horizontal: Icon + Wordmark (default)
  return (
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 shrink-0 ${colorClass} ${className}`}>
      <RangrezIcon className={iconSizes[size]} dropColor="#E07A24" />
      <RangrezWordmark className={textSizes[size]} />
    </div>
  );
};
