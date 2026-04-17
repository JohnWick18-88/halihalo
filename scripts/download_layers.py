"""
scripts/download_layers.py
--------------------------
Lädt alle in ``layers.json`` als ``featureserver`` markierten ArcGIS-REST
Layer paginiert herunter und schreibt sie in **eine einzige** GeoPackage.

Benutzung (Windows, mit installiertem Python 3.10+):

    cd D:\\Standortanalyse
    python -m venv .venv
    .\\.venv\\Scripts\\activate
    pip install -r scripts\\requirements.txt
    python scripts\\download_layers.py --out daten\\sachsen.gpkg

Optionen:
    --out PATH       Zielpfad der GeoPackage (default: ./daten/sachsen.gpkg)
    --only NAME      Nur einen Layer laden (Name aus layers.json)
    --group PREFIX   Nur Layer deren group mit PREFIX beginnt (z.B. 0_basis)
    --bbox-landkreis NAME
                     Download auf Landkreis-BBox beschränken (spart viel Zeit)
    --page-size N    Features pro Request (default 2000)
    --retries N      Wiederholungen bei Netzfehler (default 5)

Der Download passiert paginiert über ``resultOffset`` / ``resultRecordCount``
und ist robust gegen Abbrüche (pro Layer Resume nicht nötig, da alles in einem
Temp-Cache zwischengespeichert wird).
"""

from __future__ import annotations
import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urlencode

import requests

try:
    import geopandas as gpd
    import pandas as pd
    from shapely.geometry import shape
except ImportError:
    sys.stderr.write(
        "FEHLER: geopandas/shapely/pandas nicht installiert.\n"
        "Bitte 'pip install -r scripts/requirements.txt' ausfuehren.\n"
    )
    sys.exit(1)


HERE = Path(__file__).resolve().parent
REPO = HERE.parent
DEFAULT_LAYERS_JSON = HERE / "layers.json"
DEFAULT_OUT = REPO / "daten" / "sachsen.gpkg"


def load_config(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def arcgis_query(url: str, params: dict[str, Any], retries: int = 5) -> dict:
    """Ein einzelner paginierter Query-Request gegen eine FeatureServer-Schicht."""
    q = dict(params)
    q.setdefault("f", "geojson")
    q.setdefault("where", "1=1")
    q.setdefault("outFields", "*")
    q.setdefault("outSR", 25833)
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            r = requests.get(f"{url}/query", params=q, timeout=120)
            r.raise_for_status()
            data = r.json()
            if "error" in data:
                raise RuntimeError(f"ArcGIS Error: {data['error']}")
            return data
        except Exception as e:  # noqa: BLE001
            last_err = e
            wait = 2 ** attempt
            print(f"   ! Retry {attempt + 1}/{retries} in {wait}s ({e})", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"Request fehlgeschlagen nach {retries} Versuchen: {last_err}")


def fetch_featureserver(
    url: str,
    *,
    page_size: int = 2000,
    bbox_25833: tuple[float, float, float, float] | None = None,
    retries: int = 5,
) -> gpd.GeoDataFrame:
    """Holt einen ArcGIS-FeatureServer-Layer vollständig (paginiert) als GeoDataFrame."""
    base_params: dict[str, Any] = {
        "resultRecordCount": page_size,
        "orderByFields": "OBJECTID",
    }
    if bbox_25833:
        xmin, ymin, xmax, ymax = bbox_25833
        base_params.update({
            "geometry": f"{xmin},{ymin},{xmax},{ymax}",
            "geometryType": "esriGeometryEnvelope",
            "inSR": 25833,
            "spatialRel": "esriSpatialRelIntersects",
        })

    features: list[dict] = []
    offset = 0
    while True:
        params = dict(base_params, resultOffset=offset)
        data = arcgis_query(url, params, retries=retries)
        page = data.get("features", [])
        if not page:
            break
        features.extend(page)
        print(f"   …{len(features):,} Features geladen", flush=True)
        if len(page) < page_size and not data.get("exceededTransferLimit"):
            break
        offset += len(page)
        # Schutz vor Endlosschleife bei kaputtem Server
        if offset > 10_000_000:
            print("   !! Abbruch: >10 Mio Features, vermutlich kaputt", flush=True)
            break

    if not features:
        # leere GeoDataFrame mit EPSG-Info
        return gpd.GeoDataFrame(geometry=[], crs="EPSG:25833")

    # GeoJSON → GeoDataFrame (via shapely, damit z/m Koordinaten nicht stören)
    rows = []
    geoms = []
    for feat in features:
        props = feat.get("properties") or {}
        geom = feat.get("geometry")
        rows.append(props)
        geoms.append(shape(geom) if geom else None)
    df = pd.DataFrame(rows)
    gdf = gpd.GeoDataFrame(df, geometry=geoms, crs="EPSG:25833")
    return gdf


def get_landkreis_bbox(name: str, gpkg: Path) -> tuple[float, float, float, float] | None:
    """Liest BBox eines Landkreises aus bereits geladenem 'kreisgrenzen'-Layer."""
    try:
        lk = gpd.read_file(gpkg, layer="kreisgrenzen")
    except Exception:
        return None
    match = lk[lk.apply(lambda r: name.lower() in str(r.values).lower(), axis=1)]
    if match.empty:
        return None
    xmin, ymin, xmax, ymax = match.total_bounds
    return (xmin, ymin, xmax, ymax)


def write_layer(gdf: gpd.GeoDataFrame, gpkg: Path, layer_name: str) -> None:
    gpkg.parent.mkdir(parents=True, exist_ok=True)
    mode = "a" if gpkg.exists() else "w"
    gdf.to_file(gpkg, layer=layer_name, driver="GPKG", mode=mode)


def main(argv: Iterable[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--layers-json", type=Path, default=DEFAULT_LAYERS_JSON)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--only", default=None, help="Nur Layer mit diesem Namen laden")
    p.add_argument("--group", default=None, help="Nur Layer-Gruppe laden (Prefix-Match)")
    p.add_argument("--bbox-landkreis", default=None,
                   help="Auf diesen Landkreis-Namen beschränken (Kreisgrenzen-Layer muss vorher geladen sein)")
    p.add_argument("--page-size", type=int, default=2000)
    p.add_argument("--retries", type=int, default=5)
    args = p.parse_args(list(argv) if argv is not None else None)

    cfg = load_config(args.layers_json)
    all_layers = [l for l in cfg["layers"] if isinstance(l, dict) and l.get("type") == "featureserver"]

    if args.only:
        all_layers = [l for l in all_layers if l["name"] == args.only]
    if args.group:
        all_layers = [l for l in all_layers if str(l.get("group", "")).startswith(args.group)]

    if not all_layers:
        print("Keine passenden Layer in layers.json gefunden.", file=sys.stderr)
        return 2

    bbox = None
    if args.bbox_landkreis:
        bbox = get_landkreis_bbox(args.bbox_landkreis, args.out)
        if bbox is None:
            print(f"WARNUNG: Landkreis '{args.bbox_landkreis}' nicht gefunden – lade ganz Sachsen.")
        else:
            print(f"BBox {args.bbox_landkreis}: {bbox}")

    print(f"Ziel-GeoPackage: {args.out}")
    print(f"Layer insgesamt: {len(all_layers)}\n")

    failed: list[tuple[str, str]] = []
    for i, lyr in enumerate(all_layers, 1):
        name = lyr["name"]
        url = lyr["url"]
        print(f"[{i}/{len(all_layers)}] {name}  ({lyr.get('group', '')})")
        print(f"   {url}")
        try:
            gdf = fetch_featureserver(
                url,
                page_size=args.page_size,
                bbox_25833=bbox,
                retries=args.retries,
            )
            if gdf.empty:
                print("   -> 0 Features, übersprungen")
                continue
            write_layer(gdf, args.out, name)
            print(f"   -> {len(gdf):,} Features in {args.out.name}::{name} geschrieben\n")
        except Exception as e:  # noqa: BLE001
            print(f"   FEHLER: {e}\n")
            failed.append((name, str(e)))

    if failed:
        print("Folgende Layer konnten nicht geladen werden:")
        for n, e in failed:
            print(f"  - {n}: {e}")
        return 1

    print("Alle Layer erfolgreich geschrieben.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
