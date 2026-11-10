import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/config";
import { flatDocs } from "@/lib/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/refuel", "/drop", "/lock", "/vest", "/locks", "/me", ...flatDocs.map((d) => d.href)];
  const now = new Date();
  return pages.map((p) => ({
    url: `${siteUrl}${p}`,
    lastModified: now,
    changeFrequency: p === "" || p === "/locks" ? "daily" : "weekly",
    priority: p === "" ? 1 : ["/refuel", "/drop", "/lock", "/vest"].includes(p) ? 0.8 : 0.5,
  }));
}
