import { DynamicText, T } from "@/i18n/language-context";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionLink, ResponsiveMedia } from "@/components/ui/primitives";
import { ProjectMediaViewer } from "@/components/work/project-media-viewer";
import { getPublishedProject, getPublishedProjects, getPublishedProjectReview } from "@/lib/studio-data";
import "./case-study.css";
import { ReviewCard } from "@/components/reviews/review-card";

type Props = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProject(slug);
  if (!project) return {};
  const images = project.coverMedia?.src ? [{ url: project.coverMedia.src, alt: project.coverMedia.alt || project.name }] : undefined;
  return {
    title: project.name,
    description: project.summary,
    alternates: { canonical: `/work/${slug}` },
    openGraph: {
      title: `${project.name} — Taoshiflex Studio`,
      description: project.summary,
      url: `/work/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} — Taoshiflex Studio`,
      description: project.summary,
      images: images?.map(image => image.url),
    },
  };
}

export default async function CaseStudy({ params }: Props) {
  const { slug } = await params;
  const projects = await getPublishedProjects();
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  const reviews = await getPublishedProjectReview(slug);

  const index = projects.findIndex((item) => item.slug === slug);
  const next = projects[(index + 1) % projects.length];

  return (
    <article className="case" style={{ "--project-accent": project.accent } as React.CSSProperties}>
      <header className="case-hero container">
        <p className="eyebrow"><DynamicText text={project.category}/> / {project.year}</p>
        <h1 className="display title-accent" style={{ "--title-accent": project.accent } as React.CSSProperties}>{project.name}</h1>
        <p><DynamicText text={project.summary} slug={project.slug}/></p>
        <dl>
          <div><dt><T id="work.detail.clientBusiness"/></dt><dd>{project.client}</dd></div>
          <div><dt><T id="work.detail.status"/></dt><dd><DynamicText text={project.status}/></dd></div>
          <div><dt><T id="work.detail.capabilities"/></dt><dd>{project.capabilities.map((value, index) => <span key={value}>{index ? ", " : ""}<DynamicText text={value} slug={project.slug}/></span>)}</dd></div>
        </dl>
        {project.liveUrl || project.behanceUrl || project.facebookUrl || project.showRepository && project.repositoryUrl ? (
          <div className="case-links">
            {project.liveUrl ? <a className="action action-solid" href={project.liveUrl} target="_blank" rel="noopener noreferrer"><T id="work.detail.viewLiveSite"/> <span aria-hidden>↗</span></a> : null}
            {project.behanceUrl ? <a className="action" href={project.behanceUrl} target="_blank" rel="noopener noreferrer"><T id="work.detail.viewCaseStudy"/> <span aria-hidden>↗</span></a> : null}
            {project.facebookUrl ? <a className="action" href={project.facebookUrl} target="_blank" rel="noopener noreferrer"><T id="work.detail.facebookPost"/> <span aria-hidden>↗</span></a> : null}
            {project.showRepository && project.repositoryUrl ? <a className="action" href={project.repositoryUrl} target="_blank" rel="noopener noreferrer"><T id="work.detail.viewRepository"/> <span aria-hidden>↗</span></a> : null}
          </div>
        ) : null}
      </header>

      <div className="container">
        <ResponsiveMedia
          accent={project.accent}
          className="case-cover"
          fit="contain"
          label={`${project.name} primary project view`}
          media={project.coverMedia}
          priority
        />
      </div>

      <section className="case-narrative container">
        <p className="eyebrow"><T id="work.detail.theContext"/></p>
        <h2><DynamicText text={project.challenge} slug={project.slug}/></h2>
        <div><p><DynamicText text={project.context} slug={project.slug}/></p><p><DynamicText text={project.approach} slug={project.slug}/></p></div>
      </section>

      <section className="case-solution">
        <div className="container">
          <p className="eyebrow"><T id="work.detail.approachSolution"/></p>
          <h2 className="display display-md"><T id="work.detail.aSystemDesignedAroundTheWork"/></h2>
          <p className="solution-lede"><DynamicText text={project.solution} slug={project.slug}/></p>
          <ProjectMediaViewer accent={project.accent} media={project.media} projectName={project.name} />
        </div>
      </section>

      <section className="case-details container">
        <div>
          <p className="eyebrow"><T id="work.detail.systemFeatures"/></p>
          <ol>
            {project.features.map((item, itemIndex) => (
              <li key={item}>
                <span aria-hidden="true">{String(itemIndex + 1).padStart(2, "0")}</span>
                <span><DynamicText text={item} slug={project.slug}/></span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="eyebrow"><T id="work.detail.technicalNotes"/></p>
          <ol>
            {project.technicalNotes.map((item, itemIndex) => (
              <li key={item}>
                <span aria-hidden="true">{String(itemIndex + 1).padStart(2, "0")}</span>
                <span><DynamicText text={item} slug={project.slug}/></span>
              </li>
            ))}
          </ol>
        </div>
        <div className="result">
          <p className="eyebrow"><T id="work.detail.currentResult"/></p>
          <p><DynamicText text={project.result} slug={project.slug}/></p>
        </div>
      </section>

      {reviews.length > 0 && <section className="case-review container" aria-labelledby="case-review-title"><p className="eyebrow" id="case-review-title"><T id="work.detail.clientPerspective"/></p>{reviews.map(review => <ReviewCard key={review.id} review={review}/>)}</section>}
      <footer className="case-next container">
        <p className="eyebrow"><T id="work.detail.nextProject"/></p>
        {next ? <Link href={`/work/${next.slug}`}>{next.name}<span aria-hidden>↗</span></Link> : null}
        <ActionLink href="/start-a-project" solid><T id="work.detail.startAProject"/></ActionLink>
      </footer>
    </article>
  );
}
