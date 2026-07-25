import type { Metadata } from "next";
import { Courier_Prime, Geist, Geist_Mono, IBM_Plex_Sans } from "next/font/google";

import { Providers } from "@/lib/providers";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
});

const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier",
});

export const metadata: Metadata = {
  title: "Solar AI — Voice Receptionist",
  description: "AI phone receptionist for Ethiopian SMBs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexSans.variable} ${courierPrime.variable} font-sans antialiased`}
      >
        <Providers>
          <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
