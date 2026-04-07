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

        // 5. Distance-Modul initialisieren (Entfernungslinien)
        Distance.init(map);

        // 6. Sidebar & UI initialisieren
        Sidebar.init();

        // 7. Report-Layer laden (Netzausbau etc.)
        await Reports.init();

        // 8. Wiedervorlage initialisieren
        Wiedervorlage.init();

        // 9. LUIS Health-Check
        this._checkLuisHealth();

        // 10. Status-Farben auf Gemeinden anwenden
        // (Verzögert, damit Gemeinden erst geladen werden)
        setTimeout(() => {
            Kontakt.applyAllStatusColors();
        }, 3000);

        // 11. Kontakt-Statistik in Statusbar
        this._updateStatusBar();

        // 12. Wiedervorlage-Benachrichtigung (nach 2s, damit UI fertig ist)
        setTimeout(() => {
            Wiedervorlage.showStartNotification();
        }, 2000);

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
