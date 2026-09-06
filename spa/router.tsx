import {
  createRouter,
  createRoute,
} from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { Landing } from "@/components/landing";
import { HomeFiles } from "@/components/home-files";
import { FileWorkspace } from "@/components/file-workspace";
import { PacketPrint } from "@/components/packet-print";
import { WatchFile } from "@/components/watch-file";
import { Login } from "@/routes/login";
import { parseFileStep } from "@/lib/open-address/flow";

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Landing,
});

const filesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/files",
  component: HomeFiles,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const fileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/file/$fileId",
  validateSearch: (search: Record<string, unknown>) => ({
    step: parseFileStep(search.step),
  }),
  component: function FilePage() {
    const { fileId } = fileRoute.useParams();
    const { step } = fileRoute.useSearch();
    return <FileWorkspace fileId={fileId} step={step} />;
  },
});

const packetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packet/$fileId",
  component: function PacketPage() {
    const { fileId } = packetRoute.useParams();
    return <PacketPrint fileId={fileId} />;
  },
});

const watchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/watch/$watchKey",
  component: function WatchPage() {
    const { watchKey } = watchRoute.useParams();
    return <WatchFile watchKey={watchKey} />;
  },
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  filesRoute,
  loginRoute,
  fileRoute,
  packetRoute,
  watchRoute,
]);

function FolioRouteError({ error }: { error: Error }) {
  const message = error?.message ?? "Something went wrong";
  const isAuth =
    /unauthorized/i.test(message) || /invalidsecret/i.test(message);
  return (
    <main className="min-h-screen bg-paper px-5 py-16 text-ink">
      <h1 className="font-serif text-3xl">
        {isAuth ? "Sign in again" : "Something went wrong"}
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted break-words">{message}</p>
      <a href="/login" className="folio-btn mt-6 inline-flex">
        Back to sign in
      </a>
    </main>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: FolioRouteError,
  });
}
