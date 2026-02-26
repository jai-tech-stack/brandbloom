import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrandBloom — AI Brand Assets in Seconds",
  description:
    "Turn any website into a living brand system. Extract logos, colors, fonts, and generate on-brand assets for social, ads, and more.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body
        suppressHydrationWarning
        className={`${plusJakarta.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-surface-900 text-stone-100`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
