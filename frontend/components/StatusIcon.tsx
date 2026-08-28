type StatusIconProps = {
  name: string;
  className?: string;
  selected?: boolean;
};

const paths: Record<string, React.ReactNode> = {
  "mood-rain": (
    <>
      <path d="M7.5 14.5h8.8a3.7 3.7 0 0 0 .2-7.4 5.5 5.5 0 0 0-10.4 1.7 2.9 2.9 0 0 0 1.4 5.7Z" />
      <path d="m9 17-1 2m5-2-1 2m5-2-1 2" />
    </>
  ),
  "mood-cloud": (
    <>
      <path d="M6.7 15.5h10a3.8 3.8 0 0 0 .1-7.6A5.7 5.7 0 0 0 6 9.7a3 3 0 0 0 .7 5.8Z" />
      <path d="M9 19h6" />
    </>
  ),
  "mood-horizon": (
    <>
      <path d="M4 15.5h16M7 12a5 5 0 0 1 10 0" />
      <path d="M12 4.5v2M5.8 7.2l1.4 1.4m11-1.4-1.4 1.4" />
    </>
  ),
  "mood-sun": (
    <>
      <circle cx="12" cy="12" r="3.8" />
      <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4m0-12.8L17 7M7 17l-1.4 1.4" />
    </>
  ),
  "mood-spark": (
    <>
      <path d="M12 3.2c.7 4.8 3 7.1 7.8 7.8-4.8.7-7.1 3-7.8 7.8-.7-4.8-3-7.1-7.8-7.8 4.8-.7 7.1-3 7.8-7.8Z" />
      <path d="M19 3v3m1.5-1.5h-3" />
    </>
  ),
  "energy-empty": (
    <>
      <rect x="4" y="7" width="15" height="10" rx="2.5" />
      <path d="M21 10v4M7 12h3" />
    </>
  ),
  "energy-low": (
    <>
      <rect x="4" y="7" width="15" height="10" rx="2.5" />
      <path d="M21 10v4M7 10v4" />
    </>
  ),
  "energy-steady": (
    <>
      <path d="M3.5 12h4l2-4 3.3 8 2.1-4h5.6" />
      <circle cx="12" cy="12" r="9" opacity=".35" />
    </>
  ),
  "energy-high": (
    <>
      <path d="m13.6 2.8-7 10.1h5l-1.2 8.3 7-10.1h-5l1.2-8.3Z" />
    </>
  ),
  "energy-spark": (
    <>
      <path d="M10.6 3 5.8 13h5l-1 8L18 10h-5l2-7h-4.4Z" />
      <path d="M19 3v3m1.5-1.5h-3" />
    </>
  ),
  "sleep-low": (
    <>
      <path d="M18.2 15.8A7.7 7.7 0 0 1 8.3 5.9a7.7 7.7 0 1 0 9.9 9.9Z" />
      <path d="m16.5 5.5 3-3m-3 0h3v3" />
    </>
  ),
  "sleep-calm": (
    <>
      <path d="M19.2 15.5A8.2 8.2 0 0 1 8.5 4.8a8.2 8.2 0 1 0 10.7 10.7Z" />
      <path d="M16 7h4l-4 4h4" />
    </>
  ),
  "sleep-rested": (
    <>
      <path d="M17.8 15.8A7.8 7.8 0 0 1 8.2 6.2a7.8 7.8 0 1 0 9.6 9.6Z" />
      <path d="m17 3 .5 1.5L19 5l-1.5.5L17 7l-.5-1.5L15 5l1.5-.5L17 3Zm4 6 .3.8.7.2-.7.3-.3.7-.3-.7-.7-.3.7-.2L21 9Z" />
    </>
  ),
  "body-clear": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.3 12.2 2.3 2.3 5.1-5.3" />
    </>
  ),
  "body-mild": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12h8" />
    </>
  ),
  "body-medium": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12h8M12 8v8" />
    </>
  ),
  "body-high": (
    <>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9v5m0 2.8v.2" />
    </>
  ),
};

export default function StatusIcon({ name, className = "", selected = false }: StatusIconProps) {
  return (
    <span className={`status-icon ${selected ? "is-selected" : ""} ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55"
        strokeLinecap="round" strokeLinejoin="round">
        {paths[name] || paths["mood-horizon"]}
      </svg>
    </span>
  );
}
