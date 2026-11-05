import type { ImgHTMLAttributes } from "react";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  placeholder?: string;
};

/** `next/image` na galeria: `<img>` comum, servido de `public/` pelo Vite. */
export default function Image({ src, alt, fill, priority: _priority, quality: _quality, unoptimized: _unoptimized, placeholder: _placeholder, style, ...props }: ImageProps) {
  return (
    // Este é o substituto do próprio `next/image` na galeria.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      src={typeof src === "string" ? src : src.src}
      style={fill ? { position: "absolute", inset: 0, width: "100%", height: "100%", ...style } : style}
    />
  );
}
