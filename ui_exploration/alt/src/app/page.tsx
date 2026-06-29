'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Accessibility } from 'lucide-react';
import { WebcamCapture } from '@aufzug/shared';

export default function Home() {
  const [detected, setDetected] = useState(false);
  const [detectedTypes, setDetectedTypes] = useState<string[]>([]);
  const [lastDetectedAt, setLastDetectedAt] = useState<number>(0);
  const [scanning, setScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const isRequesting = useRef(false);
  const prevDetected = useRef(false);

  // Sound cue on new detection
  useEffect(() => {
    if (detected && !prevDetected.current) {
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

      if (!res.ok) return;

      const data = await res.json();
      console.log('[detect]', data);

      if (data.detected) {
        setDetected(true);
        setDetectedTypes(data.types || []);
        setLastDetectedAt(Date.now());
      }
    } catch (err: any) {
      console.warn('Request failed:', err);
    } finally {
      isRequesting.current = false;
    }
  }, []);

  const handleSimulate = () => {
    setDetected(true);
    setDetectedTypes(['wheelchair', 'stroller']);
    setLastDetectedAt(Date.now());
  };

  const bgColor = detected
    ? '#f5c842' // yellowish
    : '#87CEEB'; // light blue

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center transition-colors duration-700 ease-in-out"
      style={{ backgroundColor: bgColor }}
    >
      {/* Hidden webcam capture */}
      <WebcamCapture onFrame={handleFrame} intervalMs={2500} enabled={scanning} facingMode={facingMode} />

      {/* Center icon */}
      <div className="flex flex-col items-center gap-6 select-none">
        <Accessibility
          size={160}
          strokeWidth={1.5}
          className="transition-colors duration-700 ease-in-out"
          style={{ color: detected ? '#8b6914' : '#3b6b8b' }}
        />
        <div
          className="text-4xl font-bold tracking-tight text-center transition-colors duration-700"
          style={{ color: detected ? '#6b4c10' : '#1e4a5f' }}
        >
          {detected
            ? 'Zugangsbedarf erkannt'
            : 'Kein Zugangsbedarf'}
        </div>
        {detected && detectedTypes.length > 0 && (
          <div className="flex gap-3 mt-2">
            {detectedTypes.map((t) => (
              <span
                key={t}
                className="px-4 py-1.5 rounded-full text-sm font-semibold"
                style={{ background: 'rgba(0,0,0,0.12)', color: '#5a3e0a' }}
              >
                {t === 'wheelchair' ? 'Rollstuhl' : 'Kinderwagen'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-8 flex gap-3">
        <button
          onClick={() => setScanning((s) => !s)}
          className="px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-transform active:scale-95"
          style={{ background: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }}
        >
          {scanning ? '⏸ Stop' : '▶ Scan'}
        </button>
        <button
          onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
          className="px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-transform active:scale-95"
          style={{ background: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }}
        >
          {facingMode === 'user' ? '🤳 Front' : '📷 Back'}
        </button>
        <button
          onClick={handleSimulate}
          className="px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-transform active:scale-95"
          style={{ background: 'rgba(0,0,0,0.15)', color: '#1a1a1a' }}
        >
          🦽 Fake
        </button>
      </div>
    </div>
  );
}
