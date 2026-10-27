/**
 * ==============================================================================
 * COMPONENT: MobileNavRail.tsx
 * Path: src/components/MobileNavRail.tsx
 * Description: Thin fixed rail for portal mobile navigation. Sits at the left
 *              edge (out of the layout flow) and shows a centered toggle arrow
 *              that stays put in both collapsed and expanded states. Per-portal
 *              colors are supplied through `className`.
 * ==============================================================================
 */

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface MobileNavRailProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

export default function MobileNavRail({ open, onToggle, className = "" }: MobileNavRailProps) {
  return (
    <div
      className={`fixed inset-y-0 left-0 z-50 w-8 flex flex-col items-center justify-center border-r ${className}`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Collapse navigation menu" : "Expand navigation menu"}
        aria-expanded={open}
        className="w-full min-h-11 px-2 py-3 flex items-center justify-center transition-colors cursor-pointer"
      >
        {open ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
}
