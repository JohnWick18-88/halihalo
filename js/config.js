/* ============================================
   God's Eye Sachsen — Configuration
   LUIS/RAPIS Endpoints, EPSG, App Settings
   ============================================ */

const CONFIG = {
    // ---- Map Defaults ----
    map: {
        center: [51.05, 13.35],  // Sachsen Zentrum (ca. Dresden)
        zoom: 8,
        minZoom: 6,
        maxZoom: 19,
        maxBounds: [[50.0, 11.5], [52.0, 15.5]]  // Sachsen Bounding Box
    },

    // ---- Coordinate Systems ----
    epsg25833: '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',

    // ---- LUIS Sachsen FeatureServer ----
    luis: {
        base: 'https://luis.sachsen.de/arcgis/rest/services',
        // FeatureServer Endpoints (echte Vektordaten — für Verschneidungen)
        featureServer: {
            // Basis & Verwaltung
            flurstuecke:        '/Arbeitslayer/flurstueck_sachsen/FeatureServer/0',
            flurstueckNummern:  '/Arbeitslayer/flurstueck_sachsen/FeatureServer/1',
            gemarkungen:        '/Arbeitslayer/flurstueck_sachsen/FeatureServer/2',
            gemeindegrenzen:    '/contentSABE/verwaltungsgrenzen/FeatureServer/0',
            kreisgrenzen:       '/contentSABE/verwaltungsgrenzen/FeatureServer/1',
            landesgrenze:       '/contentSABE/verwaltungsgrenzen/FeatureServer/2',

            // Naturschutz — PFLICHT
            nsg:                '/natur/gesetz_gesch_biotope/FeatureServer/0',
            lsg:                '/natur/gesetz_gesch_biotope/FeatureServer/1',
            ffh:                '/natur/natura2000/FeatureServer/0',
            spa:                '/natur/natura2000/FeatureServer/1',
            biosphaerenreservat:'/natur/gesetz_gesch_biotope/FeatureServer/2',
            nationalpark:       '/natur/gesetz_gesch_biotope/FeatureServer/3',
            geschBiotope:       '/natur/gesetz_gesch_biotope/FeatureServer/4',

            // PV-Screening
            pvfvo:              '/ee_solar/pv_freiflaeche/FeatureServer/0',

            // Wasser
            twsg:               '/wasser/trinkwasserschutzgebiete/FeatureServer/0',

            // Energie (WEA)
            weaBetrieb:         '/ee_wind/wea_sachsen/FeatureServer/0',
            weaGenehmigung:     '/ee_wind/wea_sachsen/FeatureServer/1',
            weaVorInbetrieb:    '/ee_wind/wea_sachsen/FeatureServer/2',

            // Boden
            bodenschaetzung:    '/boden/bodenschaetzung/FeatureServer/0',
            bodenfunktionen:    '/boden/bodenfunktionen/FeatureServer/0',

            // Auen/Moore
            auenMoore:          '/natur/auen_moore/FeatureServer/0',

            // IED / Industrie
            ied:                '/umwelt/ied_anlagen/FeatureServer/0',
            biogas:             '/ee_biogas/biogasanlagen/FeatureServer/0'
        },

        // MapServer Endpoints (Rasterbilder — nur Visualisierung)
        mapServer: {
            eegKorridor:        '/ee_solar/eeg_korridor/MapServer',
            hochwasser:         '/wasser/hochwasser/MapServer',
            laerm:              '/umwelt/laermkartierung/MapServer',
            bodenversiegelung:  '/boden/bodenversiegelung/MapServer',
            altlasten:          '/umwelt/salka/MapServer'
        }
    },

    // ---- RAPIS Sachsen MapServer ----
    rapis: {
        base: 'https://rfrp.rapis-ipm-gis.de/rapis',
        wms: {
            verwaltungsgrenzen: '/wms/RO_Verwaltungsgrenzen',
            bauleitplanung:     '/wms/RO_Bauleitplanung',
            regionalplan_ces:   '/wms/RP_CES',
            regionalplan_ddn:   '/wms/RP_DDN',
            regionalplan_lei:   '/wms/RP_LEI',
            regionalplan_swn:   '/wms/RP_SWN',
            flaechennutzung:    '/wms/RO_Flaechennutzungsplan',
            raumordnung:        '/wms/RO_Raumordnung',
            crossdata:          '/wms/CROSSDATA'
        },
        featureServer: {
            verwaltungsgrenzen: '/wfs/RO_Verwaltungsgrenzen'
        }
    },

    // ---- Query Settings ----
    query: {
        maxFeatures: 2000,          // Max Features pro Viewport-Abfrage
        flurstueckMinZoom: 14,      // Flurstücke erst ab Zoom 14 laden
        gemarkungMinZoom: 11,       // Gemarkungen ab Zoom 11
        gemeindeMinZoom: 8,         // Gemeinden ab Zoom 8
        debounceMs: 300,            // Viewport-Change Debounce
        bufferMeters: 100           // Standard-Buffer für Verschneidungen
    },

    // ---- Viewport Culling Thresholds ----
    viewport: {
        // Maximale Fläche (km²) ab der Flurstücke nicht mehr geladen werden
        maxAreaFlurstuecke: 50,     // ~7km x 7km
        maxAreaGemarkungen: 500,    // ~22km x 22km
        maxAreaGemeinden: 10000     // ganz Sachsen
    },

    // ---- Style Defaults ----
    styles: {
        gemeinde: {
            color: '#06b6d4',
            weight: 2,
            opacity: 0.7,
            fillOpacity: 0.03,
            fillColor: '#06b6d4'
        },
        gemarkung: {
            color: '#3b82f6',
            weight: 1.5,
            opacity: 0.5,
            fillOpacity: 0.02,
            fillColor: '#3b82f6'
        },
        flurstueck: {
            color: '#94a3b8',
            weight: 0.8,
            opacity: 0.6,
            fillOpacity: 0.01,
            fillColor: '#94a3b8'
        },
        nsg: {
            color: '#10b981',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.15,
            fillColor: '#10b981'
        },
        lsg: {
            color: '#34d399',
            weight: 1.5,
            opacity: 0.6,
            fillOpacity: 0.1,
            fillColor: '#34d399'
        },
        ffh: {
            color: '#f59e0b',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.12,
            fillColor: '#f59e0b'
        },
        spa: {
            color: '#ef4444',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1,
            fillColor: '#ef4444'
        },
        pvfvo: {
            color: '#8b5cf6',
            weight: 1.5,
            opacity: 0.7,
            fillOpacity: 0.12,
            fillColor: '#8b5cf6'
        },
        wea: {
            color: '#f97316',
            weight: 2,
            opacity: 0.9,
            fillOpacity: 0.2,
            fillColor: '#f97316'
        },
        selection: {
            color: '#06b6d4',
            weight: 3,
            opacity: 1,
            fillOpacity: 0.15,
            fillColor: '#06b6d4'
        },
        drawCircle: {
            color: '#06b6d4',
            weight: 2,
            opacity: 0.8,
            fillOpacity: 0.1,
            fillColor: '#06b6d4',
            dashArray: '6, 4'
        }
    },

    // ---- Gemeinde Status Colors ----
    statusColors: {
        gruen:  '#10b981',  // positiv / kooperativ
        gelb:   '#f59e0b',  // neutral / unentschieden
        rot:    '#ef4444',  // ablehnend / Widerstand
        offen:  '#64748b'   // noch kein Kontakt
    }
};
