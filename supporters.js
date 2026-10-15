const config = JSON.parse(document.querySelector("#supporter-config").textContent);

// Price and benefits are also rendered into HTML by npm run build:supporters.
document.querySelectorAll("[data-supporter-pdf]").forEach((link) => { link.href = config.pdfUrl; });
document.querySelectorAll("[data-supporter-shop]").forEach((link) => { link.href = config.shopUrl; });

const packageForm = document.querySelector('[data-mail-form="supporter"]');
packageForm.querySelector('[name="packageVersion"]').value = config.version;
const companyGroup = packageForm.querySelector("[data-company-fields]");
const companyInput = companyGroup.querySelector("input");
const syncCompany = () => {
  const isCompany = packageForm.elements.customerType.value === "company";
  companyGroup.hidden = !isCompany;
  companyInput.disabled = !isCompany;
  companyInput.required = isCompany;
};
packageForm.elements.customerType.addEventListener("change", syncCompany);
packageForm.addEventListener("reset", () => requestAnimationFrame(syncCompany));
syncCompany();

const donation = document.querySelector("[data-donation]");
if (config.bank?.recipient && /^EE\d{18}$/.test(config.bank.iban.replace(/\s/g, ""))) {
  donation.querySelector("[data-bank-unavailable]").hidden = true;
  const form = donation.querySelector("form");
  form.hidden = false;
  const custom = form.elements.customAmount;
  const syncAmount = () => {
    const other = form.elements.amount.value === "other";
    custom.closest("label").hidden = !other;
    custom.disabled = !other;
    custom.required = other;
    donation.querySelector("[data-bank-details]").hidden = true;
  };
  form.addEventListener("change", syncAmount);
  form.addEventListener("input", () => { donation.querySelector("[data-bank-details]").hidden = true; });
  syncAmount();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const amount = form.elements.amount.value === "other" ? Number(custom.value) : Number(form.elements.amount.value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const values = { recipient: config.bank.recipient, iban: config.bank.iban, amount: `${amount.toFixed(2)} €`, reference: config.bank.reference || "Rae SK toetus" };
    donation.querySelectorAll("[data-bank-value]").forEach((node) => { node.textContent = values[node.dataset.bankValue]; });
    donation.querySelector("[data-bank-details]").hidden = false;
    document.dispatchEvent(new CustomEvent("supporter-event", { detail: { event: "payment_details_open" } }));
  });
  donation.querySelectorAll("[data-copy]").forEach((button) => button.addEventListener("click", async () => {
    const value = donation.querySelector(`[data-bank-value="${button.dataset.copy}"]`).textContent;
    const status = donation.querySelector("[data-copy-status]");
    try { await navigator.clipboard.writeText(value); status.textContent = "Kopeeritud."; }
    catch { status.textContent = "Kopeerimine ei õnnestunud. Vali tekst ja kopeeri see käsitsi."; }
  }));
}

const documentLinks = document.querySelector("[data-club-documents]");
for (const item of config.documents) {
  if (!item.title || !item.url || !/^(https:\/\/|\/[^/])/.test(item.url)) continue;
  const link = document.createElement("a");
  link.href = item.url;
  link.textContent = item.title;
  documentLinks.append(link);
}
documentLinks.hidden = !documentLinks.childElementCount;

// An analytics adapter may listen to this event. No personal form data is emitted.
document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-track]");
  if (link) document.dispatchEvent(new CustomEvent("supporter-event", { detail: { event: link.dataset.track } }));
});
