importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD7zgvXf_5c_SCi5f0eKkcNpzvO5lS1cgQ",
  projectId: "babyjat-beauty",
  messagingSenderId: "196393708486",
  appId: "1:196393708486:web:0e0502a86158a1783c20c7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'BabyJat Salon Update';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/icon.png',
    badge: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
