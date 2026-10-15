import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createContactHandler } from "../api/forms/contact.mjs";

const port = Number(process.env.PORT ?? 4173);
const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(await readFile(join(root, "data/supporters.json"), "utf8"));

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ics": "text/calendar; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf"
};

export function createSiteServer({ contactHandler = createContactHandler({ config, root }) } = {}) {
  return createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);

  if (url.pathname === "/api/forms/contact" || url.pathname === "/api/forms/contact.php") {
    await contactHandler(request, response);
    return;
  }

  try {
    const path = decodeURIComponent(url.pathname).replaceAll("\\", "/");
    if (path.split("/").some((part) => part.startsWith(".") || ["api", "scripts", "node_modules", "output"].includes(part))) throw new Error("private_path");
    let filePath = resolve(root, `.${path}`);
    if (filePath !== resolve(root) && !filePath.startsWith(resolve(root) + sep)) throw new Error("invalid_path");
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, "index.html");
    if (!existsSync(filePath) || !types[extname(filePath)]) throw new Error("not_public");
    response.writeHead(200, {
      "content-type": types[extname(filePath)],
      "X-Content-Type-Options": "nosniff"
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Lehte ei leitud.");
  }
});
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) createSiteServer().listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`FC Rae MVP running at http://localhost:${port}`);
});
