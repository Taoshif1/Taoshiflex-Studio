const internalStatusPattern = /draft|github|import|unpublish|cms|private/i;

export function publicProjectStatus(status: string, client?: string) {
  const clean = status.trim();
  if (clean && !internalStatusPattern.test(clean)) return clean;
  return /internal/i.test(client || "") ? "Internal project" : "In development";
}
