import { createFileRoute } from "@tanstack/react-router";
import { WatchFile } from "@/components/watch-file";

export const Route = createFileRoute("/watch/$watchKey")({
  component: WatchPage,
});

function WatchPage() {
  const { watchKey } = Route.useParams();
  return <WatchFile watchKey={watchKey} />;
}
