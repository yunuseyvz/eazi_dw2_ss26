'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Accessibility, Heart, Baby, Package, AlertCircle } from 'lucide-react';

const TYPE_MAP: Record<string, { label: string; icon: React.ElementType }> = {
  wheelchair: { label: 'Rollstuhl', icon: Accessibility },
  mobility_aid: { label: 'Gehhilfe', icon: Accessibility },
  stroller: { label: 'Kinderwagen', icon: Baby },
  senior: { label: 'Senior', icon: Heart },
  pregnant: { label: 'Schwanger', icon: Heart },
  heavy_luggage: { label: 'Schweres Gepäck', icon: Package },
};

export default function DetectionBanner({ detected, types }: { detected: boolean; types: string[] }) {
  return (
    <AnimatePresence>
      {detected && (
        <motion.div
          key="banner"
          initial={{ opacity: 0, scale: 0.92, y: -16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -12 }}
          transition={{ type: 'spring', stiffness: 350, damping: 22 }}
          className="bg-[#0068b4] text-white rounded-2xl p-7 flex flex-col gap-[18px] shadow-[0_12px_40px_rgba(0,104,180,0.45)] relative overflow-hidden"
        >
          {/* Pulsing ring */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-[3px] border-white/35 pointer-events-none"
            animate={{ opacity: [0.35, 0.8, 0.35] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />

          <div className="flex items-center gap-3.5">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0"
            >
              <AlertCircle size={26} strokeWidth={2.5} />
            </motion.div>
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[1.2px] opacity-90 mb-1">Erkannt</p>
              <p className="text-[22px] font-extrabold leading-[1.15]">Person mit Bedarf im Eingangsbereich</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {types.map((t) => {
              const info = TYPE_MAP[t] || { label: t, icon: Accessibility };
              const Icon = info.icon;
              return (
                <div key={t} className="flex items-center gap-2 bg-white/20 py-2 px-3.5 rounded-xl text-sm font-bold">
                  <Icon size={16} strokeWidth={2.5} />
                  {info.label}
                </div>
              );
            })}
          </div>

          <p className="text-[15px] font-semibold opacity-95 leading-relaxed">
            Aufzug wird priorisiert. Bitte geben Sie den Weg frei.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
