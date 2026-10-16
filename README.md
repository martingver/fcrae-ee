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

Repo sisaldab GitHub Actions töövoogu `.github/workflows/update-jalgpall-data.yml`, mis uuendab cache'i iga 6 tunni tagant ja commit'ib muutuse tagasi reposse. Sama cache toidab avalehte, mängude lehte, iga võistkonna alamlehte ja `kalendrid/*.ics` kalendritellimusi. Kui olemasolev deploy käivitub push'i peale, liiguvad uued mängud, tulemused, mängijad, võistkondade fun factid ja kalendrivoogude muudatused automaatselt ka avalikku veebi.

## Vormid

Kontaktivorm, fänniklubi huvi, ettevõtte koostöösoov ja toetajapaketi huvivorm kasutavad sama `/api/forms/contact` endpointi. Selle omanik on `api/forms/contact.mjs`; kliendipoolne saatmine ja modaalide fookus on failis `app.js`. Endpoint valideerib väljad, nõusoleku, honeypot'i, täitmise aja, linkide arvu ja IP-põhise päringupiirangu. See salvestab taotluse privaatsesse SQLite registrisse ja saadab klubile teate ning kliendile kinnituse. Paketi tingimustest säilib päringu tegemise aegne koopia. Sama tunnusega korduv saatmine ei loo uut taotlust.

Avalikud lehed on staatilised; `/api/forms/contact` ja vana `/api/forms/contact.php` suunatakse eraldi Node vormiteenusesse. Teenus on serveris paigaldatud (vt allpool). Staatiliste failide kopeerimine üksi vormiteenust ei uuenda. `npm run serve` teenindab kohapeal nii veebilehte kui endpointi. Ilma meiliedastuse seadistuseta tagastab endpoint 503 ning veeb pakub täidetud andmetega `mailto:` varulinki. Vormi õnnestumist ei imiteerita. Meiliprogrammis tuleb kiri kasutajal endal ära saata.

### Toetajalehe sisu ja eelvaade

`data/supporters.json` on toetuse tänu alampiiri, versiooni, PDF-i, fännipoe, makseandmete ja dokumendilinkide ühine seadistus. `npm run build:supporters` uuendab nii `/toetajad/` kui ka vana `/toetajad.html` koopiat. Vormiteenus kasutab sama konfiguratsiooni; tingimuste muutmisel uuenda `version` väärtust ja taaskäivita teenus. Vana lehega saabunud soov palub kasutajal lehte värskendada.

Toetamine on vabalt valitud summaga pangaülekanne, mitte aastapakett. Vähemalt 150 € toetuse puhul saab soovi korral ühe fännisärgi ja salli ning eraldi nõusolekul tänuavalduse veebilehel. Vorm kogub ülekande summa, komplekti soovi või loobumise, võimaliku särgisuuruse ja avaldatava nime eraldi nõusolekuga. Üleandmine lepitakse eraldi kokku. Vorm ei kinnita laekumist ega avalda nimesid automaatselt; klubi kontrollib laekumist enne üleandmist või nime avaldamist. 300 € aastapakett on eemaldatud.

Kinnitatud pangainfo asub `bank` väljas. Toetaja saab valida 10 / 25 / 50 / 150 € või muu summa ja kopeerida ülekande väljad. Märgis, ettevõtte kajastused, ühistegevused ja vorminähtavus kuuluvad eraldi sponsorkoostöösse; fikseeritud hinnakirja ei ole. Liikmelisus on eraldi.

PDF kasutab sama alampiiri ja ettevõtte hüvede teksti: `scripts/build-supporter-overview.py` loeb seadistust ja lehe HTML-i. Taastootmiseks kasuta ReportLabiga Pythonit (Windowsis Arial fondid). PDF salvestub `assets/rae-sk-toetaja-ulevaade.pdf`; kontrolli pärast muutmist visuaalselt. Avaldamisel kasutatakse kontrollitud ja Git-is hoitavat PDF-i.

Avalikud juhatuse, põhikirja ja aruande lingid lisa `documents` loendisse kujul `{ "title": "Põhikiri", "url": "/assets/kinnitatud-fail.pdf" }` alles pärast päris failide ja avaldamisõiguse saamist. Tühje linke ei kuvata. Olemasolevad sponsorid ja nende järjestus on säilitatud lehe HTML-is.

### Vormiteenuse seadistamine serveris

Server vajab Node.js 22.13+ (kohalik arendus kasutab 24) ja seadistatud `sendmail`-ühilduvat meiliteenust (näiteks olemasolev Postfix või msmtp). Uusi npm sõltuvusi ei ole. Keskkonnamuutujate näidis on `.env.example`; päris seadistus peab asuma väljaspool avalikku veebijuurt.

- `SENDMAIL_PATH`: seadistatud meiliprogrammi absoluutne tee. Programm saab kirja standard-sisendist argumentidega `-t -i`.
- `MAIL_FROM`: klubi kinnitatud saatja. Serveri meiliteenuse autentimine ja domeeni kirjeseadistus peavad olema korras.
- `FORMS_DATABASE`: privaatse SQLite registri absoluutne tee, näiteks `/var/lib/fcrae/requests.sqlite`. Teenuse kasutajal peab olema sinna kirjutusõigus. Endpoint keeldub registri loomisest avaliku veebikausta sisse.
- `HOST=127.0.0.1`, `PORT=4173`; `TRUST_LOCAL_PROXY=1` ainult localhosti pöördproksi taga, mis kirjutab `X-Real-IP` päise ise üle.

Nginxi olemasolevasse serveriplokki lisa vajadusel:

```nginx
location = /api/forms/contact {
    proxy_pass http://127.0.0.1:4173;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Käivita teenus selle keskkonnaga `node --env-file=/kaitstud/asukoht/fcrae.env scripts/static-server.mjs` ning halda olemasoleva teenusehalduriga. Üks protsess on piisav; praegune päringupiirang ja samaaegsete saatmiste lukk on protsessipõhised. Registri hooldus toimub volitatud haldajal serveris, mitte avaliku veebi kaudu. Hoia varukoopia koos SQLite WAL-failidega või kasuta SQLite backup-käsku. Ära lisa registrit Git-i ega `/var/www/html/` alla.

Enne avalikku aktiveerimist testi klubi loal päris kirja saabumist klubi ja taotleja postkasti. Automaatkontroll `npm test` kasutab ainult kohalikku testtransporti ning ei saada päris kirju. See katab valideerimise, korduva ja samaaegse saatmise, meilivea järel korduskatse, toetuse soovi ja nõusolekute koopia ning privaatsete failide kaitse. Kohalik brauserikontroll ei tõenda päris serveri meiliedastust.

Mõõtmine: CTA-d ja õnnestunud saatmised väljastavad DOM-i `supporter-event` sündmuse, mille `detail.event` sisaldab ainult sündmuse nime. Analüütikateenust pole lisatud; nimesid, e-posti ega sõnumit sündmustesse ei panda. UTM-andmeid praegu ei salvestata ning huvi ei arvestata tuluna.

### Üleandmine ja avaldamise eeldused

Väiksema toetuse saaja ja IBAN on klubi antud konto põhjal sisestatud ning kontrollsumma läbis. Komplekti mudel, suurus ja üleandmine täpsustatakse toetajaga eraldi. Avalikud dokumendifailid vajavad veel klubi kinnitust. Fännipoe juures ei avaldata kontrollimata hindu, tootefotosid ega laoseisu. QR-kood ja PDF on kaasas, kuid trükitud QR tuleb enne trükki kahe päris telefoniga kontrollida.

Muudatused on piiratud toetajalehe, selle materjalide ja jagatud vormitöötlusega. Toetajaleht ja vormiteenus avaldatakse koos `scripts/deploy-site.sh` kaudu. Tagasivõtmiseks taasta selle töö Git-muudatused; privaatne taotluste register säilita eraldi. Jalgpall.ee andmete laadimine ja teised lehesisud kasutavad senist lahendust.

### Serveri seis 15.10.2026

`fcraeweb` serverisse on paigaldatud Ubuntu enda Node 22.22.1 ning msmtp. `fcrae-forms.service` töötab kasutajana `fcrae-forms` ja kuulab ainult `127.0.0.1:4174`. Kood asub `/opt/fcrae-forms`, privaatne register `/var/lib/fcrae/requests.sqlite`, teenuse keskkond `/etc/fcrae/forms.env` ning relee seaded `/etc/msmtprc`. Sätted on seadistatud Google Workspace’i releele `smtp-relay.gmail.com:587`, kohustusliku TLS-i ja IPv4 lähteaadressiga `89.167.60.39`. SMTP autentimist ei kasutata: Google Admin peab lubama selle IP. Seadistamise ajal keeldus relee nii serveri IPv4 kui IPv6 saatmiskatsest veaga 550 5.7.0; päris kirja sisu ei saadetud. Serveripoolne TLS-i ja seadistuse kontroll läbis. Pärast IP-aadressi lubamist 15.10.2026 aktsepteeris Google serveri IPv4 ühendusel nii `MAIL FROM: info@fcrae.ee` kui `RCPT TO: info@fcrae.ee` (mõlemad SMTP 250). Teenuse tervisekontroll läbis. Ühenduse kontroll lõpetati enne kirja sisu saatmist. Järgnenud kasutaja vormiproovi kohta näitas privaatne register üht edukat klubile saadetud kirja ja üht kinnituskirja; postkasti saabumist see eraldi ei kinnita. Kohalik eelvaateserver ei kasuta automaatselt tootmise meiliedastust.

Teenuse käivitaja on `scripts/forms-server.mjs`; see kasutab sama valideerimise ja salvestamise omanikku `api/forms/contact.mjs`. Avalikud vanad vormid, mis ei saada päringu tunnust, saavad serveris sisu järgi püsiva tunnuse, et nende korduskatse uut registrikirjet ei looks. `npm test` kontrollib ka seda ühilduvust.

Paigaldust kirjeldab `scripts/install-forms-service.sh`. See eeldab eelnevalt paigaldatud Node/msmtp pakette ning kolme koodifaili kopeerimist vastavatesse `/opt/fcrae-forms` alamkaustadesse. Nginxi algse seadistuse varukoopia asub `/var/backups/fcrae/nginx-default-20261015T133705Z`. Teenuse seis: `systemctl status fcrae-forms`; privaatne tervisekontroll: `curl http://127.0.0.1:4174/health`.

Vormikoodi või toetamise seadistuse muutmisel kopeeri `api/forms/contact.mjs`, `scripts/forms-server.mjs` ja `data/supporters.json` vastavatesse `/opt/fcrae-forms` kaustadesse ning käivita `systemctl restart fcrae-forms`. GitHubi avaldamisvood teevad seda nüüd automaatselt ühise `scripts/deploy-site.sh` abil. See saadab avalikud failid veebijuure alla, vormikoodi eraldi `/opt/fcrae-forms` kausta ning taaskäivitab ainult vormiteenuse. Ka ajastatud jalgpall.ee uuendus kasutab sama avaldamist; kaks voogu ei avalda korraga. Privaatne register ja serveri relee seadistus jäävad puutumata.

Peatamiseks: `systemctl disable --now fcrae-forms`; nginxist eemalda ainult märgistusega „FC Rae form service” plokk, kontrolli `nginx -t` ja laadi nginx uuesti. Registrit ära kustuta. Muud serveri teenused ja Google Workspace’i seaded pole muudetud.

Toetajaleht pakub kahte teed: toeta sobiva summaga või tule ettevõttega partneriks. Ettevõtte hüved on koondatud ühte ossa; fännikomplekti tänu on väiksema toetuse juures tagasihoidlikult esitatud.

Fännikaup viitab seniks 4Teamsi Rae Spordikooli varustuse lehele: https://4teams.ee/klubi-varustus/rae-spordikool/.

Avaldamise eelne veebifailide varukoopia: `/var/backups/fcrae/site-before-supporters-20261015T135742Z.tar.gz`. Toetajate plokk asub enne ettevõtte koostöövõimalusi; kõik senised nimed, lingid ja peasponsori staatus on säilitatud. Külastajale rämpspostikaitse tehnilist teadet ei kuvata; kaitse ise jääb vormitöötluses aktiivseks.

### Toetaja väärtus ja tõendid

Jalgpalliga toetajamärgise heaks kiidetud veebipilt on `assets/rae-sk-toetaja-jalgpall.png` (läbipaistev PNG, 2172 × 724). Sama nimega `.svg` sisaldab eraldi vektorkihte ning muudetavaid tekste (Arial Black ja Arial); `-kontuurid.svg` säilitab tähekujud vektorkontuuridena ja ei vaja fonte. SVG-des on tekstuuri asemel puhtad värvid: roheline `#142D20`, kollane `#FDD23C`, hele `#FCF9F0`. Mõlemad on päris vektorid, mitte SVG-sse peidetud PNG-d.

Toetaja väärtust kirjeldav plokk paikneb mõju ja olemasolevate toetajate vahel ning kasutab olemasolevat klubifotot `assets/u11-medalid.jpg`. Koostöövorm ja toetaja soovivorm kasutavad seniseid käitumise omanikke. Toetajamärgise eelvaade asub ettevõtte koostöö juures; vorminähtavus, eraldi sotsiaalmeediakajastused ning korraldatud ühistegevused on eraldi sponsorkoostöö.

`data/supporters.json` välja `updates` saab lisada klubi kinnitatud ülevaateid kujul `{ "activity": "Tegevuse nimi", "photo": "/assets/klubi-kinnitatud-foto.jpg", "photoAlt": "Foto sisuline kirjeldus", "result": "Tegevuse tegelik tulemus ja kontrollitud näitajad" }`. Need on sisestusväljade kirjeldused, mitte avaldatavad näidisfaktid. Kasuta ainult päris tegevusi, avaldamiseks lubatud fotosid ja kontrollitud tulemusi. Käivita `npm run build:supporters`; ülevaated ilmuvad läbipaistvuse plokki. Tühi loend ei lisa avalikku tühja sektsiooni. Puuduv tegevus, tulemus või kohalik foto peatab ehituse.

Pangaandmed on vabalt valitud toetuse jaoks. Vormi saatmine ja makse laekumine on eraldi; klubi ei tohi soovi automaatselt laekumiseks lugeda. 15.10.2026 kontrollisime mõlema vormi päris kirjade saabumist nii saatja kui klubi postkasti. Uue tänuavalduse vormi regressioonid kontrollivad alampiiri, komplektist loobumist, eraldi avaldamisluba, stale-versiooni ning klubile ja toetajale saadetava info kooskõla kohaliku testtranspordiga.
