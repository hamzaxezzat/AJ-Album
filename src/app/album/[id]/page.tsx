import { EditorClient } from '@/components/Editor/EditorClient';

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditorClient albumId={id} />;
}
