import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  price: number;
  initialShade?: string;
}

const STYLISTS = [
  { id: 'stylist_elena', name: 'Elena', title: 'Master Colorist' },
  { id: 'stylist_marcus', name: 'Marcus', title: 'Senior Sculptor' },
  { id: 'stylist_sofia', name: 'Sofia', title: 'Balayage Specialist' },
];

const TIME_SLOTS = [
  '09:00',
  '10:30',
  '12:00',
  '13:30',
  '15:00',
  '16:30',
  '18:00',
];

export function BookingModal({ isOpen, onClose, serviceName, price, initialShade }: BookingModalProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('10:30');
  const [stylistId, setStylistId] = useState(STYLISTS[0].id);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [checkingSlots, setCheckingSlots] = useState<boolean>(false);

  // Promo / Gift Card state
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Generate 7-day date ribbon
  const upcomingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString('en-US', { month: 'short' });
    return { dateStr, dayName, dayNum, monthName, isToday: i === 0 };
  });

  // Check booked slots whenever stylistId or selectedDate changes
  useEffect(() => {
    if (!isOpen || !selectedDate || !stylistId) return;

    const fetchBookedSlots = async () => {
      setCheckingSlots(true);
      try {
        const startOfDay = `${selectedDate}T00:00:00`;
        const endOfDay = `${selectedDate}T23:59:59`;
        
        const q = query(
          collection(db, 'appointments'),
          where('stylistId', '==', stylistId),
          where('date', '>=', startOfDay),
          where('date', '<=', endOfDay),
          where('status', 'in', ['pending', 'confirmed'])
        );

        const snap = await getDocs(q);
        const booked = snap.docs.map(doc => {
          const dateVal = doc.data().date;
          if (dateVal && dateVal.includes('T')) {
            return dateVal.split('T')[1].substring(0, 5);
          }
          return '';
        }).filter(Boolean);

        setBookedSlots(booked);
      } catch (err) {
        console.warn("Error fetching availability:", err);
      } finally {
        setCheckingSlots(false);
      }
    };

    fetchBookedSlots();
  }, [isOpen, selectedDate, stylistId]);

  if (!isOpen) return null;

  // Calculate final discounted price
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  const finalPrice = Math.max(0, price - discountAmount);

  const handleApplyPromo = async () => {
    setPromoError(null);
    if (!promoCode.trim()) return;

    const cleanCode = promoCode.trim().toUpperCase();

    // Preset coupons
    if (cleanCode === 'BABYJAT20') {
      const amt = Math.round(price * 0.2);
      setAppliedDiscount({ code: cleanCode, amount: amt, description: '20% Salon Promo Discount' });
      return;
    }
    if (cleanCode === 'LUXURY50') {
      setAppliedDiscount({ code: cleanCode, amount: 50000, description: 'UGX 50,000 Luxury Voucher' });
      return;
    }
    if (cleanCode === 'WELCOME10') {
      const amt = Math.round(price * 0.1);
      setAppliedDiscount({ code: cleanCode, amount: amt, description: '10% Welcome Discount' });
      return;
    }

    // Gift Cards collection check
    try {
      const gcRef = doc(db, 'giftcards', cleanCode);
      const gcSnap = await getDoc(gcRef);

      if (gcSnap.exists()) {
        const gcData = gcSnap.data();
        if (gcData.status === 'redeemed' || (gcData.balance || 0) <= 0) {
          setPromoError('This gift card has already been redeemed.');
          return;
        }
        const cardBalance = gcData.balance || gcData.amount || 0;
        const discountToApply = Math.min(price, cardBalance);
        setAppliedDiscount({
          code: cleanCode,
          amount: discountToApply,
          description: `Gift Card Balance (UGX ${cardBalance.toLocaleString()})`
        });
        return;
      }
    } catch (err) {
      console.warn("Gift card verification check error:", err);
    }

    setPromoError('Invalid promo code or gift card number.');
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to book an appointment.');
      return;
    }

    if (!selectedTime) {
      setError('Please select an available time slot.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const appointmentDateTime = `${selectedDate}T${selectedTime}:00`;

    try {
      // Conflict check
      const q = query(
        collection(db, 'appointments'),
        where('stylistId', '==', stylistId),
        where('date', '==', appointmentDateTime),
        where('status', 'in', ['pending', 'confirmed'])
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('This time slot was just booked by another client. Please select another slot.');
      }

      const appointmentData = {
        clientId: user.uid,
        stylistId,
        serviceName: initialShade ? `${serviceName} (${initialShade})` : serviceName,
        requestedShade: initialShade || null,
        date: appointmentDateTime,
        status: 'pending',
        originalPrice: price,
        discountApplied: appliedDiscount ? appliedDiscount.amount : 0,
        promoCode: appliedDiscount ? appliedDiscount.code : null,
        price: finalPrice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

      // Trigger Automated Email Confirmation
      try {
        const selectedStylistObj = STYLISTS.find(s => s.id === stylistId);
        await fetch('/api/email/send-booking-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            clientName: user.displayName || 'Valued Client',
            serviceName: appointmentData.serviceName,
            date: appointmentDateTime,
            stylistName: selectedStylistObj ? selectedStylistObj.name : 'Master Stylist',
            price: finalPrice,
            bookingId: docRef.id,
            requestedShade: initialShade || undefined
          })
        });
      } catch (emailErr) {
        console.warn("Automated booking email trigger failed silently:", emailErr);
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 3000);
      
    } catch (err: any) {
      if (err.message.includes('time slot was just booked')) {
        setError(err.message);
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'appointments');
        setError('Failed to book appointment. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-outline/10 my-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <div className="mb-4">
          <span className="font-label-caps text-xs text-primary font-bold">Appointment Scheduling</span>
          <h2 className="font-headline-md text-2xl text-on-surface">{serviceName}</h2>
          {initialShade && (
            <p className="text-xs text-primary font-bold mt-0.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">palette</span> Selected Color: {initialShade}
            </p>
          )}
        </div>

        {success ? (
          <div className="bg-primary-container/20 text-primary p-6 rounded-2xl text-center space-y-3">
            <span className="material-symbols-outlined text-5xl">check_circle</span>
            <p className="font-bold text-lg">Appointment Confirmed!</p>
            <p className="text-xs text-secondary">
              We look forward to welcoming you on <strong>{selectedDate}</strong> at <strong>{selectedTime}</strong>.
            </p>
            <div className="inline-flex items-center justify-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-primary/20">
              <span className="material-symbols-outlined text-xs">mark_email_read</span>
              Automated confirmation email sent to {user?.email}
            </div>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-4">
            {error && <div className="bg-error-container/20 text-error p-3 rounded-xl text-xs">{error}</div>}
            
            {/* 1. Stylist Selector */}
            <div>
              <label className="block font-label-caps text-xs text-secondary mb-1.5">Select Senior Stylist</label>
              <div className="grid grid-cols-3 gap-2">
                {STYLISTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStylistId(s.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      stylistId === s.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                        : 'border-outline/10 hover:border-outline/30 bg-surface-container-lowest'
                    }`}
                  >
                    <p className="font-bold text-xs text-on-surface">{s.name}</p>
                    <p className="text-[10px] text-secondary">{s.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Interactive Weekly Date Selector Ribbon */}
            <div>
              <label className="block font-label-caps text-xs text-secondary mb-1.5">Select Preferred Date</label>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {upcomingDays.map((day) => {
                  const isSelected = selectedDate === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`flex-1 min-w-[62px] p-2 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? 'border-primary bg-primary text-on-primary shadow-md scale-105'
                          : 'border-outline/10 bg-surface-container-lowest hover:border-outline/30 text-on-surface'
                      }`}
                    >
                      <span className={`block text-[10px] uppercase font-bold ${isSelected ? 'text-on-primary/80' : 'text-secondary'}`}>
                        {day.dayName}
                      </span>
                      <span className="block text-base font-extrabold my-0.5">{day.dayNum}</span>
                      <span className={`block text-[9px] ${isSelected ? 'text-on-primary/80' : 'text-secondary'}`}>
                        {day.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Real-Time Time Slots Availability Grid */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-label-caps text-xs text-secondary">Available Time Slots</label>
                {checkingSlots && (
                  <span className="text-[10px] text-primary flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-primary" /> Checking live grid...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.includes(slot);
                  const isSelected = selectedTime === slot;

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isBooked}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border ${
                        isBooked
                          ? 'bg-surface-container-low text-secondary/40 border-outline/5 line-through cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary text-on-primary border-primary shadow-sm ring-2 ring-primary/20'
                          : 'bg-surface-container-lowest text-on-surface border-outline/15 hover:border-primary/50'
                      }`}
                    >
                      {slot}
                      {isBooked && <span className="block text-[8px] font-sans font-normal opacity-60">Booked</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Promo Code & Gift Card Redemption */}
            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-label-caps text-secondary">Promo Code or Gift Card</span>
                {appliedDiscount && (
                  <button
                    type="button"
                    onClick={() => { setAppliedDiscount(null); setPromoCode(''); }}
                    className="text-[10px] text-error hover:underline"
                  >
                    Remove Code
                  </button>
                )}
              </div>

              {appliedDiscount ? (
                <div className="flex justify-between items-center bg-primary/10 p-2 rounded-xl border border-primary/20 text-xs">
                  <div>
                    <span className="font-bold text-primary">{appliedDiscount.code}</span>
                    <p className="text-[10px] text-secondary">{appliedDiscount.description}</p>
                  </div>
                  <span className="font-mono font-bold text-primary">- UGX {appliedDiscount.amount.toLocaleString()}</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="e.g. BABYJAT20 or GIFT-CARD-CODE"
                    className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-xl px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-label-caps rounded-xl transition-colors"
                  >
                    Apply
                  </button>
                </div>
              )}
              {promoError && <p className="text-[10px] text-error mt-1">{promoError}</p>}
            </div>

            {/* Price Breakdown Summary */}
            <div className="pt-2 border-t border-outline/10 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-label-caps text-secondary block">Total Payment</span>
                {appliedDiscount && (
                  <span className="text-[11px] text-secondary line-through">UGX {price.toLocaleString()}</span>
                )}
              </div>
              <span className="font-headline-md text-xl font-bold text-primary">
                UGX {finalPrice.toLocaleString()}
              </span>
            </div>

            <button 
              type="submit" 
              disabled={loading || !selectedTime}
              className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-label-caps text-xs hover:opacity-90 disabled:opacity-50 transition-opacity flex justify-center items-center shadow-lg"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
              ) : (
                `Confirm Appointment for UGX ${finalPrice.toLocaleString()}`
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
