'use client';

import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

interface Props {
  floor: number;
  direction: 'up' | 'down' | 'idle';
  doorsOpen: boolean;
  waitTime: number;
}

export default function ElevatorStatus({ floor, direction, doorsOpen, waitTime }: Props) {
  const DirIcon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;
  return (
    <div className="bg-white rounded-xl p-6 flex items-center justify-between gap-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a] mb-2">Aufzug</p>
        <div className="flex items-baseline gap-2.5">
          <motion.span
            key={floor}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold leading-none tabular-nums text-[#0068b4]"
          >
            {floor === 0 ? 'EG' : `${floor}.OG`}
          </motion.span>
          <span className="text-sm font-medium text-[#5a5a5a]">
            {doorsOpen ? 'Türen offen' : 'Türen geschlossen'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        <div className="flex items-center justify-center w-[52px] h-[52px] rounded-xl bg-[#e6f0f8] text-[#0068b4]">
          <DirIcon size={28} strokeWidth={2.5} />
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a] mb-1">Wartezeit</p>
          <motion.span
            key={waitTime}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[28px] font-bold tabular-nums"
            style={{ color: waitTime > 60 ? '#f07d00' : '#1a1a1a' }}
          >
            {Math.ceil(waitTime / 10) * 10}s
          </motion.span>
        </div>
      </div>
    </div>
  );
}
