import Image from "next/image";

interface SealLogoProps {
  size?: number;
  className?: string;
  decorative?: boolean;
}

/** Selo institucional único para páginas web. Favicon e PDFs permanecem isolados. */
export function SealLogo({ size = 72, className, decorative = false }: SealLogoProps) {
  return (
    <Image
      src="/seal-arca.svg"
      width={size}
      height={size}
      unoptimized
      className={className}
      alt={decorative ? "" : "Logo Arca Nossa Senhora da Providência"}
      aria-hidden={decorative || undefined}
    />
  );
}
