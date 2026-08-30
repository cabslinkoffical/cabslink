import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsersWithRoles, setUserAdmin, deleteUser, isAdmin } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const opts = queryOptions({ queryKey: ["admin", "users"], queryFn: () => listUsersWithRoles() });
const meOpts = queryOptions({ queryKey: ["admin", "me"], queryFn: () => isAdmin() });

export const Route = createFileRoute("/_authenticated/cabs-booking-pannel/users")({
  head: () => ({
    meta: [
      { title: "Users — Cabslink Admin" },
      { name: "description", content: "Cabslink staff console: users." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(opts), context.queryClient.ensureQueryData(meOpts)]);
  },
  errorComponent: ({ error }) => <div className="p-8 text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: UsersPage,
});

function UsersPage() {
  const { data: users } = useSuspenseQuery(opts);
  const { data: me } = useSuspenseQuery(meOpts);
  const qc = useQueryClient();
  const promote = useMutation({
    mutationFn: useServerFn(setUserAdmin),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: useServerFn(deleteUser),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success("User deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">{users.length} users · {users.filter((u: any) => u.roles.includes("admin")).length} admins</p>
      </div>

      <div className="admin-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Last sign in</th>
                <th className="text-left p-3">Admin</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => {
                const isAdminRole = u.roles.includes("admin");
                const isSelf = u.id === me.userId;
                return (
                  <tr key={u.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isAdminRole && <ShieldCheck className="size-4 text-[var(--gold)]" />}
                        <span className="font-medium">{u.email}</span>
                        {isSelf && <span className="text-[10px] uppercase tracking-wider rounded-full bg-[var(--gold)]/15 text-[var(--gold)] px-2 py-0.5">You</span>}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-xs text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—"}</td>
                    <td className="p-3">
                      <Switch
                        checked={isAdminRole}
                        disabled={isSelf || promote.isPending}
                        onCheckedChange={(v) => promote.mutate({ data: { userId: u.id, admin: v } })}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <Button aria-label="Delete" size="sm" variant="ghost" className="text-destructive" disabled={isSelf} onClick={() => confirm(`Delete ${u.email}?`) && del.mutate({ data: { userId: u.id } })}>
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {users.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
