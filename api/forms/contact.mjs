import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const emailPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (status, message, field) => Object.assign(new Error(message), { status, field });

export function validateForm(input, config, now = Date.now()) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw fail(400, "Vormi andmed ei ole korrektsed.");
  if (!["contact", "sponsor", "supporter"].includes(input.type)) throw fail(400, "Tundmatu vorm.");
  // Existing published forms predate client-generated IDs. Keep exact retries idempotent.
  if (!input.requestId && input.type !== "supporter") {
    const legacy = hash(JSON.stringify(input));
    input = { ...input, requestId: `${legacy.slice(0, 8)}-${legacy.slice(8, 12)}-4${legacy.slice(13, 16)}-8${legacy.slice(17, 20)}-${legacy.slice(20, 32)}` };
  }
  if (!uuidPattern.test(input.requestId || "")) throw fail(400, "Värskenda lehte ja proovi uuesti.");
  if (input.website) throw fail(400, "Vormi saatmine ei õnnestunud.");
  const elapsed = now - Number(input.renderedAt);
  if (!Number.isFinite(elapsed) || elapsed < 4000 || elapsed > 24 * 60 * 60 * 1000) throw fail(400, "Palun oota mõni sekund või värskenda pikalt avatud lehte.");
  if (![true, "on"].includes(input.consent)) throw fail(400, "Palun kinnita, et võime sinuga päringu asjus ühendust võtta.", "consent");
  const output = { type: input.type, requestId: input.requestId };
  for (const [name, limit] of Object.entries({ name: 120, contact: 120, company: 160, email: 254, phone: 40, message: 4000, topic: 160, interest: 160, shirtSize: 40, publicName: 160 })) {
    if (input[name] !== undefined && typeof input[name] !== "string") throw fail(400, "Kontrolli välja sisu.", name);
    output[name] = String(input[name] ?? "").trim();
    if (output[name].length > limit || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(output[name])) throw fail(400, `Väli on liiga pikk või sisaldab sobimatuid märke.`, name);
  }
  if (!emailPattern.test(output.email)) throw fail(400, "Sisesta toimiv e-posti aadress.", "email");
  const nameField = input.type === "contact" ? "name" : "contact";
  if (!output[nameField]) throw fail(400, "Sisesta kontaktisiku nimi.", nameField);
  if ((input.type === "sponsor" || (input.type === "supporter" && input.customerType === "company")) && !output.company) throw fail(400, "Sisesta ettevõtte nimi.", "company");
  if ((output.message.match(/https?:\/\//gi) || []).length > 2) throw fail(400, "Sõnumis on liiga palju linke. Palun kirjuta info@fcrae.ee.", "message");
  if (input.type === "supporter") {
    if (!["person", "company"].includes(input.customerType)) throw fail(400, "Vali eraisik või ettevõte.", "customerType");
    if (input.supportVersion !== config.version) throw fail(409, "Toetamise info on muutunud. Värskenda lehte ja vaata tingimused üle.");
    const amount = typeof input.donationAmount === "string" && /^\d+(?:\.\d{1,2})?$/.test(input.donationAmount) ? Number(input.donationAmount) : NaN;
    if (!Number.isFinite(amount) || amount < config.thankYouMinimum || amount > 100000) throw fail(400, `Fännikomplekti või tänuavalduse saad valida vähemalt ${config.thankYouMinimum} € toetuse eest.`, "donationAmount");
    if (!["request", "decline"].includes(input.fanKit)) throw fail(400, "Vali, kas soovid fännikomplekti.", "fanKit");
    if (input.publishConsent !== undefined && ![true, false, "on"].includes(input.publishConsent)) throw fail(400, "Kontrolli nime avaldamise nõusolekut.", "publishConsent");
    output.publishConsent = [true, "on"].includes(input.publishConsent);
    if (output.publishConsent && !output.publicName) throw fail(400, "Sisesta nimi, mida lubad veebilehel avaldada.", "publicName");
    if (!output.publishConsent) output.publicName = "";
    output.fanKit = input.fanKit;
    if (input.fanKit === "decline") output.shirtSize = "";
    output.donationAmount = amount;
    output.supportVersion = config.version;
    output.customerType = input.customerType;
    if (input.customerType === "person") output.company = "";
  }
  output.consent = true;
  return output;
}

export function createSendmailTransport(env = process.env) {
  if (!env.SENDMAIL_PATH || !emailPattern.test(env.MAIL_FROM || "")) return null;
  return ({ to, subject, text, replyTo }) => new Promise((resolveSend, reject) => {
    if (!emailPattern.test(to) || (replyTo && !emailPattern.test(replyTo))) return reject(new Error("invalid_recipient"));
    const headers = [
      `From: ${env.MAIL_FROM}`, `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
      "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64",
      ...(replyTo ? [`Reply-To: ${replyTo}`] : [])
    ];
    const message = `${headers.join("\r\n")}\r\n\r\n${Buffer.from(text).toString("base64").match(/.{1,76}/g).join("\r\n")}\r\n`;
    const child = spawn(env.SENDMAIL_PATH, ["-t", "-i"], { stdio: ["pipe", "ignore", "ignore"], timeout: 30000, windowsHide: true });
    child.once("error", reject);
    child.stdin.once("error", reject);
    child.once("close", (code) => code === 0 ? resolveSend() : reject(new Error("mail_delivery_failed")));
    child.stdin.end(message);
  });
}

export function createContactHandler({ config, root, databasePath = process.env.FORMS_DATABASE || resolve(homedir(), ".fcrae-private", "requests.sqlite"), sendMail = createSendmailTransport(), now = Date.now } = {}) {
  let database;
  const inFlight = new Map();
  const rateLimits = new Map();
  const getDatabase = () => {
    if (database) return database;
    const path = resolve(databasePath);
    const publicRoot = resolve(root);
    if (path.toLowerCase() === publicRoot.toLowerCase() || path.toLowerCase().startsWith((publicRoot + sep).toLowerCase())) throw new Error("Form registry must be outside the public website directory.");
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    database = new DatabaseSync(path);
    database.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, created_at TEXT NOT NULL, fingerprint TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', club_sent INTEGER NOT NULL DEFAULT 0, confirmation_sent INTEGER NOT NULL DEFAULT 0);");
    return database;
  };
  const deliver = async (payload, fingerprint) => {
    const db = getDatabase();
    let record = db.prepare("SELECT * FROM requests WHERE id = ?").get(payload.requestId);
    if (record && record.fingerprint !== fingerprint) throw fail(409, "Selle päringu sisu on muutunud. Proovi uuesti.");
    if (!record) {
      db.prepare("INSERT INTO requests (id, created_at, fingerprint, payload) VALUES (?, ?, ?, ?)").run(payload.requestId, new Date(now()).toISOString(), fingerprint, JSON.stringify(payload));
      record = db.prepare("SELECT * FROM requests WHERE id = ?").get(payload.requestId);
    }
    const label = payload.type === "supporter" ? "Fännikomplekti / tänuavalduse soov" : payload.type === "sponsor" ? "Koostöösoov" : "Kontaktipäring";
    const supporterText = payload.type === "supporter" ? `\nToetaja märgitud ülekande summa: ${payload.donationAmount} €. Laekumine on kontrollimata.\nVähemalt ${config.thankYouMinimum} € toetuse eest saab soovi korral ühe fännisärgi ja ühe salli ning nõusolekul tänuavalduse FC Rae veebilehel.\nFännikomplekt: ${payload.fanKit === "request" ? "soovin särki ja salli" : "loobun"}.\nSärgisuuruse soov: ${payload.shirtSize || "täpsustame eraldi"}.\nNime avaldamise nõusolek: ${payload.publishConsent ? `jah; avaldatav nimi: ${payload.publicName}` : "ei"}.\nÜleandmise lepime eraldi kokku. Vormi saatmine ei kinnita makse laekumist.\n` : "";
    const publicationNote = payload.type === "supporter" ? (payload.publishConsent ? "Nime avaldamine on lubatud ainult ülal märgitud nimega ja pärast laekumise kontrollimist." : "Nime avaldamise nõusolekut ei ole antud.") : "Nime avaldamiseks nõusolekut ei ole küsitud ega antud.";
    if (!record.club_sent) {
      await sendMail({ to: config.contactEmail, replyTo: payload.email, subject: `Rae SK: ${label}`, text: `Liik: ${label}\nNimi: ${payload.contact || payload.name}\nEttevõte: ${payload.company || "-"}\nE-post: ${payload.email}\nTelefon: ${payload.phone || "-"}\nHuvi / teema: ${payload.interest || payload.topic || "-"}\n${supporterText}\nSõnum:\n${payload.message || "-"}\n\nÜhenduse võtmise nõusolek: jah.\n${publicationNote}` });
      db.prepare("UPDATE requests SET club_sent = 1 WHERE id = ?").run(payload.requestId);
    }
    let confirmationSent = Boolean(record.confirmation_sent);
    if (!confirmationSent) {
      try {
        await sendMail({ to: payload.email, replyTo: config.contactEmail, subject: "Rae SK: päringu kinnitus", text: `Aitäh! Sinu ${label.toLowerCase()} jõudis Rae SK-ni. Võtame ühendust.\n\n${supporterText}\nSee kiri ei kinnita makse laekumist. ${publicationNote}\n\n${config.legalName}\n${config.contactEmail}` });
        db.prepare("UPDATE requests SET confirmation_sent = 1 WHERE id = ?").run(payload.requestId);
        confirmationSent = true;
      } catch { /* The club has the request; a retry with the same ID can resend the confirmation. */ }
    }
    return { ok: true, requestId: payload.requestId, confirmationSent };
  };
  const handler = async (request, response) => {
    const reply = (status, value) => { response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); response.end(JSON.stringify(value)); };
    try {
      if (request.method !== "POST") { response.setHeader("Allow", "POST"); return reply(405, { ok: false, message: "Kasuta vormi saatmiseks POST-päringut." }); }
      if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}` && request.headers.origin !== `https://${request.headers.host}`) throw fail(403, "Saada päring klubi veebilehelt.");
      if (!/^application\/json(?:;|$)/i.test(String(request.headers["content-type"] || ""))) throw fail(415, "Vormi andmevorming ei sobi.");
      const chunks = [];
      let size = 0;
      for await (const chunk of request) {
        size += chunk.length;
        if (size > 24000) throw fail(413, "Päring on liiga suur. Lühenda sõnumit.");
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw fail(400, "Vormi andmed ei ole korrektsed."); }
      const payload = validateForm(input, config, now());
      if (!sendMail) throw fail(503, "Vormi meiliedastus pole veel seadistatud. Palun kirjuta info@fcrae.ee.");
      // ponytail: one process, five submissions per address per 15 minutes; use a shared limiter if adding workers.
      const ip = request.socket.remoteAddress || "unknown";
      const client = process.env.TRUST_LOCAL_PROXY === "1" && ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(ip) ? String(request.headers["x-real-ip"] || ip) : ip;
      const key = hash(client);
      for (const [entry, limit] of rateLimits) if (limit.until < now()) rateLimits.delete(entry);
      const limit = rateLimits.get(key) || { count: 0, until: now() + 15 * 60 * 1000, ids: new Set() };
      if (!limit.ids.has(payload.requestId)) {
        if (limit.count >= 5) throw fail(429, "Liiga palju päringuid. Proovi 15 minuti pärast või kirjuta info@fcrae.ee.");
        limit.ids.add(payload.requestId); limit.count += 1; rateLimits.set(key, limit);
      }
      const fingerprint = hash(JSON.stringify(payload));
      const pending = inFlight.get(payload.requestId);
      if (pending && pending.fingerprint !== fingerprint) throw fail(409, "Selle päringu sisu on muutunud. Proovi uuesti.");
      if (pending) return reply(200, await pending.promise);
      const promise = deliver(payload, fingerprint);
      inFlight.set(payload.requestId, { promise, fingerprint });
      try { reply(200, await promise); } finally { inFlight.delete(payload.requestId); }
    } catch (error) {
      if (!error.status) console.error("Form processing failed:", error.code || error.name);
      reply(error.status || 503, { ok: false, message: error.status ? error.message : "Saatmine ei õnnestunud. Proovi uuesti või kirjuta info@fcrae.ee.", ...(error.field ? { field: error.field } : {}) });
    }
  };
  handler.close = () => database?.close();
  return handler;
}
