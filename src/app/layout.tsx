import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getT } from "@/lib/i18n";
import { getUser } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Brand X Lucknow | New and certified used cars", template: "%s | Brand X Lucknow" },
  description: "Authorised Brand X dealer in Lucknow. On-road prices by city, certified used cars, EMI calculator and test drives booked online.",
  openGraph: { type: "website", siteName: "Brand X Lucknow", locale: "en_IN" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ t, locale }, user] = await Promise.all([getT(), getUser()]);
  return (
    <html lang={locale} className={`${inter.variable} ${deva.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
          {t("skip")}
        </a>
        <Header user={user} locale={locale} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
