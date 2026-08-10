/**
 * /book layout.
 *
 * `book.index.tsx` owns the transfer booking page at `/book`, and
 * `book.hourly.tsx` owns `/book/hourly`. This parent exists only so the child
 * routes mount — when the page body lived here, `/book/hourly` rendered the
 * transfer form instead of the hourly one because a leaf route never renders
 * `<Outlet />`.
 */
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/book")({
  component: () => <Outlet />,
});
