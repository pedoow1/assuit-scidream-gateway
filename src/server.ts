import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
//
// IMPORTANT: this must only touch real page navigations. Server functions
// (like the AI assistant's chatWithAssistant) also go through this same
// fetch handler, and they throw on purpose sometimes (missing API key,
// upstream API failure, etc). Their client-side caller (useServerFn) expects
// a JSON response back — if we swap it for this HTML page, the client is
// left waiting on JSON that never arrives, which looks exactly like an
// infinite "loading" spinner with no error ever shown. A browser navigating
// to a page always sends `Accept: text/html`; a server-fn RPC fetch does not.
async function normalizeCatastrophicSsrResponse(request: Request, response: Response): Promise<Response> {
  if (response.status < 500) return response;
  if (!(request.headers.get("accept") ?? "").includes("text/html")) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(request, response);
    } catch (error) {
      console.error(error);
      // Same reasoning as above: don't hand back an HTML page in place of a
      // JSON error for non-navigation requests (server functions, etc).
      if (!(request.headers.get("accept") ?? "").includes("text/html")) {
        return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown server error" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
