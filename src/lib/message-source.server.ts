/** Page path the form was sent from, read from the Referer header (same site only). */
export async function sourcePageFromRequest(): Promise<string | null> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const ref = req?.headers.get("referer");
    if (!ref) return null;
    const refUrl = new URL(ref);
    const reqHost = new URL(req.url).host;
    if (refUrl.host !== reqHost) return null;
    return (refUrl.pathname + refUrl.search).slice(0, 300);
  } catch {
    return null;
  }
}
