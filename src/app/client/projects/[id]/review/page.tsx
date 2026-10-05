import { ClientReviewSection } from "../review-section";
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientReviewSection projectId={id} />;
}
