export default function DecisionsPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <h1>Decisions for Project {params.projectId}</h1>
    </div>
  );
}
