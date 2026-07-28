import "@testing-library/jest-dom/vitest";

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
