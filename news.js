const copyNews = document.querySelector("[data-copy-news]");
if (copyNews && navigator.clipboard?.writeText) {
  copyNews.hidden = false;
  copyNews.addEventListener("click", async () => {
    const status = document.querySelector("[data-copy-status]");
    try {
      await navigator.clipboard.writeText(document.querySelector('link[rel="canonical"]').href);
      status.textContent = "Uudise link on kopeeritud.";
    } catch {
      status.textContent = "Kopeerimine ei õnnestunud. Kopeeri aadress brauseri aadressiribalt.";
    }
  });
}
