import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

/**
 * Unified emblem representing all natural resources:
 * Globe ring (global atlas), faceted crystal (minerals, gems, elements),
 * mountain/soil strata (rocks, ores, soils, energy), botanical leaf (forests),
 * and flowing river waves (water resources).
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 34, className = '' }) => {
  const clipId = React.useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="32" cy="32" r="26" />
        </clipPath>
        <linearGradient id={`${clipId}-sky`} x1="12" y1="6" x2="52" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="100%" stopColor="#e0f2fe" />
        </linearGradient>
        <linearGradient id={`${clipId}-crystal`} x1="22" y1="10" x2="36" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
      </defs>

      {/* Subtle circular sky backdrop inside globe */}
      <circle cx="32" cy="32" r="26" fill={`url(#${clipId}-sky)`} />

      <g clipPath={`url(#${clipId})`}>
        {/* Solar / Energy glow */}
        <circle cx="44" cy="17" r="5" fill="#fbbf24" opacity="0.9" />

        {/* Geological mountain & rock/ore peaks */}
        <path d="M4 42L18 24L31 40L40 31L54 44H4V42Z" fill="#334155" />
        <path d="M18 24L23 31L18 33L13 31L18 24Z" fill="#94a3b8" opacity="0.55" />

        {/* Rich soil & mineral strata band */}
        <path d="M4 41C16 38 30 43 44 40C51 38.5 57 39.5 60 41V48H4V41Z" fill="#b45309" opacity="0.88" />

        {/* Faceted Mineral / Gemstone Crystal (center-left hero accent) */}
        <path d="M27 11L35 19L27 33L19 19L27 11Z" fill={`url(#${clipId}-crystal)`} stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M27 11L35 19H19L27 11Z" fill="#5eead4" opacity="0.7" />
        <path d="M27 11V33" stroke="#ccfbf1" strokeWidth="0.9" opacity="0.85" />

        {/* Botanical Leaf (Forests & Agriculture) */}
        <path
          d="M52 21C43 21 37 27 37 36C46 36 52 30 52 21Z"
          fill="#059669"
          stroke="#ffffff"
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path d="M37 36C41 31 46 26 51 22" stroke="#a7f3d0" strokeWidth="1.2" strokeLinecap="round" />

        {/* Flowing Hydrological Water Waves */}
        <path
          d="M4 45C12 42 20 42 28 45C36 48 44 48 60 44V60H4V45Z"
          fill="#0284c7"
        />
        <path
          d="M6 50C15 47.5 23 48 31 50.5C39 53 47 52.5 58 49.5"
          stroke="#7dd3fc"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M10 55C18 53 26 53.5 34 55.5C41 57 49 56.5 55 54.5"
          stroke="#bae6fd"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </g>

      {/* Outer Global Ring & Cardinal Compass Ticks */}
      <circle cx="32" cy="32" r="26.5" stroke="#0f766e" strokeWidth="2.4" />
      <path d="M32 2V6M32 58V62M2 32H6M58 32H62" stroke="#0f766e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};
