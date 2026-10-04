import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";


const sourceDirectory = fileURLToPath(new URL("./src", import.meta.url));
const appDirectory = fileURLToPath(new URL("./src/app", import.meta.url));
const componentsDirectory = fileURLToPath(
  new URL("./src/app/components", import.meta.url)
);
const coreDirectory = fileURLToPath(new URL("./src/core", import.meta.url));
const hooksDirectory = fileURLToPath(new URL("./src/hooks", import.meta.url));
const stylesDirectory = fileURLToPath(new URL("./src/styles", import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === "true" ? "./" : "/",
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    clearMocks: true
  },
  resolve: {
    alias: {
      "@app": appDirectory,
      "@components": componentsDirectory,
      "@core": coreDirectory,
      "@hooks": hooksDirectory,
      "@styles": stylesDirectory,
      "@": sourceDirectory
    }
  }
});
