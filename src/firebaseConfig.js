<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
  import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  // For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyA2tq_5whGRqB-6lqneEsdUEJ8DSD_-hII",
    authDomain: "yakulttwmarketing.firebaseapp.com",
    projectId: "yakulttwmarketing",
    storageBucket: "yakulttwmarketing.firebasestorage.app",
    messagingSenderId: "1023004807231",
    appId: "1:1023004807231:web:cf5b79d2709f548381a88a",
    measurementId: "G-6G7GCT6GLB"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
</script>
