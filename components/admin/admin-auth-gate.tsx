'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '@/components/brand-logo';

export type AdminAuthView = 'login' | 'reset-request' | 'reset-confirm';

interface AdminAuthGateProps {
  authView: AdminAuthView;
  authenticated: boolean;
  adminEmail: string;
  adminPassword: string;
  showPassword: boolean;
  authError: string | null;
  authFieldErrors: Record<string, string>;
  authLoading: boolean;
  resetEmail: string;
  resetOtp: string;
  newPassword: string;
  confirmNewPassword: string;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
  resetLoading: boolean;
  resendLoading: boolean;
  resetError: string | null;
  resetFieldErrors: Record<string, string>;
  resetStatusMessage: string | null;
  onAdminEmailChange: (value: string) => void;
  onAdminPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onResetEmailChange: (value: string) => void;
  onResetOtpChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmNewPasswordChange: (value: string) => void;
  onToggleShowNewPassword: () => void;
  onToggleShowConfirmPassword: () => void;
  onSwitchView: (view: AdminAuthView) => void;
  onBackFromConfirm: () => void;
  onLoginSubmit: (e: React.FormEvent) => void;
  onResetRequestSubmit: (e: React.FormEvent) => void;
  onResetConfirmSubmit: (e: React.FormEvent) => void;
  onResendOtp: () => void;
}

export function AdminAuthGate({
  authView,
  authenticated,
  adminEmail,
  adminPassword,
  showPassword,
  authError,
  authFieldErrors,
  authLoading,
  resetEmail,
  resetOtp,
  newPassword,
  confirmNewPassword,
  showNewPassword,
  showConfirmPassword,
  resetLoading,
  resendLoading,
  resetError,
  resetFieldErrors,
  resetStatusMessage,
  onAdminEmailChange,
  onAdminPasswordChange,
  onToggleShowPassword,
  onResetEmailChange,
  onResetOtpChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onToggleShowNewPassword,
  onToggleShowConfirmPassword,
  onSwitchView,
  onBackFromConfirm,
  onLoginSubmit,
  onResetRequestSubmit,
  onResetConfirmSubmit,
  onResendOtp,
}: AdminAuthGateProps) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-[#080707] text-zinc-100 flex flex-col">
      {/* Signature Warm Copper Atmospheric Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_62%_46%_at_50%_18%,rgba(234,88,12,0.28),rgba(154,52,18,0.12)_48%,transparent_76%)]"
      />

      {/* Minimal Top Bar */}
      <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 h-16 border-b border-white/[0.06]">
        <Link
          href="/"
          aria-label="Hey Lady Home"
          className="inline-flex items-center gap-3 text-white hover:opacity-95 transition-opacity whitespace-nowrap group"
        >
          <BrandLogo variant="studio" showWordmarkOnMobile />
          <span className="border-l border-white/15 pl-3 text-xs font-medium tracking-wide text-amber-200/80">
            Studio · 18+
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white transition-colors whitespace-nowrap"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Back to Feed</span>
        </Link>
      </header>

      {/* Centered Obsidian Glass Auth Card */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[26.875rem] rounded-[1.625rem] border border-white/10 bg-[#121010]/90 backdrop-blur-xl p-6 sm:p-8 shadow-[0_28px_80px_rgba(0,0,0,0.65)]"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 text-orange-400 border border-orange-500/25">
              {authView === 'login' ? (
                <Lock className="h-5 w-5" aria-hidden="true" />
              ) : (
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <span className="text-[0.6875rem] font-medium text-zinc-400">
              Studio Access · Neon Auth
            </span>
          </div>

          {authView === 'login' && (
            <>
              <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-white">
                Admin Console
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                Restricted studio workspace. Sign in with your administrator email and password.
              </p>

              {resetStatusMessage && (
                <div
                  role="status"
                  data-testid="admin-reset-success-banner"
                  className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{resetStatusMessage}</span>
                </div>
              )}

              {resetError && (
                <p
                  role="alert"
                  className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
                >
                  {resetError}
                </p>
              )}

              <form
                onSubmit={onLoginSubmit}
                data-testid="admin-auth-form"
                className="mt-6 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="admin-email"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={adminEmail}
                      onChange={(e) => onAdminEmailChange(e.target.value)}
                      placeholder="admin@example.com"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                  </div>
                  {authFieldErrors.email && (
                    <p className="mt-1.5 text-xs text-rose-400">{authFieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label
                      htmlFor="admin-password"
                      className="block text-xs font-medium text-zinc-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      data-testid="admin-forgot-password-btn"
                      onClick={() => onSwitchView('reset-request')}
                      className="text-xs font-medium text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="current-password"
                      value={adminPassword}
                      onChange={(e) => onAdminPasswordChange(e.target.value)}
                      placeholder="Enter password"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={onToggleShowPassword}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {authFieldErrors.password && (
                    <p className="mt-1.5 text-xs text-rose-400">{authFieldErrors.password}</p>
                  )}
                </div>

                {authError && Object.keys(authFieldErrors).length === 0 && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
                  >
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="h-11 w-full rounded-xl bg-white text-[#090808] text-sm font-semibold hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer shadow-lg shadow-white/5"
                >
                  {authLoading ? 'Signing In...' : 'Sign In to Studio'}
                </button>
              </form>
            </>
          )}

          {authView === 'reset-request' && (
            <>
              <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-white">
                Reset Admin Password
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                Enter your administrator email and we&apos;ll send a 6-digit verification OTP code
                to your inbox.
              </p>

              <form
                onSubmit={onResetRequestSubmit}
                data-testid="admin-reset-request-form"
                className="mt-6 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="admin-reset-email"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(e) => onResetEmailChange(e.target.value)}
                      placeholder="admin@example.com"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                  </div>
                  {resetFieldErrors.email && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {resetFieldErrors.email}
                    </p>
                  )}
                </div>

                {resetStatusMessage && (
                  <div
                    role="status"
                    data-testid="admin-reset-request-status"
                    className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{resetStatusMessage}</span>
                  </div>
                )}

                {resetError && Object.keys(resetFieldErrors).length === 0 && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
                  >
                    {resetError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  data-testid="admin-send-reset-btn"
                  className="h-11 w-full rounded-xl bg-white text-[#090808] text-sm font-semibold hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {resetLoading ? 'Sending OTP Code...' : 'Send OTP Code'}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  data-testid="admin-back-to-login-btn"
                  onClick={() => onSwitchView('login')}
                  className="inline-flex items-center gap-1 font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Back to Sign In</span>
                </button>
                <button
                  type="button"
                  data-testid="admin-have-token-btn"
                  onClick={() => onSwitchView('reset-confirm')}
                  className="font-medium text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                >
                  Already have an OTP code?
                </button>
              </div>
            </>
          )}

          {authView === 'reset-confirm' && (
            <>
              <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-white">
                Verify OTP &amp; New Password
              </h1>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                Enter the 6-digit OTP sent to your email and choose a new administrator password.
              </p>

              {resetStatusMessage && (
                <div
                  role="status"
                  data-testid="admin-reset-otp-status"
                  className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{resetStatusMessage}</span>
                </div>
              )}

              <form
                onSubmit={onResetConfirmSubmit}
                data-testid="admin-reset-confirm-form"
                className="mt-5 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="admin-reset-confirm-email"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-reset-confirm-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(e) => onResetEmailChange(e.target.value)}
                      placeholder="admin@example.com"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                  </div>
                  {resetFieldErrors.email && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {resetFieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="admin-reset-otp"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Email OTP Code
                  </label>
                  <div className="relative">
                    <KeyRound
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-reset-otp"
                      type="text"
                      inputMode="numeric"
                      required
                      maxLength={12}
                      autoComplete="one-time-code"
                      value={resetOtp}
                      onChange={(e) => onResetOtpChange(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-3.5 font-mono text-sm tracking-[0.22em] text-white placeholder:font-sans placeholder:tracking-normal placeholder:text-sm placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                  </div>
                  {resetFieldErrors.otp && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {resetFieldErrors.otp}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="admin-new-password"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => onNewPasswordChange(e.target.value)}
                      placeholder="At least 8 chars, letter & number"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={onToggleShowNewPassword}
                      aria-label={showNewPassword ? 'Hide new password' : 'Show new password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {resetFieldErrors.newPassword && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {resetFieldErrors.newPassword}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="admin-confirm-password"
                    className="block text-xs font-medium text-zinc-300 mb-1.5"
                  >
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500"
                      aria-hidden="true"
                    />
                    <input
                      id="admin-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmNewPassword}
                      onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
                      placeholder="Re-enter new password"
                      className="studio-input h-11 w-full rounded-xl border border-white/10 bg-[#0A0909] pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500/70 focus:ring-2 focus:ring-orange-500/15 focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={onToggleShowConfirmPassword}
                      aria-label={
                        showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 cursor-pointer"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  {resetFieldErrors.confirmPassword && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-400">
                      {resetFieldErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {resetError && Object.keys(resetFieldErrors).length === 0 && (
                  <p
                    role="alert"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-300"
                  >
                    {resetError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  data-testid="admin-confirm-reset-btn"
                  className="h-11 w-full rounded-xl bg-white text-[#090808] text-sm font-semibold hover:bg-zinc-100 active:scale-[0.99] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {resetLoading ? 'Verifying OTP...' : 'Verify OTP & Update Password'}
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  data-testid="admin-back-to-login-btn"
                  onClick={onBackFromConfirm}
                  className="inline-flex items-center gap-1 font-medium text-zinc-400 hover:text-white cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{authenticated ? 'Return to Studio' : 'Back to Sign In'}</span>
                </button>
                <button
                  type="button"
                  disabled={resendLoading}
                  data-testid="admin-resend-otp-btn"
                  onClick={onResendOtp}
                  className="font-medium text-orange-400 hover:text-orange-300 hover:underline disabled:opacity-60 cursor-pointer"
                >
                  {resendLoading ? 'Resending OTP...' : 'Resend OTP'}
                </button>
              </div>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-white/[0.08] text-xs text-zinc-500 flex items-center justify-between gap-2">
            <span>Authenticated via Neon Better Auth</span>
            <Link href="/" className="text-zinc-300 hover:text-white underline shrink-0">
              View Public Site
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
