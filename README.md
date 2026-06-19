# FC Rae koduleht

FC Rae avalik koduleht koos kohalike assetide, serveripoolsete vormide ja jalgpall.ee cache'i uuendusskriptiga.

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

Kontaktivorm, fänniklubi huvi ja toetajapaketi modal proovivad saata päringu serveripoolsesse endpointi `/api/forms/contact`. Endpoint peab valideerima väljad, kontrollima honeypot'i, täitmise aega, linkide arvu ja IP-põhist rate limitit ning saatma kirja aadressile `info@fcrae.ee`.

Praegune avalik hosting on staatiline ja ei käivita PHP-d. Kui serveripoolne saatmine ebaõnnestub või endpoint puudub, kuvab frontend kasutajale `mailto:` fallback-lingi. Kohalik `npm run serve` tagastab sellele endpointile teadlikult 503 JSON-vastuse, et fallbacki oleks lihtne testida.

Fännikaup viitab seniks 4Teamsi Rae Spordikooli varustuse lehele: https://4teams.ee/klubi-varustus/rae-spordikool/.
