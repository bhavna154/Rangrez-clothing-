import React, { useState } from 'react';
import { MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

export const PincodeChecker: React.FC = () => {
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    valid: boolean;
    zone?: string;
    estimatedDays?: string;
    codAvailable?: boolean;
    error?: string;
  } | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(cleanPin)) {
      setResult({ valid: false, error: 'Enter a valid 6-digit Indian Postal PIN code' });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/pincode/${cleanPin}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setResult(data);
      } else {
        setResult({ valid: false, error: data.error || 'PIN code check failed' });
      }
    } catch {
      setResult({ valid: false, error: 'Network error checking pincode' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#12151D] border border-[#232938] rounded-xl p-4 text-white">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-[#E07A24]" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">
          Delivery & COD Availability
        </h4>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2">
        <input
          type="text"
          maxLength={6}
          value={pincode}
          onChange={e => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Enter 6-digit PIN code"
          className="flex-1 bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E07A24] font-mono tracking-wider"
        />
        <button
          type="submit"
          disabled={loading || pincode.length !== 6}
          className="px-4 py-2 bg-[#1A1E29] hover:bg-[#232938] border border-[#2B3245] text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer disabled:opacity-40"
        >
          {loading ? 'Checking...' : 'Check'}
        </button>
      </form>

      {result && (
        <div className="mt-3 pt-3 border-t border-[#1C212E] text-xs">
          {result.valid ? (
            <div className="space-y-1 text-emerald-400">
              <p className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Delivery to {pincode} ({result.estimatedDays})
              </p>
              <p className="text-gray-300 text-[11px] pl-5.5">
                Zone: {result.zone} &middot; Cash on Delivery (COD) & Online Payments Active
              </p>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-rose-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {result.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
