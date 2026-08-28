import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { messaging, db } from './firebase';

export interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
}

/**
 * Checks if browser/device supports Web Push & Service Workers
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Requests push notification permission and saves registration FCM token to Firestore
 */
export async function requestAndSavePushToken(userId?: string): Promise<string | null> {
  if (!isPushNotificationSupported()) {
    console.warn('[Push Notification] Notifications not supported in this browser/environment.');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[Push Notification] User declined or dismissed permission.');
      return null;
    }

    if (!messaging) {
      console.warn('[Push Notification] Firebase messaging instance not initialized.');
      return null;
    }

    // Register service worker if not already registered
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn('[Push Notification] Service worker register note:', swErr);
      }
    }

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: swRegistration,
      vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjB-1GgXfE8pY8wOQ3qC9rQo3f7Jk' // Demo VAPID key
    }).catch((err) => {
      console.warn('[Push Notification] Note retrieving FCM token with VAPID key:', err.message);
      return null;
    });

    if (currentToken && userId) {
      // Save FCM token to user document
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(currentToken),
          lastFcmToken: currentToken,
          notificationsEnabled: true
        });
      } catch {
        // If doc does not exist yet or permission denied
        try {
          await setDoc(doc(db, 'users', userId), {
            fcmTokens: [currentToken],
            lastFcmToken: currentToken,
            notificationsEnabled: true
          }, { merge: true });
        } catch (e) {
          console.warn('[Push Notification] Note saving token to Firestore:', e);
        }
      }
      console.log('[Push Notification] FCM registration token saved for user:', userId);
    }

    return currentToken;
  } catch (error: any) {
    console.error('[Push Notification] Error requesting push permission:', error);
    return null;
  }
}

/**
 * Sets up foreground push listener to display rich toasts
 */
export function setupForegroundPushListener(onReceiveNotification: (title: string, body: string, data?: any) => void) {
  if (!messaging) return () => {};

  try {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[Push Notification] Foreground message received:', payload);
      const title = payload.notification?.title || payload.data?.title || 'BabyJat Salon';
      const body = payload.notification?.body || payload.data?.body || 'New salon notification';
      onReceiveNotification(title, body, payload.data);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[Push Notification] onMessage listener registration note:', err);
    return () => {};
  }
}
