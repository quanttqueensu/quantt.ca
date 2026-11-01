import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

// Variable Inter with the optical-size axis, which keeps the 64px+ headlines tight
// without a condensed face. The design system only ever uses 400 and 500.
const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});

/*
 * Reveal-on-scroll runs as plain inline script, outside React, so content never
 * waits on hydration. Without JS the `no-js` class keeps everything visible.
 * A MutationObserver picks up sections that client-side navigation adds later.
 */
const NO_JS = `document.documentElement.classList.remove('no-js')`;
const REVEAL = `(function(){
  if (!('IntersectionObserver' in window)) { document.documentElement.classList.add('no-js'); return; }
  var sel = '.cs-reveal, .cs-stats, .cs-hero';
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  function scan(root) {
    if (root.matches && root.matches(sel)) io.observe(root);
    if (root.querySelectorAll) root.querySelectorAll(sel).forEach(function (el) { if (!el.classList.contains('is-visible')) io.observe(el); });
  }
  scan(document);
  new MutationObserver(function (ms) { ms.forEach(function (m) { m.addedNodes.forEach(scan); }); })
    .observe(document.body, { childList: true, subtree: true });
})();`;

// NOTE: unconfirmed production origin. There is no deploy config in this repo
// (no vercel.json / netlify.toml / CI workflow), so this is a best guess at the
// club's domain. `metadataBase` is what turns every relative OG/Twitter image
// path below into the absolute URL that Instagram, LinkedIn and X require — if
// it is wrong, every social preview breaks. Verify before shipping, or set
// NEXT_PUBLIC_SITE_URL in the hosting environment to override it.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantt.ca";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "QUANTT — Queen's University Algorithmic Network & Trading Team",
  description:
    "QUANTT is Queen's University's student algorithmic trading team. Members research, build, and trade quantitative strategies, publish research, and compete in trading competitions.",
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
  openGraph: {
    title: "QUANTT — Queen's University Algorithmic Network & Trading Team",
    description:
      "Queen's University students researching, building, and trading quantitative strategies.",
    type: "website",
    siteName: "QUANTT",
    locale: "en_CA",
    // The card art itself comes from the `opengraph-image` route convention
    // (app/opengraph-image.tsx, and app/portfolios/opengraph-image.tsx for the
    // portfolios page). File-convention metadata takes precedence over this
    // field, so the entry below is only a fallback for the static export.
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "QUANTT — Queen's University Algorithmic Network & Trading Team",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QUANTT — Queen's University Algorithmic Network & Trading Team",
    description:
      "Queen's University students researching, building, and trading quantitative strategies.",
    // No `images` here on purpose: app/twitter-image.tsx already supplies
    // twitter:image (plus its width/height/alt) and cascades to every segment.
    // Duplicating it in config would only shadow that with a hash-less URL.
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`no-js ${inter.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_JS }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="cs-btn cs-btn--blue sr-only z-[60] focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <Footer />
        <script dangerouslySetInnerHTML={{ __html: REVEAL }} />
      </body>
    </html>
  );
}
