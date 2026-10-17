import React from 'react';
import { ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  return (
    <div className="max-w-md mx-auto px-4 py-28 text-center text-white space-y-4">
      <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">Error 404</p>
      <h1 className="text-3xl font-extrabold font-serif-brand">Silhouette Not Found</h1>
      <p className="text-xs text-[#9CA3AF]">
        The page or garment link you followed does not exist in our atelier collection.
      </p>
      <div className="pt-4">
        <button
          onClick={() => navigate('/shop')}
          className="px-6 py-2.5 bg-[#E07A24] text-white text-xs font-semibold uppercase tracking-wider rounded-lg inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Atelier Collection
        </button>
      </div>
    </div>
  );
};
