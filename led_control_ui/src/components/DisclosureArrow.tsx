'use client';

import { ChevronRight } from 'lucide-react';

export default function DisclosureArrow() {
  return (
    <ChevronRight
      size={20}
      strokeWidth={2.5}
      className="transition-transform duration-200 [details[open]_&]:rotate-90 text-[#5a5a5a]"
    />
  );
}