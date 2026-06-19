import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = "https://jalgpall.ee";

const teams = [
  { id: "rae-i", name: "Rae Spordikool", shortName: "Rae I", level: "Esindusmeeskond", leagueId: 538, teamId: 6795, season: 2026 },
  { id: "rae-ii", name: "Rae Spordikool II", shortName: "Rae II", level: "Duubelvõistkond", leagueId: 548, teamId: 7118, season: 2026 },
  { id: "u11", name: "Rae Spordikool U11", shortName: "U11", level: "Noored", leagueId: 257, teamId: 6515, season: 2026 },
  { id: "u13-ii", name: "Rae Spordikool U13 II", shortName: "U13 II", level: "Noored", leagueId: 247, teamId: 6512, season: 2026 },
  { id: "u13-i", name: "Rae Spordikool U13 I", shortName: "U13 I", level: "Noored", leagueId: 243, teamId: 5885, season: 2026 },
  { id: "u14", name: "Rae Spordikool U14", shortName: "U14", level: "Noored", leagueId: 521, teamId: 5884, season: 2026 },
  { id: "u15", name: "Rae Spordikool U15", shortName: "U15", level: "Noored", leagueId: 389, teamId: 5883, season: 2026 },
  { id: "u16", name: "Rae Spordikool U16", shortName: "U16", level: "Noored", leagueId: 409, teamId: 6511, season: 2026 },
  { id: "u17", name: "Rae Spordikool U17", shortName: "U17", level: "Noored", leagueId: 376, teamId: 7012, season: 2026 }
];

const decodeHtml = (value = "") =>
  value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();

const stripTags = (value = "") => decodeHtml(value.replace(/<[^>]*>/g, " "));

const toIsoDate = (date, time = "00:00") => {
  const [day, month, year] = date.split(".");
  return `${year}-${month}-${day}T${time}:00+03:00`;
};

const rowMatches = (html, className) =>
  [...html.matchAll(new RegExp(`<tr class="${className}"[^>]*>([\\s\\S]*?)<\\/tr>`, "g"))].map((match) => match[1]);

const extractTeamCells = (row) =>
  [...row.matchAll(/<td class="team (?:left|right)"[\s\S]*?<a\s+href="([^"]+)">([\s\S]*?)<\/a>/g)].map((match) => ({
    href: `${BASE_URL}${match[1]}`,
    name: stripTags(match[2])
  }));

const extractCompetition = (row) => {
  const match = row.match(/text-decoration:\s*underline;">([\s\S]*?)<\/p>/);
  return stripTags(match?.[1] ?? "");
};

const extractMatchUrl = (row) => {
  const match = row.match(/href="(\/voistlused\/match_info\/\d+)"/);
  return match ? `${BASE_URL}${match[1]}` : null;
};

const parseUpcoming = (row, team) => {
  const dateMatch = row.match(/(\d{2}\.\d{2}\.\d{4})<span[\s\S]*?<\/span>\s*(\d{2}:\d{2})/);
  const cells = extractTeamCells(row);
  if (!dateMatch || cells.length < 2) return null;

  return {
    teamId: team.id,
    team: team.shortName,
    status: "upcoming",
    competition: extractCompetition(row),
    date: dateMatch[1],
    time: dateMatch[2],
    startsAt: toIsoDate(dateMatch[1], dateMatch[2]),
    homeTeam: cells[0].name,
    awayTeam: cells[1].name,
    opponent: cells.find((cell) => !cell.name.includes("Rae Spordikool"))?.name ?? cells[1].name,
    homeAway: cells[0].name.includes("Rae Spordikool") ? "Kodu" : "Võõrsil",
    jalgpallEeUrl: extractMatchUrl(row)
  };
};

const parsePrevious = (row, team) => {
  const dateMatch = row.match(/(\d{2}\.\d{2}\.\d{4})<br>\s*Kell\s*(\d{2}:\d{2})/);
  const cells = extractTeamCells(row);
  const result = stripTags(row.match(/class="result">([\s\S]*?)<\/a>/)?.[1] ?? "");
  if (!dateMatch || cells.length < 2 || !/^\d+\s*-\s*\d+$/.test(result)) return null;

  return {
    teamId: team.id,
    team: team.shortName,
    status: "finished",
    competition: extractCompetition(row),
    date: dateMatch[1],
    time: dateMatch[2],
    startsAt: toIsoDate(dateMatch[1], dateMatch[2]),
    homeTeam: cells[0].name,
    awayTeam: cells[1].name,
    opponent: cells.find((cell) => !cell.name.includes("Rae Spordikool"))?.name ?? cells[1].name,
    homeAway: cells[0].name.includes("Rae Spordikool") ? "Kodu" : "Võõrsil",
    score: result.replace(/\s+/g, " "),
    jalgpallEeUrl: extractMatchUrl(row)
  };
};

const parsePlayers = (html, team) => {
  const scoringStats = parseScoringStats(html);
  const tab = html.match(/<li data-tab="tab10">([\s\S]*?)<\/li>\s*<\/ul>/)?.[1] ?? "";
  const tbody = tab.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  return [...tbody.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((rowMatch) => {
    const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    const playerUrl = rowMatch[1].match(/href="(\/voistlused\/player\/[^"]+)"/)?.[1];
    const absolutePlayerUrl = playerUrl ? `${BASE_URL}${playerUrl}` : null;
    const stats = scoringStats.get(absolutePlayerUrl) ?? scoringStats.get(cells[2]);
    return {
      teamId: team.id,
      team: team.shortName,
      position: cells[1] ?? "",
      name: cells[2] ?? "",
      number: cells[3] ?? "",
      birthDate: cells[4] ?? "",
      citizenship: cells[5] ?? "",
      club: cells[8] ?? "",
      cupGoals: stats?.cupGoals ?? 0,
      leagueGoals: stats?.leagueGoals ?? 0,
      goals: stats?.goals ?? 0,
      jalgpallEeUrl: absolutePlayerUrl
    };
  }).filter((player) => player.name);
};

const parseScoringStats = (html) => {
  const tab = html.match(/<li data-tab="tab01">([\s\S]*?)<\/li>/)?.[1] ?? "";
  const stats = new Map();

  [...tab.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].forEach((rowMatch) => {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    const playerUrl = row.match(/href="(\/voistlused\/player\/[^"]+)"/)?.[1];
    if (cells.length < 5 || !cells[1]) return;

    const entry = {
      cupGoals: Number.parseInt(cells[2], 10) || 0,
      leagueGoals: Number.parseInt(cells[3], 10) || 0,
      goals: Number.parseInt(cells[4], 10) || 0
    };

    stats.set(cells[1], entry);
    if (playerUrl) stats.set(`${BASE_URL}${playerUrl}`, entry);
  });

  return stats;
};

const parseMeta = (html) => {
  const valueAfterTitle = (title) => {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`<p class="title">${escaped}<\\/p>\\s*<p class="value">([\\s\\S]*?)<\\/p>`));
    return stripTags(match?.[1] ?? "");
  };

  return {
    headCoach: valueAfterTitle("Peatreener"),
    assistantCoach: valueAfterTitle("Abitreener"),
    email: valueAfterTitle("E-post"),
    venue: valueAfterTitle("Koduväljak"),
    venueAddress: valueAfterTitle("Väljaku aadress")
  };
};

async function fetchTeam(team) {
  const url = `${BASE_URL}/voistlused/${team.leagueId}/team/${team.teamId}?season=${team.season}`;
  const response = await fetch(url, { headers: { "user-agent": "fcrae.ee data cache updater" } });
  if (!response.ok) throw new Error(`${team.shortName}: ${response.status} ${response.statusText}`);
  const html = await response.text();

  const upcoming = rowMatches(html, "upcoming-game").map((row) => parseUpcoming(row, team)).filter(Boolean);
  const previous = rowMatches(html, "prev-game").map((row) => parsePrevious(row, team)).filter(Boolean);
  const players = parsePlayers(html, team);

  return {
    team: {
      ...team,
      sourceUrl: url,
      ...parseMeta(html),
      upcomingCount: upcoming.length,
      resultCount: previous.length,
      playerCount: players.length
    },
    matches: [...upcoming, ...previous],
    players
  };
}

const results = [];

for (const team of teams) {
  try {
    console.log(`Fetching ${team.shortName}`);
    results.push(await fetchTeam(team));
  } catch (error) {
    console.warn(`Skipped ${team.shortName}: ${error.message}`);
  }
}

const payload = {
  updatedAt: new Date().toISOString(),
  source: "https://jalgpall.ee",
  teams: results.map((result) => result.team),
  matches: results.flatMap((result) => result.matches).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt)),
  players: results.flatMap((result) => result.players)
};

await mkdir("data", { recursive: true });
await writeFile("data/jalgpall-cache.json", `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Saved ${payload.teams.length} teams, ${payload.matches.length} matches, ${payload.players.length} players.`);
