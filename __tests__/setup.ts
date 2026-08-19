import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

if (typeof window !== "undefined") {
  window.scrollTo = vi.fn();
}

if (typeof HTMLAnchorElement !== "undefined") {
  HTMLAnchorElement.prototype.click = vi.fn();
}

// O setup roda para todos os testes, inclusive os que declaram
// `@vitest-environment node` (a integração de PDF). Fora do jsdom não existe
// HTMLDialogElement, e tocá-lo aqui derrubaria o arquivo inteiro.
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute("open", "");
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
}
