-- Phase 4 data fix (applied live through the data tool; kept here so the repo matches).
-- Repeat-safe: the WHERE clauses only match rows that still need the change.
UPDATE public.blog_posts SET body_md = replace(body_md, '''''', ''''), title = replace(title, '''''', ''''), excerpt = replace(excerpt, '''''', '''')
WHERE body_md LIKE '%''''%' OR title LIKE '%''''%' OR coalesce(excerpt,'') LIKE '%''''%';
-- The edinburgh-airport-meet-greet-explained body was rewritten to match src/lib/site-facts.ts
-- (60 min free from actual landing, 50p/75p per minute, meet and greet included, 12h/3h cancellation).
