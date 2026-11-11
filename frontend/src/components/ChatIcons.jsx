const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

export const BusIcon = (props) => (
  <svg {...iconProps} {...props}>
    <rect x="4" y="3" width="16" height="15" rx="3" />
    <path d="M4 11h16M8 21v-3M16 21v-3" />
    <circle cx="8" cy="14.5" r="0.6" fill="currentColor" />
    <circle cx="16" cy="14.5" r="0.6" fill="currentColor" />
  </svg>
);

export const CloseIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const RefreshIcon = () => (
  <svg {...iconProps}>
    <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.2L3 16M3 21v-5h5" />
  </svg>
);

export const SendIcon = () => (
  <svg {...iconProps}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export const ChatIcon = (props) => (
  <svg {...iconProps} width={24} height={24} {...props}>
    <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
  </svg>
);
