# -*- coding: utf-8 -*-
"""
===============================================================================
 QGIS AKQUISE-TOOL  —  PV / BESS / Rechenzentren — Sachsen
===============================================================================
 EIN Skript für alles: Diagnose, Visualisierung, Gruppierung, Mode-Switch.

 Oben MODUS setzen, F5 drücken. Fertig.

 Modi:
   'DIAGNOSE'     → nichts ändern, nur zeigen was matcht
   'NUR_HART'     → nur HART-Layer sichtbar, magenta eingefärbt, Canvas weiß
   'AMPEL'        → HART (magenta) + MITTEL (orange) + POSITIV (grün)
   'RESET'        → alle Layer an, Standard-Renderer, Canvas zurück
   'GRUPPIEREN'   → matched Layer in Ampel-Gruppen verschieben (reversibel)
   'AUFLOESEN'    → Ampel-Gruppen auflösen, Layer zurück an Originalposition

 Robustheit:
   - Dash-Normalisierung (—/–/―/- werden gleich behandelt)
   - Underscore-Normalisierung (_ ≙ Leerzeichen)
   - Umlaut-Toleranz in Patterns (ä/ae)
   - Matched im Layer-Name UND in der DataSource-URL
===============================================================================
"""

import re
from qgis.core import (
    QgsProject, QgsVectorLayer, QgsRasterLayer,
    QgsFillSymbol, QgsLineSymbol, QgsMarkerSymbol,
    QgsSingleSymbolRenderer, QgsWkbTypes,
    QgsLayerTreeGroup, QgsLayerTreeLayer,
)
from qgis.PyQt.QtGui import QColor
from qgis.utils import iface


# =============================================================================
# KONFIG
# =============================================================================

MODUS = 'DIAGNOSE'   # DIAGNOSE | NUR_HART | AMPEL | RESET | GRUPPIEREN | AUFLOESEN

SET_CANVAS_WHITE   = True   # weißer Hintergrund in NUR_HART / AMPEL
HIDE_UNMATCHED     = True   # alle nicht-kategorisierten Layer ausblenden
BRING_HART_TO_TOP  = True   # HART-Layer in Legende nach oben
GROUPS_EXPANDED    = False  # Ampel-Gruppen beim Erstellen aufgeklappt?
VERBOSE            = True

# Farben (R, G, B, A  — 0..255)
C_HART_FILL     = (220,  20, 120, 210)
C_HART_STROKE   = ( 90,   0,  45, 255)
C_MITTEL_FILL   = (255, 140,   0, 130)
C_MITTEL_STROKE = (160,  70,   0, 255)
C_POS_FILL      = (  0,   0,   0,   0)
C_POS_STROKE    = (  0, 140,  50, 255)

# Gruppennamen (Emojis = visuell; Name ist Identity → nicht ändern nach Erstlauf)
GRP_HART    = '🟥 HART — Ausschlüsse (gemeinsam schaltbar)'
GRP_MITTEL  = '🟧 MITTEL — Einzelfallprüfung'
GRP_POSITIV = '🟩 POSITIV — Privilegierte Kulisse'

# Custom-Property-Key für reversible Gruppierung
PROP_ORIG_PARENT = 'akquise_orig_parent_path'


# =============================================================================
# PATTERN-LISTEN  (Single Source of Truth)
# =============================================================================
# Regel: Pattern MUSS als Substring im normalisierten Layer-Namen ODER
# DataSource-URI auftauchen. Normalisiert wird beim Matching (siehe _norm).
# Daher Patterns hier bereits "normalisiert schreiben":
#   - lowercase
#   - KEINE Dashes (—/–/-) → als '-' geschrieben, werden beim Match vereinheitlicht
#   - Underscores werden zu Space beim Matching → Pattern mit Leerzeichen schreiben
#   - Umlaut-Varianten beide anlegen (ä + ae)
# =============================================================================

HART_PATTERNS = [
    # --- Naturschutz: absolute Tabubereiche --------------------------------
    'naturschutzgebiet',
    'schutzgebiete - nsg', 'schutzgebiete nsg',
    'schutzgebiete - np', 'schutzgebiete np', 'nationalpark',
    'schutzgebiete - br', 'biosphaer', 'biosphär',
    'schutzgebiete - ffh', 'natura2000 - ffh', 'ffh-gebiet', 'ffh gebiet',
    'schutzgebiete - vsg', 'vogelschutzgebiet', 'europaeische vogelschutz',
    'flaechennaturdenkmal', 'flächennaturdenkmal',
    'fledermausquartier',
    # §30-Biotope
    'geschuetzte biotope', 'geschützte biotope',
    'biotope - punkt', 'biotope - linien', 'biotope - flaechen', 'biotope - flächen',
    'issand habitat', 'issand lrt', 'issand biotop',

    # --- Wasser hart -------------------------------------------------------
    'twsg grundwasser',
    'twsg fliessgewaesser', 'twsg fließgewässer',
    'heilquellenschutz',
    'hochwasser', 'hq100', 'ueberschwemmungsgebiet', 'überschwemmungsgebiet',

    # --- Bergbau hart ------------------------------------------------------
    'baubeschraenkungsgebiet', 'baubeschränkungsgebiet',
    'hohlraumkarte',

    # --- Denkmal / UNESCO --------------------------------------------------
    'unesco', 'weltkulturerbe', 'welterbe',
    'denkmalschutzgebiet',
    'archaeolog', 'archäolog',

    # --- Regionalplan VRG (quasi-hart) -------------------------------------
    'vrg waldschutz', 'vrg waldmehrung',
    'vrg arten', 'vrg biotop',
    'vrg vorbeugender hochwasser', 'vrg hochwasserschutz',

    # --- GLöZ2 / Moore / Auen ---------------------------------------------
    'feuchtgebiete/moore', 'feuchtgebiete moore',
    'gloez2', 'glöz2',
    'auen- und moorkulisse', 'auen und moorkulisse',
    'moorkulisse', 'auenkulisse',

    # --- Bestandsanlagen (physisch belegt) ---------------------------------
    'pv-anlagen >100kw bestand', 'pv anlagen >100kw bestand',
    'wea - in betrieb', 'wea in betrieb',
    'wea - vor inbetriebnahme', 'wea vor inbetriebnahme',
    'wea - im genehmigungsverfahren', 'wea im genehmigungsverfahren',
    'wea im betrieb',             # Underscored-Variante: 'WEA_im_Betrieb'
    'wea vor inbetriebnahme',
    'wea im genehmigungsverfahren',
    'kraftwerke >10mw', 'kraftwerk >10mw',
]

MITTEL_PATTERNS = [
    # Naturschutz weich
    'schutzgebiete - lsg', 'schutzgebiete lsg',
    'landschaftsschutzgebiet', 'landschaftsschutz',
    # Wasser weich
    'twsg talsperren', 'talsperre weitzone',
    # Regionalplanung weich
    'vbg ', ' vbg',
    # Technik-Korridore
    'richtfunk',
    'gashochdruck',
    # Industrie-Nachbarschaft
    'ied-anlagen', 'ied anlagen',
    'biogasanlage',
    # Biotope allgemein (nicht §30)
    'btlnk', 'biotoptyp',
    # Altlasten / Bergbau weich
    'salka', 'altlasten',
    'deponie',
    'bergbauberechtigung',
    'gruben unter bergaufsicht',
    'braunkohlen', 'sanierungsplan',
    # Weitere
    'luftverkehr baubeschraenkung', 'luftverkehr baubeschränkung',
    'verdichtungsraum',
    'vrg landwirtschaft',
    'nitratbelastet', 'nitratgebiet',
    'nep punktmassnahme', 'nep punktmaßnahme',
    # Denkmal weich (Einzel-Kulturdenkmäler sind oft verhandelbar)
    'kulturdenkmal',
]

POSITIV_PATTERNS = [
    'pvfvo',
    'gebietskulisse freiflaechen', 'gebietskulisse freiflächen',
    'eeg-korridor', 'eeg korridor',
    'schuetzenswerte boeden eeg', 'schützenswerte böden eeg',
    'umspannwerk',
    'usw flex-score', 'flex-score',
    'suchraum bess', 'bess-suchraum', 'bess suchraum',
    'mittel-/hochspannungsleitung', 'mittel hochspannungsleitung',
    'hs leitungen', 'hs-leitungen',
    'hoechstspannung', 'höchstspannung',
]


# =============================================================================
# NORMALISIERUNG & MATCHING
# =============================================================================

_DASHES = ('\u2014', '\u2013', '\u2015', '\u2212')   # — – ― −

def _norm(s):
    """String robust vergleichbar machen."""
    if not s:
        return ''
    s = s.lower()
    for d in _DASHES:
        s = s.replace(d, '-')
    s = s.replace('_', ' ')
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def _match_category(layer):
    """→ 'HART' | 'MITTEL' | 'POSITIV' | None"""
    name = _norm(layer.name())
    try:
        src = _norm(layer.dataProvider().dataSourceUri())
    except Exception:
        src = ''
    hay = name + ' | ' + src

    for pat in HART_PATTERNS:
        if _norm(pat) in hay:
            return 'HART'
    for pat in MITTEL_PATTERNS:
        if _norm(pat) in hay:
            return 'MITTEL'
    for pat in POSITIV_PATTERNS:
        if _norm(pat) in hay:
            return 'POSITIV'
    return None


# =============================================================================
# HELFER
# =============================================================================

def _log(msg):
    if VERBOSE:
        print(msg)


def _qcolor(rgba):
    c = QColor(rgba[0], rgba[1], rgba[2])
    c.setAlpha(rgba[3])
    return c


def _tree():
    return QgsProject.instance().layerTreeRoot()


def _find_tree_node(layer):
    return _tree().findLayer(layer.id())


def _set_visible(layer, visible):
    node = _find_tree_node(layer)
    if node is not None:
        node.setItemVisibilityChecked(visible)


def _bring_to_top(layer):
    node = _find_tree_node(layer)
    if node is None:
        return
    parent = node.parent()
    clone = node.clone()
    parent.removeChildNode(node)
    _tree().insertChildNode(0, clone)


# =============================================================================
# STYLING
# =============================================================================

def _style_vector(layer, fill_rgba, stroke_rgba, stroke_mm=0.6):
    fill   = _qcolor(fill_rgba)
    stroke = _qcolor(stroke_rgba)
    geom   = layer.geometryType()

    if geom == QgsWkbTypes.PolygonGeometry:
        sym = QgsFillSymbol.createSimple({
            'style':         'solid',
            'outline_style': 'solid',
            'outline_width': f'{stroke_mm}',
        })
        sym.setColor(fill)
        try:
            sl = sym.symbolLayer(0)
            sl.setStrokeColor(stroke)
            sl.setStrokeWidth(stroke_mm)
        except Exception:
            pass
    elif geom == QgsWkbTypes.LineGeometry:
        sym = QgsLineSymbol.createSimple({
            'line_style': 'solid',
            'line_width': f'{max(stroke_mm, 1.0)}',
        })
        sym.setColor(stroke)
    else:
        sym = QgsMarkerSymbol.createSimple({
            'name':          'circle',
            'size':          '3.2',
            'outline_width': '0.6',
        })
        sym.setColor(fill)
        try:
            sym.symbolLayer(0).setStrokeColor(stroke)
        except Exception:
            pass

    layer.setRenderer(QgsSingleSymbolRenderer(sym))
    layer.setOpacity(1.0)
    layer.triggerRepaint()


def _style_raster(layer, category):
    """MapServer-Raster lassen sich nicht umfärben — nur Deckkraft,
    Blend-Mode und Sättigung. Korrekte QGIS-3-API verwendet den
    eingebauten HueSaturationFilter des Rasters."""
    try:
        if category == 'HART':
            layer.setOpacity(1.0)
            layer.setBlendingMode('Multiply')
        elif category == 'MITTEL':
            layer.setOpacity(0.75)
            layer.setBlendingMode('SourceOver')
        else:
            layer.setOpacity(0.65)
            layer.setBlendingMode('SourceOver')

        hsf = layer.hueSaturationFilter()
        if hsf is not None:
            hsf.setSaturation({'HART': 100, 'MITTEL': 50}.get(category, 0))
    except Exception as e:
        _log(f'  ⚠ Raster-Styling fehlgeschlagen für {layer.name()}: {e}')

    layer.triggerRepaint()


def _reset_style(layer):
    """Best-effort: Renderer entfernen damit Default-Symbolik greift.
    Für Raster: Opacity auf 1, Blending auf SourceOver, Sättigung auf 0."""
    try:
        if isinstance(layer, QgsVectorLayer):
            # Kein echter "Original-Reset" ohne QML-Backup möglich;
            # wir setzen auf eine neutrale Default-Symbolik.
            geom = layer.geometryType()
            if geom == QgsWkbTypes.PolygonGeometry:
                sym = QgsFillSymbol.createSimple({'style': 'solid'})
            elif geom == QgsWkbTypes.LineGeometry:
                sym = QgsLineSymbol.createSimple({})
            else:
                sym = QgsMarkerSymbol.createSimple({})
            layer.setRenderer(QgsSingleSymbolRenderer(sym))
        elif isinstance(layer, QgsRasterLayer):
            layer.setOpacity(1.0)
            try:
                layer.setBlendingMode('SourceOver')
            except Exception:
                pass
            hsf = layer.hueSaturationFilter()
            if hsf is not None:
                hsf.setSaturation(0)
        layer.triggerRepaint()
    except Exception:
        pass


# =============================================================================
# GRUPPIERUNG (reversibel)
# =============================================================================

def _node_path(node):
    """Pfad eines Tree-Nodes als '/'-String, Wurzel ohne Namen."""
    parts = []
    cur = node
    while cur is not None and cur.parent() is not None:
        parts.append(cur.name())
        cur = cur.parent()
    return '/'.join(reversed(parts))


def _ensure_group(name, at_top=True):
    root = _tree()
    grp = root.findGroup(name)
    if grp is None:
        grp = root.insertGroup(0 if at_top else -1, name)
        grp.setExpanded(GROUPS_EXPANDED)
    return grp


def _ensure_path(path):
    """Legt eine Gruppenhierarchie aus '/'-String an — und liefert die
    Ziel-Gruppe zurück. Existierende Zwischenknoten werden wiederverwendet."""
    if not path:
        return _tree()
    parent = _tree()
    for name in path.split('/'):
        if not name:
            continue
        child = None
        for c in parent.children():
            if isinstance(c, QgsLayerTreeGroup) and c.name() == name:
                child = c
                break
        if child is None:
            child = parent.addGroup(name)
            child.setExpanded(False)
        parent = child
    return parent


def _move_layer_to_group(layer, target_group, remember_origin=True):
    node = _find_tree_node(layer)
    if node is None:
        return False
    parent = node.parent()
    if parent is target_group:
        return False
    if remember_origin:
        orig_path = _node_path(parent) if parent is not None else ''
        layer.setCustomProperty(PROP_ORIG_PARENT, orig_path)
    clone = node.clone()
    parent.removeChildNode(node)
    target_group.addChildNode(clone)
    return True


def do_gruppieren():
    _log('=' * 70)
    _log('▶ MODUS: GRUPPIEREN — matched Layer in Ampel-Gruppen verschieben')
    _log('=' * 70)

    hart    = _ensure_group(GRP_HART)
    mittel  = _ensure_group(GRP_MITTEL)
    positiv = _ensure_group(GRP_POSITIV)

    counts = {'HART': 0, 'MITTEL': 0, 'POSITIV': 0, 'NONE': 0}
    for layer in list(QgsProject.instance().mapLayers().values()):
        cat = _match_category(layer)
        if cat == 'HART':
            if _move_layer_to_group(layer, hart):
                counts['HART'] += 1
        elif cat == 'MITTEL':
            if _move_layer_to_group(layer, mittel):
                counts['MITTEL'] += 1
        elif cat == 'POSITIV':
            if _move_layer_to_group(layer, positiv):
                counts['POSITIV'] += 1
        else:
            counts['NONE'] += 1

    _log(f'  🟥 HART    : {counts["HART"]} verschoben')
    _log(f'  🟧 MITTEL  : {counts["MITTEL"]} verschoben')
    _log(f'  🟩 POSITIV : {counts["POSITIV"]} verschoben')
    _log(f'  ⬜ ignoriert: {counts["NONE"]}')
    _log('  ℹ AUFLOESEN stellt Originalpositionen wieder her.')


def do_aufloesen():
    _log('=' * 70)
    _log('▶ MODUS: AUFLOESEN — Layer zurück an Originalposition')
    _log('=' * 70)

    moved = 0
    for layer in list(QgsProject.instance().mapLayers().values()):
        orig = layer.customProperty(PROP_ORIG_PARENT, None)
        if orig is None:
            continue
        target = _ensure_path(orig) if orig else _tree()
        if _move_layer_to_group(layer, target, remember_origin=False):
            moved += 1
        layer.removeCustomProperty(PROP_ORIG_PARENT)

    # leere Ampel-Gruppen entfernen
    for name in (GRP_HART, GRP_MITTEL, GRP_POSITIV):
        grp = _tree().findGroup(name)
        if grp is not None and len(grp.children()) == 0:
            _tree().removeChildNode(grp)

    _log(f'  {moved} Layer zurück verschoben.')


# =============================================================================
# VIEW-MODI
# =============================================================================

def _print_summary(stats, total):
    _log('-' * 70)
    _log(f'  {total} Layer im Projekt:')
    _log(f'    🟥 HART      : {stats["HART"]:>3}')
    _log(f'    🟧 MITTEL    : {stats["MITTEL"]:>3}')
    _log(f'    🟩 POSITIV   : {stats["POSITIV"]:>3}')
    _log(f'    ⬜ kein Match: {stats["NONE"]:>3}')
    _log('=' * 70)


def do_nur_hart():
    _log('=' * 70)
    _log('▶ MODUS: NUR_HART — nur harte Ausschlüsse sichtbar + eingefärbt')
    _log('=' * 70)
    stats = {'HART': 0, 'MITTEL': 0, 'POSITIV': 0, 'NONE': 0}
    hart_layers = []

    for layer in QgsProject.instance().mapLayers().values():
        cat = _match_category(layer)
        stats[cat or 'NONE'] += 1

        if cat == 'HART':
            _set_visible(layer, True)
            if isinstance(layer, QgsVectorLayer):
                _style_vector(layer, C_HART_FILL, C_HART_STROKE, 0.8)
            elif isinstance(layer, QgsRasterLayer):
                _style_raster(layer, 'HART')
            hart_layers.append(layer)
            _log(f'  🟥 {layer.name()}')
        else:
            if HIDE_UNMATCHED or cat in ('MITTEL', 'POSITIV'):
                _set_visible(layer, False)

    if BRING_HART_TO_TOP:
        for layer in reversed(hart_layers):
            _bring_to_top(layer)

    if SET_CANVAS_WHITE:
        iface.mapCanvas().setCanvasColor(QColor('white'))
    iface.mapCanvas().refresh()
    _print_summary(stats, sum(stats.values()))


def do_ampel():
    _log('=' * 70)
    _log('▶ MODUS: AMPEL — HART + MITTEL + POSITIV sichtbar')
    _log('=' * 70)
    stats = {'HART': 0, 'MITTEL': 0, 'POSITIV': 0, 'NONE': 0}
    h, m, p = [], [], []

    for layer in QgsProject.instance().mapLayers().values():
        cat = _match_category(layer)
        stats[cat or 'NONE'] += 1

        if cat == 'HART':
            _set_visible(layer, True)
            if isinstance(layer, QgsVectorLayer):
                _style_vector(layer, C_HART_FILL, C_HART_STROKE, 0.8)
            elif isinstance(layer, QgsRasterLayer):
                _style_raster(layer, 'HART')
            h.append(layer)
        elif cat == 'MITTEL':
            _set_visible(layer, True)
            if isinstance(layer, QgsVectorLayer):
                _style_vector(layer, C_MITTEL_FILL, C_MITTEL_STROKE, 0.5)
            elif isinstance(layer, QgsRasterLayer):
                _style_raster(layer, 'MITTEL')
            m.append(layer)
        elif cat == 'POSITIV':
            _set_visible(layer, True)
            if isinstance(layer, QgsVectorLayer):
                _style_vector(layer, C_POS_FILL, C_POS_STROKE, 1.0)
            elif isinstance(layer, QgsRasterLayer):
                _style_raster(layer, 'POSITIV')
            p.append(layer)
        else:
            if HIDE_UNMATCHED:
                _set_visible(layer, False)

    if BRING_HART_TO_TOP:
        for layer in reversed(p):
            _bring_to_top(layer)
        for layer in reversed(m):
            _bring_to_top(layer)
        for layer in reversed(h):
            _bring_to_top(layer)

    if SET_CANVAS_WHITE:
        iface.mapCanvas().setCanvasColor(QColor('white'))
    iface.mapCanvas().refresh()
    _print_summary(stats, sum(stats.values()))


def do_reset():
    _log('=' * 70)
    _log('▶ MODUS: RESET — alle Layer an, neutrale Symbolik, Canvas grau')
    _log('=' * 70)
    n = 0
    for layer in QgsProject.instance().mapLayers().values():
        _set_visible(layer, True)
        _reset_style(layer)
        n += 1
    iface.mapCanvas().setCanvasColor(QColor(230, 230, 230))
    iface.mapCanvas().refresh()
    _log(f'  {n} Layer zurückgesetzt.')
    _log('  ℹ Für echte Original-Styles Projekt neu laden (Strg+Shift+O).')


# =============================================================================
# DIAGNOSE
# =============================================================================

def do_diagnose():
    _log('=' * 70)
    _log('▶ DIAGNOSE — was matcht, was nicht')
    _log('=' * 70)

    project = QgsProject.instance()
    layers = list(project.mapLayers().values())
    _log(f'Gesamtzahl Layer im Projekt: {len(layers)}')

    buckets = {'HART': [], 'MITTEL': [], 'POSITIV': [], 'NONE': []}
    for l in layers:
        cat = _match_category(l)
        buckets[cat or 'NONE'].append(l.name())

    _log(f'\nMatching-Ergebnis:')
    _log(f'  🟥 HART    : {len(buckets["HART"])}')
    _log(f'  🟧 MITTEL  : {len(buckets["MITTEL"])}')
    _log(f'  🟩 POSITIV : {len(buckets["POSITIV"])}')
    _log(f'  ⬜ ohne Match: {len(buckets["NONE"])}')

    # Ampel-Gruppen-Status
    _log(f'\nAmpel-Gruppen:')
    for gn in (GRP_HART, GRP_MITTEL, GRP_POSITIV):
        g = _tree().findGroup(gn)
        cnt = 0
        if g is not None:
            cnt = sum(1 for c in g.children() if isinstance(c, QgsLayerTreeLayer))
        _log(f'  {gn}: {"existiert" if g else "fehlt":10}  befüllt={cnt}')

    # Beispiele zeigen
    for cat in ('HART', 'MITTEL', 'POSITIV'):
        if buckets[cat]:
            _log(f'\n  Beispiele {cat} (max. 5):')
            for n in buckets[cat][:5]:
                _log(f'    • {n}')

    if not buckets['HART']:
        _log('\n⚠ KEINE HART-Treffer — meist weil die Schutzgebiet-Layer')
        _log('  nicht geladen sind (NSG/FFH/VSG/WSG/HQ100/UNESCO/Hohlraum/VRG).')
        _log('  → LUIS-Loader + RAPIS-Loader laufen lassen, dann erneut diagnostizieren.')
        _log('\n  Erste 20 Layer-Namen im Projekt (Referenz):')
        for n in [l.name() for l in layers[:20]]:
            _log(f'    {n!r}')

    _log('=' * 70)


# =============================================================================
# ENTRY POINT
# =============================================================================

_DISPATCH = {
    'DIAGNOSE':   do_diagnose,
    'NUR_HART':   do_nur_hart,
    'AMPEL':      do_ampel,
    'RESET':      do_reset,
    'GRUPPIEREN': do_gruppieren,
    'AUFLOESEN':  do_aufloesen,
}

_fn = _DISPATCH.get(MODUS.upper())
if _fn is None:
    print(f'⚠ Unbekannter MODUS: {MODUS!r}')
    print(f'  Erlaubt: {", ".join(_DISPATCH.keys())}')
else:
    _fn()
