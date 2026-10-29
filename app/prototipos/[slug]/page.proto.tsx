import { notFound } from "next/navigation";
import { PROTOTYPES } from "../_designs/registry";

// Rota de protótipos (somente desenvolvimento; ver next.config.ts).
export default async function PrototypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prototype = PROTOTYPES[slug];
  if (!prototype) notFound();
  const { Component } = prototype;
  return <Component />;
}
