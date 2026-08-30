export const inquirySteps = [
  { id: "projectType", label: "What are you building?", options: ["Business Website", "E-Commerce", "Web Application", "Internal System", "Digital Product", "Something Else"] },
  { id: "stage", label: "Where are you now?", options: ["Just an idea", "Existing business", "Existing website/system", "Design ready", "Needs redesign"] },
  { id: "goals", label: "What matters most?", options: ["Increase sales", "Improve operations", "Improve customer experience", "Build online presence", "Automate work", "Launch something new"], multiple: true },
  { id: "budget", label: "What investment range are you considering?", options: ["Under ৳30,000", "৳30,000–৳50,000", "৳50,000–৳80,000", "৳80,000–৳150,000", "৳150,000+", "Not sure yet"] },
  { id: "timeline", label: "When would you like to begin?", options: ["As soon as practical", "Within 1–2 months", "Within 3–4 months", "Later this year", "Still exploring"] },
] as const;
