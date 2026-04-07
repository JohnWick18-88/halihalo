/* ============================================
   God's Eye Sachsen — Sidebar UI Module
   Layer-Tree rendern, Panel-Management,
   Suche, Toolbar
   ============================================ */

const Sidebar = {
    /**
     * Initialisiert die Sidebar
     */
    init() {
        this.renderLayerTree();
        this._bindEvents();
        this._bindSearch();
        this._bindToolbar();
    },

    /**
     * Rendert den hierarchischen Layer-Baum
     */
    renderLayerTree() {
        const container = document.getElementById('layer-tree');
        let html = '';

        LAYER_GROUPS.forEach(group => {
            const activeCount = group.layers.filter(l => l.active).length;
            const priorityClass = `priority-${group.priority}`;

            html += `
            <div class="layer-group" data-group="${group.id}">
                <div class="layer-group-header" data-group="${group.id}">
                    <span class="layer-group-toggle ${group.expanded ? 'open' : ''}">&blacktriangleright;</span>
                    <span class="layer-group-priority ${priorityClass}"></span>
                    <span class="layer-group-name">${group.name}</span>
                    <span class="layer-group-count">${activeCount}/${group.layers.length}</span>
                </div>
                <div class="layer-group-items ${group.expanded ? 'open' : ''}" data-group="${group.id}">`;

            group.layers.forEach(layer => {
                const typeClass = layer.type === 'fs' ? 'type-fs'
                    : (layer.type === 'local' ? 'type-local' : 'type-ms');
                const typeLabel = layer.type === 'fs' ? 'FS'
                    : (layer.type === 'local' ? 'LOK' : 'WMS');

                html += `
                    <div class="layer-item ${layer.active ? 'active' : ''}" data-layer="${layer.id}">
                        <input type="checkbox" ${layer.active ? 'checked' : ''} data-layer="${layer.id}" />
                        <span class="layer-item-name">${layer.name}</span>
                        <span class="layer-item-type ${typeClass}">${typeLabel}</span>
                    </div>
                    <div class="layer-opacity-row ${layer.active ? '' : 'hidden'}" data-opacity-for="${layer.id}">
                        <input type="range" class="opacity-slider" min="0" max="100" value="70"
                               data-layer="${layer.id}" title="Transparenz" />
                    </div>`;
            });

            html += `
                </div>
            </div>`;
        });

        container.innerHTML = html;
    },

    /**
     * Bindet Event-Handler für Layer-Tree
     */
    _bindEvents() {
        const container = document.getElementById('layer-tree');

        // Gruppe auf-/zuklappen
        container.addEventListener('click', (e) => {
            const header = e.target.closest('.layer-group-header');
            if (header) {
                const groupId = header.dataset.group;
                const items = container.querySelector(`.layer-group-items[data-group="${groupId}"]`);
                const toggle = header.querySelector('.layer-group-toggle');

                items.classList.toggle('open');
                toggle.classList.toggle('open');
            }
        });

        // Layer-Checkbox toggle
        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.layer) {
                const layerId = e.target.dataset.layer;
                const active = e.target.checked;

                // Layer in Registry aktualisieren
                if (LAYER_REGISTRY[layerId]) {
                    LAYER_REGISTRY[layerId].active = active;
                }

                // Layer auf Karte togglen
                GodsEyeMap.toggleLayer(layerId, active);

                // UI aktualisieren
                const item = e.target.closest('.layer-item');
                item.classList.toggle('active', active);

                // Gruppen-Zähler aktualisieren
                this._updateGroupCounts();

                // Opacity-Slider zeigen/verstecken
                const opacityRow = container.querySelector(`.layer-opacity-row[data-opacity-for="${layerId}"]`);
                if (opacityRow) opacityRow.classList.toggle('hidden', !active);
            }
        });

        // Opacity-Slider
        container.addEventListener('input', (e) => {
            if (e.target.classList.contains('opacity-slider')) {
                const layerId = e.target.dataset.layer;
                const opacity = e.target.value / 100;
                const info = LAYER_REGISTRY[layerId];
                if (!info) return;

                // WMS/MS Layer
                if (info.leafletLayer && info.leafletLayer.setOpacity) {
                    info.leafletLayer.setOpacity(opacity);
                }
                // FS Layer (GeoJSON)
                if (GodsEyeMap.featureLayers[layerId]) {
                    GodsEyeMap.featureLayers[layerId].eachLayer(l => {
                        if (l.setStyle) l.setStyle({ fillOpacity: opacity * 0.3, opacity: opacity });
                    });
                }
            }
        });

        // Sidebar Close Buttons
        document.querySelectorAll('.sidebar-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                document.getElementById(targetId).classList.add('hidden');
            });
        });

        // Topbar Buttons
        document.getElementById('btn-layers').addEventListener('click', () => {
            document.getElementById('sidebar-layers').classList.toggle('hidden');
        });

        // Feature-Click Event (von map.js)
        document.addEventListener('feature:click', async (e) => {
            const { feature, layerInfo } = e.detail;
            await this._handleFeatureClick(feature, layerInfo);
        });
    },

    /**
     * Suche initialisieren
     */
    _bindSearch() {
        const input = document.getElementById('search-input');
        let searchTimeout;

        input.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = input.value.trim();
                if (query.length >= 2) {
                    this._performSearch(query);
                }
            }, 300);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = input.value.trim();
                if (query.length >= 2) {
                    this._performSearch(query);
                    // Ersten Treffer direkt ansteuern
                    const results = Gemeinde.search(query);
                    if (results.length > 0) {
                        GodsEyeMap.zoomToGemeinde(results[0].gemeinde);
                        this._showGemeindeSteckbrief(results[0]);
                    }
                }
            }
        });
    },

    /**
     * Toolbar-Buttons binden
     */
    _bindToolbar() {
        const toolsBtn = document.getElementById('btn-tools');
        const exportBtn = document.getElementById('btn-export');

        // Tool-Panel erstellen
        const toolPanel = document.createElement('div');
        toolPanel.className = 'tool-panel';
        toolPanel.id = 'tool-panel';
        toolPanel.innerHTML = `
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);padding:4px 8px;">Auswahl & Verschneidung</div>
            <button class="tool-btn" data-tool="circle" title="Kreis zeichnen — alle Layer in der Auswahl verschneiden">Kreis-Auswahl</button>
            <button class="tool-btn" data-tool="polygon" title="Polygon zeichnen — freie Auswahl">Polygon-Auswahl</button>
            <button class="tool-btn" data-tool="rectangle" title="Rechteck zeichnen">Rechteck-Auswahl</button>
            <button class="tool-btn" data-tool="clear" title="Auswahl löschen">Auswahl löschen</button>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);padding:8px 8px 4px;">Analyse</div>
            <button class="tool-btn" data-tool="heatmap" title="Restriktions-Heatmap: Gemeinden einfärben nach Schutzgebiet-Anteil">Heatmap Restriktionen</button>
            <button class="tool-btn" data-tool="wiedervorlage" title="Wiedervorlagen anzeigen">Wiedervorlagen</button>
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);padding:8px 8px 4px;">Export</div>
            <button class="tool-btn" data-tool="export-geojson" title="Verschneidung als GeoJSON exportieren">GeoJSON Export</button>
            <button class="tool-btn" data-tool="export-kontakte" title="Alle Kontaktdaten exportieren">Kontakte Export</button>
        `;
        document.getElementById('main-container').appendChild(toolPanel);

        toolsBtn.addEventListener('click', () => {
            toolPanel.classList.toggle('visible');
            toolsBtn.classList.toggle('active');
        });

        toolPanel.addEventListener('click', (e) => {
            const btn = e.target.closest('.tool-btn');
            if (!btn) return;

            const tool = btn.dataset.tool;
            const map = GodsEyeMap.map;

            // Alle Tool-Buttons deaktivieren
            toolPanel.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));

            switch (tool) {
                case 'circle':
                    btn.classList.add('active');
                    SpatialTools.startCircleDraw(map);
                    break;
                case 'polygon':
                    btn.classList.add('active');
                    SpatialTools.startPolygonDraw(map);
                    break;
                case 'rectangle':
                    btn.classList.add('active');
                    SpatialTools.startRectangleDraw(map);
                    break;
                case 'clear':
                    SpatialTools.deactivate();
                    Distance.clearLines();
                    document.getElementById('info-content').innerHTML =
                        '<p class="info-placeholder">Klicke auf eine Gemeinde oder ein Flurstück, um Details zu sehen.</p>';
                    break;
                case 'heatmap':
                    const isActive = Heatmap.toggle(map);
                    btn.classList.toggle('active', isActive);
                    break;
                case 'wiedervorlage':
                    Wiedervorlage.showFullList();
                    break;
                case 'export-geojson':
                    SpatialTools.exportResults();
                    break;
                case 'export-kontakte':
                    Kontakt.exportData();
                    break;
            }
        });

        // Export-Button
        exportBtn.addEventListener('click', () => {
            SpatialTools.exportResults();
        });
    },

    /**
     * Feature-Click Handler — öffnet Steckbrief
     */
    async _handleFeatureClick(feature, layerInfo) {
        const sidebar = document.getElementById('sidebar-info');
        const title = document.getElementById('info-title');
        const content = document.getElementById('info-content');

        sidebar.classList.remove('hidden');

        // Gemeinde-Click?
        const gemeindeName = feature.properties?.GEMEINDE
            || feature.properties?.gemeinde
            || feature.properties?.NAME;

        if (gemeindeName && (layerInfo.id === 'gemeindegrenzen' || layerInfo.endpoint === 'gemeindegrenzen')) {
            const gemeindeData = Gemeinde.findByName(gemeindeName);

            title.textContent = gemeindeName;
            content.innerHTML = '<div class="loading-spinner"></div><p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:8px;">Verschneide Layer & berechne Score...</p>';

            // Auto-Load: Gemarkungen + Flurstücke für diese Gemeinde aktivieren
            if (!LAYER_REGISTRY['gemarkungen']?.active) {
                GodsEyeMap.toggleLayer('gemarkungen', true);
                const checkbox = document.querySelector(`input[data-layer="gemarkungen"]`);
                if (checkbox) checkbox.checked = true;
            }

            // Parallel: Verschneidung + Entfernungen
            const [restriktionen, distances] = await Promise.all([
                Gemeinde.analyzeRestriktionen(feature),
                Distance.calculateAll(feature, GodsEyeMap.map)
            ]);

            // Entfernungslinien zeichnen
            Distance.drawDistanceLines(feature, distances);

            if (gemeindeData) {
                // Heatmap-Daten falls vorhanden
                const heatData = Heatmap.getGemeindeData(gemeindeName);

                let html = Gemeinde.renderSteckbrief(gemeindeData, restriktionen);

                // PDF-Export Button einfügen
                html += `<div class="steckbrief-section">
                    <button class="btn-primary" style="width:100%"
                        onclick="PDFExport.exportSteckbrief(
                            Gemeinde.findByName('${gemeindeName}'),
                            ${JSON.stringify(restriktionen).replace(/'/g, "\\'")},
                            null,
                            ${JSON.stringify(distances).replace(/'/g, "\\'")}
                        )">
                        Steckbrief als PDF exportieren
                    </button>
                </div>`;

                content.innerHTML = html;
                this._bindStatusSelector(gemeindeData.gemeinde);
            } else {
                content.innerHTML = Gemeinde.renderFlurstueckSteckbrief(feature, restriktionen);
            }
            return;
        }

        // Flurstück-Click?
        if (layerInfo.id === 'flurstuecke' || layerInfo.endpoint === 'flurstuecke') {
            title.textContent = `Flurstück ${feature.properties?.FLSTNRZAE || ''}`;
            content.innerHTML = '<div class="loading-spinner"></div><p style="color:var(--text-muted);font-size:12px;text-align:center;margin-top:8px;">Analysiere Eignung + Entfernungen...</p>';

            const bounds = GodsEyeMap.map.getBounds();

            // Parallel: Verschneidung, Entfernungen, Score
            const verschneidungsLayer = getVerschneidungsLayer().filter(l => l.active);
            const verschneidung = {};
            const overlaps = {};

            for (const vl of verschneidungsLayer) {
                const geojson = await LuisAPI.queryByBounds(vl.endpoint, bounds);
                if (geojson && geojson.features) {
                    const result = LuisAPI.intersectFeatures(geojson, feature);
                    verschneidung[vl.name] = result.statistics;
                    // Für Scoring: boolean overlap
                    overlaps[vl.endpoint || vl.id] = result.statistics.intersectingCount > 0;
                }
            }

            // Entfernungen berechnen
            const distances = await Distance.calculateAll(feature, GodsEyeMap.map);

            // Entfernungslinien zeichnen
            Distance.drawDistanceLines(feature, distances);

            // Eignungs-Score berechnen
            const scoreResult = Scoring.evaluate(overlaps, distances, feature.properties);

            // Steckbrief + Score + Verschneidung rendern
            let html = Gemeinde.renderFlurstueckSteckbrief(feature, verschneidung);
            html += Scoring.renderScoreHTML(scoreResult);

            // PDF-Export Button
            const gemeindeProp = feature.properties?.GEMEINDE || feature.properties?.gemeinde;
            const gemeindeData = gemeindeProp ? Gemeinde.findByName(gemeindeProp) : null;
            if (gemeindeData) {
                html += `<div class="steckbrief-section">
                    <button class="btn-primary" style="width:100%"
                        onclick="PDFExport.exportSteckbrief(
                            Gemeinde.findByName('${gemeindeProp}'),
                            ${JSON.stringify(verschneidung).replace(/'/g, "\\'")},
                            null,
                            ${JSON.stringify(distances).replace(/'/g, "\\'")}
                        )">
                        Steckbrief als PDF exportieren
                    </button>
                </div>`;
            }

            content.innerHTML = html;
            return;
        }

        // Generischer Feature-Click
        title.textContent = feature.properties?.NAME || feature.properties?.BEZEICHNUNG || layerInfo.name;
        let html = '<div class="steckbrief"><div class="steckbrief-section"><h3>Attribute</h3>';
        Object.entries(feature.properties || {}).forEach(([key, val]) => {
            if (val && val !== 'null') {
                html += `<div class="steckbrief-field">
                    <span class="label">${key}</span>
                    <span class="value">${val}</span>
                </div>`;
            }
        });
        html += '</div></div>';
        content.innerHTML = html;
    },

    /**
     * Suche durchführen und Ergebnisse anzeigen
     */
    _performSearch(query) {
        const results = Gemeinde.search(query);
        if (results.length === 0) return;

        // Ergebnisliste in Sidebar anzeigen
        const content = document.getElementById('info-content');
        const sidebar = document.getElementById('sidebar-info');
        document.getElementById('info-title').textContent = `Suche: "${query}"`;
        sidebar.classList.remove('hidden');

        let html = '<div class="steckbrief">';
        results.forEach(g => {
            const status = Kontakt.getStatus(g.gemeinde) || 'offen';
            html += `
            <div class="layer-item" style="padding:10px 16px;cursor:pointer;" onclick="Sidebar._selectSearchResult('${g.gemeinde}')">
                <span class="status-badge status-${status}" style="width:8px;height:8px;padding:0;border-radius:50%;"></span>
                <span class="layer-item-name" style="color:var(--text-primary)">${g.gemeinde}</span>
                <span style="font-size:11px;color:var(--text-muted)">${g.landkreis || ''}</span>
            </div>`;
        });
        html += '</div>';
        content.innerHTML = html;
    },

    /**
     * Suchergebnis ansteuern
     */
    async _selectSearchResult(gemeindeName) {
        const feature = await GodsEyeMap.zoomToGemeinde(gemeindeName);
        if (feature) {
            const gemeindeData = Gemeinde.findByName(gemeindeName);
            if (gemeindeData) {
                this._showGemeindeSteckbrief(gemeindeData);
            }
        }
    },

    /**
     * Gemeinde-Steckbrief anzeigen
     */
    _showGemeindeSteckbrief(gemeindeData) {
        document.getElementById('info-title').textContent = gemeindeData.gemeinde;
        document.getElementById('info-content').innerHTML = Gemeinde.renderSteckbrief(gemeindeData);
        document.getElementById('sidebar-info').classList.remove('hidden');
        this._bindStatusSelector(gemeindeData.gemeinde);
    },

    /**
     * Status-Selector Event-Handler binden
     */
    _bindStatusSelector(gemeindeName) {
        const selector = document.querySelector(`.status-selector[data-gemeinde="${gemeindeName}"]`);
        if (!selector) return;

        selector.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const newStatus = btn.dataset.status;
                Kontakt.setStatus(gemeindeName, newStatus);

                // UI aktualisieren
                selector.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    },

    /**
     * Aktualisiert die Layer-Gruppen-Zähler
     */
    _updateGroupCounts() {
        LAYER_GROUPS.forEach(group => {
            const activeCount = group.layers.filter(l => LAYER_REGISTRY[l.id]?.active).length;
            const countEl = document.querySelector(
                `.layer-group[data-group="${group.id}"] .layer-group-count`
            );
            if (countEl) {
                countEl.textContent = `${activeCount}/${group.layers.length}`;
            }
        });
    }
};
