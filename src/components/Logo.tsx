/** The mark: a picture squeezed inside its frame's corners. Same drawing as
 * public/icon.svg. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path
        d="M7 12V7h5M20 7h5v5M25 20v5h-5M12 25H7v-5"
        fill="none"
        stroke="#fff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="12" y="12" width="8" height="8" rx="1.75" fill="#fff" />
    </svg>
  )
}
