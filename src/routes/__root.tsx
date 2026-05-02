import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DESIGN—Control Center" },
      { name: "description", content: "디자인 팀 운영 플랫폼 — 프로젝트, 일정, 인사이트를 한 화면에서." },
      { name: "author", content: "DESIGN/OPS" },
      { property: "og:title", content: "DESIGN—Control Center" },
      { property: "og:description", content: "디자인 팀 운영 플랫폼 — 프로젝트, 일정, 인사이트를 한 화면에서." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "DESIGN—Control Center" },
      { name: "twitter:description", content: "디자인 팀 운영 플랫폼 — 프로젝트, 일정, 인사이트를 한 화면에서." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9cf8e2b0-b5fe-4169-ac95-312c5bc13cb9/id-preview-ccb4fd4e--7ea75dfa-5380-4044-afbf-d1cb09121fde.lovable.app-1777662294210.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9cf8e2b0-b5fe-4169-ac95-312c5bc13cb9/id-preview-ccb4fd4e--7ea75dfa-5380-4044-afbf-d1cb09121fde.lovable.app-1777662294210.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
