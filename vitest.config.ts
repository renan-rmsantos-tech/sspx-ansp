import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    // The jsdom form suites compete for CPU when Vitest uses every host core.
    // Bound concurrency so the Docker release gate does not time out under load.
    maxWorkers: 2,
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/**/*.ts", "app/**/*.{ts,tsx}", "proxy.ts"],
      exclude: ["**/*.d.ts", "**/*.test.*"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
