import { createFileRoute } from "@tanstack/react-router";
import { FileWorkspace } from "@/components/file-workspace";
import { parseFileStep } from "@/lib/open-address/flow";

export const Route = createFileRoute("/file/$fileId")({
  validateSearch: (search: Record<string, unknown>) => ({
    step: parseFileStep(search.step),
  }),
  component: FilePage,
});

function FilePage() {
  const { fileId } = Route.useParams();
  const { step } = Route.useSearch();
  return <FileWorkspace fileId={fileId} step={step} />;
}
