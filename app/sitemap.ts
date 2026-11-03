import type { MetadataRoute } from "next";
import { getResearchArticles } from "@/lib/research";

// Static export: generated once at build time as out/sitemap.xml.
export const dynamic = "force-static";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://quantt.ca";

// Every public page. Keep in step with app/*/page.tsx (no /admin, no redirects).
const pages = [
  "/",
  "/portfolios",
  "/education",
  "/competition",
  "/team",
  "/achievements",
  "/partners",
  "/contact",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [...pages, ...getResearchArticles().map((a) => `/research/${a.slug}`)].map((path) => ({
    url: `${siteUrl}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
