/* ============================================
   God's Eye Sachsen — PDF-Steckbrief Export
   Einseitiger Steckbrief für Bürgermeister-
   Gespräche: Karte + Daten + Restriktionen
   ============================================ */

const PDFExport = {

    /**
     * Exportiert den aktuellen Steckbrief als druckbares HTML (öffnet Druckfenster)
     * Browser-Print → PDF (kein extra Library nötig)
     *
     * @param {object} gemeinde - Gemeinde-Daten aus Index
     * @param {object} restriktionen - Verschneidungsergebnis
     * @param {object} scoreResult - Eignungs-Score (optional)
     * @param {object} distances - Entfernungsdaten (optional)
     */
    exportSteckbrief(gemeinde, restriktionen = {}, scoreResult = null, distances = null) {
        const g = gemeinde;
        const kontaktData = Kontakt._data[g.gemeinde];
        const status = kontaktData?.status || 'offen';
        const statusLabel = { gruen: 'Positiv', gelb: 'Neutral', rot: 'Ablehnend', offen: 'Offen' };
        const statusColor = CONFIG.statusColors[status] || '#64748b';

        // Heatmap-Daten falls vorhanden
        const heatData = Heatmap.getGemeindeData(g.gemeinde);

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <title>Steckbrief — ${g.gemeinde}</title>
    <style>
        @page { size: A4; margin: 15mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.4; }

        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0a0e17; padding-bottom: 8px; margin-bottom: 12px; }
        .header h1 { font-size: 22px; color: #0a0e17; }
        .header .meta { text-align: right; font-size: 10px; color: #666; }
        .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-weight: 700; font-size: 11px; color: white; background: ${statusColor}; }

        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
        .card { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
        .card h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
        .field { display: flex; justify-content: space-between; padding: 2px 0; font-size: 11px; }
        .field .label { color: #666; }
        .field .value { font-weight: 600; text-align: right; max-width: 55%; }

        .full-width { grid-column: 1 / -1; }
        .score-box { text-align: center; padding: 12px; }
        .score-number { font-size: 40px; font-weight: 800; }
        .score-label { font-size: 13px; font-weight: 600; margin-top: 2px; }
        .score-bar { background: #eee; border-radius: 4px; height: 6px; margin: 6px 0; }
        .score-fill { height: 100%; border-radius: 4px; }

        .mini-scores { display: flex; gap: 8px; justify-content: center; margin-top: 8px; }
        .mini-score { text-align: center; padding: 4px 12px; background: #f5f5f5; border-radius: 4px; }
        .mini-score .num { font-size: 16px; font-weight: 700; }
        .mini-score .lbl { font-size: 9px; color: #888; }

        .restriktion-row { display: flex; justify-content: space-between; padding: 2px 0; }
        .restriktion-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
        .dot-gruen { background: #10b981; }
        .dot-rot { background: #ef4444; }
        .dot-gelb { background: #f59e0b; }

        .kontakt-entry { border-left: 3px solid #3b82f6; padding: 3px 8px; margin: 4px 0; background: #f8f9fa; border-radius: 0 4px 4px 0; font-size: 10px; }
        .kontakt-date { color: #888; font-size: 9px; }

        .footer { margin-top: 12px; padding-top: 8px; border-top: 1px solid #ddd; font-size: 9px; color: #999; display: flex; justify-content: space-between; }

        @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div>
            <h1>${g.gemeinde}</h1>
            <span style="color:#666;">${g.landkreis || ''} | ${g.plz || ''}</span>
        </div>
        <div class="meta">
            <span class="status-badge">${statusLabel[status]}</span><br>
            <span>Stand: ${new Date().toLocaleDateString('de-DE')}</span>
        </div>
    </div>

    <div class="grid">
        <!-- Verwaltung -->
        <div class="card">
            <h3>Verwaltung</h3>
            <div class="field"><span class="label">Gemeinde</span><span class="value">${g.gemeinde || '—'}</span></div>
            <div class="field"><span class="label">Landkreis</span><span class="value">${g.landkreis || '—'}</span></div>
            <div class="field"><span class="label">PLZ</span><span class="value">${g.plz || '—'}</span></div>
            <div class="field"><span class="label">Ortsteile</span><span class="value">${g.ortsteile || '—'}</span></div>
            <div class="field"><span class="label">Regionalplan</span><span class="value">${g.regionalplan || '—'}</span></div>
        </div>

        <!-- Bürgermeister -->
        <div class="card">
            <h3>Bürgermeister / Kontakt</h3>
            <div class="field"><span class="label">Name</span><span class="value">${g.bm_name || '—'}</span></div>
            <div class="field"><span class="label">Titel</span><span class="value">${g.bm_titel || '—'}</span></div>
            <div class="field"><span class="label">Amt</span><span class="value">${g.bm_status || '—'}</span></div>
            <div class="field"><span class="label">Telefon</span><span class="value">${g.telefon || '—'}</span></div>
            <div class="field"><span class="label">Email</span><span class="value">${g.email || '—'}</span></div>
            <div class="field"><span class="label">Homepage</span><span class="value">${g.homepage || '—'}</span></div>
        </div>

        <!-- Eignungs-Score -->
        ${scoreResult ? `
        <div class="card">
            <h3>PV/BESS Eignungs-Score</h3>
            <div class="score-box">
                <div class="score-number" style="color:${scoreResult.ratingColor}">${scoreResult.score}</div>
                <div class="score-label" style="color:${scoreResult.ratingColor}">${scoreResult.ratingLabel}</div>
                <div class="score-bar"><div class="score-fill" style="width:${scoreResult.score}%;background:${scoreResult.ratingColor}"></div></div>
                <div class="mini-scores">
                    <div class="mini-score"><div class="num">${scoreResult.pvScore}</div><div class="lbl">PV</div></div>
                    <div class="mini-score"><div class="num">${scoreResult.bessScore}</div><div class="lbl">BESS</div></div>
                    <div class="mini-score"><div class="num">${scoreResult.h2Score}</div><div class="lbl">H₂</div></div>
                </div>
            </div>
        </div>` : ''}

        <!-- Entfernungen -->
        ${distances ? `
        <div class="card">
            <h3>Infrastruktur-Entfernungen</h3>
            ${distances.umspannwerk ? `<div class="field"><span class="label">Nächstes USW</span><span class="value">${distances.umspannwerk.name} (${distances.umspannwerk.km.toFixed(1)} km, ${distances.umspannwerk.spannung})</span></div>` : ''}
            ${distances.siedlung ? `<div class="field"><span class="label">Nächste Siedlung</span><span class="value">${distances.siedlung.name} (${(distances.siedlung.km * 1000).toFixed(0)} m)</span></div>` : ''}
            ${distances.bab ? `<div class="field"><span class="label">Nächste BAB/Bahn</span><span class="value">${distances.bab.km.toFixed(1)} km</span></div>` : ''}
        </div>` : ''}

        <!-- Restriktionen -->
        <div class="card full-width">
            <h3>Naturschutz-Restriktionen</h3>
            ${Object.keys(restriktionen).length > 0
                ? Object.entries(restriktionen).map(([name, stats]) => `
                    <div class="restriktion-row">
                        <span><span class="restriktion-dot ${parseFloat(stats.intersectAreaHa || stats.overlapPercent || 0) > 0 ? 'dot-rot' : 'dot-gruen'}"></span>${name}</span>
                        <span style="font-weight:600;">${stats.intersectAreaHa || stats.coveredAreaHa || '0'} ha (${stats.overlapPercent || stats.coveragePercent || '0'}%)</span>
                    </div>`).join('')
                : '<div style="color:#10b981;font-weight:600;">Keine Restriktionen erkannt</div>'
            }
            ${heatData ? `
            <div style="margin-top:8px;padding-top:6px;border-top:1px solid #eee;">
                <div class="field"><span class="label">Gesamt-Restriktionsanteil</span><span class="value">${heatData.restriktionsAnteil}%</span></div>
                <div class="field"><span class="label">Frei verfügbar (ca.)</span><span class="value" style="color:#10b981;">${heatData.freiAnteil}%</span></div>
                <div class="field"><span class="label">Gemeindefläche</span><span class="value">${heatData.gemeindeAreaHa} ha</span></div>
            </div>` : ''}
        </div>

        <!-- Konflikte & Hinweise -->
        ${g.konflikte || g.wichtig ? `
        <div class="card full-width">
            <h3>Konflikte & Hinweise</h3>
            ${g.konflikte ? `<p style="color:#d32f2f;margin-bottom:4px;">${g.konflikte}</p>` : ''}
            ${g.wichtig ? `<p>${g.wichtig}</p>` : ''}
        </div>` : ''}

        <!-- Kontaktverlauf -->
        ${kontaktData?.verlauf?.length ? `
        <div class="card full-width">
            <h3>Kontaktverlauf (letzte 5 Einträge)</h3>
            ${kontaktData.verlauf.slice(-5).reverse().map(entry => `
                <div class="kontakt-entry">
                    <span class="kontakt-date">${new Date(entry.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    — ${entry.note}
                </div>
            `).join('')}
        </div>` : ''}

        <!-- Bearbeitungsstand -->
        ${g.bearb_stand ? `
        <div class="card full-width">
            <h3>Bearbeitungsstand</h3>
            <p style="white-space:pre-wrap;font-size:10px;">${g.bearb_stand}</p>
        </div>` : ''}
    </div>

    <div class="footer">
        <span>God's Eye Sachsen — GIS Akquise-Tool</span>
        <span>Generiert: ${new Date().toLocaleString('de-DE')}</span>
    </div>
</body>
</html>`;

        // Neues Fenster öffnen und drucken
        const printWindow = window.open('', '_blank', 'width=800,height=1100');
        printWindow.document.write(html);
        printWindow.document.close();

        // Kurz warten bis gerendert, dann Druckdialog
        setTimeout(() => {
            printWindow.print();
        }, 500);
    }
};
