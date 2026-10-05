import { DynamicText, T } from "@/i18n/language-context";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { Product } from "@/types/content";
import { ResponsiveMedia } from "@/components/ui/primitives";
import "./products.css";

export function ProductCard({
  product,
  index = 0,
  variant = "showcase",
}: {
  product: Product;
  index?: number;
  variant?: "showcase" | "compact";
}) {
  const cover = product.media.find(item => item.role === "cover");
  const number = String(index + 1).padStart(2, "0");
  const isReversed = variant === "showcase" && index % 2 === 1;

  return (
    <article
      className={`product-card product-card-${variant} ${isReversed ? "is-reversed" : ""}`}
      style={{ "--product-accent": product.accent } as CSSProperties}
    >
      {variant === "showcase" && <span className="product-card-number technical">{number}</span>}

      <Link className="product-card-media-link" href={`/products/${product.slug}`} aria-label={product.name}>
        <div className="product-card-visual">
          {cover ? (
            <ResponsiveMedia
              accent={product.accent}
              className="product-card-media"
              fit="contain"
              label={product.name}
              media={cover}
              sizes={variant === "compact" ? "(max-width: 767px) 100vw, 33vw" : "(max-width: 900px) 100vw, 62vw"}
            />
          ) : (
            <div className="product-monogram" aria-hidden="true">
              {product.name.slice(0, 1)}
              <span><T id="products.card.builtByTaoshiflexStudio"/></span>
            </div>
          )}
          <div className="product-card-visual-label technical">
            <span><T id="products.card.studioProduct"/></span>
            <span><DynamicText text={product.status}/></span>
          </div>
        </div>
      </Link>

      <div className="product-card-body">
        <div className="product-meta">
          <span className="product-status"><DynamicText text={product.status}/></span>
          <span><DynamicText text={product.category}/></span>
        </div>

        <h2>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>

        <p className="product-tagline"><DynamicText text={product.tagline} slug={product.slug}/></p>
        <p className="product-summary"><DynamicText text={product.summary} slug={product.slug}/></p>

        {!!product.features.length && (
          <ul className="product-tags">
            {product.features.slice(0, 3).map(feature => <li key={feature}><DynamicText text={feature} slug={product.slug}/></li>)}
          </ul>
        )}

        <div className="product-links">
          <Link className="product-card-action product-card-action-primary" href={`/products/${product.slug}`}>
            <span><T id="products.card.exploreProduct"/></span>
            <span aria-hidden="true">↗</span>
          </Link>
          {product.status === "Live" && product.product_url && (
            <a className="product-card-action" data-analytics-product={product.slug} href={product.product_url} target="_blank" rel="noopener noreferrer">
              <span><T id="products.card.visitProduct"/></span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
