import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/providers/convex-provider";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/pwa/offline-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import Script from "next/script";

export const metadata: Metadata = {
  title: "MADVERSE — AI-Powered BRAIN OS",
  description: "Your AI-powered personal BRAIN OS. Organise everything with Maddy.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MADVERSE",
  },
  icons: {
    icon: "/app-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0f0f" },
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
      <html lang="en" suppressHydrationWarning>
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

                  var resetFlag = 'madverse-sw-reset-once';
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
                                  .filter(function (k) { return k.indexOf('madverse-') === 0; })
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
        <body className="font-serif antialiased">
          <ThemeProvider
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
          </ThemeProvider>
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
                      .then(keys => Promise.all(keys.filter(k => k.startsWith('madverse-')).map(k => caches.delete(k))))
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
