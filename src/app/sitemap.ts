// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL = "https://www.donotghostme.com";

/**
 * Generates the XML sitemap for the application.
 *
 * Next.js will automatically serve this at `/sitemap.xml`.
 * Keep this focused on public, user-facing pages – no admin URLs.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const now: string = new Date().toISOString();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/companies`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
