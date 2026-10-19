import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";

const source = await readFile(new URL("../app.js", import.meta.url), "utf8");
// Run the actual shared renderer without booting the page or fetching data.
const definitions = source.slice(0, source.lastIndexOf("\nsetupMobileMenu();"));
const render = (players) => {
  const list = { innerHTML: "" };
  runInNewContext(`${definitions}\nrenderTeamFacts(team, [], players);`, {
    document: { querySelector: () => list },
    team: { id: "rae-i", level: "Esindusmeeskond" },
    players
  });
  return list.innerHTML;
};
const fact = (html) => html.match(/<span>Enim liigaväravaid<\/span>\s*<strong>(.*?)<\/strong>/)?.[1];

test("team scorer fact ranks league goals and shows only the actual leader", () => {
  const html = render([
    { name: "Martin Valkiainen", leagueGoals: 25, cupGoals: 4, goals: 29 },
    { name: "Mathias Värva", leagueGoals: 15, cupGoals: 1, goals: 16 },
    { name: "Gren Kevin Raudsep", leagueGoals: 19, cupGoals: 0, goals: 19 },
    { name: "Karikamängija", leagueGoals: 2, cupGoals: 40, goals: 42 }
  ]);
  assert.equal(fact(html), "Martin Valkiainen — 25");
});

test("team scorer fact includes every tied leader without adding the runners-up", () => {
  assert.equal(fact(render([
    { name: "Esimene", leagueGoals: "10" },
    { name: "Teine", leagueGoals: 10 },
    { name: "Kolmas", leagueGoals: 10 },
    { name: "Järgmine", leagueGoals: 9 }
  ])), "Esimene, Teine ja Kolmas — 10");
});

test("team scorer fact does not label unknown totals or zero goals as league leaders", () => {
  assert.equal(fact(render([{ name: "Teadmata", goals: 12 }, { name: "Null", leagueGoals: 0 }])), undefined);
});
