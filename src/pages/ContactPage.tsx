import React, { useState } from 'react';
import { Mail, MessageCircle, Clock, MapPin, Send } from 'lucide-react';
import { useToast } from '../context/ToastContext.tsx';

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Sizing / Order Inquiry');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Message sent to atelier concierge', 'success');
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
      } else {
        showToast(data.error || 'Failed to submit message', 'error');
      }
    } catch {
      showToast('Network error submitting contact request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">
          Atelier Concierge
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold font-serif-brand">
          Reach Our Craft Studio
        </h1>
        <p className="text-xs text-[#9CA3AF]">
          Have questions regarding sizing, custom bulk orders, or your current dispatch? Our team is at your disposal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        
        {/* Info Column (5 cols) */}
        <div className="md:col-span-5 space-y-6">
          <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3">
              Direct Channels
            </h2>

            <div className="space-y-4 text-xs text-gray-300">
              <a
                href="https://wa.me/919876543210?text=Hello%20RANGREZ%20Atelier,%20I%20have%20an%20inquiry%20regarding%20my%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-emerald-950/40 border border-emerald-900/60 rounded-lg text-emerald-300 hover:text-emerald-200 transition-colors"
              >
                <MessageCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Instant WhatsApp Concierge</p>
                  <p className="text-[11px] text-gray-400">Available Mon-Sat 10:00 - 19:00 IST</p>
                </div>
              </a>

              <div className="flex items-center gap-3 p-3 bg-[#0B0D12] border border-[#232938] rounded-lg">
                <Mail className="w-5 h-5 text-[#E07A24] shrink-0" />
                <div>
                  <p className="font-semibold text-white">Email Inquiries</p>
                  <p className="text-[11px] text-gray-400">concierge@rangrez.in</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0B0D12] border border-[#232938] rounded-lg">
                <Clock className="w-5 h-5 text-indigo-400 shrink-0" />
                <div>
                  <p className="font-semibold text-white">Concierge Hours</p>
                  <p className="text-[11px] text-gray-400">10:00 AM – 7:00 PM IST (Mon – Sat)</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#0B0D12] border border-[#232938] rounded-lg">
                <MapPin className="w-5 h-5 text-[#8E2834] shrink-0" />
                <div>
                  <p className="font-semibold text-white">Atelier Studio</p>
                  <p className="text-[11px] text-gray-400">Mill Compound, Lower Parel, Mumbai 400013, India</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Column (7 cols) */}
        <div className="md:col-span-7 bg-[#12151D] border border-[#232938] rounded-xl p-8">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white border-b border-[#232938] pb-3 mb-6">
            Send an Inquiry
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="aarav@example.com"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Mobile (Optional)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#E07A24]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
                >
                  <option value="Sizing / Order Inquiry">Sizing / Fit Advice</option>
                  <option value="Order Tracking">Order & Tracking Status</option>
                  <option value="Exchange Request">Exchange & Returns</option>
                  <option value="Wholesale / Collaborations">Atelier Collaborations</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Your Message *</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Share your inquiry in detail..."
                className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E07A24]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-wider rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? 'Transmitting...' : 'Dispatch Message'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
