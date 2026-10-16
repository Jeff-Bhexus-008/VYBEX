/** Original VYBEX mark: a rounded gradient tile with a play chevron + wordmark. */
export default function Logo({ compact = false }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id="vybex-mark" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B7A" />
            <stop offset="55%" stopColor="#E8384F" />
            <stop offset="100%" stopColor="#A81230" />
          </linearGradient>
        </defs>
        <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="url(#vybex-mark)" />
        <path d="M12.5 9.6v12.8c0 .9 1 1.5 1.8 1L24.6 17c.8-.5.8-1.6 0-2.1L14.3 8.6c-.8-.5-1.8.1-1.8 1z" fill="#F7F5FA" />
        <circle cx="7.6" cy="7.6" r="1.7" fill="#8B5CF6" />
      </svg>
      {!compact && (
        <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
          VYB<span className="text-primary">EX</span>
        </span>
      )}
    </span>
  );
}