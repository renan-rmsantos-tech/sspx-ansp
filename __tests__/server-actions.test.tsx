import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ServerActionsProvider, useServerAction } from "@/components/server-actions";

function Probe({ onReady }: { onReady: (action: () => Promise<unknown>) => void }) {
  onReady(useServerAction("logout"));
  return <p>pronto</p>;
}

describe("ServerActionsProvider", () => {
  afterEach(cleanup);

  it("entrega a action do provider mais interno e cai no externo quando falta", () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const seen: Array<() => Promise<unknown>> = [];
    render(
      <ServerActionsProvider actions={{ logout: outer, loginAction: outer }}>
        <ServerActionsProvider actions={{ logout: inner }}>
          <Probe onReady={(action) => seen.push(action)} />
        </ServerActionsProvider>
        <Probe onReady={(action) => seen.push(action)} />
      </ServerActionsProvider>
    );
    expect(seen).toEqual([inner, outer]);
  });

  it("renderiza sem provider e só falha ao chamar a action ausente", async () => {
    let action: (() => Promise<unknown>) | undefined;
    render(<Probe onReady={(value) => (action = value)} />);
    expect(screen.getByText("pronto")).toBeInTheDocument();
    await expect(action!()).rejects.toThrow('Server action "logout" não foi fornecida');
  });
});
