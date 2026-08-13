import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { ConfigProvider } from "@/components/config-provider";
import { getConfigValue, getMergedConfig } from "@/app/lib/server/config";
import { schoolFromSession } from "@/app/lib/server/session";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LOAM",
  description: "LOAM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // School-resolved runtime config for client components. Reading the session
  // cookie here makes all routes dynamically rendered — acceptable for a
  // login-gated dashboard, and required for per-school flags at first paint.
  const school = await schoolFromSession();
  const featureFlags = getMergedConfig("feature_flags", school);
  const excludedAcademicYears = getConfigValue<string[]>(
    "academic_year_scope",
    "excluded_years",
    { school, fallback: ["2025-26"] },
  );
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConfigProvider value={featureFlags} excludedAcademicYears={excludedAcademicYears}>
          {children}
        </ConfigProvider>

        {process.env.NEXT_PUBLIC_HOTJAR_ID && (
          
          <Script
            id="hotjar"
            src={`https://t.contentsquare.net/uxa/${process.env.NEXT_PUBLIC_HOTJAR_ID}.js`}
            strategy="beforeInteractive"
          />
        )}
      </body>
    </html>
  );
}
