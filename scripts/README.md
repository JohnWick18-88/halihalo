# Sachsen Layer-Export & Potenzialflaechen-Analyse

Diese Skripte machen genau das, was du in QGIS bisher manuell machen musstest:

1. **Alle LUIS/RAPIS-Layer aus deinem QGIS-Baum in eine einzige GeoPackage herunterladen** – dann bist du unabhaengig von den Servern.
2. **Restriktionsmaske bauen** (Wald, Biotope, Natura2000, Trinkwasserschutz, Moore, …) und von den Flurstuecken abziehen.
3. **Fuer eine Gemeinde einen Report als Excel** erzeugen: Gemarkung, Flurstueck, Flaeche, Restflaeche, Anteil frei %, Score A–X, Begruendung.
4. Das Ergebnis leuchtet in QGIS gruen/gelb/rot auf – und du kannst es auch im bestehenden Leaflet-Tool „God's Eye Sachsen" verwenden.

Es gibt **zwei Wege**, Schritt 1 zu machen. Waehle einen:

| Weg | Wann sinnvoll | Was musst du tun |
|---|---|---|
| **A** `pyqgis_export_layertree.py` | Dein QGIS-Baum ist schon vollstaendig geladen (so wie bei dir). Schnell, kein Python-Setup noetig. | Skript in der QGIS-Python-Konsole ausfuehren. |
| **B** `download_layers.py` | Du willst unabhaengig von QGIS arbeiten, z. B. naechtlich per Task-Scheduler aktualisieren. | Python 3.10+ installieren, `pip install -r requirements.txt`. |

Beide schreiben in **`D:\Standortanalyse\daten\sachsen.gpkg`**.

---

## Ordnerstruktur (empfohlen)

```
D:\Standortanalyse\
  ├─ daten\                 <-- sachsen.gpkg landet hier
  ├─ ergebnis_excel\        <-- Excel-Reports landen hier
  ├─ eingang_excel\         <-- optional: Excel-Listen, die du einliest
  └─ halihalo\              <-- dieses Repo (git clone)
     └─ scripts\
         ├─ layers.json
         ├─ download_layers.py
         ├─ pyqgis_export_layertree.py
         ├─ analyse_potenzialflaechen.py
         ├─ requirements.txt
         └─ README.md
```

Lege die drei Ordner `daten`, `ergebnis_excel`, `eingang_excel` von Hand an (Rechtsklick → Neuer Ordner). Das Repo klonst du mit:

```bat
cd D:\Standortanalyse
git clone https://github.com/JohnWick18-88/halihalo.git
cd halihalo
git checkout claude/layer-export-feature-RPRfu
git pull
```

---

## Weg A: Per QGIS-Konsole (einfachster Weg)

1. QGIS oeffnen, dein Projekt mit dem LUIS/RAPIS-Layerbaum laden.
2. Menue **Erweiterungen → Python-Konsole** (oder Icon mit Schlangenkopf).
3. In der Konsole rechts oben auf **„Editor anzeigen"** klicken.
4. In der Editor-Leiste auf **„Skript oeffnen"**, dann
   `D:\Standortanalyse\halihalo\scripts\pyqgis_export_layertree.py` waehlen.
5. Oben im Editor den gruenen **Play-Button** druecken.
6. Warte, bis in der Konsole `--- Fertig ---` steht. Das kann bei ganz Sachsen mehrere Stunden dauern (ArcGIS gibt jeweils nur wenige tausend Features pro Request heraus).

Danach hast du alle Vektorlayer als Tabellen in `daten\sachsen.gpkg`.

> Falls ein Layer zu gross ist (>5 Mio Features), wird er uebersprungen. Dann im Skript `MAX_FEATURES` hochsetzen oder `BBOX` auf einen Landkreis begrenzen.

---

## Weg B: Per eigenstaendigem Python-Downloader

### Einmal einrichten (10 Minuten)

1. **Python 3.10+** von python.org installieren. Beim Installer unbedingt Haken **„Add Python to PATH"** setzen.
2. Windows-Eingabeaufforderung (`cmd`) oeffnen:
   ```bat
   cd D:\Standortanalyse\halihalo
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r scripts\requirements.txt
   ```
   Wenn `pip install geopandas` auf Windows Probleme macht, stattdessen:
   ```bat
   pip install pipwin
   pipwin install gdal fiona shapely pyproj
   pip install geopandas pandas requests openpyxl
   ```

### Alle Layer herunterladen

```bat
python scripts\download_layers.py --out D:\Standortanalyse\daten\sachsen.gpkg
```

### Nur eine Gruppe laden (viel schneller)

```bat
python scripts\download_layers.py --group 0_basis
python scripts\download_layers.py --group 8_natur
```

### Nur auf einen Landkreis begrenzen

```bat
:: Erst die Grenzen ziehen:
python scripts\download_layers.py --group 0_basis
:: Dann Rest mit BBox des Landkreises:
python scripts\download_layers.py --bbox-landkreis "Meissen"
```

### Einzelnen Layer nachladen / reparieren

```bat
python scripts\download_layers.py --only nsg
```

---

## Schritt 2: Restriktionsmaske + Score + Excel

Sobald `sachsen.gpkg` existiert:

```bat
:: Fuer eine Gemeinde:
python scripts\analyse_potenzialflaechen.py --gemeinde "Meissen" --out-xlsx D:\Standortanalyse\ergebnis_excel\meissen.xlsx

:: Fuer ganz Sachsen (dauert lang):
python scripts\analyse_potenzialflaechen.py --out-xlsx D:\Standortanalyse\ergebnis_excel\sachsen_gesamt.xlsx
```

Das Skript schreibt:

- **Layer `flurstuecke_bewertet`** in `sachsen.gpkg` – den kannst du in QGIS oeffnen und regelbasiert einfaerben (siehe unten).
- **Excel** mit Spalten: `gemarkung`, `flst_nr`, `flaeche_m2`, `rest_m2`, `anteil_frei_prozent`, `score`, `begruendung`.

Welche Layer als „harte Restriktion" gelten, steht in `scripts/layers.json` unter dem Schluessel `"restriktion": "hart"`. Das kannst du jederzeit editieren – keine Code-Aenderung noetig.

---

## Schritt 3: In QGIS „aufleuchten" lassen

1. In QGIS: **Layer → Layer hinzufuegen → Vektorlayer**, die `sachsen.gpkg` waehlen, nur `flurstuecke_bewertet` aktivieren.
2. Doppelklick auf den Layer → **Symbolisierung** → oben „Regelbasiert".
3. Fuenf Regeln mit diesen Ausdruecken:
   - `"score" = 'A – sehr gut'` → kraeftig gruen
   - `"score" = 'B – gut'` → hellgruen
   - `"score" = 'C – mittel'` → gelb
   - `"score" = 'D – gering'` → orange
   - `"score" = 'X – ausgeschlossen'` → transparent grau

Fertig. Jetzt leuchten alle freien Flurstuecke sofort.

---

## Schritt 4: Excel-Import (Eingang)

Wenn du eine Excel mit Gemarkung+Flurstuecksnummer oder Adressen hast:

1. Excel in `D:\Standortanalyse\eingang_excel\meineliste.xlsx` ablegen.
2. In QGIS: **Layer → Layer hinzufuegen → Vektorlayer**, Datei waehlen.
3. Rechtsklick auf `flurstuecke_bewertet` → **Eigenschaften → Verknuepfungen → ➕**
   - Verknuepfungslayer: deine Excel
   - Verknuepfungsfeld: Flurstueckskennzeichen (z. B. `flstkennz`)
   - Zielfeld: dasselbe
4. Fertig: beim Anklicken eines Flurstuecks erscheinen jetzt auch deine Excel-Spalten.

---

## Was ist mit den RAPIS-MapServer-Layern?

Die `RO_BPLAN_*`, `RO_FNP_*`, `RO_Verkehr_*`, Altlasten etc. sind **reine Bild-Kacheln**, keine Vektoren. Die kann man NICHT als Flurstueck-genaue Maske verrechnen. Optionen:

- In QGIS als WMS-Hintergrund eingeblendet lassen (so wie du es schon machst).
- Wenn du offline sein willst: mit dem QGIS-Plugin **„QTiles"** oder dem Kommandozeilen-Tool `gdal_translate --of MBTiles` einen lokalen Tile-Cache erzeugen.
- Fuer B-Plan/FNP gibt es teilweise parallele Vektor-Downloads ueber das Open-Data-Portal des jeweiligen Kreises – dann kann man sie genauso wie die LUIS-Layer integrieren.

---

## Typische Probleme

| Problem | Loesung |
|---|---|
| `pip install geopandas` scheitert auf Windows | Stattdessen `pipwin install gdal fiona shapely pyproj` benutzen, dann `pip install geopandas`. |
| „exceededTransferLimit" im Download | Das ist normal. Das Skript paginiert automatisch weiter. |
| QGIS friert beim Klicken ein | Vermutlich ziehst du noch vom Server. Nach dem Export entfernst du die WFS-Layer aus dem Baum und arbeitest nur mit der lokalen `sachsen.gpkg`. |
| ArcGIS liefert Fehler 502 / Timeout | Netz haengt. Das Skript versucht 5× mit Exponential-Backoff. Einfach nochmal starten – er setzt dort an, wo er war, da bereits geschriebene Layer einfach ueberschrieben werden. |
| Layer hat 0 Features | Manche RAPIS-URLs sind MapServer-only. Die sind in `layers.json` markiert und werden uebersprungen. |

---

## Was bleibt manuell?

- **Google-Satellite / Basiskarten**: Tile-Server, kein Vektor. Bleiben online.
- **Vertrauliche ALKIS-Eigentuemerdaten**: nicht oeffentlich, nicht per WFS. Das ist korrekt so und wird hier bewusst **nicht** umgangen.
- **B-Plan PDFs**: manuell aus dem Portal der Gemeinde ziehen, wenn du Details brauchst.

Alles andere laeuft ab jetzt automatisiert.
