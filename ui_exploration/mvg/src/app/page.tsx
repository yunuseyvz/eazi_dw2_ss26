'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import ElevatorStatus from '@/components/ElevatorStatus';
import AlternativeRoute from '@/components/AlternativeRoute';
import CrowdIndicator from '@/components/CrowdIndicator';
import { WebcamCapture } from '@aufzug/shared';
import DetectionBanner from '@/components/DetectionBanner';
import ConnectionStatus from '@/components/ConnectionStatus';

export default function Home() {
  const [now, setNow] = useState(new Date());

  // Elevator state
  const [floor, setFloor] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down' | 'idle'>('idle');
  const [doorsOpen, setDoorsOpen] = useState(true);
  const [waitTime, setWaitTime] = useState(15);

  // Crowd state
  const [crowdLevel, setCrowdLevel] = useState(65);
  const [isPeak, setIsPeak] = useState(true);

  // Detection state
  const [detected, setDetected] = useState(false);
  const [detectedTypes, setDetectedTypes] = useState<string[]>([]);
  const [lastDetectedAt, setLastDetectedAt] = useState<number>(0);
  const [lastRawResponse, setLastRawResponse] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [scanning, setScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const isRequesting = useRef(false);
  const errorCount = useRef(0);
  const prevDetected = useRef(false);

  // Sound cue on new detection
  useEffect(() => {
    if (detected && !prevDetected.current) {
      // Play chime (two-tone E5→C5, like a doorbell)
      try {
        const ctx = new AudioContext();
        [659.25, 523.25].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.15);
          osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
        setTimeout(() => ctx.close(), 1000);
      } catch { /* audio unavailable */ }
    }
    prevDetected.current = detected;
  }, [detected, detectedTypes]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Elevator simulation
  useEffect(() => {
    const t = setInterval(() => {
      setDoorsOpen((prev) => {
        if (prev) {
          setDirection(Math.random() > 0.5 ? 'up' : 'down');
          return false;
        }
        setFloor((f) => {
          const dir = direction === 'up' ? 1 : -1;
          const next = f + dir;
          if (next < 0) { setDirection('up'); return 0; }
          if (next > 3) { setDirection('down'); return 3; }
          return next;
        });
        setTimeout(() => { setDoorsOpen(true); setDirection('idle'); }, 800);
        return prev;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [direction]);

  // Wait time jitter
  useEffect(() => {
    const t = setInterval(() => {
      setWaitTime((w) => Math.max(10, Math.min(120, w + Math.floor(Math.random() * 15) - 7)));
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Crowd simulation
  useEffect(() => {
    const t = setInterval(() => {
      setCrowdLevel((c) => {
        const next = Math.max(10, Math.min(95, c + Math.floor(Math.random() * 10) - 5));
        setIsPeak(next > 55);
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Clear detection after 60s
  useEffect(() => {
    const t = setInterval(() => {
      if (detected && Date.now() - lastDetectedAt > 60000) {
        setDetected(false);
        setDetectedTypes([]);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [detected, lastDetectedAt]);

  const handleFrame = useCallback(async (base64Image: string) => {
    if (isRequesting.current) return;
    isRequesting.current = true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        errorCount.current += 1;
        const errText = await res.text();
        if (errorCount.current <= 3) console.warn('API error:', res.status, errText);
        setConnectionStatus('disconnected');
        setLastRawResponse(`HTTP ${res.status}: ${errText.slice(0, 120)}`);
        return;
      }

      errorCount.current = 0;
      setConnectionStatus('connected');
      const data = await res.json();
      console.log('[detect]', data);
      setLastRawResponse(JSON.stringify(data));

      if (data.detected) {
        setDetected(true);
        setDetectedTypes(data.types || []);
        setLastDetectedAt(Date.now());
      }
    } catch (err: any) {
      errorCount.current += 1;
      if (errorCount.current <= 3) console.warn('Request failed:', err);
      setConnectionStatus('disconnected');
      if (err?.message) setLastRawResponse(err.message);
    } finally {
      isRequesting.current = false;
    }
  }, []);

  const routes = [
    { id: 'stairs', label: 'Treppe', minutes: 2, steps: 48, highlighted: isPeak && !detected },
    { id: 'escalator', label: 'Rolltreppe', minutes: 1, steps: 0, highlighted: false },
  ];

  const handleFakeDetection = () => {
    setDetected(true);
    setDetectedTypes(['wheelchair', 'stroller']);
    setLastDetectedAt(Date.now());
    setLastRawResponse('{"detected":true,"types":["wheelchair","stroller"]} (simuliert)');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header now={now} />

      <main className="flex-1 p-5 flex flex-col gap-4 max-w-[640px] w-full mx-auto">
        <WebcamCapture onFrame={handleFrame} intervalMs={2500} enabled={scanning} facingMode={facingMode} />

        <DetectionBanner detected={detected} types={detectedTypes} />

        {!detected && (
          <div
            className="rounded-xl py-4 px-5 font-semibold text-[15px] leading-relaxed flex items-center gap-3 text-white"
            style={{ background: isPeak ? '#f07d00' : '#008754' }}
          >
            <span className="text-xl">{isPeak ? '⚡' : '✓'}</span>
            {isPeak
              ? 'Stoßzeit: Bitte nutzen Sie Treppe oder Rolltreppe, wenn möglich.'
              : 'Aktuell geringe Auslastung — Aufzug steht allen zur Verfügung.'}
          </div>
        )}

        <ElevatorStatus floor={floor} direction={direction} doorsOpen={doorsOpen} waitTime={waitTime} />
{/* 
        <CrowdIndicator level={crowdLevel} isPeak={isPeak} />
*/}
        <AlternativeRoute routes={routes} />

{/* 
Priority lane is always visible to show who gets prioritized, but the active IDs update based on detection and peak status 
        <PriorityLane activeIds={activePriorityIds} />
*/}
        <ConnectionStatus status={connectionStatus} />

        <div className="mt-auto pt-3 text-center text-xs text-[#8a8a8a] font-medium">
          <span className="block mb-1.5 text-[11px] font-mono text-[#8a8a8a] max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
            {lastRawResponse || 'Warte auf Antwort…'}
          </span>
          Prototyp — Design Workshop 2
        </div>

        {/* Dev controls — small, unobtrusive */}
        <div className="flex gap-2 justify-center pb-2">
          <button
            onClick={() => setScanning((s) => !s)}
            className="py-1.5 px-3 rounded-lg text-[11px] font-semibold border border-[#d9d9d9] bg-white text-[#5a5a5a] hover:bg-[#f5f5f5] transition-colors"
          >
            {scanning ? '⏸ Stop' : '▶ Scan'}
          </button>
          <button
            onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
            className="py-1.5 px-3 rounded-lg text-[11px] font-semibold border border-[#d9d9d9] bg-white text-[#5a5a5a] hover:bg-[#f5f5f5] transition-colors"
          >
            {facingMode === 'user' ? '🤳 Front' : '📷 Back'}
          </button>
          <button
            onClick={handleFakeDetection}
            className="py-1.5 px-3 rounded-lg text-[11px] font-semibold bg-[#0068b4] text-white hover:bg-[#004c8a] transition-colors"
          >
            🧪 Fake
          </button>
        </div>
      </main>
    </div>
  );
}

