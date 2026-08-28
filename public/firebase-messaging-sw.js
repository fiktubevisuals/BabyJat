// Firebase Messaging Service Worker for Background Push Notifications
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyDummyKeyForServiceWorkerInit",
  authDomain: "babyjat-ug.firebaseapp.com",
  projectId: "babyjat-ug",
  storageBucket: "babyjat-ug.firebasestorage.app",
  messagingSenderId: "103953800507",
  appId: "1:103953800507:web:babyjat123456"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background push message:', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'BabyJat Luxury Salon';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update regarding your salon appointment.',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: payload.data?.click_action || payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
