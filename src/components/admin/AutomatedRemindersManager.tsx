import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, setDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';

interface Appointment {
  id: string;
  clientId: string;
  stylistId: string;
  serviceName: string;
  date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  price: number;
  clientPhone?: string;
  clientName?: string;
  reminderStatus?: 'none' | 'dispatched_24h' | 'client_confirmed' | 'client_rescheduled';
  lastReminderSentAt?: any;
}

interface ReminderLog {
  id: string;
  appointmentId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  appointmentDate: string;
  channel: 'sms' | 'whatsapp' | 'both';
  smsStatus: string;
  whatsappStatus: string;
  whatsappDeepLink?: string;
  smsMessageText?: string;
  whatsappMessageText?: string;
  sentAt: any;
  clientResponse?: 'pending' | 'confirmed' | 'rescheduled';
}

interface AutomatedRemindersManagerProps {
  appointments: Appointment[];
  usersMap: Record<string, any>;
}

interface CronStats {
  lastRunAt: string | null;
  lastScannedCount: number;
  lastDispatchedCount: number;
  totalDispatchedAllTime: number;
  isRunning: boolean;
  intervalMinutes: number;
}

export function AutomatedRemindersManager({ appointments, usersMap }: AutomatedRemindersManagerProps) {
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [scanning, setScanning] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<'both' | 'whatsapp' | 'sms'>('both');
  const [previewApt, setPreviewApt] = useState<Appointment | null>(null);
  const [sendingSingleId, setSendingSingleId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'due_24h' | 'sent' | 'confirmed'>('due_24h');
  const [cronStats, setCronStats] = useState<CronStats | null>(null);
  const [triggeringCron, setTriggeringCron] = useState(false);

  // Poll server cron stats
  const fetchCronStats = async () => {
    try {
      const res = await fetch('/api/reminders/cron-status');
      if (res.ok) {
        const data = await res.json();
        setCronStats(data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCronStats();
    const interval = setInterval(fetchCronStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Listen to reminders collection in Firestore for real-time logs
  useEffect(() => {
    const q = query(collection(db, 'reminders'), orderBy('sentAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const logs: ReminderLog[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ReminderLog));
      setReminderLogs(logs);
    }, (err) => console.warn("Reminders snapshot ended:", err));

    return () => unsub();
  }, []);

  // Helper to get client info
  const getClientInfo = (clientId: string) => {
    const user = usersMap[clientId];
    return {
      name: user?.displayName || user?.name || 'Valued Client',
      phone: user?.phone || user?.phoneNumber || '+256700000000'
    };
  };

  // Check if appointment is roughly within 24-48 hours
  const isDueWithin24h = (aptDateStr: string) => {
    const aptTime = new Date(aptDateStr).getTime();
    const now = Date.now();
    const diffHours = (aptTime - now) / (1000 * 60 * 60);
    return diffHours >= 0 && diffHours <= 48; // within next 48 hours window for reminders
  };

  // Filtered appointments list
  const filteredAppointments = appointments.filter(apt => {
    if (apt.status === 'cancelled' || apt.status === 'completed') return false;
    if (filter === 'due_24h') return isDueWithin24h(apt.date);
    if (filter === 'sent') return apt.reminderStatus === 'dispatched_24h';
    if (filter === 'confirmed') return apt.reminderStatus === 'client_confirmed' || apt.status === 'confirmed';
    return true;
  });

  // Trigger automated reminder for a single appointment
  const handleSendSingleReminder = async (apt: Appointment) => {
    setSendingSingleId(apt.id);
    const client = getClientInfo(apt.clientId);
    const stylistName = apt.stylistId === 'any' ? 'Master Stylist' : apt.stylistId.replace('stylist_', '');

    try {
      const res = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: apt.id,
          clientName: client.name,
          clientPhone: client.phone,
          serviceName: apt.serviceName,
          appointmentDate: new Date(apt.date).toLocaleString(),
          stylistName,
          channel: selectedChannel
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch reminder');

      const logId = `rem_${Math.random().toString(36).substring(2, 9)}`;
      await setDoc(doc(db, 'reminders', logId), {
        appointmentId: apt.id,
        clientName: client.name,
        clientPhone: client.phone,
        serviceName: apt.serviceName,
        appointmentDate: new Date(apt.date).toLocaleString(),
        channel: selectedChannel,
        smsStatus: data.result?.smsStatus || 'simulated',
        whatsappStatus: data.result?.whatsappStatus || 'simulated',
        whatsappDeepLink: data.result?.whatsappDeepLink || '',
        smsMessageText: data.result?.smsMessageText || '',
        whatsappMessageText: data.result?.whatsappMessageText || '',
        sentAt: serverTimestamp(),
        clientResponse: 'pending'
      });

      // Update appointment reminder status
      await updateDoc(doc(db, 'appointments', apt.id), {
        reminderStatus: 'dispatched_24h',
        lastReminderSentAt: serverTimestamp()
      });

      alert(`✅ 24-Hour Reminder sent via ${selectedChannel.toUpperCase()} to ${client.name} (${client.phone})!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to send reminder: ' + err.message);
    } finally {
      setSendingSingleId(null);
    }
  };

  // Run Batch 24-Hour Scanner
  const handleRunBatchScan = async () => {
    const dueApts = appointments.filter(a => isDueWithin24h(a.date) && a.status !== 'cancelled' && a.status !== 'completed');
    if (dueApts.length === 0) {
      return alert('No upcoming appointments found due for 24-hour reminders within the next 48 hours.');
    }

    setScanning(true);
    try {
      let dispatchedCount = 0;
      for (const apt of dueApts) {
        const client = getClientInfo(apt.clientId);
        const stylistName = apt.stylistId === 'any' ? 'Master Stylist' : apt.stylistId.replace('stylist_', '');

        const res = await fetch('/api/reminders/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appointmentId: apt.id,
            clientName: client.name,
            clientPhone: client.phone,
            serviceName: apt.serviceName,
            appointmentDate: new Date(apt.date).toLocaleString(),
            stylistName,
            channel: 'both'
          })
        });

        const data = await res.json();
        if (res.ok) {
          dispatchedCount++;
          const logId = `rem_${Math.random().toString(36).substring(2, 9)}`;
          await setDoc(doc(db, 'reminders', logId), {
            appointmentId: apt.id,
            clientName: client.name,
            clientPhone: client.phone,
            serviceName: apt.serviceName,
            appointmentDate: new Date(apt.date).toLocaleString(),
            channel: 'both',
            smsStatus: data.result?.smsStatus || 'simulated',
            whatsappStatus: data.result?.whatsappStatus || 'simulated',
            whatsappDeepLink: data.result?.whatsappDeepLink || '',
            smsMessageText: data.result?.smsMessageText || '',
            whatsappMessageText: data.result?.whatsappMessageText || '',
            sentAt: serverTimestamp(),
            clientResponse: 'pending'
          });

          await updateDoc(doc(db, 'appointments', apt.id), {
            reminderStatus: 'dispatched_24h',
            lastReminderSentAt: serverTimestamp()
          });
        }
      }
      alert(`🎉 24-Hour Automated Scan Complete! Dispatched ${dispatchedCount} SMS & WhatsApp reminder notifications.`);
    } catch (err: any) {
      console.error(err);
      alert('Error during batch scan: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  // Trigger Autonomous Background Cron Scan via Server Endpoint
  const handleTriggerServerCron = async () => {
    setTriggeringCron(true);
    try {
      const res = await fetch('/api/reminders/run-cron', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCronStats(data.stats);
        alert(`⚡ Autonomous Cron Triggered! Scanned ${data.scannedCount} appointments, dispatched ${data.dispatchedCount} 24h reminders.`);
      } else {
        throw new Error(data.error || 'Failed to trigger cron');
      }
    } catch (err: any) {
      alert('Cron Trigger Error: ' + err.message);
    } finally {
      setTriggeringCron(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Autonomous Background Worker Status Banner */}
      <div className="glass-panel p-5 rounded-2xl bg-surface-container-low border border-primary/20 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-lg ring-4 ring-emerald-500/10">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-on-surface">Scheduled 24h Cron Worker</span>
              <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                Active • Every {cronStats?.intervalMinutes || 30}m
              </span>
            </div>
            <p className="text-xs text-secondary mt-0.5">
              Last Scan: <strong className="text-on-surface">{cronStats?.lastRunAt ? new Date(cronStats.lastRunAt).toLocaleTimeString() : 'Recently'}</strong> • 
              Scanned: <strong className="text-primary">{cronStats?.lastScannedCount || 0}</strong> • 
              Total Dispatched All-Time: <strong className="text-primary">{cronStats?.totalDispatchedAllTime || reminderLogs.length}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={handleTriggerServerCron}
          disabled={triggeringCron}
          className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-caps text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 shrink-0"
        >
          <span className={`material-symbols-outlined text-sm ${triggeringCron ? 'animate-spin' : ''}`}>
            {triggeringCron ? 'sync' : 'bolt'}
          </span>
          <span>{triggeringCron ? 'Executing Cron...' : 'Run Server Cron Now'}</span>
        </button>
      </div>

      {/* Top Banner Control Bar */}
      <div className="glass-panel p-6 rounded-2xl ambient-glow bg-gradient-to-r from-primary-container/20 via-surface to-secondary-container/20 border border-primary/20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary">chat_bubble</span>
              <span className="font-label-caps text-xs text-primary uppercase font-bold tracking-wider">Automated Messaging Engine</span>
            </div>
            <h3 className="font-headline-md text-xl text-on-surface">SMS &amp; WhatsApp 24h Reminders</h3>
            <p className="font-body-md text-xs text-secondary mt-0.5">
              Automatically dispatch 24-hour pre-appointment reminders with interactive 1-click Confirm and Reschedule buttons.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value as any)}
              className="px-3 py-2 bg-surface border border-outline/20 rounded-xl text-xs font-label-caps focus:outline-primary"
            >
              <option value="both">All Channels (SMS + WhatsApp)</option>
              <option value="whatsapp">WhatsApp Only</option>
              <option value="sms">SMS Only</option>
            </select>

            <button
              onClick={handleRunBatchScan}
              disabled={scanning}
              className="bg-surface-container-high text-on-surface border border-outline/20 px-4 py-2.5 rounded-xl font-label-caps text-xs hover:bg-surface-container-highest transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">{scanning ? 'sync' : 'refresh'}</span>
              {scanning ? 'Scanning & Dispatching...' : 'Scan Active Appointments List'}
            </button>
          </div>
        </div>

        {/* Channel Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-4 border-t border-outline/10">
          <div className="bg-surface/80 p-3 rounded-xl border border-outline/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs">WA</div>
            <div>
              <div className="font-label-caps text-[10px] text-secondary uppercase">WhatsApp Status</div>
              <div className="font-body-md text-xs font-semibold text-on-surface">Auto-Formatted Deep Links</div>
            </div>
          </div>

          <div className="bg-surface/80 p-3 rounded-xl border border-outline/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">SMS</div>
            <div>
              <div className="font-label-caps text-[10px] text-secondary uppercase">SMS Gateway</div>
              <div className="font-body-md text-xs font-semibold text-on-surface">Twilio &amp; Local Carrier Ready</div>
            </div>
          </div>

          <div className="bg-surface/80 p-3 rounded-xl border border-outline/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold text-xs">1-Click</div>
            <div>
              <div className="font-label-caps text-[10px] text-secondary uppercase">Client Response</div>
              <div className="font-body-md text-xs font-semibold text-on-surface">Direct Confirm &amp; Reschedule</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex justify-between items-center border-b border-outline/10 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('due_24h')}
            className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
              filter === 'due_24h' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-variant text-secondary hover:text-on-surface'
            }`}
          >
            Due in 24h-48h ({appointments.filter(a => isDueWithin24h(a.date) && a.status !== 'cancelled' && a.status !== 'completed').length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
              filter === 'all' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-variant text-secondary hover:text-on-surface'
            }`}
          >
            All Active Appointments ({appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed').length})
          </button>
          <button
            onClick={() => setFilter('sent')}
            className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
              filter === 'sent' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-variant text-secondary hover:text-on-surface'
            }`}
          >
            Reminders Sent
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-label-caps transition-colors ${
              filter === 'confirmed' ? 'bg-primary text-on-primary font-bold' : 'bg-surface-variant text-secondary hover:text-on-surface'
            }`}
          >
            Confirmed by Client
          </button>
        </div>
      </div>

      {/* Appointments List with Reminder Actions */}
      <div className="space-y-4">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-secondary glass-panel rounded-xl border border-dashed border-outline/20">
            <span className="material-symbols-outlined text-3xl mb-2 text-outline">notifications_off</span>
            <p className="font-body-md text-sm">No appointments matching filter criteria.</p>
          </div>
        ) : (
          filteredAppointments.map(apt => {
            const client = getClientInfo(apt.clientId);
            const isDue = isDueWithin24h(apt.date);
            const isSending = sendingSingleId === apt.id;
            const waText = `✨ *BABYJAT SALON 24h REMINDER* ✨\nHi ${client.name}, confirming your ${apt.serviceName} session on ${new Date(apt.date).toLocaleString()}. Click to confirm or reschedule!`;
            const waLink = `https://wa.me/${client.phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(waText)}`;

            return (
              <div
                key={apt.id}
                className="glass-panel p-4 md:p-5 rounded-xl border border-outline/10 hover:border-primary/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-label-caps text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary-container/30 text-primary">
                      {new Date(apt.date).toLocaleString()}
                    </span>
                    {isDue && (
                      <span className="font-label-caps text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        ⏰ 24h Window
                      </span>
                    )}
                    {apt.reminderStatus === 'dispatched_24h' && (
                      <span className="font-label-caps text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-700">
                        ✓ Reminder Dispatched
                      </span>
                    )}
                    {(apt.reminderStatus === 'client_confirmed' || apt.status === 'confirmed') && (
                      <span className="font-label-caps text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">
                        ✓ Confirmed by Client
                      </span>
                    )}
                  </div>

                  <h4 className="font-headline-md text-base text-on-surface">{apt.serviceName}</h4>
                  <div className="font-body-md text-xs text-secondary mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>Client: <strong className="text-on-surface">{client.name}</strong></span>
                    <span>• Phone: <strong className="text-on-surface">{client.phone}</strong></span>
                    <span>• Stylist: <strong className="text-on-surface">{apt.stylistId.replace('stylist_', '')}</strong></span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setPreviewApt(apt)}
                    className="bg-surface border border-outline/20 text-on-surface px-3 py-2 rounded-lg font-label-caps text-xs hover:bg-surface-variant transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">visibility</span>
                    Preview
                  </button>

                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-emerald-600 text-white px-3 py-2 rounded-lg font-label-caps text-xs hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xs">chat</span>
                    WhatsApp Link
                  </a>

                  <button
                    onClick={() => handleSendSingleReminder(apt)}
                    disabled={isSending}
                    className="bg-primary text-on-primary px-3.5 py-2 rounded-lg font-label-caps text-xs hover:bg-primary-container transition-colors flex items-center gap-1 disabled:opacity-50 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-xs">{isSending ? 'sync' : 'send'}</span>
                    {isSending ? 'Sending...' : 'Send SMS & WA'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dispatched Reminder Logs Audit */}
      <div className="glass-panel p-6 rounded-2xl border border-outline/10 mt-8">
        <h3 className="font-headline-md text-base text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">history</span>
          Recent Reminder Delivery Logs ({reminderLogs.length})
        </h3>

        {reminderLogs.length === 0 ? (
          <p className="text-xs text-secondary italic">No reminder logs generated yet. Click 'Run 24h Auto-Scan' above to trigger automated notifications.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-outline/10 text-secondary font-label-caps uppercase text-[10px]">
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Client</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">SMS Delivery</th>
                  <th className="py-2.5 px-3">WhatsApp Status</th>
                  <th className="py-2.5 px-3">Client Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline/5 font-body-md">
                {reminderLogs.slice(0, 8).map(log => (
                  <tr key={log.id} className="hover:bg-surface-variant/30">
                    <td className="py-3 px-3 text-secondary">
                      {log.sentAt?.toMillis ? new Date(log.sentAt.toMillis()).toLocaleString() : 'Just now'}
                    </td>
                    <td className="py-3 px-3 font-medium text-on-surface">
                      {log.clientName}
                      <div className="text-[10px] text-secondary">{log.clientPhone}</div>
                    </td>
                    <td className="py-3 px-3">{log.serviceName}</td>
                    <td className="py-3 px-3 uppercase font-bold text-[10px] text-primary">{log.channel}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold text-[10px] uppercase">
                        {log.smsStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold text-[10px] uppercase">
                        {log.whatsappStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${
                        log.clientResponse === 'confirmed' ? 'bg-primary-container text-primary' :
                        log.clientResponse === 'rescheduled' ? 'bg-tertiary-container text-tertiary' :
                        'bg-surface-variant text-secondary'
                      }`}>
                        {log.clientResponse || 'pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Message Preview Modal */}
      {previewApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-outline/20">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline/10">
              <h3 className="font-headline-md text-base">Reminder Message Preview</h3>
              <button onClick={() => setPreviewApt(null)} className="p-1 hover:bg-surface-variant rounded-full text-secondary">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs font-body-md">
              <div>
                <label className="block font-label-caps text-[10px] uppercase text-secondary mb-1">WhatsApp Message Template</label>
                <div className="bg-emerald-950/90 text-emerald-100 p-4 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed border border-emerald-800/40">
{`✨ *BABYJAT LUXURY SALON & BOUTIQUE* ✨
-------------------------------------
Dear *${getClientInfo(previewApt.clientId).name}*,

This is your automated 24-Hour Salon Appointment Reminder! 👑

💇‍♀️ *Service:* ${previewApt.serviceName}
📅 *Date & Time:* ${new Date(previewApt.date).toLocaleString()}
✂️ *Stylist:* ${previewApt.stylistId.replace('stylist_', '')}

Please choose a quick action below to confirm your slot:

✅ *Confirm Appointment:*
https://babyjat.com/profile?action=confirm&apt=${previewApt.id}

🔄 *Reschedule Slot:*
https://babyjat.com/profile?action=reschedule&apt=${previewApt.id}`}
                </div>
              </div>

              <div>
                <label className="block font-label-caps text-[10px] uppercase text-secondary mb-1">SMS Message Template</label>
                <div className="bg-surface-container p-3 rounded-xl font-mono text-[11px] text-on-surface border border-outline/20">
{`[BabyJat Luxury Salon] Hi ${getClientInfo(previewApt.clientId).name}, your appointment for ${previewApt.serviceName} is scheduled for ${new Date(previewApt.date).toLocaleString()}. Reply YES to confirm or RESCHEDULE to pick a new date.`}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-3 border-t border-outline/10">
              <button onClick={() => setPreviewApt(null)} className="px-4 py-2 bg-surface-variant text-on-surface rounded-xl text-xs font-label-caps">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
