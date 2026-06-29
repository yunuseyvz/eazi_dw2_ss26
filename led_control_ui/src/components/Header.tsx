'use client';

import { Lightbulb } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-[#1a1a1a] text-white py-4">
      <div className="max-w-[640px] mx-auto px-5 flex items-center gap-3">
        <div className="bg-white text-[#1a1a1a] font-extrabold text-sm py-1 px-2.5 rounded tracking-wide leading-none">
          LED
        </div>
        <div className="flex items-center gap-2">
          <Lightbulb size={20} strokeWidth={2.5} />
          <span className="font-semibold text-[15px] tracking-wide">Board-Prototyp</span>
        </div>
      </div>
    </header>
  );
}