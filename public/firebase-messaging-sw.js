importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');
firebase.initializeApp({
apiKey: "AIzaSyAl-5wT3Q56mG1aMaT9G8wG0rgXFUm4FZE",
authDomain: "schoolit-ef810.firebaseapp.com",
projectId: "schoolit-ef810",
storageBucket: "schoolit-ef810.firebasestorage.app",
messagingSenderId: "122657769691",
appId: "1:122657769691:web:303a88816ec20a92e224fe"
});

const messaging = firebase.messaging();

// Background message handler (optional, useful for data-only payloads)
messaging.onBackgroundMessage(function(payload) {
console.log('[firebase-messaging-sw.js] Received background message ', payload);
// We DO NOT call showNotification here if the payload has a 'notification' object,
// because the browser will automatically show it, avoiding duplicates.
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
console.log('[firebase-messaging-sw.js] Notification click received.');
event.notification.close();

// URL to open when clicked
const urlToOpen = self.location.origin;

event.waitUntil(
clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
// If a window is already open, focus it
for (let i = 0; i < clientList.length; i++) {
const client = clientList[i];
if (client.url === urlToOpen && 'focus' in client) {
return client.focus();
}
}
// If not open, open a new window
if (clients.openWindow) {
return clients.openWindow(urlToOpen);
}
})
);
});