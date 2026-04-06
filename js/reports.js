/* ============================================
   God's Eye Sachsen — Reports & Netzausbau Module
   Import von Netzausbauplan-Daten, Monetär-Berichten,
   Umspannwerk-Koordinaten als dynamische Layer
   ============================================ */

const Reports = {
    _registeredReports: [],  // Liste aller importierten Report-Layer

    /**
     * Initialisiert das Report-Modul
     * Lädt vorhandene Report-GeoJSON-Dateien aus data/reports/
     */
    async init() {
        // Versuche bekannte Report-Dateien zu laden
        const knownReports = [
            'data/reports/umspannwerke_nep.geojson',
            'data/reports/netzausbau_trassen.geojson',
            'data/reports/pv_projekte.geojson',
            'data/reports/wind_projekte.geojson'
        ];

        for (const path of knownReports) {
            await this.loadReportFile(path);
        }
    },

    /**
     * Lädt eine Report-GeoJSON-Datei und registriert sie als Layer
     * @param {string} filePath - Pfad zur GeoJSON-Datei
     * @returns {boolean} Erfolg
     */
    async loadReportFile(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) return false;

            const geojson = await response.json();
            if (!geojson.features || geojson.features.length === 0) return false;

            // Layer-Metadaten aus GeoJSON-Properties extrahieren
            const meta = geojson.properties || {};
            const layerId = meta.layerId || `report_${Date.now()}`;
            const layerName = meta.name || filePath.split('/').pop().replace('.geojson', '');

            // Als dynamischen Layer registrieren
            const layerDef = {
                id: layerId,
                name: layerName,
                type: 'local',
                source: 'report',
                dataFile: filePath,
                style: meta.style || 'wea',
                minZoom: meta.minZoom || 8,
                active: false,
                icon: meta.icon || null,
                meta: {
                    quelle: meta.quelle || 'Bericht',
                    stand: meta.stand || 'unbekannt',
                    beschreibung: meta.beschreibung || '',
                    importDate: new Date().toISOString()
                }
            };

            registerDynamicLayer('netzausbau', layerDef);
            this._registeredReports.push(layerDef);

            console.log(`[Reports] Layer registriert: ${layerName} (${geojson.features.length} Features)`);
            return true;

        } catch (err) {
            // Datei existiert nicht oder ist ungültig — still ignorieren
            return false;
        }
    },

    /**
     * Importiert Netzausbau-Daten aus einem JSON-Objekt
     * Wird verwendet wenn Daten aus Berichten extrahiert werden
     *
     * Erwartetes Format:
     * {
     *   name: "Umspannwerke NEP 2037",
     *   quelle: "Netzentwicklungsplan 2037",
     *   stand: "2025-Q4",
     *   icon: "substation",
     *   features: [
     *     {
     *       name: "UW Freiberg-Nord",
     *       lat: 50.95,
     *       lng: 13.35,
     *       typ: "Neubau 110/20kV",
     *       inbetriebnahme: "2028",
     *       betreiber: "MITNETZ STROM",
     *       kapazitaet_mva: 80,
     *       status: "geplant"
     *     },
     *     ...
     *   ]
     * }
     */
    importFromReport(reportData) {
        if (!reportData || !reportData.features) return null;

        // In GeoJSON konvertieren
        const geojson = {
            type: 'FeatureCollection',
            properties: {
                layerId: `report_${reportData.name?.replace(/\s+/g, '_').toLowerCase() || Date.now()}`,
                name: reportData.name || 'Import',
                quelle: reportData.quelle || '',
                stand: reportData.stand || '',
                icon: reportData.icon || 'circle',
                style: reportData.style || 'wea'
            },
            features: reportData.features.map((item, idx) => ({
                type: 'Feature',
                properties: {
                    name: item.name || `Punkt ${idx + 1}`,
                    typ: item.typ || '',
                    inbetriebnahme: item.inbetriebnahme || '',
                    betreiber: item.betreiber || '',
                    kapazitaet_mva: item.kapazitaet_mva || null,
                    status: item.status || 'unbekannt',
                    _source: reportData.name,
                    _stand: reportData.stand,
                    ...item  // Alle zusätzlichen Properties übernehmen
                },
                geometry: item.geometry || {
                    type: 'Point',
                    coordinates: [item.lng || item.lon || 0, item.lat || 0]
                }
            }))
        };

        // Layer registrieren
        const layerDef = {
            id: geojson.properties.layerId,
            name: geojson.properties.name,
            type: 'local',
            source: 'report',
            style: geojson.properties.style,
            minZoom: 8,
            active: true,
            icon: geojson.properties.icon,
            meta: {
                quelle: geojson.properties.quelle,
                stand: geojson.properties.stand,
                importDate: new Date().toISOString(),
                featureCount: geojson.features.length
            }
        };

        registerDynamicLayer('netzausbau', layerDef);
        this._registeredReports.push(layerDef);

        // Direkt auf die Karte rendern
        GodsEyeMap._renderFeatureLayer(layerDef.id, geojson, layerDef);

        // Layer-Tree aktualisieren
        Sidebar.renderLayerTree();

        return layerDef;
    },

    /**
     * Exportiert einen Report-Layer als GeoJSON-Datei
     */
    exportReportLayer(layerId) {
        const layer = GodsEyeMap.featureLayers[layerId];
        if (!layer) return;

        const geojson = layer.toGeoJSON();
        const meta = LAYER_REGISTRY[layerId]?.meta || {};

        geojson.properties = {
            layerId: layerId,
            name: LAYER_REGISTRY[layerId]?.name || layerId,
            ...meta,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${layerId}_${new Date().toISOString().slice(0, 10)}.geojson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Gibt die Liste aller registrierten Report-Layer zurück
     */
    getRegisteredReports() {
        return this._registeredReports;
    }
};
