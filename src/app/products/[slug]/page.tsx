import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedProduct } from "@/lib/studio-data";
import { ResponsiveMedia, ActionLink } from "@/components/ui/primitives";
import { ProjectMediaViewer } from "@/components/work/project-media-viewer";
import { MotionReveal } from "@/components/motion/motion-reveal";
import "@/components/products/products.css";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) return {};
  const cover = product.media.find(item => item.role === "cover");
  const images = cover?.src ? [{ url: cover.src, alt: cover.alt || product.name }] : undefined;
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.summary,
      url: `/products/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: product.summary,
      images: images?.map(image => image.url),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getPublishedProduct(slug);
  if (!product) notFound();

  const cover = product.media.find(item => item.role === "cover");
  const gallery = product.media.filter(item => item.role === "gallery");

  return (
    <article
      className="product-detail container"
      style={{ "--product-accent": product.accent, "--title-accent": product.accent } as CSSProperties}
    >
      <header className="product-detail-hero">
        <div className="product-detail-copy">
          <Link href="/products" className="product-back-link technical">
            <span aria-hidden="true">←</span>
            All products
          </Link>

          <div className="product-meta product-detail-meta">
            <span className="product-status">{product.status}</span>
            <span>{product.category}</span>
          </div>

          <h1 className="display title-accent">{product.name}</h1>
          <p className="product-detail-tagline">{product.tagline}</p>
          <p className="product-detail-summary">{product.summary}</p>

          <div className="product-detail-actions">
            {product.product_url && (
              <a
                className="product-detail-cta product-detail-cta-primary"
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Explore the product</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
            {product.repository_url && (
              <a
                className="product-detail-cta"
                href={product.repository_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Public repository</span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>

        <div className="product-detail-visual-shell">
          <div className="product-detail-visual-label technical">
            <span>Studio product</span>
            <span>{product.status}</span>
          </div>
          {cover ? (
            <ResponsiveMedia
              accent={product.accent}
              className="product-detail-cover"
              fit="contain"
              media={cover}
              label={product.name}
              priority
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          ) : (
            <div className="product-monogram product-detail-monogram" aria-hidden="true">
              {product.name.slice(0, 1)}
              <span>Built by Taoshiflex Studio</span>
            </div>
          )}
        </div>
      </header>

      <div className="product-detail-facts">
        <div>
          <span className="technical">Category</span>
          <strong>{product.category}</strong>
        </div>
        <div>
          <span className="technical">Status</span>
          <strong>{product.status}</strong>
        </div>
        {product.pricing_model && (
          <div>
            <span className="technical">Pricing</span>
            <strong>{product.pricing_model}</strong>
          </div>
        )}
      </div>

      {product.story && (
        <MotionReveal>
          <section className="product-story product-editorial-section">
            <div>
              <p className="eyebrow">The idea</p>
              <h2>Built with intention.</h2>
            </div>
            <p>{product.story}</p>
          </section>
        </MotionReveal>
      )}

      <div className="product-narrative">
        {product.problem && (
          <MotionReveal>
            <section>
              <p className="technical product-section-number">01 / The problem</p>
              <h2>Why it exists.</h2>
              <p>{product.problem}</p>
            </section>
          </MotionReveal>
        )}
        {product.solution && (
          <MotionReveal delay={0.08}>
            <section>
              <p className="technical product-section-number">02 / The solution</p>
              <h2>A clearer way forward.</h2>
              <p>{product.solution}</p>
            </section>
          </MotionReveal>
        )}
      </div>

      {!!product.features.length && (
        <section className="product-features">
          <div className="product-section-heading">
            <div>
              <p className="eyebrow">Inside the product</p>
              <h2>Designed to do the work.</h2>
            </div>
            <p>Capabilities shaped around the job the product needs to do.</p>
          </div>
          <ol>
            {product.features.map((feature, index) => (
              <li key={feature}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{feature}</h3>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!!gallery.length && (
        <section className="product-gallery">
          <div className="product-section-heading">
            <div>
              <p className="eyebrow">A closer look</p>
              <h2>The product in use.</h2>
            </div>
          </div>
          <ProjectMediaViewer accent={product.accent} media={gallery} projectName={product.name} />
        </section>
      )}

      <section className="product-system">
        <div className="product-system-panel">
          <p className="eyebrow">Technology / System</p>
          <h2>Under the surface.</h2>
          <ul className="product-tags product-tech-tags">
            {product.technologies.map(tech => <li key={tech}>{tech}</li>)}
          </ul>
        </div>

        <div className="product-system-panel">
          <p className="eyebrow">Where it stands</p>
          <h2>{product.status}</h2>
          {product.roadmap && <p>{product.roadmap}</p>}
          <dl>
            {product.pricing_model && (
              <div>
                <dt>Pricing model</dt>
                <dd>{product.pricing_model}</dd>
              </div>
            )}
            {product.launch_date && (
              <div>
                <dt>Launch date</dt>
                <dd>{product.launch_date}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <footer className="product-footer">
        <div>
          <p className="eyebrow">Taoshiflex Studio</p>
          <h2>Have a system in mind?</h2>
        </div>
        <ActionLink href="/start-a-project" solid>Build with the Studio</ActionLink>
      </footer>
    </article>
  );
}
