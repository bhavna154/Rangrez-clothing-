import React, { useState } from 'react';
import { ArrowRight, MessageCircle, Lock } from 'lucide-react';
import { useToast } from '../context/ToastContext.tsx';
import { RangrezLogo } from './RangrezLogo.tsx';

interface FooterProps {
  navigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ navigate }) => {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Please provide a valid email address', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Subscribed successfully', 'success');
        setEmail('');
      } else {
        showToast(data.error || 'Failed to subscribe', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#07090D] border-t border-[#232938] text-[#9CA3AF] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
          
          {/* Brand Col */}
          <div className="lg:col-span-2">
            <div className="mb-3">
              <RangrezLogo variant="horizontal" size="md" light={true} />
            </div>
            <p className="text-sm text-[#D1D5DB] mb-4 font-serif italic">
              "Wear the Colours of Your Story"
            </p>
            <p className="text-sm text-[#9CA3AF] leading-relaxed max-w-sm mb-6">
              Homegrown Indian streetwear atelier dedicated strictly to heavyweight, combed cotton tees inspired by master dyers, natural indigo vats, and madder roots.
            </p>
            <a
              href="https://wa.me/919876543210?text=Hello%20RANGREZ%20Atelier,%20I%20have%20an%20inquiry%20regarding%20my%20order."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors py-2 px-3 rounded-lg bg-[#12151D] border border-emerald-900/50"
            >
              <MessageCircle className="w-4 h-4" />
              Direct Atelier WhatsApp Concierge
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Collection
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={() => navigate('/shop')} className="hover:text-white transition-colors cursor-pointer text-left">
                  All T-Shirts
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?fit=Oversized')} className="hover:text-white transition-colors cursor-pointer text-left">
                  240 GSM Oversized
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shop?fit=Relaxed')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Relaxed Drop Shoulder
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/about')} className="hover:text-white transition-colors cursor-pointer text-left">
                  The Dyeing Heritage
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Care */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Atelier Care
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <button onClick={() => navigate('/account?tab=tracking')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Track Your Order
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/shipping-returns')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Shipping & Returns
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/faq')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Size Guide & FAQ
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer text-left">
                  Contact Concierge
                </button>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white mb-4">
              Atelier Dispatch
            </h3>
            <p className="text-xs text-[#9CA3AF] mb-4 leading-relaxed">
              Early access to seasonal dye batches and private limited drops. Never spam.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full bg-[#12151D] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#E07A24] pr-10"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="absolute right-1 top-1 bottom-1 px-2.5 bg-[#E07A24] hover:bg-[#C96617] text-white rounded-md flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                  aria-label="Subscribe"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#1C212E] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#6B7280]">
          <p>
            &copy; {new Date().getFullYear()} RANGREZ Atelier. Handcrafted in India. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <button onClick={() => navigate('/privacy')} className="hover:text-gray-400 transition-colors cursor-pointer">
              Privacy Policy
            </button>
            <button onClick={() => navigate('/terms')} className="hover:text-gray-400 transition-colors cursor-pointer">
              Terms of Service
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="text-[#E07A24] hover:text-[#F59E0B] transition-colors cursor-pointer font-bold flex items-center gap-1.5 px-2.5 py-1 bg-[#161B26] border border-[#2B3245] rounded-md"
            >
              <Lock className="w-3 h-3 text-[#E07A24]" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};
