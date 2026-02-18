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

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,    
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});