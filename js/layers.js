/* ============================================
   God's Eye Sachsen — Layer Definitions
   Hierarchische Layer-Verwaltung (70+ Layer)
   Gruppiert nach Priorität & Thema
   ============================================ */

const LAYER_GROUPS = [
    // ================================================================
    // PFLICHT-LAYER (Immer verfügbar, essentiell für Akquise)
    // ================================================================
    {
        id: 'basis',
        name: 'Basis & Verwaltung',
        priority: 'pflicht',
        expanded: true,
        layers: [
            { id: 'gemeindegrenzen', name: 'Gemeindegrenzen', type: 'fs', source: 'luis', endpoint: 'gemeindegrenzen', style: 'gemeinde', minZoom: 6, active: true },
            { id: 'gemarkungen', name: 'Gemarkungen', type: 'fs', source: 'luis', endpoint: 'gemarkungen', style: 'gemarkung', minZoom: 11, active: false },
            { id: 'flurstuecke', name: 'Flurstücke', type: 'fs', source: 'luis', endpoint: 'flurstuecke', style: 'flurstueck', minZoom: 14, active: false },
            { id: 'flurstueckNummern', name: 'Flurstücknummern', type: 'fs', source: 'luis', endpoint: 'flurstueckNummern', style: 'flurstueck', minZoom: 16, active: false },
            { id: 'kreisgrenzen', name: 'Kreisgrenzen', type: 'fs', source: 'luis', endpoint: 'kreisgrenzen', style: 'gemeinde', minZoom: 6, active: false },
            { id: 'landesgrenze', name: 'Landesgrenze Sachsen', type: 'fs', source: 'luis', endpoint: 'landesgrenze', style: 'gemeinde', minZoom: 6, active: true }
        ]
    },
    {
        id: 'naturschutz_hart',
        name: 'Naturschutz — Harte Restriktionen',
        priority: 'pflicht',
        expanded: false,
        layers: [
            { id: 'nsg',              name: 'Naturschutzgebiete (NSG) ⛔ Hart-Kill',  type: 'fs', source: 'luis', endpoint: 'nsg',              style: 'nsg', minZoom: 8,  active: false, verschneidung: true },
            { id: 'lsg',              name: 'Landschaftsschutzgebiete (LSG)',          type: 'fs', source: 'luis', endpoint: 'lsg',              style: 'lsg', minZoom: 8,  active: false, verschneidung: true },
            { id: 'ffh',              name: 'FFH-Gebiete (Natura 2000) ⛔',           type: 'fs', source: 'luis', endpoint: 'ffh',              style: 'ffh', minZoom: 8,  active: false, verschneidung: true },
            { id: 'spa',              name: 'EU-Vogelschutzgebiete (SPA) ⛔',          type: 'fs', source: 'luis', endpoint: 'spa',              style: 'spa', minZoom: 8,  active: false, verschneidung: true },
            { id: 'ffhFledermaus',    name: 'FFH Fledermausquartiere',                 type: 'fs', source: 'luis', endpoint: 'ffhFledermaus',    style: 'spa', minZoom: 10, active: false, verschneidung: true },
            { id: 'biosphaerenreservat', name: 'Biosphärenreservate',                 type: 'fs', source: 'luis', endpoint: 'biosphaerenreservat', style: 'nsg', minZoom: 8, active: false, verschneidung: true },
            { id: 'nationalpark',     name: 'Nationalparke',                           type: 'fs', source: 'luis', endpoint: 'nationalpark',     style: 'nsg', minZoom: 8,  active: false, verschneidung: true },
            { id: 'naturpark',        name: 'Naturparke',                              type: 'fs', source: 'luis', endpoint: 'naturpark',        style: 'lsg', minZoom: 8,  active: false, verschneidung: true },
            { id: 'fnd',              name: 'Flächennaturdenkmäler (FND)',             type: 'fs', source: 'luis', endpoint: 'fnd',              style: 'nsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'geschBiotope',     name: 'Gesetzl. geschützte Biotope §30',        type: 'fs', source: 'luis', endpoint: 'geschBiotope',     style: 'nsg', minZoom: 10, active: false, verschneidung: true }
        ]
    },
    {
        id: 'energie',
        name: 'Energie & PV-Kulisse',
        priority: 'pflicht',
        expanded: false,
        layers: [
            { id: 'pvfvo',         name: 'PV-Freiflächenkulisse (PVFVO)',        type: 'fs',  source: 'luis',  endpoint: 'pvfvo',         style: 'pvfvo', minZoom: 10, active: false, verschneidung: true },
            { id: 'pvfvo_rapis',   name: 'PVFVO-Kulisse (RAPIS-Backup)',         type: 'wms', source: 'rapis', endpoint: 'raumordnung',   wmsLayers: 'pvfvo', minZoom: 10, active: false },
            { id: 'eegKorridor',   name: 'EEG-Korridor BAB+Bahn (Sichtprüfung)',type: 'ms',  source: 'luis',  endpoint: 'eegKorridor',   minZoom: 10, active: false, info: 'NUR Sichtprüfung — kein FeatureServer verfügbar' },
            { id: 'weaBetrieb',    name: 'WEA in Betrieb',                       type: 'fs',  source: 'luis',  endpoint: 'weaBetrieb',    style: 'wea', minZoom: 8, active: false, icon: 'wind' },
            { id: 'weaGenehmigung',name: 'WEA im Genehmigungsverfahren',         type: 'fs',  source: 'luis',  endpoint: 'weaGenehmigung', style: 'wea', minZoom: 8, active: false, icon: 'wind' },
            { id: 'weaVorInbetrieb',name: 'WEA vor Inbetriebnahme (genehmigt)', type: 'fs',  source: 'luis',  endpoint: 'weaVorInbetrieb', style: 'wea', minZoom: 8, active: false, icon: 'wind' }
        ]
    },
    {
        id: 'wasser',
        name: 'Wasser & Hochwasser',
        priority: 'pflicht',
        expanded: false,
        layers: [
            { id: 'twsg', name: 'Trinkwasserschutzgebiete', type: 'fs', source: 'luis', endpoint: 'twsg', style: 'nsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'hochwasser', name: 'Hochwassergefährdung (HQ100)', type: 'ms', source: 'luis', endpoint: 'hochwasser', minZoom: 10, active: false }
        ]
    },

    // ================================================================
    // HOCH-PRIORITÄT (Bauleitplanung, Regionalplanung)
    // ================================================================
    {
        id: 'bauleitplanung',
        name: 'G12 — Bauleitplanung (RAPIS)',
        priority: 'hoch',
        expanded: false,
        layers: [
            { id: 'bplan_kraft',  name: 'B-Plan in Kraft (RAPIS)',       type: 'wms', source: 'rapis', endpoint: 'bplan_kraft',  wmsLayers: '0', minZoom: 10, active: false },
            { id: 'bplan_plan',   name: 'B-Plan Planung laufend (RAPIS)',type: 'wms', source: 'rapis', endpoint: 'bauleitplanung', wmsLayers: '1', minZoom: 10, active: false },
            { id: 'fnp_rapis',    name: 'FNP wirksam (RAPIS)',           type: 'wms', source: 'rapis', endpoint: 'fnp_wirksam',  wmsLayers: '0', minZoom: 10, active: false },
            { id: 'fnp_entwurf',  name: 'FNP Entwurf künftig (RAPIS)',  type: 'wms', source: 'rapis', endpoint: 'flaechennutzung', wmsLayers: '1', minZoom: 10, active: false },
            { id: 'satzungen35',  name: 'Satzungen §§34/35 BauGB',      type: 'wms', source: 'rapis', endpoint: 'bauleitplanung', wmsLayers: '2', minZoom: 10, active: false }
        ]
    },
    {
        id: 'regionalplanung',
        name: 'G11 — Regionalplanung & CROSSDATA',
        priority: 'hoch',
        expanded: false,
        layers: [
            // CROSSDATA — grenzübergreifend, kommt aus LUIS
            { id: 'crossdata_22', name: 'CROSSDATA DE_22 Natur/Landschaft ⚠ PFLICHT', type: 'wms', source: 'rapis', endpoint: 'crossdata', wmsLayers: 'DE_22', minZoom: 8, active: false },
            { id: 'crossdata_23', name: 'CROSSDATA DE_23 Wasser/HW ⚠ PFLICHT',        type: 'wms', source: 'rapis', endpoint: 'crossdata', wmsLayers: 'DE_23', minZoom: 8, active: false },
            { id: 'crossdata_21', name: 'CROSSDATA DE_21 Raumstruktur',                type: 'wms', source: 'rapis', endpoint: 'crossdata', wmsLayers: 'DE_21', minZoom: 8, active: false },
            { id: 'crossdata_24', name: 'CROSSDATA DE_24 Siedlungsstruktur',           type: 'wms', source: 'rapis', endpoint: 'crossdata', wmsLayers: 'DE_24', minZoom: 8, active: false },
            { id: 'crossdata_25', name: 'CROSSDATA DE_25 Verkehr/Bahntrassen',         type: 'wms', source: 'rapis', endpoint: 'crossdata', wmsLayers: 'DE_25', minZoom: 8, active: false },
            // Regionalpläne (4 Planungsregionen)
            { id: 'rp_ces',  name: 'RP Chemnitz-Erzgebirge-SW',                    type: 'wms', source: 'rapis', endpoint: 'regionalplan_ces', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'rp_ddn',  name: 'RP Oberes Elbtal-OErzgeb. ⚠ teils unwirksam', type: 'wms', source: 'rapis', endpoint: 'regionalplan_ddn', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'rp_lei',  name: 'RP Leipzig-Westsachsen',                        type: 'wms', source: 'rapis', endpoint: 'regionalplan_lei', wmsLayers: '0', minZoom: 8, active: false },
            { id: 'rp_swn',  name: 'RP Oberlausitz-Niederschlesien',                type: 'wms', source: 'rapis', endpoint: 'regionalplan_swn', wmsLayers: '0', minZoom: 8, active: false },
            // LEP & Raumnutzungskarten
            { id: 'lep_sachsen', name: 'LEP 2013 Sachsen',                          type: 'wms', source: 'rapis', endpoint: 'raumordnung',     wmsLayers: '0', minZoom: 8, active: false }
        ]
    },
    {
        id: 'boden',
        name: 'Boden & Schützenswerte Böden (PFLICHT-Auszug)',
        priority: 'hoch',
        expanded: false,
        layers: [
            { id: 'bodenschaetzung_p', name: 'Bodenschätzung — Grundzahl/Wertzahlen',     type: 'fs', source: 'luis', endpoint: 'bodenschaetzung', style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bk50_p',           name: 'Bodenkarte BK50 (Übersicht)',                 type: 'fs', source: 'luis', endpoint: 'bk50',           style: 'gemarkung', minZoom: 12, active: false },
            { id: 'schuetzb_boeden',  name: 'Schützenswerte Böden in EEG-Korridoren ⚠',  type: 'fs', source: 'luis', endpoint: 'bodenfunktionen', style: 'lsg',       minZoom: 10, active: false, verschneidung: true, info: 'Relevant für §35 BauGB EEG-Korridor Flächen' },
            { id: 'altlasten',        name: 'Altlasten SALKA (LUIS MapServer)',             type: 'ms', source: 'luis', endpoint: 'altlasten',       minZoom: 10, active: false }
        ]
    },

    // ================================================================
    // MITTEL-PRIORITÄT (Kontext & Detailanalyse)
    // ================================================================
    {
        id: 'natur_weich',
        name: 'Auen, Moore & Feuchtgebiete',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'auenMoore',      name: 'Auen- und Moorkulisse GL2b',  type: 'fs', source: 'luis', endpoint: 'auenMoore',    style: 'lsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'mooreGloez',     name: 'Feuchtgebiete/Moore GLöZ2',   type: 'fs', source: 'luis', endpoint: 'mooreGloez',   style: 'lsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'mooreErfassung', name: 'Moore — Erfassungsgrundlage', type: 'fs', source: 'luis', endpoint: 'mooreErfassung', style: 'lsg', minZoom: 10, active: false },
            { id: 'torfmaechtigk',  name: 'Torfmächtigkeit (SIMON)',     type: 'fs', source: 'luis', endpoint: 'torfmaechtigk', style: 'lsg', minZoom: 12, active: false, info: 'Nur bei Moorverdacht laden' }
        ]
    },
    {
        id: 'wasser_detail',
        name: 'Wasserschutz — Details',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'twsgFliessgewaesser', name: 'TWSG Fließgewässer',               type: 'fs', source: 'luis', endpoint: 'twsgFliessgewaesser', style: 'nsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'twsgTalsperren',      name: 'TWSG Talsperren',                  type: 'fs', source: 'luis', endpoint: 'twsgTalsperren',      style: 'nsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'heilquellen',         name: 'Heilquellenschutzgebiete',          type: 'fs', source: 'luis', endpoint: 'heilquellen',         style: 'nsg', minZoom: 10, active: false, verschneidung: true },
            { id: 'hochwasser_hq100',    name: 'HQ100 — Pflicht-Hochwasserschutz', type: 'ms', source: 'luis', endpoint: 'hochwasserHQ100',     minZoom: 10, active: false, wmsLayerIndex: 0 },
            { id: 'hochwasser_hq20',     name: 'HQ20/25 — Häufiges Hochwasser',    type: 'ms', source: 'luis', endpoint: 'hochwasserHQ20',      minZoom: 10, active: false, wmsLayerIndex: 1 },
            { id: 'hochwasser_hq50',     name: 'HQ50 — Mittleres Hochwasser',      type: 'ms', source: 'luis', endpoint: 'hochwasserHQ50',      minZoom: 10, active: false, wmsLayerIndex: 2 },
            { id: 'hochwasser_hq200',    name: 'HQ200/300 — Seltenes Hochwasser',  type: 'ms', source: 'luis', endpoint: 'hochwasserHQ200',     minZoom: 10, active: false, wmsLayerIndex: 3 },
            { id: 'hochwasser_extrem',   name: 'HQ Extrem — Extremhochwasser',     type: 'ms', source: 'luis', endpoint: 'hochwasserExtrem',    minZoom: 10, active: false, wmsLayerIndex: 4 },
            { id: 'hw_ueberschwemm',     name: 'Überschwemmungsgebiete §78 WHG',   type: 'wms', source: 'rapis', endpoint: 'hw_rapis', wmsLayers: '0', minZoom: 10, active: false, verschneidung: false }
        ]
    },
    {
        id: 'biotope_detail',
        name: 'Biotope & Habitate (ISSAND / BTLNK)',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'btpvzFlaechen',       name: 'Gesch. Biotope — Flächen (BTPVZ)',   type: 'fs', source: 'luis', endpoint: 'btpvzFlaechen',       style: 'nsg', minZoom: 12, active: false, verschneidung: true },
            { id: 'btpvzLinien',         name: 'Gesch. Biotope — Linien',            type: 'fs', source: 'luis', endpoint: 'btpvzLinien',         style: 'nsg', minZoom: 12, active: false },
            { id: 'btpvzPunkte',         name: 'Gesch. Biotope — Punkte',            type: 'fs', source: 'luis', endpoint: 'btpvzPunkte',         style: 'nsg', minZoom: 12, active: false },
            { id: 'issandBiotopeF',      name: 'ISSAND Biotope — Flächen',           type: 'fs', source: 'luis', endpoint: 'issandBiotopeFlaechen', style: 'lsg', minZoom: 12, active: false },
            { id: 'issandBiotopeL',      name: 'ISSAND Biotope — Linien',            type: 'fs', source: 'luis', endpoint: 'issandBiotopeLinien', style: 'lsg', minZoom: 12, active: false },
            { id: 'issandBiotopeP',      name: 'ISSAND Biotope — Punkte',            type: 'fs', source: 'luis', endpoint: 'issandBiotopePunkte', style: 'lsg', minZoom: 12, active: false },
            { id: 'issandHabitateF',     name: 'ISSAND Habitate — Flächen',          type: 'fs', source: 'luis', endpoint: 'issandHabitateFlaechen', style: 'ffh', minZoom: 12, active: false },
            { id: 'issandHabitateL',     name: 'ISSAND Habitate — Linien',           type: 'fs', source: 'luis', endpoint: 'issandHabitateLinien', style: 'ffh', minZoom: 12, active: false },
            { id: 'issandHabitateP',     name: 'ISSAND Habitate — Punkte',           type: 'fs', source: 'luis', endpoint: 'issandHabitatePunkte', style: 'ffh', minZoom: 12, active: false },
            { id: 'issandLrtF',          name: 'ISSAND LRT — Flächen',              type: 'fs', source: 'luis', endpoint: 'issandLrtFlaechen',    style: 'ffh', minZoom: 12, active: false },
            { id: 'issandLrtL',          name: 'ISSAND LRT — Linien',               type: 'fs', source: 'luis', endpoint: 'issandLrtLinien',      style: 'ffh', minZoom: 12, active: false },
            { id: 'issandLrtP',          name: 'ISSAND LRT — Punkte',               type: 'fs', source: 'luis', endpoint: 'issandLrtPunkte',      style: 'ffh', minZoom: 12, active: false },
            { id: 'btlnkFlaechen',       name: 'BTLNK Biotopflächen ⚠ Ausschnitt!', type: 'fs', source: 'luis', endpoint: 'btlnkFlaechen',        style: 'lsg', minZoom: 13, active: false, info: 'Nur auf kleinen Ausschnitten laden — sehr großes Datenvolumen' },
            { id: 'btlnkLinien',         name: 'BTLNK Biotoplinien',                type: 'fs', source: 'luis', endpoint: 'btlnkLinien',          style: 'lsg', minZoom: 13, active: false },
            { id: 'btlnkPunkte',         name: 'BTLNK Biotoppunkte',                type: 'fs', source: 'luis', endpoint: 'btlnkPunkte',          style: 'lsg', minZoom: 13, active: false },
            { id: 'biotopeOffenland',    name: 'Biotope Offenland 1994–2008',        type: 'fs', source: 'luis', endpoint: 'biotopeOffenlandFlaechen', style: 'lsg', minZoom: 12, active: false }
        ]
    },
    {
        id: 'boden_detail',
        name: 'Boden — Qualität & Funktionen',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'bodenschaetzung',   name: 'Bodenschätzung (Grundzahl/Wertzahlen)', type: 'fs', source: 'luis', endpoint: 'bodenschaetzung', style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bk50',              name: 'Bodenkarte BK50 (Bodentypen)',          type: 'fs', source: 'luis', endpoint: 'bk50',             style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bodenfunktionen',   name: 'Bodenfunktionen (Übersicht)',           type: 'fs', source: 'luis', endpoint: 'bodenfunktionen',   style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bodenfruchtbarkeit',name: 'Natürliche Bodenfruchtbarkeit',         type: 'fs', source: 'luis', endpoint: 'bodenfruchtbarkeit', style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bodenkennwerte',    name: 'Bodenkennwerte (nutzbare FK)',          type: 'fs', source: 'luis', endpoint: 'bodenkennwerte',    style: 'gemarkung', minZoom: 12, active: false },
            { id: 'bodenempfindl',     name: 'Bodenempfindlichkeit (Erosion/Stoff)', type: 'fs', source: 'luis', endpoint: 'bodenempfindl',     style: 'gemarkung', minZoom: 12, active: false },
            { id: 'verdichtungsempf',  name: 'Verdichtungsempfindlichkeit',          type: 'fs', source: 'luis', endpoint: 'verdichtungsempf',   style: 'gemarkung', minZoom: 12, active: false },
            { id: 'agrarstruktur',     name: 'Agrarstrukturgebiet',                  type: 'fs', source: 'luis', endpoint: 'agrarstruktur',      style: 'lsg',       minZoom: 10, active: false, verschneidung: true },
            { id: 'nitrat',            name: 'Nitratbelastete Gebiete',              type: 'fs', source: 'luis', endpoint: 'nitrat',             style: 'lsg',       minZoom: 10, active: false },
            { id: 'trockengebiete',    name: 'Trockengebiete in Nitratgebieten',     type: 'fs', source: 'luis', endpoint: 'trockengebiete',     style: 'lsg',       minZoom: 10, active: false },
            { id: 'bodenversiegelung', name: 'Bodenversiegelung 100m-Raster',        type: 'ms', source: 'luis', endpoint: 'bodenversiegelung',  minZoom: 10, active: false },
            { id: 'erosion',           name: 'Erosion — Steillagen & Abflussbahnen', type: 'ms', source: 'luis', endpoint: 'erosion',            minZoom: 10, active: false }
        ]
    },
    {
        id: 'industrie',
        name: 'Industrie & Emissionen',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'ied',          name: 'IED-Anlagen (IE-Richtlinie)',       type: 'fs', source: 'luis', endpoint: 'ied',          style: 'wea', minZoom: 8,  active: false },
            { id: 'biogas',       name: 'Biogasanlagen (Co-Location)',       type: 'fs', source: 'luis', endpoint: 'biogas',       style: 'wea', minZoom: 10, active: false },
            { id: 'anlagenbestand',name: 'Anlagenbestand allgemein',         type: 'fs', source: 'luis', endpoint: 'anlagenbestand', style: 'wea', minZoom: 10, active: false },
            { id: 'tierhaltung',  name: 'Tierhaltungsstandorte',             type: 'fs', source: 'luis', endpoint: 'tierhaltung',  style: 'wea', minZoom: 10, active: false },
            { id: 'stoerfall',    name: 'Störfallrelevante Betriebsbereiche',type: 'fs', source: 'luis', endpoint: 'stoerfall',    style: 'wea', minZoom: 10, active: false },
            { id: 'laerm',        name: 'Lärmkartierung 2022',               type: 'ms', source: 'luis', endpoint: 'laerm',        minZoom: 10, active: false },
            { id: 'ied_rapis',    name: 'IED-Anlagen EU (RAPIS)',            type: 'wms', source: 'rapis', endpoint: 'industrie_rapis', wmsLayers: 'ied', minZoom: 8, active: false },
            { id: 'stoerfall_rapis', name: 'Störfall-VO Betriebsbereiche (RAPIS)', type: 'wms', source: 'rapis', endpoint: 'industrie_rapis', wmsLayers: 'stoerfall', minZoom: 10, active: false },
            { id: 'brachen_rapis',name: 'Brachen (NUR RAPIS)',               type: 'wms', source: 'rapis', endpoint: 'industrie_rapis', wmsLayers: 'brachen', minZoom: 10, active: false },
            { id: 'gegi_rapis',   name: 'GE/GI Industrieflächen (NUR RAPIS)',type: 'wms', source: 'rapis', endpoint: 'industrie_rapis', wmsLayers: 'gegi',    minZoom: 10, active: false }
        ]
    },
    {
        id: 'raumordnung',
        name: 'Raumordnung & Verwaltung (RAPIS)',
        priority: 'mittel',
        expanded: false,
        layers: [
            { id: 'raumordnung',     name: 'Raumordnung (Übersicht)',          type: 'wms', source: 'rapis', endpoint: 'raumordnung',     wmsLayers: '0', minZoom: 8, active: false },
            { id: 'verwaltung_rapis',name: 'Verwaltungsgrenzen (RAPIS)',       type: 'wms', source: 'rapis', endpoint: 'verwaltungsgrenzen', wmsLayers: '0', minZoom: 6, active: false },
            { id: 'crossdata',       name: 'CROSSDATA (Grenzübergreifend)',    type: 'wms', source: 'rapis', endpoint: 'crossdata',       wmsLayers: '0', minZoom: 8, active: false },
            { id: 'fnp_rapis',       name: 'FNP wirksam (RAPIS)',              type: 'wms', source: 'rapis', endpoint: 'fnp_wirksam',     wmsLayers: '0', minZoom: 10, active: false },
            { id: 'nsg_planung',     name: 'NSG/LSG Planung (NUR RAPIS)',      type: 'wms', source: 'rapis', endpoint: 'nsg_planung',     wmsLayers: '0', minZoom: 10, active: false, verschneidung: false },
            { id: 'twsz_rapis',      name: 'TWSZ Planung (NUR RAPIS)',         type: 'wms', source: 'rapis', endpoint: 'twsz_rapis',      wmsLayers: '0', minZoom: 10, active: false }
        ]
    },

    // ================================================================
    // RAPIS-EXKLUSIV (G13–G17) — Bergbau, Archäologie, Altlasten,
    // Energie-Infrastruktur, Verkehr & Richtfunk
    // Alle Layer: NUR via RAPIS WMS verfügbar
    // ================================================================
    {
        id: 'g13_bergbau',
        name: 'G13 — Bergbau & Untergrund (NUR RAPIS)',
        priority: 'hoch',
        expanded: false,
        info: 'Baubeschränkungsgebiete = BESS-kritisch! Hohlraumkarte = Setzungsgefahr!',
        layers: [
            { id: 'bergbau_berecht',  name: 'Bergbauberechtigungen',                  type: 'wms', source: 'rapis', endpoint: 'bergbau', wmsLayers: 'bergbau_berechtigungen', minZoom: 8,  active: false, verschneidung: false },
            { id: 'baubeschraenk',    name: 'Baubeschränkungsgebiete ⚠ BESS-kritisch',type: 'wms', source: 'rapis', endpoint: 'bergbau', wmsLayers: 'baubeschraenkungsgebiete', minZoom: 8,  active: false, verschneidung: false },
            { id: 'hohlraumkarte',    name: 'Hohlraumkarte ⚠ Setzungsgefahr',         type: 'wms', source: 'rapis', endpoint: 'bergbau', wmsLayers: 'hohlraumkarte',           minZoom: 10, active: false },
            { id: 'gruben_bergaufs',  name: 'Gruben unter Bergaufsicht',              type: 'wms', source: 'rapis', endpoint: 'bergbau', wmsLayers: 'gruben',                  minZoom: 10, active: false },
            { id: 'braunkohlenplan',  name: 'Braunkohlen-/Sanierungspläne',           type: 'wms', source: 'rapis', endpoint: 'bergbau', wmsLayers: 'braunkohlenplaene',        minZoom: 8,  active: false }
        ]
    },
    {
        id: 'g14_archaeologie',
        name: 'G14 — Archäologie & Denkmal (NUR RAPIS)',
        priority: 'hoch',
        expanded: false,
        info: 'Archäolog. Relevanzbereiche = Verfahrensrisiko! UNESCO = Ausschluss!',
        layers: [
            { id: 'archaeo_relevanz', name: 'Archäologische Relevanzbereiche ⚠ Verfahrensrisiko', type: 'wms', source: 'rapis', endpoint: 'archaeologie', wmsLayers: 'archaeolog_relevanzbereiche', minZoom: 8,  active: false, verschneidung: false },
            { id: 'denkmalschutz',    name: 'Denkmalschutzgebiet',                                  type: 'wms', source: 'rapis', endpoint: 'archaeologie', wmsLayers: 'denkmalschutzgebiet',         minZoom: 10, active: false },
            { id: 'unesco_kultur',    name: 'UNESCO Weltkulturerbe (Fläche) ⛔ Ausschluss',         type: 'wms', source: 'rapis', endpoint: 'archaeologie', wmsLayers: 'unesco_weltkulturerbe',       minZoom: 8,  active: false, verschneidung: false },
            { id: 'kulturdenkmal',    name: 'Kulturdenkmal (Punkt)',                                 type: 'wms', source: 'rapis', endpoint: 'archaeologie', wmsLayers: 'kulturdenkmal',               minZoom: 12, active: false }
        ]
    },
    {
        id: 'g15_altlasten',
        name: 'G15 — Altlasten & Deponien (NUR RAPIS)',
        priority: 'hoch',
        expanded: false,
        layers: [
            { id: 'salka_rapis',  name: 'SALKA Altlastenkataster (35.000 Einträge)',  type: 'wms', source: 'rapis', endpoint: 'altlasten_rapis', wmsLayers: 'salka',   minZoom: 10, active: false },
            { id: 'deponien',     name: 'Deponien (KrW-/AbfG)',                       type: 'wms', source: 'rapis', endpoint: 'altlasten_rapis', wmsLayers: 'deponien', minZoom: 10, active: false }
        ]
    },
    {
        id: 'g16_energie_rapis',
        name: 'G16 — Energieinfrastruktur (NUR RAPIS)',
        priority: 'hoch',
        expanded: false,
        info: 'Mittel-/Hochspannungsleitungen und Umspannwerke sind NUR in RAPIS verfügbar — nicht in LUIS!',
        layers: [
            { id: 'leitungen_rapis',  name: 'Mittel-/Hochspannungsleitungen (NUR RAPIS)', type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'leitungen',             minZoom: 8,  active: false },
            { id: 'usw_rapis',        name: 'Umspannwerke ≥110kV (NUR RAPIS)',             type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'umspannwerke',          minZoom: 8,  active: false },
            { id: 'pv_rapis',         name: 'PV-Anlagen >100kW Bestand (RAPIS)',           type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'pv_anlagen',            minZoom: 10, active: false },
            { id: 'kraftwerke_rapis', name: 'Kraftwerke >10MW (RAPIS)',                    type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'kraftwerke',            minZoom: 8,  active: false },
            { id: 'gasleitung_rapis', name: 'Gashochdruckleitung (RAPIS)',                 type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'gashochdruckleitung',   minZoom: 8,  active: false },
            { id: 'ev_planung_p',     name: 'Energievorhaben Planung — Punkt (NUR RAPIS)', type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'energievorhaben_punkt', minZoom: 8,  active: false },
            { id: 'ev_planung_f',     name: 'Energievorhaben Planung — Fläche (NUR RAPIS)',type: 'wms', source: 'rapis', endpoint: 'energie_rapis', wmsLayers: 'energievorhaben_flaeche', minZoom: 8, active: false },
            { id: 'pvAnlagen_luis',   name: 'PV-Anlagen >100kW (LUIS-FS)',                 type: 'fs',  source: 'luis',  endpoint: 'pvAnlagen',      style: 'pvfvo', minZoom: 8,  active: false },
            { id: 'hochspannung_ms',  name: 'Sachsen Hochspannungsnetz (LUIS MS)',          type: 'ms',  source: 'luis',  endpoint: 'hochspannung',   minZoom: 8,  active: false }
        ]
    },
    {
        id: 'g17_verkehr',
        name: 'G17 — Verkehr & Richtfunk (NUR RAPIS)',
        priority: 'mittel',
        expanded: false,
        info: 'Richtfunkstrecken = kritisch für Tracker/Kommunikation! Luftverkehr-Baubeschränkungen beachten.',
        layers: [
            { id: 'richtfunk_strecken', name: 'Richtfunkstrecken ⚠ Kritisch Tracker!',   type: 'wms', source: 'rapis', endpoint: 'verkehr_rapis', wmsLayers: 'richtfunkstrecken',        minZoom: 8,  active: false },
            { id: 'richtfunk_anlagen',  name: 'Richtfunk Sende-/Empfangsanlagen',         type: 'wms', source: 'rapis', endpoint: 'verkehr_rapis', wmsLayers: 'richtfunk_anlagen',        minZoom: 10, active: false },
            { id: 'luftverkehr_baubesch', name: 'Luftverkehr Baubeschränkung',             type: 'wms', source: 'rapis', endpoint: 'verkehr_rapis', wmsLayers: 'luftverkehr_baubeschraenk', minZoom: 8,  active: false },
            { id: 'schienennetz',       name: 'Schienennetz Bestand (zu §35-Korridor)',    type: 'wms', source: 'rapis', endpoint: 'verkehr_rapis', wmsLayers: 'schienennetz',             minZoom: 8,  active: false },
            { id: 'strassennetz',       name: 'Straßennetz Bestand',                       type: 'wms', source: 'rapis', endpoint: 'verkehr_rapis', wmsLayers: 'strassennetz',             minZoom: 8,  active: false }
        ]
    },

    // ================================================================
    // NETZAUSBAU & BERICHTE (Erweiterbar — Platzhalter für Reports)
    // Wird dynamisch befüllt aus reports.js beim Start
    // Verwendung: Reports.importFromReport(jsonObjekt) aufrufen
    // oder JSON-Dateien in data/reports/ ablegen
    // ================================================================
    {
        id: 'netzausbau',
        name: 'Netzausbau & Berichte (Gemini-Import)',
        priority: 'optional',
        expanded: false,
        info: 'Wird dynamisch befüllt. Lege GeoJSON-Dateien in data/reports/ ab oder rufe Reports.importFromReport(data) auf.',
        layers: [
            // Dynamisch befüllt aus reports.js (beim Start automatisch geladen):
            //
            // FORMAT für importFromReport():
            // Reports.importFromReport({
            //   name: "Umspannwerke NEP 2037",
            //   quelle: "Netzentwicklungsplan Strom 2037 (BNetzA)",
            //   stand: "2025-Q4",
            //   icon: "substation",
            //   features: [
            //     { name: "UW Freiberg-Nord", lat: 50.95, lng: 13.35,
            //       typ: "Neubau 110/20kV", inbetriebnahme: "2028",
            //       betreiber: "MITNETZ STROM", kapazitaet_mva: 80, status: "geplant" }
            //   ]
            // });
        ]
    }
];

// ---- Layer Registry (flache Map für schnellen Zugriff) ----
const LAYER_REGISTRY = {};
const ACTIVE_LAYERS = {};  // layerId → Leaflet Layer Instance

/**
 * Initialisiert die Layer-Registry aus LAYER_GROUPS
 */
function initLayerRegistry() {
    LAYER_GROUPS.forEach(group => {
        group.layers.forEach(layer => {
            LAYER_REGISTRY[layer.id] = {
                ...layer,
                groupId: group.id,
                groupName: group.name,
                priority: group.priority,
                leafletLayer: null,
                loaded: false,
                loading: false,
                featureCount: 0
            };
        });
    });
}

/**
 * Gibt alle Layer zurück, die für Verschneidungen geeignet sind (FeatureServer)
 */
function getVerschneidungsLayer() {
    return Object.values(LAYER_REGISTRY).filter(l => l.verschneidung === true);
}

/**
 * Gibt alle aktiven Layer zurück
 */
function getActiveLayers() {
    return Object.values(LAYER_REGISTRY).filter(l => l.active);
}

/**
 * Registriert einen dynamischen Layer (z.B. aus Netzausbau-Reports)
 */
function registerDynamicLayer(groupId, layerDef) {
    const group = LAYER_GROUPS.find(g => g.id === groupId);
    if (!group) return false;

    group.layers.push(layerDef);
    LAYER_REGISTRY[layerDef.id] = {
        ...layerDef,
        groupId: group.id,
        groupName: group.name,
        priority: group.priority,
        leafletLayer: null,
        loaded: false,
        loading: false,
        featureCount: 0
    };
    return true;
}

// Init on load
initLayerRegistry();
