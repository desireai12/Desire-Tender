'use client';

import React, { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { UserProfile } from '@/lib/types';
import { 
  Building2, 
  Lock, 
  Mail, 
  Phone, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Layers,
  Key,
  Info
} from 'lucide-react';

interface LoginLandingProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginLanding: React.FC<LoginLandingProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validateInputs = (eStr: string, pStr: string, passStr: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\d{10}$/;

    if (!emailRegex.test(eStr.trim())) {
      setErrorMsg('Please enter a valid work email address (e.g. name@desireenergy.com)');
      return false;
    }
    if (!phoneRegex.test(pStr.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number (e.g. 9829012345)');
      return false;
    }
    if (!passStr.trim()) {
      setErrorMsg('Please enter your account password.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const executeLogin = async (eStr: string, pStr: string, passStr: string) => {
    if (!validateInputs(eStr, pStr, passStr)) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: eStr.trim(), 
          phone: pStr.trim(),
          password: passStr.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.user) {
        onLoginSuccess(data.user);
      } else {
        throw new Error(data.detail || 'Authentication failed. Invalid email, phone, or password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Access Denied. Incorrect credentials or account not registered by Admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setDemoCredential = (e: string, p: string, pass: string) => {
    setEmail(e);
    setPhone(p);
    setPassword(pass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-[#101415] text-[#e0e3e5] flex flex-col justify-between relative overflow-hidden p-6 sm:p-12">
      {/* Background Ambient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Banner */}
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-5 h-5 text-aqua-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-tight">
              DESIRE <span className="text-cyan-400">ENERGY SOLUTIONS</span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Tender Intelligence Platform • Jaipur HQ
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Role-Based Password Auth Active</span>
        </div>
      </div>

      {/* Main Login Workspace Center */}
      <div className="max-w-4xl mx-auto w-full my-auto py-12 space-y-8 animate-fadeIn">
        <div className="text-center space-y-3">
          <span className="px-3.5 py-1.5 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 text-xs font-mono inline-flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Water Infrastructure Lifecycle & Costing Engine</span>
          </span>

          <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
            Sign In to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">Tender Portal</span>
          </h2>
          <p className="text-slate-400 text-sm max-w-lg mx-auto">
            Enter your authorized email, 10-digit mobile number, and password. Only registered users approved by Admin can access their department portal.
          </p>
        </div>

        {/* Login Card with Email + 10-Digit Mobile + Password */}
        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-cyan-500/30 max-w-md mx-auto shadow-2xl shadow-cyan-500/10 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); executeLogin(email, phone, password); }} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-slate-300 block">Work Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@desireenergy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/15 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Mobile Number Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-slate-300 block">10-Digit Mobile Number *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder="e.g. 9829012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="w-full glass-input text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-white/15 focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-slate-300 block">Account Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input text-sm text-white pl-10 pr-10 py-2.5 rounded-xl border border-white/15 focus:border-cyan-400 focus:outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold text-sm hover:from-cyan-300 hover:to-teal-300 transition shadow-xl shadow-cyan-400/25 cursor-pointer"
            >
              <span>{isSubmitting ? 'Verifying Password...' : 'Sign In with Password'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>

          {/* Authorized Credentials Helper */}
          <div className="pt-5 border-t border-white/10 space-y-2.5">
            <div className="text-[11px] font-mono text-cyan-300 flex items-center space-x-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Sample Pre-Registered Credentials:</span>
            </div>
            
            <div className="space-y-1.5 text-[11px] font-mono text-slate-300 bg-aqua-950/80 p-3 rounded-xl border border-white/5">
              <button 
                type="button"
                onClick={() => setDemoCredential('ankit.purohit@desireenergy.com', '9829012345', 'desire@2026#BD')}
                className="w-full text-left hover:text-cyan-300 transition flex justify-between"
              >
                <span>👤 Ankit Purohit (BD)</span>
                <span className="text-cyan-400">Autofill</span>
              </button>
              <button 
                type="button"
                onClick={() => setDemoCredential('deepak.khandelwal@desireenergy.com', '9829023456', 'desire@2026#Est')}
                className="w-full text-left hover:text-cyan-300 transition flex justify-between"
              >
                <span>📐 Deepak (Estimation)</span>
                <span className="text-cyan-400">Autofill</span>
              </button>
              <button 
                type="button"
                onClick={() => setDemoCredential('admin@desireenergy.com', '9999999999', 'Admin#Desire@2026')}
                className="w-full text-left hover:text-cyan-300 transition flex justify-between"
              >
                <span>🔑 System Admin</span>
                <span className="text-cyan-400">Autofill</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 font-mono border-t border-white/5 pt-6 max-w-7xl mx-auto w-full">
        © 2026 Desire Energy Solutions Pvt. Ltd. Jaipur HQ • Role-Based Security Vault
      </div>
    </div>
  );
};
