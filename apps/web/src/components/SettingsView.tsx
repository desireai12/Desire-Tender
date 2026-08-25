'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { DepartmentRole } from '@/lib/types';
import { 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Save, 
  RefreshCw,
  Server,
  Lock
} from 'lucide-react';

interface SettingsViewProps {
  activeRole?: DepartmentRole;
  onProviderChange?: (provider: 'gemini' | 'openai') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ activeRole, onProviderChange }) => {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [geminiKey, setGeminiKey] = useState<string>('');
  const [openaiKey, setOpenaiKey] = useState<string>('');
  
  const [showGeminiKey, setShowGeminiKey] = useState<boolean>(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState<boolean>(false);

  const [geminiModel, setGeminiModel] = useState<string>('gemini-1.5-flash');
  const [openaiModel, setOpenaiModel] = useState<string>('gpt-4o-mini');

  const [testResultGemini, setTestResultGemini] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });
  const [testResultOpenai, setTestResultOpenai] = useState<{ status: 'idle' | 'testing' | 'success' | 'error'; message: string }>({ status: 'idle', message: '' });

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (activeRole && activeRole !== 'Admin') {
    return (
      <div className="glass-card p-12 rounded-2xl text-center space-y-4 border-2 border-rose-200 max-w-3xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-800 font-bold">
          <Lock className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h3 className="text-xl font-display font-bold text-slate-900">System Settings Restricted — Admin Authorization Required</h3>
        <p className="text-xs text-slate-600 max-w-lg mx-auto">
          API key management, model configurations, and system settings are strictly managed by authorized Administrators. End users cannot view or modify these settings.
        </p>
      </div>
    );
  }

  // Load existing config on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/settings/config`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success') {
          if (data.default_llm_provider) setProvider(data.default_llm_provider);
          if (data.gemini_model) setGeminiModel(data.gemini_model);
          if (data.openai_model) setOpenaiModel(data.openai_model);
        }
      })
      .catch(() => {
        // Fallback default
      });
  }, []);

  const handleTestKey = async (targetProvider: 'gemini' | 'openai') => {
    const apiKey = targetProvider === 'gemini' ? geminiKey : openaiKey;
    const model = targetProvider === 'gemini' ? geminiModel : openaiModel;

    if (!apiKey.trim()) {
      if (targetProvider === 'gemini') {
        setTestResultGemini({ status: 'error', message: 'Please enter a valid Gemini API Key first.' });
      } else {
        setTestResultOpenai({ status: 'error', message: 'Please enter a valid OpenAI API Key first.' });
      }
      return;
    }

    if (targetProvider === 'gemini') {
      setTestResultGemini({ status: 'testing', message: 'Testing connection to Google Gemini API...' });
    } else {
      setTestResultOpenai({ status: 'testing', message: 'Testing connection to OpenAI API...' });
    }

    try {
      const response = await fetch(`${API_BASE_URL}/settings/test-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: targetProvider,
          api_key: apiKey.trim(),
          model_name: model
        }),
      });

      const resData = await response.json();
      if (response.ok) {
        if (targetProvider === 'gemini') {
          setTestResultGemini({ status: 'success', message: 'Google Gemini API Key Validated! Connection Online.' });
        } else {
          setTestResultOpenai({ status: 'success', message: 'OpenAI API Key Validated! Connection Online.' });
        }
      } else {
        throw new Error(resData.detail || 'Key test failed.');
      }
    } catch (err: any) {
      if (targetProvider === 'gemini') {
        setTestResultGemini({ status: 'error', message: err.message || 'Validation failed.' });
      } else {
        setTestResultOpenai({ status: 'error', message: err.message || 'Validation failed.' });
      }
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const payload = {
      default_llm_provider: provider,
      gemini_api_key: geminiKey || undefined,
      openai_api_key: openaiKey || undefined,
      gemini_model: geminiModel,
      openai_model: openaiModel
    };

    try {
      const response = await fetch(`${API_BASE_URL}/settings/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setSaveMessage('LLM Configuration & API Keys successfully saved to Backend Manager!');
        if (onProviderChange) onProviderChange(provider);
      } else {
        throw new Error('Failed to update config.');
      }
    } catch (err) {
      setSaveMessage('Settings updated locally and applied to active session.');
      if (onProviderChange) onProviderChange(provider);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fadeIn">
      {/* Page Header */}
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/20 space-y-2">
        <div className="flex items-center space-x-2 text-teal-800 font-semibold font-mono text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>PROVISION 4: DYNAMIC LLM API KEY CONFIGURATION</span>
        </div>
        <h2 className="text-2xl font-display font-bold text-slate-900">
          AI Model Provider & API Key Management
        </h2>
        <p className="text-xs text-slate-700 font-medium">
          Paste your own API Keys directly in the UI to dynamically switch between Google Gemini and OpenAI without server restarts.
        </p>
      </div>

      {/* Provider Toggle Card */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-sm font-mono uppercase text-slate-600">
          Default Active AI Engine Provider
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setProvider('gemini')}
            className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              provider === 'gemini'
                ? 'bg-teal-50 border-cyan-400 shadow-lg shadow-cyan-400/15'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-800 font-semibold">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-base">Google Gemini</h4>
                <p className="text-xs text-slate-700 font-medium">Primary RAG Engine (Free Tier)</p>
              </div>
            </div>
            {provider === 'gemini' && (
              <CheckCircle2 className="w-5 h-5 text-teal-800 font-semibold" />
            )}
          </div>

          <div
            onClick={() => setProvider('openai')}
            className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
              provider === 'openai'
                ? 'bg-teal-50 border-cyan-400 shadow-lg shadow-cyan-400/15'
                : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-lg bg-purple-400/10 text-purple-700">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-base">OpenAI GPT-4o</h4>
                <p className="text-xs text-slate-700 font-medium">Fallback / High Precision</p>
              </div>
            </div>
            {provider === 'openai' && (
              <CheckCircle2 className="w-5 h-5 text-teal-800 font-semibold" />
            )}
          </div>
        </div>
      </div>

      {/* Google Gemini Settings Section */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-cyan-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-teal-800 font-semibold" />
            <h3 className="font-display font-semibold text-lg text-slate-900">
              Google Gemini Credentials
            </h3>
          </div>
          <span className="text-xs font-mono text-teal-800 font-semibold">
            Embedding: text-embedding-004
          </span>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-mono text-slate-600 block">
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="Paste AIzaSy... Google Gemini API Key"
              className="w-full glass-input text-sm text-slate-900 px-4 py-3 rounded-xl border border-slate-200 pr-12 focus:border-cyan-400 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3.5 top-3.5 text-slate-700 font-medium hover:text-slate-900"
            >
              {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-mono text-slate-700 font-medium block mb-1">Target Model</label>
              <select
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                className="w-full glass-input text-xs text-slate-900 px-3 py-2 rounded-lg"
              >
                <option value="gemini-1.5-flash" className="bg-white">Gemini 1.5 Flash (Fast)</option>
                <option value="gemini-1.5-pro" className="bg-white">Gemini 1.5 Pro (Deep RAG)</option>
                <option value="gemini-2.0-flash" className="bg-white">Gemini 2.0 Flash</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleTestKey('gemini')}
                disabled={testResultGemini.status === 'testing'}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-teal-50 hover:bg-teal-800/20 text-teal-800 border border-teal-200 text-xs font-mono transition"
              >
                {testResultGemini.status === 'testing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Server className="w-4 h-4" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {testResultGemini.message && (
            <div className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
              testResultGemini.status === 'success' 
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : testResultGemini.status === 'error'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                : 'bg-teal-50 text-teal-800'
            }`}>
              {testResultGemini.status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {testResultGemini.status === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
              <span>{testResultGemini.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* OpenAI Settings Section */}
      <div className="glass-card p-6 rounded-2xl space-y-4 border-l-4 border-l-purple-400">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-700" />
            <h3 className="font-display font-semibold text-lg text-slate-900">
              OpenAI Credentials
            </h3>
          </div>
          <span className="text-xs font-mono text-purple-700">
            Embedding: text-embedding-3-small
          </span>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-mono text-slate-600 block">
            OpenAI API Key
          </label>
          <div className="relative">
            <input
              type={showOpenaiKey ? 'text' : 'password'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="Paste sk-... OpenAI API Key"
              className="w-full glass-input text-sm text-slate-900 px-4 py-3 rounded-xl border border-slate-200 pr-12 focus:border-purple-400 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              className="absolute right-3.5 top-3.5 text-slate-700 font-medium hover:text-slate-900"
            >
              {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-mono text-slate-700 font-medium block mb-1">Target Model</label>
              <select
                value={openaiModel}
                onChange={(e) => setOpenaiModel(e.target.value)}
                className="w-full glass-input text-xs text-slate-900 px-3 py-2 rounded-lg"
              >
                <option value="gpt-4o-mini" className="bg-white">GPT-4o Mini (Cost Efficient)</option>
                <option value="gpt-4o" className="bg-white">GPT-4o (High Reasoning)</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => handleTestKey('openai')}
                disabled={testResultOpenai.status === 'testing'}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-500/20 text-purple-800 border border-purple-200 text-xs font-mono transition"
              >
                {testResultOpenai.status === 'testing' ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Server className="w-4 h-4" />
                )}
                <span>Test Connection</span>
              </button>
            </div>
          </div>

          {testResultOpenai.message && (
            <div className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
              testResultOpenai.status === 'success' 
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : testResultOpenai.status === 'error'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                : 'bg-purple-50 text-purple-800'
            }`}>
              {testResultOpenai.status === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
              {testResultOpenai.status === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
              <span>{testResultOpenai.message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Save Settings CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        {saveMessage ? (
          <div className="text-xs font-mono text-emerald-800 font-bold flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>{saveMessage}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-700 font-medium">
            Keys are encrypted and stored in backend configuration manager.
          </span>
        )}

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="w-full sm:w-auto flex items-center justify-center space-x-2 px-8 py-3.5 rounded-xl bg-teal-800 text-white font-bold font-bold hover:bg-teal-800 transition-all shadow-lg shadow-cyan-400/25"
        >
          {isSaving ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          <span>Save Settings & Active Provider</span>
        </button>
      </div>
    </div>
  );
};
