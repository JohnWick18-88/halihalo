/* ============================================
   God's Eye Sachsen — Wiedervorlage-System
   Erinnerungen beim App-Start, sortierte Liste,
   Datum-basierte Benachrichtigungen
   ============================================ */

const Wiedervorlage = {
    STORAGE_KEY: 'gods_eye_wiedervorlage',
    _data: {},   // gemeindeName → { datum, notiz, prioritaet }

    /**
     * Initialisiert und lädt aus localStorage
     */
    init() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            this._data = stored ? JSON.parse(stored) : {};
        } catch {
            this._data = {};
        }

        // Auch aus Gemeindeindex laden (Spalte 'wiedervorlage')
        if (Gemeinde.loaded) {
            Gemeinde.index.forEach(g => {
                if (g.wiedervorlage && !this._data[g.gemeinde]) {
                    this._data[g.gemeinde] = {
                        datum: this._parseDate(g.wiedervorlage),
                        notiz: g.todo || '',
                        prioritaet: 'normal',
                        quelle: 'excel'
                    };
                }
            });
        }
    },

    /**
     * Speichert in localStorage
     */
    _save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._data));
    },

    /**
     * Setzt eine Wiedervorlage für eine Gemeinde
     */
    set(gemeindeName, datum, notiz = '', prioritaet = 'normal') {
        this._data[gemeindeName] = {
            datum: datum,  // ISO String: '2026-04-15'
            notiz,
            prioritaet,    // 'hoch' | 'normal' | 'niedrig'
            erstellt: new Date().toISOString(),
            quelle: 'manuell'
        };
        this._save();
    },

    /**
     * Löscht eine Wiedervorlage
     */
    remove(gemeindeName) {
        delete this._data[gemeindeName];
        this._save();
    },

    /**
     * Gibt alle fälligen Wiedervorlagen zurück (heute oder überfällig)
     */
    getFaellige() {
        const heute = new Date().toISOString().slice(0, 10);
        return Object.entries(this._data)
            .filter(([, wv]) => wv.datum && wv.datum <= heute)
            .map(([gemeinde, wv]) => ({ gemeinde, ...wv }))
            .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    },

    /**
     * Gibt alle anstehenden Wiedervorlagen zurück (nächste 7 Tage)
     */
    getAnstehende(tage = 7) {
        const heute = new Date();
        const bis = new Date(heute.getTime() + tage * 86400000).toISOString().slice(0, 10);
        const heuteStr = heute.toISOString().slice(0, 10);

        return Object.entries(this._data)
            .filter(([, wv]) => wv.datum && wv.datum > heuteStr && wv.datum <= bis)
            .map(([gemeinde, wv]) => ({ gemeinde, ...wv }))
            .sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    },

    /**
     * Gibt alle Wiedervorlagen sortiert zurück
     */
    getAll() {
        return Object.entries(this._data)
            .map(([gemeinde, wv]) => ({ gemeinde, ...wv }))
            .sort((a, b) => (a.datum || '9999').localeCompare(b.datum || '9999'));
    },

    /**
     * Zeigt Benachrichtigung beim App-Start
     */
    showStartNotification() {
        const faellige = this.getFaellige();
        const anstehende = this.getAnstehende(7);

        if (faellige.length === 0 && anstehende.length === 0) return;

        // Notification-Banner erstellen
        const banner = document.createElement('div');
        banner.id = 'wiedervorlage-banner';
        banner.style.cssText = `
            position: fixed; top: 56px; left: 50%; transform: translateX(-50%);
            background: var(--bg-secondary); border: 1px solid var(--border-light);
            border-radius: 8px; padding: 14px 20px; z-index: 2000;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6); max-width: 500px; width: 90%;
        `;

        let html = '';

        if (faellige.length > 0) {
            html += `<div style="color:var(--accent-red);font-weight:700;font-size:13px;margin-bottom:8px;">
                ${faellige.length} fällige Wiedervorlage${faellige.length > 1 ? 'n' : ''}
            </div>`;

            faellige.forEach(wv => {
                const tageUeber = Math.floor((Date.now() - new Date(wv.datum).getTime()) / 86400000);
                html += `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
                    <span style="color:var(--text-primary);cursor:pointer;text-decoration:underline;"
                          onclick="Sidebar._selectSearchResult('${wv.gemeinde}');document.getElementById('wiedervorlage-banner')?.remove()">
                        ${wv.gemeinde}
                    </span>
                    <span style="color:var(--accent-red);">${tageUeber > 0 ? `${tageUeber} Tage überfällig` : 'Heute'}</span>
                </div>`;
                if (wv.notiz) {
                    html += `<div style="font-size:11px;color:var(--text-muted);padding-left:8px;margin-bottom:2px;">${wv.notiz}</div>`;
                }
            });
        }

        if (anstehende.length > 0) {
            html += `<div style="color:var(--accent-yellow);font-weight:700;font-size:13px;margin-top:${faellige.length > 0 ? '10px' : '0'};margin-bottom:8px;">
                ${anstehende.length} anstehende Wiedervorlage${anstehende.length > 1 ? 'n' : ''} (nächste 7 Tage)
            </div>`;

            anstehende.slice(0, 5).forEach(wv => {
                html += `<div style="display:flex;justify-content:space-between;padding:3px 0;font-size:12px;">
                    <span style="color:var(--text-primary);cursor:pointer;text-decoration:underline;"
                          onclick="Sidebar._selectSearchResult('${wv.gemeinde}');document.getElementById('wiedervorlage-banner')?.remove()">
                        ${wv.gemeinde}
                    </span>
                    <span style="color:var(--text-secondary);">${new Date(wv.datum).toLocaleDateString('de-DE')}</span>
                </div>`;
            });
        }

        // Schließen-Button
        html += `<div style="text-align:right;margin-top:10px;">
            <button onclick="document.getElementById('wiedervorlage-banner')?.remove()"
                style="background:var(--bg-tertiary);border:1px solid var(--border-light);color:var(--text-secondary);
                padding:5px 14px;border-radius:4px;cursor:pointer;font-size:11px;">
                Schließen
            </button>
            <button onclick="Wiedervorlage.showFullList();document.getElementById('wiedervorlage-banner')?.remove()"
                style="background:var(--accent-blue);border:none;color:white;
                padding:5px 14px;border-radius:4px;cursor:pointer;font-size:11px;margin-left:6px;">
                Alle anzeigen
            </button>
        </div>`;

        banner.innerHTML = html;
        document.body.appendChild(banner);

        // Auto-Hide nach 15 Sekunden
        setTimeout(() => {
            banner?.remove();
        }, 15000);
    },

    /**
     * Zeigt vollständige Wiedervorlage-Liste im Sidebar
     */
    showFullList() {
        const all = this.getAll();
        const heute = new Date().toISOString().slice(0, 10);

        let html = '<div class="steckbrief">';
        html += `<div class="steckbrief-section">
            <h3>Alle Wiedervorlagen (${all.length})</h3>`;

        if (all.length === 0) {
            html += '<p style="color:var(--text-muted);font-size:12px;">Keine Wiedervorlagen vorhanden.</p>';
        } else {
            all.forEach(wv => {
                const istFaellig = wv.datum && wv.datum <= heute;
                const farbe = istFaellig ? 'var(--accent-red)' : 'var(--text-secondary)';

                html += `
                <div style="padding:8px 0;border-bottom:1px solid var(--border);">
                    <div style="display:flex;justify-content:space-between;">
                        <span style="color:var(--text-primary);font-weight:600;cursor:pointer;"
                              onclick="Sidebar._selectSearchResult('${wv.gemeinde}')">
                            ${wv.gemeinde}
                        </span>
                        <span style="color:${farbe};font-size:11px;">
                            ${wv.datum ? new Date(wv.datum).toLocaleDateString('de-DE') : '—'}
                            ${istFaellig ? ' (fällig!)' : ''}
                        </span>
                    </div>
                    ${wv.notiz ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${wv.notiz}</div>` : ''}
                </div>`;
            });
        }

        // Neue Wiedervorlage Formular
        html += `
        </div>
        <div class="steckbrief-section">
            <h3>Neue Wiedervorlage</h3>
            <input type="text" id="wv-gemeinde" placeholder="Gemeindename" class="kontakt-textarea" style="min-height:auto;margin-bottom:6px;" />
            <input type="date" id="wv-datum" class="kontakt-textarea" style="min-height:auto;margin-bottom:6px;" />
            <textarea class="kontakt-textarea" id="wv-notiz" placeholder="Notiz / To-Do..."></textarea>
            <button class="btn-primary btn-small" style="margin-top:6px;width:100%"
                onclick="Wiedervorlage.set(
                    document.getElementById('wv-gemeinde').value,
                    document.getElementById('wv-datum').value,
                    document.getElementById('wv-notiz').value
                ); Wiedervorlage.showFullList();">
                Wiedervorlage speichern
            </button>
        </div>`;

        html += '</div>';

        document.getElementById('info-title').textContent = 'Wiedervorlagen';
        document.getElementById('info-content').innerHTML = html;
        document.getElementById('sidebar-info').classList.remove('hidden');
    },

    /**
     * Versucht ein Datum aus verschiedenen Formaten zu parsen
     */
    _parseDate(dateStr) {
        if (!dateStr) return null;
        // ISO
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);
        // DE Format: dd.mm.yyyy
        const deMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (deMatch) return `${deMatch[3]}-${deMatch[2].padStart(2, '0')}-${deMatch[1].padStart(2, '0')}`;
        return null;
    }
};
