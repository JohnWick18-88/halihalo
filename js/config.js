/* ============================================
   God's Eye Sachsen — Configuration
   LUIS/RAPIS Endpoints, EPSG, App Settings
   ============================================ */

const CONFIG = {
    // ---- Proxy-Modus ----
    // false = direkte Verbindung (Büro/VPN, CORS muss am Server erlaubt sein)
    // true  = über lokalen Proxy "node server.js" auf http://localhost:8080
    //
    // Wenn Layer nicht laden: Browser-Konsole öffnen (F12).
    // "CORS"-Fehler → proxy.enabled auf true setzen und server.js starten.
    // "403 Forbidden"  → VPN / Firmennetzwerk prüfen.
    // "ERR_NAME_NOT_RESOLVED" → Server nicht erreichbar (kein Internet / VPN).
    proxy: {
        enabled: false,
        luisBase:  '/api/luis',    // Proxy-Pfad wenn enabled: true
        rapisBase: '/api/rapis'    // Proxy-Pfad wenn enabled: true
    },

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
            // ---- G01: Basis & Verwaltung (basis/grenzen + basis/flurstuecke) ----
            flurstuecke:        '/basis/flurstuecke/FeatureServer/0',
            flurstueckNummern:  '/basis/flurstuecke/FeatureServer/1',
            gemarkungen:        '/basis/flurstuecke/FeatureServer/2',
            gemeindegrenzen:    '/basis/grenzen/FeatureServer/2',   // Layer 2: Gemeinden
            kreisgrenzen:       '/basis/grenzen/FeatureServer/1',   // Layer 1: Kreisgrenzen
            landesgrenze:       '/basis/grenzen/FeatureServer/0',   // Layer 0: Landesgrenze

            // ---- G02: PV-Kulisse ----
            pvfvo:              '/energie/photovoltaikfreiflaechen/FeatureServer/0',

            // ---- G03: Harte Schutzkonflikte Natur (natur/schutzgebiete) ----
            nsg:                '/natur/schutzgebiete/FeatureServer/0',
            lsg:                '/natur/schutzgebiete/FeatureServer/1',
            biosphaerenreservat:'/natur/schutzgebiete/FeatureServer/2',
            nationalpark:       '/natur/schutzgebiete/FeatureServer/3',
            geschBiotope:       '/natur/gesetz_gesch_biotope/FeatureServer/0',
            naturpark:          '/natur/schutzgebiete/FeatureServer/4',
            fnd:                '/natur/schutzgebiete/FeatureServer/5',

            // ---- G04: Natura 2000 & Artenschutz ----
            ffh:                '/natur/natura2000/FeatureServer/0',
            spa:                '/natur/natura2000/FeatureServer/1',
            ffhFledermaus:      '/natur/natura2000/FeatureServer/2',

            // ---- G05: Biotope & Habitate (ISSAND / BTLNK) ----
            btpvzFlaechen:         '/natur/gesetz_gesch_biotope/FeatureServer/0',
            btpvzLinien:           '/natur/gesetz_gesch_biotope/FeatureServer/1',
            btpvzPunkte:           '/natur/gesetz_gesch_biotope/FeatureServer/2',
            issandBiotopePunkte:   '/natur/issand_biotope/FeatureServer/0',
            issandBiotopeLinien:   '/natur/issand_biotope/FeatureServer/1',
            issandBiotopeFlaechen: '/natur/issand_biotope/FeatureServer/2',
            issandHabitatePunkte:  '/natur/issand_habitate/FeatureServer/0',
            issandHabitateLinien:  '/natur/issand_habitate/FeatureServer/1',
            issandHabitateFlaechen:'/natur/issand_habitate/FeatureServer/2',
            issandLrtPunkte:       '/natur/issand_lebensraumtypen/FeatureServer/0',
            issandLrtLinien:       '/natur/issand_lebensraumtypen/FeatureServer/1',
            issandLrtFlaechen:     '/natur/issand_lebensraumtypen/FeatureServer/2',
            btlnkFlaechen:         '/natur/btlnk/FeatureServer/0',
            btlnkLinien:           '/natur/btlnk/FeatureServer/1',
            btlnkPunkte:           '/natur/btlnk/FeatureServer/2',
            biotopeOffenlandFlaechen: '/natur/biotope_offenland_1994_2008/FeatureServer/0',

            // ---- G07: Wasserschutz ----
            twsg:               '/wasser/trinkwasserschutzgebiete/FeatureServer/0',
            twsgFliessgewaesser:'/wasser/trinkwasserschutzgebiete/FeatureServer/1',
            twsgTalsperren:     '/wasser/trinkwasserschutzgebiete/FeatureServer/2',
            heilquellen:        '/wasser/trinkwasserschutzgebiete/FeatureServer/3',

            // ---- G08: Auen, Moore & Feuchtgebiete ----
            auenMoore:          '/natur/auen_moore/FeatureServer/0',
            mooreGloez:         '/natur/auen_moore/FeatureServer/1',
            mooreErfassung:     '/natur/auen_moore/FeatureServer/2',
            torfmaechtigk:      '/boden/bodenkarte/FeatureServer/1',

            // ---- G09: Bodenqualität & Landwirtschaft ----
            bodenschaetzung:    '/boden/bodenschaetzung/FeatureServer/0',
            bk50:               '/boden/bodenkarte/FeatureServer/0',
            bodenfunktionen:    '/boden/bodenfunktionen/FeatureServer/0',
            bodenfruchtbarkeit: '/boden/bodenfunktionen/FeatureServer/1',
            agrarstruktur:      '/landwirtschaft/agrarstruktur/FeatureServer/0',
            nitrat:             '/landwirtschaft/nitrat/FeatureServer/0',
            trockengebiete:     '/landwirtschaft/nitrat/FeatureServer/1',

            // ---- G10: Bodenfunktionen & Erosion ----
            bodenkennwerte:     '/boden/bodenkennwerte/FeatureServer/0',
            bodenempfindl:      '/boden/bodenempfindlichkeit/FeatureServer/0',
            verdichtungsempf:   '/boden/verdichtungsempfindlichkeit/FeatureServer/0',

            // ---- G16: Energieinfrastruktur ----
            weaBetrieb:         '/energie/wea_wald_kategorien/FeatureServer/0',
            weaGenehmigung:     '/energie/wea_wald_kategorien/FeatureServer/1',
            weaVorInbetrieb:    '/energie/wea_wald_kategorien/FeatureServer/2',
            pvAnlagen:          '/energie/photovoltaikfreiflaechen/FeatureServer/1',

            // ---- G18: Industrie & Emissionen ----
            ied:                '/laerm/ied_anlagen/FeatureServer/0',
            biogas:             '/energie/biogas/FeatureServer/0',
            anlagenbestand:     '/laerm/anlagenbestand/FeatureServer/0',
            tierhaltung:        '/landwirtschaft/tierhaltung/FeatureServer/0',
            stoerfall:          '/laerm/stoerfall/FeatureServer/0'
        },

        // MapServer Endpoints (Rasterbilder — nur Visualisierung, kein Verschneiden)
        mapServer: {
            eegKorridor:        '/ee_solar/eeg_korridor/MapServer',
            hochwasserHQ100:    '/wasser/hochwasser/MapServer',           // Layer 0 = HQ100
            hochwasserHQ20:     '/wasser/hochwasser/MapServer',           // Layer 1 = HQ20/25
            hochwasserHQ50:     '/wasser/hochwasser/MapServer',           // Layer 2 = HQ50
            hochwasserHQ200:    '/wasser/hochwasser/MapServer',           // Layer 3 = HQ200/300
            hochwasserExtrem:   '/wasser/hochwasser/MapServer',           // Layer 4 = HQextrem
            laerm:              '/umwelt/laermkartierung/MapServer',
            bodenversiegelung:  '/boden/bodenversiegelung/MapServer',
            altlasten:          '/umwelt/salka/MapServer',
            erosion:            '/boden/erosion/MapServer',
            hochspannung:       '/ee_strom/hochspannungsnetz/MapServer'   // Sachsen Hochspannungsnetz
        }
    },

    // ---- RAPIS Sachsen WMS ----
    // Basis: https://rfrp.rapis-ipm-gis.de/rapis
    // WICHTIG: RAPIS-Endpunkte müssen ggf. gegen die RAPIS-Capabilities verifiziert werden.
    // WMS Capabilities: https://rfrp.rapis-ipm-gis.de/rapis/wms/[DIENST]?SERVICE=WMS&REQUEST=GetCapabilities
    rapis: {
        base: 'https://rfrp.rapis-ipm-gis.de/rapis',
        wms: {
            // ---- G11: Regionalplanung ----
            verwaltungsgrenzen: '/wms/RO_Verwaltungsgrenzen',
            bauleitplanung:     '/wms/RO_Bauleitplanung',
            regionalplan_ces:   '/wms/RP_CES',    // Chemnitz-Erzgebirge-SW
            regionalplan_ddn:   '/wms/RP_DDN',    // Dresden-Oberlausitz
            regionalplan_lei:   '/wms/RP_LEI',    // Leipzig-Westsachsen
            regionalplan_swn:   '/wms/RP_SWN',    // Süd-Westsachsen
            flaechennutzung:    '/wms/RO_Flaechennutzungsplan',
            raumordnung:        '/wms/RO_Raumordnung',
            crossdata:          '/wms/CROSSDATA',

            // ---- G12: Bauleitplanung (RAPIS) ----
            bplan_kraft:        '/wms/RO_Bauleitplanung',
            fnp_wirksam:        '/wms/RO_Flaechennutzungsplan',

            // ---- G13: Bergbau & Untergrund (NUR RAPIS) ----
            bergbau:            '/wms/G13_Bergbau',
            // Sub-Layer via wmsLayers-Parameter: Bergbauberechtigungen, Baubeschraenkung,
            // Hohlraumkarte, Gruben, Braunkohlenplaene

            // ---- G14: Archäologie & Denkmal (NUR RAPIS) ----
            archaeologie:       '/wms/G14_Archaeologie',
            // Sub-Layer: Archaeolog. Relevanzbereiche [!], Denkmalschutzgebiet,
            // UNESCO Weltkulturerbe [Ausschluss!], Kulturdenkmal

            // ---- G15: Altlasten & Deponien (NUR RAPIS, ergänzt LUIS-SALKA) ----
            altlasten_rapis:    '/wms/G15_Altlasten',
            // Sub-Layer: SALKA [35.000 Einträge!], Deponien

            // ---- G16: Energieinfrastruktur (NUR RAPIS) ----
            energie_rapis:      '/wms/G16_Energie',
            // Sub-Layer: Mittel-/Hochspannungsleitungen, Umspannwerke >=110kV,
            // PV-Anlagen >100kW, Kraftwerke >10MW, Gashochdruckleitung,
            // Energievorhaben Planung Punkt/Fläche

            // ---- G17: Verkehr & Richtfunk (NUR RAPIS) ----
            verkehr_rapis:      '/wms/G17_Verkehr',
            // Sub-Layer: Richtfunkstrecken [⚠ kritisch!], Richtfunk Sende-/Empfangsanlagen,
            // Luftverkehr Baubeschraenkung, Schienennetz, Strassennetz

            // ---- G18: Industrie & Kontext (RAPIS) ----
            industrie_rapis:    '/wms/G18_Industrie',
            // Sub-Layer: IED-Anlagen EU, Störfall-VO Betriebsbereiche,
            // Brachen [NUR RAPIS], GE/GI Industrieflächen, Öffentliche Auslagen

            // ---- Naturschutz-Ergänzungen (NUR RAPIS) ----
            nsg_planung:        '/wms/RO_Naturschutz',   // NSG/LSG Planung (künftig)
            glb:                '/wms/RO_Naturschutz',   // GLB §19 SächsNatSchG
            twsz_rapis:         '/wms/RO_Wasser',        // TWSZ Planung (NUR RAPIS)
            hw_rapis:           '/wms/RO_Hochwasser',    // Überschwemmungsgebiete §78 WHG

            // ---- Hintergrundkarten ----
            basemap_grau:       '/wms/DTK250'            // DTK250 Grau (RAPIS-Hintergrund)
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
