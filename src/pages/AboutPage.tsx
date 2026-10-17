import React from 'react';
import { ArrowRight, Layers, Sparkles, Feather } from 'lucide-react';

interface AboutPageProps {
  navigate: (path: string) => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ navigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 text-white">
      {/* Title */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-[0.3em] text-[#E07A24] font-semibold">
          The Atelier Chronicle
        </p>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-serif-brand tracking-tight">
          Wear the Colours of Your Story
        </h1>
        <p className="text-sm text-[#9CA3AF] leading-relaxed">
          The story of the master dyers who brought natural pigments to life across Indian civilisations—and why we refuse to make ordinary t-shirts.
        </p>
      </div>

      {/* Origin Story */}
      <div className="bg-[#12151D] border border-[#232938] rounded-2xl p-8 sm:p-12 space-y-6 leading-relaxed text-sm text-[#D1D5DB]">
        <h2 className="text-xl font-bold font-serif-brand text-white">
          Who is a "Rangrez"?
        </h2>
        <p>
          In classical Urdu and Hindi, <em>Rangrez</em> (रंगरेज़ / رنگریز) refers to the artisan dyer. For generations, the Rangrez possessed an almost supernatural understanding of textiles and botanicals. In deep clay vats, they fermented indigofera tinctoria to extract cosmic midnight blues. They pulverized Himalayan madder roots (<em>manjistha</em>) for earthy crimsons, and steeped saffron and marigold for divine ambers.
        </p>
        <p>
          Every cloth that emerged from their dye-works bore the texture of their patience. It wasn't uniform plastic sheen; it was alive.
        </p>
        <p>
          In modern fast fashion, that soul has been replaced by synthetic 160 GSM blends, volatile petroleum inks, and disposable graphics that crack before the season ends.
        </p>
        <p>
          RANGREZ was born to stand in direct opposition to this throwaway culture.
        </p>
      </div>

      {/* The 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-3">
          <Layers className="w-6 h-6 text-[#E07A24]" />
          <h3 className="text-base font-bold font-serif-brand text-white">1. Heavyweight 240 GSM</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            We use tightly spun, combed ringspun cotton weighing 240 grams per square meter. It never clings to the body, possesses an architectural drape, and stays pristine through years of wear.
          </p>
        </div>

        <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-3">
          <Sparkles className="w-6 h-6 text-indigo-400" />
          <h3 className="text-base font-bold font-serif-brand text-white">2. Botanical Pigment Fidelity</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Every graphic is an original design produced with premium Direct-to-Garment and discharge inks that become part of the cotton weave instead of sitting as a brittle plastic barrier.
          </p>
        </div>

        <div className="bg-[#12151D] border border-[#232938] rounded-xl p-6 space-y-3">
          <Feather className="w-6 h-6 text-[#8E2834]" />
          <h3 className="text-base font-bold font-serif-brand text-white">3. Zero Plastic Ethos</h3>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            From recycled unbleached kraft envelopes to organic cotton stitching, our garments travel to your doorstep without polybags or single-use plastics.
          </p>
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center pt-8">
        <button
          onClick={() => navigate('/shop')}
          className="px-8 py-3.5 bg-[#E07A24] hover:bg-[#C96617] text-white text-xs font-bold uppercase tracking-widest rounded-lg inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          Explore Available Pieces
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
