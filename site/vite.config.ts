import { siteShell } from "@mark1russell7/site-pages/vite";
import { defineConfig } from "vite";

// The site has one page: the trace, the flags and the output of init. The deploy adds `status/` and `releases/`.
export default defineConfig({
  plugins: [siteShell({ themeKey: "ts-base-theme" })],
});
