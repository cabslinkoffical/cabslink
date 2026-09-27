import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  head: () => ({
    meta: [
      { title: "Cabslink Account" },
      { name: "description", content: "Cabslink secure account area." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    // This navigation gate is not the security boundary. Reading the saved
    // session avoids a redirect loop when the remote user check briefly fails;
    // protected server functions still validate every bearer token and role.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) throw redirect({ to: "/auth" });
    return { user: data.session.user };
  },
  component: () => <Outlet />,
});
