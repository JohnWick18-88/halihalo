/* ============================================
   God's Eye Sachsen — PV/BESS Eignungs-Score
   Transparente Bewertung pro Flurstück:
   Wie geeignet ist diese Fläche für PV, BESS,
   PV+BESS Colocation, Wasserstoff?
   ============================================ */

const Scoring = {
    // ---- Bewertungskategorien mit Gewichtung ----
    // Jede Kategorie hat: maxPunkte, Beschreibung, Bewertungsfunktion
    criteria: {
        // === SCHUTZGEBIETE (Ausschlusskriterien / harte Restriktionen) ===
        nsg: {
            name: 'Naturschutzgebiet (NSG)',
            maxPoints: -100,  // Ausschluss
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.nsg
                ? { points: -100, detail: 'NSG-Fläche — Ausschluss', color: 'rot' }
                : { points: 12, detail: 'Kein NSG', color: 'gruen' }
        },
        ffh: {
            name: 'FFH-Gebiet (Natura 2000)',
            maxPoints: -100,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.ffh
                ? { points: -100, detail: 'FFH-Gebiet — Ausschluss', color: 'rot' }
                : { points: 10, detail: 'Kein FFH', color: 'gruen' }
        },
        spa: {
            name: 'Vogelschutzgebiet (SPA)',
            maxPoints: -100,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.spa
                ? { points: -80, detail: 'SPA — starke Einschränkung', color: 'rot' }
                : { points: 8, detail: 'Kein SPA', color: 'gruen' }
        },
        lsg: {
            name: 'Landschaftsschutzgebiet (LSG)',
            maxPoints: 8,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.lsg
                ? { points: -30, detail: 'LSG — Einzelfallprüfung nötig', color: 'gelb' }
                : { points: 8, detail: 'Kein LSG', color: 'gruen' }
        },
        biosphaere: {
            name: 'Biosphärenreservat',
            maxPoints: -100,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.biosphaerenreservat
                ? { points: -100, detail: 'Biosphärenreservat — Ausschluss', color: 'rot' }
                : { points: 5, detail: 'Kein Biosphärenreservat', color: 'gruen' }
        },
        biotop: {
            name: 'Geschütztes Biotop',
            maxPoints: -100,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.geschBiotope
                ? { points: -100, detail: 'Geschütztes Biotop — Ausschluss', color: 'rot' }
                : { points: 5, detail: 'Kein geschütztes Biotop', color: 'gruen' }
        },

        // === WASSER & HOCHWASSER ===
        twsg: {
            name: 'Trinkwasserschutzgebiet',
            maxPoints: 6,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.twsg
                ? { points: -50, detail: 'TWSG — starke Einschränkung', color: 'rot' }
                : { points: 6, detail: 'Kein TWSG', color: 'gruen' }
        },
        hochwasser: {
            name: 'Hochwassergefährdung (HQ100)',
            maxPoints: 5,
            category: 'restriktion',
            evaluate: (overlaps) => overlaps.hochwasser
                ? { points: -20, detail: 'HQ100-Gebiet — Risiko', color: 'gelb' }
                : { points: 5, detail: 'Kein Hochwasserrisiko', color: 'gruen' }
        },

        // === INFRASTRUKTUR-NÄHE (Positiv) ===
        umspannwerk: {
            name: 'Nähe Umspannwerk',
            maxPoints: 15,
            category: 'infrastruktur',
            evaluate: (overlaps, distances) => {
                const d = distances?.umspannwerk;
                if (!d) return { points: 0, detail: 'Keine Daten', color: 'grau' };
                if (d.km < 2) return { points: 15, detail: `${d.km.toFixed(1)} km (${d.name}, ${d.spannung}) — optimal`, color: 'gruen' };
                if (d.km < 5) return { points: 12, detail: `${d.km.toFixed(1)} km (${d.name}, ${d.spannung}) — gut`, color: 'gruen' };
                if (d.km < 10) return { points: 8, detail: `${d.km.toFixed(1)} km (${d.name}, ${d.spannung}) — akzeptabel`, color: 'gelb' };
                if (d.km < 20) return { points: 4, detail: `${d.km.toFixed(1)} km (${d.name}, ${d.spannung}) — weit`, color: 'gelb' };
                return { points: 1, detail: `${d.km.toFixed(1)} km — sehr weit`, color: 'rot' };
            }
        },
        eegKorridor: {
            name: 'EEG-Korridor (BAB/Bahn)',
            maxPoints: 12,
            category: 'infrastruktur',
            evaluate: (overlaps, distances) => {
                const d = distances?.bab;
                if (!d) return { points: 0, detail: 'Keine Daten', color: 'grau' };
                if (d.km < 0.5) return { points: 12, detail: `${(d.km * 1000).toFixed(0)} m — im EEG-Korridor (200m)`, color: 'gruen' };
                if (d.km < 2) return { points: 8, detail: `${d.km.toFixed(1)} km — nahe EEG-Korridor`, color: 'gelb' };
                return { points: 2, detail: `${d.km.toFixed(1)} km — außerhalb EEG-Korridor`, color: 'gelb' };
            }
        },
        siedlung: {
            name: 'Abstand Siedlung',
            maxPoints: 8,
            category: 'infrastruktur',
            evaluate: (overlaps, distances) => {
                const d = distances?.siedlung;
                if (!d) return { points: 0, detail: 'Keine Daten', color: 'grau' };
                if (d.km < 0.1) return { points: -40, detail: `${(d.km * 1000).toFixed(0)} m — zu nah/innerhalb Siedlung`, color: 'rot' };
                if (d.km < 0.3) return { points: 2, detail: `${(d.km * 1000).toFixed(0)} m — Mindestabstand knapp`, color: 'gelb' };
                if (d.km < 1) return { points: 6, detail: `${(d.km * 1000).toFixed(0)} m — guter Abstand`, color: 'gruen' };
                return { points: 8, detail: `${d.km.toFixed(1)} km — großer Abstand`, color: 'gruen' };
            }
        },

        // === FLÄCHEN-QUALITÄT ===
        flaechengroesse: {
            name: 'Flächengröße',
            maxPoints: 10,
            category: 'qualitaet',
            evaluate: (overlaps, distances, props) => {
                const ha = (props?.FLAECHE || 0) / 10000;
                if (ha >= 50) return { points: 10, detail: `${ha.toFixed(1)} ha — Großprojekt möglich`, color: 'gruen' };
                if (ha >= 20) return { points: 8, detail: `${ha.toFixed(1)} ha — gute Projektgröße`, color: 'gruen' };
                if (ha >= 5) return { points: 5, detail: `${ha.toFixed(1)} ha — kleines Projekt`, color: 'gelb' };
                if (ha >= 1) return { points: 2, detail: `${ha.toFixed(1)} ha — sehr klein`, color: 'gelb' };
                return { points: 0, detail: `${ha.toFixed(2)} ha — zu klein`, color: 'rot' };
            }
        },
        nutzungsart: {
            name: 'Nutzungsart',
            maxPoints: 8,
            category: 'qualitaet',
            evaluate: (overlaps, distances, props) => {
                const nutzung = (props?.NUTZUNG || props?.nutzungsart || '').toLowerCase();
                if (nutzung.includes('acker') || nutzung.includes('grünland'))
                    return { points: 8, detail: `${nutzung} — ideal für PV-FFA`, color: 'gruen' };
                if (nutzung.includes('brache') || nutzung.includes('unland'))
                    return { points: 7, detail: `${nutzung} — gut geeignet`, color: 'gruen' };
                if (nutzung.includes('gewerbe') || nutzung.includes('industrie'))
                    return { points: 6, detail: `${nutzung} — BESS/H₂ Potenzial`, color: 'gruen' };
                if (nutzung.includes('wald') || nutzung.includes('forst'))
                    return { points: -50, detail: `${nutzung} — Wald = Ausschluss`, color: 'rot' };
                if (nutzung.includes('wohn') || nutzung.includes('siedlung'))
                    return { points: -40, detail: `${nutzung} — Wohngebiet`, color: 'rot' };
                return { points: 3, detail: nutzung || 'Unbekannt', color: 'gelb' };
            }
        },
        pvfvo: {
            name: 'PV-Freiflächenkulisse (PVFVO)',
            maxPoints: 15,
            category: 'qualitaet',
            evaluate: (overlaps) => overlaps.pvfvo
                ? { points: 15, detail: 'In PVFVO-Kulisse — bevorzugt', color: 'gruen' }
                : { points: 0, detail: 'Nicht in PVFVO-Kulisse', color: 'gelb' }
        },

        // === SPEZIAL: Colocation & Wasserstoff ===
        colocationBess: {
            name: 'BESS Colocation-Potenzial',
            maxPoints: 10,
            category: 'spezial',
            evaluate: (overlaps, distances, props) => {
                // BESS lohnt sich besonders nahe an Umspannwerken + großen Flächen
                const ha = (props?.FLAECHE || 0) / 10000;
                const uswKm = distances?.umspannwerk?.km || 999;
                if (uswKm < 3 && ha >= 10) return { points: 10, detail: `USW ${uswKm.toFixed(1)} km + ${ha.toFixed(0)} ha — ideale BESS-Colocation`, color: 'gruen' };
                if (uswKm < 5 && ha >= 5) return { points: 7, detail: `USW ${uswKm.toFixed(1)} km + ${ha.toFixed(0)} ha — BESS möglich`, color: 'gruen' };
                if (uswKm < 10) return { points: 3, detail: `USW ${uswKm.toFixed(1)} km — BESS eingeschränkt`, color: 'gelb' };
                return { points: 0, detail: 'USW zu weit für BESS', color: 'rot' };
            }
        },
        wasserstoff: {
            name: 'Wasserstoff-Potenzial',
            maxPoints: 8,
            category: 'spezial',
            evaluate: (overlaps, distances, props) => {
                // H₂ lohnt sich nahe Industrie, Gewerbe, stillzulegende Kraftwerke
                const nutzung = (props?.NUTZUNG || props?.nutzungsart || '').toLowerCase();
                const ha = (props?.FLAECHE || 0) / 10000;
                const hasIndustrie = nutzung.includes('gewerbe') || nutzung.includes('industrie');
                const iedNahe = overlaps.ied;

                if (hasIndustrie && ha >= 20) return { points: 8, detail: `Industriefläche ${ha.toFixed(0)} ha — H₂-Hub Potenzial`, color: 'gruen' };
                if (iedNahe) return { points: 6, detail: 'Nahe IED-Anlage — H₂-Abnehmer möglich', color: 'gruen' };
                if (ha >= 50) return { points: 4, detail: `${ha.toFixed(0)} ha — Großfläche für H₂-Produktion`, color: 'gelb' };
                return { points: 0, detail: 'Kein H₂-Potenzial erkennbar', color: 'grau' };
            }
        }
    },

    /**
     * Bewertet ein Flurstück vollständig
     * @param {object} overlaps - { nsg: bool, ffh: bool, lsg: bool, ... }
     * @param {object} distances - { umspannwerk: {km, name, spannung}, bab: {km}, siedlung: {km} }
     * @param {object} properties - Feature-Properties (FLAECHE, NUTZUNG, etc.)
     * @returns {object} Score-Ergebnis mit Auflistung
     */
    evaluate(overlaps, distances, properties) {
        const results = [];
        let totalPoints = 0;
        let maxPossible = 0;
        let hasExclusion = false;

        // Kategorien sortiert durchgehen
        const categoryOrder = ['restriktion', 'infrastruktur', 'qualitaet', 'spezial'];

        categoryOrder.forEach(cat => {
            Object.entries(this.criteria)
                .filter(([, c]) => c.category === cat)
                .forEach(([key, criterion]) => {
                    const result = criterion.evaluate(overlaps, distances, properties);
                    results.push({
                        key,
                        name: criterion.name,
                        category: cat,
                        ...result
                    });

                    totalPoints += result.points;
                    if (criterion.maxPoints > 0) maxPossible += criterion.maxPoints;
                    if (result.points <= -100) hasExclusion = true;
                });
        });

        // Gesamtbewertung
        const normalizedScore = hasExclusion ? 0 : Math.max(0, Math.min(100,
            Math.round((totalPoints / maxPossible) * 100)
        ));

        const rating = hasExclusion ? 'ausschluss'
            : normalizedScore >= 70 ? 'sehr_gut'
            : normalizedScore >= 50 ? 'gut'
            : normalizedScore >= 30 ? 'mittel'
            : normalizedScore >= 10 ? 'schwach'
            : 'ungeeignet';

        const ratingLabels = {
            ausschluss: 'Ausschluss',
            sehr_gut: 'Sehr gut geeignet',
            gut: 'Gut geeignet',
            mittel: 'Bedingt geeignet',
            schwach: 'Schwach geeignet',
            ungeeignet: 'Ungeeignet'
        };

        const ratingColors = {
            ausschluss: 'var(--accent-red)',
            sehr_gut: '#00e676',
            gut: 'var(--accent-green)',
            mittel: 'var(--accent-yellow)',
            schwach: '#ff9800',
            ungeeignet: 'var(--accent-red)'
        };

        return {
            score: normalizedScore,
            totalPoints,
            maxPossible,
            rating,
            ratingLabel: ratingLabels[rating],
            ratingColor: ratingColors[rating],
            hasExclusion,
            results,
            // Separate Scores für PV, BESS, H₂
            pvScore: this._calcSubScore(results, ['restriktion', 'infrastruktur', 'qualitaet']),
            bessScore: this._calcSubScore(results, ['restriktion', 'colocationBess']),
            h2Score: this._calcSubScore(results, ['restriktion', 'wasserstoff'])
        };
    },

    /**
     * Berechnet Sub-Score für eine Technologie
     */
    _calcSubScore(results, relevantCategories) {
        let points = 0;
        let max = 0;
        results.forEach(r => {
            if (relevantCategories.includes(r.category) || relevantCategories.includes(r.key)) {
                points += r.points;
                if (r.points > 0) max += r.points;
            }
        });
        return max > 0 ? Math.max(0, Math.min(100, Math.round((points / Math.max(max, 1)) * 100))) : 0;
    },

    /**
     * Rendert die Score-Ergebnisse als HTML für den Steckbrief
     */
    renderScoreHTML(scoreResult) {
        const s = scoreResult;

        let html = `
        <div class="steckbrief-section">
            <h3>Eignungs-Score</h3>

            <!-- Gesamtscore -->
            <div style="text-align:center;padding:12px 0;">
                <div style="font-size:36px;font-weight:800;color:${s.ratingColor};">${s.score}</div>
                <div style="font-size:13px;color:${s.ratingColor};font-weight:600;">${s.ratingLabel}</div>
                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">
                    ${s.totalPoints} von ${s.maxPossible} möglichen Punkten
                </div>
            </div>

            <!-- Score-Balken -->
            <div style="background:var(--bg-tertiary);border-radius:4px;height:8px;margin:8px 0 16px;">
                <div style="background:${s.ratingColor};height:100%;border-radius:4px;width:${s.score}%;transition:width 0.5s;"></div>
            </div>

            <!-- Technologie-Scores -->
            <div style="display:flex;gap:8px;margin-bottom:12px;">
                ${this._renderMiniScore('PV', s.pvScore)}
                ${this._renderMiniScore('BESS', s.bessScore)}
                ${this._renderMiniScore('H₂', s.h2Score)}
            </div>
        </div>

        <!-- Detaillierte Auflistung -->
        <div class="steckbrief-section">
            <h3>Bewertungsdetails</h3>`;

        // Nach Kategorie gruppiert
        const categoryNames = {
            restriktion: 'Schutzgebiete & Restriktionen',
            infrastruktur: 'Infrastruktur & Anbindung',
            qualitaet: 'Flächenqualität',
            spezial: 'Colocation & Wasserstoff'
        };

        let currentCat = '';
        s.results.forEach(r => {
            if (r.category !== currentCat) {
                currentCat = r.category;
                html += `<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted);margin-top:10px;margin-bottom:4px;">
                    ${categoryNames[currentCat] || currentCat}
                </div>`;
            }

            const pointColor = r.points > 0 ? 'var(--accent-green)'
                : r.points < 0 ? 'var(--accent-red)'
                : 'var(--text-muted)';

            const pointSign = r.points > 0 ? '+' : '';
            const statusDot = r.color === 'gruen' ? '🟢'
                : r.color === 'gelb' ? '🟡'
                : r.color === 'rot' ? '🔴'
                : '⚪';

            html += `
            <div style="display:flex;align-items:flex-start;padding:3px 0;font-size:12px;gap:6px;">
                <span style="flex-shrink:0;font-size:8px;line-height:18px;">${statusDot}</span>
                <span style="flex:1;color:var(--text-secondary);">${r.name}</span>
                <span style="flex-shrink:0;font-weight:700;color:${pointColor};min-width:35px;text-align:right;">
                    ${pointSign}${r.points}
                </span>
            </div>
            <div style="font-size:11px;color:var(--text-muted);padding-left:14px;margin-bottom:4px;">
                ${r.detail}
            </div>`;
        });

        html += `</div>`;
        return html;
    },

    /**
     * Mini-Score Anzeige für Technologie
     */
    _renderMiniScore(label, score) {
        const color = score >= 60 ? 'var(--accent-green)'
            : score >= 30 ? 'var(--accent-yellow)'
            : 'var(--accent-red)';

        return `<div style="flex:1;text-align:center;background:var(--bg-tertiary);border-radius:4px;padding:6px 4px;">
            <div style="font-size:16px;font-weight:700;color:${color};">${score}</div>
            <div style="font-size:10px;color:var(--text-muted);">${label}</div>
        </div>`;
    },

    /**
     * Gibt den Score-Farbwert für Kartendarstellung zurück
     */
    getScoreColor(score) {
        if (score >= 70) return '#00e676';
        if (score >= 50) return '#66bb6a';
        if (score >= 30) return '#fdd835';
        if (score >= 10) return '#ff9800';
        return '#ef5350';
    }
};
