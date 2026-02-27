import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Cloud5 | Next-Gen AI Assistant",
  description: "A high-availability, multi-modal AI assistant featuring a 5-layer fallback cascade, vision capabilities, and custom personas.",
  icons: {
    icon: "/logo.png",
  },
  openGraph: {
    title: "Cloud5 | Next-Gen AI Assistant",
    description: "Experience the ultimate multi-modal AI with vision, image generation, and pro-level coding assistance.",
    url: "https://cloud5bot.vercel.app",
    siteName: "Cloud5",
    images: [
      {
        url: "/logo.png", 
        width: 800,
        height: 600,
        alt: "Cloud5 AI Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cloud5 | Next-Gen AI Assistant",
    description: "Experience the ultimate multi-modal AI with vision and image generation.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}