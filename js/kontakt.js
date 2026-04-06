/* ============================================
   God's Eye Sachsen — Kontaktverlauf Module
   localStorage-basierte Kontaktverwaltung
   Status-Tracking (grün/gelb/rot/offen)
   ============================================ */

const Kontakt = {
    STORAGE_KEY: 'gods_eye_kontakte',
    _data: null,  // { gemeindeName: { status, verlauf: [] } }

    /**
     * Lädt Kontaktdaten aus localStorage
     */
    init() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            this._data = stored ? JSON.parse(stored) : {};
        } catch {
            this._data = {};
        }
    },

    /**
     * Speichert in localStorage
     */
    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
        } catch (err) {
            console.warn('[Kontakt] Speichern fehlgeschlagen:', err.message);
        }
    },

    /**
     * Gibt den Status einer Gemeinde zurück
     * @returns {'gruen'|'gelb'|'rot'|'offen'|null}
     */
    getStatus(gemeindeName) {
        return this._data[gemeindeName]?.status || null;
    },

    /**
     * Setzt den Status einer Gemeinde
     */
    setStatus(gemeindeName, status) {
        if (!this._data[gemeindeName]) {
            this._data[gemeindeName] = { status, verlauf: [] };
        } else {
            this._data[gemeindeName].status = status;
        }

        // Automatischer Verlauf-Eintrag
        this._data[gemeindeName].verlauf.push({
            date: new Date().toISOString(),
            note: `Status geändert auf: ${status}`,
            type: 'status'
        });

        this._save();

        // Map-Styling aktualisieren
        this._updateGemeindeStyle(gemeindeName, status);
    },

    /**
     * Fügt einen Kontaktverlauf-Eintrag hinzu
     */
    addEntry(gemeindeName, note) {
        if (!note || !note.trim()) return;

        if (!this._data[gemeindeName]) {
            this._data[gemeindeName] = { status: 'offen', verlauf: [] };
        }

        this._data[gemeindeName].verlauf.push({
            date: new Date().toISOString(),
            note: note.trim(),
            type: 'kontakt'
        });

        this._save();

        // UI aktualisieren
        const container = document.getElementById(`kontakt-verlauf-${gemeindeName}`);
        if (container) {
            container.innerHTML = this.renderVerlauf(gemeindeName);
        }

        // Textarea leeren
        const textarea = document.getElementById(`kontakt-notiz-${gemeindeName}`);
        if (textarea) textarea.value = '';
    },

    /**
     * Rendert den Kontaktverlauf als HTML
     */
    renderVerlauf(gemeindeName) {
        const data = this._data[gemeindeName];
        if (!data || !data.verlauf || data.verlauf.length === 0) {
            return '<p style="color:var(--text-muted);font-size:12px;font-style:italic;">Noch keine Einträge.</p>';
        }

        // Neueste zuerst
        const entries = [...data.verlauf].reverse();
        let html = '';

        entries.forEach(entry => {
            const date = new Date(entry.date);
            const dateStr = date.toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const borderColor = entry.type === 'status'
                ? 'var(--accent-purple)'
                : 'var(--accent-blue)';

            html += `
            <div class="kontakt-entry" style="border-left-color:${borderColor}">
                <span class="date">${dateStr}</span>
                <div class="note">${entry.note}</div>
            </div>`;
        });

        return html;
    },

    /**
     * Aktualisiert das Gemeinde-Styling auf der Karte (Umrandung grün/gelb/rot)
     */
    _updateGemeindeStyle(gemeindeName, status) {
        const gemeindeLayer = GodsEyeMap.featureLayers['gemeindegrenzen'];
        if (!gemeindeLayer) return;

        gemeindeLayer.eachLayer(layer => {
            const name = layer.feature?.properties?.GEMEINDE
                || layer.feature?.properties?.NAME;
            if (name && name.toUpperCase() === gemeindeName.toUpperCase()) {
                const color = CONFIG.statusColors[status] || CONFIG.statusColors.offen;
                layer.setStyle({
                    color: color,
                    weight: 3,
                    opacity: 0.9,
                    fillColor: color,
                    fillOpacity: 0.08
                });
            }
        });
    },

    /**
     * Wendet gespeicherte Status-Farben auf alle sichtbaren Gemeinden an
     */
    applyAllStatusColors() {
        const gemeindeLayer = GodsEyeMap.featureLayers['gemeindegrenzen'];
        if (!gemeindeLayer) return;

        gemeindeLayer.eachLayer(layer => {
            const name = layer.feature?.properties?.GEMEINDE
                || layer.feature?.properties?.NAME;
            if (name) {
                const status = this.getStatus(name);
                if (status && status !== 'offen') {
                    this._updateGemeindeStyle(name, status);
                }
            }
        });
    },

    /**
     * Exportiert alle Kontaktdaten als JSON
     */
    exportData() {
        const blob = new Blob(
            [JSON.stringify(this._data, null, 2)],
            { type: 'application/json' }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `kontaktverlauf_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Importiert Kontaktdaten aus JSON
     */
    importData(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            // Merge mit bestehenden Daten
            Object.entries(imported).forEach(([name, data]) => {
                if (!this._data[name]) {
                    this._data[name] = data;
                } else {
                    // Verlauf zusammenführen
                    this._data[name].verlauf = [
                        ...this._data[name].verlauf,
                        ...data.verlauf
                    ];
                    // Neueren Status übernehmen
                    if (data.status) this._data[name].status = data.status;
                }
            });
            this._save();
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Statistik über alle Kontakte
     */
    getStatistics() {
        const stats = { gruen: 0, gelb: 0, rot: 0, offen: 0, total: 0 };
        Object.values(this._data).forEach(d => {
            stats[d.status || 'offen']++;
            stats.total++;
        });
        return stats;
    }
};
