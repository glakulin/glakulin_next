import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { get_color } from "@/gla_ui";
import { ServerStyleSheet } from "@/gla_ui/StyleSheet";

const font_body = IBM_Plex_Sans({
  subsets: ["cyrillic-ext", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-body"
});

const font_mono = IBM_Plex_Mono({
  subsets: ["cyrillic-ext", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-mono"
});

const font_heading = IBM_Plex_Serif({
  subsets: ["cyrillic-ext", "latin-ext"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-heading"
});

export const metadata: Metadata = {
  title: "glakulin",
  description: "glakulin",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru">
      <body
        className={`${font_body.variable} ${font_heading.variable} ${font_mono.variable}`}
        style={{
          backgroundColor: get_color("gray_9"),
          color: get_color("gray_1")
        }}
      >
        {children}
        <ServerStyleSheet />
      </body>
    </html>
  );
}