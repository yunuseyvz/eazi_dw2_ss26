'use client';

import { motion } from 'framer-motion';

export type StripEffect = 'solid' | 'blink' | 'fade' | 'chase' | 'rainbow' | 'sparkle';
export type StripConfig = {
  on: boolean;
  color: [number, number, number];
  effect: StripEffect;
};

const EFFECTS: Array<{ id: StripEffect; label: string }> = [
  { id: 'solid',   label: 'Statisch' },
  { id: 'blink',   label: 'Blinken' },
  { id: 'fade',    label: 'Atmen' },
  { id: 'chase',   label: 'Lauflicht' },
  { id: 'rainbow', label: 'Bunt' },
  { id: 'sparkle', label: 'Funkeln' },
];

const SIMPLE_EFFECTS: Array<{ id: StripEffect; label: string }> = [
  { id: 'solid', label: 'Statisch' },
  { id: 'blink', label: 'Blinken' },
];

function rgbToHex([r, g, b]: [number, number, number]) {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export default function StripControls({
  id,
  label,
  cfg,
  disabled,
  onChange,
  simple = false,
}: {
  id: 1 | 2 | 3;
  label: string;
  cfg: StripConfig;
  disabled: boolean;
  onChange: (next: Partial<StripConfig>) => void;
  simple?: boolean;
}) {
  const accent = id === 1 ? '#0068b4' : id === 2 ? '#f5c842' : '#1a1a1a';
  return (
    <div className="rounded-xl bg-white border border-[#e5e5e5] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold text-[15px]">{label}</span>
        <button
          onClick={() => onChange({ on: !cfg.on })}
          disabled={disabled}
          className="relative w-12 h-7 rounded-full transition-colors disabled:opacity-50"
          style={{ background: cfg.on ? accent : '#d9d9d9' }}
          aria-label={`${label} an/aus`}
        >
          <motion.span
            className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
            animate={{ left: cfg.on ? 26 : 4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        </button>
      </div>

      <div className="flex items-center gap-3">
        {!simple && (
          <input
            type="color"
            value={rgbToHex(cfg.color)}
            disabled={disabled}
            onChange={(e) => onChange({ color: hexToRgb(e.target.value) })}
            className="w-10 h-10 rounded border border-[#d9d9d9] cursor-pointer disabled:opacity-50"
            aria-label="Farbe"
          />
        )}
        <div className={`flex-1 flex flex-wrap gap-1.5`}>
          {(simple ? SIMPLE_EFFECTS : EFFECTS).map((e) => (
            <button
              key={e.id}
              onClick={() => onChange({ effect: e.id })}
              disabled={disabled}
              className="px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50 flex-1 min-w-0"
              style={{
                background: cfg.effect === e.id ? accent : '#f0f0f0',
                color: cfg.effect === e.id ? '#fff' : '#5a5a5a',
              }}
            >
              {e.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}