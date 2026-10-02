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

      <Link className="product-card-media-link" href={`/products/${product.slug}`} aria-label={`Explore ${product.name}`}>
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
              <span>Built by Taoshiflex Studio</span>
            </div>
          )}
          <div className="product-card-visual-label technical">
            <span>Studio product</span>
            <span>{product.status}</span>
          </div>
        </div>
      </Link>

      <div className="product-card-body">
        <div className="product-meta">
          <span className="product-status">{product.status}</span>
          <span>{product.category}</span>
        </div>

        <h2>
          <Link href={`/products/${product.slug}`}>{product.name}</Link>
        </h2>

        <p className="product-tagline">{product.tagline}</p>
        <p className="product-summary">{product.summary}</p>

        {!!product.features.length && (
          <ul className="product-tags" aria-label={`${product.name} highlights`}>
            {product.features.slice(0, 3).map(feature => <li key={feature}>{feature}</li>)}
          </ul>
        )}

        <div className="product-links">
          <Link className="product-card-action product-card-action-primary" href={`/products/${product.slug}`}>
            <span>Explore product</span>
            <span aria-hidden="true">↗</span>
          </Link>
          {product.status === "Live" && product.product_url && (
            <a className="product-card-action" href={product.product_url} target="_blank" rel="noopener noreferrer">
              <span>Visit product</span>
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
