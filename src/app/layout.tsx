import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { get_color, get_screen_padding, Flex } from "@/gla_ui";
import { Header } from "@/components";

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
  title: "glinks",
  description: "glakulin links",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body
        className={`${font_body.variable} ${font_heading.variable} ${font_mono.variable}`}
        style={{
          backgroundColor: get_color("gray_9"),
          color: get_color("gray_1")
        }}
      >
        <Header />
        <Flex tag="main"
          direction="column"
          gap={96}
          css={{
            ...get_screen_padding()
          }}
        >
          {children}
        </Flex>
      </body>
    </html>
  );
}