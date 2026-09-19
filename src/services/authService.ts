import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { getOrCreateUserRecord } from './userService';
import { UserData } from '../types';

export interface AuthResult {
  user: User;
  userData: UserData;
}

export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please login instead.';
    case 'auth/invalid-email':
      return 'The email address entered is not valid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please double check and try again.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed before completion. Please try again.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by browser. Please allow popups for this site.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
}

export async function loginWithGoogle(): Promise<AuthResult> {
  const userCredential = await signInWithPopup(auth, googleProvider);
  const userData = await getOrCreateUserRecord(userCredential.user);
  return { user: userCredential.user, userData };
}

export async function signUpWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<AuthResult> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  if (displayName && userCredential.user) {
    try {
      await updateProfile(userCredential.user, { displayName });
    } catch {
      // Ignore non-fatal display name update error
    }
  }
  const userData = await getOrCreateUserRecord(userCredential.user);
  return { user: userCredential.user, userData };
}

export async function loginWithEmail(email: string, pass: string): Promise<AuthResult> {
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  const userData = await getOrCreateUserRecord(userCredential.user);
  return { user: userCredential.user, userData };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
