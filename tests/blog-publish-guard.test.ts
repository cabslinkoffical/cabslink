import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

// Exercise the actual migration's trigger in transaction-local tables only.
// No real posts, author records, or public functions are changed.
const migration = readFileSync("drizzle/migrations/0000_allow_existing_team_blog_authors.sql", "utf8")
  .replace("public.blog_posts_publish_guard()", "pg_temp.blog_posts_publish_guard()")
  .replace("FROM public.blog_authors", "FROM pg_temp.blog_authors");

function run(statement: string) {
  const sql = `BEGIN;
    CREATE TEMP TABLE blog_authors (id int, name text, active boolean);
    INSERT INTO blog_authors VALUES (1, 'Cabslink Team', true), (2, 'Inactive Author', false), (3, '', true);
    CREATE TEMP TABLE blog_posts (title text DEFAULT 'Test article', slug text DEFAULT 'test-article',
      category_id int DEFAULT 1, featured_image_url text DEFAULT '/test.jpg',
      seo_title text DEFAULT 'Test article', meta_description text DEFAULT 'Test description',
      body_md text DEFAULT repeat('Verified article content. ', 30), author_id int DEFAULT 1,
      status text DEFAULT 'draft', published_at timestamptz);
    ${migration}
    CREATE TRIGGER publish_guard BEFORE INSERT OR UPDATE ON blog_posts
      FOR EACH ROW EXECUTE FUNCTION pg_temp.blog_posts_publish_guard();
    ${statement}
    ROLLBACK;`;
  return execFileSync("psql", ["-X", "-qAt", "-v", "ON_ERROR_STOP=1"], {
    input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

describe.skipIf(!process.env.PGHOST)("blog publishing database guard", () => {
  it("publishes the existing team byline without a person name, biography or photo", () => {
    expect(run("INSERT INTO blog_posts (status) VALUES ('published') RETURNING status, author_id, published_at IS NOT NULL;"))
      .toBe("published|1|t");
  });
  it("saves drafts without an author", () => {
    expect(run("INSERT INTO blog_posts (author_id) VALUES (NULL) RETURNING status;" )).toBe("draft");
  });
  it("publishes a saved draft with its existing team author", () => {
    expect(run("INSERT INTO blog_posts DEFAULT VALUES; UPDATE blog_posts SET status = 'published' RETURNING status, author_id;"))
      .toBe("published|1");
  });
  it.each(["NULL", "2", "3"])("rejects missing, inactive or blank authors (%s) on publication", (author) => {
    expect(() => run(`INSERT INTO blog_posts (status, author_id) VALUES ('published', ${author});`))
      .toThrow(/Choose an active author/);
  });
  it("preserves the existing minimum body-content requirement", () => {
    expect(() => run("INSERT INTO blog_posts (status, body_md) VALUES ('published', 'Short');"))
      .toThrow(/at least 600 characters/);
  });
  it("keeps already-live articles editable with their existing author state", () => {
    expect(run("INSERT INTO blog_posts (status) VALUES ('published'); UPDATE blog_posts SET author_id = NULL RETURNING status;"))
      .toBe("published");
  });
});