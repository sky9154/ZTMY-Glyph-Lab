import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";


const stylesDirectory = fileURLToPath(
  new URL("./src/styles", import.meta.url)
);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true
  },
  resolve: {
    alias: {
      "@styles": stylesDirectory
    }
  }
});