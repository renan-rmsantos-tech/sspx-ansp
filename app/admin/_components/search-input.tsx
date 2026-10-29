"use client";

import { useId } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  id: idProp,
  className,
  "data-testid": testId,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  id?: string;
  className?: string;
  "data-testid"?: string;
}) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        data-testid={testId}
        className="h-10 bg-surface pl-9"
      />
    </div>
  );
}
