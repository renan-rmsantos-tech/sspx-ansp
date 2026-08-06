interface SealLogoProps {
  size?: number;
  className?: string;
}

export function SealLogo({ size = 72, className }: SealLogoProps) {
  const id = `seal-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Logo Arca N. S. da Providência"
      className={className}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="110" cy="110" r="84" />
        </clipPath>
        <radialGradient id={`${id}-bg`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1e2a4a" />
          <stop offset="100%" stopColor="#0f1729" />
        </radialGradient>
      </defs>
      <circle cx="110" cy="110" r="106" fill={`url(#${id}-bg)`} />
      <circle
        cx="110"
        cy="110"
        r="98"
        fill="none"
        stroke="#c9a84c"
        strokeWidth="0.6"
        opacity="0.35"
      />
      <image
        href="/base1.png"
        x="22"
        y="30"
        width="176"
        height="184"
        clipPath={`url(#${id}-clip)`}
        preserveAspectRatio="xMidYMid slice"
      />
      <circle
        cx="110"
        cy="110"
        r="84"
        fill="none"
        stroke="#0f1729"
        strokeWidth="12"
        opacity="0.2"
      />
      <path id={`${id}-top`} d="M 18,110 a 92,92 0 0,1 184,0" fill="none" />
      <text
        fill="#c9a84c"
        fontFamily="'Iowan Old Style','Charter','Palatino',Georgia,serif"
        fontSize="12.5"
        fontWeight="700"
        letterSpacing="0.18em"
      >
        <textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">
          ARCA
        </textPath>
      </text>
      <path id={`${id}-bot`} d="M 20,118 a 90,90 0 0,0 180,0" fill="none" />
      <text
        fill="#c9a84c"
        fontFamily="'Iowan Old Style','Charter','Palatino',Georgia,serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="0.14em"
      >
        <textPath href={`#${id}-bot`} startOffset="50%" textAnchor="middle">
          N. S. DA PROVIDÊNCIA
        </textPath>
      </text>
      {/* Gold ring painted after text so it sits on top of the arc lettering */}
      <circle
        cx="110"
        cy="110"
        r="106"
        fill="none"
        stroke="#c9a84c"
        strokeWidth="3"
      />
    </svg>
  );
}
