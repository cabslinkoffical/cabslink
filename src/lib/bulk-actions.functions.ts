/**
 * Bulk row actions (select-many → flip a flag or delete).
 *
 * Admin-only. The entity, the flag column and delete permission are all
 * whitelisted through the registry in `@/lib/bulk-entities`, so the client can
 * never point these at an arbitrary table or column.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getBulkEntity } from "@/lib/bulk-entities";

// The generated client types infer too deeply for dynamic table access.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

async function assertAdmin(context: { supabase: unknown; userId: string }) {
  const sb = context.supabase as SupabaseLike;
  const { data, error } = await sb.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

const idsInput = z.object({
  entity: z.string().min(1),
  ids: z.array(z.string().min(1)).min(1).max(2000),
});

export const bulkSetFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    idsInput.extend({ field: z.string().min(1), value: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; updated: number }> => {
    await assertAdmin(context);
    const entity = getBulkEntity(data.entity);
    if (!entity) throw new Error("Unknown dataset");
    const flag = entity.flags?.find((f) => f.name === data.field);
    if (!flag) throw new Error("This field cannot be changed in bulk");

    const supabase = context.supabase as SupabaseLike;
    const { error } = await supabase
      .from(entity.table)
      .update({ [flag.name]: data.value })
      .in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.ids.length };
  });

export const bulkDeleteRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idsInput.parse(i))
  .handler(async ({ data, context }): Promise<{ ok: true; deleted: number }> => {
    await assertAdmin(context);
    const entity = getBulkEntity(data.entity);
    if (!entity) throw new Error("Unknown dataset");
    if (!entity.deletable) throw new Error("This dataset cannot be deleted in bulk");

    const supabase = context.supabase as SupabaseLike;
    const { error } = await supabase.from(entity.table).delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, deleted: data.ids.length };
  });
