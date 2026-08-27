import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';

export default function StylistDashboard() {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!profile?.displayName) return;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const startOfDay = `${todayStr}T00:00:00`;
        const endOfDay = `${todayStr}T23:59:59`;

        const STYLIST_MAP: Record<string, string> = {
          'Elena': 'stylist_elena',
          'Marcus': 'stylist_marcus',
          'Sofia': 'stylist_sofia'
        };

        // Fetch bookings where stylist assigned is this user
        const stylistId = STYLIST_MAP[profile.displayName.split(' ')[0]] || 'stylist_elena'; // Fallback
        
        const q = query(
          collection(db, 'appointments'),
          where('stylistId', '==', stylistId),
          where('date', '>=', startOfDay),
          where('date', '<=', endOfDay)
        );
        const snapshot = await getDocs(q);
        const todayBookings = snapshot.docs
          .map(doc => {
            const data = doc.data();
            let timeSlot = 'Any Time';
            if (data.date && data.date.includes('T')) {
              timeSlot = data.date.split('T')[1].substring(0, 5);
            }
            return { id: doc.id, timeSlot, ...data };
          });
          
        setAppointments(todayBookings);
      } catch (error) {
        console.error("Error fetching stylist schedule:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [profile]);

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h2 className="text-3xl font-headline-md italic tracking-tight text-on-surface">Welcome back, {profile?.displayName?.split(' ')[0]}</h2>
        <p className="text-secondary font-body-md mt-1">Here is your schedule and summary for today.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline/10 flex flex-col justify-center">
          <span className="material-symbols-outlined text-primary mb-2 text-3xl">event_available</span>
          <p className="text-sm font-label-caps text-on-surface-variant uppercase">Today's Appointments</p>
          <p className="text-4xl font-bold font-headline-md mt-1">{appointments.length}</p>
        </div>
        <div className="bg-surface-container-low p-6 rounded-2xl border border-outline/10 flex flex-col justify-center">
          <span className="material-symbols-outlined text-secondary mb-2 text-3xl">payments</span>
          <p className="text-sm font-label-caps text-on-surface-variant uppercase">Est. Commission</p>
          <p className="text-4xl font-bold font-headline-md mt-1">
            UGX {(appointments.reduce((acc, curr) => acc + (curr.price || 0), 0) * 0.3).toLocaleString()}
          </p>
          <p className="text-xs text-secondary mt-1">Based on 30% cut</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-outline/10 bg-surface-container-low flex justify-between items-center">
          <h3 className="font-label-caps font-bold text-on-surface uppercase">Today's Schedule</h3>
          <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold">{new Date().toLocaleDateString()}</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-secondary">Loading your schedule...</div>
        ) : appointments.length === 0 ? (
          <div className="p-12 text-center text-secondary flex flex-col items-center">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50">free_cancellation</span>
            <p>You have no appointments scheduled for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline/10">
            {appointments.map((apt) => (
              <div key={apt.id} className="p-4 hover:bg-surface-container-low/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg">{apt.timeSlot || 'Any Time'}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${apt.status === 'confirmed' ? 'bg-success/20 text-success' : apt.status === 'completed' ? 'bg-secondary/20 text-secondary' : 'bg-warning/20 text-warning'}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="font-bold text-on-surface">{apt.serviceName}</p>
                  <p className="text-sm text-secondary">Client: {apt.clientName || apt.clientEmail}</p>
                  {apt.notes && <p className="text-xs text-on-surface-variant mt-2 p-2 bg-surface rounded-lg italic">"{apt.notes}"</p>}
                </div>
                <div className="text-left md:text-right">
                  <p className="font-bold text-primary">UGX {(apt.price || 0).toLocaleString()}</p>
                  <button className="mt-2 text-xs font-bold text-secondary border border-outline/20 px-4 py-1.5 rounded-full hover:bg-surface transition-colors">
                    Mark Completed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
