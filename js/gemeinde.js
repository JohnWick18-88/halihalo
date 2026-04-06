/* ============================================
   God's Eye Sachsen — Gemeinde Module
   Gemeindeindex laden, Steckbrief anzeigen,
   Suche, Gemeinde-Status-Verwaltung
   ============================================ */

const Gemeinde = {
    index: [],            // Array aller 428 Gemeinden
    indexByName: {},       // Gemeindename → Gemeindeobj
    indexBySchlnr: {},     // Gemeindeschlüssel → Gemeindeobj
    loaded: false,

    /**
     * Lädt den Gemeindeindex aus der JSON-Datei
     * (aus der Excel konvertiert)
     */
    async loadIndex() {
        try {
            const response = await fetch('data/gemeinden.json');
            if (!response.ok) {
                console.warn('[Gemeinde] gemeinden.json nicht gefunden — Dummy-Daten werden verwendet');
                this._loadDummyData();
                return;
            }
            this.index = await response.json();
            this._buildLookups();
            this.loaded = true;
            console.log(`[Gemeinde] ${this.index.length} Gemeinden geladen`);
        } catch (err) {
            console.warn('[Gemeinde] Fehler beim Laden:', err.message);
            this._loadDummyData();
        }
    },

    /**
     * Erstellt Lookup-Maps für schnellen Zugriff
     */
    _buildLookups() {
        this.index.forEach(g => {
            if (g.gemeinde) this.indexByName[g.gemeinde.toUpperCase()] = g;
            if (g.schlnr) this.indexBySchlnr[g.schlnr] = g;
        });
    },

    /**
     * Dummy-Daten bis echte gemeinden.json existiert
     */
    _loadDummyData() {
        this.index = [];
        this.loaded = true;
    },

    /**
     * Sucht Gemeinden nach Name (Fuzzy)
     * @param {string} query - Suchbegriff
     * @returns {Array} - Matching Gemeinden
     */
    search(query) {
        if (!query || query.length < 2) return [];
        const q = query.toUpperCase();
        return this.index.filter(g =>
            (g.gemeinde && g.gemeinde.toUpperCase().includes(q)) ||
            (g.ortsteile && g.ortsteile.toUpperCase().includes(q)) ||
            (g.plz && g.plz.includes(q))
        ).slice(0, 20);
    },

    /**
     * Findet eine Gemeinde anhand des Namens
     */
    findByName(name) {
        return this.indexByName[name.toUpperCase()] || null;
    },

    /**
     * Erzeugt HTML für den Steckbrief einer Gemeinde
     * @param {object} gemeinde - Gemeinde-Objekt aus Index
     * @param {object} spatialData - Verschneidungsergebnis (optional)
     * @returns {string} HTML
     */
    renderSteckbrief(gemeinde, spatialData = null) {
        const g = gemeinde;
        const status = Kontakt.getStatus(g.gemeinde) || 'offen';
        const statusLabel = { gruen: 'Positiv', gelb: 'Neutral', rot: 'Ablehnend', offen: 'Offen' };
        const statusClass = `status-${status}`;

        let html = `<div class="steckbrief">`;

        // ---- Verwaltung ----
        html += `
        <div class="steckbrief-section">
            <h3>Verwaltung</h3>
            <div class="steckbrief-field">
                <span class="label">Gemeinde</span>
                <span class="value">${g.gemeinde || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Landkreis</span>
                <span class="value">${g.landkreis || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">PLZ</span>
                <span class="value">${g.plz || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Ortsteile</span>
                <span class="value">${g.ortsteile || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Status</span>
                <span class="value"><span class="status-badge ${statusClass}">${statusLabel[status]}</span></span>
            </div>
        </div>`;

        // ---- Bürgermeister ----
        html += `
        <div class="steckbrief-section">
            <h3>Bürgermeister</h3>
            <div class="steckbrief-field">
                <span class="label">Name</span>
                <span class="value">${g.bm_name || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Titel</span>
                <span class="value">${g.bm_titel || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Amt</span>
                <span class="value">${g.bm_status || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Telefon</span>
                <span class="value">${g.telefon ? `<a href="tel:${g.telefon}" style="color:var(--accent-cyan)">${g.telefon}</a>` : '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Fax</span>
                <span class="value">${g.fax || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Email</span>
                <span class="value">${g.email ? `<a href="mailto:${g.email}" style="color:var(--accent-cyan)">${g.email}</a>` : '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Homepage</span>
                <span class="value">${g.homepage ? `<a href="${g.homepage}" target="_blank" style="color:var(--accent-cyan)">Link</a>` : '—'}</span>
            </div>
        </div>`;

        // ---- Planungsdaten ----
        html += `
        <div class="steckbrief-section">
            <h3>Planung & Energie</h3>
            <div class="steckbrief-field">
                <span class="label">Regionalplan</span>
                <span class="value">${g.regionalplan || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">FNP</span>
                <span class="value">${g.fnp || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">B-Plan</span>
                <span class="value">${g.bplan || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Energiekonzept</span>
                <span class="value">${g.energiekonzept || '—'}</span>
            </div>
        </div>`;

        // ---- Verschneidungsergebnis ----
        if (spatialData) {
            html += `
            <div class="steckbrief-section">
                <h3>Verschneidungsanalyse</h3>`;

            Object.entries(spatialData).forEach(([layerName, stats]) => {
                html += `
                <div class="steckbrief-field">
                    <span class="label">${layerName}</span>
                    <span class="value">${stats.intersectAreaHa} ha (${stats.overlapPercent}%)</span>
                </div>`;
            });

            html += `</div>`;
        }

        // ---- Konflikte & Hinweise ----
        if (g.konflikte || g.wichtig) {
            html += `
            <div class="steckbrief-section">
                <h3>Konflikte & Hinweise</h3>
                ${g.konflikte ? `<p style="color:var(--accent-yellow);font-size:12px;">${g.konflikte}</p>` : ''}
                ${g.wichtig ? `<p style="color:var(--text-secondary);font-size:12px;margin-top:4px;">${g.wichtig}</p>` : ''}
            </div>`;
        }

        // ---- Bearbeitungsstand ----
        if (g.bearb_stand) {
            html += `
            <div class="steckbrief-section">
                <h3>Bearbeitungsstand</h3>
                <p style="color:var(--text-secondary);font-size:12px;white-space:pre-wrap;">${g.bearb_stand}</p>
            </div>`;
        }

        // ---- Status-Auswahl ----
        html += `
        <div class="steckbrief-section">
            <h3>Status setzen</h3>
            <div class="status-selector" data-gemeinde="${g.gemeinde}">
                <button class="sel-gruen ${status === 'gruen' ? 'selected' : ''}" data-status="gruen">Positiv</button>
                <button class="sel-gelb ${status === 'gelb' ? 'selected' : ''}" data-status="gelb">Neutral</button>
                <button class="sel-rot ${status === 'rot' ? 'selected' : ''}" data-status="rot">Ablehnend</button>
                <button class="sel-offen ${status === 'offen' ? 'selected' : ''}" data-status="offen">Offen</button>
            </div>
        </div>`;

        // ---- Kontaktverlauf ----
        html += `
        <div class="steckbrief-section">
            <h3>Kontaktverlauf</h3>
            <div id="kontakt-verlauf-${g.gemeinde}">
                ${Kontakt.renderVerlauf(g.gemeinde)}
            </div>
            <textarea class="kontakt-textarea" id="kontakt-notiz-${g.gemeinde}" placeholder="Neue Notiz zum Kontaktverlauf..."></textarea>
            <button class="btn-primary btn-small" style="margin-top:6px;width:100%"
                onclick="Kontakt.addEntry('${g.gemeinde}', document.getElementById('kontakt-notiz-${g.gemeinde}').value)">
                Notiz speichern
            </button>
        </div>`;

        html += `</div>`;
        return html;
    },

    /**
     * Erzeugt HTML für den Steckbrief eines Flurstücks
     */
    renderFlurstueckSteckbrief(feature, verschneidung = {}) {
        const p = feature.properties || {};

        let html = `<div class="steckbrief">`;

        html += `
        <div class="steckbrief-section">
            <h3>Flurstück</h3>
            <div class="steckbrief-field">
                <span class="label">Nummer</span>
                <span class="value">${p.FLSTNRZAE || p.flstnrzae || '—'}/${p.FLSTNRNEN || p.flstnrnen || ''}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Gemarkung</span>
                <span class="value">${p.GEMARKUNG || p.gemarkung || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Gemeinde</span>
                <span class="value">${p.GEMEINDE || p.gemeinde || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Fläche</span>
                <span class="value">${p.FLAECHE ? (p.FLAECHE / 10000).toFixed(2) + ' ha' : '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Nutzungsart</span>
                <span class="value">${p.NUTZUNG || p.nutzungsart || '—'}</span>
            </div>
            <div class="steckbrief-field">
                <span class="label">Eigentumstyp</span>
                <span class="value">${p.EIGENTUMSTYP || p.eigentum || '—'}</span>
            </div>
        </div>`;

        // Verschneidung mit Schutzgebieten
        if (Object.keys(verschneidung).length > 0) {
            html += `
            <div class="steckbrief-section">
                <h3>Restriktionen auf diesem Flurstück</h3>`;

            Object.entries(verschneidung).forEach(([layerName, result]) => {
                const color = result.intersectingCount > 0 ? 'var(--accent-red)' : 'var(--accent-green)';
                html += `
                <div class="steckbrief-field">
                    <span class="label">${layerName}</span>
                    <span class="value" style="color:${color}">
                        ${result.intersectingCount > 0
                            ? `${result.intersectAreaHa} ha (${result.overlapPercent}%)`
                            : 'Keine Überlappung'}
                    </span>
                </div>`;
            });

            html += `</div>`;
        }

        html += `</div>`;
        return html;
    },

    /**
     * Verschneidet ein Feature mit allen aktiven Schutzgebiet-Layern
     * @param {GeoJSON.Feature} feature
     * @returns {Promise<object>} layerName → Verschneidungsstatistik
     */
    async analyzeRestriktionen(feature) {
        const results = {};
        const verschneidungsLayer = getVerschneidungsLayer();
        const bounds = GodsEyeMap.map.getBounds();

        for (const layerDef of verschneidungsLayer) {
            if (!layerDef.active) continue;

            // Layer-Daten holen
            const geojson = await LuisAPI.queryByBounds(layerDef.endpoint, bounds);
            if (!geojson || !geojson.features) continue;

            // Verschneidung berechnen
            const result = LuisAPI.intersectFeatures(geojson, feature);
            results[layerDef.name] = result.statistics;
        }

        return results;
    }
};
