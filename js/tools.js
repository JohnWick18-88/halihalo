/* ============================================
   God's Eye Sachsen — Spatial Tools
   Kreis-Zeichnen, Polygon-Selektion,
   TurfJS Verschneidung, Messen, Buffer
   ============================================ */

const SpatialTools = {
    drawControl: null,
    drawnItems: null,
    activeTool: null,        // 'circle' | 'polygon' | 'measure' | null
    selectionLayer: null,    // Aktuell gezeichnete Auswahl
    selectionResults: [],    // Verschneidungsergebnisse

    /**
     * Initialisiert die Zeichenwerkzeuge
     */
    init(map) {
        this.drawnItems = new L.FeatureGroup();
        map.addLayer(this.drawnItems);

        // Draw-Events
        map.on(L.Draw.Event.CREATED, (e) => this._onDrawCreated(e, map));
        map.on(L.Draw.Event.DRAWSTART, () => this._clearSelection());
    },

    /**
     * Startet das Kreis-Zeichnen-Tool
     */
    startCircleDraw(map) {
        this._clearSelection();
        this.activeTool = 'circle';

        const circleDrawer = new L.Draw.Circle(map, {
            shapeOptions: CONFIG.styles.drawCircle,
            showRadius: true,
            metric: true
        });
        circleDrawer.enable();
    },

    /**
     * Startet das Polygon-Zeichnen-Tool
     */
    startPolygonDraw(map) {
        this._clearSelection();
        this.activeTool = 'polygon';

        const polyDrawer = new L.Draw.Polygon(map, {
            shapeOptions: CONFIG.styles.drawCircle,
            showArea: true,
            metric: true
        });
        polyDrawer.enable();
    },

    /**
     * Startet das Rechteck-Zeichnen-Tool
     */
    startRectangleDraw(map) {
        this._clearSelection();
        this.activeTool = 'rectangle';

        const rectDrawer = new L.Draw.Rectangle(map, {
            shapeOptions: CONFIG.styles.drawCircle,
            showArea: true,
            metric: true
        });
        rectDrawer.enable();
    },

    /**
     * Handler wenn eine Form gezeichnet wurde
     */
    async _onDrawCreated(e, map) {
        const layer = e.layer;
        this.drawnItems.addLayer(layer);
        this.selectionLayer = layer;

        // GeoJSON der gezeichneten Form
        let clipGeometry;

        if (e.layerType === 'circle') {
            // Kreis → TurfJS Circle (da GeoJSON keine Kreise kennt)
            const center = layer.getLatLng();
            const radiusKm = layer.getRadius() / 1000;
            clipGeometry = turf.circle(
                [center.lng, center.lat],
                radiusKm,
                { steps: 64, units: 'kilometers' }
            );
        } else {
            clipGeometry = layer.toGeoJSON();
            // Falls FeatureCollection, erstes Feature nehmen
            if (clipGeometry.type === 'FeatureCollection') {
                clipGeometry = clipGeometry.features[0];
            }
        }

        // Fläche der Auswahl berechnen
        const areaM2 = turf.area(clipGeometry);
        const areaHa = (areaM2 / 10000).toFixed(2);

        // Status-Update
        document.getElementById('status-features').textContent =
            `Auswahl: ${areaHa} ha — Verschneide Layer...`;

        // Verschneidung mit allen aktiven + verschneidungsfähigen Layern
        const results = await this._performSpatialAnalysis(clipGeometry, map);

        // Ergebnis anzeigen
        this._showSelectionResults(clipGeometry, results, areaHa);
    },

    /**
     * Führt die Verschneidungsanalyse durch
     * Prüft ALLE aktiven FeatureServer-Layer auf Überlappung
     */
    async _performSpatialAnalysis(clipGeometry, map) {
        const results = {};
        const bounds = map.getBounds();

        // Alle verschneidungsfähigen Layer durchgehen
        for (const [layerId, layerInfo] of Object.entries(LAYER_REGISTRY)) {
            // Nur FeatureServer-Layer mit verschneidung=true ODER aktive FS-Layer
            if (layerInfo.type !== 'fs') continue;
            if (!layerInfo.active && !layerInfo.verschneidung) continue;

            try {
                // Features in der Nähe laden
                let geojson;

                // Wenn Features bereits geladen sind, aus dem Layer nehmen
                if (GodsEyeMap.featureLayers[layerId]) {
                    geojson = GodsEyeMap.featureLayers[layerId].toGeoJSON();
                } else {
                    // Sonst vom Server nachladen
                    geojson = await LuisAPI.queryByBounds(layerInfo.endpoint, bounds);
                }

                if (!geojson || !geojson.features || geojson.features.length === 0) continue;

                // TurfJS Verschneidung
                const intersectResult = this._intersectWithClip(geojson, clipGeometry);

                if (intersectResult.intersecting.length > 0) {
                    results[layerInfo.name || layerId] = intersectResult;
                }
            } catch (err) {
                console.warn(`[Tools] Verschneidung ${layerId} Fehler:`, err.message);
            }
        }

        // Auch Flurstücke separat analysieren wenn sichtbar
        if (GodsEyeMap.featureLayers['flurstuecke']) {
            const flstGeoJSON = GodsEyeMap.featureLayers['flurstuecke'].toGeoJSON();
            const flstResult = this._intersectWithClip(flstGeoJSON, clipGeometry);
            if (flstResult.intersecting.length > 0) {
                results['Flurstücke in Auswahl'] = flstResult;
            }
        }

        return results;
    },

    /**
     * Verschneidet GeoJSON-Features mit einer Clip-Geometrie
     * @param {GeoJSON.FeatureCollection} featureCollection
     * @param {GeoJSON.Feature} clipGeometry
     * @returns {object} { intersecting: [], statistics: {} }
     */
    _intersectWithClip(featureCollection, clipGeometry) {
        const intersecting = [];
        let totalClipArea = turf.area(clipGeometry);
        let coveredArea = 0;

        featureCollection.features.forEach(feature => {
            try {
                // Prüfe ob Feature die Clip-Geometrie schneidet
                if (!turf.booleanIntersects(feature, clipGeometry)) return;

                // Berechne die Schnittfläche
                const intersection = turf.intersect(
                    turf.featureCollection([feature, clipGeometry])
                );

                if (intersection) {
                    const intArea = turf.area(intersection);
                    const featureArea = turf.area(feature);

                    intersecting.push({
                        feature: feature,
                        intersection: intersection,
                        overlapArea: intArea,
                        overlapPercent: featureArea > 0
                            ? ((intArea / featureArea) * 100).toFixed(1)
                            : 0,
                        properties: feature.properties
                    });

                    coveredArea += intArea;
                }
            } catch (e) {
                // Ungültige Geometrie überspringen
            }
        });

        return {
            intersecting,
            statistics: {
                totalFeatures: featureCollection.features.length,
                intersectingCount: intersecting.length,
                clipAreaHa: (totalClipArea / 10000).toFixed(2),
                coveredAreaHa: (coveredArea / 10000).toFixed(2),
                coveragePercent: totalClipArea > 0
                    ? ((coveredArea / totalClipArea) * 100).toFixed(1)
                    : 0
            }
        };
    },

    /**
     * Zeigt die Verschneidungsergebnisse im Sidebar-Panel
     */
    _showSelectionResults(clipGeometry, results, areaHa) {
        let html = `<div class="steckbrief">`;

        // Auswahl-Info
        html += `
        <div class="steckbrief-section">
            <h3>Auswahlanalyse</h3>
            <div class="steckbrief-field">
                <span class="label">Auswahlfläche</span>
                <span class="value">${areaHa} ha</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Analysierte Layer</span>
                <span class="value">${Object.keys(results).length}</span>
            </div>
        </div>`;

        // Ergebnis pro Layer
        if (Object.keys(results).length === 0) {
            html += `
            <div class="steckbrief-section">
                <p style="color:var(--accent-green);font-size:13px;">
                    Keine Restriktionen in der Auswahl gefunden.
                </p>
            </div>`;
        } else {
            Object.entries(results).forEach(([layerName, result]) => {
                html += `
                <div class="steckbrief-section">
                    <h3>${layerName}</h3>
                    <div class="steckbrief-field">
                        <span class="label">Treffer</span>
                        <span class="value" style="color:var(--accent-yellow)">${result.statistics.intersectingCount} Features</span>
                    </div>
                    <div class="steckbrief-field">
                        <span class="label">Betroffene Fläche</span>
                        <span class="value">${result.statistics.coveredAreaHa} ha</span>
                    </div>
                    <div class="steckbrief-field">
                        <span class="label">Anteil an Auswahl</span>
                        <span class="value">${result.statistics.coveragePercent}%</span>
                    </div>`;

                // Einzelne Features auflisten (max 10)
                result.intersecting.slice(0, 10).forEach(item => {
                    const props = item.properties || {};
                    const name = props.NAME || props.BEZEICHNUNG || props.GEMARKUNG
                        || props.GEMEINDE || props.FLSTNRZAE || '—';
                    html += `
                    <div class="kontakt-entry">
                        <span style="color:var(--text-primary);font-weight:600;">${name}</span><br>
                        <span class="date">Überlappung: ${(item.overlapArea / 10000).toFixed(2)} ha (${item.overlapPercent}%)</span>
                    </div>`;
                });

                if (result.intersecting.length > 10) {
                    html += `<p style="color:var(--text-muted);font-size:11px;padding:4px 0;">
                        ... und ${result.intersecting.length - 10} weitere
                    </p>`;
                }

                html += `</div>`;
            });
        }

        // Export-Button
        html += `
        <div class="steckbrief-section">
            <button class="btn-primary" style="width:100%" onclick="SpatialTools.exportResults()">
                Ergebnis als GeoJSON exportieren
            </button>
        </div>`;

        html += `</div>`;

        // In Sidebar anzeigen
        document.getElementById('info-title').textContent = 'Verschneidungsanalyse';
        document.getElementById('info-content').innerHTML = html;
        document.getElementById('sidebar-info').classList.remove('hidden');

        // Status-Update
        const totalHits = Object.values(results)
            .reduce((sum, r) => sum + r.statistics.intersectingCount, 0);
        document.getElementById('status-features').textContent =
            `Auswahl: ${areaHa} ha | ${totalHits} Restriktions-Treffer in ${Object.keys(results).length} Layern`;

        // Ergebnisse speichern für Export
        this.selectionResults = results;
    },

    /**
     * Buffer um eine Geometrie erzeugen
     * @param {GeoJSON.Feature} feature
     * @param {number} meters
     * @returns {GeoJSON.Feature}
     */
    createBuffer(feature, meters) {
        return turf.buffer(feature, meters / 1000, { units: 'kilometers' });
    },

    /**
     * Fläche eines Features berechnen
     * @param {GeoJSON.Feature} feature
     * @returns {number} Fläche in Hektar
     */
    calcAreaHa(feature) {
        return turf.area(feature) / 10000;
    },

    /**
     * Exportiert Verschneidungsergebnisse als GeoJSON
     */
    exportResults() {
        if (!this.selectionResults || Object.keys(this.selectionResults).length === 0) {
            alert('Keine Ergebnisse zum Exportieren.');
            return;
        }

        const features = [];

        Object.entries(this.selectionResults).forEach(([layerName, result]) => {
            result.intersecting.forEach(item => {
                const exportFeature = {
                    ...item.feature,
                    properties: {
                        ...item.properties,
                        _analysis_layer: layerName,
                        _overlap_ha: (item.overlapArea / 10000).toFixed(2),
                        _overlap_percent: item.overlapPercent
                    }
                };
                features.push(exportFeature);
            });
        });

        const geojson = {
            type: 'FeatureCollection',
            features: features,
            properties: {
                exportDate: new Date().toISOString(),
                tool: "God's Eye Sachsen — Verschneidungsanalyse"
            }
        };

        // Download
        const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `verschneidung_${new Date().toISOString().slice(0, 10)}.geojson`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Löscht die aktuelle Selektion
     */
    _clearSelection() {
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
        this.selectionResults = [];
        this.activeTool = null;
    },

    /**
     * Entfernt alle Werkzeuge
     */
    deactivate() {
        this._clearSelection();
    }
};
