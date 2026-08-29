export default function TimelinePage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <h1>Timeline for Project {params.projectId}</h1>
    </div>
  );
}
