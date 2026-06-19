const fallbackData = {
  updatedAt: null,
  teams: [
    { id: "rae-i", shortName: "Rae I", sourceUrl: "https://jalgpall.ee/voistlused/538/team/6795?season=2026", venue: "Jüri staadion", playerCount: 0 },
    { id: "rae-ii", shortName: "Rae II", sourceUrl: "https://jalgpall.ee/voistlused/548/team/7118?season=2026", venue: "Jüri staadion", playerCount: 0 }
  ],
  matches: [
    {
      teamId: "rae-i",
      team: "Rae I",
      status: "upcoming",
      competition: "II.B.S/E",
      date: "24.10.2026",
      time: "12:00",
      startsAt: "2026-10-24T12:00:00+03:00",
      homeTeam: "Rae Spordikool",
      awayTeam: "JK Kuusalu Kalev",
      opponent: "JK Kuusalu Kalev",
      homeAway: "Kodu",
      jalgpallEeUrl: "https://jalgpall.ee/voistlused/538/team/6795?season=2026"
    },
    {
      teamId: "rae-i",
      team: "Rae I",
      status: "finished",
      competition: "II.B.S/E",
      date: "12.06.2026",
      time: "19:00",
      startsAt: "2026-06-12T19:00:00+03:00",
      homeTeam: "FC Kose",
      awayTeam: "Rae Spordikool",
      opponent: "FC Kose",
      homeAway: "Võõrsil",
      score: "2 - 4",
      jalgpallEeUrl: "https://jalgpall.ee/voistlused/538/team/6795?season=2026"
    }
  ],
  players: []
};

const formatDate = (match) => `${match.date} kell ${match.time}`;

const routes = {
  home: "/",
  club: "/klubi/",
  teams: "/voistkonnad/",
  youth: "/noored/",
  matches: "/mangud/",
  community: "/kogukond/",
  supporters: "/toetajad/",
  contact: "/kontakt/",
  shop: "https://4teams.ee/klubi-varustus/rae-spordikool/",
  register: "https://piksel.ee/arno/rae/ee/huvikoolid/vaata/239",
  fanclub: "/kontakt/?teema=fanniklubi#kontaktivorm"
};

const byDateAsc = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);
const byDateDesc = (a, b) => new Date(b.startsAt) - new Date(a.startsAt);

const teamPageUrl = (teamId) => ({
  "rae-i": "/voistkonnad/rae-i/",
  "rae-ii": "/voistkonnad/rae-ii/",
  u11: "/voistkonnad/u11/",
  "u13-ii": "/voistkonnad/u13-ii/",
  "u13-i": "/voistkonnad/u13-i/",
  u14: "/voistkonnad/u14/",
  u15: "/voistkonnad/u15/",
  u16: "/voistkonnad/u16/",
  u17: "/voistkonnad/u17/"
})[teamId] ?? routes.matches;

const parseScore = (score = "") => {
  const match = score.match(/(\d+)\s*-\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const parseEtDate = (value = "") => {
  const [day, month, year] = value.split(".");
  return day && month && year ? new Date(`${year}-${month}-${day}T00:00:00`) : null;
};

const birthYear = (value = "") => value.match(/\d{4}/)?.[0] ?? "";

const cleanTeamName = (value = "") => value.replace(/\s*\|\s*$/, "").trim();

const shirtNumber = (player) => {
  const number = Number.parseInt(player?.number, 10);
  return Number.isFinite(number) ? number : 9999;
};

const playerGoals = (player) => {
  const value = player?.goals ?? player?.goalsScored ?? player?.goalCount;
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : 0;
};

const contactName = (team) => {
  const coach = (team?.headCoach || "").replace(/\s+\d.*$/, "").trim();
  if (coach) return coach;
  const [local] = (team?.email || "info").split("@");
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "FC Rae";
};

const teamKind = (team) => {
  if (team?.id === "rae-i") return "Esindusmeeskond";
  if (team?.id === "rae-ii") return "Duubelvõistkond";
  return "Noortevõistkond";
};

const showsTopScorer = (team) => ["rae-i", "rae-ii", "u15", "u16", "u17"].includes(team?.id);

const raeScore = (match) => {
  const score = parseScore(match.score);
  if (!score) return null;
  const isHome = match.homeTeam.includes("Rae Spordikool");
  return {
    forGoals: isHome ? score[0] : score[1],
    againstGoals: isHome ? score[1] : score[0],
    totalGoals: score[0] + score[1]
  };
};

const getData = async () => {
  try {
    const response = await fetch("/data/jalgpall-cache.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Cache unavailable");
    const data = await response.json();
    return data.matches?.length ? data : fallbackData;
  } catch {
    return fallbackData;
  }
};

const setupMobileMenu = () => {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".main-nav");
  if (!header || !nav || document.querySelector(".menu-toggle")) return;

  const toggle = document.createElement("button");
  toggle.className = "menu-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "mobile-menu");
  toggle.innerHTML = "<span></span><span></span><span></span><strong>Menüü</strong>";

  const panel = document.createElement("div");
  panel.className = "mobile-menu";
  panel.id = "mobile-menu";
  panel.hidden = true;

  const clonedNav = nav.cloneNode(true);
  clonedNav.className = "mobile-nav";
  panel.append(clonedNav);

  const actions = document.querySelector(".header-actions");
  if (actions) {
    const clonedActions = actions.cloneNode(true);
    clonedActions.className = "mobile-actions";
    panel.append(clonedActions);
  }

  header.append(toggle, panel);
  toggle.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    header.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      panel.hidden = true;
      header.classList.remove("menu-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });
};

const setupSponsorModal = () => {
  const modal = document.querySelector("[data-sponsor-modal]");
  if (!modal) return;

  const openButtons = document.querySelectorAll("[data-open-sponsor-modal]");
  const closeButtons = modal.querySelectorAll("[data-close-sponsor-modal]");
  const firstInput = modal.querySelector("input, select, textarea, button");
  const params = new URLSearchParams(window.location.search);

  const open = () => {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    setTimeout(() => firstInput?.focus(), 0);
  };

  const close = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };

  openButtons.forEach((button) => button.addEventListener("click", open));
  if (params.get("modal") === "toetaja") open();
  closeButtons.forEach((button) => button.addEventListener("click", close));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) close();
  });
};

const setupMailForms = () => {
  const forms = document.querySelectorAll("[data-mail-form]");
  if (!forms.length) return;

  const params = new URLSearchParams(window.location.search);
  const topic = params.get("teema");

  forms.forEach((form) => {
    if (form.dataset.mailForm === "contact" && topic === "fanniklubi") {
      const topicSelect = form.querySelector('select[name="topic"]');
      const message = form.querySelector('textarea[name="message"]');
      if (topicSelect) topicSelect.value = "Fänniklubi";
      if (message && !message.value) message.value = "Soovin liituda FC Rae fänniklubiga.";
    }

    if (form.dataset.mailForm === "contact" && topic === "treening") {
      const topicSelect = form.querySelector('select[name="topic"]');
      const message = form.querySelector('textarea[name="message"]');
      if (topicSelect) topicSelect.value = "Lapse trenni panemine";
      if (message && !message.value) message.value = "Soovin küsida lapse jalgpallitrenni kohta.";
    }

    const renderedAt = String(Date.now());
    form.querySelectorAll("[data-rendered-at]").forEach((input) => {
      input.value = renderedAt;
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const status = form.querySelector(".form-status");
      const submitButton = form.querySelector('button[type="submit"]');
      const data = new FormData(form);
      const startedAt = Number(data.get("renderedAt") || renderedAt);
      const message = String(data.get("message") || "");
      const linkCount = (message.match(/https?:\/\//gi) || []).length;

      const setStatus = (text, type = "error") => {
        if (!status) return;
        status.textContent = text;
        status.dataset.status = type;
      };

      const setFallbackStatus = (text, mailtoUrl) => {
        if (!status) return;
        status.textContent = "";
        status.dataset.status = "error";
        status.append(document.createTextNode(`${text} `));
        const link = document.createElement("a");
        link.href = mailtoUrl;
        link.textContent = "Ava meiliprogramm";
        status.append(link);
      };

      if (String(data.get("website") || "").trim()) {
        setStatus("Aitäh! Sinu päring on vastu võetud.", "success");
        return;
      }

      if (Date.now() - startedAt < 4000) {
        setStatus("Palun proovi mõne sekundi pärast uuesti.");
        return;
      }

      if (!form.checkValidity()) {
        form.reportValidity();
        setStatus("Palun täida kohustuslikud väljad.");
        return;
      }

      if (linkCount > 2) {
        setStatus("Sõnumis on liiga palju linke. Palun saada lühem tekst või kirjuta otse info@fcrae.ee.");
        return;
      }

      const type = form.dataset.mailForm;
      const payload = Object.fromEntries(data.entries());
      payload.type = type;

      const subject = type === "sponsor"
        ? `FC Rae toetajapaketi päring: ${data.get("company")}`
        : `FC Rae kontaktivorm: ${data.get("topic")}`;
      const bodyLines = type === "sponsor"
        ? [
            `Ettevõte: ${data.get("company")}`,
            `Kontaktisik: ${data.get("contact")}`,
            `E-post: ${data.get("email")}`,
            `Telefon: ${data.get("phone") || "-"}`,
            `Huvipakkuv koostöövorm: ${data.get("package")}`,
            "",
            `Sõnum:`,
            message || "-",
            "",
            "Nõusolek: jah",
            `Saadetud: ${new Date().toLocaleString("et-EE")}`
          ]
        : [
            `Nimi: ${data.get("name")}`,
            `E-post: ${data.get("email")}`,
            `Telefon: ${data.get("phone") || "-"}`,
            `Teema: ${data.get("topic")}`,
            "",
            `Sõnum:`,
            message,
            "",
            "Nõusolek: jah",
            `Saadetud: ${new Date().toLocaleString("et-EE")}`
          ];

      const mailtoUrl = `mailto:info@fcrae.ee?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n"))}`;

      setStatus("Saadan...", "pending");
      if (submitButton) submitButton.disabled = true;

      fetch("/api/forms/contact.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(async (response) => {
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.ok) throw new Error(result.error || "send_failed");

          setStatus(
            type === "sponsor"
              ? "Aitäh! Võtame sinuga peagi ühendust ja saadame toetajapakettide info."
              : "Aitäh! Sinu sõnum on saadetud. Vastame esimesel võimalusel.",
            "success"
          );
          form.reset();
          form.querySelectorAll("[data-rendered-at]").forEach((input) => {
            input.value = String(Date.now());
          });
        })
        .catch(() => {
          setFallbackStatus("Serveripoolne saatmine ebaõnnestus.", mailtoUrl);
        })
        .finally(() => {
          if (submitButton) submitButton.disabled = false;
        });
    });
  });
};

const renderNextMatch = (data) => {
  if (!document.querySelector("#next-match-title")) return;
  const now = new Date();
  const nextHome = data.matches
    .filter((match) => match.status === "upcoming" && match.homeAway === "Kodu")
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .find((match) => new Date(match.startsAt) >= now) ??
    data.matches.filter((match) => match.status === "upcoming").sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))[0];

  if (!nextHome) return;

  document.querySelector("#next-match-title").textContent = nextHome.team;
  document.querySelector("#next-home").textContent = nextHome.homeTeam;
  document.querySelector("#next-away").textContent = nextHome.awayTeam;
  document.querySelector("#next-home-logo").classList.toggle("is-hidden", !nextHome.homeTeam.includes("Rae Spordikool"));
  document.querySelector("#next-away-logo").classList.toggle("is-hidden", !nextHome.awayTeam.includes("Rae Spordikool"));
  document.querySelector("#next-date").textContent = `${formatDate(nextHome)} · ${nextHome.competition}`;
  document.querySelector("#next-venue").textContent = nextHome.homeAway === "Kodu" ? "Jüri staadion" : "Võõrsilmäng";
  document.querySelector("#next-link").href = nextHome.jalgpallEeUrl ?? "https://jalgpall.ee";
};

const resultTemplate = (match) => `
  <a class="result-row" href="${match.jalgpallEeUrl ?? "https://jalgpall.ee"}" target="_blank" rel="noreferrer">
    <strong>${match.team}</strong>
    <span>${match.homeTeam} — ${match.awayTeam}<br><small>${match.date} · ${match.competition}</small></span>
    <span class="score">${match.score ?? ""}</span>
  </a>
`;

const fixtureTemplate = (match) => {
  const scoreOrTime = match.status === "finished" ? match.score : match.time;
  const status = match.status === "finished" ? "Tulemus" : "Tulemas";
  const placeClass = match.homeAway === "Kodu" ? "is-home" : "is-away";
  const statusClass = match.status === "finished" ? "is-finished" : "is-upcoming";
  return `
    <a class="fixture-row ${placeClass} ${statusClass}" href="${match.jalgpallEeUrl ?? "https://jalgpall.ee"}" target="_blank" rel="noreferrer">
      <strong>${match.team}</strong>
      <div>
        <strong>${match.homeTeam} — ${match.awayTeam}</strong><br>
        <small>${match.date} · ${match.competition}</small>
      </div>
      <span class="place-badge">${match.homeAway}</span>
      <span class="fixture-pill">${scoreOrTime || status}</span>
    </a>
  `;
};

const renderResults = (data, teamId = "all") => {
  const list = document.querySelector("#result-list");
  if (!list) return;
  const results = data.matches
    .filter((match) => match.status === "finished")
    .filter((match) => teamId === "all" || match.teamId === teamId)
    .sort((a, b) => new Date(b.startsAt) - new Date(a.startsAt))
    .slice(0, 5);

  list.innerHTML = results.length ? results.map(resultTemplate).join("") : `<p class="data-note">Tulemusi ei leitud.</p>`;
};

const renderCalendar = (data) => {
  const teamSelect = document.querySelector("#calendar-team");
  const statusSelect = document.querySelector("#calendar-status");
  const placeSelect = document.querySelector("#calendar-place");
  const list = document.querySelector("#calendar-list");
  if (!teamSelect || !statusSelect || !placeSelect || !list) return;
  const now = new Date();

  const update = () => {
    const teamId = teamSelect.value;
    const status = statusSelect.value;
    const place = placeSelect.value;
    const sortDirection = status === "finished" ? -1 : 1;
    const filtered = data.matches
      .filter((match) => teamId === "all" || match.teamId === teamId)
      .filter((match) => status === "all" || match.status === status)
      .filter((match) => place === "all" || match.homeAway === place)
      .filter((match) => status !== "upcoming" || new Date(match.startsAt) >= now)
      .sort((a, b) => (new Date(a.startsAt) - new Date(b.startsAt)) * sortDirection)
      .slice(0, 10);

    list.innerHTML = filtered.length
      ? filtered.map(fixtureTemplate).join("")
      : `<p class="empty-state">Selle filtriga mänge ei leitud.</p>`;
  };

  data.teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.shortName;
    teamSelect.append(option);
  });

  [teamSelect, statusSelect, placeSelect].forEach((control) => control.addEventListener("change", update));
  update();
};

const renderTeams = (data) => {
  const select = document.querySelector("#team-filter");
  const sourceList = document.querySelector("#team-source-list");
  if (!select || !sourceList) return;

  data.teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.shortName;
    select.append(option);
  });

  sourceList.innerHTML = data.teams.slice(0, 10).map((team) => `
    <a class="source-row" href="${teamPageUrl(team.id)}">
      <strong>${team.shortName}</strong>
      <span>${team.venue || "Jüri staadion"}<br><small>${team.level || "Võistkond"}</small></span>
      <span class="score">${team.playerCount || 0}</span>
    </a>
  `).join("");

  select.addEventListener("change", (event) => renderResults(data, event.target.value));
};

const renderTeamsPage = (data) => {
  const list = document.querySelector("#teams-page-list");
  if (!list) return;

  list.innerHTML = data.teams.map((team) => {
    const upcoming = data.matches.filter((match) => match.teamId === team.id && match.status === "upcoming").length;
    const results = data.matches.filter((match) => match.teamId === team.id && match.status === "finished").length;
    return `
      <a class="team-list-card" href="${teamPageUrl(team.id)}">
        <span>${team.level || "Võistkond"}</span>
        <strong>${team.shortName}</strong>
        <p>${team.name}</p>
        <div>
          <small>${team.playerCount || 0} mängijat</small>
          <small>${results} tulemust</small>
          <small>${upcoming} tulevat</small>
        </div>
      </a>
    `;
  }).join("");
};

const renderMeta = (data) => {
  const note = document.querySelector("#data-note");
  if (!note) return;
  note.textContent = data.updatedAt
    ? `Andmed uuendatud ${new Date(data.updatedAt).toLocaleString("et-EE")}`
    : "Andmed: fallback, käivita cache'i uuendus";
};

const renderMatchesPage = (data) => {
  const list = document.querySelector("#matches-page-list");
  const teamSelect = document.querySelector("#matches-team");
  const statusSelect = document.querySelector("#matches-status");
  const placeSelect = document.querySelector("#matches-place");
  const summary = document.querySelector("#matches-summary");
  if (!list || !teamSelect || !statusSelect || !placeSelect) return;

  const now = new Date();
  data.teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = team.id;
    option.textContent = team.shortName;
    teamSelect.append(option);
  });

  const update = () => {
    const teamId = teamSelect.value;
    const status = statusSelect.value;
    const place = placeSelect.value;
    const sort = status === "finished" ? byDateDesc : byDateAsc;
    const matches = data.matches
      .filter((match) => teamId === "all" || match.teamId === teamId)
      .filter((match) => status === "all" || match.status === status)
      .filter((match) => place === "all" || match.homeAway === place)
      .filter((match) => status !== "upcoming" || new Date(match.startsAt) >= now)
      .sort(sort);

    list.innerHTML = matches.length
      ? matches.slice(0, 80).map(fixtureTemplate).join("")
      : `<p class="empty-state">Selle filtriga mänge ei leitud.</p>`;

    if (summary) {
      summary.textContent = `${matches.length} mängu · andmed uuendatud ${data.updatedAt ? new Date(data.updatedAt).toLocaleString("et-EE") : "fallback andmetest"}`;
    }
  };

  [teamSelect, statusSelect, placeSelect].forEach((control) => control.addEventListener("change", update));
  update();
};

const playerTemplate = (player) => `
  <a class="player-row" href="${player.jalgpallEeUrl ?? "https://jalgpall.ee"}" target="_blank" rel="noreferrer">
    <strong>${player.number || "–"}</strong>
    <span>${player.name}<small>${player.position || "Mängija"} · ${birthYear(player.birthDate)}</small></span>
  </a>
`;

const factTemplate = (label, value, note = "") => `
  <article>
    <span>${label}</span>
    <strong>${value}</strong>
    ${note ? `<small>${note}</small>` : ""}
  </article>
`;

const renderTeamFacts = (team, matches, players) => {
  const list = document.querySelector("#team-fun-facts");
  if (!list) return;

  const now = new Date();
  const topScorers = [...players]
    .map((player) => ({ player, goals: playerGoals(player) }))
    .filter((item) => item.goals > 0)
    .sort((a, b) => b.goals - a.goals || shirtNumber(a.player) - shirtNumber(b.player));

  const nextMatch = matches
    .filter((match) => match.status === "upcoming" && new Date(match.startsAt) >= now)
    .sort(byDateAsc)[0];
  const topScorerText = topScorers.length
    ? `${topScorers.slice(0, 2).map((item) => item.player.name).join(" + ")} — ${topScorers[0].goals}`
    : "Avaldamisel";

  const facts = [
    factTemplate("Koosseis", `${players.length || team?.playerCount || 0} mängijat`, team?.level || ""),
    nextMatch ? factTemplate("Järgmine mäng", nextMatch.date, `vs ${nextMatch.opponent}`) : factTemplate("Järgmine mäng", "Avaldamisel"),
    ...(showsTopScorer(team) && topScorers.length ? [factTemplate("Enim väravaid", topScorerText)] : []),
    factTemplate("Koduväljak", team?.venue || "Jüri staadion")
  ];

  list.innerHTML = facts.length ? facts.join("") : `<p class="empty-state">Hooaja kiirvaade tekib siis, kui võistkonnal on cache'is piisavalt mänge ja mängijaid.</p>`;
};

const outcome = (match) => {
  const score = raeScore(match);
  if (!score) return { label: "Tulemus", className: "" };
  if (score.forGoals > score.againstGoals) return { label: "Võit", className: "is-win" };
  if (score.forGoals === score.againstGoals) return { label: "Viik", className: "is-draw" };
  return { label: "Tulemus", className: "is-neutral" };
};

const teamUpcomingTemplate = (match, featured = false) => `
  <a class="team-match-row ${featured ? "is-featured" : ""} ${match.homeAway === "Kodu" ? "is-home" : "is-away"}" href="${match.jalgpallEeUrl ?? "https://jalgpall.ee"}" target="_blank" rel="noreferrer">
    <span class="match-date">${match.date}<small>${match.time}</small></span>
    <div>
      <strong>${match.homeTeam} — ${match.awayTeam}</strong>
      <small>${match.competition || "Võistlus"} · ${match.venue || ""}</small>
    </div>
    <span class="place-badge">${match.homeAway}</span>
  </a>
`;

const teamResultTemplate = (match) => {
  const result = outcome(match);
  return `
    <a class="team-result-row" href="${match.jalgpallEeUrl ?? "https://jalgpall.ee"}" target="_blank" rel="noreferrer">
      <span>${match.date}<small>${match.team}</small></span>
      <strong>${match.homeTeam}</strong>
      <b>${match.score ?? ""}</b>
      <strong>${match.awayTeam}</strong>
      <em class="${result.className}">${result.label}</em>
    </a>
  `;
};

const setupTeamChrome = (team) => {
  const hero = document.querySelector(".team-subhero");
  if (!hero || document.querySelector(".team-tabs")) return;

  document.querySelector(".team-overview")?.setAttribute("id", "ulevaade");
  const dataColumns = document.querySelectorAll(".team-data > div");
  dataColumns[0]?.setAttribute("id", "mangud");
  dataColumns[1]?.setAttribute("id", "tulemused");
  document.querySelector(".roster-section")?.setAttribute("id", "koosseis");
  document.querySelector(".site-footer")?.setAttribute("id", "kontakt");

  const tabs = document.createElement("nav");
  tabs.className = "team-tabs";
  tabs.setAttribute("aria-label", "Võistkonna lehe menüü");
  const pagePath = window.location.pathname;
  tabs.innerHTML = `
    <a href="${pagePath}#ulevaade">Ülevaade</a>
    <a href="${pagePath}#mangud">Mängud</a>
    <a href="${pagePath}#tulemused">Tulemused</a>
    <a href="${pagePath}#koosseis">Koosseis</a>
    <a href="${pagePath}#kontakt">Kontakt</a>
  `;
  hero.after(tabs);

  const roster = document.querySelector(".roster-section");
  if (roster && !document.querySelector(".team-join-cta")) {
    const cta = document.createElement("section");
    cta.className = "team-join-cta";
    cta.innerHTML = `
      <div>
        <span>FC Rae</span>
        <h2>Tahad liituda?</h2>
        <p>FC Rae ootab uusi jalgpallihuvilisi. Lisa laps trenni ja saa osa meie kogukonnast.</p>
      </div>
      <a class="button button-primary" href="${routes.register}" target="_blank" rel="noreferrer">Lisa laps trenni</a>
    `;
    roster.after(cta);
  }
};

const renderTeamPage = (data) => {
  const root = document.querySelector("[data-team-page]");
  if (!root) return;

  const teamId = root.dataset.teamPage;
  const team = data.teams.find((item) => item.id === teamId);
  const matches = data.matches.filter((match) => match.teamId === teamId);
  const players = data.players.filter((player) => player.teamId === teamId);

  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };

  if (team) {
    const teamName = cleanTeamName(team.name);
    setText("#team-name", teamName);
    setText("#team-short", team.shortName);
    setText("#team-venue", team.venue || "Jüri staadion");
    setText("#team-coach", contactName(team));
    setText("#team-email", team.email || "info@fcrae.ee");
    setText("#team-player-count", String(players.length || team.playerCount || 0));
    setText("#team-hero-title", teamName);
    setText("#team-hero-copy", "Võistkonna mängud, tulemused ja koosseis. Andmed uuenevad jalgpall.ee põhjal.");
    setText("#team-kind", `${teamKind(team)} · ${team.shortName}`);
    const sourceLink = document.querySelector("#team-source-link");
    if (sourceLink) sourceLink.href = team.sourceUrl;
    setupTeamChrome(team);
  }

  const upcomingList = document.querySelector("#team-upcoming");
  const resultList = document.querySelector("#team-results");
  const roster = document.querySelector("#team-roster");
  const now = new Date();

  const upcoming = matches.filter((match) => match.status === "upcoming" && new Date(match.startsAt) >= now).sort(byDateAsc).slice(0, 6);
  const results = matches.filter((match) => match.status === "finished").sort(byDateDesc).slice(0, 6);

  if (upcomingList) {
    upcomingList.innerHTML = upcoming.length ? upcoming.map((match, index) => teamUpcomingTemplate(match, index === 0)).join("") : `<p class="empty-state">Tulevaid mänge ei leitud.</p>`;
  }

  if (resultList) {
    resultList.innerHTML = results.length ? results.map(teamResultTemplate).join("") : `<p class="empty-state">Tulemusi ei leitud.</p>`;
  }

  if (roster) {
    const sortedPlayers = [...players].sort((a, b) => shirtNumber(a) - shirtNumber(b) || a.name.localeCompare(b.name, "et"));
    roster.innerHTML = sortedPlayers.length ? sortedPlayers.map(playerTemplate).join("") : `<p class="empty-state">Mängijate nimekirja ei leitud.</p>`;
  }

  renderTeamFacts(team, matches, players);
};

setupMobileMenu();
setupSponsorModal();
setupMailForms();

getData().then((data) => {
  renderNextMatch(data);
  renderResults(data);
  renderCalendar(data);
  renderTeams(data);
  renderTeamsPage(data);
  renderMeta(data);
  renderMatchesPage(data);
  renderTeamPage(data);
});
