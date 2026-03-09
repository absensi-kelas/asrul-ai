import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AILogo = ({ className }: { className?: string }) => (
  <div className={cn("bg-black flex flex-col items-center justify-center leading-none font-sans select-none shrink-0", className)}>
    <div className="flex flex-col items-start translate-y-[1px]">
      <span className="text-white font-black text-[9px] tracking-tighter leading-none">ASRUL</span>
      <span className="text-white font-bold text-[6px] self-end leading-none -mt-0.5 mr-[1px]">.ai</span>
    </div>
  </div>
);
