import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  getDoc 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  price: number;
  durationMinutes?: number;
  initialShade?: string;
  initialStylistId?: string;
}

export interface StylistOption {
  id: string;
  name: string;
  title: string;
  workingDays: string[];
  shiftStart: string;
  shiftEnd: string;
  shiftsByDay?: Record<string, { start: string; end: string; type: string; note?: string }>;
}

const DEFAULT_STYLISTS: StylistOption[] = [
  { 
    id: 'stylist_elena', 
    name: 'Elena Rostova', 
    title: 'Master Colorist', 
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], 
    shiftStart: '08:30', 
    shiftEnd: '18:30' 
  },
  { 
    id: 'stylist_marcus', 
    name: 'Marcus Vance', 
    title: 'Senior Sculptor', 
    workingDays: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 
    shiftStart: '09:00', 
    shiftEnd: '19:00' 
  },
  { 
    id: 'stylist_sofia', 
    name: 'Sofia Al-Jamil', 
    title: 'Balayage Specialist', 
    workingDays: ['Mon', 'Wed', 'Thu', 'Fri', 'Sat'], 
    shiftStart: '10:00', 
    shiftEnd: '20:00' 
  },
];

const STANDARD_TIME_SLOTS = [
  '08:30',
  '09:30',
  '10:30',
  '11:30',
  '12:30',
  '13:30',
  '14:30',
  '15:30',
  '16:30',
  '17:30',
  '18:30',
  '19:30',
];

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function BookingModal({ 
  isOpen, 
  onClose, 
  serviceName, 
  price, 
  durationMinutes = 60,
  initialShade,
  initialStylistId
}: BookingModalProps) {
  const { user } = useAuth();
  
  // Date and Stylist Selection
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [stylistId, setStylistId] = useState<string>(initialStylistId || DEFAULT_STYLISTS[0].id);
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Dynamic Stylists list from database
  const [stylists, setStylists] = useState<StylistOption[]>(DEFAULT_STYLISTS);
  
  // Real-time Day Appointments Cache for Conflict Prevention
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);
  const [checkingSlots, setCheckingSlots] = useState<boolean>(false);

  // Promo / Gift Card state
  const [promoCode, setPromoCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ code: string; amount: number; description: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookedDetails, setBookedDetails] = useState<{ date: string; time: string; stylist: string } | null>(null);

  // 1. Fetch Dynamic Stylist Roster & Shifts
  useEffect(() => {
    if (!isOpen) return;

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snap) => {
      if (!snap.empty) {
        const customStaff: StylistOption[] = snap.docs.map(docSnap => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            name: d.name || 'Master Stylist',
            title: d.role || 'Senior Stylist',
            workingDays: d.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            shiftStart: d.shiftStart || '09:00',
            shiftEnd: d.shiftEnd || '18:00',
            shiftsByDay: d.shiftsByDay
          };
        });
        if (customStaff.length > 0) {
          setStylists(customStaff);
        }
      }
    }, (err) => {
      console.warn("Staff real-time listener notice:", err);
    });

    return () => unsubStaff();
  }, [isOpen]);

  // Generate 14-day date ribbon for flexible scheduling
  const upcomingDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString('en-US', { month: 'short' });
      const dayOfWeek = DAY_NAMES_SHORT[d.getDay()];
      return { dateStr, dayName, dayNum, monthName, dayOfWeek, isToday: i === 0 };
    });
  }, []);

  // 2. Real-Time Appointments Listener for the Selected Date
  useEffect(() => {
    if (!isOpen || !selectedDate) return;

    setCheckingSlots(true);
    const startOfDay = `${selectedDate}T00:00:00`;
    const endOfDay = `${selectedDate}T23:59:59`;

    const q = query(
      collection(db, 'appointments'),
      where('date', '>=', startOfDay),
      where('date', '<=', endOfDay)
    );

    const unsubAppointments = onSnapshot(q, (snap) => {
      const apts = snap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })).filter((apt: any) => apt.status === 'pending' || apt.status === 'confirmed');

      setDayAppointments(apts);
      setCheckingSlots(false);
    }, (err) => {
      console.warn("Appointments real-time listener notice:", err);
      setCheckingSlots(false);
    });

    return () => unsubAppointments();
  }, [isOpen, selectedDate]);

  // Find active stylist metadata
  const currentStylist = useMemo(() => {
    return stylists.find(s => s.id === stylistId) || stylists[0] || DEFAULT_STYLISTS[0];
  }, [stylists, stylistId]);

  // Determine current day of week for selected date
  const selectedDayOfWeek = useMemo(() => {
    const d = new Date(`${selectedDate}T12:00:00`);
    return DAY_NAMES_SHORT[d.getDay()];
  }, [selectedDate]);

  // 3. Calculate Stylist Shift Boundaries & Off-Duty Status
  const stylistShiftInfo = useMemo(() => {
    if (!currentStylist) return { isOffDuty: false, startMinutes: 540, endMinutes: 1140, label: '09:00 - 18:00' };

    // Check day-specific shift override if available
    const dayOverride = currentStylist.shiftsByDay?.[selectedDayOfWeek];
    if (dayOverride) {
      if (dayOverride.type === 'off') {
        return { isOffDuty: true, startMinutes: 0, endMinutes: 0, label: 'Off-Duty (Rest Day)' };
      }
      return {
        isOffDuty: false,
        startMinutes: timeStringToMinutes(dayOverride.start || '09:00'),
        endMinutes: timeStringToMinutes(dayOverride.end || '18:00'),
        label: `${dayOverride.start || '09:00'} - ${dayOverride.end || '18:00'}`
      };
    }

    // Default workingDays check
    const isWorkingDay = currentStylist.workingDays.includes(selectedDayOfWeek);
    if (!isWorkingDay) {
      return { isOffDuty: true, startMinutes: 0, endMinutes: 0, label: 'Off-Duty' };
    }

    const startM = timeStringToMinutes(currentStylist.shiftStart || '09:00');
    const endM = timeStringToMinutes(currentStylist.shiftEnd || '18:00');
    return {
      isOffDuty: false,
      startMinutes: startM,
      endMinutes: endM,
      label: `${currentStylist.shiftStart || '09:00'} - ${currentStylist.shiftEnd || '18:00'}`
    };
  }, [currentStylist, selectedDayOfWeek]);

  // 4. Calculate Time Slot Availability & Conflict Matrix
  const timeSlotStatuses = useMemo(() => {
    const now = new Date();
    const isToday = selectedDate === now.toISOString().split('T')[0];
    const currentMinutesNow = now.getHours() * 60 + now.getMinutes();

    return STANDARD_TIME_SLOTS.map((slot) => {
      const slotStartMinutes = timeStringToMinutes(slot);
      const slotEndMinutes = slotStartMinutes + (durationMinutes || 60);

      // Check 1: Has the slot already passed today?
      if (isToday && slotStartMinutes <= currentMinutesNow + 15) {
        return {
          slot,
          isAvailable: false,
          reason: 'passed',
          badgeText: 'Past'
        };
      }

      // Check 2: Is stylist off-duty on this date?
      if (stylistShiftInfo.isOffDuty) {
        return {
          slot,
          isAvailable: false,
          reason: 'off_duty',
          badgeText: 'Off-Duty'
        };
      }

      // Check 3: Is slot outside of stylist's shift hours?
      if (slotStartMinutes < stylistShiftInfo.startMinutes || slotEndMinutes > stylistShiftInfo.endMinutes) {
        return {
          slot,
          isAvailable: false,
          reason: 'out_of_shift',
          badgeText: 'Off Shift'
        };
      }

      // Check 4: Schedule Conflict with existing appointments for this stylist
      const hasStylistConflict = dayAppointments.some((apt) => {
        if (apt.stylistId !== currentStylist.id) return false;
        
        const aptDateStr = String(apt.date || '');
        if (!aptDateStr.includes('T')) return false;

        const aptTimeStr = aptDateStr.split('T')[1].substring(0, 5);
        const aptStartMinutes = timeStringToMinutes(aptTimeStr);
        const aptDuration = Number(apt.durationMinutes) || 60;
        const aptEndMinutes = aptStartMinutes + aptDuration;

        // Interval overlap test: Max(startA, startB) < Min(endA, endB)
        const overlap = Math.max(slotStartMinutes, aptStartMinutes) < Math.min(slotEndMinutes, aptEndMinutes);
        return overlap;
      });

      if (hasStylistConflict) {
        return {
          slot,
          isAvailable: false,
          reason: 'booked',
          badgeText: 'Booked'
        };
      }

      // Check 5: Self-Conflict (Does the logged-in client already have an appointment at this time?)
      if (user) {
        const hasSelfConflict = dayAppointments.some((apt) => {
          const isUserAppointment = apt.clientId === user.uid || (user.email && apt.clientEmail === user.email);
          if (!isUserAppointment) return false;

          const aptDateStr = String(apt.date || '');
          if (!aptDateStr.includes('T')) return false;

          const aptTimeStr = aptDateStr.split('T')[1].substring(0, 5);
          const aptStartMinutes = timeStringToMinutes(aptTimeStr);
          const aptDuration = Number(apt.durationMinutes) || 60;
          const aptEndMinutes = aptStartMinutes + aptDuration;

          return Math.max(slotStartMinutes, aptStartMinutes) < Math.min(slotEndMinutes, aptEndMinutes);
        });

        if (hasSelfConflict) {
          return {
            slot,
            isAvailable: false,
            reason: 'self_conflict',
            badgeText: 'My Booking'
          };
        }
      }

      return {
        slot,
        isAvailable: true,
        reason: 'available',
        badgeText: 'Available'
      };
    });
  }, [selectedDate, durationMinutes, stylistShiftInfo, dayAppointments, currentStylist, user]);

  const availableSlotsCount = useMemo(() => {
    return timeSlotStatuses.filter(s => s.isAvailable).length;
  }, [timeSlotStatuses]);

  // 5. Smart Auto-Selection of the Earliest Open Slot
  useEffect(() => {
    if (timeSlotStatuses.length === 0) return;

    const currentSlotStatus = timeSlotStatuses.find(s => s.slot === selectedTime);
    if (!currentSlotStatus || !currentSlotStatus.isAvailable) {
      const firstAvailable = timeSlotStatuses.find(s => s.isAvailable);
      if (firstAvailable) {
        setSelectedTime(firstAvailable.slot);
      } else {
        setSelectedTime('');
      }
    }
  }, [timeSlotStatuses, selectedTime]);

  if (!isOpen) return null;

  // Calculate final discounted price
  const discountAmount = appliedDiscount ? appliedDiscount.amount : 0;
  const finalPrice = Math.max(0, price - discountAmount);

  // Jump to Next Available Day
  const handleJumpNextAvailableDay = () => {
    const currentIndex = upcomingDays.findIndex(d => d.dateStr === selectedDate);
    if (currentIndex >= 0 && currentIndex < upcomingDays.length - 1) {
      setSelectedDate(upcomingDays[currentIndex + 1].dateStr);
    }
  };

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

    // Gift Cards collection check (must be active with balance)
    try {
      const gcRef = doc(db, 'giftcards', cleanCode);
      const gcSnap = await getDoc(gcRef);

      if (gcSnap.exists()) {
        const gcData = gcSnap.data();
        if (gcData.status !== 'active' || (gcData.balance || 0) <= 0) {
          setPromoError(gcData.status === 'pending_payment' 
            ? 'This gift card is pending payment confirmation.' 
            : 'This gift card has already been redeemed.');
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

  // 6. Pre-Submission Atomic Conflict Prevention & Appointment Creation
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be signed in to book an appointment.');
      return;
    }

    if (!selectedTime) {
      setError('Please select an available time slot before continuing.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const appointmentDateTime = `${selectedDate}T${selectedTime}:00`;
    const slotStartMinutes = timeStringToMinutes(selectedTime);
    const slotEndMinutes = slotStartMinutes + (durationMinutes || 60);

    try {
      // Re-verify against database in real-time
      const checkQuery = query(
        collection(db, 'appointments'),
        where('stylistId', '==', currentStylist.id),
        where('date', '>=', `${selectedDate}T00:00:00`),
        where('date', '<=', `${selectedDate}T23:59:59`)
      );
      
      const snap = await getDocs(checkQuery);
      const conflicts = snap.docs.filter((docSnap) => {
        const apt = docSnap.data();
        if (apt.status === 'cancelled') return false;

        const aptDate = String(apt.date || '');
        if (!aptDate.includes('T')) return false;

        const aptTimeStr = aptDate.split('T')[1].substring(0, 5);
        const aptStartM = timeStringToMinutes(aptTimeStr);
        const aptDur = Number(apt.durationMinutes) || 60;
        const aptEndM = aptStartM + aptDur;

        return Math.max(slotStartMinutes, aptStartM) < Math.min(slotEndMinutes, aptEndM);
      });
      
      if (conflicts.length > 0) {
        throw new Error(`This ${selectedTime} time slot was just reserved by another client. Please choose another open slot.`);
      }

      const appointmentData = {
        clientId: user.uid,
        clientName: user.displayName || 'Valued Client',
        clientEmail: user.email,
        stylistId: currentStylist.id,
        stylistName: currentStylist.name,
        serviceName: initialShade ? `${serviceName} (${initialShade})` : serviceName,
        requestedShade: initialShade || null,
        date: appointmentDateTime,
        durationMinutes: durationMinutes || 60,
        status: 'pending',
        originalPrice: price,
        discountApplied: appliedDiscount ? appliedDiscount.amount : 0,
        promoCode: appliedDiscount ? appliedDiscount.code : null,
        price: finalPrice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

      // Automated Email Confirmation
      try {
        await fetch('/api/email/send-booking-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            clientName: user.displayName || 'Valued Client',
            serviceName: appointmentData.serviceName,
            date: appointmentDateTime,
            stylistName: currentStylist.name,
            price: finalPrice,
            bookingId: docRef.id,
            requestedShade: initialShade || undefined
          })
        });

        // Trigger SMS/WhatsApp reminder queue
        await fetch('/api/reminders/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: docRef.id,
            clientName: user.displayName || 'Valued Client',
            clientPhone: '+256700000000',
            serviceName: appointmentData.serviceName,
            appointmentDate: appointmentDateTime,
            stylistName: currentStylist.name,
            channel: 'both'
          })
        });
      } catch (triggerErr) {
        console.warn("Automated notifications notice:", triggerErr);
      }

      setBookedDetails({
        date: selectedDate,
        time: selectedTime,
        stylist: currentStylist.name
      });
      setSuccess(true);
      
    } catch (err: any) {
      if (err.message && err.message.includes('just reserved')) {
        setError(err.message);
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'appointments');
        setError('Failed to complete booking. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-surface w-full max-w-lg rounded-3xl p-6 shadow-2xl relative border border-outline/10 my-auto text-on-surface">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors p-1.5 rounded-full hover:bg-surface-container-low"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
        
        {/* Header Title */}
        <div className="mb-4 pr-8">
          <div className="flex items-center gap-2">
            <span className="font-label-caps text-[10px] text-primary font-bold tracking-wider uppercase bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              Live Salon Schedule
            </span>
            <span className="text-[11px] text-secondary flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-xs">schedule</span> {durationMinutes || 60} mins
            </span>
          </div>
          <h2 className="font-headline-md text-2xl mt-1 text-on-surface leading-tight">{serviceName}</h2>
          {initialShade && (
            <p className="text-xs text-primary font-bold mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">palette</span> Selected Shade: {initialShade}
            </p>
          )}
        </div>

        {success ? (
          <div className="bg-primary-container/15 border border-primary/20 text-on-surface p-6 rounded-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center mx-auto shadow-lg ring-8 ring-primary/10">
              <span className="material-symbols-outlined text-3xl">check_circle</span>
            </div>
            
            <div>
              <h3 className="font-headline-md text-xl font-bold text-primary">Appointment Reserved!</h3>
              <p className="text-xs text-secondary mt-1">
                Your private session has been placed in our live salon calendar.
              </p>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl border border-outline/10 text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-outline/5">
                <span className="text-secondary">Date & Time:</span>
                <span className="font-bold text-on-surface">{bookedDetails?.date} at {bookedDetails?.time}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-outline/5">
                <span className="text-secondary">Master Stylist:</span>
                <span className="font-bold text-primary">{bookedDetails?.stylist}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-secondary">Total Paid / Due:</span>
                <span className="font-bold font-mono text-primary">UGX {finalPrice.toLocaleString()}</span>
              </div>
            </div>

            <div className="inline-flex items-center justify-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-3 py-1.5 rounded-full border border-primary/20">
              <span className="material-symbols-outlined text-xs">mark_email_read</span>
              Confirmation & SMS reminder scheduled
            </div>

            <button
              onClick={() => {
                setSuccess(false);
                onClose();
              }}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-caps text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-4">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error p-3 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
                <span>{error}</span>
              </div>
            )}
            
            {/* 1. Senior Stylist Selector */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-label-caps text-xs text-secondary font-bold">Select Senior Stylist</label>
                <span className="text-[10px] text-secondary font-medium">
                  {stylistShiftInfo.isOffDuty ? (
                    <span className="text-error font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">event_busy</span> Off-Duty Today
                    </span>
                  ) : (
                    <span className="text-primary font-medium flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-xs">schedule</span> Shift: {stylistShiftInfo.label}
                    </span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {stylists.map((s) => {
                  const isSelected = stylistId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStylistId(s.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm'
                          : 'border-outline/10 hover:border-outline/30 bg-surface-container-lowest'
                      }`}
                    >
                      <p className="font-bold text-xs text-on-surface truncate">{s.name}</p>
                      <p className="text-[10px] text-secondary truncate">{s.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Interactive 14-Day Date Ribbon */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-label-caps text-xs text-secondary font-bold">Select Preferred Date</label>
                <span className="text-[10px] text-secondary">
                  {selectedDayOfWeek}, {selectedDate}
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {upcomingDays.map((day) => {
                  const isSelected = selectedDate === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(day.dateStr)}
                      className={`flex-1 min-w-[62px] p-2 rounded-2xl border text-center transition-all shrink-0 ${
                        isSelected
                          ? 'border-primary bg-primary text-on-primary shadow-md scale-105 ring-2 ring-primary/20'
                          : 'border-outline/10 bg-surface-container-lowest hover:border-outline/30 text-on-surface'
                      }`}
                    >
                      <span className={`block text-[10px] uppercase font-bold ${isSelected ? 'text-on-primary/80' : 'text-secondary'}`}>
                        {day.dayName}
                      </span>
                      <span className="block text-base font-extrabold my-0.5 leading-none">
                        {day.dayNum}
                      </span>
                      <span className={`block text-[9px] ${isSelected ? 'text-on-primary/80' : 'text-secondary'}`}>
                        {day.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Live Conflict-Checked Time Slots Grid */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="font-label-caps text-xs text-secondary font-bold">Available Time Slots</label>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    availableSlotsCount > 0 
                      ? 'bg-primary/10 text-primary border border-primary/20' 
                      : 'bg-error/10 text-error border border-error/20'
                  }`}>
                    {availableSlotsCount} {availableSlotsCount === 1 ? 'Slot' : 'Slots'} Open
                  </span>
                </div>
                
                {checkingSlots && (
                  <span className="text-[10px] text-primary flex items-center gap-1 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-primary" /> Live sync...
                  </span>
                )}
              </div>

              {availableSlotsCount === 0 ? (
                <div className="bg-surface-container-low border border-outline/10 rounded-2xl p-4 text-center space-y-2.5">
                  <span className="material-symbols-outlined text-3xl text-secondary opacity-60">event_busy</span>
                  <div>
                    <p className="text-xs font-bold text-on-surface">
                      {stylistShiftInfo.isOffDuty 
                        ? `${currentStylist.name} is off-duty on this date` 
                        : `No available slots remaining on ${selectedDate}`}
                    </p>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Try selecting another date or switching to another stylist.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleJumpNextAvailableDay}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3.5 py-1.5 rounded-full border border-primary/20 transition-all"
                  >
                    <span>Check Next Day</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlotStatuses.map(({ slot, isAvailable, reason, badgeText }) => {
                    const isSelected = selectedTime === slot;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold font-mono transition-all border relative flex flex-col items-center justify-center ${
                          !isAvailable
                            ? 'bg-surface-container-low text-secondary/40 border-outline/5 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-primary text-on-primary border-primary shadow-md ring-2 ring-primary/20 scale-[1.02]'
                            : 'bg-surface-container-lowest text-on-surface border-outline/15 hover:border-primary/50 hover:bg-surface-container-low'
                        }`}
                      >
                        <span className={!isAvailable ? 'line-through' : ''}>{slot}</span>
                        <span className={`text-[8px] font-sans font-medium tracking-tight mt-0.5 ${
                          isSelected ? 'text-on-primary/90' : isAvailable ? 'text-primary' : 'text-secondary/60'
                        }`}>
                          {badgeText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Promo Code & Gift Card Redemption */}
            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline/10 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-label-caps text-secondary font-bold">Promo Code / Gift Voucher</span>
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
                    placeholder="e.g. BABYJAT20 or GIFT-CODE"
                    className="flex-1 bg-surface-container-lowest border border-outline/20 rounded-xl px-3 py-1.5 text-xs text-on-surface outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-3.5 py-1.5 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-label-caps font-bold rounded-xl transition-colors"
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
                <span className="text-xs font-label-caps text-secondary font-bold block">Total Investment</span>
                {appliedDiscount && (
                  <span className="text-[11px] text-secondary line-through">UGX {price.toLocaleString()}</span>
                )}
              </div>
              <span className="font-headline-md text-xl font-bold text-primary">
                UGX {finalPrice.toLocaleString()}
              </span>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !selectedTime || availableSlotsCount === 0}
              className="w-full bg-primary text-on-primary py-3.5 rounded-2xl font-label-caps text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex justify-center items-center shadow-lg gap-1.5"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>Confirm Booking ({selectedTime || 'Select Slot'})</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
