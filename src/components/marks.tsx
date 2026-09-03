import type { SVGProps } from "react";

type MarkProps = SVGProps<SVGSVGElement> & { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    "aria-hidden": true as const,
  };
}

export function FolioMark({ size = 28, ...rest }: MarkProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="4" y="7" width="24" height="19" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 12h24" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 7V5.8A1.8 1.8 0 0 1 9.8 4h5.4A1.8 1.8 0 0 1 17 5.8V7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 17h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
      <path d="M8 21h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
    </svg>
  );
}

export function ClockMark({ size = 20, ...rest }: MarkProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="1.7" />
      <path d="M16 9v8l5 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" />
    </svg>
  );
}

export function BuildingMark({ size = 20, ...rest }: MarkProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M7 28V8h18v20" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 28h24" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 12h2.2M15.4 12h2.2M19.8 12h2.2M11 16.5h2.2M15.4 16.5h2.2M19.8 16.5h2.2M11 21h2.2M15.4 21h2.2M19.8 21h2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function StampMark({ size = 20, ...rest }: MarkProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="5" y="8" width="22" height="16" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 16h14" stroke="currentColor" strokeWidth="1.7" />
      <path d="M11 12h10M11 20h8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function NoticeMark({ size = 20, ...rest }: MarkProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M9 5h10l6 6v16H9V5Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 5v6h6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13 16h10M13 20h7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
