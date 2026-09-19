import firebaseConfig from '../firebase-applet-config.json';

export interface VerifiedSubscription {
  userId: string;
  plan: 'free' | 'premium';
  subscriptionStatus: 'none' | 'active' | 'expired';
  subscriptionExpiry: string | null;
  isPremium: boolean;
  allowedAutoDailyLimit: number;
  allowedCustomDailyLimit: number | null;
  expiredJustNow?: boolean;
}

export interface VerifySubscriptionInput {
  userId: string;
  plan?: 'free' | 'premium';
  subscriptionExpiry?: string | null;
  subscriptionStatus?: 'none' | 'active' | 'expired';
  idToken?: string;
}

/**
 * Server-side authoritative verification of user subscription and expiry.
 * If subscriptionExpiry has passed, automatically treats the account as Free.
 * Uses the user's authenticated ID token to verify directly via Firestore REST API
 * when present, avoiding unauthenticated client SDK permission errors in Node.js.
 */
export async function verifyServerUserSubscription(
  input: VerifySubscriptionInput | string
): Promise<VerifiedSubscription> {
  const normalizedInput: VerifySubscriptionInput =
    typeof input === 'string' ? { userId: input } : input;

  const { userId, idToken } = normalizedInput;

  if (!userId || userId === 'guest') {
    return {
      userId: 'guest',
      plan: 'free',
      subscriptionStatus: 'none',
      subscriptionExpiry: null,
      isPremium: false,
      allowedAutoDailyLimit: 5,
      allowedCustomDailyLimit: 2,
    };
  }

  let plan: 'free' | 'premium' = normalizedInput.plan === 'premium' ? 'premium' : 'free';
  let subscriptionExpiry: string | null = normalizedInput.subscriptionExpiry || null;
  let subscriptionStatus: 'none' | 'active' | 'expired' =
    normalizedInput.subscriptionStatus || (plan === 'premium' ? 'active' : 'none');

  // If a valid ID token is provided by the client, read Firestore via the authenticated REST endpoint
  if (idToken) {
    try {
      const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
      const projectId = firebaseConfig.projectId;
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${userId}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (res.ok) {
        const docJson = await res.json();
        const fields = docJson.fields || {};
        if (fields.plan?.stringValue) {
          plan = fields.plan.stringValue === 'premium' ? 'premium' : 'free';
        }
        if (fields.subscriptionExpiry?.stringValue !== undefined) {
          subscriptionExpiry = fields.subscriptionExpiry.stringValue || null;
        }
        if (fields.subscriptionStatus?.stringValue) {
          subscriptionStatus = fields.subscriptionStatus.stringValue as any;
        }
      }
    } catch (restErr) {
      console.warn('[ServerSubscription] Could not fetch document via REST, evaluating payload:', restErr);
    }
  }

  // Authoritative server-side expiration validation
  const now = Date.now();

  if (plan === 'premium') {
    if (!subscriptionExpiry) {
      // Missing expiry date -> treat as Free
      return {
        userId,
        plan: 'free',
        subscriptionStatus: 'expired',
        subscriptionExpiry: null,
        isPremium: false,
        allowedAutoDailyLimit: 5,
        allowedCustomDailyLimit: 2,
        expiredJustNow: true,
      };
    }

    const expiryTime = new Date(subscriptionExpiry).getTime();
    if (isNaN(expiryTime) || expiryTime <= now) {
      // Expiry timestamp has passed: automatically treat as Free
      return {
        userId,
        plan: 'free',
        subscriptionStatus: 'expired',
        subscriptionExpiry,
        isPremium: false,
        allowedAutoDailyLimit: 5,
        allowedCustomDailyLimit: 2,
        expiredJustNow: true,
      };
    }

    // Active Premium plan
    return {
      userId,
      plan: 'premium',
      subscriptionStatus: 'active',
      subscriptionExpiry,
      isPremium: true,
      allowedAutoDailyLimit: 30,
      allowedCustomDailyLimit: null, // Custom clip daily limit is not defined for premium; do not invent
    };
  }

  // Default Free tier
  return {
    userId,
    plan: 'free',
    subscriptionStatus: subscriptionStatus === 'expired' ? 'expired' : 'none',
    subscriptionExpiry: subscriptionExpiry || null,
    isPremium: false,
    allowedAutoDailyLimit: 5,
    allowedCustomDailyLimit: 2,
  };
}
