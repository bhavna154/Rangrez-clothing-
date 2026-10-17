import React from 'react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">Privacy Commitment</p>
        <h1 className="text-3xl font-extrabold font-serif-brand mt-1 mb-3">Privacy Policy</h1>
        <p className="text-xs text-[#9CA3AF]">Governed by the Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023.</p>
      </div>

      <div className="bg-[#12151D] border border-[#232938] rounded-xl p-8 space-y-6 text-xs text-[#D1D5DB] leading-relaxed">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">1. Data We Collect</h2>
          <p>We collect essential customer information solely to fulfill your orders and provide customer support: your name, contact phone number, delivery address, and email address. We do not store complete payment card credentials on our servers; payments are processed securely via RBI-authorized payment aggregators (Razorpay / PhonePe).</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">2. How Your Data Is Utilized</h2>
          <p>Your address and phone details are shared with verified logistics partners (including Qikink fulfillment networks and national courier partners) strictly to execute shipping and delivery verification. We do not sell, rent, or lease customer data to third-party advertising brokers.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">3. Cookies & Session Storage</h2>
          <p>Our web storefront uses lightweight local storage and session cookies to preserve your cart items and authenticate your user session. No invasive cross-site tracking scripts are deployed.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">4. Grievance Officer</h2>
          <p>For data inquiries or deletion requests, contact our Grievance Officer at <em>privacy@rangrez.in</em>.</p>
        </div>
      </div>
    </div>
  );
};
