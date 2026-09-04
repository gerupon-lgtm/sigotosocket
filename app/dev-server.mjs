import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.env.PORT ?? 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const relative = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = join(ROOT, normalize(relative).replace(/^(\.\.[/\\])+/, ""));
  if (!target.startsWith(ROOT)) { res.writeHead(403).end("forbidden"); return; }
  try {
    const body = await readFile(target);
    res.writeHead(200, { "content-type": TYPES[extname(target)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/`));
