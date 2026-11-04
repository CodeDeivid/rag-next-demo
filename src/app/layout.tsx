import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAG Next Demo",
  description: "Upload documents and ask questions answered from their excerpts.",
};

// globals.css switches themes on a `.dark` class; follow the OS setting before first paint.
const followSystemTheme = `(() => {
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const apply = () => document.documentElement.classList.toggle("dark", mq.matches);
  apply();
  mq.addEventListener("change", apply);
})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Script id="follow-system-theme" strategy="beforeInteractive">
          {followSystemTheme}
        </Script>
        {children}
      </body>
    </html>
  );
}
