import type { MetadataRoute } from "next";
import { getPublishedProjects, getPublishedProducts } from "@/lib/studio-data";
import { site } from "@/content/site";
import { currentVersion, getPublicPolicies } from "@/lib/policies";

const releaseLastModified = new Date("2026-09-23T00:00:00+06:00");

function safeDate(value?: string | null) {
  if (!value) return releaseLastModified;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? releaseLastModified : date;
}

function newest(values: Array<string | null | undefined>) {
  return values.reduce<Date>((latest, value) => {
    const date = safeDate(value);
    return date > latest ? date : latest;
  }, releaseLastModified);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, policies, products] = await Promise.all([
    getPublishedProjects(),
    getPublicPolicies(),
    getPublishedProducts(),
  ]);

  const workLastModified = newest(projects.map((project) => project.updatedAt));
  const policyLastModified = newest(
    policies.map((policy) => {
      const version = currentVersion(policy);
      return version.updated_at || version.published_at || policy.updated_at;
    }),
  );

  const entries: MetadataRoute.Sitemap = [
    {
      url: site.url,
      lastModified: new Date(
        Math.max(
          releaseLastModified.getTime(),
          workLastModified.getTime(),
          policyLastModified.getTime(),
        ),
      ),
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${site.url}/work`,
      lastModified: workLastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/products`,
      lastModified: releaseLastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/pricing`,
      lastModified: releaseLastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${site.url}/start-a-project`,
      lastModified: releaseLastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  if (policies.length) {
    entries.push({
      url: `${site.url}/policies`,
      lastModified: policyLastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    });
  }

  entries.push(
    ...projects.map((project) => ({
      url: `${site.url}/work/${project.slug}`,
      lastModified: safeDate(project.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: `${site.url}/products/${product.slug}`,
      lastModified: releaseLastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...policies.map((policy) => {
      const version = currentVersion(policy);
      return {
        url: `${site.url}/policies/${policy.slug}`,
        lastModified: safeDate(
          version.updated_at || version.published_at || policy.updated_at,
        ),
        changeFrequency: "yearly" as const,
        priority: 0.6,
      };
    }),
  );

  return entries;
}
