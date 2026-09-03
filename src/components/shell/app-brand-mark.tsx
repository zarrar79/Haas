type AppBrandMarkProps = {
  className?: string;
  size?: number;
};

/** Hex network mark — cyber/training, not medical. Theme via CSS vars. */
export function AppBrandMark({ className = "", size = 40 }: AppBrandMarkProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center text-[var(--sidebar-accent)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon
          points="12,2 21,7 21,17 12,22 3,17 3,7"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          fill="none"
          opacity="0.35"
        />
        <circle cx="12" cy="6" r="1.35" fill="currentColor" />
        <circle cx="17.2" cy="9" r="1.35" fill="currentColor" />
        <circle cx="17.2" cy="15" r="1.35" fill="currentColor" />
        <circle cx="12" cy="18" r="1.35" fill="currentColor" />
        <circle cx="6.8" cy="15" r="1.35" fill="currentColor" />
        <circle cx="6.8" cy="9" r="1.35" fill="currentColor" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path
          d="M12 7.35V9.65M14.85 9.65L13.05 10.7M14.85 14.35L13.05 13.3M12 14.65V12.35M9.15 14.35L10.95 13.3M9.15 9.65L10.95 10.7"
          stroke="currentColor"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </span>
  );
}
