(() => {
  const measurementId = 'G-WBRDS9YMX5';
  const storageKey = 'rae-sk-analytics-consent-v1';
  const lifetime = 180 * 24 * 60 * 60 * 1000;
  const production = ['fcrae.ee', 'www.fcrae.ee'].includes(location.hostname);
  const events = new Set([
    'donation_cta', 'partner_cta', 'supporter_pdf', 'value_donation_cta',
    'value_partner_cta', 'supporter_wall_partner_cta', 'business_meeting_cta',
    'footer_meeting_cta', 'fan_shop', 'payment_details_open',
    'supporter_wish_success', 'cooperation_success', 'contact_success'
  ]);
  let consent = readConsent();
  let loaded = false;
  let returnFocus;

  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && ['granted', 'denied'].includes(saved.value) &&
          saved.at <= Date.now() && Date.now() - saved.at < lifetime) return saved.value;
    } catch { /* Unavailable storage means no remembered consent. */ }
    return null;
  }

  // Only public, known campaign labels are forwarded; form/query values are not.
  function pageLocation() {
    const url = new URL(location.origin + location.pathname);
    const params = new URLSearchParams(location.search);
    const campaigns = {
      utm_source: ['uudis', 'facebook', 'instagram'],
      utm_medium: ['veeb', 'social', 'organic_social'],
      utm_campaign: ['hooaja-lopumang-2026']
    };
    for (const [key, values] of Object.entries(campaigns)) {
      if (values.includes(params.get(key))) url.searchParams.set(key, params.get(key));
    }
    return url.href;
  }

  function referrer() {
    try {
      const url = new URL(document.referrer);
      return url.origin === location.origin ? url.origin + url.pathname : url.origin + '/';
    } catch { return ''; }
  }

  function gtag() { window.dataLayer.push(arguments); }

  function start() {
    if (!production || consent !== 'granted' || loaded) return;
    loaded = true;
    window['ga-disable-' + measurementId] = false;
    window.dataLayer = window.dataLayer || [];
    gtag('consent', 'default', {
      analytics_storage: 'denied', ad_storage: 'denied',
      ad_user_data: 'denied', ad_personalization: 'denied'
    });
    gtag('consent', 'update', { analytics_storage: 'granted' });
    gtag('js', new Date());
    gtag('config', measurementId, {
      send_page_view: false,
      page_location: pageLocation(), page_referrer: referrer(),
      allow_google_signals: false, allow_ad_personalization_signals: false,
      cookie_expires: lifetime / 1000, cookie_update: false,
      cookie_flags: 'SameSite=Lax;Secure'
    });
    track('page_view');
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
    document.head.append(script);
  }

  function track(name) {
    if (consent !== 'granted' || !loaded) return;
    gtag('event', name, {
      send_to: measurementId,
      page_location: pageLocation(), page_referrer: referrer()
    });
  }

  function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.fcrae.ee']) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? '; Domain=' + domain : ''}`;
      }
    }
  }

  const panel = document.createElement('section');
  panel.className = 'analytics-consent';
  panel.setAttribute('aria-label', 'Analüütika valikud');
  panel.innerHTML = `
    <div class="analytics-consent-copy">
      <h2 tabindex="-1">Kas lubad külastusstatistikat?</h2>
      <p>Sinu loal kasutame Google Analyticsit, et näha, millised lehed huvi pakuvad ja kuidas jõutakse toetamiseni. Keeldumisel töötab veeb samamoodi.</p>
      <details><summary>Mida mõõdame?</summary>
        <p>Mõõdame lehekülastusi, toetamise linkide kasutamist ja päringu õnnestunud saatmist. Vormidesse kirjutatud nimesid, e-posti aadresse ega sõnumeid Analyticsisse ei saadeta. Pangaandmete avamine ei tähenda makse laekumist.</p>
        <p>Nõusolekul edastatakse Google'ile külastus- ja seadmeandmed, sh IP-aadress, mille abil tuletatakse ligikaudne asukoht. Google Analytics kasutab külastuste seostamiseks küpsiseid <code>_ga</code> ja <code>_ga_…</code> kuni 180 päeva. Kasutaja- ja sündmuseandmete säilitusaeg Analyticsis on kaks kuud; koondaruanded võivad säilida kauem. Reklaamifunktsioone me ei kasuta.</p>
        <p>Veebilehe haldaja on FC Rae SK MTÜ. Küsimused: <a href="mailto:info@fcrae.ee">info@fcrae.ee</a>. <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">Kuidas Google andmeid kasutab</a>.</p>
        <p>Sinu valik säilib selles brauseris 180 päeva. Seda saad igal ajal jaluse lingist „Analüütika valikud” muuta.</p>
      </details>
      <p class="analytics-consent-status" role="status"></p>
    </div>
    <div class="analytics-consent-actions">
      <button type="button" class="button button-outline" data-analytics-deny>Ei luba</button>
      <button type="button" class="button button-dark" data-analytics-allow>Luban statistikat</button>
    </div>`;
  panel.hidden = consent !== null;
  document.body.append(panel);
  const status = panel.querySelector('[role="status"]');
  const choiceText = () => {
    status.textContent = consent === 'granted' ? 'Praegune valik: statistika lubatud.' :
      consent === 'denied' ? 'Praegune valik: statistika keelatud.' : '';
  };

  function choose(value) {
    consent = value;
    try { localStorage.setItem(storageKey, JSON.stringify({ value, at: Date.now() })); }
    catch { /* The choice still applies to this page. */ }
    panel.hidden = true;
    if (value === 'granted') start();
    else {
      window['ga-disable-' + measurementId] = true;
      clearCookies();
      // A fresh page also removes Google's already-running timers/listeners.
      if (loaded) { location.reload(); return; }
    }
    if (returnFocus?.isConnected) returnFocus.focus();
  }
  panel.querySelector('[data-analytics-allow]').addEventListener('click', () => choose('granted'));
  panel.querySelector('[data-analytics-deny]').addEventListener('click', () => choose('denied'));

  const preferences = document.createElement('button');
  preferences.type = 'button';
  preferences.className = 'analytics-preferences';
  preferences.textContent = 'Analüütika valikud';
  preferences.addEventListener('click', () => {
    returnFocus = preferences;
    choiceText();
    panel.hidden = false;
    panel.querySelector('h2').focus({ preventScroll: true });
  });
  document.querySelector('.site-footer > div:last-child')?.append(preferences);

  document.addEventListener('supporter-event', ({ detail }) => {
    if (events.has(detail?.event)) track(detail.event);
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('data-track')) return;
    const url = new URL(link.href);
    if (url.origin === location.origin && url.pathname === '/toetajad/' && location.pathname !== '/toetajad/') {
      track('supporters_link_click');
    }
  });
  window.addEventListener('storage', (event) => {
    if (event.key === storageKey || event.key === null) {
      const previous = consent;
      consent = readConsent();
      panel.hidden = consent !== null;
      choiceText();
      if (consent !== 'granted') {
        window['ga-disable-' + measurementId] = true;
        clearCookies();
        if (loaded) location.reload();
      } else if (previous !== 'granted') start();
    }
  });
  if (consent !== 'granted') {
    window['ga-disable-' + measurementId] = true;
    clearCookies();
  }
  start();
})();
