import React, { useState } from 'react';

export interface CardTheme {
  id: string;
  name: string;
  bgGradient: string;
  textColor: string;
  accentColor: string;
  badgeBg: string;
  chipColor: string;
  borderColor: string;
  foilEffect: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: 'copper_muse',
    name: 'Signature Copper Muse',
    bgGradient: 'bg-gradient-to-br from-[#2B1006] via-[#C85A28] to-[#120502]',
    textColor: 'text-amber-100',
    accentColor: 'text-amber-300',
    badgeBg: 'bg-amber-400/20 text-amber-200 border-amber-400/30',
    chipColor: 'from-amber-200 via-amber-400 to-yellow-600',
    borderColor: 'border-amber-400/30',
    foilEffect: 'from-amber-500/20 via-orange-400/10 to-transparent',
  },
  {
    id: 'noir_obsidian',
    name: 'Noir Obsidian 24K',
    bgGradient: 'bg-gradient-to-br from-[#121214] via-[#242228] to-[#08080A]',
    textColor: 'text-amber-50',
    accentColor: 'text-amber-300',
    badgeBg: 'bg-amber-300/20 text-amber-200 border-amber-300/40',
    chipColor: 'from-yellow-200 via-amber-300 to-yellow-600',
    borderColor: 'border-amber-300/40',
    foilEffect: 'from-yellow-400/20 via-amber-300/10 to-transparent',
  },
  {
    id: 'velvet_rose',
    name: 'Velvet Rose Gold',
    bgGradient: 'bg-gradient-to-br from-[#2D1226] via-[#5C1E49] to-[#120510]',
    textColor: 'text-rose-100',
    accentColor: 'text-rose-300',
    badgeBg: 'bg-rose-400/20 text-rose-200 border-rose-400/30',
    chipColor: 'from-rose-200 via-pink-400 to-rose-600',
    borderColor: 'border-rose-400/30',
    foilEffect: 'from-pink-500/20 via-rose-300/10 to-transparent',
  },
  {
    id: 'emerald_imperial',
    name: 'Emerald Imperial',
    bgGradient: 'bg-gradient-to-br from-[#061C13] via-[#114B33] to-[#020D08]',
    textColor: 'text-emerald-100',
    accentColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-400/20 text-emerald-200 border-emerald-400/30',
    chipColor: 'from-emerald-200 via-teal-400 to-emerald-700',
    borderColor: 'border-emerald-400/30',
    foilEffect: 'from-emerald-400/20 via-teal-300/10 to-transparent',
  },
  {
    id: 'pearl_platinum',
    name: 'Pearl Platinum',
    bgGradient: 'bg-gradient-to-br from-[#F8FAFC] via-[#E2E8F0] to-[#94A3B8]',
    textColor: 'text-slate-900',
    accentColor: 'text-slate-700',
    badgeBg: 'bg-slate-900/10 text-slate-800 border-slate-900/20',
    chipColor: 'from-slate-300 via-slate-100 to-slate-400',
    borderColor: 'border-slate-900/20',
    foilEffect: 'from-white/60 via-slate-200/30 to-transparent',
  }
];

interface GiftCard3DProps {
  theme?: CardTheme;
  amount: number;
  recipientName?: string;
  senderName?: string;
  giftNote?: string;
  code?: string;
  isFlipped?: boolean;
  onFlipToggle?: () => void;
  showFlipButton?: boolean;
}

export const GiftCard3D: React.FC<GiftCard3DProps> = ({
  theme = CARD_THEMES[0],
  amount,
  recipientName,
  senderName,
  giftNote,
  code = 'BJ-GIFT-PREVIEW',
  isFlipped = false,
  onFlipToggle,
  showFlipButton = true,
}) => {
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = onFlipToggle ? isFlipped : internalFlipped;

  const handleFlip = () => {
    if (onFlipToggle) {
      onFlipToggle();
    } else {
      setInternalFlipped(!internalFlipped);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto group [perspective:1200px]">
      {/* 3D Card Container */}
      <div
        className={`relative w-full aspect-[1.58/1] rounded-3xl shadow-2xl transition-transform duration-700 [transform-style:preserve-3d] cursor-pointer ${
          flipped ? '[transform:rotateY(180deg)]' : ''
        }`}
        onClick={handleFlip}
      >
        {/* ================= FRONT SIDE ================= */}
        <div className={`absolute inset-0 w-full h-full rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden border backdrop-blur-xl transition-all [backface-visibility:hidden] ${theme.bgGradient} ${theme.borderColor}`}>
          
          {/* Holographic Shimmer Beam */}
          <div className={`absolute -inset-full w-[200%] h-[200%] bg-gradient-to-r ${theme.foilEffect} rotate-45 pointer-events-none transition-transform duration-1000 group-hover:translate-x-12`} />
          <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />

          {/* Top Bar: Brand Logo & VIP Tag */}
          <div className="relative z-10 flex justify-between items-start">
            <div className="flex items-center gap-3">
              {/* Luxury Monogram Crest */}
              <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
                <span className={`font-headline-md italic font-bold text-lg ${theme.accentColor}`}>
                  BJ
                </span>
              </div>
              <div>
                {/* Header-matching logo style */}
                <span className={`font-headline-md text-2xl md:text-3xl italic tracking-tight font-serif ${theme.textColor}`}>
                  BabyJat
                </span>
                <p className={`text-[9px] md:text-[10px] font-label-caps uppercase tracking-[0.2em] font-bold ${theme.accentColor}`}>
                  Haute Coiffure & Boutique
                </p>
              </div>
            </div>

            {/* Value Badge */}
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold border backdrop-blur-md shadow-lg ${theme.badgeBg}`}>
                <span className="material-symbols-outlined text-xs">payments</span>
                UGX {amount ? amount.toLocaleString() : '0'}
              </span>
            </div>
          </div>

          {/* Middle Row: Smart Metallic Chip & Personal Note */}
          <div className="relative z-10 my-auto py-2 flex items-center justify-between gap-4">
            {/* Metallic Gold IC Contact Chip */}
            <div className={`w-11 h-8 rounded-md bg-gradient-to-br ${theme.chipColor} border border-amber-200/50 shadow-inner flex flex-col justify-around p-1 relative overflow-hidden shrink-0`}>
              <div className="w-full h-[1px] bg-black/30" />
              <div className="w-full h-[1px] bg-black/30" />
              <div className="w-1/2 h-full bg-black/20 absolute left-1/4 top-0 border-x border-black/20" />
            </div>

            {/* Wireless Tap Icon */}
            <span className={`material-symbols-outlined text-lg opacity-40 ${theme.textColor}`}>
              contactless
            </span>

            {/* Gift Note Box */}
            <div className="flex-1 text-right pl-4">
              <p className={`text-xs italic line-clamp-2 ${theme.textColor} font-serif leading-relaxed opacity-95`}>
                "{giftNote || 'Enjoy an exquisite pampering experience at BabyJat.'}"
              </p>
            </div>
          </div>

          {/* Bottom Row: Recipient & Voucher Code */}
          <div className="relative z-10 flex justify-between items-end pt-3 border-t border-white/15">
            <div>
              <span className={`text-[9px] uppercase font-label-caps tracking-widest block opacity-75 ${theme.accentColor}`}>
                Exclusively For
              </span>
              <span className={`font-bold text-sm md:text-base tracking-wide ${theme.textColor}`}>
                {recipientName || 'Valued Recipient'}
              </span>
              {senderName && (
                <span className={`block text-[10px] italic opacity-80 ${theme.textColor}`}>
                  From: {senderName}
                </span>
              )}
            </div>

            <div className="text-right">
              <span className={`text-[9px] uppercase font-label-caps tracking-widest block opacity-75 ${theme.accentColor}`}>
                Voucher Serial
              </span>
              <span className={`font-mono font-bold text-xs md:text-sm tracking-wider ${theme.textColor}`}>
                {code}
              </span>
            </div>
          </div>
        </div>

        {/* ================= BACK SIDE ================= */}
        <div className={`absolute inset-0 w-full h-full rounded-3xl p-6 md:p-8 flex flex-col justify-between overflow-hidden border backdrop-blur-xl transition-all [transform:rotateY(180deg)] [backface-visibility:hidden] ${theme.bgGradient} ${theme.borderColor}`}>
          
          {/* Top Magnetic Stripe */}
          <div className="relative z-10 -mx-6 md:-mx-8 -mt-2 h-10 bg-slate-950 border-y border-white/10 flex items-center justify-end px-6">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
              BABYJAT OFFICIAL DIGITAL PASS • VIP HOLOGRAM
            </span>
          </div>

          {/* Signature Strip & Code */}
          <div className="relative z-10 my-3 bg-white/90 rounded-lg p-2.5 flex justify-between items-center text-slate-900 border border-slate-200 shadow-inner">
            <div className="italic font-serif text-xs text-slate-600 truncate max-w-[200px]">
              Authorized Signature: {senderName || 'BabyJat E-Issuance'}
            </div>
            <div className="font-mono font-bold text-xs tracking-widest bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
              {code}
            </div>
          </div>

          {/* Terms & Barcode / QR Section */}
          <div className="relative z-10 flex justify-between items-end gap-4 text-[10px] leading-tight">
            <div className={`space-y-1 opacity-80 ${theme.textColor} max-w-[240px]`}>
              <p className="font-bold uppercase tracking-wider text-[9px] font-label-caps">Terms of Privilege</p>
              <p>Redeemable online at babyjatsalon.com or at BabyJat Salon & Boutique. Non-refundable. No expiration date.</p>
            </div>

            {/* Simulated Barcode */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex gap-[2px] items-center h-8 bg-white p-1 rounded border border-white/30">
                <div className="w-[2px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
                <div className="w-[3px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
                <div className="w-[2px] h-full bg-slate-900" />
                <div className="w-[4px] h-full bg-slate-900" />
                <div className="w-[1px] h-full bg-slate-900" />
                <div className="w-[2px] h-full bg-slate-900" />
                <div className="w-[3px] h-full bg-slate-900" />
              </div>
              <span className={`font-mono text-[9px] opacity-75 ${theme.textColor}`}>SCAN AT CHECKOUT</span>
            </div>
          </div>

          {/* Bottom Brand Stamp */}
          <div className="relative z-10 flex justify-between items-center pt-2 border-t border-white/10">
            <span className={`font-headline-md italic text-sm ${theme.textColor}`}>
              BabyJat
            </span>
            <span className={`text-[9px] uppercase font-label-caps tracking-widest opacity-60 ${theme.textColor}`}>
              Tap Card to Flip Back
            </span>
          </div>

        </div>
      </div>

      {/* Optional Flip Toggle Button underneath */}
      {showFlipButton && (
        <div className="flex justify-center mt-3">
          <button
            type="button"
            onClick={handleFlip}
            className="text-xs font-label-caps text-secondary hover:text-primary flex items-center gap-1.5 transition-colors bg-surface-container-low px-3 py-1.5 rounded-full border border-outline/10"
          >
            <span className="material-symbols-outlined text-sm">3d_rotation</span>
            <span>{flipped ? 'Show Front Side' : 'Show Back Side & Terms'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
