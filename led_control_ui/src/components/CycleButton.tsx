'use client';

import { motion } from 'framer-motion';

export type CycleState = 0 | 1 | 2;

const LABELS: Record<CycleState, string> = {
  0: 'AUS',
  1: 'Kein Bedarf',
  2: 'Rollstuhl',
};

const SUBLABELS: Record<CycleState, string> = {
  0: 'Tippen zum Starten',
  1: 'Tippen für nächsten Modus',
  2: 'Tippen für AUS',
};

const COLORS: Record<CycleState, string> = {
  0: '#1a1a1a',
  1: '#39c716',
  2: '#056dff',
};

export default function CycleButton({
  state,
  busy,
  onCycle,
}: {
  state: CycleState;
  busy: boolean;
  onCycle: () => void;
}) {
  const bg = COLORS[state];
  const fg = state === 2 ? '#5a3e0a' : state === 0 ? '#ffffff' : '#ffffff';
  return (
    <motion.button
      onClick={onCycle}
      disabled={busy}
      whileTap={{ scale: 0.97 }}
      animate={{ backgroundColor: bg, color: fg }}
      transition={{ duration: 0.35 }}
      className="w-full py-10 rounded-2xl shadow-md border-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ borderColor: bg }}
    >
      <div className="text-3xl font-extrabold tracking-tight">{LABELS[state]}</div>
      <div className="text-[12px] font-semibold uppercase tracking-wider opacity-80 mt-2">
        {busy ? '…' : SUBLABELS[state]}
      </div>
    </motion.button>
  );
}