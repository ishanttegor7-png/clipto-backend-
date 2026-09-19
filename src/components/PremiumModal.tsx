import React, { useState } from 'react';
import { X, Check, Sparkles, Shield, AlertCircle } from 'lucide-react';
import { PlanType, UserData } from '../types';
import {
  initiateSubscriptionPayment,
  PaymentInitiationResult,
} from '../services/paymentService';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  limitReachedReason?: 'auto' | 'custom' | null;
  user?: UserData | null;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  limitReachedReason,
  user,
}) => {
  const [gatewayResult, setGatewayResult] = useState<PaymentInitiationResult | null>(null);
  const [isInitiating, setIsInitiating] = useState(false);

  if (!isOpen) return null;

  const handleChoosePlan = async (planId: 'weekly' | 'monthly') => {
    setIsInitiating(true);
    setGatewayResult(null);

    try {
      // Calls the isolated payment gateway placeholder function
      // NOTE: Strictly does NOT simulate payment completion and does NOT change the user's plan
      const result = await initiateSubscriptionPayment({
        userId: user?.userId,
        userEmail: user?.email,
        planId,
      });

      setGatewayResult(result);
    } catch (err) {
      console.error('Payment initiation hook failed:', err);
    } finally {
      setIsInitiating(false);
    }
  };

  return (
    <div
      id="premium-upgrade-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="premium-upgrade-modal-card"
        className="relative w-full max-w-lg bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-6 sm:p-7 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Unlock Clipto Premium
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose a subscription plan to increase your daily video clipping limits
            </p>
          </div>
        </div>

        {/* Limit Reached Notification Banner */}
        {limitReachedReason && (
          <div
            id="limit-reached-explanation"
            className="my-4 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-amber-200 leading-relaxed">
              <span className="font-semibold text-amber-300 block mb-0.5">
                {limitReachedReason === 'auto'
                  ? 'Daily Auto Clip Limit Reached (5/5)'
                  : 'Daily Custom Clip Limit Reached (2/2)'}
              </span>
              {limitReachedReason === 'auto'
                ? "You've reached your daily Free limit of 5 Auto clips. Upgrade to Premium to get 30 Auto clips every day."
                : "You've reached your daily Free limit of 2 Custom clips. Upgrade to Premium to unlock full clipping access."}
            </div>
          </div>
        )}

        {/* Payment Gateway Placeholder Notification (Visible after clicking Choose Weekly/Monthly) */}
        {gatewayResult && (
          <div
            id="payment-gateway-notice"
            className="my-4 p-4 bg-[#0e1422] border border-cyan-500/40 rounded-xl text-xs text-slate-200 animate-in fade-in duration-200"
          >
            <div className="flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block mb-1">
                  Payment Gateway Integration Point
                </span>
                <p className="text-slate-300 leading-relaxed mb-2">
                  {gatewayResult.message}
                </p>
                <div className="p-2 rounded bg-slate-900/90 font-mono text-[11px] text-cyan-300 border border-slate-800">
                  Plan: {gatewayResult.planName} • Amount: ₹{gatewayResult.amountInr} • Duration: {gatewayResult.durationLabel}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 italic">
                  Note: Real payment gateway (e.g. Razorpay/Stripe) will be connected here. No fake payment was simulated and your plan was not changed.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* The Two Premium Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-5">
          {/* 1. Weekly Plan */}
          <div
            id="plan-card-weekly"
            className="bg-[#0e1422] border border-[#1e293b] hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Weekly
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                  7 days
                </span>
              </div>

              <div className="mb-3">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                  ₹39
                </div>
                <div className="text-xs text-slate-400 mt-0.5">7 days access</div>
              </div>

              <div className="space-y-2 py-3 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    <strong className="text-white font-semibold">30 Auto clips</strong>/day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Sequential 1-minute batches</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Fast MP4 download</span>
                </div>
              </div>
            </div>

            <button
              id="choose-weekly-btn"
              type="button"
              disabled={isInitiating}
              onClick={() => handleChoosePlan('weekly')}
              className="mt-4 w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-50 text-black font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/60"
            >
              <span>Choose Weekly</span>
            </button>
          </div>

          {/* 2. Monthly Plan */}
          <div
            id="plan-card-monthly"
            className="bg-[#0e1422] border border-cyan-500/50 hover:border-cyan-400 rounded-2xl p-5 flex flex-col justify-between relative transition-all ring-1 ring-cyan-500/30"
          >
            <div className="absolute -top-2.5 right-4 bg-cyan-500 text-black text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
              Best Value
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Monthly
                </span>
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                  30 days
                </span>
              </div>

              <div className="mb-3">
                <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
                  ₹199
                </div>
                <div className="text-xs text-slate-400 mt-0.5">30 days access</div>
              </div>

              <div className="space-y-2 py-3 border-t border-slate-800 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>
                    <strong className="text-white font-semibold">30 Auto clips</strong>/day
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Sequential 1-minute batches</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Priority queue processing</span>
                </div>
              </div>
            </div>

            <button
              id="choose-monthly-btn"
              type="button"
              disabled={isInitiating}
              onClick={() => handleChoosePlan('monthly')}
              className="mt-4 w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-50 text-black font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/60"
            >
              <span>Choose Monthly</span>
            </button>
          </div>
        </div>

        {/* Footer info & Free plan reminder */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Free plan: 5 Auto / 2 Custom clips per day</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
