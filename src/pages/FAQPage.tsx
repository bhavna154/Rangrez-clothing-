import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What makes 240 GSM combed cotton different from standard t-shirts?',
      a: 'Standard mall t-shirts typically use 140 to 180 GSM carded cotton, which clings to the body and loses structural shape after a few washes. Our 240 GSM combed ringspun cotton is significantly denser and heavier, providing a luxurious boxy drape that falls cleanly without adhering to the torso.'
    },
    {
      q: 'Will the t-shirt shrink or fade after machine washing?',
      a: 'All our fabrics undergo a rigorous pre-shrinking and enzymatic bio-wash treatment. Shrinkage is strictly less than 2% when washed according to care instructions (machine wash cold, gentle cycle, hang dry or tumble dry low). Inks are cured into the fibers, avoiding color fade.'
    },
    {
      q: 'Can I pay via Cash on Delivery (COD)?',
      a: 'Yes. Cash on Delivery is supported across serviceable Indian postal PIN codes. A modest handling fee of ₹60 is applied to cover courier collection insurance. You can hand over cash or scan the courier\'s dynamic UPI QR code on delivery.'
    },
    {
      q: 'How long will delivery take to my city?',
      a: 'Deliveries to major metros (Delhi NCR, Mumbai, Bengaluru, Chennai, Kolkata, Hyderabad, Pune) take 2–4 business days. Regional destinations take 4–6 business days. You will receive active tracking details the moment your parcel enters transit.'
    },
    {
      q: 'What is your size exchange policy?',
      a: 'We offer an easy 7-day size exchange guarantee for unworn items with tags attached. If your tee feels too oversized or snug, simply reach out to concierge@rangrez.in or message our WhatsApp team, and we will arrange a reverse pickup.'
    },
    {
      q: 'Do you offer custom prints or customer-provided designs?',
      a: 'No. RANGREZ is strictly an independent design atelier. We only release our own in-house limited editions and original artwork. We do not accept external custom graphic submissions.'
    }
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white space-y-8">
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">Knowledge Base</p>
        <h1 className="text-3xl font-extrabold font-serif-brand">Frequently Asked Questions</h1>
        <p className="text-xs text-[#9CA3AF]">Everything you need to know about our fabrics, sizing, and dispatch.</p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="bg-[#12151D] border border-[#232938] rounded-xl overflow-hidden transition-colors"
          >
            <button
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
            >
              <span className="text-sm font-semibold text-white">{faq.q}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openIndex === idx ? 'rotate-180 text-[#E07A24]' : ''}`} />
            </button>
            {openIndex === idx && (
              <div className="px-5 pb-5 text-xs text-[#9CA3AF] leading-relaxed border-t border-[#1C212E] pt-4">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
