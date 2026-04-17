"""
scripts/pyqgis_export_layertree.py
----------------------------------
Dieses Skript wird DIREKT in der QGIS Python-Konsole ausgefuehrt und
exportiert ALLE aktuell im Layerbaum geladenen Vektor-Layer nach
``D:\\Standortanalyse\\daten\\sachsen.gpkg``.

Vorteil gegenueber dem reinen Python-Downloader: Es nutzt deine
vorhandene LUIS/RAPIS-Anbindung in QGIS, d. h. es gibt keine weiteren
Auth- oder Netzprobleme. Raster-/WMS-Layer werden uebersprungen.

Benutzung:
    1. QGIS oeffnen, Projekt laden (dein 'LUIS Sachsen' Baum).
    2. Oben: Erweiterungen -> Python-Konsole.
    3. Im Konsolenfenster rechts oben auf 'Editor anzeigen' klicken.
    4. Dieses File oeffnen und auf Play (Run) druecken.
    5. Fortschritt erscheint in der Konsole.

Parameter ganz unten anpassbar (OUT_GPKG, BBOX, MAX_FEATURES).
"""

from qgis.core import (
    QgsProject,
    QgsVectorLayer,
    QgsVectorFileWriter,
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransformContext,
    QgsRectangle,
    QgsFeatureRequest,
)
from qgis.utils import iface  # noqa: F401 (verfuegbar in QGIS-Konsole)
import os
import re


OUT_GPKG = r"D:\Standortanalyse\daten\sachsen.gpkg"
TARGET_CRS = QgsCoordinateReferenceSystem("EPSG:25833")

# Optionale BBox in EPSG:25833 (xmin, ymin, xmax, ymax) oder None = ganz Sachsen
BBOX = None
# BBOX = (259000, 5568000, 544000, 5823000)  # ~ Sachsen

# Wenn ein Layer mehr Features hat, wird er uebersprungen (Schutz vor Killern).
MAX_FEATURES = 5_000_000


def safe_name(raw: str) -> str:
    """Macht aus einem Layer-Namen einen GPKG-tauglichen Tabellennamen."""
    s = raw.lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    s = s.strip("_")
    return s[:50] or "layer"


def is_raster_or_wms(layer) -> bool:
    prov = layer.providerType() if hasattr(layer, "providerType") else ""
    return prov in {"wms", "wcs", "gdal"}


def export_one(layer: QgsVectorLayer, gpkg_path: str, bbox=None) -> tuple[bool, str]:
    name = safe_name(layer.name())
    os.makedirs(os.path.dirname(gpkg_path), exist_ok=True)

    opts = QgsVectorFileWriter.SaveVectorOptions()
    opts.driverName = "GPKG"
    opts.layerName = name
    opts.fileEncoding = "UTF-8"
    opts.ct = None  # Transform setzen wir weiter unten via destCRS
    opts.destCRS = TARGET_CRS
    opts.actionOnExistingFile = (
        QgsVectorFileWriter.CreateOrOverwriteLayer
        if os.path.exists(gpkg_path)
        else QgsVectorFileWriter.CreateOrOverwriteFile
    )
    if bbox is not None:
        opts.filterExtent = QgsRectangle(*bbox)
        opts.filterExtentCrs = TARGET_CRS

    err, msg, new_path, new_layer = QgsVectorFileWriter.writeAsVectorFormatV3(
        layer,
        gpkg_path,
        QgsCoordinateTransformContext(),
        opts,
    )
    ok = err == QgsVectorFileWriter.NoError
    return ok, msg or ("OK" if ok else f"err={err}")


def walk_layer_tree():
    root = QgsProject.instance().layerTreeRoot()
    for node in root.findLayers():
        layer = node.layer()
        if layer is None:
            continue
        yield layer


def main() -> None:
    layers = list(walk_layer_tree())
    print(f"Im Layerbaum gefunden: {len(layers)} Layer")

    n_ok = 0
    n_skip = 0
    n_err = 0
    for i, lyr in enumerate(layers, 1):
        name = lyr.name()
        if is_raster_or_wms(lyr) or not isinstance(lyr, QgsVectorLayer):
            print(f"[{i:>3}/{len(layers)}] SKIP (raster/wms): {name}")
            n_skip += 1
            continue
        count = lyr.featureCount()
        if count is not None and count > MAX_FEATURES:
            print(f"[{i:>3}/{len(layers)}] SKIP (zu gross {count}): {name}")
            n_skip += 1
            continue
        print(f"[{i:>3}/{len(layers)}] {name}  ({count} Features)")
        try:
            ok, msg = export_one(lyr, OUT_GPKG, bbox=BBOX)
            if ok:
                print(f"     -> geschrieben in {os.path.basename(OUT_GPKG)}")
                n_ok += 1
            else:
                print(f"     FEHLER: {msg}")
                n_err += 1
        except Exception as e:  # noqa: BLE001
            print(f"     EXCEPTION: {e}")
            n_err += 1

    print("\n--- Fertig ---")
    print(f"OK: {n_ok}  Uebersprungen: {n_skip}  Fehler: {n_err}")
    print(f"Ziel: {OUT_GPKG}")


main()
