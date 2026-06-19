import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT ?? 4173);
const root = process.cwd();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml"
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);

  if (url.pathname === "/api/forms/contact" || url.pathname === "/api/forms/contact.php") {
    response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: "local_static_server" }));
    return;
  }

  const safePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(root, safePath === "/" ? "index.html" : safePath);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(root, "index.html");
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": types[extname(filePath)] ?? "application/octet-stream"
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`FC Rae MVP running at http://localhost:${port}`);
});
