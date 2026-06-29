'use client';

import { motion } from 'framer-motion';
import { Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function CrowdIndicator({ level, isPeak }: { level: number; isPeak: boolean }) {
  const Trend = isPeak ? TrendingUp : TrendingDown;
  const color = level > 75 ? '#f07d00' : level > 40 ? '#0068b4' : '#008754';
  const label = level > 75 ? 'Stark frequentiert' : level > 40 ? 'Mäßig frequentiert' : 'Geringe Frequenz';

  return (
    <div className="bg-white rounded-xl p-6 flex items-center justify-between gap-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl" style={{ background: `${color}15`, color }}>
          <Users size={24} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a] mb-0.5">Aktuelle Situation</p>
          <h3 className="text-base font-bold" style={{ color }}>{label}</h3>
        </div>
      </div>
      <div className="flex items-center gap-3.5">
        {isPeak && (
          <div className="flex items-center gap-1.5 bg-[#f07d00] text-white py-1.5 px-3 rounded-lg font-bold text-[13px]">
            <Clock size={14} strokeWidth={2.5} />
            Stoßzeit
          </div>
        )}
        <motion.div animate={{ rotate: isPeak ? [0, -10, 10, 0] : 0 }} transition={{ repeat: isPeak ? Infinity : 0, duration: 2 }}>
          <Trend size={22} color={color} strokeWidth={2.5} />
        </motion.div>
      </div>
    </div>
  );
}
