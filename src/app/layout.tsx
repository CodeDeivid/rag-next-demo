import type { Metadata, Viewport } from "next";
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
  applicationName: "RAG Next Demo",
  description:
    "Chat with your own documents: answers grounded in their excerpts, with numbered citations.",
};

// --background from globals.css, light and dark.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
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
      <body
        className="flex min-h-full flex-col bg-background text-foreground"
        // Browser extensions (e.g. colour pickers) add attributes here before React loads.
        suppressHydrationWarning
      >
        <Script id="follow-system-theme" strategy="beforeInteractive">
          {followSystemTheme}
        </Script>
        {children}
      </body>
    </html>
  );
}
