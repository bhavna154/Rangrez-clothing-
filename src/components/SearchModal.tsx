import React, { useState, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import type { Product } from '../types/index.ts';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  navigate: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, navigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        setLoading(true);
        fetch(`/api/products?search=${encodeURIComponent(query.trim())}`)
          .then(res => res.json())
          .then(data => {
            setResults(Array.isArray(data) ? data : []);
          })
          .catch(() => setResults([]))
          .finally(() => setLoading(false));
      } else {
        setResults([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleSelect = (slug: string) => {
    onClose();
    navigate(`/product/${slug}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div className="bg-[#12151D] border border-[#232938] rounded-xl max-w-xl w-full text-white shadow-2xl overflow-hidden">
        
        {/* Search input */}
        <div className="p-4 border-b border-[#232938] flex items-center gap-3">
          <Search className="w-5 h-5 text-[#E07A24] shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search our tees by name, fit (e.g. Oversized), or print style..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-[#1A1E29]"
            aria-label="Close search"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">Searching atelier catalog...</div>
          ) : query.trim().length >= 2 && results.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No t-shirt designs matched "{query}".
            </div>
          ) : results.length > 0 ? (
            results.map(prod => (
              <button
                key={prod.id}
                onClick={() => handleSelect(prod.slug || prod.id)}
                className="w-full p-2.5 rounded-lg hover:bg-[#1A1E29] flex items-center gap-3 text-left transition-colors cursor-pointer group"
              >
                <div className="w-12 h-14 bg-[#1A1E29] rounded border border-[#2B3245] overflow-hidden shrink-0 flex items-center justify-center">
                  {prod.images[0] ? (
                    <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-gray-500 font-serif">RZ</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white group-hover:text-[#E07A24] transition-colors truncate">
                    {prod.name}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {prod.fit} &middot; {prod.gsm} GSM &middot; <span className="text-white font-mono">₹{prod.price}</span>
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
              </button>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-gray-500">
              Type at least 2 characters to search t-shirts.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
