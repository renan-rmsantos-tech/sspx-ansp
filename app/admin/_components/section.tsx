import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id={headingId} className="font-heading text-lg font-semibold leading-tight text-fg">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
