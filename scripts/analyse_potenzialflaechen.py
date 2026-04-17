"""
scripts/analyse_potenzialflaechen.py
------------------------------------
Baut aus ``sachsen.gpkg`` eine Potenzialflaechen-Analyse:

1. Erstellt eine Restriktionsmaske (Union aller 'hart'-Layer aus layers.json
   plus Puffer um Gebaeude / Wald).
2. Zieht die Maske von Flurstuecken ab, berechnet Flaechen und Anteil frei.
3. Vergibt Score A..X und baut Begruendungs-Text.
4. Optional Clip auf Gemeinde / Landkreis.
5. Schreibt Ergebnis als Layer 'flurstuecke_bewertet' in die gleiche gpkg
   und als Excel-Datei nach ergebnis_excel/.

Benutzung:
    python scripts/analyse_potenzialflaechen.py \\
        --gpkg daten/sachsen.gpkg \\
        --gemeinde "Meissen" \\
        --out-xlsx ergebnis_excel/meissen.xlsx

Ohne --gemeinde wird ganz Sachsen analysiert (sehr lange).
"""

from __future__ import annotations
import argparse
import json
import sys
from pathlib import Path

try:
    import geopandas as gpd
    import pandas as pd
    from shapely.ops import unary_union
except ImportError:
    sys.stderr.write("FEHLER: geopandas/pandas nicht installiert. "
                     "Bitte 'pip install -r scripts/requirements.txt' ausfuehren.\n")
    sys.exit(1)


HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DEFAULT_GPKG = REPO / "daten" / "sachsen.gpkg"
DEFAULT_OUT_XLSX = REPO / "ergebnis_excel" / "potenzialflaechen.xlsx"
LAYERS_JSON = HERE / "layers.json"

# Pufferregeln (in Metern). None = kein Puffer.
BUFFERS = {
    "biotope_punkte": 25,
    "biotope_linien": 10,
    "wea_betrieb": 200,
    "wea_vor_inbetrieb": 200,
    "wea_genehmigung": 200,
}


def list_restriktions_layer() -> list[str]:
    cfg = json.loads(LAYERS_JSON.read_text(encoding="utf-8"))
    return [
        l["name"]
        for l in cfg["layers"]
        if isinstance(l, dict) and l.get("restriktion") == "hart"
    ]


def read_optional(gpkg: Path, layer: str) -> gpd.GeoDataFrame | None:
    try:
        gdf = gpd.read_file(gpkg, layer=layer)
        if gdf.empty:
            return None
        return gdf.to_crs(25833)
    except Exception:
        return None


def build_restriktionsmaske(gpkg: Path, layer_names: list[str]) -> gpd.GeoDataFrame:
    geoms = []
    used = []
    for name in layer_names:
        g = read_optional(gpkg, name)
        if g is None:
            print(f"  (Layer fehlt / leer, ausgelassen): {name}")
            continue
        buf = BUFFERS.get(name)
        if buf:
            g = g.copy()
            g["geometry"] = g.geometry.buffer(buf)
        geoms.append(g.geometry)
        used.append(name)
    if not geoms:
        raise SystemExit("Keine Restriktionslayer in sachsen.gpkg gefunden.")
    print(f"  verwendete Restriktionslayer: {used}")
    allg = pd.concat(geoms, ignore_index=True)
    dissolved = unary_union(allg.values)
    mask = gpd.GeoDataFrame(geometry=[dissolved], crs="EPSG:25833")
    return mask


def pick_gemeinde(gpkg: Path, name: str) -> gpd.GeoDataFrame:
    for cand in ("gemeinden_luis", "gemeinden_rapis"):
        g = read_optional(gpkg, cand)
        if g is None:
            continue
        # Heuristik: egal welche Spalte – irgendeine enthaelt den Namen
        mask = g.apply(
            lambda row: any(isinstance(v, str) and name.lower() in v.lower()
                            for v in row.values),
            axis=1,
        )
        sub = g[mask]
        if not sub.empty:
            return sub
    raise SystemExit(f"Gemeinde '{name}' weder in gemeinden_luis noch gemeinden_rapis gefunden.")


def score_from_anteil(p: float) -> str:
    if p >= 90: return "A – sehr gut"
    if p >= 60: return "B – gut"
    if p >= 30: return "C – mittel"
    if p >   0: return "D – gering"
    return "X – ausgeschlossen"


def build_begruendung(row: pd.Series, active_layers: list[str]) -> str:
    hits = [name for name in active_layers if row.get(f"in_{name}")]
    return ", ".join(hits) if hits else ""


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--gpkg", type=Path, default=DEFAULT_GPKG)
    p.add_argument("--gemeinde", default=None, help="Gemeinde-Name (z.B. 'Meissen')")
    p.add_argument("--out-xlsx", type=Path, default=DEFAULT_OUT_XLSX)
    p.add_argument("--out-layer", default="flurstuecke_bewertet",
                   help="Name des Ergebnis-Layers in der gpkg")
    args = p.parse_args()

    if not args.gpkg.exists():
        print(f"GeoPackage nicht gefunden: {args.gpkg}")
        return 2

    print("1) Flurstuecke laden...")
    flurst = read_optional(args.gpkg, "flurstuecke")
    if flurst is None:
        print("Layer 'flurstuecke' fehlt – bitte zuerst Downloader laufen lassen.")
        return 2
    print(f"   {len(flurst):,} Flurstuecke")

    if args.gemeinde:
        print(f"2) Clip auf Gemeinde '{args.gemeinde}'...")
        gem = pick_gemeinde(args.gpkg, args.gemeinde)
        flurst = gpd.overlay(flurst, gem[["geometry"]], how="intersection")
        print(f"   {len(flurst):,} Flurstuecke in der Gemeinde")

    print("3) Restriktionsmaske bauen...")
    rest_names = list_restriktions_layer()
    maske = build_restriktionsmaske(args.gpkg, rest_names)

    print("4) Fluraechen verschneiden (Differenz)...")
    flurst["flaeche_m2"] = flurst.geometry.area.round(1)
    frei = gpd.overlay(flurst, maske, how="difference")
    frei["rest_m2"] = frei.geometry.area.round(1)

    # Merge Rest zurueck
    flurst_id_col = next((c for c in flurst.columns if c.lower() in {"fid", "objectid", "gml_id", "flst_kennz", "id"}), None)
    if flurst_id_col is None:
        flurst = flurst.reset_index().rename(columns={"index": "_fid"})
        flurst_id_col = "_fid"
        frei = frei.reset_index().rename(columns={"index": "_fid"})

    rest_sum = (
        frei.groupby(flurst_id_col)["rest_m2"].sum().reset_index()
    )
    out = flurst.merge(rest_sum, on=flurst_id_col, how="left")
    out["rest_m2"] = out["rest_m2"].fillna(0)
    out["anteil_frei_prozent"] = (out["rest_m2"] / out["flaeche_m2"] * 100).round(1)
    out["score"] = out["anteil_frei_prozent"].apply(score_from_anteil)

    print("5) Begruendungen berechnen...")
    active_layers = []
    for name in rest_names:
        g = read_optional(args.gpkg, name)
        if g is None:
            continue
        buf = BUFFERS.get(name)
        if buf:
            g = g.copy()
            g["geometry"] = g.geometry.buffer(buf)
        flag_col = f"in_{name}"
        hit = gpd.sjoin(out[[flurst_id_col, "geometry"]], g[["geometry"]], predicate="intersects", how="left")
        hit_ids = set(hit.dropna(subset=["index_right"])[flurst_id_col])
        out[flag_col] = out[flurst_id_col].isin(hit_ids)
        active_layers.append(name)

    out["begruendung"] = out.apply(lambda r: build_begruendung(r, active_layers), axis=1)

    print(f"6) Ergebnis-Layer '{args.out_layer}' in {args.gpkg.name} speichern...")
    out.to_file(args.gpkg, layer=args.out_layer, driver="GPKG", mode="a")

    print(f"7) Excel schreiben: {args.out_xlsx}")
    args.out_xlsx.parent.mkdir(parents=True, exist_ok=True)
    excel_cols = [c for c in (
        "gemarkung", "gemarkungsname", "flur", "flst_nr", "flstkennz", "nr",
        "flaeche_m2", "rest_m2", "anteil_frei_prozent", "score", "begruendung"
    ) if c in out.columns]
    # Restliche sinnvolle Attribute ans Ende
    other = [c for c in out.columns if c not in excel_cols and c != "geometry" and not c.startswith("in_")]
    out[excel_cols + other].to_excel(args.out_xlsx, index=False)

    print("\nFertig.")
    print(f"  Layer in gpkg : {args.out_layer}")
    print(f"  Excel         : {args.out_xlsx}")
    print(f"  Flurstuecke   : {len(out):,}")
    print(f"  davon A/B     : {(out['score'].str.startswith(('A','B'))).sum():,}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
