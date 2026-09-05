import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { currentVersion, getPublicPolicies } from "@/lib/policies";
import { getStudioPresence } from "@/lib/studio-data";
import { studioPresencePlatformLabels } from "@/lib/studio-presence";
import { SocialPlatformIcon } from "@/components/global/social-platform-icon";

const explore = [
  { href: "/work", label: "Work" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#services", label: "Services" },
  { href: "/#process", label: "Process" },
  { href: "/#studio", label: "Studio" },
];

export async function SiteFooter() {
  const [policies, presence] = await Promise.all([
    getPublicPolicies(),
    getStudioPresence(),
  ]);
  const socialLinks = presence.socialLinks.filter((link) => link.enabled);
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <section className="footer-brand" aria-labelledby="footer-brand-name">
            <Link
              className="footer-identity"
              href="/"
              aria-label="Taoshiflex Studio home"
            >
              <Image src="/brand/txs-mark.png" alt="" width={40} height={33} />
              <span id="footer-brand-name">
                Taoshifle<span className="brand-x">x</span> Studio
              </span>
            </Link>
            <p>{site.description}</p>
            <div className="footer-project-cta">
              <strong>Have something worth building?</strong>
              <p>Tell us what you&apos;re working on and we&apos;ll help shape the right scope.</p>
              <Link href="/start-a-project">Start a Project <span aria-hidden>→</span></Link>
            </div>
            <span className="footer-axis" aria-hidden>
              <i />
              <i />
            </span>
          </section>
          <nav className="footer-column" aria-label="Explore">
            <p className="footer-label">Explore</p>
            {explore.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
                <span aria-hidden>&#8599;</span>
              </Link>
            ))}
          </nav>
          <nav className="footer-column footer-work" aria-label="Work with us">
            <p className="footer-label">Work with us</p>
            <Link href="/start-a-project">
              Start a Project<span aria-hidden>&#8599;</span>
            </Link>
            {presence.bookingEnabled && presence.bookingUrl ? (
              <a
                href={presence.bookingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Book a Call<span aria-hidden>&#8599;</span>
              </a>
            ) : null}
            <Link href="/client">
              Client Access<span aria-hidden>&#8599;</span>
            </Link>
            <Link href="/policies">Policies<span aria-hidden>&#8599;</span></Link>
            {policies.map((policy) => <Link href={`/policies/${policy.slug}`} key={policy.id}>{currentVersion(policy).title}<span aria-hidden>&#8599;</span></Link>)}
          </nav>
          <div className="footer-column footer-details">
            <div>
              <p className="footer-label">Location / Availability</p>
              <p>
                {presence.location}
                <br />
                <span>{presence.availability}</span>
              </p>
            </div>
            <div>
              <p className="footer-label">Contact</p>
              <a href={`mailto:${presence.email}`}>
                {presence.email}
                <span aria-hidden>&#8599;</span>
              </a>
            </div>
            {socialLinks.length ? (
              <div>
                <p className="footer-label">Connect</p>
                <div className="footer-socials">
                  {socialLinks.map((link) => (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      key={link.id}
                      aria-label={`${studioPresencePlatformLabels[link.platform]} — ${link.label}`}
                      title={`${studioPresencePlatformLabels[link.platform]} — ${link.label}`}
                    >
                      <SocialPlatformIcon platform={link.platform} />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Taoshiflex Studio</p>
          <p className="technical">
            Design <span>&bull;</span> Develop <span>&bull;</span> Deliver
          </p>
        </div>
      </div>
    </footer>
  );
}
