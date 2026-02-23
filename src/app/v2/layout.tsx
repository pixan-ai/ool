import type { Metadata } from "next";
import { DM_Sans, DM_Mono } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "noter.sh — canvas notes",
  description: "A beautiful, minimal note-taking prototype with floating blocks",
};

export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${dmSans.variable} ${dmMono.variable}`}>
      {children}
    </div>
  );
}
