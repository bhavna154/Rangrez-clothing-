import React, { useState } from 'react';
import { X, Ruler } from 'lucide-react';

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  fitName?: string;
}

export const SizeChartModal: React.FC<SizeChartModalProps> = ({ isOpen, onClose, fitName = 'Oversized Fit' }) => {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');

  if (!isOpen) return null;

  const measurements = [
    { size: 'XS', chestIn: 38, chestCm: 96.5, lengthIn: 27, lengthCm: 68.5, shoulderIn: 18.5, shoulderCm: 47, sleeveIn: 8.5, sleeveCm: 21.5 },
    { size: 'S',  chestIn: 40, chestCm: 101.6, lengthIn: 28, lengthCm: 71,   shoulderIn: 19.5, shoulderCm: 49.5, sleeveIn: 9.0, sleeveCm: 23 },
    { size: 'M',  chestIn: 42, chestCm: 106.7, lengthIn: 29, lengthCm: 73.5, shoulderIn: 20.5, shoulderCm: 52, sleeveIn: 9.5, sleeveCm: 24 },
    { size: 'L',  chestIn: 44, chestCm: 111.8, lengthIn: 30, lengthCm: 76,   shoulderIn: 21.5, shoulderCm: 54.5, sleeveIn: 10.0, sleeveCm: 25.5 },
    { size: 'XL', chestIn: 46, chestCm: 116.8, lengthIn: 31, lengthCm: 78.5, shoulderIn: 22.5, shoulderCm: 57, sleeveIn: 10.5, sleeveCm: 26.5 },
    { size: 'XXL',chestIn: 48, chestCm: 122,   lengthIn: 32, lengthCm: 81,   shoulderIn: 23.5, shoulderCm: 59.5, sleeveIn: 11.0, sleeveCm: 28 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#12151D] border border-[#232938] rounded-xl max-w-2xl w-full p-6 text-white shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232938]">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#E07A24]" />
            <h3 className="text-lg font-bold font-serif-brand">Atelier Size & Dimension Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-white rounded-md hover:bg-[#1A1E29] transition-colors"
            aria-label="Close size guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Unit switch */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <p className="text-xs text-[#9CA3AF]">
            Measurements tailored for our <span className="text-white font-medium">{fitName} (240 GSM)</span>
          </p>
          <div className="flex items-center bg-[#1A1E29] border border-[#2B3245] p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setUnit('in')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                unit === 'in' ? 'bg-[#E07A24] text-white font-semibold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Inches (in)
            </button>
            <button
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                unit === 'cm' ? 'bg-[#E07A24] text-white font-semibold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Centimeters (cm)
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-[#232938] rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1A1E29] text-[#9CA3AF] uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Chest</th>
                <th className="py-3 px-4">Length</th>
                <th className="py-3 px-4">Shoulder</th>
                <th className="py-3 px-4">Sleeve</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232938]">
              {measurements.map(m => (
                <tr key={m.size} className="hover:bg-[#161922] transition-colors">
                  <td className="py-3 px-4 font-bold text-white font-mono">{m.size}</td>
                  <td className="py-3 px-4 font-mono tabular-nums text-gray-300">
                    {unit === 'in' ? `${m.chestIn}"` : `${m.chestCm} cm`}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-gray-300">
                    {unit === 'in' ? `${m.lengthIn}"` : `${m.lengthCm} cm`}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-gray-300">
                    {unit === 'in' ? `${m.shoulderIn}"` : `${m.shoulderCm} cm`}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-gray-300">
                    {unit === 'in' ? `${m.sleeveIn}"` : `${m.sleeveCm} cm`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fit recommendations */}
        <div className="mt-5 p-4 bg-[#0B0D12] rounded-lg border border-[#232938] text-xs text-[#9CA3AF] space-y-1.5">
          <p className="font-semibold text-white">How our fits drape:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Oversized Silhouette:</strong> Features an architectural dropped shoulder and generous boxy chest. For a relaxed drape, select your true size. For a standard fit, size down by one.</li>
            <li><strong>Heavyweight 240 GSM Fabric:</strong> Substantial combed cotton with zero see-through and structured posture that stays crisp all day.</li>
            <li><strong>Pre-Shrunk:</strong> Treated with bio-wash enzymes; shrinkage is strictly under 2% when washed cold.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
