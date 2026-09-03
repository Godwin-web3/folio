import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { FolioConvex } from "@/lib/open-address/convex-react";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "Folio";
const spa = import.meta.env.VITE_FOLIO_SPA === "1";

function Shell() {
  return (
    <>
      <PreviewHostBridge />
      <FolioConvex>
        <AuthProvider>
          <Outlet />
        </AuthProvider>
      </FolioConvex>
    </>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "The city’s file, the date they named, and the notice on your door — one Cook County file.",
      },
      { name: "theme-color", content: "#efe6d3" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () =>
    spa ? (
      <Shell />
    ) : (
      <html lang="en" className="antialiased">
        <head>
          <HeadContent />
        </head>
        <body className="font-sans bg-paper text-ink min-h-screen">
          <Shell />
          <Scripts />
        </body>
      </html>
    ),
});
