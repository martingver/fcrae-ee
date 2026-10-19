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

Jalgpalliga toetajamärgise praegune veebipilt on `assets/rae-sk-toetaja-jalgpall.png` (läbipaistev PNG, 2172 × 724). Sama nimega `.svg` sisaldab eraldi vektorkihte ning muudetavaid tekste (Arial Black ja Arial); `-kontuurid.svg` säilitab tähekujud vektorkontuuridena ja ei vaja fonte. SVG-des ja neist eksporditud PNG-s on puhtad värvid: must `#111317`, kollane `#FDEE08`, valge `#FFFFFF`. Mõlemad on päris vektorid, mitte SVG-sse peidetud PNG-d.

Toetaja väärtust kirjeldav plokk paikneb mõju ja olemasolevate toetajate vahel ning kasutab olemasolevat klubifotot `assets/u11-medalid.jpg`. Koostöövorm ja toetaja soovivorm kasutavad seniseid käitumise omanikke. Toetajamärgise eelvaade asub ettevõtte koostöö juures; vorminähtavus, eraldi sotsiaalmeediakajastused ning korraldatud ühistegevused on eraldi sponsorkoostöö.

`data/supporters.json` välja `updates` saab lisada klubi kinnitatud ülevaateid kujul `{ "activity": "Tegevuse nimi", "photo": "/assets/klubi-kinnitatud-foto.jpg", "photoAlt": "Foto sisuline kirjeldus", "result": "Tegevuse tegelik tulemus ja kontrollitud näitajad" }`. Need on sisestusväljade kirjeldused, mitte avaldatavad näidisfaktid. Kasuta ainult päris tegevusi, avaldamiseks lubatud fotosid ja kontrollitud tulemusi. Käivita `npm run build:supporters`; ülevaated ilmuvad läbipaistvuse plokki. Tühi loend ei lisa avalikku tühja sektsiooni. Puuduv tegevus, tulemus või kohalik foto peatab ehituse.

Pangaandmed on vabalt valitud toetuse jaoks. Vormi saatmine ja makse laekumine on eraldi; klubi ei tohi soovi automaatselt laekumiseks lugeda. 15.10.2026 kontrollisime mõlema vormi päris kirjade saabumist nii saatja kui klubi postkasti. Uue tänuavalduse vormi regressioonid kontrollivad alampiiri, komplektist loobumist, eraldi avaldamisluba, stale-versiooni ning klubile ja toetajale saadetava info kooskõla kohaliku testtranspordiga.

### Esindusmeeskonna uudis

Esimene jagatav uudis on `uudised/hooaja-viimane-kodumang-2026/index.html`. Esindusmeeskonna uudiste plokk on nii kanoonilisel lehel `voistkonnad/rae-i/index.html` kui vanal lehel `meeskond-rae-i.html`; järgmise uudise lisamisel uuenda mõlemat. Ühist võistkonnamenüüd haldab senine `app.js` funktsioon `setupTeamChrome`, mis kuvab uudiste lingi ainult vastava ploki olemasolul. Artikli küljendus on `news.css`, kopeerimisnupu käitumine `news.js`. Uut CMS-i ega ehitussammu ei lisatud.

Uudis jätkab olemasolevat Manrope/Antoni ning kuldse/musta identiteeti. Lugeja teekond on mängukutse → kohalike mängijate lugu → klubi toetamise võimalus. Artikli jagamispilt `assets/hooaja-lopumang-2026.png` on klubi tüpograafia ja värvidega loodud ilma klubi logota 1200 × 630 kutsegraafika, mitte meeskonnafoto. Artikli canonical, Open Graph, Twitter Card ja NewsArticle andmed viitavad samale URL-ile ning pildile. Uut uudist lisades uuenda ka `sitemap.xml`.

19.10.2026 faktikontroll: EJL-i protokoll 143774 kinnitab 11 : 0 tulemuse, Gren Kevin Raudsepa viis väravat vahetusest teisel poolajal ning Evert Rannama kaks väravat. EJL-i mäng 187875 kinnitab 24.10 kell 12 Jüri staadionil; liigatabel kinnitab 25 mängu, 61 punkti ja 128 löödud väravat. Protokoll oli kontrollimisel mitteametlik. Everdi debüüt ja Gren Kevini seos Jüriga pärinevad klubilt; vanus on kontrollitud mängijakaardilt. Külastuste 1492 ja 1078 koguarvud pärinevad klubi antud EJL-i kuvatõmmiselt; serveri HTML-i külastuste tabel oli kontrollimisel tühi. Artiklis on kahekordne edumaa tingimuslik siht (1492 + 665 > 2 × 1078), mitte saavutatud tulemus ega unikaalsete inimeste arv. Ära muuda ajaloolisi arve automaatselt jooksva tabeli põhjal.

Kontrollitud 360 ja 1440 px vaates uudiste plokk, artikkel ja teekond toetajalehele, jagamise metaandmed, lingi kopeerimise õnnestumine ja ebaõnnestumine ning 320 px vaade ilma JavaScriptita. Selles muudatuses vormide saatmist ei muudetud ega uusi päriskirju saadetud.

### Rae SK visuaalne identiteet (kinnitatud 19.10.2026)

Põhilogo on **Rae SK kilp**: `assets/rae-sk-logo.png` (1254 px) ning veebi jaoks `assets/rae-sk-logo-web.png` (320 px). Seda kasutavad kõigi avalike lehtede päis ja jalus, avalehe oma meeskonna mängukaart ja struktureeritud andmete logo. Eelmise FC Rae SK kirjaga kilbi faile säilitatakse, kuid praeguses veebis ei kasutata. Favicon on põhilogost eksporditud `assets/rae-sk-favicon.png`. Organisatsiooni juriidiline nimi **FC Rae SK MTÜ**, konto saaja ja võistkonna nimi **Rae Spordikool** jäävad muutmata.

Põhivärvid pärinevad Rae SK kilbist: kollane `#FDEE08`, must `#111317`, valge `#FFFFFF`. Veebi kollase omanik on `styles.css` token `--gold`; senine tokeni nimi on säilitatud tarbijate ühilduvuseks. Heledal taustal kasutatakse loetavuse hoidmiseks tumedamat kollast `--gold-dark: #756600`. Toetajamärgis jätkab kinnitatud kogukonnasümbolit ja jalgpalli sama musta/kollase/valgega; see on toetusest kõnelev märgis, mitte teine klubi põhilogo. PNG on kontuuridega SVG eksport; tavaline SVG hoiab teksti muudetavana. Rae Spordikooli ümmargune R-logo on muutmata ja paikneb jaluses väiksemalt organisatsiooni seost selgitava teksti juures; noortetöö sisus on see endiselt asjakohane.

Ühine geomeetria ja värvid on `styles.css` omanduses; toetajalehe päisel pole enam eraldi logo suuruse reeglit. Avalikud lehed on staatilised HTML-id, sh vanad .html-aadressid; identiteedi muudatus peab katma ka need. `scripts/build-supporters.mjs` kopeerib toetajalehe kanoonilise allika vanale aadressile. PDF-i ehitaja loeb kollase ja musta samadest CSS tokenitest.

Identiteedi muudatuse kontroll: kõigi 34 avaliku HTML-i põhilogo, jaluse seos ja favicon; viie esindusliku lehe (avaleht, toetajad, uudis, Rae I, noored) päis/jalus 360, 768 ja 1440 px vaates, pildilaadimine ja sama logo geomeetria, mobiilimenüü avamine/sulgemine, märgise palett ja pangaandmete säilimine. PDF on renderdatud ja visuaalselt kontrollitud. Uudise toetamisploki negatiivne serv põhjustas varem 768 px juures ülevoolu; selle kohalik murdepunkt on parandatud. Avalehe 360 px senine pikast pealkirjast ja sisupaneelidest tekkiv 17 px ülevool on algse HEAD-i vastu kinnitatud ning jäi logomuudatuse väliseks; päis ja jalus mahuvad ekraanile.

19.10.2026 artikli täpsustus: pealkiri räägib liigahooaja viimasest kodumängust, sest üleminekumängudel võib kodumänge veel lisanduda. Kasutaja kinnitas, et üleminekumängude koht on kindel; tõus Teise liigasse on sõnastatud eesmärgina. EJL-i tabelist kontrollitud Paide III 64 ja Rae 61 punkti; Rae võit annaks 64 punkti. Otsetõusu konkreetne tingimus vajab veel klubilt täpsustust: 2026. aasta Teise ja Teise liiga B juhendi 16.3 järgi järgnevad võrdsete omavaheliste punktide ja väravate vahe korral võitude arv; kaks omavahelist mängu olid Rae vaates 3 : 2 ja 5 : 6, Paidel on praegu 21, Rael 19 võitu. Seetõttu ei lubata artiklis, et Rae võit ja Paide kaotus tagaksid esikoha või otsetõusu. Praktilisi lisasid ei rõhutata vastavalt kasutaja soovile.

Artikli põhitekstis on eesmärk 665 inimest tribüünil, arvutus ja külastuste definitsioon on väiksemas allikamärkuses. Gren Kevini puhul küsitakse väravahoo jätkumist; parandatud on Everdi kahe värava lause ja sõna „kaasaelamine”. Artikli kutsegraafikast eemaldati klubi logo kasutaja soovil; päise/jaluse põhilogo jääb Rae SK-ks. Uuendatud sama pildi OG/Twitter/JSON-LD aadressid ja mõlema meeskonnalehe uudiseteaser. Kontrollitud 360/768/1440 px teekond uudiste plokist artikli kaudu toetajalehele ning jagamise metaandmed ja kopeerimine, lisaks 320 px ilma JavaScriptita.

### Võistkonna väravaküttide kiirvaade

Ühine omanik on `app.js` funktsioon `renderTeamFacts`, tarbijateks Rae I, Rae II, U15, U16 ja U17 kanoonilised ning vanad HTML-lehed. Kiirvaade näitab nüüd **Enim liigaväravaid** välja `leagueGoals` alusel; liidritena kuvatakse ainult päriselt võrdse suurima liigaväravate arvuga mängijad. Karikaväravaid ei liideta liigaväravatele ega puuduva liigastatistika asemele. Andmete korjaja hoiab `leagueGoals`, `cupGoals` ja `goals` (summa) eraldi; selle andmemudelit ei muudetud. Vana viga kuvas alati kaks esimest nime koos esimese mängija kogusummaga.

19.10.2026 on Martin Valkiainenil 25 liigaväravat ja 4 karikaväravat (kokku 29); Mathias Värval 15 liigaväravat, seega nad ei ole jagatud liidrid. EJL-i Teise liiga B Lõuna-Ida piirkonna väravaküttide tabelis on Martin teine, Henrii-Daniel Ustaalil on 30. Artiklis on Martini võimalus kerkida piirkonna parimaks väravakütiks küsimus, mitte lubadus ega väide kogu Teise liiga liidri kohta. Martini seos Jüri Kooliga on kinnitatud kooli õpetajate nimekirjast ja sellele on artikli allikas viidatud.

`scripts/team-facts.test.mjs` käivitab tegeliku ühise renderdaja ilma lehe alglaadimise ja võrguta: üks liider, eraldi karika/liiga arvestus, mitu tõelist viigiliidrit ning puuduv/nulliga liigastatistika. `npm test` hõlmab nii vorme kui seda regressiooni. App.js URL-i versioon on kõigil lehtedel uuendatud, et varasem brauseri vahemälu parandust ei peidaks.

19.10.2026 mängukutse lisainfo: klubi kinnitas 24. oktoobri poolajaloosimise (FC Rae SK MTÜ-lt särk ja Eesti–Bulgaaria mängu piletid, Tridensilt kingitused, Adidaselt kaks jalgpalli) ning mängust valmiva videograafi filmitud lühivideo. Piletite arvu, loosimise osalemiskorda, tasuta sissepääsu ega muid kinnitamata tegevusi ei lisatud. Kasutaja Facebooki viide 1105112148878831 avati ja kontrolliti: see on 18.10 Noova mängu kutse, mida kasutati senise tooni ja kujunduse viitena, mitte tulevase Kuusalu mängu sündmuselingina.

Lai mängukutse `assets/hooaja-lopumang-2026.png` (1200 × 630) sisaldab nüüd poolajaloosimise teadet ja eraldi heledat klubi toetajate riba. Püstine sotsiaalmeediaplakat `assets/hooaja-lopumang-2026-plakat.png` (1080 × 1350) lisab kõik kinnitatud auhinnad ja video info. Repligen jääb peasponsoriks, ülejäänud toetajad võetakse seniselt toetajalehelt: Rae vald, Stenmarein, Premial, Auxilia Pharma. Stenmarein on tekstina, sest kinnitatud logofail puudub; olemasolevaid ettevõtete logosid ei värvitud ümber. Tridens ja Adidas on auhindade andjad eraldi loosimisosas, mitte automaatselt klubi pikaajaliste sponsorite seas. Klubi põhilogo kutsegraafikasse tagasi ei lisatud.
