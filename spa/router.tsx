import {
  createRouter,
  createRoute,
} from "@tanstack/react-router";
import { Route as rootRoute } from "./root";
import { HomeFiles } from "@/components/home-files";
import { FileWorkspace } from "@/components/file-workspace";
import { PacketPrint } from "@/components/packet-print";
import { Login } from "@/routes/login";
import { parseFileStep } from "@/lib/open-address/flow";

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  fileRoute,
  packetRoute,
]);

export function getRouter() {
  return createRouter({ routeTree });
}
