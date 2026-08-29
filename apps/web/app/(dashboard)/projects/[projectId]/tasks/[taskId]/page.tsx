export default function TaskPage({
  params,
}: {
  params: { projectId: string; taskId: string };
}) {
  return (
    <div>
      <h1>Task {params.taskId}</h1>
    </div>
  );
}


