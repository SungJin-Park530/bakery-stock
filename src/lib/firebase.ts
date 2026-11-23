import { initializeApp } from 'firebase/app';
import { getAnalytics, initializeAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics';
import { getFirestore, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

let analyticsPromise: ReturnType<typeof initializeCustomerAnalytics> | undefined;

async function initializeCustomerAnalytics() {
  try {
    if (import.meta.env.DEV || !firebaseConfig.measurementId || typeof window === 'undefined' || !(await isSupported())) {
      return null;
    }
    initializeAnalytics(app, { config: { send_page_view: false } });
    return getAnalytics(app);
  } catch {
    return null;
  }
}

export async function setCustomerAnalyticsEnabled(enabled: boolean) {
  try {
    if (!enabled && !analyticsPromise) return;
    analyticsPromise ??= initializeCustomerAnalytics();
    const analytics = await analyticsPromise;
    if (analytics) setAnalyticsCollectionEnabled(analytics, enabled);
  } catch {
    return;
  }
}

export async function logCustomerEvent(eventName: string, eventParams?: Record<string, unknown>) {
  try {
    analyticsPromise ??= initializeCustomerAnalytics();
    const analytics = await analyticsPromise;
    if (analytics) logEvent(analytics, eventName, eventParams);
  } catch {
    return;
  }
}

// 단일 문서 참조 상수 ('store/menu_data')
export const MENU_DOC_REF = doc(db, 'store', 'menu_data');