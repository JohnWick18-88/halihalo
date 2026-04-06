/* ============================================
   God's Eye Sachsen — RAPIS WMS Integration
   MapServer WMS-Layer direkt in Leaflet
   ============================================ */

const RapisWMS = {
    _layers: {},  // layerId → L.TileLayer.WMS

    /**
     * Erstellt einen WMS-Layer für RAPIS
     * @param {string} layerId - Layer ID aus LAYER_REGISTRY
     * @param {object} layerDef - Layer-Definition aus layers.js
     * @returns {L.TileLayer.WMS}
     */
    createLayer(layerId, layerDef) {
        if (this._layers[layerId]) {
            return this._layers[layerId];
        }

        const baseUrl = CONFIG.rapis.base + CONFIG.rapis.wms[layerDef.endpoint];

        const wmsLayer = L.tileLayer.wms(baseUrl, {
            layers: layerDef.wmsLayers || '0',
            format: 'image/png',
            transparent: true,
            version: '1.3.0',
            crs: L.CRS.EPSG4326,
            opacity: 0.7,
            attribution: 'RAPIS Sachsen'
        });

        this._layers[layerId] = wmsLayer;
        return wmsLayer;
    },

    /**
     * Erstellt einen LUIS MapServer WMS-Layer
     * @param {string} layerId
     * @param {object} layerDef
     * @returns {L.TileLayer.WMS}
     */
    createLuisMapServerLayer(layerId, layerDef) {
        if (this._layers[layerId]) {
            return this._layers[layerId];
        }

        const baseUrl = CONFIG.luis.base + CONFIG.luis.mapServer[layerDef.endpoint] + '/export';

        // LUIS MapServer als dynamischen Tile-Layer
        const msLayer = L.tileLayer(
            baseUrl + '?bbox={bbox}&bboxSR=4326&imageSR=4326&size=512,512&f=image&format=png32&transparent=true&layers=show:0',
            {
                attribution: 'LUIS Sachsen',
                opacity: 0.7,
                tileSize: 512,
                // Custom bbox parameter für ArcGIS MapServer Export
                // Leaflet ersetzt {bbox} nicht nativ, daher custom approach:
            }
        );

        // Alternative: als WMS (falls MapServer WMS-Schnittstelle hat)
        const wmsLayer = L.tileLayer.wms(
            CONFIG.luis.base + CONFIG.luis.mapServer[layerDef.endpoint] + '/WMSServer',
            {
                layers: '0',
                format: 'image/png',
                transparent: true,
                version: '1.3.0',
                opacity: 0.65,
                attribution: 'LUIS Sachsen'
            }
        );

        this._layers[layerId] = wmsLayer;
        return wmsLayer;
    },

    /**
     * Fügt einen Layer zur Karte hinzu
     */
    addToMap(layerId, map) {
        const layer = this._layers[layerId];
        if (layer && !map.hasLayer(layer)) {
            layer.addTo(map);
        }
    },

    /**
     * Entfernt einen Layer von der Karte
     */
    removeFromMap(layerId, map) {
        const layer = this._layers[layerId];
        if (layer && map.hasLayer(layer)) {
            map.removeLayer(layer);
        }
    },

    /**
     * Setzt die Opazität eines Layers
     */
    setOpacity(layerId, opacity) {
        const layer = this._layers[layerId];
        if (layer) layer.setOpacity(opacity);
    },

    /**
     * GetFeatureInfo-Abfrage (Klick auf MapServer-Layer)
     * Ermöglicht Attribut-Abfrage auch bei MapServer-Layern
     */
    async getFeatureInfo(layerDef, latlng, map) {
        const point = map.latLngToContainerPoint(latlng);
        const size = map.getSize();
        const bounds = map.getBounds();

        // WMS GetFeatureInfo Request
        const baseUrl = layerDef.source === 'rapis'
            ? CONFIG.rapis.base + CONFIG.rapis.wms[layerDef.endpoint]
            : CONFIG.luis.base + CONFIG.luis.mapServer[layerDef.endpoint] + '/WMSServer';

        const params = new URLSearchParams({
            SERVICE: 'WMS',
            VERSION: '1.3.0',
            REQUEST: 'GetFeatureInfo',
            FORMAT: 'image/png',
            TRANSPARENT: 'true',
            QUERY_LAYERS: layerDef.wmsLayers || '0',
            LAYERS: layerDef.wmsLayers || '0',
            INFO_FORMAT: 'application/json',
            I: Math.round(point.x),
            J: Math.round(point.y),
            WIDTH: size.x,
            HEIGHT: size.y,
            CRS: 'EPSG:4326',
            BBOX: `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`
        });

        try {
            const response = await fetch(`${baseUrl}?${params.toString()}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data;
        } catch (err) {
            console.warn(`[RAPIS] GetFeatureInfo Fehler:`, err.message);
            return null;
        }
    }
};
