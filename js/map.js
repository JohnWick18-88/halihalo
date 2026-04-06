/* ============================================
   God's Eye Sachsen — Map Module
   Leaflet Init, Dark Tiles, Viewport Culling,
   Smart Layer Loading
   ============================================ */

const GodsEyeMap = {
    map: null,
    featureLayers: {},      // layerId → L.GeoJSON
    labelLayers: {},        // layerId → L.LayerGroup (Labels)
    _viewportTimer: null,
    _currentBounds: null,

    /**
     * Initialisiert die Leaflet-Karte
     */
    init() {
        // Proj4 Definition für EPSG:25833
        proj4.defs('EPSG:25833', CONFIG.epsg25833);

        this.map = L.map('map', {
            center: CONFIG.map.center,
            zoom: CONFIG.map.zoom,
            minZoom: CONFIG.map.minZoom,
            maxZoom: CONFIG.map.maxZoom,
            zoomControl: true,
            preferCanvas: true  // Performance: Canvas statt SVG
        });

        // ---- Basemap Layers ----
        const darkTiles = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
            {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 20
            }
        );

        const satelliteTiles = L.tileLayer(
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {
                attribution: '&copy; Esri',
                maxZoom: 19
            }
        );

        const osmTiles = L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
                maxZoom: 19
            }
        );

        // Dark als Standard
        darkTiles.addTo(this.map);

        // Basemap Control
        L.control.layers({
            'Dark': darkTiles,
            'Satellit': satelliteTiles,
            'OpenStreetMap': osmTiles
        }, null, { position: 'bottomright', collapsed: true }).addTo(this.map);

        // ---- Event Handlers ----
        this.map.on('moveend', () => this._onViewportChange());
        this.map.on('zoomend', () => this._onViewportChange());
        this.map.on('mousemove', (e) => this._onMouseMove(e));
        this.map.on('click', (e) => this._onMapClick(e));

        // ---- Statusbar Updates ----
        this.map.on('mousemove', (e) => {
            document.getElementById('status-coords').textContent =
                `${e.latlng.lat.toFixed(5)}°N, ${e.latlng.lng.toFixed(5)}°E`;
        });

        this.map.on('zoomend', () => {
            document.getElementById('status-zoom').textContent =
                `Zoom: ${this.map.getZoom()}`;
        });

        // Initial viewport laden
        this._onViewportChange();

        return this.map;
    },

    /**
     * Viewport Change Handler — Smart Layer Loading
     * Lädt nur Layer die zum aktuellen Zoom passen
     */
    _onViewportChange() {
        clearTimeout(this._viewportTimer);
        this._viewportTimer = setTimeout(() => {
            this._loadVisibleLayers();
        }, CONFIG.query.debounceMs);
    },

    /**
     * Lädt alle aktiven Layer die zum Zoom passen
     */
    async _loadVisibleLayers() {
        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();
        this._currentBounds = bounds;

        // Viewport-Fläche berechnen (km²)
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const viewportArea = this._calcAreaKm2(sw, ne);

        let featureCount = 0;

        for (const [layerId, layerInfo] of Object.entries(LAYER_REGISTRY)) {
            if (!layerInfo.active) continue;

            // Zoom-Check
            if (zoom < layerInfo.minZoom) {
                this._removeFeatureLayer(layerId);
                continue;
            }

            // Viewport-Flächen-Check für Flurstücke
            if (layerId === 'flurstuecke' && viewportArea > CONFIG.viewport.maxAreaFlurstuecke) {
                this._removeFeatureLayer(layerId);
                continue;
            }
            if (layerId === 'gemarkungen' && viewportArea > CONFIG.viewport.maxAreaGemarkungen) {
                this._removeFeatureLayer(layerId);
                continue;
            }

            // Layer laden je nach Typ
            if (layerInfo.type === 'fs') {
                const geojson = await LuisAPI.queryByBounds(layerInfo.endpoint, bounds);
                if (geojson && geojson.features) {
                    this._renderFeatureLayer(layerId, geojson, layerInfo);
                    featureCount += geojson.features.length;
                }
            } else if (layerInfo.type === 'wms') {
                // WMS-Layer werden einmalig erstellt und Leaflet managed Tiles
                if (!layerInfo.leafletLayer) {
                    const wmsLayer = RapisWMS.createLayer(layerId, layerInfo);
                    wmsLayer.addTo(this.map);
                    LAYER_REGISTRY[layerId].leafletLayer = wmsLayer;
                }
            } else if (layerInfo.type === 'ms') {
                // LUIS MapServer
                if (!layerInfo.leafletLayer) {
                    const msLayer = RapisWMS.createLuisMapServerLayer(layerId, layerInfo);
                    msLayer.addTo(this.map);
                    LAYER_REGISTRY[layerId].leafletLayer = msLayer;
                }
            } else if (layerInfo.type === 'local') {
                // Lokale GeoJSON-Dateien (z.B. Netzausbau-Reports)
                if (!layerInfo.loaded && layerInfo.dataFile) {
                    await this._loadLocalGeoJSON(layerId, layerInfo);
                }
            }
        }

        // Statusbar aktualisieren
        document.getElementById('status-features').textContent =
            `${featureCount} Features sichtbar`;
    },

    /**
     * Rendert einen FeatureServer-Layer als GeoJSON auf der Karte
     */
    _renderFeatureLayer(layerId, geojson, layerInfo) {
        // Alten Layer entfernen
        this._removeFeatureLayer(layerId);

        const style = CONFIG.styles[layerInfo.style] || CONFIG.styles.gemeinde;

        const geoLayer = L.geoJSON(geojson, {
            style: () => style,
            onEachFeature: (feature, layer) => {
                // Hover-Effekt
                layer.on('mouseover', () => {
                    layer.setStyle({
                        weight: style.weight + 1.5,
                        fillOpacity: style.fillOpacity + 0.1
                    });
                    this._showHoverInfo(feature, layerInfo);
                });
                layer.on('mouseout', () => {
                    layer.setStyle(style);
                });
                layer.on('click', () => {
                    this._onFeatureClick(feature, layerInfo, layer);
                });
            }
        });

        geoLayer.addTo(this.map);
        this.featureLayers[layerId] = geoLayer;
        LAYER_REGISTRY[layerId].featureCount = geojson.features.length;
        LAYER_REGISTRY[layerId].loaded = true;

        // Labels für Gemeinden/Gemarkungen
        if (['gemeindegrenzen', 'gemarkungen'].includes(layerId)) {
            this._addLabels(layerId, geojson, layerInfo);
        }
    },

    /**
     * Labels (Gemeindenamen, Gemarkungsnamen) auf die Karte setzen
     */
    _addLabels(layerId, geojson, layerInfo) {
        if (this.labelLayers[layerId]) {
            this.map.removeLayer(this.labelLayers[layerId]);
        }

        const labelGroup = L.layerGroup();

        geojson.features.forEach(feature => {
            const name = feature.properties.GEMEINDE
                || feature.properties.GEMARKUNG
                || feature.properties.NAME
                || feature.properties.name
                || '';

            if (!name) return;

            try {
                const centroid = turf.centroid(feature);
                const [lng, lat] = centroid.geometry.coordinates;

                const cssClass = layerId === 'gemeindegrenzen'
                    ? 'gemeinde-label'
                    : 'gemarkung-label';

                const label = L.marker([lat, lng], {
                    icon: L.divIcon({
                        className: cssClass,
                        html: name,
                        iconSize: [120, 20],
                        iconAnchor: [60, 10]
                    }),
                    interactive: false
                });

                labelGroup.addLayer(label);
            } catch (e) {
                // Ungültige Geometrie für Centroid
            }
        });

        labelGroup.addTo(this.map);
        this.labelLayers[layerId] = labelGroup;
    },

    /**
     * Entfernt einen Feature-Layer von der Karte
     */
    _removeFeatureLayer(layerId) {
        if (this.featureLayers[layerId]) {
            this.map.removeLayer(this.featureLayers[layerId]);
            delete this.featureLayers[layerId];
        }
        if (this.labelLayers[layerId]) {
            this.map.removeLayer(this.labelLayers[layerId]);
            delete this.labelLayers[layerId];
        }
    },

    /**
     * Lädt lokale GeoJSON-Dateien (Netzausbau-Reports etc.)
     */
    async _loadLocalGeoJSON(layerId, layerInfo) {
        try {
            const response = await fetch(layerInfo.dataFile);
            if (!response.ok) return;
            const geojson = await response.json();
            this._renderFeatureLayer(layerId, geojson, layerInfo);
            LAYER_REGISTRY[layerId].loaded = true;
        } catch (err) {
            console.warn(`[Local] Fehler beim Laden von ${layerInfo.dataFile}:`, err.message);
        }
    },

    /**
     * Hover-Info im Statusbar anzeigen
     */
    _showHoverInfo(feature, layerInfo) {
        const props = feature.properties || {};
        const parts = [];

        // Dynamisch die wichtigsten Attribute zeigen
        if (props.GEMEINDE) parts.push(props.GEMEINDE);
        if (props.GEMARKUNG) parts.push(props.GEMARKUNG);
        if (props.FLSTNRZAE) parts.push(`Flst. ${props.FLSTNRZAE}/${props.FLSTNRNEN || ''}`);
        if (props.FLAECHE) parts.push(`${(props.FLAECHE / 10000).toFixed(2)} ha`);
        if (props.NAME) parts.push(props.NAME);
        if (props.BEZEICHNUNG) parts.push(props.BEZEICHNUNG);

        if (parts.length > 0) {
            document.getElementById('status-features').textContent = parts.join(' | ');
        }
    },

    /**
     * Feature-Click → Steckbrief öffnen
     */
    _onFeatureClick(feature, layerInfo, leafletLayer) {
        // Highlight
        leafletLayer.setStyle(CONFIG.styles.selection);

        // Event für Sidebar dispatchen
        const event = new CustomEvent('feature:click', {
            detail: { feature, layerInfo }
        });
        document.dispatchEvent(event);
    },

    /**
     * Map-Click (auf leere Fläche)
     */
    _onMapClick(e) {
        // MapServer GetFeatureInfo für aktive MS/WMS-Layer
        Object.entries(LAYER_REGISTRY).forEach(([layerId, info]) => {
            if (info.active && (info.type === 'wms' || info.type === 'ms') && info.leafletLayer) {
                RapisWMS.getFeatureInfo(info, e.latlng, this.map).then(result => {
                    if (result && result.features && result.features.length > 0) {
                        const event = new CustomEvent('feature:click', {
                            detail: { feature: result.features[0], layerInfo: info }
                        });
                        document.dispatchEvent(event);
                    }
                });
            }
        });
    },

    _onMouseMove(e) {
        // Für spätere Erweiterungen (z.B. Hover-Tooltips)
    },

    /**
     * Layer aktivieren/deaktivieren
     */
    toggleLayer(layerId, active) {
        const info = LAYER_REGISTRY[layerId];
        if (!info) return;

        info.active = active;

        if (!active) {
            // Layer entfernen
            this._removeFeatureLayer(layerId);
            if (info.leafletLayer) {
                this.map.removeLayer(info.leafletLayer);
                info.leafletLayer = null;
            }
        } else {
            // Layer laden
            this._loadVisibleLayers();
        }
    },

    /**
     * Zoom auf eine bestimmte Gemeinde
     */
    async zoomToGemeinde(gemeindeName) {
        const geojson = await LuisAPI.queryByAttribute(
            'gemeindegrenzen',
            `GEMEINDE = '${gemeindeName}'`
        );
        if (geojson && geojson.features && geojson.features.length > 0) {
            const bounds = L.geoJSON(geojson).getBounds();
            this.map.fitBounds(bounds, { padding: [30, 30] });
            return geojson.features[0];
        }
        return null;
    },

    /**
     * Viewport-Fläche in km² berechnen
     */
    _calcAreaKm2(sw, ne) {
        const widthKm = sw.distanceTo(L.latLng(sw.lat, ne.lng)) / 1000;
        const heightKm = sw.distanceTo(L.latLng(ne.lat, sw.lng)) / 1000;
        return widthKm * heightKm;
    }
};
