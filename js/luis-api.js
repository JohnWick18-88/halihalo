/* ============================================
   God's Eye Sachsen — LUIS FeatureServer API
   REST-Abfragen an LUIS Sachsen (ArcGIS REST)
   Viewport-basiertes Laden + Verschneidungen
   ============================================ */

const LuisAPI = {
    _cache: {},          // endpoint → { bbox, features, timestamp }
    _pending: {},        // endpoint → AbortController
    _retryCount: {},     // endpoint → retry count
    _errorShown: {},     // endpoint → bool (verhindert Toast-Spam)

    /**
     * Zeigt eine sichtbare Fehlermeldung im UI (Toast)
     */
    _showError(endpoint, err) {
        if (this._errorShown[endpoint]) return;
        this._errorShown[endpoint] = true;

        // Nach 30s wieder erlauben
        setTimeout(() => { delete this._errorShown[endpoint]; }, 30000);

        let msg = '';
        let hint = '';

        if (err.message && err.message.toLowerCase().includes('cors')) {
            msg  = `CORS-Fehler: ${endpoint}`;
            hint = 'Starte node server.js und setze CONFIG.proxy.enabled = true';
        } else if (err.message && (err.message.includes('403') || err.message.includes('401'))) {
            msg  = `Zugriff verweigert: ${endpoint} (${err.message})`;
            hint = 'VPN / Firmennetzwerk prüfen oder Proxy aktivieren';
        } else if (err.message && err.message.includes('Failed to fetch')) {
            msg  = `Server nicht erreichbar: ${endpoint}`;
            hint = 'Internetverbindung / VPN prüfen. Falls OK: node server.js starten';
        } else {
            msg  = `Layer-Fehler: ${endpoint} — ${err.message}`;
            hint = 'Öffne die Browser-Konsole (F12) für Details';
        }

        Toast.show(msg, hint, 'error');

        // Statusbar updaten
        const el = document.getElementById('status-connection');
        if (el) { el.textContent = 'LUIS: Fehler'; el.className = 'status-offline'; }
    },

    /**
     * Baut die Basis-URL abhängig vom Proxy-Modus
     */
    get _baseUrl() {
        return CONFIG.proxy.enabled ? CONFIG.proxy.luisBase : CONFIG.luis.base;
    },

    /**
     * Baut die vollständige URL für einen FeatureServer-Endpoint
     */
    buildUrl(endpoint, params) {
        const url = this._baseUrl + CONFIG.luis.featureServer[endpoint] + '/query';
        const searchParams = new URLSearchParams({
            f: 'geojson',
            outFields: '*',
            outSR: 4326,           // WGS84 direkt anfordern
            returnGeometry: true,
            ...params
        });
        return `${url}?${searchParams.toString()}`;
    },

    /**
     * Baut die URL für einen MapServer-Export (Rasterbild)
     */
    buildMapServerUrl(endpoint) {
        return CONFIG.luis.base + CONFIG.luis.mapServer[endpoint] + '/export';
    },

    /**
     * Lädt Features innerhalb eines Bounding Box (Viewport)
     * @param {string} endpoint - Key aus CONFIG.luis.featureServer
     * @param {L.LatLngBounds} bounds - Leaflet Bounds
     * @param {object} options - Zusätzliche Query-Parameter
     * @returns {Promise<GeoJSON>}
     */
    async queryByBounds(endpoint, bounds, options = {}) {
        // Laufende Anfrage für diesen Endpoint abbrechen
        if (this._pending[endpoint]) {
            this._pending[endpoint].abort();
        }

        const controller = new AbortController();
        this._pending[endpoint] = controller;

        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;

        // Cache prüfen
        const cacheKey = `${endpoint}_${bbox}`;
        if (this._cache[cacheKey] && (Date.now() - this._cache[cacheKey].timestamp < 60000)) {
            return this._cache[cacheKey].features;
        }

        const params = {
            geometry: bbox,
            geometryType: 'esriGeometryEnvelope',
            inSR: 4326,
            spatialRel: 'esriSpatialRelIntersects',
            resultRecordCount: options.maxFeatures || CONFIG.query.maxFeatures,
            ...options
        };

        // WHERE-Clause falls vorhanden
        if (options.where) {
            params.where = options.where;
        } else {
            params.where = '1=1';
        }

        const url = this.buildUrl(endpoint, params);

        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`LUIS HTTP ${response.status}: ${response.statusText}`);
            }

            const geojson = await response.json();

            // Cache speichern
            this._cache[cacheKey] = {
                features: geojson,
                timestamp: Date.now()
            };

            delete this._pending[endpoint];
            this._retryCount[endpoint] = 0;
            return geojson;

        } catch (err) {
            delete this._pending[endpoint];

            if (err.name === 'AbortError') {
                return null; // Abgebrochene Anfrage ignorieren
            }

            console.warn(`[LUIS] Fehler bei ${endpoint}:`, err.message);
            this._showError(endpoint, err);

            // Einmal Retry (nicht bei CORS/Auth-Fehlern — die kommen immer wieder)
            const isCorsOrAuth = err.message && (
                err.message.includes('403') ||
                err.message.includes('401') ||
                err.message.toLowerCase().includes('cors') ||
                err.message.includes('Failed to fetch')
            );

            const retries = this._retryCount[endpoint] || 0;
            if (!isCorsOrAuth && retries < 2) {
                this._retryCount[endpoint] = retries + 1;
                const delay = Math.pow(2, retries) * 1000;
                await new Promise(r => setTimeout(r, delay));
                return this.queryByBounds(endpoint, bounds, options);
            }

            return null;
        }
    },

    /**
     * Lädt Features innerhalb eines Kreises (für Verschneidungs-Tool)
     * @param {string} endpoint - Key aus CONFIG.luis.featureServer
     * @param {L.LatLng} center - Kreismittelpunkt
     * @param {number} radiusMeters - Radius in Metern
     * @returns {Promise<GeoJSON>}
     */
    async queryByCircle(endpoint, center, radiusMeters) {
        const params = {
            geometry: JSON.stringify({
                x: center.lng,
                y: center.lat,
                spatialReference: { wkid: 4326 }
            }),
            geometryType: 'esriGeometryPoint',
            inSR: 4326,
            spatialRel: 'esriSpatialRelIntersects',
            distance: radiusMeters,
            units: 'esriSRUnit_Meter',
            where: '1=1',
            resultRecordCount: CONFIG.query.maxFeatures
        };

        const url = this.buildUrl(endpoint, params);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (err) {
            console.warn(`[LUIS] Circle-Query Fehler bei ${endpoint}:`, err.message);
            return null;
        }
    },

    /**
     * Lädt Features anhand einer WHERE-Clause (z.B. Gemeindename)
     * @param {string} endpoint
     * @param {string} whereClause - SQL WHERE
     * @returns {Promise<GeoJSON>}
     */
    async queryByAttribute(endpoint, whereClause) {
        const params = {
            where: whereClause,
            resultRecordCount: CONFIG.query.maxFeatures
        };

        const url = this.buildUrl(endpoint, params);

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (err) {
            console.warn(`[LUIS] Attribut-Query Fehler bei ${endpoint}:`, err.message);
            return null;
        }
    },

    /**
     * Verschneidet (intersect) Features eines Layers mit einer Geometrie
     * Verwendet TurfJS für clientseitige Verschneidung
     * @param {GeoJSON.FeatureCollection} layerFeatures - Features des Layers
     * @param {GeoJSON.Feature} clipGeometry - Schnittgeometrie (Kreis, Polygon)
     * @returns {object} - { intersecting: Feature[], statistics: {} }
     */
    intersectFeatures(layerFeatures, clipGeometry) {
        if (!layerFeatures || !layerFeatures.features) return { intersecting: [], statistics: {} };

        const intersecting = [];
        let totalArea = 0;
        let intersectArea = 0;

        layerFeatures.features.forEach(feature => {
            try {
                const intersection = turf.intersect(
                    turf.featureCollection([feature, clipGeometry])
                );
                if (intersection) {
                    intersecting.push({
                        original: feature,
                        intersection: intersection,
                        overlapArea: turf.area(intersection),
                        overlapPercent: 0 // berechnet unten
                    });
                    intersectArea += turf.area(intersection);
                }
                totalArea += turf.area(feature);
            } catch (e) {
                // Ungültige Geometrie überspringen
            }
        });

        // Prozent berechnen
        intersecting.forEach(item => {
            item.overlapPercent = totalArea > 0
                ? ((item.overlapArea / totalArea) * 100).toFixed(1)
                : 0;
        });

        return {
            intersecting,
            statistics: {
                totalFeatures: layerFeatures.features.length,
                intersectingCount: intersecting.length,
                totalAreaHa: (totalArea / 10000).toFixed(2),
                intersectAreaHa: (intersectArea / 10000).toFixed(2),
                overlapPercent: totalArea > 0
                    ? ((intersectArea / totalArea) * 100).toFixed(1)
                    : 0
            }
        };
    },

    /**
     * Prüft LUIS-Verfügbarkeit
     */
    async checkHealth() {
        try {
            const url = CONFIG.luis.base + '/contentSABE/verwaltungsgrenzen/FeatureServer?f=json';
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Leert den Cache
     */
    clearCache() {
        this._cache = {};
    }
};
