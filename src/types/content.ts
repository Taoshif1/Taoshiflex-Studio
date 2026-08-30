export type ProjectMedia = { id: string; kind: "image" | "video"; alt: string; aspect: "landscape" | "portrait" | "square"; src?: string };
export type Project = { slug: string; name: string; client: string; category: "Commerce" | "Business System" | "Digital Product"; year: string; status: string; summary: string; context: string; challenge: string; approach: string; solution: string; result: string; capabilities: string[]; features: string[]; technicalNotes: string[]; accent: string; media: ProjectMedia[] };
export type Capability = { id: string; number: string; title: string; value: string; description: string; nodes: string[] };
export type ProcessStage = { id: string; title: string; what: string; why: string; deliverable: string };
export type Testimonial = { quote: string; author: string; role: string; published: boolean };
export type Inquiry = { projectType: string; stage: string; goals: string[]; budget: string; timeline: string; details: string; name: string; business: string; email: string; phone?: string };
export type SiteSettings = { name: string; description: string; url: string; location: string; email: string };
