import { EditorClient } from '@/components/Editor/EditorClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <ErrorBoundary>
      <EditorClient albumId={id} />
    </ErrorBoundary>
  );
}
