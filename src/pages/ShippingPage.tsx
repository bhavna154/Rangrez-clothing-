import React from 'react';
import { useBrand } from '../context/BrandContext.tsx';

export const ShippingPage: React.FC = () => {
  const { brandSettings } = useBrand();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-white space-y-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#E07A24] font-semibold">Atelier Policies</p>
        <h1 className="text-3xl font-extrabold font-serif-brand mt-1 mb-3">Shipping, Delivery &amp; Returns</h1>
        <p className="text-xs text-[#9CA3AF]">Consumer Protection (E-Commerce) Rules &middot; Authentic Atelier Standard</p>
      </div>

      <div className="bg-[#12151D] border border-[#232938] rounded-xl p-8 space-y-6 text-xs text-[#D1D5DB] leading-relaxed">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">1. Dispatch &amp; Fulfilment Timelines</h2>
          <p>
            {brandSettings.deliveryTimeText?.trim()
              ? brandSettings.deliveryTimeText
              : 'All garments are inspected, packaged securely, and dispatched from our fulfillment hub. You will receive real-time courier tracking details (AWB) the moment your order enters transit.'}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">2. Shipping Charges &amp; Offers</h2>
          <p>
            {brandSettings.shippingOfferText?.trim()
              ? brandSettings.shippingOfferText
              : 'Standard shipping charges and any active delivery promotions are automatically computed and shown at checkout. Cash on Delivery (COD) is supported across serviceable pin codes.'}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">3. 7-Day Size Exchange Policy</h2>
          <p>We want every customer to experience the perfect silhouette. If your garment does not fit as desired, you may request a size exchange within <strong>7 days</strong> of delivery. The garment must be unworn, unwashed, and retained with all original tags attached.</p>
        </div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2">4. Damaged or Defective Items</h2>
          <p>In the unlikely event that your parcel arrives damaged or with a manufacturing defect, notify us at <em>concierge@rangrez.in</em> within 48 hours with a photograph for prompt assistance.</p>
        </div>
      </div>
    </div>
  );
};
