export default function IssuesPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <h1>Issues for Project {params.projectId}</h1>
    </div>
  );
}
