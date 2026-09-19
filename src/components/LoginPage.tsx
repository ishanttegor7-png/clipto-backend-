import React, { useState } from 'react';
import { Film, ArrowLeft, Mail, Lock, CheckCircle2, ShieldCheck, User as UserIcon, AlertCircle } from 'lucide-react';
import {
  loginWithGoogle,
  signUpWithEmail,
  loginWithEmail,
  resetUserPassword,
  formatAuthError,
  AuthResult,
} from '../services/authService';

interface LoginPageProps {
  onLoginSuccess: (authResult: AuthResult) => void;
  onBackToLanding: () => void;
  pendingUrl?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onBackToLanding,
  pendingUrl,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearErrors = () => {
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();

    if (mode === 'forgot') {
      if (!email.trim()) {
        setErrorMessage('Please enter your email address.');
        return;
      }
      setIsLoading(true);
      try {
        await resetUserPassword(email.trim());
        setResetSent(true);
      } catch (err: any) {
        setErrorMessage(formatAuthError(err));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const result = await signUpWithEmail(
          email.trim(),
          password,
          displayName.trim() || email.trim().split('@')[0]
        );
        onLoginSuccess(result);
      } else {
        const result = await loginWithEmail(email.trim(), password);
        onLoginSuccess(result);
      }
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearErrors();
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      onLoginSuccess(result);
    } catch (err: any) {
      setErrorMessage(formatAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="login-page-container"
      className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8"
    >
      <div className="w-full max-w-md">
        {/* Back to landing button */}
        <button
          onClick={onBackToLanding}
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {/* Card Container */}
        <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl p-6 sm:p-8 shadow-2xl">
          {/* Logo & Headline */}
          <div className="text-center mb-6">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center text-black font-bold mx-auto mb-3 shadow-md shadow-cyan-950/40">
              <Film className="w-6 h-6 text-black stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {mode === 'login'
                ? 'Welcome back to Clipto'
                : mode === 'signup'
                ? 'Create your Clipto Account'
                : 'Reset your password'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'forgot'
                ? 'Enter your email to receive recovery instructions'
                : 'Turn YouTube videos into sequential or custom clips'}
            </p>
          </div>

          {/* Pending video notification */}
          {pendingUrl && (
            <div className="mb-5 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2">
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Saved video: {pendingUrl}</span>
            </div>
          )}

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span className="leading-relaxed flex-1">{errorMessage}</span>
            </div>
          )}

          {mode === 'forgot' && resetSent ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Reset Link Sent
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  We've sent a password recovery link to <strong className="text-slate-200">{email}</strong>. Please check your inbox.
                </p>
              </div>
              <button
                onClick={() => {
                  setResetSent(false);
                  setMode('login');
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Continue with Google */}
              {mode !== 'forgot' && (
                <>
                  <button
                    id="continue-with-google-btn"
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full min-h-[44px] py-3 px-4 rounded-xl border border-[#1e293b] bg-[#0e1422] hover:bg-[#151d30] text-white text-xs font-semibold flex items-center justify-center gap-3 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* Divider */}
                  <div className="relative my-5 flex items-center justify-center">
                    <div className="border-t border-[#1e293b] w-full" />
                    <span className="bg-[#0b0f19] px-3 text-[11px] uppercase tracking-wider text-slate-500 absolute">
                      or with email
                    </span>
                  </div>
                </>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name input (for Sign Up mode) */}
                {mode === 'signup' && (
                  <div>
                    <label
                      htmlFor="signup-name"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Display Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="signup-name"
                        type="text"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          clearErrors();
                        }}
                        placeholder="Creator Name"
                        className="w-full min-h-[44px] bg-[#0e1422] border border-[#1e293b] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-3 text-xs text-white placeholder-slate-500 transition-colors outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Email input */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearErrors();
                      }}
                      placeholder="name@example.com"
                      className="w-full min-h-[44px] bg-[#0e1422] border border-[#1e293b] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-3 text-xs text-white placeholder-slate-500 transition-colors outline-none"
                    />
                  </div>
                </div>

                {/* Password input */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-medium text-slate-300"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot');
                          clearErrors();
                        }}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="login-password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          clearErrors();
                        }}
                        placeholder="••••••••••••"
                        className="w-full min-h-[44px] bg-[#0e1422] border border-[#1e293b] focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl pl-10 pr-3 text-xs text-white placeholder-slate-500 transition-colors outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  id="submit-auth-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl font-semibold text-xs bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-black shadow-lg shadow-cyan-950/60 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    <span>Login</span>
                  ) : mode === 'signup' ? (
                    <span>Create Account</span>
                  ) : (
                    <span>Send Reset Instructions</span>
                  )}
                </button>
              </form>

              {/* Toggle create account / login option */}
              <div className="mt-5 pt-4 border-t border-[#1e293b] text-center text-xs">
                {mode === 'login' ? (
                  <p className="text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        clearErrors();
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                    >
                      Create account
                    </button>
                  </p>
                ) : (
                  <p className="text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        clearErrors();
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                    >
                      Login
                    </button>
                  </p>
                )}
              </div>
            </>
          )}

          {/* Security & Production Ready Badge */}
          <div className="mt-5 pt-3 border-t border-slate-800/60 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Secure Firebase Auth & Isolated User Database</span>
          </div>
        </div>
      </div>
    </div>
  );
};
