import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { sendCannedEmail } from "@/lib/admin-messaging.functions";
import { templatesForScope, getCannedTemplate, renderCanned, type CannedScope, type CannedVars } from "@/lib/canned-messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";

type Props = {
  scope: CannedScope;
  targetId: string;
  vars: CannedVars;
  /** Pre-select a template (e.g. matching a just-applied booking status). */
  defaultTemplateId?: string;
  onSent?: () => void;
};

export function CannedEmailComposer({ scope, targetId, vars, defaultTemplateId, onSent }: Props) {
  const templates = useMemo(() => templatesForScope(scope), [scope]);
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? templates[0]?.id ?? "custom");
  const [reason, setReason] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [edited, setEdited] = useState(false);

  const tpl = getCannedTemplate(templateId) ?? templates[0];

  // Re-render the draft whenever the template, target, or reason changes —
  // unless the admin has manually edited the text.
  useEffect(() => {
    if (!tpl || edited) return;
    const v = { ...vars, reason: reason || vars.reason || "" };
    setSubject(renderCanned(tpl.subject, v));
    setBody(renderCanned(tpl.body, v));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, reason, targetId, edited]);

  // Reset when switching to a different recipient.
  useEffect(() => {
    setEdited(false);
    setReason("");
    setTemplateId(defaultTemplateId ?? templates[0]?.id ?? "custom");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const send = useMutation({
    mutationFn: useServerFn(sendCannedEmail),
    onSuccess: (r: any) => {
      if (r?.ok) {
        toast.success(r.message ?? "Email sent");
        onSent?.();
      } else {
        toast.error(r?.message ?? "Could not send the email");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not send the email"),
  });

  const needsReason = !!tpl?.needsReason && !reason.trim();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setTemplateId(t.id); setEdited(false); }}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              t.id === templateId
                ? "bg-[var(--gold)] text-[var(--navy)] border-[var(--gold)] font-semibold"
                : "border-border hover:border-[var(--gold)]/60 text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tpl?.needsReason && (
        <div>
          <Label className="text-xs">Details / reason (inserted into the email)</Label>
          <Textarea value={reason} onChange={(e) => { setReason(e.target.value); setEdited(false); }} rows={2} maxLength={1200} />
        </div>
      )}

      <div>
        <Label className="text-xs">Subject</Label>
        <Input value={subject} onChange={(e) => { setSubject(e.target.value); setEdited(true); }} maxLength={150} />
      </div>

      <div>
        <Label className="text-xs">Message</Label>
        <Textarea value={body} onChange={(e) => { setBody(e.target.value); setEdited(true); }} rows={10} maxLength={6000} className="font-mono text-xs leading-relaxed" />
      </div>

      <Button
        variant="gold"
        size="sm"
        className="rounded-full"
        disabled={send.isPending || needsReason || subject.trim().length < 3 || body.trim().length < 10}
        onClick={() => send.mutate({ data: { scope, targetId, templateId, subject, body } })}
      >
        <Send className="size-4" /> {send.isPending ? "Sending…" : "Send email"}
      </Button>
      {needsReason && <p className="text-xs text-muted-foreground">Add the details above before sending.</p>}
    </div>
  );
}
