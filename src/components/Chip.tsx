import type { ReactNode } from "react";

interface ChipProps {
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: "md" | "sm";
  tone?: "terra" | "olive";
}

// Toggle button used for every tab/filter/tag choice. md is a 44 px touch target.
export function Chip({ pressed = false, onClick, children, size = "md", tone = "terra" }: ChipProps) {
  const on = tone === "olive" ? "border-lime-800 bg-lime-800 text-white" : "border-orange-700 bg-orange-700 text-white";
  const off = "border-stone-300 bg-white text-stone-800";
  const dims = size === "md" ? "h-11 px-[18px] text-[15px]" : "h-9 px-3.5 text-sm";
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`shrink-0 rounded-full border transition active:scale-95 ${dims} ${pressed ? `${on} font-semibold` : `${off} font-medium`}`}
    >
      {children}
    </button>
  );
}
