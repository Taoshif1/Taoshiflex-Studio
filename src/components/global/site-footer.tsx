import { DynamicText, T } from "@/i18n/language-context";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { currentVersion, getPublicPolicies } from "@/lib/policies";
import { getStudioPresence } from "@/lib/studio-data";
import { studioPresencePlatformLabels } from "@/lib/studio-presence";
import { SocialPlatformIcon } from "@/components/global/social-platform-icon";

const explore = [
  { href: "/work", label: "Work" },
  { href: "/products", label: "Products" },
  { href: "/pricing", label: "Pricing" },
  { href: "/services", label: "Services" },
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
            <p><DynamicText text={site.description}/></p>
            <div className="footer-project-cta">
              <strong><T id="footer.haveSomethingWorthBuilding"/></strong>
              <p><T id="footer.tellUsWhatYouReWorkingOnAndWe"/></p>
              <Link href="/start-a-project"><T id="footer.startAProject"/> <span aria-hidden>→</span></Link>
            </div>
            <span className="footer-axis" aria-hidden>
              <i />
              <i />
            </span>
          </section>
          <nav className="footer-column" aria-label="Explore">
            <p className="footer-label"><T id="footer.explore"/></p>
            {explore.map((link) => (
              <Link key={link.href} href={link.href}>
                <DynamicText text={link.label}/>
                <span aria-hidden>&#8599;</span>
              </Link>
            ))}
          </nav>
          <nav className="footer-column footer-work" aria-label="Work with us">
            <p className="footer-label"><T id="footer.workWithUs"/></p>
            <Link href="/start-a-project"> <T id="footer.startAProject"/><span aria-hidden>&#8599;</span>
            </Link>
            {presence.bookingEnabled && presence.bookingUrl ? (
              <a
                href={presence.bookingUrl}
                target="_blank"
                rel="noreferrer"
              > <T id="footer.bookACall"/><span aria-hidden>&#8599;</span>
              </a>
            ) : null}
            <Link href="/client"> <T id="footer.clientAccess"/><span aria-hidden>&#8599;</span>
            </Link>
            <Link href="/policies"><T id="footer.policies"/><span aria-hidden>&#8599;</span></Link>
            {policies.map((policy) => <Link href={`/policies/${policy.slug}`} key={policy.id}><DynamicText text={currentVersion(policy).title}/><span aria-hidden>&#8599;</span></Link>)}
          </nav>
          <div className="footer-column footer-details">
            <div>
              <p className="footer-label"><T id="footer.locationAvailability"/></p>
              <p>
                <DynamicText text={presence.location}/>
                <br />
                <span><DynamicText text={presence.availability}/></span>
              </p>
            </div>
            <div>
              <p className="footer-label"><T id="footer.contact"/></p>
              <a href={`mailto:${presence.email}`}>
                {presence.email}
                <span aria-hidden>&#8599;</span>
              </a>
            </div>
            {socialLinks.length ? (
              <div>
                <p className="footer-label"><T id="footer.connect"/></p>
                <div className="footer-socials">
                  {socialLinks.map((link) => (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      key={link.id}
                      aria-label={`${studioPresencePlatformLabels[link.platform]} — $<DynamicText text={link.label}/>`}
                      title={`${studioPresencePlatformLabels[link.platform]} — $<DynamicText text={link.label}/>`}
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
          <p className="technical"> <T id="footer.design"/> <span><T id="footer.bull"/></span> <T id="footer.develop"/> <span><T id="footer.bull"/></span> <T id="footer.deliver"/> </p>
        </div>
      </div>
    </footer>
  );
}
