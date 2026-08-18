import React, { useState } from 'react';
import { collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceName: string;
  price: number;
}

const STYLISTS = [
  { id: 'stylist_elena', name: 'Elena' },
  { id: 'stylist_marcus', name: 'Marcus' },
  { id: 'stylist_sofia', name: 'Sofia' },
];

export function BookingModal({ isOpen, onClose, serviceName, price }: BookingModalProps) {
  const { user } = useAuth();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [stylistId, setStylistId] = useState(STYLISTS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('You must be logged in to book an appointment.');
      return;
    }
    
    setLoading(true);
    setError(null);

    const appointmentDateTime = `${date}T${time}:00`;

    try {
      // 1. Check for conflicts (Client-side check before write)
      const q = query(
        collection(db, 'appointments'),
        where('stylistId', '==', stylistId),
        where('date', '==', appointmentDateTime),
        where('status', 'in', ['pending', 'confirmed'])
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('This time slot is already booked for the selected stylist.');
      }

      // 2. Create Appointment
      const appointmentData = {
        clientId: user.uid,
        stylistId,
        serviceName,
        date: appointmentDateTime,
        status: 'pending',
        price,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'appointments'), appointmentData);
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setDate('');
        setTime('');
      }, 2000);
      
    } catch (err: any) {
      if (err.message.includes('time slot is already booked')) {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-secondary hover:text-primary transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h2 className="font-headline-md text-2xl text-primary mb-2">Book Appointment</h2>
        <p className="text-secondary mb-6">{serviceName} - UGX {price}</p>

        {success ? (
          <div className="bg-primary-container/20 text-primary p-4 rounded-xl text-center">
            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
            <p className="font-body-md font-bold">Booking Requested!</p>
            <p className="text-sm">We'll see you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleBook} className="space-y-4">
            {error && <div className="bg-error-container/20 text-error p-3 rounded-lg text-sm">{error}</div>}
            
            <div>
              <label className="block font-label-caps text-xs text-secondary mb-1">Stylist</label>
              <select 
                value={stylistId} 
                onChange={(e) => setStylistId(e.target.value)}
                className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                required
              >
                {STYLISTS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-label-caps text-xs text-secondary mb-1">Date</label>
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>

            <div>
              <label className="block font-label-caps text-xs text-secondary mb-1">Time</label>
              <input 
                type="time" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                min="09:00"
                max="18:00"
                className="w-full bg-surface-container-low border border-outline/20 rounded-lg px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-on-primary py-3 rounded-xl font-label-caps mt-4 hover:opacity-90 disabled:opacity-50 transition-opacity flex justify-center items-center"
            >
              {loading ? <span className="w-5 h-5 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin" /> : 'Confirm Booking'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
