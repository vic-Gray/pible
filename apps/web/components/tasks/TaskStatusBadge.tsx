export default function TaskStatusBadge({ status }: { status: string }) {
  return <span className="badge">{status}</span>;
}
