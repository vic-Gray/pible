export default function AnalyticsPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <div>
      <h1>Analytics for Project {params.projectId}</h1>
    </div>
  );
}
