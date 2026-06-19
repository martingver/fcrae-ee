# FC Rae kodulehe MVP

Staatiline FC Rae avalehe MVP koos kohalike assetide ja jalgpall.ee cache'i uuendusskriptiga.

## Käivitus

```bash
npm run update:data
npm run serve
```

Seejärel ava `http://localhost:4173`.

## Andmed

`scripts/update-jalgpall-data.mjs` loeb FC Rae / Rae Spordikooli võistkondade mängud ja mängijad jalgpall.ee lehtedelt ning kirjutab tulemuse faili `data/jalgpall-cache.json`.

Avalik leht ei päri jalgpall.ee-d iga külastusega, vaid kasutab cache'i. See sobib hiljem GitHub Actions cron'i või deploy-eelse build-sammuna käivitamiseks.

Repo sisaldab GitHub Actions töövoogu `.github/workflows/update-jalgpall-data.yml`, mis uuendab cache'i iga 6 tunni tagant ja commit'ib muutuse tagasi reposse. Sama cache toidab avalehte, mängude lehte ja iga võistkonna alamlehte. Kui olemasolev deploy käivitub push'i peale, liiguvad uued mängud, tulemused, mängijad ja võistkondade fun factid automaatselt ka avalikku veebi.

## Vormid

Praegu kasutavad fänniklubi ja toetajate huvivormid `mailto:` lahendust. Fännikaup viitab seniks 4Teamsi Rae Spordikooli varustuse lehele: https://4teams.ee/klubi-varustus/rae-spordikool/. Kui Google Sheet või Google Form on valmis, saab vormide `action` väärtuse asendada Google Forms / Apps Script endpointiga ja jätta sama avalehe kujunduse alles.
