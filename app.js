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

const byDateAsc = (a, b) => new Date(a.startsAt) - new Date(b.startsAt);
const byDateDesc = (a, b) => new Date(b.startsAt) - new Date(a.startsAt);

const teamPageUrl = (teamId) => ({
  "rae-i": "meeskond-rae-i.html",
  "rae-ii": "meeskond-rae-ii.html",
  u11: "voistkond-u11.html",
  "u13-ii": "voistkond-u13-ii.html",
  "u13-i": "voistkond-u13-i.html",
  u14: "voistkond-u14.html",
  u15: "voistkond-u15.html",
  u16: "voistkond-u16.html",
  u17: "voistkond-u17.html"
})[teamId] ?? `mangud.html`;

const parseScore = (score = "") => {
  const match = score.match(/(\d+)\s*-\s*(\d+)/);
  return match ? [Number(match[1]), Number(match[2])] : null;
};

const parseEtDate = (value = "") => {
  const [day, month, year] = value.split(".");
  return day && month && year ? new Date(`${year}-${month}-${day}T00:00:00`) : null;
};

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
    const response = await fetch("data/jalgpall-cache.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Cache unavailable");
    const data = await response.json();
    return data.matches?.length ? data : fallbackData;
  } catch {
    return fallbackData;
  }
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
    <span>${player.name}<small>${player.position || "Mängija"} · ${player.birthDate || ""}</small></span>
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
  const youngest = players
    .map((player) => ({ ...player, parsedBirthDate: parseEtDate(player.birthDate) }))
    .filter((player) => player.parsedBirthDate)
    .sort((a, b) => b.parsedBirthDate - a.parsedBirthDate)[0];

  const finished = matches.filter((match) => match.status === "finished" && parseScore(match.score));
  const highestScoring = finished
    .map((match) => ({ match, scoreData: raeScore(match) }))
    .filter((item) => item.scoreData)
    .sort((a, b) => b.scoreData.totalGoals - a.scoreData.totalGoals)[0];

  const biggestWin = finished
    .map((match) => ({ match, scoreData: raeScore(match) }))
    .filter((item) => item.scoreData && item.scoreData.forGoals > item.scoreData.againstGoals)
    .sort((a, b) => (b.scoreData.forGoals - b.scoreData.againstGoals) - (a.scoreData.forGoals - a.scoreData.againstGoals))[0];

  const nextHome = matches
    .filter((match) => match.status === "upcoming" && match.homeAway === "Kodu" && new Date(match.startsAt) >= now)
    .sort(byDateAsc)[0];

  const facts = [
    factTemplate("Koosseis", `${players.length || team?.playerCount || 0} mängijat`, team?.level || ""),
    youngest ? factTemplate("Noorim mängija", youngest.name, youngest.birthDate) : "",
    biggestWin ? factTemplate("Suurim Rae võit", biggestWin.match.score, `${biggestWin.match.homeTeam} — ${biggestWin.match.awayTeam}`) : "",
    highestScoring ? factTemplate("Resultatiivseim mäng", `${highestScoring.scoreData.totalGoals} väravat`, `${highestScoring.match.score} · ${highestScoring.match.date}`) : "",
    nextHome ? factTemplate("Järgmine kodumäng", nextHome.date, nextHome.opponent) : ""
  ].filter(Boolean);

  list.innerHTML = facts.length ? facts.join("") : `<p class="empty-state">Fun factid tekivad siis, kui võistkonnal on cache'is piisavalt mänge ja mängijaid.</p>`;
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
    setText("#team-name", team.name);
    setText("#team-short", team.shortName);
    setText("#team-venue", team.venue || "Jüri staadion");
    setText("#team-coach", team.headCoach || "Täpsustamisel");
    setText("#team-email", team.email || "info@fcrae.ee");
    setText("#team-player-count", String(players.length || team.playerCount || 0));
    setText("#team-hero-title", `${team.shortName} võistkonna leht`);
    setText("#team-hero-copy", `${team.name} mängud, tulemused, mängijad ja hooaja faktid jalgpall.ee andmete põhjal.`);
    const sourceLink = document.querySelector("#team-source-link");
    if (sourceLink) sourceLink.href = team.sourceUrl;
  }

  const upcomingList = document.querySelector("#team-upcoming");
  const resultList = document.querySelector("#team-results");
  const roster = document.querySelector("#team-roster");
  const now = new Date();

  const upcoming = matches.filter((match) => match.status === "upcoming" && new Date(match.startsAt) >= now).sort(byDateAsc).slice(0, 6);
  const results = matches.filter((match) => match.status === "finished").sort(byDateDesc).slice(0, 6);

  if (upcomingList) {
    upcomingList.innerHTML = upcoming.length ? upcoming.map(fixtureTemplate).join("") : `<p class="empty-state">Tulevaid mänge ei leitud.</p>`;
  }

  if (resultList) {
    resultList.innerHTML = results.length ? results.map(fixtureTemplate).join("") : `<p class="empty-state">Tulemusi ei leitud.</p>`;
  }

  if (roster) {
    roster.innerHTML = players.length ? players.map(playerTemplate).join("") : `<p class="empty-state">Mängijate nimekirja ei leitud.</p>`;
  }

  renderTeamFacts(team, matches, players);
};

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
