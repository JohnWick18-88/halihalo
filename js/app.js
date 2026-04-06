/* ============================================
   God's Eye Sachsen — Main Application
   Initialisierung aller Module
   ============================================ */

const App = {
    async init() {
        console.log("[God's Eye Sachsen] Initialisiere...");

        // 1. Kontaktverlauf laden (localStorage)
        Kontakt.init();

        // 2. Gemeindeindex laden
        await Gemeinde.loadIndex();

        // 3. Karte initialisieren
        const map = GodsEyeMap.init();

        // 4. Spatial Tools initialisieren (Kreis, Polygon, Verschneidung)
        SpatialTools.init(map);

        // 5. Sidebar & UI initialisieren
        Sidebar.init();

        // 6. Report-Layer laden (Netzausbau etc.)
        await Reports.init();

        // 7. LUIS Health-Check
        this._checkLuisHealth();

        // 8. Status-Farben auf Gemeinden anwenden
        // (Verzögert, damit Gemeinden erst geladen werden)
        setTimeout(() => {
            Kontakt.applyAllStatusColors();
        }, 3000);

        // 9. Kontakt-Statistik in Statusbar
        this._updateStatusBar();

        console.log("[God's Eye Sachsen] Bereit.");
    },

    /**
     * LUIS-Verfügbarkeit prüfen
     */
    async _checkLuisHealth() {
        const el = document.getElementById('status-connection');
        try {
            const online = await LuisAPI.checkHealth();
            el.textContent = online ? 'LUIS: Online' : 'LUIS: Offline';
            el.className = online ? 'status-online' : 'status-offline';
        } catch {
            el.textContent = 'LUIS: Offline';
            el.className = 'status-offline';
        }
    },

    /**
     * Statusbar mit Kontakt-Statistik aktualisieren
     */
    _updateStatusBar() {
        const stats = Kontakt.getStatistics();
        if (stats.total > 0) {
            document.getElementById('status-features').textContent =
                `Kontakte: ${stats.gruen} positiv | ${stats.gelb} neutral | ${stats.rot} ablehnend | ${stats.offen} offen`;
        }
    }
};

// ---- App starten wenn DOM bereit ----
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
