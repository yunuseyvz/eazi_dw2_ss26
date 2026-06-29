'use client';

import { motion } from 'framer-motion';
import { Footprints, ArrowRight } from 'lucide-react';

interface Route {
  id: string;
  label: string;
  minutes: number;
  steps: number;
  highlighted?: boolean;
}

export default function AlternativeRoute({ routes }: { routes: Route[] }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8a8a8a] mb-1">Alternative</p>
        <h3 className="text-lg font-bold">Treppe & Rolltreppe</h3>
      </div>
      <div className="flex flex-col gap-2.5">
        {routes.map((route, i) => (
          <motion.div
            key={route.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between p-3.5 rounded-xl"
            style={{
              background: route.highlighted ? '#e6f0f8' : 'transparent',
              border: route.highlighted ? '2px solid #0068b4' : '1px solid #d9d9d9',
            }}
          >
            <div className="flex items-center gap-3.5">
              <div
                className="flex items-center justify-center w-[38px] h-[38px] rounded-xl"
                style={{
                  background: route.highlighted ? '#0068b4' : '#f5f5f5',
                  color: route.highlighted ? '#fff' : '#5a5a5a',
                }}
              >
                <Footprints size={18} strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-bold text-[15px]">{route.label}</p>
                <p className="text-[13px] text-[#8a8a8a] mt-0.5">{route.steps} Stufen</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-lg tabular-nums" style={{ color: route.highlighted ? '#0068b4' : '#1a1a1a' }}>
                {route.minutes} min
              </span>
              <ArrowRight size={18} style={{ color: route.highlighted ? '#0068b4' : '#8a8a8a' }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
