/**
 * ==============================================================================
 * MAIN ROUTE PAGE: /login
 * Path: src/app/login/page.tsx
 * Description: Dedicated Client Hub Login page.
 * ==============================================================================
 */

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Lock,
  Mail,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  FileText,
  UserCheck,
} from "lucide-react";
import { authApi, getRoleRedirect } from "@/lib/api";

export default function ClientLoginPage() {
  const router = useRouter();

  // ------------------------------------------------------------------------------
  // FORM STATES
  // ------------------------------------------------------------------------------
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    try {
      const data = await authApi.login(email, password);
      const role = data.user.role;
      document.cookie = `user-role=${role}; path=/; SameSite=Lax`;
      router.push(getRoleRedirect(role));
    } catch (err: any) {
      setErrorMsg(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans
  selection:bg-[#0024A8] selection:text-white antialiased relative"
    >
      {/* Background radial overlays */}
      <div
        className="fixed -top-40 -right-40 w-96 h-96 bg-[#0024A8]/10 rounded-full blur-3xl pointer-events-none"
      />
      <div
        className="fixed -bottom-40 -left-40 w-96 h-96 bg-[#0B2369]/10 rounded-full blur-3xl pointer-events-none"
      />

      {/* SPLIT CONTAINER CARD */}
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200/50
  grid grid-cols-1 md:grid-cols-2 overflow-hidden relative min-h-[600px] animate-scaleIn"
      >
        {/* LEFT CONTAINER: Website Short Info */}
        <div
          className="bg-gradient-to-br from-[#0024A8] via-[#0B2369] to-[#040E30] text-white p-8 md:p-12
    flex flex-col justify-between relative overflow-hidden"
        >
          {/* Background overlay design */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_70%)] pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#0024A8] rounded-full blur-3xl opacity-20 pointer-events-none" />

          {/* Logo / Header */}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white block leading-none">
                BAI FINANCE
              </span>
              <span className="text-[9px] font-extrabold text-blue-200 uppercase tracking-widest block mt-1">
                A Friend in Finance
              </span>
            </div>
          </div>

          {/* Core App Information */}
          <div className="space-y-6 my-8 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-bold uppercase tracking-wider text-blue-200">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Next-Gen Brokerage</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                From First Home <br />to Settled.
              </h2>
              <p className="text-slate-300 text-xs md:text-sm font-medium leading-relaxed">
                Experience a streamlined mortgage journey designed around you.
                Connect with brokers, submit documents, and track approvals seamlessly.
              </p>
            </div>

            {/* Feature Bullet Points */}
            <div className="space-y-4 pt-2">
              {/* Feature 1 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Digital Application Pipeline</h4>
                  <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Submit, edit, and track mortgage applications from a single unified hub.</p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <FileText className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Secure Document Center</h4>
                  <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Directly upload and verify your bank statements, IDs, and financial files.</p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                  <UserCheck className="w-3.5 h-3.5 text-blue-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">Dedicated Broker Support</h4>
                  <p className="text-[11px] text-slate-300 leading-normal mt-0.5">Instant booking system to coordinate meetings with mortgage specialists.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="relative z-10 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            © 2026 BAI Finance. Secure Client Gateway.
          </div>
        </div>

        {/* RIGHT CONTAINER: Login Form UI */}
        <div className="p-8 md:p-12 flex flex-col justify-between bg-white relative">
          {/* Back to Home Link */}
          <div className="flex justify-between items-center mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-[#0024A8] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="space-y-6 my-auto">
            {/* Header Title */}
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Welcome Back
              </h3>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mt-2">
                Client Hub Gateway
              </span>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div
                className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-xs font-semibold text-rose-600"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="space-y-4 text-xs font-semibold"
            >
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium block"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:outline-none focus:border-[#0024A8]/30 rounded-xl text-slate-700 font-medium block"
                  />
                </div>
              </div>

              {/* Registration Notice */}
              <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-2xl space-y-1 text-slate-600">
                <span
                  className="text-[10px] font-extrabold text-[#0024A8] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Invitation Only Access</span>
                </span>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  New to BAI Finance? Please contact your designated Mortgage Broker to request an invitation link.
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#0024A8] hover:bg-[#001D85] disabled:opacity-50 text-white rounded-xl
      text-xs font-bold shadow-md shadow-[#0024A8]/10 transition-all uppercase tracking-wider mt-2 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  "Log In to Hub"
                )}
              </button>
            </form>
          </div>

          <div className="text-[10px] text-slate-400 font-medium text-center mt-6">
            Protected by BAI Security Systems.
          </div>
        </div>
      </div>
    </div>
  );
}
