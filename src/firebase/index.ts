'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, deleteApp, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Initializes Firebase services.
 * Forcefully re-initializes to clear any cached project connections.
 */
export function initializeFirebase() {
  const existingApps = getApps();
  
  if (existingApps.length > 0) {
    const currentApp = existingApps[0];
    if (currentApp.options.projectId !== firebaseConfig.projectId) {
      for (const app of existingApps) {
        deleteApp(app).catch(err => console.warn('Failed to delete existing app:', err));
      }
    } else {
      return {
        firebaseApp: currentApp,
        auth: getAuth(currentApp),
        firestore: getFirestore(currentApp)
      };
    }
  }

  const firebaseApp = initializeApp(firebaseConfig);
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
