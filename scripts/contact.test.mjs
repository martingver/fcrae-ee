import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createContactHandler, validateForm } from "../api/forms/contact.mjs";
import { createSiteServer } from "./static-server.mjs";

const config = JSON.parse(await readFile(new URL("../data/supporters.json", import.meta.url), "utf8"));
const form = (override = {}) => ({ type: "supporter", requestId: randomUUID(), renderedAt: Date.now() - 5000, contact: "Test Toetaja", email: "test@example.invalid", customerType: "person", packageVersion: config.version, consent: "on", ...override });

test("trust boundary: required fields, consent, stale package, spam and company", () => {
  for (const override of [{ email: "bad" }, { email: "localalias,user@host.invalid" }, { email: "test@host.invalid\r\nBcc: other@host.invalid" }, { consent: "" }, { contact: " " }, { renderedAt: Date.now() }, { packageVersion: "old" }, { customerType: "company", company: "" }, { website: "bot" }, { type: "invoice" }, { message: "https://a https://b https://c" }]) {
    assert.throws(() => validateForm(form(override), config));
  }
  const data = validateForm(form(), config);
  assert.equal(data.package.price, config.price);
  assert.equal(data.package.mode, "interest");
  assert.equal(data.consent, true);
  assert.deepEqual(data.package.benefits, config.benefits);
  const legacy = form({ type: "contact", name: "Vana vorm" });
  delete legacy.requestId;
  assert.equal(validateForm(legacy, config).requestId, validateForm({ ...legacy }, config).requestId);
});

test("real HTTP: one record and one pair of emails for concurrent duplicate submits; retry on delivery failure", async () => {
  const dir = await mkdtemp(join(tmpdir(), "rae-forms-test-"));
  const dbPath = join(dir, "requests.sqlite");
  const mails = [];
  let failDelivery = false;
  let failConfirmation = false;
  const handler = createContactHandler({ config, root: process.cwd(), databasePath: dbPath, sendMail: async (message) => {
    if (failDelivery || (failConfirmation && message.to !== config.contactEmail)) throw new Error("simulated_mail_failure");
    mails.push(message);
    await new Promise((resolve) => setTimeout(resolve, 5));
  } });
  const server = createSiteServer({ contactHandler: handler });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (data) => fetch(`${base}/api/forms/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  try {
    const data = form();
    const results = await Promise.all([post(data), post(data)]);
    assert.deepEqual(results.map((r) => r.status), [200, 200]);
    for (const response of results) assert.equal((await response.json()).requestId, data.requestId);
    assert.equal(mails.length, 2);
    assert.match(mails[1].text, new RegExp(`${config.price} € aastas`));
    assert.match(mails[1].text, /ei ole tellimus/);
    assert.equal((await post(data)).status, 200);
    assert.equal(mails.length, 2);
    assert.equal((await post({ ...data, message: "changed" })).status, 409);
    assert.equal((await post(form({ email: "invalid" }))).status, 400);
    failDelivery = true;
    const retryData = form({ customerType: "company", company: "Test OÜ" });
    assert.equal((await post(retryData)).status, 503);
    failDelivery = false;
    assert.equal((await post(retryData)).status, 200);
    assert.equal(mails.length, 4);
    failConfirmation = true;
    const confirmationData = form({ type: "sponsor", company: "Test OÜ", interest: "Kohtumine" });
    assert.equal((await (await post(confirmationData)).json()).confirmationSent, false);
    failConfirmation = false;
    assert.equal((await (await post(confirmationData)).json()).confirmationSent, true);
    assert.equal(mails.length, 6);
    const oldContact = form({ type: "contact", name: "Test Nimi", topic: "Treening" });
    assert.equal((await post(oldContact)).status, 200);
    for (const mail of mails) {
      assert.doesNotMatch(mail.text, /Päringu tunnus:/);
      assert.doesNotMatch(mail.text, /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    }
    for (const path of ["/api/forms/contact.mjs", "/.git/config", "/.env", "/scripts/contact.test.mjs", "/unknown"]) assert.equal((await fetch(base + path)).status, 404);
    for (const path of ["/", "/kontakt/", "/toetajad/", "/toetajad.html"]) assert.equal((await fetch(base + path)).status, 200);
    const pdf = await fetch(base + "/assets/rae-sk-toetaja-ulevaade.pdf");
    assert.match(pdf.headers.get("content-type"), /application\/pdf/);
    await pdf.arrayBuffer();
    const db = new DatabaseSync(dbPath);
    const rows = db.prepare("SELECT * FROM requests").all();
    assert.equal(rows.length, 4);
    assert.equal(rows[0].id, data.requestId);
    assert.ok(rows.every((row) => row.status === "new"));
    assert.equal(JSON.parse(rows[0].payload).package.version, config.version);
    db.close();
    assert.equal((await post(form())).status, 200);
    assert.equal((await post(form())).status, 429);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    handler.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test("unconfigured mail service never reports success", async () => {
  const handler = createContactHandler({ config, root: process.cwd(), sendMail: null });
  const server = createSiteServer({ contactHandler: handler });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/forms/contact`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form()) });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); handler.close(); }
});
