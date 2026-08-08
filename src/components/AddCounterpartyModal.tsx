import React, { useState } from 'react';
import { X, Building, ShieldCheck, PlusCircle } from 'lucide-react';
import { addCounterparty } from '../lib/counterpartyStore';

interface AddCounterpartyModalProps {
  onClose: () => void;
  onAdded: (name: string) => void;
}

export const AddCounterpartyModal: React.FC<AddCounterpartyModalProps> = ({ onClose, onAdded }) => {
  const [name, setName] = useState('');
  const [lei, setLei] = useState('');
  const [country, setCountry] = useState('United States');
  const [rating, setRating] = useState<'AAA' | 'AA+' | 'AA' | 'A+' | 'A' | 'BBB+'>('A+');
  const [creditLimitMillions, setCreditLimitMillions] = useState(500);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !lei.trim()) return;

    addCounterparty({
      name: name.trim(),
      lei: lei.trim().toUpperCase(),
      country,
      rating,
      creditLimitMillions: Number(creditLimitMillions) || 500,
    });

    onAdded(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0d0f12] border border-gray-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-[#12141a] px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider font-mono">
            <Building className="w-4 h-4 text-blue-400" />
            Add New Institutional Counterparty
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Counterparty Legal Name
            </label>
            <input
              type="text"
              placeholder="e.g., Bank of America, N.A."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#16181d] border border-gray-700 rounded p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Legal Entity Identifier (LEI 20-Char Code)
            </label>
            <input
              type="text"
              placeholder="e.g., BFA5QOO68Y59C24R5804"
              value={lei}
              onChange={(e) => setLei(e.target.value)}
              className="w-full bg-[#16181d] border border-gray-700 rounded p-2.5 text-sm text-white font-mono uppercase focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white"
              >
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Germany">Germany</option>
                <option value="France">France</option>
                <option value="Switzerland">Switzerland</option>
                <option value="Japan">Japan</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Credit Rating
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value as any)}
                className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono font-bold"
              >
                <option value="AAA">AAA</option>
                <option value="AA+">AA+</option>
                <option value="AA">AA</option>
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="BBB+">BBB+</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Credit Limit ($M)
              </label>
              <input
                type="number"
                value={creditLimitMillions}
                onChange={(e) => setCreditLimitMillions(Number(e.target.value))}
                className="w-full bg-[#16181d] border border-gray-700 rounded p-2 text-xs text-white font-mono"
                required
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-bold uppercase cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg"
            >
              <PlusCircle className="w-4 h-4" />
              Save Counterparty
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
