'use client';

import { motion } from 'framer-motion';

export type CycleState = 1 | 2;

const LABELS: Record<CycleState, string> = {
  1: 'Kein Bedarf',
  2: 'Rollstuhlfahrer',
};

const SUBLABELS: Record<CycleState, string> = {
  1: 'Querstreifen grün — Tippen fuer Rollstuhlfahrer',
  2: 'Umrandung blau + Symbol — Tippen fuer Kein Bedarf',
};

const COLORS: Record<CycleState, string> = {
  1: '#22c55e',
  2: '#0068b4',
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
  const fg = state === 2 ? '#ffffff' : '#5a3e0a';
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