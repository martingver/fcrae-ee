import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createContactHandler } from "../api/forms/contact.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(await readFile(new URL("../data/supporters.json", import.meta.url), "utf8"));
const handler = createContactHandler({ root, config });
const server = createServer(async (request, response) => {
  const path = request.url?.split("?")[0];
  if (path === "/api/forms/contact" || path === "/api/forms/contact.php") return handler(request, response);
  response.writeHead(path === "/health" ? 200 : 404, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  response.end(JSON.stringify(path === "/health" ? { ok: true } : { ok: false }));
});
server.listen(Number(process.env.PORT || 4174), process.env.HOST || "127.0.0.1", () => console.log("FC Rae forms service ready"));
process.on("SIGTERM", () => server.close(() => { handler.close(); process.exit(0); }));
