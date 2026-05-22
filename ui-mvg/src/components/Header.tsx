'use client';

import { motion } from 'framer-motion';
import { Train } from 'lucide-react';

function formatTime(date: Date) {
  return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function Header({ now }: { now: Date }) {
  return (
    <header className="bg-[#0068b4] text-white py-4">
      <div className="max-w-[640px] mx-auto px-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white text-[#0068b4] font-extrabold text-sm py-1 px-2.5 rounded tracking-wide leading-none">
            MVG
          </div>
          <div className="flex items-center gap-2">
            <Train size={20} strokeWidth={2.5} />
            <span className="font-semibold text-[15px] tracking-wide">Universität</span>
          </div>
        </div>
        <motion.div
          key={now.getMinutes()}
          initial={{ opacity: 0.6, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="tabular-nums font-bold text-[22px] tracking-wider"
        >
          {formatTime(now)}
        </motion.div>
      </div>
    </header>
  );
}
