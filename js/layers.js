/* ============================================
   God's Eye Sachsen — Layer Definitions
   Hierarchische Layer-Verwaltung (70+ Layer)
   Gruppiert nach Priorität & Thema
   ============================================ */

const LAYER_GROUPS = [
    // ================================================================
    // PFLICHT-LAYER (Immer verfügbar, essentiell für Akquise)
    // ================================================================
    {
        id: 'basis',
        name: 'Basis & Verwaltung',
        priority: 'pflicht',
        expanded: true,
        layers: [
            { id: 'gemeindegrenzen', name: 'Gemeindegrenzen', type: 'fs', source: 'luis', endpoint: 'gemeindegrenzen', style: 'gemeinde', minZoom: 6, active: true },
            { id: 'gemarkungen', name: 'Gemarkungen', type: 'fs', source: 'luis', endpoint: 'gemarkungen', style: 'gemarkung', minZoom: 11, active: false },
            { id: 'flurstuecke', name: 'Flurstücke', type: 'fs', source: 'luis', endpoint: 'flurstuecke', style: 'flurstueck', minZoom: 14, active: false },
            { id: 'flurstueckNummern', name: 'Flurstücknummern', type: 'fs', source: 'luis', endpoint: 'flurstueckNummern', style: 'flurstueck', minZoom: 16, active: false },
            { id: 'kreisgrenzen', name: 'Kreisgrenzen', type: 'fs', source: 'luis', endpoint: 'kreisgrenzen', style: 'gemeinde', minZoom: 6, active: false },
            { id: 'landesgrenze', name: 'Landesgrenze Sachsen', type: 'fs', source: 'luis', endpoint: 'landesgrenze', style: 'gemeinde', minZoom: 6, active: true }
        ]
    },
    {
        id: 'naturschutz_hart',
        name: 'Naturschutz — Harte Restriktionen',
        priority: 'pflicht',
        expanded: false,
        layers: [
            { id: 'nsg', name: 'Naturschutzgebiete (NSG)', type: 'fs', source: 'luis', endpoint: 'nsg', style: 'nsg', minZoom: 8, active: false, verschneidung: true },
            { id: 'lsg', name: 'Landschaftsschutzgebiete (LSG)', type: 'fs', source: 'luis', endpoint: 'lsg', style: 'lsg', minZoom: 8, active: false, verschneidung: true },
            { id: 'ffh', name: 'FFH-Gebiete (Natura 2000)', type: 'fs', source: 'luis', endpoint: 'ffh', style: 'ffh', minZoom: 8, active: false, verschneidung: true },
            { id: 'spa', name: 'Vogelschutzgebiete (SPA)', type: 'fs', source: 'luis', endpoint: 'spa', style: 'spa', minZoom: 8, active: false, verschneidung: true },
            { id: 'biosphaerenreservat', name: 'Biosphärenreservate', type: 'fs', source: 'luis', endpoint: 'biosphaerenreservat', style: 'nsg', minZoom: 8, active: false, verschneidung: true },
            { id: 'nationalpark', name: 'Nationalparke', type: 'fs', source: 'luis', endpoint: 'nationalpark', style: 'nsg', minZoom: 8, active: false, verschneidung: true },
            { id: 'geschBiotope', name: 'Geschützte Biotope', type: 'fs', source: 'luis', endpoint: 'geschBiotope', style: 'nsg', minZoom: 10, active: false, verschneidung: true }
        ]
    },
    {
        id: 'energie',
        name: 'Energie & Infrastruktur',
        priority: 'pflicht',
        expanded: false,
        layers: [
            { id: 'weaBetrieb', name: 'WEA in Betrieb', type: 'fs', source: 'luis', endpoint: 'weaBetrieb', style: 'wea', minZoom: 8, active: false, icon: 'wind' },
            { id: 'weaGenehmigung', name: 'WEA im Genehmigungsverfahren', type: 'fs', source: 'luis', endpoint: 'weaGenehmigung', style: 'wea', minZoom: 8, active: false, icon: 'wind' },
            { id: 'weaVorInbetrieb', name: 'WEA vor Inbetriebnahme', type: 'fs', source: 'luis', endpoint: 'weaVorInbetrieb', style: 'wea', minZoom: 8, active: false, icon: 'wind' },
            { id: 'pvfvo', name: 'PV-Freiflächenkulisse (PVFVO)', type: 'fs', source: 'luis', endpoint: 'pvfvo', style: 'pvfvo', minZoom: 10, active: false, verschneidung: true },
            { id: 'eegKorridor', name: 'EEG-Korridor (BAB + Bahn)', type: 'ms', source: 'luis', endpoint: 'eegKorridor', minZoom: 10, active: false }
        ]
    },
    {
        id: 'wasser',
        name: 'Wasser & Hochwasser',
        priority: 'pflicht',
        expanded: false,
        layers: [
            { id: 'twsg', name: 'Trinkwasserschutzgebiete', type: 'fs', source: 'luis', endpoint: 'twsg', style: 'nsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'hochwasser', name: 'Hochwassergefährdung (HQ100)', type: 'ms', source: 'luis', endpoint: 'hochwasser', minZoom: 10, active: false }
        ]
    },

    // ================================================================
    // HOCH-PRIORITÄT (Bauleitplanung, Regionalplanung)
    // ================================================================
    {
        id: 'bauleitplanung',
        name: 'Bauleitplanung',
        priority: 'hoch',
        expanded: false,
        layers: [
            { id: 'bplan_rapis', name: 'Bebauungspläne (RAPIS)', type: 'wms', source: 'rapis', endpoint: 'bauleitplanung', wmsLayers: 'Bebauungsplan', minZoom: 10, active: false },
            { id: 'fnp_rapis', name: 'Flächennutzungspläne (RAPIS)', type: 'wms', source: 'rapis', endpoint: 'flaechennutzung', wmsLayers: 'FNP', minZoom: 10, active: false }
        ]
    },
    {
        id: 'regionalplanung',
        name: 'Regionalplanung',
        priority: 'hoch',
        expanded: false,
        layers: [
            { id: 'rp_ces', name: 'RP Chemnitz-Erzgebirge-SW', type: 'wms', source: 'rapis', endpoint: 'regionalplan_ces', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'rp_ddn', name: 'RP Dresden-Oberlausitz', type: 'wms', source: 'rapis', endpoint: 'regionalplan_ddn', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'rp_lei', name: 'RP Leipzig-Westsachsen', type: 'wms', source: 'rapis', endpoint: 'regionalplan_lei', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'rp_swn', name: 'RP Süd-Westsachsen', type: 'wms', source: 'rapis', endpoint: 'regionalplan_swn', wmsLayers: '0', minZoom: 8, active: false }
        ]
    },
    {
        id: 'boden',
        name: 'Boden & Altlasten',
        priority: 'hoch',
        expanded: false,
        layers: [
            { id: 'bodenschaetzung', name: 'Bodenschätzung', type: 'fs', source: 'luis', endpoint: 'bodenschaetzung', style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bodenfunktionen', name: 'Bodenfunktionen', type: 'fs', source: 'luis', endpoint: 'bodenfunktionen', style: 'gemarkung', minZoom: 12, active: false },
            { id: 'altlasten', name: 'Altlasten (SALKA)', type: 'ms', source: 'luis', endpoint: 'altlasten', minZoom: 10, active: false },
            { id: 'bodenversiegelung', name: 'Bodenversiegelung', type: 'ms', source: 'luis', endpoint: 'bodenversiegelung', minZoom: 10, active: false }
        ]
    },

    // ================================================================
    // MITTEL-PRIORITÄT (Kontext & Detailanalyse)
    // ================================================================
    {
        id: 'natur_weich',
        name: 'Naturschutz — Weiche Restriktionen',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'auenMoore', name: 'Auen & Moore', type: 'fs', source: 'luis', endpoint: 'auenMoore', style: 'lsg', minZoom: 10, active: false, verschneidung: true }
        ]
    },
    {
        id: 'industrie',
        name: 'Industrie & Emissionen',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'ied', name: 'IED-Anlagen', type: 'fs', source: 'luis', endpoint: 'ied', style: 'wea', minZoom: 8, active: false },
            { id: 'biogas', name: 'Biogasanlagen', type: 'fs', source: 'luis', endpoint: 'biogas', style: 'wea', minZoom: 10, active: false },
            { id: 'laerm', name: 'Lärmkartierung', type: 'ms', source: 'luis', endpoint: 'laerm', minZoom: 10, active: false }
        ]
    },
    {
        id: 'raumordnung',
        name: 'Raumordnung & Verwaltung (RAPIS)',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'raumordnung', name: 'Raumordnung', type: 'wms', source: 'rapis', endpoint: 'raumordnung', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'verwaltung_rapis', name: 'Verwaltungsgrenzen (RAPIS)', type: 'wms', source: 'rapis', endpoint: 'verwaltungsgrenzen', wmsLayers: '0', minZoom: 6, active: false },
            { id: 'crossdata', name: 'CROSSDATA (Grenzübergreifend)', type: 'wms', source: 'rapis', endpoint: 'crossdata', wmsLayers: '0', minZoom: 8, active: false }
        ]
    },

    // ================================================================
    // NETZAUSBAU & BERICHTE (Erweiterbar — Platzhalter für Reports)
    // ================================================================
    {
        id: 'netzausbau',
        name: 'Netzausbau & Berichte',
        priority: 'optional',
        expanded: false,
        layers: [
            // Platzhalter — wird dynamisch befüllt aus reports.js
            // Beispiel-Struktur für Umspannwerk-Import:
            // { id: 'usw_nep2037', name: 'Umspannwerke NEP 2037', type: 'local', source: 'report',
            //   dataFile: 'data/netzausbau/usw_nep2037.geojson', style: 'wea', minZoom: 8,
            //   icon: 'substation', meta: { quelle: 'NEP 2037', stand: '2025-Q4' } }
        ]
    }
];

// ---- Layer Registry (flache Map für schnellen Zugriff) ----
const LAYER_REGISTRY = {};
const ACTIVE_LAYERS = {};  // layerId → Leaflet Layer Instance

/**
 * Initialisiert die Layer-Registry aus LAYER_GROUPS
 */
function initLayerRegistry() {
    LAYER_GROUPS.forEach(group => {
        group.layers.forEach(layer => {
            LAYER_REGISTRY[layer.id] = {
                ...layer,
                groupId: group.id,
                groupName: group.name,
                priority: group.priority,
                leafletLayer: null,
                loaded: false,
                loading: false,
                featureCount: 0
            };
        });
    });
}

/**
 * Gibt alle Layer zurück, die für Verschneidungen geeignet sind (FeatureServer)
 */
function getVerschneidungsLayer() {
    return Object.values(LAYER_REGISTRY).filter(l => l.verschneidung === true);
}

/**
 * Gibt alle aktiven Layer zurück
 */
function getActiveLayers() {
    return Object.values(LAYER_REGISTRY).filter(l => l.active);
}

/**
 * Registriert einen dynamischen Layer (z.B. aus Netzausbau-Reports)
 */
function registerDynamicLayer(groupId, layerDef) {
    const group = LAYER_GROUPS.find(g => g.id === groupId);
    if (!group) return false;

    group.layers.push(layerDef);
    LAYER_REGISTRY[layerDef.id] = {
        ...layerDef,
        groupId: group.id,
        groupName: group.name,
        priority: group.priority,
        leafletLayer: null,
        loaded: false,
        loading: false,
        featureCount: 0
    };
    return true;
}

// Init on load
initLayerRegistry();
