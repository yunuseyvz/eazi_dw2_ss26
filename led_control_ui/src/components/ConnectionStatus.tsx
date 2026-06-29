'use client';

import { motion } from 'framer-motion';

export default function ConnectionStatus({ status }: { status: 'connected' | 'disconnected' | 'unknown' }) {
  const color = status === 'connected' ? '#008754' : status === 'disconnected' ? '#c1121c' : '#8a8a8a';
  const label = status === 'connected' ? 'ESP verbunden' : status === 'disconnected' ? 'ESP getrennt' : 'ESP …';
  return (
    <motion.div
      className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-0"
      style={{ color }}
      animate={{ opacity: 1 }}
      initial={{ opacity: 0 }}
    >
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {label}
    </motion.div>
  );
}