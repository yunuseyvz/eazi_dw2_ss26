'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import ConnectionStatus from '@/components/ConnectionStatus';
import CycleButton, { type CycleState } from '@/components/CycleButton';
import StripControls, { type StripConfig } from '@/components/StripControls';
import DisclosureArrow from '@/components/DisclosureArrow';

const ESP_URL = process.env.NEXT_PUBLIC_ESP_URL ?? 'http://192.168.4.1';

type Effect = StripConfig['effect'];

type Status = {
  state: CycleState;
  brightness: number;
  numPixels: number;
  s1: StripConfig;
  s2: StripConfig;
  s3: StripConfig;
};

const DEFAULT_STATUS: Status = {
  state: 1,
  brightness: 40,
  numPixels: 1000,
  s1: { on: true, color: [0, 0, 255],     effect: 'solid' },
  s2: { on: true, color: [255, 255, 255], effect: 'solid' },
  s3: { on: true, color: [0, 0, 0],       effect: 'solid' },
};

export default function Home() {
  const [status, setStatus] = useState<Status>(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'unknown'>('unknown');
  const [lastRawResponse, setLastRawResponse] = useState('');
  const isRequesting = useRef(false);

  // Fetch current state on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${ESP_URL}/state`);
        if (!res.ok) return;
        const data = await res.json();
        setStatus(normalize(data));
        setConnectionStatus('connected');
        setLastRawResponse(JSON.stringify(data));
      } catch {
        setConnectionStatus('disconnected');
      }
    })();
  }, []);

  const send = useCallback(async (body: Record<string, unknown>) => {
    if (isRequesting.current) return;
    isRequesting.current = true;
    setBusy(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${ESP_URL}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        setConnectionStatus('disconnected');
        setLastRawResponse(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setStatus(normalize(data));
      setConnectionStatus('connected');
      setLastRawResponse(JSON.stringify(data));
    } catch (err) {
      setConnectionStatus('disconnected');
      if (err instanceof DOMException && err.name === 'AbortError') setLastRawResponse('Timeout');
      else if (err instanceof Error) setLastRawResponse(err.message);
      else setLastRawResponse('Fehler');
    } finally {
      isRequesting.current = false;
      setBusy(false);
    }
  }, []);

  const cycle = useCallback(() => {
    const next = (status.state === 1 ? 2 : 1) as CycleState; // 1↔2
    send({ state: next });
  }, [status.state, send]);

  const updateStrip = useCallback((which: 1 | 2 | 3, patch: Partial<StripConfig>) => {
    const cfg = which === 1 ? status.s1 : which === 2 ? status.s2 : status.s3;
    const body: Record<string, unknown> = {};
    if (patch.on !== undefined)      body[`s${which}_on`] = patch.on;
    if (patch.color !== undefined)   body[`s${which}_color`] = patch.color;
    if (patch.effect !== undefined)  body[`s${which}_effect`] = patch.effect;
    setStatus((s) => ({
      ...s,
      [`s${which}`]: { ...cfg, ...patch },
    } as Status));
    send(body);
  }, [status, send]);

  const updateBrightness = useCallback((brightness: number) => {
    setStatus((s) => ({ ...s, brightness }));
    send({ brightness });
  }, [send]);

  const updateNumPixels = useCallback((numPixels: number) => {
    setStatus((s) => ({ ...s, numPixels }));
    send({ numPixels });
  }, [send]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header/>

      <main className="flex-1 p-5 flex flex-col gap-4 max-w-[640px] w-full mx-auto">
        <CycleButton state={status.state} busy={busy} onCycle={cycle} />

        <details className="rounded-xl bg-white border border-[#e5e5e5] shadow-sm overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 font-bold text-[15px] select-none flex items-center gap-3">
            <DisclosureArrow />
            <span className="flex-1">Individuell</span>
          </summary>
          <div className="p-4 pt-0 flex flex-col gap-3">
            <StripControls
              id={1}
              label="Strip 1 — Umrandung"
              cfg={status.s1}
              disabled={busy}
              onChange={(p) => updateStrip(1, p)}
            />
            <StripControls
              id={2}
              label="Strip 2 — Querstreifen"
              cfg={status.s2}
              disabled={busy}
              onChange={(p) => updateStrip(2, p)}
            />
            <StripControls
              id={3}
              label="Strip 3 — Rollstuhl-Symbol"
              cfg={status.s3}
              disabled={busy}
              onChange={(p) => updateStrip(3, p)}
              simple
            />
          </div>
        </details>

        <details className="rounded-xl bg-white border border-[#e5e5e5] shadow-sm overflow-hidden">
          <summary className="cursor-pointer px-5 py-4 font-bold text-[15px] select-none flex items-center gap-3">
            <DisclosureArrow />
            <span>Einstellungen</span>
          </summary>
          <div className="p-4 pt-0 flex flex-col gap-3">
            <p className="text-[12px] text-[#8a8a8a] px-1">
              Gelten nur für Strip 1 und 2.
            </p>
            <div className="rounded-xl bg-[#f9f9f9] border border-[#e5e5e5] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[15px]">Helligkeit</span>
                <span className="tabular-nums text-[12px] font-semibold text-[#5a5a5a]">
                  {status.brightness}/255
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={status.brightness}
                disabled={busy}
                onChange={(e) => updateBrightness(parseInt(e.target.value, 10))}
                className="w-full accent-[#0068b4]"
              />
            </div>

            <div className="rounded-xl bg-[#f9f9f9] border border-[#e5e5e5] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[15px]">LED-Anzahl</span>
              
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={status.numPixels}
                  disabled={busy}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v > 0) updateNumPixels(v);
                  }}
                  className="w-24 px-3 py-2 rounded-md border border-[#d9d9d9] text-[15px] font-semibold tabular-nums disabled:opacity-50"
                />
               
              </div>
            </div>
          </div>
        </details>

        <ConnectionStatus status={connectionStatus} />

        <div className="mt-auto pt-3 text-center text-xs text-[#8a8a8a] font-medium">
          <span className="block mb-1.5 text-[11px] font-mono text-[#8a8a8a] max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
            {lastRawResponse || `Ziel: ${ESP_URL}`}
          </span>
          Prototyp — Design Workshop 2
        </div>
      </main>
    </div>
  );
}

function normalize(data: unknown): Status {
  const d = (data ?? {}) as Record<string, unknown>;
  const rawState = d.state;
  const s: CycleState = (rawState === 1 || rawState === 2) ? rawState : 1;
  const brightness = typeof d.brightness === 'number' ? d.brightness : 40;
  const numPixels = typeof d.numPixels === 'number' && d.numPixels > 0 ? d.numPixels : 1000;
  const VALID: Effect[] = ['solid', 'blink', 'fade', 'chase', 'rainbow', 'sparkle'];
  const makeStrip = (key: 's1' | 's2' | 's3', fallback: StripConfig): StripConfig => {
    const src = (d[key] ?? {}) as Record<string, unknown>;
    const eff = (src.effect as Effect) ?? fallback.effect;
    return {
      on: typeof src.on === 'boolean' ? src.on : fallback.on,
      color: Array.isArray(src.color) && src.color.length === 3
        ? src.color.map((n: number) => (n | 0)) as [number, number, number]
        : fallback.color,
      effect: VALID.includes(eff) ? eff : 'solid',
    };
  };
  return {
    state: s,
    brightness,
    numPixels,
    s1: makeStrip('s1', { on: true,  color: [0, 0, 255],     effect: 'solid' }),
    s2: makeStrip('s2', { on: true,  color: [255, 255, 255], effect: 'solid' }),
    s3: makeStrip('s3', { on: true,  color: [0, 0, 0],       effect: 'solid' }),
  };
}