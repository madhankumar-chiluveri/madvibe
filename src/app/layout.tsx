import type { Metadata, Viewport } from "next";
import { Geist, Roboto_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { MadThemeProvider } from "@/components/providers/mad-theme-provider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import Script from "next/script";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
  preload: false,
});

const robotoSerif = Roboto_Serif({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-serif",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  preload: false,
});

export const metadata: Metadata = {
  title: "MadVibe",
  description: "Your AI-powered personal BRAIN OS. Organise everything with Maddy.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MadVibe",
  },
  icons: {
    icon: [
      { url: "/app-icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icons/favicon-32x32.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#191918" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="en" suppressHydrationWarning className={`${geist.variable} ${robotoSerif.variable} ${jetbrainsMono.variable}`}>
        <head>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function () {
                  if (typeof window === 'undefined') return;
                  var isLocalhost =
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
                  if (!isLocalhost) return;
                  if (!('serviceWorker' in navigator)) return;

                  var resetFlag = 'madvibe-sw-reset-once';
                  if (sessionStorage.getItem(resetFlag)) return;

                  navigator.serviceWorker.getRegistrations().then(function (registrations) {
                    if (!registrations || registrations.length === 0) return;
                    sessionStorage.setItem(resetFlag, '1');
                    Promise.all(registrations.map(function (r) { return r.unregister(); }))
                      .finally(function () {
                        if ('caches' in window) {
                          caches.keys()
                            .then(function (keys) {
                              return Promise.all(
                                keys
                                  .filter(function (k) { return k.indexOf('madvibe-') === 0; })
                                  .map(function (k) { return caches.delete(k); })
                              );
                            })
                            .finally(function () { window.location.reload(); });
                        } else {
                          window.location.reload();
                        }
                      });
                  });
                })();
              `,
            }}
          />
        </head>
        <body className="font-sans antialiased">
          <MadThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ConvexClientProvider>
              <OfflineBanner />
              {children}
              <InstallPrompt />
              <Toaster richColors position="bottom-right" />
            </ConvexClientProvider>
          </MadThemeProvider>
          {/* Service Worker Registration */}
          <Script
            id="sw-register"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  if ('${process.env.NODE_ENV}' === 'production') {
                    navigator.serviceWorker.register('/sw.js')
                      .then(() => console.log('[SW] Registered'))
                      .catch(e => console.warn('[SW] Registration failed', e));
                  } else {
                    navigator.serviceWorker.getRegistrations()
                      .then(registrations => registrations.forEach(r => r.unregister()))
                      .catch(() => {});
                    caches.keys()
                      .then(keys => Promise.all(keys.filter(k => k.startsWith('madvibe-')).map(k => caches.delete(k))))
                      .catch(() => {});
                  }
                }
              `,
            }}
          />
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
