/**
 * ==============================================================================
 * COMPONENT: BannerBackground.tsx
 * Path: src/components/BannerBackground.tsx
 * Description: Shared decorative background for full-width page banners
 *              (Calculator, Loan Status). Renders, bottom to top:
 *                1. Background photo
 *                2. Semi-transparent colour overlay (~80%)
 *                3. Soft, blurry floating golden orbs (no visible rings/borders)
 *              Must be placed inside a parent that is `relative overflow-hidden`.
 *              Banner text should sit above it using `relative z-20`.
 * ==============================================================================
 */

import React from "react";

interface BannerBackgroundProps {
  /** Public URL of the background image, e.g. "/officeImage.jpg" */
  image: string;
  /** Tailwind class for the overlay colour. Defaults to the brand blue at 65%. */
  overlayClassName?: string;
  /** Tailwind class for object position, e.g. "object-[center_35%]" or "object-center" */
  imagePosition?: string;
}

export default function BannerBackground({
  image,
  overlayClassName = "bg-[#0A2881]/65",
  imagePosition = "object-[center_35%]",
}: BannerBackgroundProps) {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ---------------------------------------------------------------------- */}
      {/* LAYER 1: BACKGROUND IMAGE                                              */}
      {/* Uses an <img> stretched with object-cover and framed to expand the view*/}
      {/* farther back, revealing more of the office scene and background.       */}
      {/* ---------------------------------------------------------------------- */}
      <img
        src={image}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover ${imagePosition} pointer-events-none select-none`}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* LAYER 2: SEMI-TRANSPARENT COLOUR OVERLAY (~65% theme blue)             */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className={`absolute inset-0 pointer-events-none ${overlayClassName}`}
      />

      {/* ---------------------------------------------------------------------- */}
      {/* LAYER 3: BLURRY FLOATING GOLDEN ORBS (no borders / visible rings)      */}
      {/* ---------------------------------------------------------------------- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {/* Orb 1 - Top left, large atmospheric glow */}
        <div className="absolute -top-10 left-[6%] w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-tr from-[#E4BA37]/25 via-[#F59E0B]/15 to-transparent blur-md animate-orb-1" />

        {/* Orb 2 - Bottom right, large glowing disc */}
        <div className="absolute -bottom-14 right-[10%] w-56 h-56 sm:w-68 sm:h-68 rounded-full bg-[#E4BA37]/20 blur-lg animate-orb-2" />

        {/* Orb 3 - Top centre, soft accent glow */}
        <div className="absolute -top-6 left-[48%] -translate-x-1/2 w-32 h-32 rounded-full bg-[#E4BA37]/15 blur-sm animate-orb-2" />
      </div>
    </div>
  );
}
