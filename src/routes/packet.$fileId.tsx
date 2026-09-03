import { createFileRoute, Link } from "@tanstack/react-router";
import { PacketPrint } from "@/components/packet-print";

export const Route = createFileRoute("/packet/$fileId")({
  component: PacketPage,
});

function PacketPage() {
  const { fileId } = Route.useParams();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="print:hidden flex items-center justify-between border-b border-rule px-4 py-3">
        <Link
          to="/file/$fileId"
          params={{ fileId }}
          search={{ step: "packet" }}
          className="text-sm underline"
        >
          Back to file
        </Link>
        <button
          type="button"
          className="min-h-11 bg-ink px-4 text-sm text-paper"
          onClick={() => window.print()}
        >
          Print / save PDF
        </button>
      </div>
      <PacketPrint fileId={fileId} />
    </div>
  );
}
