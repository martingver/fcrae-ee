import { readFile, writeFile } from "node:fs/promises";

const config = JSON.parse(await readFile(new URL("../data/supporters.json", import.meta.url), "utf8"));
const escape = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
let html = await readFile(new URL("../toetajad/index.html", import.meta.url), "utf8");
html = html.replace(/(<span data-supporter-price>)[\s\S]*?(<\/span>)/g, `$1${config.price} €$2`);
html = html.replace(/<!-- package-benefits:start -->[\s\S]*?<!-- package-benefits:end -->/, `<!-- package-benefits:start -->\n${config.benefits.map((item) => `            <li>${escape(item)}</li>`).join("\n")}\n          <!-- package-benefits:end -->`);
html = html.replace(/(<script id="supporter-config" type="application\/json">)[\s\S]*?(<\/script>)/, (_, start, end) => `${start}${JSON.stringify(config).replaceAll("<", "\\u003c")}${end}`);
html = html.replace(/(data-supporter-pdf href=")[^"]*"/g, `$1${escape(config.pdfUrl)}"`);
html = html.replace(/(data-supporter-shop href=")[^"]*"/g, `$1${escape(config.shopUrl)}"`);
await writeFile(new URL("../toetajad/index.html", import.meta.url), html);
await writeFile(new URL("../toetajad.html", import.meta.url), html);
console.log("Toetajaleht uuendatud: /toetajad/ ja /toetajad.html");
