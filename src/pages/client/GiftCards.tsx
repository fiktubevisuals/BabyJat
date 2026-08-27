import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { GiftCard3D, CARD_THEMES, CardTheme } from '../../components/GiftCard3D';

const PRESET_AMOUNTS = [100000, 250000, 500000, 1000000, 2000000];

const PRESET_OCCASIONS = [
  { label: 'Hair Makeover', note: 'Enjoy a luxurious hair transformation and styling at BabyJat Salon & Boutique!' },
  { label: 'Happy Birthday', note: 'Wishing you a fabulous year filled with beauty, elegance, and crowning moments!' },
  { label: 'With Love', note: 'A special token of love for an unforgettable salon indulgence.' },
  { label: 'Congratulations', note: 'Celebrate your special moment with a bespoke VIP pampering session.' }
];

export default function GiftCards() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedTheme, setSelectedTheme] = useState<CardTheme>(CARD_THEMES[0]);
  const [amount, setAmount] = useState<number>(250000);
  const [customAmount, setCustomAmount] = useState<string>('');
  
  // Recipient & Sender form details
  const [recipientName, setRecipientName] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [senderName, setSenderName] = useState<string>(user?.displayName || '');
  const [giftNote, setGiftNote] = useState<string>('Enjoy a luxurious hair makeover at BabyJat Salon & Boutique!');
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCard, setCreatedCard] = useState<{ code: string; amount: number } | null>(null);

  const activeAmount = customAmount ? Number(customAmount) : amount;

  const handleCreateGiftCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: { pathname: '/gift-cards' } } });
      return;
    }

    if (activeAmount < 20000) {
      setError('Minimum gift card value is UGX 20,000.');
      return;
    }

    setLoading(true);
    setError(null);

    // Generate unique card code e.g. BJ-GIFT-89A4X2
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const cardCode = `BJ-GIFT-${randomHex}`;

    try {
      const cardData = {
        code: cardCode,
        amount: activeAmount,
        balance: activeAmount,
        themeId: selectedTheme.id,
        recipientName,
        recipientEmail,
        senderName: senderName || user.displayName || 'A Friend',
        senderEmail: user.email,
        senderId: user.uid,
        giftNote,
        status: 'active',
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'giftcards', cardCode), cardData);

      // Trigger Automated Digital Gift Card Email
      try {
        await fetch('/api/email/send-giftcard-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientEmail: recipientEmail || user.email,
            recipientName: recipientName || 'Special Recipient',
            senderName: senderName || user.displayName || 'A Friend',
            senderEmail: user.email,
            cardCode,
            amount: activeAmount,
            giftNote
          })
        });
      } catch (emailErr) {
        console.warn("Automated gift card email trigger failed silently:", emailErr);
      }

      // Trigger checkout call
      const res = await fetch('/api/pesapal/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `GC_${cardCode}`,
          amount: activeAmount,
          description: `BabyJat Luxury Digital Gift Card (${cardCode})`,
          email: user.email,
          firstName: senderName.split(' ')[0] || 'Customer',
          lastName: senderName.split(' ').slice(1).join(' ') || ''
        })
      });

      if (res.ok) {
        const { redirect_url } = await res.json();
        if (redirect_url) {
          window.location.href = redirect_url;
          return;
        }
      }

      setCreatedCard({ code: cardCode, amount: activeAmount });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'giftcards');
      setError('Failed to issue gift card. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-6 pb-stack-lg">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors bg-surface-container-low px-3.5 py-2 rounded-full border border-outline/10 hover:border-outline/30"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Previous Page</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3">
          <span className="material-symbols-outlined text-sm">card_giftcard</span>
          <span className="font-label-caps tracking-widest uppercase">Haute Coiffure Digital Pass</span>
        </div>
        <h1 className="font-headline-lg text-3xl md:text-5xl text-on-surface mt-1 mb-3">
          BabyJat E-Gift Cards
        </h1>
        <p className="text-secondary text-sm md:text-base leading-relaxed">
          Gift an unforgettable pampering experience — luxury knotless braids, balayage, silk press, or boutique cosmetics. Instant digital issuance with security QR verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Live 3D Interactive Card Preview & Theme Picker */}
        <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-[100px]">
          
          {/* Live Gift Card Preview */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl border border-outline/10 shadow-lg">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline/10">
              <span className="font-label-caps text-xs text-secondary font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">visibility</span>
                Live VIP Card Visualizer
              </span>
              <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 font-bold">
                REAL-TIME PREVIEW
              </span>
            </div>

            <GiftCard3D
              theme={selectedTheme}
              amount={activeAmount}
              recipientName={recipientName}
              senderName={senderName}
              giftNote={giftNote}
              code={createdCard ? createdCard.code : 'BJ-GIFT-PREVIEW'}
              isFlipped={isFlipped}
              onFlipToggle={() => setIsFlipped(!isFlipped)}
            />
          </div>

          {/* Theme Selector Grid */}
          <div className="bg-surface-container-low p-5 rounded-3xl border border-outline/10 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-caps text-xs text-secondary font-bold uppercase tracking-wider">
                Card Aesthetic Edition
              </span>
              <span className="text-[11px] text-primary font-bold">{selectedTheme.name}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {CARD_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setSelectedTheme(theme)}
                  className={`p-2 rounded-2xl border text-left transition-all ${
                    selectedTheme.id === theme.id
                      ? 'border-primary ring-2 ring-primary/30 scale-105 bg-surface-container-lowest shadow-md'
                      : 'border-outline/10 hover:border-outline/30 bg-surface-container-lowest/50'
                  }`}
                >
                  <div className={`w-full h-8 rounded-xl mb-1.5 ${theme.bgGradient} border border-white/20 shadow-inner flex items-center justify-center`}>
                    <span className={`font-headline-md italic text-[10px] ${theme.textColor}`}>BJ</span>
                  </div>
                  <p className="font-bold text-[10px] text-on-surface truncate text-center">{theme.name}</p>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Gift Card Details Form */}
        <div className="lg:col-span-6 bg-surface-container-lowest p-6 md:p-8 rounded-3xl border border-outline/10 shadow-sm">
          
          {createdCard ? (
            <div className="text-center py-8 space-y-5">
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-xl">
                <span className="material-symbols-outlined text-4xl">verified</span>
              </div>
              <div>
                <span className="font-label-caps text-xs text-primary font-bold uppercase tracking-widest">Issuance Complete</span>
                <h2 className="font-headline-md text-2xl md:text-3xl text-on-surface font-bold mt-1">E-Gift Voucher Activated!</h2>
                <p className="text-xs text-secondary max-w-sm mx-auto mt-1">
                  Your luxury gift card code has been generated. The voucher is ready for instant redemption at checkout.
                </p>
              </div>

              <div className="bg-surface-container-low p-5 rounded-2xl font-mono text-xl md:text-2xl font-bold text-primary tracking-widest my-4 border border-primary/20 shadow-inner flex items-center justify-between">
                <span>{createdCard.code}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(createdCard.code)}
                  className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-primary"
                  title="Copy Code"
                >
                  <span className="material-symbols-outlined text-base">content_copy</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(createdCard.code)}
                  className="px-6 py-3 bg-primary text-on-primary font-label-caps text-xs rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span> Copy Voucher Code
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/services')}
                  className="px-6 py-3 bg-surface-container text-on-surface font-label-caps text-xs rounded-xl hover:bg-surface-container-high border border-outline/10"
                >
                  Book Salon Appointment
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3 bg-surface-container-low text-secondary font-label-caps text-xs rounded-xl hover:text-on-surface border border-outline/10 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Previous Page
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreateGiftCard} className="space-y-6">
              
              <div className="border-b border-outline/10 pb-4">
                <h3 className="font-headline-md text-xl text-on-surface font-bold">Configure Your Gift Pass</h3>
                <p className="text-xs text-secondary mt-0.5">Customize the value, recipient details, and message.</p>
              </div>

              {error && <div className="bg-error-container/20 text-error p-3 rounded-xl text-xs">{error}</div>}

              {/* Amount Selector */}
              <div>
                <label className="block font-label-caps text-xs text-secondary font-bold mb-2">Select Gift Amount (UGX)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {PRESET_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        setAmount(amt);
                        setCustomAmount('');
                      }}
                      className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all ${
                        !customAmount && amount === amt
                          ? 'border-primary bg-primary text-on-primary shadow-md'
                          : 'border-outline/15 bg-surface-container-low text-on-surface hover:border-primary/40'
                      }`}
                    >
                      UGX {amt.toLocaleString()}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-secondary">UGX</span>
                  <input
                    type="number"
                    placeholder="Enter custom amount (min 20,000)"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/20 rounded-xl pl-14 pr-4 py-3 text-xs text-on-surface outline-none focus:border-primary font-bold"
                  />
                </div>
              </div>

              {/* Quick Occasion Note Presets */}
              <div>
                <label className="block font-label-caps text-xs text-secondary font-bold mb-2">Choose Occasion Preset</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {PRESET_OCCASIONS.map((occ) => (
                    <button
                      key={occ.label}
                      type="button"
                      onClick={() => setGiftNote(occ.note)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${
                        giftNote === occ.note
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-surface-container-low text-secondary border-outline/10 hover:border-outline/30'
                      }`}
                    >
                      {occ.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-caps text-xs text-secondary font-bold mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Namubiru"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-label-caps text-xs text-secondary font-bold mb-1">Recipient Email</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-xs text-on-surface outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Sender Details */}
              <div>
                <label className="block font-label-caps text-xs text-secondary font-bold mb-1">Sender Name</label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-xs text-on-surface outline-none focus:border-primary"
                />
              </div>

              {/* Personal Note */}
              <div>
                <label className="block font-label-caps text-xs text-secondary font-bold mb-1">Personal Card Note</label>
                <textarea
                  rows={3}
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Add a heartfelt message for your recipient..."
                  className="w-full bg-surface-container-low border border-outline/20 rounded-xl px-4 py-3 text-xs text-on-surface outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-primary to-primary/90 text-on-primary py-4 rounded-2xl font-label-caps text-xs font-bold hover:opacity-95 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-xl active:scale-[0.99]"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
                ) : (
                  `PURCHASE GIFT CARD (UGX ${activeAmount ? activeAmount.toLocaleString() : '0'})`
                )}
                {!loading && <span className="material-symbols-outlined text-sm">payments</span>}
              </button>

            </form>
          )}

        </div>

      </div>
    </main>
  );
}
