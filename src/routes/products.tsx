import { createFileRoute, redirect } from "@tanstack/react-router";

// Keep older bookmarks and external links working.
// The canonical product-search page in Terrabar is /requests.
export const Route = createFileRoute("/products")({
  beforeLoad: () => {
    throw redirect({ to: "/requests", replace: true });
  },
});
