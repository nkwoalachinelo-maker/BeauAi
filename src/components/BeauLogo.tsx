export function BeauLogo({ className = "size-8" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`bg-gilded inline-flex items-center justify-center rounded-2xl text-primary-foreground ${className}`}
    >
      <svg viewBox="0 0 24 24" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="1.7">
        <circle cx="12" cy="10" r="6" />
        <path d="M12 16v5M9 21h6" strokeLinecap="round" />
      </svg>
    </span>
  );
}
