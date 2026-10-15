import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const config = JSON.parse(await readFile(new URL("../data/supporters.json", import.meta.url), "utf8"));
if (config.bank) {
  const iban = String(config.bank.iban || "").replace(/\s/g, "").toUpperCase();
  const number = [...iban.slice(4) + iban.slice(0, 4)].map((char) => /[A-Z]/.test(char) ? char.charCodeAt(0) - 55 : char).join("");
  if (!config.bank.recipient || !/^EE\d{18}$/.test(iban) || BigInt(number) % 97n !== 1n) throw new Error("Kinnitatud makse saaja ja korrektne Eesti IBAN on vajalikud.");
  config.bank.iban = iban;
}
const escape = (text) => String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
let html = await readFile(new URL("../toetajad/index.html", import.meta.url), "utf8");
html = html.replace(/(<span data-supporter-price>)[\s\S]*?(<\/span>)/g, `$1${config.price} €$2`);
html = html.replace(/<!-- package-benefits:start -->[\s\S]*?<!-- package-benefits:end -->/, `<!-- package-benefits:start -->\n${config.benefits.map((item) => `            <li>${escape(item)}</li>`).join("\n")}\n          <!-- package-benefits:end -->`);
html = html.replace(/(<script id="supporter-config" type="application\/json">)[\s\S]*?(<\/script>)/, (_, start, end) => `${start}${JSON.stringify(config).replaceAll("<", "\\u003c")}${end}`);
html = html.replace(/(data-supporter-pdf href=")[^"]*"/g, `$1${escape(config.pdfUrl)}"`);
html = html.replace(/(data-supporter-shop href=")[^"]*"/g, `$1${escape(config.shopUrl)}"`);
const updates = (config.updates ?? []).map((item) => {
  if (!item.activity || !item.result || !item.photoAlt || !/^\/assets\/[a-zA-Z0-9_./-]+\.(jpg|jpeg|png|webp)$/.test(item.photo || "") || item.photo.includes("..") || !existsSync(new URL(`..${item.photo}`, import.meta.url))) {
    throw new Error("Toetuse ülevaade vajab tegevust, tulemust ja olemasolevat klubifotot koos kirjeldava alt-tekstiga.");
  }
  return `<article class="support-update"><h4>${escape(item.activity)}</h4><img src="${escape(item.photo)}" alt="${escape(item.photoAlt)}" loading="lazy"><p>${escape(item.result)}</p></article>`;
}).join("\n");
html = html.replace(/<!-- supporter-updates:start -->[\s\S]*?<!-- supporter-updates:end -->/, `<!-- supporter-updates:start -->${updates ? `<section class="support-updates" aria-labelledby="updates-title"><h3 id="updates-title">Mida sinu toetus võimaldas</h3>${updates}</section>` : ""}<!-- supporter-updates:end -->`);
await writeFile(new URL("../toetajad/index.html", import.meta.url), html);
await writeFile(new URL("../toetajad.html", import.meta.url), html);
console.log("Toetajaleht uuendatud: /toetajad/ ja /toetajad.html");
