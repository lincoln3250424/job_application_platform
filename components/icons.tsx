type IconProps = {
  className?: string;
};

function IconBase({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" />
    </IconBase>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </IconBase>
  );
}

export function FileTextIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </IconBase>
  );
}

export function BarChartIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </IconBase>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
      <path d="M2 14h4M10 11h4M18 16h4" />
    </IconBase>
  );
}
