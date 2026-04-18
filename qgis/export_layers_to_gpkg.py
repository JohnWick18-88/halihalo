# -*- coding: utf-8 -*-
"""
QGIS-Script: Alle Layer des aktuell geladenen Projekts lokal sichern.

Aufruf (in der QGIS Python-Konsole):

    from pathlib import Path
    exec(compile(
        Path('C:/Users/leven/Downloads/export_layers_to_gpkg.py').read_text(encoding='utf-8'),
        'export_layers_to_gpkg.py', 'exec'))

Ablauf:
  * Vektor-Layer (FeatureServer / WFS / lokal)  ->  ein gemeinsames GeoPackage
    (gpkg mit je einer Tabelle pro Layer, benannt nach Gruppen-Pfad).
  * Raster-Layer (MapServer / WMS / XYZ / Tile) ->  einzelne GeoTIFFs
    auf die Sachsen-Bounding-Box gerendert (Auflösung konfigurierbar).
  * Fehler werden geloggt, bereits geschriebene Layer bei erneutem Lauf
    uebersprungen (Resume), damit das Script ueber Nacht durchlaufen kann.

Passe `OUTPUT_DIR`, `RASTER_RESOLUTION_M` und `EXPORT_RASTER` an deine
Bedürfnisse an.
"""

from __future__ import annotations

import os
import re
import sys
import time
import traceback
from pathlib import Path

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsRasterLayer,
    QgsVectorFileWriter,
    QgsRasterFileWriter,
    QgsRasterPipe,
    QgsRectangle,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsLayerTreeLayer,
    QgsLayerTreeGroup,
    Qgis,
)

# =========================================================================
# KONFIGURATION
# =========================================================================

# Ziel-Verzeichnis fuer Export (wird angelegt falls nicht vorhanden)
OUTPUT_DIR = r"C:/Users/leven/Downloads/qgis_export"

# Name des gemeinsamen GeoPackage fuer Vektor-Layer
GPKG_FILENAME = "rappis_luis_export.gpkg"

# Ordner fuer Raster-Exporte
RASTER_SUBDIR = "raster"

# Raster auch exportieren? (MapServer/WMS-Tile-Caches als GeoTIFF)
#
# ACHTUNG: Per Default AUS.  QGIS 3.40 stuerzt mit access violation ab,
# wenn ein entfernter MapServer/WMS/XYZ-Provider via QgsRasterFileWriter
# synchron heruntergeladen wird (Bug in der Renderer-Pipeline beim
# Single-Band-Color-Renderer fuer Tile-Caches).
#
# Vektor-Layer sind davon NICHT betroffen — der wichtige Teil deines
# Projekts (alle FeatureServer-Layer) wird in jedem Fall sauber ins GPKG
# geschrieben.  Die meisten Raster-Layer im Projekt (z.B. "Naturschutz
# Komplett (MapServer)") sind ohnehin nur gerenderte Sichten auf die
# darunter liegenden Vektor-Layer, die als Vektor mitexportiert werden.
#
# Wenn du einen einzelnen Raster-Layer brauchst: in QGIS rechts auf den
# Layer -> Export -> Save As... -> GeoTIFF -> Sachsen-Bbox angeben.
# Das laeuft im GUI-Worker-Thread und crasht nicht.
EXPORT_RASTER = False

# Wenn EXPORT_RASTER=True: trotzdem entfernte Provider ueberspringen?
# True = sicher (nur lokale Raster), False = riskant (Crash-Gefahr).
SKIP_REMOTE_RASTER = True

# Raster-Aufloesung in Metern pro Pixel (EPSG:25833)
# 25 m = sehr detailliert aber groß, 50 m = guter Kompromiss, 100 m = klein
RASTER_RESOLUTION_M = 50

# Sachsen Bounding Box in EPSG:25833 (UTM 33N)
# ca. 11.5..15.5 E / 50.0..52.0 N  ->  ~700000..940000 E / 5540000..5770000 N
SACHSEN_BBOX_25833 = QgsRectangle(700000, 5540000, 940000, 5770000)

# Ziel-CRS fuer Raster-Export (EPSG:25833 passt zu LUIS/RAPIS)
TARGET_CRS = QgsCoordinateReferenceSystem("EPSG:25833")

# Wenn True: bereits existierende Tabellen im GPKG / Tiffs werden uebersprungen
# (erlaubt Wiederaufnahme nach Abbruch). Bei False wird ueberschrieben.
RESUME = True

# Max. Zeichen pro Tabellennamen im GPKG
MAX_NAME_LEN = 60

# =========================================================================


def _ts() -> str:
    return time.strftime("%Y-%m-%d %H:%M:%S")


class Logger:
    def __init__(self, log_path: Path):
        self.path = log_path
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = self.path.open("a", encoding="utf-8")

    def log(self, msg: str) -> None:
        line = f"[{_ts()}] {msg}"
        print(line)
        self._fh.write(line + "\n")
        self._fh.flush()

    def close(self) -> None:
        try:
            self._fh.close()
        except Exception:
            pass


def sanitize_name(name: str, max_len: int = MAX_NAME_LEN) -> str:
    """GPKG-Tabellenname: nur [A-Za-z0-9_], Laenge begrenzt."""
    name = re.sub(r"[^A-Za-z0-9_]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    if not name:
        name = "layer"
    if name[0].isdigit():
        name = "l_" + name
    return name[:max_len]


def tree_path_for_layer(layer) -> str:
    """Baut einen sprechenden Layer-Namen aus dem Gruppen-Pfad im Layer-Tree."""
    root = QgsProject.instance().layerTreeRoot()
    node = root.findLayer(layer.id())
    if node is None:
        return layer.name()
    parts = []
    parent = node.parent()
    while parent is not None and isinstance(parent, QgsLayerTreeGroup):
        pname = parent.name()
        if pname:
            parts.append(pname)
        parent = parent.parent()
    parts.reverse()
    parts.append(layer.name())
    return " / ".join(parts)


def existing_gpkg_tables(gpkg_path: Path) -> set[str]:
    """Listet Tabellen im GPKG (fuer Resume). Leer, falls GPKG nicht existiert."""
    if not gpkg_path.exists():
        return set()
    try:
        # GPKG ist SQLite
        import sqlite3

        con = sqlite3.connect(str(gpkg_path))
        cur = con.cursor()
        cur.execute("SELECT table_name FROM gpkg_contents")
        rows = [r[0] for r in cur.fetchall()]
        con.close()
        return set(rows)
    except Exception:
        return set()


def export_vector_layer(
    layer: QgsVectorLayer,
    gpkg_path: Path,
    table_name: str,
    first_write: bool,
    logger: Logger,
) -> bool:
    opts = QgsVectorFileWriter.SaveVectorOptions()
    opts.driverName = "GPKG"
    opts.layerName = table_name
    opts.fileEncoding = "UTF-8"
    if first_write and not gpkg_path.exists():
        opts.actionOnExistingFile = QgsVectorFileWriter.CreateOrOverwriteFile
    else:
        opts.actionOnExistingFile = QgsVectorFileWriter.CreateOrOverwriteLayer

    ctx = QgsProject.instance().transformContext()

    # QGIS 3.20+: writeAsVectorFormatV3 gibt Tupel (errCode, errMsg, newFilename, newLayer)
    try:
        result = QgsVectorFileWriter.writeAsVectorFormatV3(
            layer, str(gpkg_path), ctx, opts
        )
    except AttributeError:
        # Fallback fuer aeltere QGIS-Versionen
        result = QgsVectorFileWriter.writeAsVectorFormatV2(
            layer, str(gpkg_path), ctx, opts
        )

    err_code = result[0]
    err_msg = result[1] if len(result) > 1 else ""
    if err_code == QgsVectorFileWriter.NoError:
        fc = layer.featureCount()
        logger.log(f"    OK  Vektor -> {table_name}  ({fc} Features)")
        return True
    logger.log(f"    FAIL Vektor {table_name}: code={err_code} msg={err_msg}")
    return False


def export_raster_layer(
    layer: QgsRasterLayer,
    out_path: Path,
    logger: Logger,
) -> bool:
    if out_path.exists() and RESUME:
        logger.log(f"    SKIP Raster {out_path.name} (existiert bereits)")
        return True

    extent = SACHSEN_BBOX_25833
    # Layer-CRS evtl. ungleich EPSG:25833 -> Extent transformieren fuer Provider-Anfrage
    src_crs = layer.crs()
    if src_crs.isValid() and src_crs != TARGET_CRS:
        xform = QgsCoordinateTransform(TARGET_CRS, src_crs, QgsProject.instance())
        try:
            provider_extent = xform.transformBoundingBox(extent)
        except Exception:
            provider_extent = layer.extent()
    else:
        provider_extent = extent

    width = int(extent.width() / RASTER_RESOLUTION_M)
    height = int(extent.height() / RASTER_RESOLUTION_M)
    if width <= 0 or height <= 0:
        logger.log(f"    FAIL Raster {out_path.name}: ungueltige Dimensionen")
        return False

    writer = QgsRasterFileWriter(str(out_path))
    writer.setOutputFormat("GTiff")
    writer.setCreateOptions(["COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=IF_SAFER"])

    pipe = QgsRasterPipe()
    provider = layer.dataProvider()
    if provider is None or not pipe.set(provider.clone()):
        logger.log(f"    FAIL Raster {out_path.name}: Provider-Pipe fehlgeschlagen")
        return False
    renderer = layer.renderer()
    if renderer is not None:
        pipe.set(renderer.clone())

    try:
        # writeRaster(pipe, width, height, extent, crs)
        result = writer.writeRaster(
            pipe, width, height, extent, TARGET_CRS
        )
    except TypeError:
        # aeltere Signatur ohne explizites crs
        result = writer.writeRaster(pipe, width, height, extent, TARGET_CRS)

    # 0 = NoError
    if result == 0:
        logger.log(f"    OK  Raster -> {out_path.name} ({width}x{height})")
        return True
    logger.log(f"    FAIL Raster {out_path.name}: code={result}")
    return False


def main():
    output_dir = Path(OUTPUT_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)
    raster_dir = output_dir / RASTER_SUBDIR
    raster_dir.mkdir(parents=True, exist_ok=True)
    gpkg_path = output_dir / GPKG_FILENAME
    log_path = output_dir / "export.log"

    logger = Logger(log_path)
    logger.log("=" * 72)
    logger.log(f"QGIS Export gestartet  |  QGIS {Qgis.QGIS_VERSION}")
    logger.log(f"Ziel: {output_dir}")
    logger.log(f"GPKG: {gpkg_path}")
    logger.log(f"Raster-Export: {EXPORT_RASTER}  (Aufloesung: {RASTER_RESOLUTION_M} m)")
    logger.log("=" * 72)

    project = QgsProject.instance()
    layers = list(project.mapLayers().values())
    logger.log(f"Gefundene Layer im Projekt: {len(layers)}")

    existing_tables = existing_gpkg_tables(gpkg_path) if RESUME else set()
    if existing_tables:
        logger.log(f"Resume: {len(existing_tables)} Tabellen existieren bereits im GPKG.")

    # Namenskollisionen aufloesen: bei gleichem sanitisierten Basisnamen Zaehler anhaengen
    used_table_names: set[str] = set(existing_tables)

    stats = {"vector_ok": 0, "vector_fail": 0, "vector_skip": 0,
             "raster_ok": 0, "raster_fail": 0, "raster_skip": 0}

    first_write = not gpkg_path.exists()

    for i, layer in enumerate(layers, 1):
        full_name = tree_path_for_layer(layer)
        base = sanitize_name(full_name)

        logger.log(f"[{i}/{len(layers)}] {full_name}")

        if not layer.isValid():
            logger.log("    SKIP (Layer ist ungueltig / Provider nicht verfuegbar)")
            if isinstance(layer, QgsVectorLayer):
                stats["vector_skip"] += 1
            else:
                stats["raster_skip"] += 1
            continue

        try:
            if isinstance(layer, QgsVectorLayer):
                table = base
                n = 2
                while table in used_table_names:
                    suffix = f"_{n}"
                    table = (base[: MAX_NAME_LEN - len(suffix)] + suffix)
                    n += 1

                if RESUME and table in existing_tables:
                    logger.log(f"    SKIP Vektor {table} (bereits im GPKG)")
                    used_table_names.add(table)
                    stats["vector_skip"] += 1
                    continue

                ok = export_vector_layer(layer, gpkg_path, table, first_write, logger)
                used_table_names.add(table)
                first_write = False
                if ok:
                    stats["vector_ok"] += 1
                else:
                    stats["vector_fail"] += 1

            elif isinstance(layer, QgsRasterLayer):
                if not EXPORT_RASTER:
                    logger.log("    SKIP Raster (EXPORT_RASTER=False)")
                    stats["raster_skip"] += 1
                    continue
                provider_name = ""
                try:
                    provider_name = layer.dataProvider().name().lower()
                except Exception:
                    pass
                remote_providers = {"wms", "wmts", "arcgismapserver", "xyz", "wcs"}
                if SKIP_REMOTE_RASTER and provider_name in remote_providers:
                    logger.log(
                        f"    SKIP Raster (entfernter Provider '{provider_name}',"
                        f" Crash-Gefahr; SKIP_REMOTE_RASTER=True)"
                    )
                    stats["raster_skip"] += 1
                    continue
                out_tif = raster_dir / f"{base}.tif"
                ok = export_raster_layer(layer, out_tif, logger)
                if ok:
                    stats["raster_ok"] += 1
                else:
                    stats["raster_fail"] += 1
            else:
                logger.log(f"    SKIP Layer-Typ {type(layer).__name__} wird nicht unterstuetzt.")
        except Exception as exc:
            tb = traceback.format_exc().strip().splitlines()[-1]
            logger.log(f"    EXC {exc.__class__.__name__}: {exc}  ({tb})")
            if isinstance(layer, QgsVectorLayer):
                stats["vector_fail"] += 1
            else:
                stats["raster_fail"] += 1

    logger.log("=" * 72)
    logger.log(
        "Fertig. Vektor OK {vector_ok} / fail {vector_fail} / skip {vector_skip}"
        " | Raster OK {raster_ok} / fail {raster_fail} / skip {raster_skip}".format(**stats)
    )
    logger.log(f"GPKG:   {gpkg_path}")
    logger.log(f"Raster: {raster_dir}")
    logger.log(f"Log:    {log_path}")
    logger.log("=" * 72)
    logger.close()


if __name__ == "__main__" or True:
    main()
