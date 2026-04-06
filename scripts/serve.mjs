import { createReadStream, promises as fs } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const distDir = path.join(rootDir, "dist");
const port = Number(process.env.PORT || 4173);
const liveReloadEnabled = process.env.LIVE_RELOAD === "1";
const eventClients = new Set();

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
]);

await ensureDistExists();

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? `127.0.0.1:${port}`}`);

    if (liveReloadEnabled && request.method === "GET" && requestUrl.pathname === "/__events") {
      openEventStream(response);
      return;
    }

    if (liveReloadEnabled && request.method === "POST" && requestUrl.pathname === "/__reload") {
      await drainRequest(request);
      broadcastReload();
      response.statusCode = 204;
      response.end();
      return;
    }

    const filePath = await resolvePath(requestUrl.pathname);

    if (!filePath) {
      response.statusCode = 404;
      await sendResponse(path.join(distDir, "404.html"), response);
      return;
    }

    response.statusCode = 200;
    await sendResponse(filePath, response);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "text/plain; charset=utf-8");
    response.end(`Preview server error\n${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, "127.0.0.1", () => {
  const mode = liveReloadEnabled ? "with live reload" : "preview mode";
  console.log(`Preview server running at http://127.0.0.1:${port} (${mode})`);
});

async function ensureDistExists() {
  try {
    await fs.access(distDir);
  } catch {
    console.error("dist is missing. Run `npm run build` first.");
    process.exit(1);
  }
}

async function resolvePath(pathname) {
  const relativePath = decodeURIComponent(pathname);
  const candidates = [];

  if (relativePath === "/") {
    candidates.push(path.join(distDir, "index.html"));
  } else {
    const exactPath = path.join(distDir, relativePath);
    const directoryPath = path.join(distDir, relativePath, "index.html");

    candidates.push(exactPath, directoryPath);

    if (!path.extname(relativePath)) {
      candidates.push(path.join(distDir, `${relativePath}.html`));
    }
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);

    if (!resolved.startsWith(distDir)) {
      continue;
    }

    try {
      const stats = await fs.stat(resolved);
      if (stats.isFile()) {
        return resolved;
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function sendResponse(filePath, response) {
  const extension = path.extname(filePath);
  response.setHeader("Content-Type", mimeTypes.get(extension) ?? "application/octet-stream");

  if (liveReloadEnabled) {
    response.setHeader("Cache-Control", "no-store");
  }

  if (liveReloadEnabled && extension === ".html") {
    const html = await fs.readFile(filePath, "utf8");
    response.end(injectLiveReload(html));
    return;
  }

  await streamFile(filePath, response);
}

function injectLiveReload(html) {
  const snippet = `<script>
(() => {
  const source = new EventSource("/__events");
  source.onmessage = () => window.location.reload();
})();
</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${snippet}</body>`) : `${html}${snippet}`;
}

function openEventStream(response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  response.write("retry: 300\n\n");
  eventClients.add(response);
  response.on("close", () => {
    eventClients.delete(response);
  });
}

function broadcastReload() {
  for (const client of eventClients) {
    client.write(`data: reload-${Date.now()}\n\n`);
  }
}

function drainRequest(request) {
  return new Promise((resolve, reject) => {
    request.on("data", () => {});
    request.on("end", resolve);
    request.on("error", reject);
  });
}

function streamFile(filePath, response) {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("error", reject);
    stream.on("end", resolve);
    stream.pipe(response);
  });
}
