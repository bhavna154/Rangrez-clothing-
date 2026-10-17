import React from 'react';

export const TermsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">Legal Agreement</p>
        <h1 className="text-3xl font-extrabold font-serif-brand mt-1 mb-3">Terms of Service</h1>
        <p className="text-xs text-[#9CA3AF]">Please review these terms before placing an order on RANGREZ.</p>
      </div>

      <div className="bg-[#12151D] border border-[#232938] rounded-xl p-8 space-y-6 text-xs text-[#D1D5DB] leading-relaxed">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">1. Scope of the Store</h2>
          <p>RANGREZ operates as a specialized, direct-to-consumer premium apparel brand offering our own proprietary printed graphic garments. All graphic works, typography, and trademarks remain the sole intellectual property of RANGREZ.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">2. Pricing & Currency</h2>
          <p>All prices displayed on the store are denominated in Indian Rupees (INR) and are inclusive of Goods and Services Tax (GST). Delivery and COD charges are computed and itemized transparently prior to order confirmation.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">3. Cash on Delivery (COD) Policy</h2>
          <p>For orders placed under Cash on Delivery, the customer undertakes to make payment of the exact invoice total upon arrival of the courier agent. Persistent refusals of verified COD parcels may result in restriction of COD payment eligibility on subsequent orders.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">4. Jurisdiction</h2>
          <p>Any disputes arising under these terms and conditions shall be subject to the exclusive jurisdiction of the competent courts of Mumbai, India.</p>
        </div>
      </div>
    </div>
  );
};
