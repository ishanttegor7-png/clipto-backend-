/**
 * Isolated Payment Gateway Service for Clipto
 * 
 * IMPORTANT:
 * - This service provides isolated placeholder hooks for future payment gateway integration (e.g. Razorpay, Stripe).
 * - It does NOT simulate payment completion or fake transactions.
 * - It does NOT alter user plan or grant premium status.
 */

export interface PaymentPlanConfig {
  id: 'weekly' | 'monthly';
  name: string;
  priceInr: number;
  durationLabel: string;
  durationDays: number;
  buttonLabel: string;
}

export const SUBSCRIPTION_PLANS: Record<'weekly' | 'monthly', PaymentPlanConfig> = {
  weekly: {
    id: 'weekly',
    name: 'Weekly',
    priceInr: 39,
    durationLabel: '7 days',
    durationDays: 7,
    buttonLabel: 'Choose Weekly',
  },
  monthly: {
    id: 'monthly',
    name: 'Monthly',
    priceInr: 199,
    durationLabel: '30 days',
    durationDays: 30,
    buttonLabel: 'Choose Monthly',
  },
};

export interface InitiatePaymentRequest {
  userId?: string;
  userEmail?: string;
  planId: 'weekly' | 'monthly';
}

export interface PaymentInitiationResult {
  status: 'pending_gateway_connection';
  planId: 'weekly' | 'monthly';
  planName: string;
  amountInr: number;
  durationLabel: string;
  message: string;
}

/**
 * Placeholder function for future payment gateway connection.
 * When called:
 * - Logs and returns structured integration parameters.
 * - Explicitly does NOT simulate payment completion.
 * - Explicitly does NOT change user plan.
 */
export async function initiateSubscriptionPayment(
  request: InitiatePaymentRequest
): Promise<PaymentInitiationResult> {
  const plan = SUBSCRIPTION_PLANS[request.planId];

  // Dispatches to backend placeholder endpoint for logging & order configuration
  try {
    const res = await fetch('/api/subscription/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: request.userId || 'guest',
        userEmail: request.userEmail || '',
        planId: request.planId,
        amountInr: plan.priceInr,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log('[PaymentService] Gateway intent registered:', data);
    }
  } catch (err) {
    console.warn('[PaymentService] Offline or backend call skipped:', err);
  }

  return {
    status: 'pending_gateway_connection',
    planId: plan.id,
    planName: plan.name,
    amountInr: plan.priceInr,
    durationLabel: plan.durationLabel,
    message: `Payment gateway initiation registered for ${plan.name} Plan (₹${plan.priceInr} for ${plan.durationLabel}). Gateway integration will be connected here. No payment was simulated and plan remains unchanged.`,
  };
}
