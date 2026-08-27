import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, orderBy, serverTimestamp, setDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ConsultationChatModal } from '../../components/ConsultationChatModal';
import { AutomatedRemindersManager } from '../../components/admin/AutomatedRemindersManager';

interface Appointment {
  id: string;
  clientId: string;
  stylistId: string;
  serviceName: string;
  date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
}

interface WaitlistEntry {
  id: string;
  clientName: string;
  requestedDate: string;
  notes: string;
  status: 'waiting' | 'fulfilled' | 'cancelled';
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'reminders' | 'waitlist'>('calendar');
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [newWaitlist, setNewWaitlist] = useState({ clientName: '', requestedDate: '', notes: '' });
  const [activeChatApt, setActiveChatApt] = useState<Appointment | null>(null);

  useEffect(() => {
    const unsubApts = onSnapshot(query(collection(db, 'appointments'), orderBy('date', 'desc')), (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    }, (err) => console.warn("Appointments snapshot ended:", err));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersMap: Record<string, any> = {};
      snapshot.forEach(doc => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);
      setLoading(false);
    }, (err) => console.warn("Users snapshot ended:", err));

    const unsubWait = onSnapshot(query(collection(db, 'waitlist'), orderBy('createdAt', 'desc')), (snapshot) => {
      setWaitlist(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WaitlistEntry)));
    }, (err) => console.warn("Waitlist snapshot ended:", err));

    return () => { unsubApts(); unsubUsers(); unsubWait(); };
  }, []);

  const handleStatusChange = async (id: string, newStatus: Appointment['status']) => {
    try {
      const aptObj = appointments.find(a => a.id === id);
      await updateDoc(doc(db, 'appointments', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      // Smart Waitlist Auto-Trigger on Cancellation
      if (newStatus === 'cancelled' && aptObj) {
        const waitlistSnap = await getDocs(query(collection(db, 'waitlist'), where('status', '==', 'waiting')));
        for (const waitDoc of waitlistSnap.docs) {
          const wData = waitDoc.data();
          const reminderId = Math.random().toString(36).substring(2, 15);
          await setDoc(doc(db, 'reminders', reminderId), {
            clientName: wData.clientName || 'Waitlisted Client',
            clientContact: wData.clientName + ' (Waitlist)',
            serviceName: aptObj.serviceName,
            appointmentTime: `${aptObj.date} - Slot Opened via Cancellation`,
            status: 'sent',
            type: 'waitlist_notification',
            timestamp: serverTimestamp()
          });
        }
        if (!waitlistSnap.empty) {
          alert(`Appointment marked cancelled. Automatically dispatched notifications to ${waitlistSnap.size} waitlisted client(s)!`);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Failed to update status');
    }
  };

  const handleWaitlistStatus = async (id: string, newStatus: WaitlistEntry['status']) => {
    try {
      await updateDoc(doc(db, 'waitlist', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error(error);
      alert('Failed to update waitlist status');
    }
  };

  const handleAddWaitlist = async () => {
    if (!newWaitlist.clientName || !newWaitlist.requestedDate) {
      return alert('Name and requested date are required.');
    }
    const id = Math.random().toString(36).substring(2, 15);
    await setDoc(doc(db, 'waitlist', id), {
      clientId: 'walk-in-or-admin',
      clientName: newWaitlist.clientName,
      requestedDate: newWaitlist.requestedDate,
      notes: newWaitlist.notes,
      status: 'waiting',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    setShowWaitlistModal(false);
    setNewWaitlist({ clientName: '', requestedDate: '', notes: '' });
  };

  const getStatusColor = (status: Appointment['status'] | WaitlistEntry['status']) => {
    switch(status) {
      case 'pending':
      case 'waiting': return 'bg-tertiary-container/20 border-tertiary text-tertiary';
      case 'confirmed': return 'bg-primary-container/20 border-primary text-primary';
      case 'completed':
      case 'fulfilled': return 'bg-secondary-container/20 border-secondary text-secondary';
      case 'cancelled': return 'bg-error-container/20 border-error text-error';
      default: return 'bg-surface-variant border-outline';
    }
  };

  const getStylistName = (stylistId: string) => {
    if (stylistId === 'any') return 'Any Available Stylist';
    return users[stylistId]?.displayName || 'Unknown Stylist';
  };

  return (
    <div className="p-margin-mobile md:p-margin-desktop max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-surface">Scheduling & Waitlist</h2>
          <p className="font-body-md text-sm text-secondary mt-1">Manage all upcoming sessions and client waitlists</p>
        </div>
      </div>

      <div className="flex gap-4 mb-6 border-b border-outline/10 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('calendar')}
          className={`pb-2 px-2 font-label-caps text-sm border-b-2 transition-colors shrink-0 ${activeTab === 'calendar' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'}`}
        >
          Appointments
        </button>
        <button 
          onClick={() => setActiveTab('reminders')}
          className={`pb-2 px-2 font-label-caps text-sm border-b-2 transition-colors flex items-center gap-2 shrink-0 ${activeTab === 'reminders' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'}`}
        >
          <span className="material-symbols-outlined text-sm">notifications_active</span>
          Automated Reminders (SMS &amp; WhatsApp)
        </button>
        <button 
          onClick={() => setActiveTab('waitlist')}
          className={`pb-2 px-2 font-label-caps text-sm border-b-2 transition-colors flex items-center gap-2 shrink-0 ${activeTab === 'waitlist' ? 'border-primary text-primary font-bold' : 'border-transparent text-secondary hover:text-on-surface'}`}
        >
          Waitlist
          {waitlist.filter(w => w.status === 'waiting').length > 0 && (
            <span className="bg-primary text-on-primary text-[10px] px-1.5 py-0.5 rounded-full">
              {waitlist.filter(w => w.status === 'waiting').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'reminders' && (
        <AutomatedRemindersManager appointments={appointments} usersMap={users} />
      )}

      {activeTab === 'calendar' && (
        <div className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5">
          {loading ? (
            <div className="text-center py-10 text-secondary">Loading appointments...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-10 text-secondary border border-dashed border-outline/20 rounded-xl">
              No appointments found.
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map(apt => (
                <div key={apt.id} className={`p-4 rounded-xl border-l-4 ${getStatusColor(apt.status)} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-surface-container-lowest`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label-caps text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface">
                        {apt.status}
                      </span>
                      <span className="font-label-caps text-xs text-on-surface-variant">
                        {new Date(apt.date).toLocaleString()}
                      </span>
                    </div>
                    <h4 className="font-headline-md text-lg text-on-surface">{apt.serviceName}</h4>
                    <p className="font-body-md text-sm text-secondary">
                      Stylist: {getStylistName(apt.stylistId)} • Client ID: {apt.clientId.slice(0,6)}...
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveChatApt(apt)}
                      className="bg-surface border border-primary/40 text-primary px-3 py-2 rounded-lg font-label-caps text-[10px] hover:bg-primary-container/20 transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">chat</span>
                      Chat & Formula
                    </button>
                    {apt.status === 'pending' && (
                      <button onClick={() => handleStatusChange(apt.id, 'confirmed')} className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-[10px] hover:opacity-90">Confirm</button>
                    )}
                    {apt.status === 'confirmed' && (
                      <button onClick={() => handleStatusChange(apt.id, 'completed')} className="bg-tertiary text-on-tertiary px-4 py-2 rounded-lg font-label-caps text-[10px] hover:opacity-90">Complete</button>
                    )}
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <button onClick={() => handleStatusChange(apt.id, 'cancelled')} className="bg-error text-on-error px-4 py-2 rounded-lg font-label-caps text-[10px] hover:opacity-90">Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-outline/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline-md">Current Waitlist</h3>
            <button onClick={() => setShowWaitlistModal(true)} className="bg-surface-variant text-on-surface px-4 py-2 rounded-lg text-xs font-label-caps hover:bg-surface-container-high">
              + Add to Waitlist
            </button>
          </div>

          <div className="space-y-4">
            {waitlist.length === 0 ? (
              <div className="text-center py-10 text-secondary border border-dashed border-outline/20 rounded-xl">
                The waitlist is currently empty.
              </div>
            ) : (
              waitlist.map(w => (
                <div key={w.id} className={`p-4 rounded-xl border-l-4 ${getStatusColor(w.status)} flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm bg-surface-container-lowest`}>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-label-caps text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-surface">
                        {w.status}
                      </span>
                    </div>
                    <h4 className="font-headline-md text-lg text-on-surface">{w.clientName}</h4>
                    <p className="font-body-md text-sm text-secondary">
                      Requested: {w.requestedDate}
                    </p>
                    {w.notes && <p className="text-xs text-secondary italic mt-1">"{w.notes}"</p>}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {w.status === 'waiting' && (
                      <>
                        <button onClick={() => handleWaitlistStatus(w.id, 'fulfilled')} className="bg-primary text-on-primary px-3 py-1.5 rounded text-xs">Slot Filled</button>
                        <button onClick={() => handleWaitlistStatus(w.id, 'cancelled')} className="bg-surface-variant text-on-surface px-3 py-1.5 rounded text-xs">Remove</button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {showWaitlistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-headline-md mb-4">Add to Waitlist</h3>
            <div className="space-y-3">
              <input 
                placeholder="Client Name"
                value={newWaitlist.clientName}
                onChange={e => setNewWaitlist({...newWaitlist, clientName: e.target.value})}
                className="w-full p-2 border border-outline/20 rounded text-sm bg-surface"
              />
              <input 
                placeholder="Requested Date/Time"
                value={newWaitlist.requestedDate}
                onChange={e => setNewWaitlist({...newWaitlist, requestedDate: e.target.value})}
                className="w-full p-2 border border-outline/20 rounded text-sm bg-surface"
              />
              <textarea 
                placeholder="Notes (preferred stylist, flexibility)"
                value={newWaitlist.notes}
                onChange={e => setNewWaitlist({...newWaitlist, notes: e.target.value})}
                className="w-full p-2 border border-outline/20 rounded text-sm bg-surface h-20 resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowWaitlistModal(false)} className="px-4 py-2 text-secondary text-sm">Cancel</button>
              <button onClick={handleAddWaitlist} className="px-4 py-2 bg-primary text-on-primary rounded text-sm">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Consultation Chat & Private Formula Modal */}
      {activeChatApt && (
        <ConsultationChatModal
          appointmentId={activeChatApt.id}
          clientName={users[activeChatApt.clientId]?.displayName || 'Client'}
          stylistName={activeChatApt.stylistId.replace('stylist_', '')}
          serviceName={activeChatApt.serviceName}
          date={activeChatApt.date}
          isStylistView={true}
          onClose={() => setActiveChatApt(null)}
        />
      )}
    </div>
  );
}
