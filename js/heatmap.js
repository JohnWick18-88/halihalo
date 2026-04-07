/* ============================================
   God's Eye Sachsen — Restriktions-Heatmap
   Farbcodierung auf Gemeindeebene:
   Grün = wenig Restriktionen → PV-Potenzial
   Rot = viel NSG/FFH/LSG → schwierig
   Mit Opacity-Slider steuerbar
   ============================================ */

const Heatmap = {
    _layer: null,           // L.GeoJSON Heatmap-Layer
    _data: {},              // gemeindeName → { score, restriktionsAnteil }
    _opacity: 0.4,
    _visible: false,
    _computed: false,

    /**
     * Berechnet die Heatmap-Daten für alle sichtbaren Gemeinden
     * Verschneidet jede Gemeinde mit allen Schutzgebiet-Layern
     */
    async compute(map) {
        const gemeindeLayer = GodsEyeMap.featureLayers['gemeindegrenzen'];
        if (!gemeindeLayer) {
            console.warn('[Heatmap] Gemeindegrenzen nicht geladen');
            return;
        }

        const bounds = map.getBounds();
        const verschneidungsLayer = getVerschneidungsLayer();

        // Status
        document.getElementById('status-features').textContent = 'Heatmap wird berechnet...';

        // Schutzgebiet-Daten laden
        const schutzDaten = {};
        for (const vl of verschneidungsLayer) {
            try {
                const geojson = await LuisAPI.queryByBounds(vl.endpoint, bounds, {
                    maxFeatures: 5000
                });
                if (geojson?.features?.length > 0) {
                    schutzDaten[vl.id] = geojson;
                }
            } catch (e) { }
        }

        // Pro Gemeinde berechnen
        const gemeindeGeoJSON = gemeindeLayer.toGeoJSON();

        gemeindeGeoJSON.features.forEach(feature => {
            const name = feature.properties?.GEMEINDE || feature.properties?.NAME || '';
            if (!name) return;

            try {
                const gemeindeArea = turf.area(feature);
                let restriktionsArea = 0;
                const restriktionen = {};

                // Verschneidung mit jedem Schutzgebiet-Layer
                Object.entries(schutzDaten).forEach(([layerId, layerData]) => {
                    let layerOverlap = 0;

                    layerData.features.forEach(schutzFeature => {
                        try {
                            if (!turf.booleanIntersects(feature, schutzFeature)) return;
                            const intersection = turf.intersect(
                                turf.featureCollection([feature, schutzFeature])
                            );
                            if (intersection) {
                                layerOverlap += turf.area(intersection);
                            }
                        } catch (e) { }
                    });

                    if (layerOverlap > 0) {
                        restriktionen[layerId] = {
                            areaHa: (layerOverlap / 10000).toFixed(1),
                            percent: ((layerOverlap / gemeindeArea) * 100).toFixed(1)
                        };
                        restriktionsArea += layerOverlap;
                    }
                });

                // Deduplizierung: Überlappende Schutzgebiete nicht doppelt zählen
                // (Vereinfacht: Max von Gesamt-Gemeinde-Fläche)
                const restriktionsAnteil = Math.min(100,
                    (restriktionsArea / gemeindeArea) * 100
                );

                this._data[name] = {
                    restriktionsAnteil: restriktionsAnteil.toFixed(1),
                    freiAnteil: (100 - restriktionsAnteil).toFixed(1),
                    restriktionen,
                    gemeindeAreaHa: (gemeindeArea / 10000).toFixed(0)
                };
            } catch (e) { }
        });

        this._computed = true;
        document.getElementById('status-features').textContent =
            `Heatmap: ${Object.keys(this._data).length} Gemeinden analysiert`;
    },

    /**
     * Zeigt die Heatmap auf der Karte an
     */
    show(map) {
        this.hide(map);

        const gemeindeLayer = GodsEyeMap.featureLayers['gemeindegrenzen'];
        if (!gemeindeLayer) return;

        const gemeindeGeoJSON = gemeindeLayer.toGeoJSON();

        this._layer = L.geoJSON(gemeindeGeoJSON, {
            style: (feature) => {
                const name = feature.properties?.GEMEINDE || feature.properties?.NAME || '';
                const data = this._data[name];

                if (!data) {
                    return { fillColor: '#64748b', fillOpacity: this._opacity * 0.3, weight: 0.5, color: '#334155', opacity: 0.3 };
                }

                const anteil = parseFloat(data.restriktionsAnteil);
                const color = this._getHeatColor(anteil);

                return {
                    fillColor: color,
                    fillOpacity: this._opacity,
                    weight: 1,
                    color: '#1e293b',
                    opacity: 0.5
                };
            },
            onEachFeature: (feature, layer) => {
                const name = feature.properties?.GEMEINDE || feature.properties?.NAME || '';
                const data = this._data[name];

                if (data) {
                    layer.bindTooltip(`
                        <strong>${name}</strong><br>
                        Restriktionen: ${data.restriktionsAnteil}%<br>
                        Frei verfügbar: ~${data.freiAnteil}%<br>
                        Fläche: ${data.gemeindeAreaHa} ha
                    `, { sticky: true, className: 'dark-tooltip' });
                }
            }
        });

        this._layer.addTo(map);
        this._visible = true;
    },

    /**
     * Heatmap ausblenden
     */
    hide(map) {
        if (this._layer && map.hasLayer(this._layer)) {
            map.removeLayer(this._layer);
        }
        this._layer = null;
        this._visible = false;
    },

    /**
     * Opacity setzen (Slider)
     */
    setOpacity(value) {
        this._opacity = value;
        if (this._layer) {
            this._layer.eachLayer(layer => {
                const style = layer.options;
                layer.setStyle({ fillOpacity: value });
            });
        }
    },

    /**
     * Toggle Heatmap
     */
    toggle(map) {
        if (this._visible) {
            this.hide(map);
        } else {
            if (!this._computed) {
                this.compute(map).then(() => this.show(map));
            } else {
                this.show(map);
            }
        }
        return this._visible;
    },

    /**
     * Farbe basierend auf Restriktionsanteil
     * 0% → leuchtend grün (perfekt für PV)
     * 50% → gelb (gemischt)
     * 100% → rot (alles geschützt)
     */
    _getHeatColor(percent) {
        if (percent <= 10) return '#00e676';     // Dunkelgrün — fast keine Restriktionen
        if (percent <= 20) return '#66bb6a';     // Grün
        if (percent <= 30) return '#aed581';     // Hellgrün
        if (percent <= 40) return '#dce775';     // Gelb-Grün
        if (percent <= 50) return '#fdd835';     // Gelb
        if (percent <= 60) return '#ffb300';     // Orange-Gelb
        if (percent <= 70) return '#ff9800';     // Orange
        if (percent <= 80) return '#f4511e';     // Rot-Orange
        if (percent <= 90) return '#e53935';     // Rot
        return '#b71c1c';                         // Dunkelrot
    },

    /**
     * Gibt Heatmap-Daten einer Gemeinde zurück
     */
    getGemeindeData(gemeindeName) {
        return this._data[gemeindeName] || null;
    }
};
