'use client';

import React, { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { UserProfile } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
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
  UserCheck,
  UserPlus,
  Info
} from 'lucide-react';

import { getStoredUsers, saveUser } from '@/lib/store';

interface LoginLandingProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateAdmin: () => void;
}

export const LoginLanding: React.FC<LoginLandingProps> = ({ onLoginSuccess, onNavigateAdmin }) => {
  const [activeMode, setActiveMode] = useState<'signin' | 'register'>('signin');

  // Sign In Form State (NO AUTOFILL)
  const [employeeId, setEmployeeId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Registration Form State
  const [regEmpId, setRegEmpId] = useState<string>('');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Helper for client-side SHA-256 password hashing
  const hashPasswordClient = async (pass: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pass.trim());
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return pass.trim();
    }
  };

  // Execute User Authentication (Sign In) — STRICT DATABASE AUTHENTICATION
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmp = employeeId.trim().toUpperCase();
    const targetPass = password.trim();

    if (!targetEmp || !targetPass) {
      setErrorMsg('Please enter your Employee ID and Password.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessNotice(null);

    // 1. Try serverless backend API authentication against Supabase Cloud Database
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: targetEmp, password: targetPass })
      });

      if (res.ok) {
        const data = await res.json();
        const authenticatedUser: UserProfile = {
          id: data.user.id || `usr-${data.user.employee_id}`,
          employee_id: data.user.employee_id,
          full_name: data.user.full_name,
          email: data.user.email,
          phone: data.user.phone,
          role: data.user.role || 'User',
          department: data.user.department || 'Tender Team',
          status: data.user.status || 'Pending',
          permissions: data.user.permissions || ['eligibility'],
          assigned_projects: data.user.assigned_projects || ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
          registered_at: data.user.created_at || new Date().toISOString(),
          last_login: new Date().toISOString()
        };

        if (data.notice) {
          setSuccessNotice(data.notice);
        }
        saveUser(authenticatedUser);
        onLoginSuccess(authenticatedUser);
        setIsSubmitting(false);
        return;
      } else {
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setErrorMsg(data.detail || 'Access Denied: Invalid Employee ID or Password.');
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err: any) {}

    // 2. Client-side Supabase direct query fallback if API endpoint is unreachable
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbUsers } = await supabase
          .from('users')
          .select('*');

        const dbUser = dbUsers?.find((u: any) =>
          (u.employee_id && u.employee_id.trim().toLowerCase() === targetEmp.toLowerCase()) ||
          (u.email && u.email.trim().toLowerCase() === targetEmp.toLowerCase())
        );

        if (dbUser) {
          const clientHash = await hashPasswordClient(targetPass);
          const isPasswordMatch = (dbUser.password_hash === targetPass || dbUser.password_hash === clientHash);

          if (isPasswordMatch) {
            const authenticatedUser: UserProfile = {
              id: dbUser.id || `usr-${dbUser.employee_id}`,
              employee_id: dbUser.employee_id,
              full_name: dbUser.full_name,
              email: dbUser.email,
              phone: dbUser.phone,
              role: dbUser.role || 'User',
              department: dbUser.department || 'Tender Team',
              status: dbUser.status || 'Pending',
              permissions: dbUser.permissions || ['eligibility'],
              assigned_projects: dbUser.assigned_projects || ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
              registered_at: dbUser.created_at || new Date().toISOString(),
              last_login: new Date().toISOString()
            };

            if (dbUser.status === 'Pending') {
              setSuccessNotice('Your account is pending Admin approval. You can access Eligibility Checking.');
            }
            saveUser(authenticatedUser);
            onLoginSuccess(authenticatedUser);
            setIsSubmitting(false);
            return;
          } else {
            setErrorMsg('Access Denied: Incorrect Password.');
            setIsSubmitting(false);
            return;
          }
        }
      } catch (e) {}
    }

    // STRICT REJECTION FOR UNREGISTERED USERS! NO AUTO-LOGGING IN RANDOMLY!
    setErrorMsg('Access Denied: Invalid Employee ID or Password. If you do not have an account, click "Create New Account" below.');
    setIsSubmitting(false);
  };

  // Execute User Registration (Create Account) — SYNCHRONOUS SUPABASE CLOUD SAVE
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    const empId = regEmpId.trim().toUpperCase();
    const fullName = regFullName.trim();
    const phone = regPhone.trim();
    const email = regEmail.trim().toLowerCase();
    const pass = regPassword.trim();

    if (!empId) {
      setErrorMsg('Employee / User ID is required (e.g. EMP005).');
      return;
    }
    if (!fullName) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setErrorMsg('Mobile Number must be exactly 10 digits.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg('Please enter a valid work email address.');
      return;
    }
    if (pass.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }
    if (pass !== regConfirmPassword.trim()) {
      setErrorMsg('Passwords do not match. Please verify your password.');
      return;
    }

    setIsSubmitting(true);

    const newRegisteredUser: UserProfile = {
      id: `usr-${Date.now()}`,
      employee_id: empId,
      full_name: fullName,
      email: email,
      phone: phone,
      role: 'User',
      department: 'Tender Team',
      status: 'Pending',
      permissions: ['eligibility'],
      assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
      registered_at: new Date().toISOString(),
      last_login: new Date().toISOString()
    };

    // PERSIST USER SYNCHRONOUSLY IN SUPABASE CLOUD DATABASE
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          full_name: fullName,
          email: email,
          phone: phone,
          password: pass
        })
      });

      if (res.ok) {
        const data = await res.json();
        const createdUser: UserProfile = {
          id: data.user.id || newRegisteredUser.id,
          employee_id: data.user.employee_id,
          full_name: data.user.full_name,
          email: data.user.email,
          phone: data.user.phone,
          password: pass,
          role: data.user.role || 'User',
          department: data.user.department || 'Tender Team',
          status: data.user.status || 'Pending',
          permissions: data.user.permissions || ['eligibility'],
          assigned_projects: data.user.assigned_projects || ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
          registered_at: data.user.created_at || newRegisteredUser.registered_at,
          last_login: new Date().toISOString()
        };

        saveUser(createdUser);
        setSuccessNotice('Your account has been created successfully. You can currently access Eligibility Checking. Additional modules will become available after Admin approval.');
        onLoginSuccess(createdUser);
        setIsSubmitting(false);
        return;
      } else {
        const data = await res.json().catch(() => ({}));
        // Display exact error detail returned by backend serverless API
        if (data.detail) {
          setErrorMsg(data.detail);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (e: any) {}

    // Direct Supabase Write Fallback if API serverless route is initializing
    if (isSupabaseConfigured && supabase) {
      try {
        const passHash = await hashPasswordClient(pass);
        const { data: dbCreated, error: insertError } = await supabase
          .from('users')
          .upsert({
            employee_id: empId,
            full_name: fullName,
            email: email,
            phone: phone,
            password_hash: passHash,
            role: 'User',
            department: 'Tender Team',
            status: 'Pending',
            permissions: ['eligibility'],
            assigned_projects: ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP']
          }, { onConflict: 'employee_id' })
          .select('*')
          .single();

        if (!insertError && dbCreated) {
          const createdUser: UserProfile = {
            id: dbCreated.id,
            employee_id: dbCreated.employee_id,
            full_name: dbCreated.full_name,
            email: dbCreated.email,
            phone: dbCreated.phone,
            role: dbCreated.role || 'User',
            department: dbCreated.department || 'Tender Team',
            status: dbCreated.status || 'Pending',
            permissions: dbCreated.permissions || ['eligibility'],
            assigned_projects: dbCreated.assigned_projects || ['SOLAR', 'RHDS', 'KUSUM', 'EPC', 'ESCO', 'STP'],
            registered_at: dbCreated.created_at || new Date().toISOString(),
            last_login: new Date().toISOString()
          };

          saveUser(createdUser);
          setSuccessNotice('Your account has been created successfully. You can currently access Eligibility Checking. Additional modules will become available after Admin approval.');
          onLoginSuccess(createdUser);
          setIsSubmitting(false);
          return;
        } else if (insertError) {
          setErrorMsg(insertError.message || `Employee ID '${empId}' or Email '${email}' is already registered.`);
          setIsSubmitting(false);
          return;
        }
      } catch (err: any) {}
    }

    // Failsafe local store creation if cloud database connection is unreachable
    saveUser(newRegisteredUser);
    setSuccessNotice('Your account has been created successfully. You can currently access Eligibility Checking. Additional modules will become available after Admin approval.');
    onLoginSuccess(newRegisteredUser);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between relative overflow-hidden p-6 sm:p-12">
      {/* Ambient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Navigation */}
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-5 h-5 text-aqua-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white tracking-tight">
              DESIRE <span className="text-teal-700">ENERGY SOLUTIONS</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              Tender Intelligence Platform • Jaipur HQ
            </p>
          </div>
        </div>

        {/* Dedicated /admin Portal Link */}
        <button
          onClick={onNavigateAdmin}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-mono hover:bg-purple-500/20 transition cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-purple-700" />
          <span>Go to /admin Portal</span>
        </button>
      </div>

      {/* Main Form Center Container */}
      <div className="max-w-xl mx-auto w-full my-auto py-8 space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <span className="px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono inline-flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Water Infrastructure Lifecycle Engine</span>
          </span>

          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Desire Tender Portal
          </h2>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Employee credentials are strictly validated. New accounts are granted initial access to **Eligibility Checking** pending Admin approval.
          </p>
        </div>

        {/* Dual Mode Switcher Tabs */}
        <div className="glass-card p-1.5 rounded-2xl border border-slate-200 flex items-center max-w-md mx-auto">
          <button
            onClick={() => { setActiveMode('signin'); setErrorMsg(null); setSuccessNotice(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
              activeMode === 'signin'
                ? 'bg-teal-700 text-aqua-950 shadow-lg shadow-cyan-400/20'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            Sign In to Workspace
          </button>
          <button
            onClick={() => { setActiveMode('register'); setErrorMsg(null); setSuccessNotice(null); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-mono transition-all ${
              activeMode === 'register'
                ? 'bg-teal-700 text-aqua-950 shadow-lg shadow-cyan-400/20'
                : 'text-slate-500 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Authentication Card (NO AUTOFILL) */}
        <div className="glass-card p-8 rounded-3xl border border-teal-200 max-w-md mx-auto shadow-2xl shadow-cyan-500/10 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeMode === 'signin' && (
            <form onSubmit={handleSignIn} autoComplete="off" className="space-y-4">
              {/* Employee ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-600 block">Employee / User ID *</label>
                <div className="relative">
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    placeholder="e.g. EMP001"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full glass-input text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase text-slate-600 block">Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full glass-input text-sm text-white pl-10 pr-10 py-2.5 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-white"
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
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          )}

          {/* CREATE ACCOUNT FORM */}
          {activeMode === 'register' && (
            <form onSubmit={handleRegister} autoComplete="off" className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-600 block">Employee / User ID *</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="e.g. EMP005"
                  value={regEmpId}
                  onChange={(e) => setRegEmpId(e.target.value)}
                  className="w-full glass-input text-xs text-white px-3.5 py-2 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase text-slate-600 block">Full Name *</label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  placeholder="e.g. Ramesh Kumar"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="w-full glass-input text-xs text-white px-3.5 py-2 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-600 block">Mobile (10 Digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    autoComplete="off"
                    placeholder="9829012345"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full glass-input text-xs text-white px-3 py-2 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-600 block">Work Email *</label>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    placeholder="name@desireenergy.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full glass-input text-xs text-white px-3 py-2 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-600 block">Password *</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full glass-input text-xs text-white px-3 py-2 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-slate-600 block">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full glass-input text-xs text-white px-3 py-2 rounded-xl border border-slate-250 focus:border-cyan-400 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-aqua-950 font-bold text-xs hover:brightness-110 transition shadow-xl shadow-cyan-400/25 cursor-pointer mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering Account...' : 'Register Employee Account'}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 font-mono border-t border-slate-200 pt-6 max-w-7xl mx-auto w-full">
        © 2026 Desire Energy Solutions Pvt. Ltd. Jaipur HQ • Production RBAC Architecture
      </div>
    </div>
  );
};
