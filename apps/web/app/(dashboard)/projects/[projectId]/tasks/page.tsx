export default function TasksPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <h1>Tasks for Project {params.projectId}</h1>
    </div>
  );
}
