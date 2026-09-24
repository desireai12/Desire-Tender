'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, Globe2, Loader2 } from 'lucide-react';
import { STATE_PORTALS } from '@/lib/gepnic-crawler';

interface DataFreshnessBarProps {
  lastUpdated: string | null;
  onRefreshComplete: () => Promise<void> | void;
  className?: string;
  compact?: boolean;
}

const COOLDOWN_SECONDS = 120; // 2 minutes rate limit cooldown
const STORAGE_KEY = 'desire_last_govt_scan_timestamp';

// 36 NIC GePNIC Portals + 1 Dedicated Telangana Portal = 37 Automated Portals
// (Automatically excludes manual-only Gujarat, Karnataka, Chhattisgarh)
const AUTOMATED_SCAN_PORTALS: string[] = [
  ...Object.keys(STATE_PORTALS),
  'Telangana'
];
const TOTAL_AUTOMATED_PORTALS = AUTOMATED_SCAN_PORTALS.length; // Exactly 37

const DEFAULT_SCAN_KEYWORDS = [
  'Water Supply',
  'Solar',
  'STP or treatment',
  'Turnkey',
  'Augmentation',
  'JJM'
];

export const formatRelativeTime = (isoString: string | null): string => {
  if (!isoString) return 'Never';
  const timestamp = new Date(isoString).getTime();
  if (isNaN(timestamp)) return 'Recently';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
};

export const formatExactTimestampIST = (isoString: string | null): string => {
  if (!isoString) return 'No sync recorded';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return 'Recently';

  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
    return `${formatted} IST`;
  } catch {
    return d.toLocaleString('en-IN') + ' IST';
  }
};

export const isDataStale = (isoString: string | null, thresholdHours = 12): boolean => {
  if (!isoString) return true;
  const timestamp = new Date(isoString).getTime();
  if (isNaN(timestamp)) return true;
  const diffMs = Date.now() - timestamp;
  return diffMs > thresholdHours * 60 * 60 * 1000;
};

export const DataFreshnessBar: React.FC<DataFreshnessBarProps> = ({
  lastUpdated,
  onRefreshComplete,
  className = '',
  compact = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'info' | 'success' | 'warning' | 'error'>('info');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Initialize and tick cooldown timer from shared localStorage
  useEffect(() => {
    const checkCooldown = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const lastScanTime = parseInt(stored, 10);
          if (!isNaN(lastScanTime)) {
            const elapsedSec = Math.floor((Date.now() - lastScanTime) / 1000);
            const remaining = COOLDOWN_SECONDS - elapsedSec;
            if (remaining > 0) {
              setCooldownRemaining(remaining);
              return;
            }
          }
        }
      } catch {}
      setCooldownRemaining(0);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const stale = isDataStale(lastUpdated, 12);
  const relativeTime = formatRelativeTime(lastUpdated);
  const exactTime = formatExactTimestampIST(lastUpdated);

  const handleTriggerScan = useCallback(async () => {
    if (isScanning || cooldownRemaining > 0) return;

    setIsScanning(true);
    setStatusType('info');
    setStatusMessage(`Scanning ${TOTAL_AUTOMATED_PORTALS} government portals... this may take up to a minute`);

    try {
      const res = await fetch('/api/v1/scraper/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          states: AUTOMATED_SCAN_PORTALS,
          keywords: DEFAULT_SCAN_KEYWORDS,
          min_value_cr: 1.0,
          max_per_kw: 3
        })
      });

      const data = await res.json();

      // Record scan timestamp in localStorage for cooldown
      try {
        localStorage.setItem(STORAGE_KEY, Date.now().toString());
        setCooldownRemaining(COOLDOWN_SECONDS);
      } catch {}

      if (res.ok && data.success) {
        const respondedCount = data.states_scanned?.length || 0;
        const requestedCount = data.requested_states_count || TOTAL_AUTOMATED_PORTALS;
        if (data.partial_scan) {
          setStatusType('warning');
          setStatusMessage(
            `Scan partially completed — ${respondedCount} of ${requestedCount} portals responded (${data.total_matches_found || 0} tenders discovered in ${data.scan_duration_sec || 0}s).`
          );
        } else {
          setStatusType('success');
          setStatusMessage(
            `Scan complete — ${data.total_matches_found || 0} tenders updated across ${respondedCount} of ${requestedCount} portals in ${data.scan_duration_sec || 0}s.`
          );
        }
      } else {
        setStatusType('error');
        setStatusMessage(`Scan failed: ${data.message || data.error || 'Server error connecting to portals'}`);
      }

      // Re-fetch parent component data to update stats and timestamps
      await onRefreshComplete();
    } catch (err: any) {
      setStatusType('error');
      setStatusMessage(`Scan error: ${err.message || 'Network request failed'}`);
    } finally {
      setIsScanning(false);
      // Keep result status message visible for 8 seconds
      setTimeout(() => {
        setStatusMessage(null);
      }, 8000);
    }
  }, [isScanning, cooldownRemaining, onRefreshComplete]);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Freshness Indicator */}
        <div
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border font-mono transition-all ${
            stale
              ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200'
              : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300'
          }`}
          title={stale ? 'Data is over 12 hours old. Click Refresh Data to sync latest tenders from live portals.' : 'Data is fresh (< 12 hours old).'}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              stale ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'
            }`}
          />
          <div className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-semibold">Data last refreshed:</span>
            <span className="font-bold underline decoration-dotted">{relativeTime}</span>
            <span className="text-[11px] opacity-80">({exactTime})</span>
          </div>
          {stale && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 shrink-0">
              Stale
            </span>
          )}
        </div>

        {/* Right: Manual Refresh Button */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleTriggerScan}
            disabled={isScanning || cooldownRemaining > 0}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all text-xs cursor-pointer shadow-xs ${
              isScanning
                ? 'bg-blue-600 text-white cursor-not-allowed opacity-90'
                : cooldownRemaining > 0
                ? 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white border border-emerald-600 shadow-sm active:scale-95'
            }`}
            title={
              isScanning
                ? 'Government portal scan in progress...'
                : cooldownRemaining > 0
                ? `Portal scan cooldown active to prevent government portal rate limiting (${cooldownRemaining}s remaining)`
                : `Trigger manual scan across ${TOTAL_AUTOMATED_PORTALS} automated government portals (36 NIC GePNIC + Telangana)`
            }
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`}
            />
            <span>
              {isScanning
                ? 'Scanning Portals...'
                : cooldownRemaining > 0
                ? `Cooldown (${cooldownRemaining}s)`
                : 'Refresh Data'}
            </span>
          </button>
        </div>
      </div>

      {/* Dynamic Status / Progress Banner */}
      {statusMessage && (
        <div
          className={`px-3 py-2 rounded-xl text-xs flex items-center space-x-2 animate-fadeIn border ${
            statusType === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
              : statusType === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : statusType === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          {statusType === 'info' && <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-600" />}
          {statusType === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
          {statusType === 'warning' && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />}
          {statusType === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />}
          <span className="font-medium leading-tight">{statusMessage}</span>
        </div>
      )}
    </div>
  );
};
