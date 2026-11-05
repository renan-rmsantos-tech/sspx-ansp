import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname?: string; search?: string };
  children?: ReactNode;
  prefetch?: boolean | null;
  replace?: boolean;
  scroll?: boolean;
};

/** `next/link` na galeria: âncora comum que não sai do protótipo ao clicar. */
export default function Link({ href, prefetch: _prefetch, replace: _replace, scroll: _scroll, onClick, ...props }: LinkProps) {
  const target = typeof href === "string" ? href : `${href.pathname ?? ""}${href.search ?? ""}`;
  return (
    <a
      {...props}
      href={target}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  );
}
