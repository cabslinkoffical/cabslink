import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2,
  ImagePlus, Minus, Code2, Table2, Eye, PenLine, ListTree,
} from "lucide-react";
import {
  extractToc, slugify, wordCount, readingMinutes,
  wrapSelection, insertBlock, formatHeading,
  type EditResult,
} from "@/lib/blog-markdown";

/** Comparison-table starter block. Every figure is a TODO until real numbers are supplied. */
const COMPARISON_TABLE = [
  "## How do the options compare?",
  "",
  "| Option | Typical price | Journey time | Door to door | Luggage |",
  "| --- | --- | --- | --- | --- |",
  "| Private transfer (Cabslink) | TODO | TODO | Yes | TODO |",
  "| Taxi rank | TODO | TODO | Yes | TODO |",
  "| Bus / tram | TODO | TODO | No | TODO |",
  "| Train | TODO | TODO | No | TODO |",
].join("\n");

/**
 * Admin writing studio for blog articles.
 *
 * Write / Preview tabs over a markdown textarea, a formatting toolbar that
 * edits the text at the cursor, a media-library image inserter, and a live
 * "On this page" outline built from the `##` / `###` headings on the left.
 * The stored value stays plain markdown, so the public article renderer is
 * untouched.
 */
export function MarkdownEditor({
  value,
  onChange,
  folder = "blog",
}: {
  value: string;
  onChange: (v: string) => void;
  folder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [pickerOpen, setPickerOpen] = useState(false);

  const toc = extractToc(value);
  const words = wordCount(value);
  const minutes = readingMinutes(value);

  function apply(result: EditResult) {
    onChange(result.text);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.start, result.end);
    });
  }

  function run(fn: (v: string, s: number, e: number) => EditResult) {
    const el = ref.current;
    if (!el) return;
    apply(fn(value, el.selectionStart, el.selectionEnd));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.metaKey || e.ctrlKey)) return;
    const k = e.key.toLowerCase();
    if (k === "b") { e.preventDefault(); run((v, s, en) => wrapSelection(v, s, en, "**", "**", "bold text")); }
    if (k === "i") { e.preventDefault(); run((v, s, en) => wrapSelection(v, s, en, "*", "*", "italic text")); }
    if (k === "k") { e.preventDefault(); run((v, s, en) => wrapSelection(v, s, en, "[", "](https://)", "link text")); }
  }

  function goToHeading(id: string) {
    if (mode === "preview") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const el = ref.current;
    if (!el) return;
    const lines = value.split("\n");
    const idx = lines.findIndex((l) => {
      const m = /^(#{2,3})\s+(.+)$/.exec(l);
      return m && slugify(m[2]!.trim()) === id;
    });
    if (idx >= 0) {
      el.focus();
      el.scrollTop = Math.max(0, (idx - 2) * 22);
      const pos = lines.slice(0, idx).join("\n").length + (idx > 0 ? 1 : 0);
      el.setSelectionRange(pos, pos);
    }
  }

  const tools: { label: string; icon: React.ComponentType<{ className?: string }>; onClick: () => void }[] = [
    { label: "Bold", icon: Bold, onClick: () => run((v, s, e) => wrapSelection(v, s, e, "**", "**", "bold text")) },
    { label: "Italic", icon: Italic, onClick: () => run((v, s, e) => wrapSelection(v, s, e, "*", "*", "italic text")) },
    { label: "Heading", icon: Heading2, onClick: () => run((v, s, e) => formatHeading(v, s, e, 2)) },
    { label: "Subheading", icon: Heading3, onClick: () => run((v, s, e) => formatHeading(v, s, e, 3)) },
    { label: "Bullet list", icon: List, onClick: () => run((v, s, e) => insertBlock(v, s, e, "- First point\n- Second point")) },
    { label: "Numbered list", icon: ListOrdered, onClick: () => run((v, s, e) => insertBlock(v, s, e, "1. First point\n2. Second point")) },
    { label: "Quote", icon: Quote, onClick: () => run((v, s, e) => insertBlock(v, s, e, "> Quoted text")) },
    { label: "Link", icon: Link2, onClick: () => run((v, s, e) => wrapSelection(v, s, e, "[", "](https://)", "link text")) },
    { label: "Image", icon: ImagePlus, onClick: () => setPickerOpen(true) },
    { label: "Divider", icon: Minus, onClick: () => run((v, s, e) => insertBlock(v, s, e, "---")) },
    { label: "Code", icon: Code2, onClick: () => run((v, s, e) => wrapSelection(v, s, e, "`", "`", "code")) },
    { label: "Table", icon: Table2, onClick: () => run((v, s, e) => insertBlock(v, s, e, COMPARISON_TABLE)) },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      {/* Live outline of the article's main points */}
      <aside className="hidden lg:block">
        <div className="admin-card sticky top-4 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListTree className="size-3.5" /> On this page
          </p>
          {toc.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Headings you add with the <strong>Heading</strong> button appear here and become the article's contents list.
            </p>
          ) : (
            <ol className="mt-3 space-y-1.5 text-sm">
              {toc.map((t) => (
                <li key={t.id} style={{ paddingLeft: `${(t.level - 2) * 12}px` }}>
                  <button
                    type="button"
                    onClick={() => goToHeading(t.id)}
                    className="text-left text-foreground/80 transition-colors hover:text-primary"
                  >
                    {t.text}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </aside>

      {/* Editor */}
      <div className="admin-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          {tools.map((t) => (
            <Button
              key={t.label}
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.label}
              title={t.label}
              disabled={mode === "preview"}
              onClick={t.onClick}
            >
              <t.icon className="size-4" />
            </Button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            <Button type="button" variant={mode === "write" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("write")}>
              <PenLine className="mr-1.5 size-4" />Write
            </Button>
            <Button type="button" variant={mode === "preview" ? "secondary" : "ghost"} size="sm" onClick={() => setMode("preview")}>
              <Eye className="mr-1.5 size-4" />Preview
            </Button>
          </div>
        </div>

        {mode === "write" ? (
          <Textarea
            ref={ref}
            rows={26}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
            placeholder={"## Introduction\n\nWrite your article here. Select text and use the toolbar to make it bold, add headings, images, lists and more…"}
          />
        ) : (
          <div className="prose prose-slate max-w-none min-h-[40rem] px-6 py-6 prose-headings:font-display">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children, ...props }) => <h2 id={slugify(String(children))} {...props}>{children}</h2>,
                h3: ({ children, ...props }) => <h3 id={slugify(String(children))} {...props}>{children}</h3>,
              }}
            >
              {value}
            </ReactMarkdown>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
          <span>{words.toLocaleString()} words · about {minutes} min read</span>
          <span>Ctrl/Cmd + B bold · I italic · K link</span>
        </div>
      </div>

      <MediaPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        folder={folder}
        onSelect={(url, asset) =>
          run((v, s, e) => insertBlock(v, s, e, `![${asset?.alt_text ?? "Describe this image"}](${url})`))
        }
      />
    </div>
  );
}
