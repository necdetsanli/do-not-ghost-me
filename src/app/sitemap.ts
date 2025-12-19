// src/app/sitemap.ts
import type { MetadataRoute } from "next";

const BASE_URL = "https://www.donotghostme.com";

/**
 * Revalidate sitemap periodically so crawlers get stable signals
 * without "lastModified" changing on every request.
 */
export const revalidate = 3600; // 1 hour

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: `${BASE_URL}/`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/companies`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
