/* ============================================
   God's Eye Sachsen — Entfernungsmessung
   Infrastruktur-Distanzen mit visuellen Linien
   USW (380/220/110kV), BAB/Bahn, Siedlung
   ============================================ */

const Distance = {
    _distanceLines: null,      // L.LayerGroup für visuelle Verbindungslinien
    _distanceLabels: null,     // L.LayerGroup für Entfernungslabels
    _highlightLayer: null,     // Temporärer Highlight (Siedlungsgrenze aufleuchten etc.)
    _fadeTimeout: null,

    /**
     * Initialisiert den Distance-Layer
     */
    init(map) {
        this._distanceLines = L.layerGroup().addTo(map);
        this._distanceLabels = L.layerGroup().addTo(map);
        this._highlightLayer = L.layerGroup().addTo(map);
    },

    /**
     * Berechnet alle relevanten Entfernungen für ein Feature
     * @param {GeoJSON.Feature} feature - Das Flurstück/Feature
     * @param {L.Map} map
     * @returns {Promise<object>} distances
     */
    async calculateAll(feature, map) {
        const centroid = turf.centroid(feature);
        const [lng, lat] = centroid.geometry.coordinates;
        const point = turf.point([lng, lat]);
        const bounds = map.getBounds();

        const distances = {};

        // Parallel: USW, Siedlung laden
        const [uswResult, siedlungResult] = await Promise.all([
            this._findNearestUSW(point, bounds),
            this._findNearestSiedlung(point, bounds)
        ]);

        if (uswResult) distances.umspannwerk = uswResult;
        if (siedlungResult) distances.siedlung = siedlungResult;

        // EEG-Korridor (BAB/Bahn) — aus PVFVO-Layer ableiten
        const babResult = await this._findNearestBAB(point, bounds);
        if (babResult) distances.bab = babResult;

        return distances;
    },

    /**
     * Findet das nächste Umspannwerk und zeigt die Verbindungslinie
     */
    async _findNearestUSW(point, bounds) {
        // Versuche WEA-Layer als Proxy oder direkt USW laden
        // LUIS hat keine direkte USW-FS-Schicht, aber über RAPIS oder Report-Daten

        // Strategie 1: Aus bereits geladenen Report-Layern
        for (const [layerId, leafletLayer] of Object.entries(GodsEyeMap.featureLayers)) {
            const info = LAYER_REGISTRY[layerId];
            if (!info || info.source !== 'report') continue;
            if (!info.name?.toLowerCase().includes('umspannwerk') &&
                !info.name?.toLowerCase().includes('usw')) continue;

            const geojson = leafletLayer.toGeoJSON();
            return this._findNearest(point, geojson, 'umspannwerk');
        }

        // Strategie 2: Dummy-Daten für wichtigste USW in Sachsen
        // (Wird durch echte Daten aus Netzausbauplan-Import ersetzt)
        const knownUSW = {
            type: 'FeatureCollection',
            features: [
                this._uswFeature('UW Röhrsdorf', 50.866, 12.827, '380/110 kV'),
                this._uswFeature('UW Remptendorf', 50.561, 11.647, '380/220 kV'),
                this._uswFeature('UW Streumen', 51.375, 13.214, '380/110 kV'),
                this._uswFeature('UW Pulgar', 51.217, 12.293, '380/110 kV'),
                this._uswFeature('UW Lauta', 51.456, 14.093, '110/20 kV'),
                this._uswFeature('UW Dresden-Süd', 51.018, 13.738, '380/110 kV'),
                this._uswFeature('UW Leipzig-Süd', 51.296, 12.394, '110/20 kV'),
                this._uswFeature('UW Chemnitz-Nord', 50.871, 12.937, '110/20 kV'),
                this._uswFeature('UW Görlitz', 51.149, 14.977, '110/20 kV'),
                this._uswFeature('UW Bautzen', 51.183, 14.421, '110/20 kV'),
                this._uswFeature('UW Zwickau', 50.716, 12.495, '110/20 kV'),
                this._uswFeature('UW Plauen', 50.494, 12.142, '110/20 kV'),
                this._uswFeature('UW Freiberg', 50.913, 13.338, '110/20 kV'),
                this._uswFeature('UW Riesa', 51.310, 13.290, '110/20 kV'),
                this._uswFeature('UW Torgau', 51.558, 12.993, '110/20 kV')
            ]
        };

        return this._findNearest(point, knownUSW, 'umspannwerk');
    },

    /**
     * Erzeugt ein USW-Feature
     */
    _uswFeature(name, lat, lng, spannung) {
        return {
            type: 'Feature',
            properties: { name, spannung, typ: 'Umspannwerk' },
            geometry: { type: 'Point', coordinates: [lng, lat] }
        };
    },

    /**
     * Findet die nächste Siedlung (approximiert über OpenStreetMap-Grenzen)
     */
    async _findNearestSiedlung(point, bounds) {
        // Siedlungsgrenzen sind nicht direkt als FS verfügbar
        // Approximation: Gemeindegrenzen-Centroide als Proxy
        const gemeindeLayer = GodsEyeMap.featureLayers['gemeindegrenzen'];
        if (!gemeindeLayer) return null;

        const geojson = gemeindeLayer.toGeoJSON();
        if (!geojson.features || geojson.features.length === 0) return null;

        // Nächste Gemeindegrenze finden (Rand, nicht Centroid)
        let minDist = Infinity;
        let nearest = null;
        let nearestEdgePoint = null;

        geojson.features.forEach(feature => {
            try {
                // Nächster Punkt auf der Gemeindegrenze
                const edgePoint = turf.nearestPointOnLine(
                    turf.polygonToLine(feature),
                    point
                );
                const dist = turf.distance(point, edgePoint, { units: 'kilometers' });

                if (dist < minDist) {
                    minDist = dist;
                    nearest = feature;
                    nearestEdgePoint = edgePoint;
                }
            } catch (e) {
                // Geometrie-Fehler ignorieren
            }
        });

        if (!nearest) return null;

        return {
            km: minDist,
            name: nearest.properties?.GEMEINDE || nearest.properties?.NAME || '',
            edgePoint: nearestEdgePoint
        };
    },

    /**
     * Findet die nächste BAB/Bahntrasse
     */
    async _findNearestBAB(point, bounds) {
        // EEG-Korridor ist MapServer — keine Vektordaten
        // Approximation: Bekannte BAB-Verläufe in Sachsen
        // Wird später durch echte Daten ersetzt
        return null;  // Platzhalter
    },

    /**
     * Generische Nearest-Feature-Suche
     */
    _findNearest(point, featureCollection, type) {
        if (!featureCollection?.features?.length) return null;

        let minDist = Infinity;
        let nearest = null;

        featureCollection.features.forEach(feature => {
            try {
                const targetPoint = turf.centroid(feature);
                const dist = turf.distance(point, targetPoint, { units: 'kilometers' });

                if (dist < minDist) {
                    minDist = dist;
                    nearest = feature;
                }
            } catch (e) { }
        });

        if (!nearest) return null;

        const props = nearest.properties || {};
        return {
            km: minDist,
            name: props.name || props.NAME || props.BEZEICHNUNG || '',
            spannung: props.spannung || props.SPANNUNG || '',
            feature: nearest
        };
    },

    /**
     * Zeichnet visuelle Entfernungslinien auf die Karte
     * @param {GeoJSON.Feature} fromFeature - Ausgangsflurstück
     * @param {object} distances - Ergebnis von calculateAll()
     */
    drawDistanceLines(fromFeature, distances) {
        this.clearLines();

        const fromCentroid = turf.centroid(fromFeature);
        const [fromLng, fromLat] = fromCentroid.geometry.coordinates;

        // --- Umspannwerk-Linie ---
        if (distances.umspannwerk?.feature) {
            const uswCentroid = turf.centroid(distances.umspannwerk.feature);
            const [toLng, toLat] = uswCentroid.geometry.coordinates;
            const spannung = distances.umspannwerk.spannung || '';

            // Farbe je nach Spannungsebene
            let lineColor = '#8b5cf6';  // Default: Lila
            let lineWeight = 1.5;
            if (spannung.includes('380')) { lineColor = '#ef4444'; lineWeight = 2.5; }
            else if (spannung.includes('220')) { lineColor = '#f59e0b'; lineWeight = 2; }
            else if (spannung.includes('110')) { lineColor = '#3b82f6'; lineWeight = 1.8; }

            // Gestrichelte Linie
            const line = L.polyline(
                [[fromLat, fromLng], [toLat, toLng]],
                {
                    color: lineColor,
                    weight: lineWeight,
                    opacity: 0.6,
                    dashArray: '8, 6',
                    interactive: false
                }
            );
            this._distanceLines.addLayer(line);

            // Entfernungs-Label am Mittelpunkt der Linie
            const midLat = (fromLat + toLat) / 2;
            const midLng = (fromLng + toLng) / 2;
            const label = L.marker([midLat, midLng], {
                icon: L.divIcon({
                    className: 'distance-label',
                    html: `<span class="dist-badge" style="border-color:${lineColor}">
                        ${distances.umspannwerk.km.toFixed(1)} km<br>
                        <small>${distances.umspannwerk.name}</small><br>
                        <small style="color:${lineColor}">${spannung}</small>
                    </span>`,
                    iconSize: [100, 40],
                    iconAnchor: [50, 20]
                }),
                interactive: false
            });
            this._distanceLabels.addLayer(label);

            // USW-Marker mit Spannungs-Symbol
            const uswMarker = L.circleMarker([toLat, toLng], {
                radius: spannung.includes('380') ? 10 : spannung.includes('220') ? 8 : 6,
                color: lineColor,
                fillColor: lineColor,
                fillOpacity: 0.3,
                weight: 2
            });
            uswMarker.bindTooltip(`${distances.umspannwerk.name}<br>${spannung}`, {
                permanent: false, className: 'dark-tooltip'
            });
            this._distanceLines.addLayer(uswMarker);
        }

        // --- Siedlungs-Highlight ---
        if (distances.siedlung?.edgePoint) {
            const [eLng, eLat] = distances.siedlung.edgePoint.geometry.coordinates;

            // Dezente Linie zur Siedlungsgrenze
            const line = L.polyline(
                [[fromLat, fromLng], [eLat, eLng]],
                {
                    color: '#94a3b8',
                    weight: 1,
                    opacity: 0.4,
                    dashArray: '4, 6',
                    interactive: false
                }
            );
            this._distanceLines.addLayer(line);

            // Kurzes Aufleuchten der Siedlungsgrenze
            this._flashSiedlung(distances.siedlung.name);

            // Entfernungs-Label
            const midLat2 = (fromLat + eLat) / 2;
            const midLng2 = (fromLng + eLng) / 2;
            const label2 = L.marker([midLat2, midLng2], {
                icon: L.divIcon({
                    className: 'distance-label',
                    html: `<span class="dist-badge dist-siedlung">
                        ${(distances.siedlung.km * 1000).toFixed(0)} m<br>
                        <small>${distances.siedlung.name}</small>
                    </span>`,
                    iconSize: [90, 30],
                    iconAnchor: [45, 15]
                }),
                interactive: false
            });
            this._distanceLabels.addLayer(label2);
        }
    },

    /**
     * Lässt die Siedlungsgrenze kurz aufleuchten (2 Sekunden)
     */
    _flashSiedlung(gemeindeName) {
        this._highlightLayer.clearLayers();

        const gemeindeLayer = GodsEyeMap.featureLayers['gemeindegrenzen'];
        if (!gemeindeLayer) return;

        gemeindeLayer.eachLayer(layer => {
            const name = layer.feature?.properties?.GEMEINDE
                || layer.feature?.properties?.NAME;
            if (name && name.toUpperCase() === (gemeindeName || '').toUpperCase()) {
                // Leuchtende Kopie der Gemeindegrenze
                const highlight = L.geoJSON(layer.toGeoJSON(), {
                    style: {
                        color: '#f59e0b',
                        weight: 3,
                        opacity: 0.8,
                        fillOpacity: 0.05,
                        fillColor: '#f59e0b'
                    }
                });
                this._highlightLayer.addLayer(highlight);

                // Nach 3 Sekunden ausblenden
                clearTimeout(this._fadeTimeout);
                this._fadeTimeout = setTimeout(() => {
                    this._highlightLayer.clearLayers();
                }, 3000);
            }
        });
    },

    /**
     * Entfernt alle Entfernungslinien
     */
    clearLines() {
        if (this._distanceLines) this._distanceLines.clearLayers();
        if (this._distanceLabels) this._distanceLabels.clearLayers();
        if (this._highlightLayer) this._highlightLayer.clearLayers();
        clearTimeout(this._fadeTimeout);
    }
};
