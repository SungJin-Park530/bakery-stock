import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(console.error);