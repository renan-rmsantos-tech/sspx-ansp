import Link from "next/link";
import { PROTOTYPES } from "./_designs/registry";

export default function PrototypesIndex() {
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="font-heading text-2xl font-semibold">Protótipos</h1>
      <p className="mt-1 text-sm text-muted">
        Servidos apenas em desenvolvimento. Veja docs/design/prototyping.md.
      </p>
      <ul className="mt-6 space-y-2">
        {Object.entries(PROTOTYPES).map(([slug, p]) => (
          <li key={slug}>
            <Link href={`/prototipos/${slug}`} className="text-accent underline-offset-4 hover:underline">
              {p.title}
            </Link>
            <span className="ml-2 font-mono text-xs text-muted">/{slug}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
