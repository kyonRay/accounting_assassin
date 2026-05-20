import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}", "./content/**/*.{md,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF7F2",
        sandbox: "#4A90E2",
        realenv: "#E2A04A",
        done: "#5BA877",
        graphite: "#2C2C2E",
        muted: "#8A8A8E",
      },
      fontFamily: {
        zh: ["PingFang SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
