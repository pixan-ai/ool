import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "ŌRACLE — AI Developer Intelligence",
  description:
    "An omniscient AI oracle for developers. Powered by Claude via Vercel AI Gateway, with voice synthesis and live web search.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔮</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#030308",
};

export default function SurpriseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
