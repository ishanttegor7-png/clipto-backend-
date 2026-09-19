import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { UserData, PlanType, SubscriptionStatus, SubscriptionVerificationResult } from '../types';
import { User } from 'firebase/auth';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Retrieves an existing user record from Firestore, or creates a new default record if first login.
 * Automatically checks:
 * 1. If subscriptionExpiry has passed -> treats the account as Free & marks status as expired
 * 2. If a new day has started -> resets daily usage counters
 */
export async function getOrCreateUserRecord(firebaseUser: User): Promise<UserData> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  const path = `users/${firebaseUser.uid}`;
  let userSnap;

  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  const today = getTodayDateString();

  if (!userSnap.exists()) {
    const defaultData: UserData = {
      userId: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName:
        firebaseUser.displayName ||
        (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Creator'),
      photoURL: firebaseUser.photoURL || '',
      plan: 'free',
      subscriptionExpiry: null,
      subscriptionStatus: 'none',
      autoClipsUsedToday: 0,
      customClipsUsedToday: 0,
      usageResetDate: today,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(userRef, defaultData);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
    return defaultData;
  }

  const data = userSnap.data() as UserData;
  let activePlan: PlanType = data.plan === 'premium' ? 'premium' : 'free';
  let subStatus: SubscriptionStatus =
    data.subscriptionStatus || (activePlan === 'premium' ? 'active' : 'none');

  const updatesToPersist: Partial<UserData> = {};

  // Phase 4 Requirement: If the user's subscriptionExpiry has passed:
  // Automatically treat the account as Free. Do not rely only on a client-side Premium flag.
  if (activePlan === 'premium') {
    if (!data.subscriptionExpiry) {
      activePlan = 'free';
      subStatus = 'expired';
      updatesToPersist.plan = 'free';
      updatesToPersist.subscriptionStatus = 'expired';
    } else {
      const expiryTime = new Date(data.subscriptionExpiry).getTime();
      if (isNaN(expiryTime) || expiryTime <= Date.now()) {
        activePlan = 'free';
        subStatus = 'expired';
        updatesToPersist.plan = 'free';
        updatesToPersist.subscriptionStatus = 'expired';
      }
    }
  }

  // Daily reset - Automatically reset the usage counters when a new day starts
  if (data.usageResetDate !== today) {
    updatesToPersist.autoClipsUsedToday = 0;
    updatesToPersist.customClipsUsedToday = 0;
    updatesToPersist.usageResetDate = today;
  }

  if (Object.keys(updatesToPersist).length > 0) {
    try {
      await updateDoc(userRef, updatesToPersist);
    } catch (err) {
      console.warn('Failed to update user record in Firestore:', err);
    }

    return {
      ...data,
      plan: activePlan,
      subscriptionStatus: subStatus,
      ...updatesToPersist,
    };
  }

  return {
    ...data,
    plan: activePlan,
    subscriptionStatus: subStatus,
  };
}

/**
 * Update user subscription plan in Firestore directly
 */
export async function updateUserPlan(
  userId: string,
  newPlan: PlanType,
  expiryDays: number = 30
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  const updates: Partial<UserData> = {
    plan: newPlan,
    subscriptionStatus: newPlan === 'premium' ? 'active' : 'none',
    subscriptionExpiry:
      newPlan === 'premium'
        ? new Date(Date.now() + expiryDays * 86400000).toISOString()
        : null,
  };

  try {
    await updateDoc(userRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Increment clip usage for auto or custom clips in Firestore
 */
export async function incrementClipUsage(
  userId: string,
  type: 'auto' | 'custom',
  amount: number = 1
): Promise<UserData | null> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  let userSnap;

  try {
    userSnap = await getDoc(userRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }

  if (!userSnap.exists()) return null;

  const data = userSnap.data() as UserData;
  const today = getTodayDateString();

  let autoUsed = data.usageResetDate === today ? data.autoClipsUsedToday : 0;
  let customUsed = data.usageResetDate === today ? data.customClipsUsedToday : 0;

  if (type === 'auto') {
    autoUsed += amount;
  } else {
    customUsed += amount;
  }

  const updates: Partial<UserData> = {
    autoClipsUsedToday: autoUsed,
    customClipsUsedToday: customUsed,
    usageResetDate: today,
  };

  try {
    await updateDoc(userRef, updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }

  return {
    ...data,
    ...updates,
  };
}

/**
 * Authoritatively verify user subscription and expiry on the backend server.
 * Returns authoritative tier, quota, and expiry.
 */
export async function verifySubscriptionWithServer(
  userId: string,
  currentData?: Partial<UserData>
): Promise<SubscriptionVerificationResult | null> {
  try {
    let idToken: string | undefined;
    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        idToken = await auth.currentUser.getIdToken();
      } catch (tokenErr) {
        console.warn('Could not get idToken:', tokenErr);
      }
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const res = await fetch('/api/user/verify-subscription', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        userId,
        plan: currentData?.plan,
        subscriptionExpiry: currentData?.subscriptionExpiry,
        subscriptionStatus: currentData?.subscriptionStatus,
      }),
    });

    if (!res.ok) return null;
    return (await res.json()) as SubscriptionVerificationResult;
  } catch (err) {
    console.error('Failed to verify subscription with server:', err);
    return null;
  }
}

/**
 * Developer helper to simulate subscription states (active weekly, active monthly, expired, free)
 * for testing expiry transitions safely.
 */
export async function setTestSubscriptionState(
  userId: string,
  state: 'active_weekly' | 'active_monthly' | 'expired' | 'free'
): Promise<boolean> {
  try {
    // 1. Calculate the subscription state via server endpoint
    const res = await fetch('/api/dev/set-test-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, state }),
    });

    if (!res.ok) return false;
    const calc = await res.json();

    // 2. Persist the updated state to Firestore using authenticated client SDK
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      plan: calc.plan,
      subscriptionStatus: calc.subscriptionStatus,
      subscriptionExpiry: calc.subscriptionExpiry,
    });

    return true;
  } catch (err) {
    console.error('Failed to set test subscription state:', err);
    return false;
  }
}

/**
 * Reset usage counters for manual testing
 */
export async function resetDailyUsage(userId: string): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  try {
    await updateDoc(userRef, {
      autoClipsUsedToday: 0,
      customClipsUsedToday: 0,
      usageResetDate: getTodayDateString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
