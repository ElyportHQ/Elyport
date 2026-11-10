import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { flatDocs } from "@/lib/docs";
import { sitemapEntries } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ["", "/refuel", "/drop", "/lock", "/vest", "/locks", "/me", ...flatDocs.map((d) => d.href)];
  const now = new Date();
  const base: MetadataRoute.Sitemap = pages.map((p) => ({
    url: `${siteUrl}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/locks" ? "daily" : "weekly",
    priority: p === "" ? 1 : ["/refuel", "/drop", "/lock", "/vest"].includes(p) ? 0.8 : 0.5,
  }));
  // Every token with a lock, and every lock: these pages answer "is this token locked?".
  const { locks, tokens } = await sitemapEntries().catch(() => ({ locks: [], tokens: [] }));
  return [
    ...base,
    ...tokens.map((t) => ({ url: `${siteUrl}/token/${t.token}`, lastModified: new Date(t.at * 1000), changeFrequency: "daily" as const, priority: 0.7 })),
    ...locks.map((l) => ({ url: `${siteUrl}/lock/${l.id}`, lastModified: new Date(l.at * 1000), changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
