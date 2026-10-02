import { DynamicText, T } from "@/i18n/language-context";
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
            <span aria-hidden="true">←</span> <T id="products.detail.allProducts"/> </Link>

          <div className="product-meta product-detail-meta">
            <span className="product-status"><DynamicText text={product.status}/></span>
            <span><DynamicText text={product.category}/></span>
          </div>

          <h1 className="display title-accent">{product.name}</h1>
          <p className="product-detail-tagline"><DynamicText text={product.tagline} slug={product.slug}/></p>
          <p className="product-detail-summary"><DynamicText text={product.summary} slug={product.slug}/></p>

          <div className="product-detail-actions">
            {product.product_url && (
              <a
                className="product-detail-cta product-detail-cta-primary"
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span><T id="products.detail.exploreTheProduct"/></span>
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
                <span><T id="products.detail.publicRepository"/></span>
                <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>

        <div className="product-detail-visual-shell">
          <div className="product-detail-visual-label technical">
            <span><T id="products.detail.studioProduct"/></span>
            <span><DynamicText text={product.status}/></span>
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
              <span><T id="products.detail.builtByTaoshiflexStudio"/></span>
            </div>
          )}
        </div>
      </header>

      <div className="product-detail-facts">
        <div>
          <span className="technical"><T id="products.detail.category"/></span>
          <strong><DynamicText text={product.category}/></strong>
        </div>
        <div>
          <span className="technical"><T id="products.detail.status"/></span>
          <strong><DynamicText text={product.status}/></strong>
        </div>
        {product.pricing_model && (
          <div>
            <span className="technical"><T id="products.detail.pricing"/></span>
            <strong><DynamicText text={product.pricing_model} slug={product.slug}/></strong>
          </div>
        )}
      </div>

      {product.story && (
        <MotionReveal>
          <section className="product-story product-editorial-section">
            <div>
              <p className="eyebrow"><T id="products.detail.theIdea"/></p>
              <h2><T id="products.detail.builtWithIntention"/></h2>
            </div>
            <p><DynamicText text={product.story} slug={product.slug}/></p>
          </section>
        </MotionReveal>
      )}

      <div className="product-narrative">
        {product.problem && (
          <MotionReveal>
            <section>
              <p className="technical product-section-number"><T id="products.detail.01TheProblem"/></p>
              <h2><T id="products.detail.whyItExists"/></h2>
              <p><DynamicText text={product.problem} slug={product.slug}/></p>
            </section>
          </MotionReveal>
        )}
        {product.solution && (
          <MotionReveal delay={0.08}>
            <section>
              <p className="technical product-section-number"><T id="products.detail.02TheSolution"/></p>
              <h2><T id="products.detail.aClearerWayForward"/></h2>
              <p><DynamicText text={product.solution} slug={product.slug}/></p>
            </section>
          </MotionReveal>
        )}
      </div>

      {!!product.features.length && (
        <section className="product-features">
          <div className="product-section-heading">
            <div>
              <p className="eyebrow"><T id="products.detail.insideTheProduct"/></p>
              <h2><T id="products.detail.designedToDoTheWork"/></h2>
            </div>
            <p><T id="products.detail.capabilitiesShapedAroundTheJobTheProductNeedsTo"/></p>
          </div>
          <ol>
            {product.features.map((feature, index) => (
              <li key={feature}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3><DynamicText text={feature} slug={product.slug}/></h3>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!!gallery.length && (
        <section className="product-gallery">
          <div className="product-section-heading">
            <div>
              <p className="eyebrow"><T id="products.detail.aCloserLook"/></p>
              <h2><T id="products.detail.theProductInUse"/></h2>
            </div>
          </div>
          <ProjectMediaViewer accent={product.accent} media={gallery} projectName={product.name} />
        </section>
      )}

      <section className="product-system">
        <div className="product-system-panel">
          <p className="eyebrow"><T id="products.detail.technologySystem"/></p>
          <h2><T id="products.detail.underTheSurface"/></h2>
          <ul className="product-tags product-tech-tags">
            {product.technologies.map(tech => <li key={tech}>{tech}</li>)}
          </ul>
        </div>

        <div className="product-system-panel">
          <p className="eyebrow"><T id="products.detail.whereItStands"/></p>
          <h2><DynamicText text={product.status}/></h2>
          {product.roadmap && <p><DynamicText text={product.roadmap} slug={product.slug}/></p>}
          <dl>
            {product.pricing_model && (
              <div>
                <dt><T id="products.detail.pricingModel"/></dt>
                <dd><DynamicText text={product.pricing_model} slug={product.slug}/></dd>
              </div>
            )}
            {product.launch_date && (
              <div>
                <dt><T id="products.detail.launchDate"/></dt>
                <dd>{product.launch_date}</dd>
              </div>
            )}
          </dl>
        </div>
      </section>

      <footer className="product-footer">
        <div>
          <p className="eyebrow">Taoshiflex Studio</p>
          <h2><T id="products.detail.haveASystemInMind"/></h2>
        </div>
        <ActionLink href="/start-a-project" solid><T id="products.detail.buildWithTheStudio"/></ActionLink>
      </footer>
    </article>
  );
}
