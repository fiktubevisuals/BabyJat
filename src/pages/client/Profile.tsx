import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { ConsultationChatModal } from '../../components/ConsultationChatModal';

interface AppointmentData {
  id: string;
  clientId: string;
  stylistId: string;
  serviceName: string;
  date: string;
  status: string;
  price: number;
}

interface OrderData {
  id: string;
  clientId: string;
  items: any[];
  total: number;
  status: string;
  createdAt: any;
}

export default function Profile() {
  const { user, profile, logout, requestPushPermissions } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loadingApts, setLoadingApts] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Reschedule state
  const [selectedRescheduleApt, setSelectedRescheduleApt] = useState<AppointmentData | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00 AM');
  const [rescheduleStylist, setRescheduleStylist] = useState('any');
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);

  // Consultation Chat state
  const [activeChatApt, setActiveChatApt] = useState<AppointmentData | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchAppointments = async () => {
      try {
        const q = query(
          collection(db, 'appointments'), 
          where('clientId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const apts: AppointmentData[] = [];
        querySnapshot.forEach((doc) => {
          apts.push({ id: doc.id, ...doc.data() } as AppointmentData);
        });
        
        apts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setAppointments(apts);
      } catch (error) {
        console.warn("Could not fetch user appointments:", error);
        setAppointments([]);
      } finally {
        setLoadingApts(false);
      }
    };

    const fetchOrders = async () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('clientId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders: OrderData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedOrders.push({ id: doc.id, ...doc.data() } as OrderData);
        });

        // Sort descending by creation date
        fetchedOrders.sort((a, b) => {
          const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return dateB - dateA;
        });

        setOrders(fetchedOrders);
      } catch (error) {
        console.warn("Could not fetch user orders:", error);
        setOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchAppointments();
    fetchOrders();
  }, [user]);

  // Smart Cancellation with Automatic Waitlist Dispatch Trigger
  const handleCancelAppointment = async (apt: AppointmentData) => {
    if (!window.confirm(`Are you sure you want to cancel your ${apt.serviceName} appointment?`)) return;
    
    try {
      const ref = doc(db, 'appointments', apt.id);
      await updateDoc(ref, { 
        status: 'cancelled',
        updatedAt: serverTimestamp() 
      });

      setAppointments(prev => prev.map(a => a.id === apt.id ? { ...a, status: 'cancelled' } : a));

      // Smart Waitlist Trigger
      const waitlistSnap = await getDocs(query(collection(db, 'waitlist'), where('status', '==', 'waiting')));
      let notifiedCount = 0;

      for (const waitDoc of waitlistSnap.docs) {
        const wData = waitDoc.data();
        const reminderId = Math.random().toString(36).substring(2, 15);
        await setDoc(doc(db, 'reminders', reminderId), {
          clientName: wData.clientName || 'Waitlisted Client',
          clientContact: wData.clientName + ' (Waitlist)',
          serviceName: apt.serviceName,
          appointmentTime: `${apt.date} - Slot Opened via Cancellation`,
          status: 'sent',
          type: 'waitlist_notification',
          timestamp: serverTimestamp()
        });
        notifiedCount++;
      }

      if (notifiedCount > 0) {
        alert(`Appointment cancelled. Smart Waitlist Trigger automatically notified ${notifiedCount} waitlisted client(s) about the freed slot!`);
      } else {
        alert('Appointment cancelled successfully.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `appointments/${apt.id}`);
    }
  };

  // Direct 1-Click Confirm from 24h Reminder
  const handleConfirmAppointment = async (aptId: string) => {
    try {
      const ref = doc(db, 'appointments', aptId);
      await updateDoc(ref, {
        status: 'confirmed',
        reminderStatus: 'client_confirmed',
        updatedAt: serverTimestamp()
      });

      setAppointments(prev => prev.map(a => a.id === aptId ? { ...a, status: 'confirmed', reminderStatus: 'client_confirmed' } as any : a));
      alert('✅ Appointment Confirmed! We have locked in your time slot and notified your Master Stylist.');
    } catch (error) {
      console.error(error);
      alert('Failed to confirm appointment');
    }
  };

  // Open Reschedule Modal
  const openRescheduleModal = (apt: AppointmentData) => {
    setSelectedRescheduleApt(apt);
    setRescheduleDate(apt.date.split('T')[0] || new Date().toISOString().split('T')[0]);
    setRescheduleTime('10:00 AM');
    setRescheduleStylist(apt.stylistId || 'any');
  };

  // Submit Reschedule
  const handleSaveReschedule = async () => {
    if (!selectedRescheduleApt || !rescheduleDate) return;
    setRescheduleSubmitting(true);

    try {
      const formattedDate = `${rescheduleDate} ${rescheduleTime}`;
      const ref = doc(db, 'appointments', selectedRescheduleApt.id);
      
      await updateDoc(ref, {
        date: formattedDate,
        stylistId: rescheduleStylist,
        updatedAt: serverTimestamp()
      });

      setAppointments(prev => prev.map(a => a.id === selectedRescheduleApt.id ? {
        ...a,
        date: formattedDate,
        stylistId: rescheduleStylist
      } : a));

      setSelectedRescheduleApt(null);
      alert('Your appointment has been successfully rescheduled!');
    } catch (error) {
      console.error(error);
      alert('Failed to reschedule appointment. Please try again.');
    } finally {
      setRescheduleSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop space-y-stack-lg py-stack-md pt-8">
      {/* Profile Header */}
      <section className="flex flex-col md:flex-row items-center md:items-start gap-stack-md pt-8">
        <div className="w-32 h-32 rounded-full overflow-hidden ambient-glow border-2 border-white bg-surface-variant flex-shrink-0">
          <img className="w-full h-full object-cover" src={user?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuBgwTn_sZ0K09Ti-g1s__HpZVjedmdDdd454oTNGiqFoxffzzzj_jhbDuEffCyzx-fwhGzmAcLrb8y8yMmDBV8R47Slre6DnEOc8rbWlHx9lk7tVOlnaRzEfs9Yj3UusQxTJ275yP5OIspPBVNp_kQYnnmn5KItNJG1N9KW147hJqjiPnFHFdcxMDBwGFC8hBYW7gA-lpveNudBOTIDogB_eaVQFhG8b-7hFb-OT4r2SNkPJQ9KORNN8w"} alt={profile?.displayName || "Profile Image"} />
        </div>
        <div className="text-center md:text-left flex-1">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-2">{profile?.displayName || 'Welcome'}</h1>
          <p className="font-body-md text-body-md text-secondary mb-4">{profile?.email || user?.email} <span className="mx-2">•</span> {profile?.phone || 'No phone number'}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-4">
            <button className="bg-primary text-on-primary px-6 py-3 rounded-DEFAULT font-label-caps text-label-caps hover:bg-primary-container transition-colors">Edit Profile</button>
            <button className="bg-transparent border border-on-background text-on-background px-6 py-3 rounded-DEFAULT font-label-caps text-label-caps hover:border-tertiary-container hover:text-tertiary-container transition-colors">Payment Methods</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-stack-lg">
          {/* Upcoming Appointments */}
          <section>
            <div className="flex justify-between items-end mb-6 border-b-[0.5px] border-on-background/20 pb-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">Your Appointments</h2>
              <a href="#" className="font-label-caps text-label-caps text-primary hover:underline uppercase">View All</a>
            </div>
            
            <div className="space-y-4">
              {loadingApts ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="glass-panel rounded-xl p-8 text-center">
                  <p className="text-secondary font-body-md">You have no upcoming appointments.</p>
                  <button onClick={() => navigate('/services')} className="mt-4 text-primary font-label-caps hover:underline">Book a Service</button>
                </div>
              ) : (
                appointments.map(apt => (
                  <div key={apt.id} className="glass-panel rounded-xl p-6 ambient-glow flex flex-col gap-4 border border-outline/10">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-2.5 py-1 rounded-full font-label-caps text-[10px] uppercase font-bold ${
                            apt.status === 'confirmed' ? 'bg-primary-container text-on-primary-container' :
                            apt.status === 'pending' ? 'bg-secondary-container text-on-secondary-container' :
                            apt.status === 'completed' ? 'bg-tertiary-container text-on-tertiary-container' :
                            'bg-error-container text-on-error-container'
                          }`}>
                            {apt.status}
                          </span>
                          <span className="font-label-caps text-label-caps text-secondary uppercase">
                            {new Date(apt.date).toLocaleString()}
                          </span>
                        </div>

                        <h3 className="font-headline-md text-[20px] leading-tight mb-1">{apt.serviceName}</h3>
                        <p className="font-body-md text-body-md text-secondary">
                          Stylist: {apt.stylistId.replace('stylist_', '')} • UGX {apt.price}
                        </p>
                      </div>

                      {(apt.status === 'pending' || apt.status === 'confirmed') && (
                        <div className="flex flex-wrap md:flex-col gap-2 w-full md:w-auto mt-2 md:mt-0">
                          {apt.status === 'pending' && (
                            <button
                              onClick={() => handleConfirmAppointment(apt.id)}
                              className="flex-1 md:flex-none bg-emerald-600 text-white px-3 py-2 font-label-caps text-[10px] hover:bg-emerald-700 transition-colors rounded-DEFAULT flex items-center justify-center gap-1 shadow-sm font-bold"
                            >
                              <span className="material-symbols-outlined text-xs">check_circle</span>
                              1-Click Confirm
                            </button>
                          )}
                          <button
                            onClick={() => setActiveChatApt(apt)}
                            className="flex-1 md:flex-none bg-surface-container border border-primary/30 text-primary px-3 py-2 font-label-caps text-[10px] hover:bg-primary-container/20 transition-colors rounded-DEFAULT flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">chat</span>
                            Chat with Stylist
                          </button>
                          <button
                            onClick={() => openRescheduleModal(apt)}
                            className="flex-1 md:flex-none bg-primary text-on-primary px-3 py-2 font-label-caps text-[10px] hover:bg-primary-container transition-colors rounded-DEFAULT flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">edit_calendar</span>
                            Reschedule
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(apt)}
                            className="flex-1 md:flex-none bg-transparent text-error border border-error px-3 py-2 font-label-caps text-[10px] hover:bg-error-container transition-colors rounded-DEFAULT"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 24-Hour Automated SMS & WhatsApp Reminder Banner */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600 text-base">chat_bubble</span>
                        <div>
                          <span className="font-label-caps text-[10px] uppercase font-bold text-emerald-700 block">Automated 24h SMS &amp; WhatsApp Reminder Active</span>
                          <span className="text-secondary text-[11px]">Direct 1-click Confirm or Reschedule link dispatched 24 hours prior to session.</span>
                        </div>
                      </div>
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`[BabyJat Reminder] Hi, my appointment for ${apt.serviceName} is scheduled for ${new Date(apt.date).toLocaleString()}.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 font-label-caps text-[10px] font-bold uppercase underline shrink-0"
                      >
                        Open WhatsApp Preview
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Reschedule Modal */}
          {selectedRescheduleApt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md p-6 border border-outline/20 animate-scale-in">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline/10">
                  <div>
                    <h3 className="font-headline-md text-lg">Reschedule Appointment</h3>
                    <p className="text-xs text-secondary">{selectedRescheduleApt.serviceName}</p>
                  </div>
                  <button onClick={() => setSelectedRescheduleApt(null)} className="p-1.5 hover:bg-surface-variant rounded-full text-secondary">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="bg-primary-container/20 p-3 rounded-xl border border-primary/20 text-xs text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined text-base">info</span>
                    <span>Self-service reschedule available up to 24h prior.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">New Date</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full p-2.5 bg-surface-container border border-outline/20 rounded-xl font-body-md focus:outline-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">Preferred Time Slot</label>
                    <select
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full p-2.5 bg-surface-container border border-outline/20 rounded-xl font-body-md focus:outline-primary"
                    >
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:30 PM">05:30 PM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-label-caps text-secondary mb-1">Preferred Stylist</label>
                    <select
                      value={rescheduleStylist}
                      onChange={(e) => setRescheduleStylist(e.target.value)}
                      className="w-full p-2.5 bg-surface-container border border-outline/20 rounded-xl font-body-md focus:outline-primary"
                    >
                      <option value="any">Any Available Stylist</option>
                      <option value="Elena Rostova">Elena Rostova (Master Stylist)</option>
                      <option value="Marcus Vance">Marcus Vance (Color Specialist)</option>
                      <option value="Sofia Chen">Sofia Chen (Hair & Treatment)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-outline/10">
                  <button
                    onClick={() => setSelectedRescheduleApt(null)}
                    className="px-4 py-2 text-xs font-label-caps text-secondary hover:text-on-surface"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveReschedule}
                    disabled={rescheduleSubmitting}
                    className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-label-caps hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {rescheduleSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Consultation Chat Modal */}
          {activeChatApt && (
            <ConsultationChatModal
              appointmentId={activeChatApt.id}
              clientName={profile?.displayName || user?.displayName || 'Client'}
              stylistName={activeChatApt.stylistId.replace('stylist_', '')}
              serviceName={activeChatApt.serviceName}
              date={activeChatApt.date}
              isStylistView={false}
              onClose={() => setActiveChatApt(null)}
            />
          )}
          <section>
            <div className="flex justify-between items-end mb-6 border-b-[0.5px] border-on-background/20 pb-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">Recent Orders</h2>
              <a href="#" className="font-label-caps text-label-caps text-primary hover:underline uppercase">Shop History</a>
            </div>
            
            {loadingOrders ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="glass-panel rounded-xl p-8 text-center">
                <p className="text-secondary font-body-md">You haven't placed any orders yet.</p>
                <button onClick={() => navigate('/shop')} className="mt-4 text-primary font-label-caps hover:underline">Shop Accessories</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {orders.map(order => (
                  <div key={order.id} className="bg-surface-bright p-4 rounded-xl flex gap-4 hover:ambient-glow transition-shadow border border-transparent hover:border-surface-variant flex-col sm:flex-row">
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-label-caps text-[10px] text-secondary">Order ID: {order.id.slice(0, 6)}</span>
                        <span className={`px-2 py-0.5 rounded-sm font-label-caps text-[8px] uppercase ${
                          order.status === 'pending' ? 'bg-secondary-container text-on-secondary-container' : 'bg-primary-container text-on-primary-container'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <h4 className="font-body-md font-semibold text-on-surface truncate">{order.items.length} Item(s)</h4>
                      <p className="font-body-md text-sm text-secondary mb-2">UGX {order.total.toFixed(2)}</p>
                      
                      <div className="text-xs text-on-surface-variant mb-2">
                        {order.items.slice(0,2).map((item, i) => (
                          <div key={i} className="truncate">• {item.quantity}x {item.name}</div>
                        ))}
                        {order.items.length > 2 && <div className="text-secondary italic">+{order.items.length - 2} more</div>}
                      </div>

                      <button onClick={() => navigate('/shop')} className="self-start text-primary font-label-caps text-[10px] hover:underline uppercase flex items-center gap-1 mt-auto">
                        Buy Again <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar / Settings Quick Links */}
        <div className="space-y-6">
          <div className="glass-panel rounded-xl p-6 ambient-glow">
            <h3 className="font-headline-md text-xl mb-6 border-b-[0.5px] border-on-background/20 pb-2">Account Settings</h3>
            <ul className="space-y-1">
              <li>
                <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-primary-fixed/10 group transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">person_outline</span>
                    <span className="font-body-md text-on-surface group-hover:text-primary transition-colors">Personal Information</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-sm">chevron_right</span>
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-primary-fixed/10 group transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">credit_card</span>
                    <span className="font-body-md text-on-surface group-hover:text-primary transition-colors">Billing & Payments</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-sm">chevron_right</span>
                </a>
              </li>
              <li>
                <button 
                  onClick={async (e) => {
                    e.preventDefault();
                    if ('Notification' in window) {
                      await requestPushPermissions();
                      alert('Push notifications enabled!');
                    } else {
                      alert('Your browser does not support push notifications.');
                    }
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-primary-fixed/10 group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">notifications_active</span>
                    <div className="text-left">
                      <span className="block font-body-md text-on-surface group-hover:text-primary transition-colors">Enable Notifications</span>
                      <span className="block text-[10px] text-secondary">Get booking updates & promos</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-sm">chevron_right</span>
                </button>
              </li>
              <li>
                <a href="#" className="flex items-center justify-between p-3 rounded-lg hover:bg-primary-fixed/10 group transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">favorite_border</span>
                    <span className="font-body-md text-on-surface group-hover:text-primary transition-colors">Saved Styles</span>
                  </div>
                  <span className="material-symbols-outlined text-secondary text-sm">chevron_right</span>
                </a>
              </li>
            </ul>
            <div className="mt-6 pt-4 border-t-[0.5px] border-on-background/10">
              <button onClick={handleSignOut} className="w-full flex items-center justify-center gap-2 text-error font-label-caps text-label-caps p-3 hover:bg-error-container rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[18px]">logout</span> Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
