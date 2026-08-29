export default function ArchitecturePage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <h1>Architecture for Project {params.projectId}</h1>
    </div>
  );
}
