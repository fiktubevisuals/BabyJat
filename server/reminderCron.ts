import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { dispatchAutomatedReminder, ReminderPayload, ReminderResult } from './reminderService';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase for server worker
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(app);

async function ensureServerAuth() {
  if (!auth.currentUser) {
    try {
      if (process.env.SERVER_FIREBASE_EMAIL && process.env.SERVER_FIREBASE_PASSWORD) {
        await signInWithEmailAndPassword(auth, process.env.SERVER_FIREBASE_EMAIL, process.env.SERVER_FIREBASE_PASSWORD);
        console.log('[Reminder Cron] Successfully authenticated using server email credentials.');
      } else {
        await signInAnonymously(auth);
        console.log('[Reminder Cron] Successfully authenticated anonymously.');
      }
    } catch (err: any) {
      console.error('[Reminder Cron] Error authenticating to Firebase:', err.code || err.message);
      if (err.code === 'auth/admin-restricted-operation' || err.code === 'auth/operation-not-allowed') {
        console.error('CRITICAL: Anonymous Authentication is disabled in your Firebase project!');
        console.error('Please go to Firebase Console > Authentication > Sign-in method, and enable "Anonymous".');
        console.error('Alternatively, create a Firebase user and provide SERVER_FIREBASE_EMAIL and SERVER_FIREBASE_PASSWORD in your .env file.');
      }
    }
  }
}

export interface CronScanStats {
  lastRunAt: string | null;
  lastScannedCount: number;
  lastDispatchedCount: number;
  totalDispatchedAllTime: number;
  isRunning: boolean;
  intervalMinutes: number;
  recentResults: Array<{
    appointmentId: string;
    clientName: string;
    serviceName: string;
    appointmentDate: string;
    status: string;
    dispatchedAt: string;
  }>;
}

let cronStats: CronScanStats = {
  lastRunAt: null,
  lastScannedCount: 0,
  lastDispatchedCount: 0,
  totalDispatchedAllTime: 0,
  isRunning: false,
  intervalMinutes: 30, // scan every 30 minutes
  recentResults: []
};

let cronTimerId: NodeJS.Timeout | null = null;

/**
 * Executes a single 24-hour appointment reminder scan across Firestore
 */
export async function execute24hReminderScan(): Promise<{
  scannedCount: number;
  dispatchedCount: number;
  dispatchedAppointments: ReminderResult[];
}> {
  if (cronStats.isRunning) {
    console.log('[Reminder Cron] Scan already in progress, skipping duplicate cycle.');
    return { scannedCount: 0, dispatchedCount: 0, dispatchedAppointments: [] };
  }

  cronStats.isRunning = true;
  await ensureServerAuth();

  const dispatchedAppointments: ReminderResult[] = [];
  let scannedCount = 0;

  try {
    const now = Date.now();
    const minTimeWindow = now + 12 * 60 * 60 * 1000; // 12 hours from now
    const maxTimeWindow = now + 36 * 60 * 60 * 1000; // 36 hours from now

    // Query active upcoming appointments
    const aptsRef = collection(db, 'appointments');
    const q = query(aptsRef, where('status', 'in', ['pending', 'confirmed']));
    
    let docs: any[] = [];
    try {
      const snap = await getDocs(q);
      docs = snap.docs;
    } catch (queryErr) {
      console.warn('[Reminder Cron] Note querying appointments:', queryErr);
    }

    scannedCount = docs.length;
    console.log(`[Reminder Cron] Scanning ${scannedCount} active appointments for 24h reminder window...`);

    for (const docSnap of docs) {
      const apt = docSnap.data();
      const aptId = docSnap.id;

      // Skip if already dispatched
      if (apt.reminderStatus === 'dispatched_24h') {
        continue;
      }

      const aptDateStr = String(apt.date || '');
      const aptTimestamp = new Date(aptDateStr).getTime();

      if (isNaN(aptTimestamp)) {
        continue;
      }

      // Check if appointment falls within the 12h - 36h reminder trigger window
      if (aptTimestamp >= minTimeWindow && aptTimestamp <= maxTimeWindow) {
        let clientPhone = apt.clientPhone;
        let clientName = apt.clientName || 'Valued Client';

        // Lookup client phone/name from users collection if missing on appointment
        if (!clientPhone && apt.clientId) {
          try {
            const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', apt.clientId)));
            if (!userSnap.empty) {
              const uData = userSnap.docs[0].data();
              clientPhone = uData.phone || uData.phoneNumber;
              clientName = uData.displayName || clientName;
            }
          } catch (uErr) {
            console.warn(`[Reminder Cron] Could not fetch user data for ${apt.clientId}:`, uErr);
          }
        }

        const payload: ReminderPayload = {
          appointmentId: aptId,
          clientName,
          clientPhone: clientPhone || '+256700000000',
          serviceName: apt.serviceName || 'Luxury Salon Service',
          appointmentDate: aptDateStr,
          stylistName: apt.stylistName || 'Master Stylist',
          channel: 'both',
          actionConfirmUrl: `https://babyjat.com/profile?action=confirm&apt=${aptId}`,
          actionRescheduleUrl: `https://babyjat.com/profile?action=reschedule&apt=${aptId}`
        };

        const result = await dispatchAutomatedReminder(payload);
        dispatchedAppointments.push(result);

        // Update appointment in Firestore
        try {
          const aptDocRef = doc(db, 'appointments', aptId);
          await updateDoc(aptDocRef, {
            reminderStatus: 'dispatched_24h',
            lastReminderSentAt: serverTimestamp(),
            reminderId: result.reminderId,
            updatedAt: serverTimestamp()
          });
        } catch (updateErr) {
          console.warn(`[Reminder Cron] Note updating appointment ${aptId} status:`, updateErr);
        }

        // Write to reminders audit log collection
        try {
          const remDocRef = doc(db, 'reminders', result.reminderId);
          await setDoc(remDocRef, {
            appointmentId: aptId,
            clientName,
            clientPhone: payload.clientPhone,
            serviceName: payload.serviceName,
            appointmentDate: aptDateStr,
            channel: 'both',
            smsStatus: result.smsStatus,
            whatsappStatus: result.whatsappStatus,
            whatsappDeepLink: result.whatsappDeepLink,
            smsMessageText: result.smsMessageText,
            whatsappMessageText: result.whatsappMessageText,
            sentAt: serverTimestamp(),
            clientResponse: 'pending'
          });
        } catch (logErr) {
          console.warn(`[Reminder Cron] Note writing reminder audit log for ${aptId}:`, logErr);
        }

        console.log(`[Reminder Cron] Dispatched 24h reminder for appointment #${aptId} (${clientName} on ${aptDateStr})`);
      }
    }

    // Cache recent results for admin dashboard
    const newResults = dispatchedAppointments.map(r => ({
      appointmentId: r.appointmentId,
      clientName: r.smsMessageText.match(/Hi (.*?),/)?.[1] || 'Client',
      serviceName: 'Salon Service',
      appointmentDate: r.dispatchedAt,
      status: r.smsStatus === 'sent' || r.whatsappStatus === 'sent' ? 'Delivered' : 'Simulated / Dispatched',
      dispatchedAt: r.dispatchedAt
    }));
    cronStats.recentResults = [...newResults, ...cronStats.recentResults].slice(0, 20);

  } catch (err) {
    console.error('[Reminder Cron] Error during 24h reminder scan:', err);
  } finally {
    cronStats.lastRunAt = new Date().toISOString();
    cronStats.lastScannedCount = scannedCount;
    cronStats.lastDispatchedCount = dispatchedAppointments.length;
    cronStats.totalDispatchedAllTime += dispatchedAppointments.length;
    cronStats.isRunning = false;
  }

  return {
    scannedCount,
    dispatchedCount: dispatchedAppointments.length,
    dispatchedAppointments
  };
}

/**
 * Starts the recurring cron schedule
 */
export function startReminderCron(intervalMinutes: number = 30) {
  cronStats.intervalMinutes = intervalMinutes;

  if (cronTimerId) {
    clearInterval(cronTimerId);
  }

  console.log(`[Reminder Cron] Starting autonomous background worker (running every ${intervalMinutes} minutes)...`);

  // Run initial scan 5 seconds after server boot
  setTimeout(() => {
    execute24hReminderScan().catch(err => console.error('[Reminder Cron] Initial scan error:', err));
  }, 5000);

  // Set recurring interval
  cronTimerId = setInterval(() => {
    execute24hReminderScan().catch(err => console.error('[Reminder Cron] Recurring scan error:', err));
  }, intervalMinutes * 60 * 1000);
}

/**
 * Returns the current stats of the reminder cron worker
 */
export function getReminderCronStats(): CronScanStats {
  return { ...cronStats };
}
