import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

// - SUPABASE CLIENT -
const SUPABASE_URL = "https://ecxpqxtqdakfmjokudwn.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjeHBxeHRxZGFrZm1qb2t1ZHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MjMzNjIsImV4cCI6MjA4NzQ5OTM2Mn0.q27mvz52Zr6Kcp-_Z16a5a7mLQ3YutZ3ruTq8W4Q9_4";

const sb = {
  _h: { "Content-Type": "application/json", "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}`, "Prefer": "return=representation" },
  url: (table, query="") => `${SUPABASE_URL}/rest/v1/${table}${query}`,

  async select(table, query="") {
    try {
      const r = await fetch(sb.url(table, query), { headers: sb._h });
      return r.ok ? await r.json() : [];
    } catch { return []; }
  },
  async insert(table, data) {
    try {
      const r = await fetch(sb.url(table), { method:"POST", headers: sb._h, body: JSON.stringify(data) });
      const j = await r.json();
      return r.ok ? (Array.isArray(j) ? j[0] : j) : null;
    } catch { return null; }
  },
  async update(table, id, data, idCol="id") {
    try {
      const r = await fetch(sb.url(table, `?${idCol}=eq.${id}`), { method:"PATCH", headers: sb._h, body: JSON.stringify(data) });
      const j = await r.json();
      return r.ok ? (Array.isArray(j) ? j[0] : j) : null;
    } catch { return null; }
  },
  async upsert(table, data, onConflict="id") {
    try {
      const h = { ...sb._h, "Prefer": "resolution=merge-duplicates,return=representation" };
      const r = await fetch(sb.url(table, `?on_conflict=${onConflict}`), { method:"POST", headers: h, body: JSON.stringify(data) });
      const j = await r.json();
      return r.ok ? (Array.isArray(j) ? j[0] : j) : null;
    } catch { return null; }
  },
  async delete(table, id, idCol="id") {
    try {
      const r = await fetch(sb.url(table, `?${idCol}=eq.${id}`), { method:"DELETE", headers: sb._h });
      return r.ok;
    } catch { return false; }
  },
  // Realtime subscription via SSE
  subscribe(table, cb) {
    const url = `${SUPABASE_URL}/realtime/v1/api/broadcast`;
    // Usa polling leggero ogni 8s come fallback compatibile con anon key
    const interval = setInterval(async () => { const d = await sb.select(table); cb(d); }, 8000);
    return () => clearInterval(interval);
  }
};

// - DATI STRUTTURA -

const ROOMS = [
  // - Piano 1 — Standard (10 camere) -
  { id: 101, type: "Standard",            capacity: 2, price: 90,  floor: 1 },
  { id: 102, type: "Standard",            capacity: 2, price: 90,  floor: 1 },
  { id: 103, type: "Standard",            capacity: 2, price: 90,  floor: 1 },
  { id: 104, type: "Standard",            capacity: 2, price: 90,  floor: 1 },
  { id: 105, type: "Standard",            capacity: 2, price: 90,  floor: 1 },
  { id: 106, type: "Standard",            capacity: 2, price: 90,  floor: 1 },
  { id: 107, type: "Standard",            capacity: 3, price: 110, floor: 1 },
  { id: 108, type: "Standard",            capacity: 3, price: 110, floor: 1 },
  { id: 109, type: "Standard Accessibile",capacity: 2, price: 95,  floor: 1 },
  { id: 110, type: "Standard Accessibile",capacity: 2, price: 95,  floor: 1 },

  // - Piano 2 — Standard / Superior (10 camere) -
  { id: 201, type: "Standard",            capacity: 2, price: 95,  floor: 2 },
  { id: 202, type: "Standard",            capacity: 2, price: 95,  floor: 2 },
  { id: 203, type: "Standard",            capacity: 2, price: 95,  floor: 2 },
  { id: 204, type: "Standard",            capacity: 2, price: 95,  floor: 2 },
  { id: 205, type: "Superior",            capacity: 2, price: 130, floor: 2 },
  { id: 206, type: "Superior",            capacity: 2, price: 130, floor: 2 },
  { id: 207, type: "Superior",            capacity: 3, price: 150, floor: 2 },
  { id: 208, type: "Superior",            capacity: 3, price: 150, floor: 2 },
  { id: 209, type: "Superior",            capacity: 2, price: 135, floor: 2 },
  { id: 210, type: "Superior",            capacity: 2, price: 135, floor: 2 },

  // - Piano 3 — Superior / Deluxe (10 camere) -
  { id: 301, type: "Superior",            capacity: 2, price: 140, floor: 3 },
  { id: 302, type: "Superior",            capacity: 2, price: 140, floor: 3 },
  { id: 303, type: "Superior",            capacity: 3, price: 155, floor: 3 },
  { id: 304, type: "Superior",            capacity: 3, price: 155, floor: 3 },
  { id: 305, type: "Deluxe",              capacity: 2, price: 180, floor: 3 },
  { id: 306, type: "Deluxe",              capacity: 2, price: 180, floor: 3 },
  { id: 307, type: "Deluxe",              capacity: 2, price: 185, floor: 3 },
  { id: 308, type: "Deluxe",              capacity: 3, price: 200, floor: 3 },
  { id: 309, type: "Deluxe",              capacity: 2, price: 180, floor: 3 },
  { id: 310, type: "Deluxe",              capacity: 2, price: 185, floor: 3 },

  // - Piano 4 — Deluxe / Junior Suite (10 camere) -
  { id: 401, type: "Deluxe",              capacity: 2, price: 190, floor: 4 },
  { id: 402, type: "Deluxe",              capacity: 2, price: 190, floor: 4 },
  { id: 403, type: "Deluxe",              capacity: 3, price: 210, floor: 4 },
  { id: 404, type: "Deluxe",              capacity: 3, price: 210, floor: 4 },
  { id: 405, type: "Junior Suite",        capacity: 2, price: 240, floor: 4 },
  { id: 406, type: "Junior Suite",        capacity: 2, price: 240, floor: 4 },
  { id: 407, type: "Junior Suite",        capacity: 3, price: 260, floor: 4 },
  { id: 408, type: "Junior Suite",        capacity: 3, price: 260, floor: 4 },
  { id: 409, type: "Junior Suite",        capacity: 2, price: 245, floor: 4 },
  { id: 410, type: "Junior Suite",        capacity: 2, price: 245, floor: 4 },

  // - Piano 5 — Suite (10 camere) -
  { id: 501, type: "Suite",               capacity: 4, price: 280, floor: 5 },
  { id: 502, type: "Suite",               capacity: 4, price: 280, floor: 5 },
  { id: 503, type: "Suite",               capacity: 4, price: 290, floor: 5 },
  { id: 504, type: "Suite",               capacity: 4, price: 290, floor: 5 },
  { id: 505, type: "Suite",               capacity: 4, price: 295, floor: 5 },
  { id: 506, type: "Suite",               capacity: 4, price: 295, floor: 5 },
  { id: 507, type: "Suite Vista Laguna",  capacity: 4, price: 340, floor: 5 },
  { id: 508, type: "Suite Vista Laguna",  capacity: 4, price: 340, floor: 5 },
  { id: 509, type: "Suite Vista Laguna",  capacity: 4, price: 350, floor: 5 },
  { id: 510, type: "Suite Vista Laguna",  capacity: 5, price: 360, floor: 5 },

  // - Piano 6 — Suite Presidenziale / Penthouse (9 camere) -
  { id: 601, type: "Suite Presidenziale", capacity: 6, price: 450, floor: 6 },
  { id: 602, type: "Suite Presidenziale", capacity: 6, price: 450, floor: 6 },
  { id: 603, type: "Suite Presidenziale", capacity: 6, price: 470, floor: 6 },
  { id: 604, type: "Suite Presidenziale", capacity: 6, price: 470, floor: 6 },
  { id: 605, type: "Suite Presidenziale", capacity: 6, price: 490, floor: 6 },
  { id: 606, type: "Penthouse",           capacity: 6, price: 650, floor: 6 },
  { id: 607, type: "Penthouse",           capacity: 6, price: 650, floor: 6 },
  { id: 608, type: "Penthouse",           capacity: 8, price: 750, floor: 6 },
  { id: 609, type: "Penthouse",           capacity: 8, price: 850, floor: 6 },
];

const SERVICES = [
  { id: "colazione", label: "Colazione",        price: 18 },
  { id: "parcheggio",label: "Parcheggio",       price: 20 },
  { id: "spa",       label: "Accesso SPA",      price: 45 },
  { id: "transfer",  label: "Transfer Aeroporto",price:60 },
  { id: "minibar",   label: "Minibar Deluxe",   price: 35 },
  { id: "laundry",   label: "Lavanderia",       price: 25 },
];

const TAX_RATE = 0.10;

const NAZIONALITA = [
  { code:"IT",name:"Italiana" },{ code:"DE",name:"Tedesca" },
  { code:"FR",name:"Francese" },{ code:"GB",name:"Britannica" },
  { code:"US",name:"Statunitense" },{ code:"ES",name:"Spagnola" },
  { code:"NL",name:"Olandese" },{ code:"CH",name:"Svizzera" },
  { code:"AT",name:"Austriaca" },{ code:"BE",name:"Belga" },
  { code:"PT",name:"Portoghese" },{ code:"PL",name:"Polacca" },
  { code:"RU",name:"Russa" },{ code:"CN",name:"Cinese" },
  { code:"JP",name:"Giapponese" },{ code:"BR",name:"Brasiliana" },
  { code:"AU",name:"Australiana" },{ code:"CA",name:"Canadese" },
  { code:"XX",name:"Altra" },
];

const TIPO_DOC = [
  "Carta d'identità","Passaporto","Patente di guida",
  "Permesso di soggiorno","Libretto di lavoro",
];

// Palette chiara
const C = {
  // Layout Opera Cloud: sidebar scura, contenuto bianco
  bg:       "#f0f3f7",
  surface:  "#ffffff",
  surface2: "#f5f7fa",
  border:   "#dde3ec",
  border2:  "#c4cdd9",
  text:     "#1a2535",
  text2:    "#4a5568",
  text3:    "#8896a8",
  // Accento principale: blu Oracle
  gold:     "#0f62fe",
  goldL:    "#e8f0ff",
  goldLb:   "#b3ccff",
  // Sidebar scura
  sidebar:  "#0a1929",
  sidebarM: "#0d2137",
  sidebarA: "#1565c0",
  sidebarT: "#90b4d4",
  sidebarAT:"#ffffff",
  // Colori semantici
  navy:     "#1565c0",
  navyL:    "#e3f0ff",
  navyLb:   "#90caf9",
  green:    "#1b7a4a",
  greenL:   "#e6f7ee",
  greenLb:  "#6fcf97",
  red:      "#c62828",
  redL:     "#fdecea",
  redLb:    "#ef9a9a",
  amber:    "#e65100",
  amberL:   "#fff3e0",
  amberLb:  "#ffcc80",
  purple:   "#5c35cc",
  purpleL:  "#ede9fe",
  gray:     "#607080",
  grayL:    "#f0f3f7",
};

const STATUS_CFG = {
  reserved:     { bg: C.navyL,  text: C.navy,  border: C.navyLb,  label: "Prenotato" },
  "checked-in": { bg: C.greenL, text: C.green, border: C.greenLb, label: "Check-In"  },
  "checked-out":{ bg: C.grayL,  text: C.gray,  border: C.border,  label: "Check-Out" },
  cancelled:    { bg: C.redL,   text: C.red,   border: C.redLb,   label: "Annullato" },
};

const PAGES = ["Dashboard","Prenotazioni","Anagrafica","Check-In/Out","Disponibilità","Camere","Prezzi & Revenue","Cassa","Pubblica Sicurezza","ISTAT Veneto","API & Integrazioni","Ristorante POS","Statistiche","Configurazione"];

// - HELPERS -

const genId      = () => "RES" + Date.now().toString().slice(-6) + Math.floor(Math.random()*100);
const genGuestId = () => "GST" + Date.now().toString().slice(-6) + Math.floor(Math.random()*100);
const fmtDate    = (d) => d ? new Date(d).toLocaleDateString("it-IT") : "";
const nights     = (a,b) => (!a||!b) ? 0 : Math.max(0, Math.round((new Date(b)-new Date(a))/86400000));

function roomAvail(room, ci, co, ress, excl=null) {
  if (!ci||!co) return true;
  return !ress.some(r => {
    if (r.id===excl || r.roomId!==room.id) return false;
    if (["checked-out","cancelled"].includes(r.status)) return false;
    return new Date(ci)<new Date(r.checkOut) && new Date(co)>new Date(r.checkIn);
  });
}

const COMUNI_IT = [
  {c:"Abano Terme",p:"PD",z:"35031",r:"Veneto"},
  {c:"Abbiategrasso",p:"MI",z:"20081",r:"Lombardia"},
  {c:"Acireale",p:"CT",z:"95024",r:"Sicilia"},
  {c:"Acri",p:"CS",z:"87041",r:"Calabria"},
  {c:"Adrano",p:"CT",z:"95031",r:"Sicilia"},
  {c:"Afragola",p:"NA",z:"80021",r:"Campania"},
  {c:"Agrate Brianza",p:"MB",z:"20864",r:"Lombardia"},
  {c:"Agrigento",p:"AG",z:"92100",r:"Sicilia"},
  {c:"Alba",p:"CN",z:"12051",r:"Piemonte"},
  {c:"Albenga",p:"SV",z:"17031",r:"Liguria"},
  {c:"Albignasego",p:"PD",z:"35020",r:"Veneto"},
  {c:"Alcamo",p:"TP",z:"91011",r:"Sicilia"},
  {c:"Alessandria",p:"AL",z:"15100",r:"Piemonte"},
  {c:"Alghero",p:"SS",z:"07041",r:"Sardegna"},
  {c:"Altamura",p:"BA",z:"70022",r:"Puglia"},
  {c:"Amalfi",p:"SA",z:"84011",r:"Campania"},
  {c:"Ancona",p:"AN",z:"60100",r:"Marche"},
  {c:"Andria",p:"BT",z:"76123",r:"Puglia"},
  {c:"Aosta",p:"AO",z:"11100",r:"Valle d Aosta"},
  {c:"Aprilia",p:"LT",z:"04011",r:"Lazio"},
  {c:"Arcore",p:"MB",z:"20862",r:"Lombardia"},
  {c:"Arezzo",p:"AR",z:"52100",r:"Toscana"},
  {c:"Ariccia",p:"RM",z:"00040",r:"Lazio"},
  {c:"Arona",p:"NO",z:"28041",r:"Piemonte"},
  {c:"Arzano",p:"NA",z:"80022",r:"Campania"},
  {c:"Ascoli Piceno",p:"AP",z:"63100",r:"Marche"},
  {c:"Assisi",p:"PG",z:"06081",r:"Umbria"},
  {c:"Asti",p:"AT",z:"14100",r:"Piemonte"},
  {c:"Avellino",p:"AV",z:"83100",r:"Campania"},
  {c:"Avezzano",p:"AQ",z:"67051",r:"Abruzzo"},
  {c:"Avola",p:"SR",z:"96012",r:"Sicilia"},
  {c:"Bagheria",p:"PA",z:"90011",r:"Sicilia"},
  {c:"Bareggio",p:"MI",z:"20010",r:"Lombardia"},
  {c:"Bari",p:"BA",z:"70100",r:"Puglia"},
  {c:"Barletta",p:"BT",z:"76121",r:"Puglia"},
  {c:"Bassano del Grappa",p:"VI",z:"36061",r:"Veneto"},
  {c:"Battipaglia",p:"SA",z:"84091",r:"Campania"},
  {c:"Belluno",p:"BL",z:"32100",r:"Veneto"},
  {c:"Benevento",p:"BN",z:"82100",r:"Campania"},
  {c:"Bergamo",p:"BG",z:"24100",r:"Lombardia"},
  {c:"Biancavilla",p:"CT",z:"95033",r:"Sicilia"},
  {c:"Biella",p:"BI",z:"13900",r:"Piemonte"},
  {c:"Bisceglie",p:"BT",z:"76011",r:"Puglia"},
  {c:"Bitonto",p:"BA",z:"70032",r:"Puglia"},
  {c:"Bollate",p:"MI",z:"20021",r:"Lombardia"},
  {c:"Bologna",p:"BO",z:"40100",r:"Emilia-Romagna"},
  {c:"Bolzano",p:"BZ",z:"39100",r:"Trentino-Alto Adige"},
  {c:"Borgomanero",p:"NO",z:"28021",r:"Piemonte"},
  {c:"Borgosesia",p:"VC",z:"13011",r:"Piemonte"},
  {c:"Bracciano",p:"RM",z:"00062",r:"Lazio"},
  {c:"Brescia",p:"BS",z:"25100",r:"Lombardia"},
  {c:"Brindisi",p:"BR",z:"72100",r:"Puglia"},
  {c:"Brugherio",p:"MB",z:"20861",r:"Lombardia"},
  {c:"Brunico",p:"BZ",z:"39031",r:"Trentino-Alto Adige"},
  {c:"Busto Arsizio",p:"VA",z:"21052",r:"Lombardia"},
  {c:"Cagliari",p:"CA",z:"09100",r:"Sardegna"},
  {c:"Caivano",p:"NA",z:"80023",r:"Campania"},
  {c:"Caltagirone",p:"CT",z:"95041",r:"Sicilia"},
  {c:"Caltanissetta",p:"CL",z:"93100",r:"Sicilia"},
  {c:"Camogli",p:"GE",z:"16032",r:"Liguria"},
  {c:"Campobasso",p:"CB",z:"86100",r:"Molise"},
  {c:"Canosa di Puglia",p:"BT",z:"76012",r:"Puglia"},
  {c:"Cantu",p:"CO",z:"22063",r:"Lombardia"},
  {c:"Carate Brianza",p:"MB",z:"20841",r:"Lombardia"},
  {c:"Carbonia",p:"CI",z:"09013",r:"Sardegna"},
  {c:"Cardito",p:"NA",z:"80024",r:"Campania"},
  {c:"Carpi",p:"MO",z:"41012",r:"Emilia-Romagna"},
  {c:"Carrara",p:"MS",z:"54033",r:"Toscana"},
  {c:"Casale Monferrato",p:"AL",z:"15033",r:"Piemonte"},
  {c:"Casalecchio di Reno",p:"BO",z:"40033",r:"Emilia-Romagna"},
  {c:"Casalnuovo di Napoli",p:"NA",z:"80013",r:"Campania"},
  {c:"Casarano",p:"LE",z:"73042",r:"Puglia"},
  {c:"Caserta",p:"CE",z:"81100",r:"Campania"},
  {c:"Casoria",p:"NA",z:"80026",r:"Campania"},
  {c:"Cassino",p:"FR",z:"03043",r:"Lazio"},
  {c:"Castellammare di Stabia",p:"NA",z:"80053",r:"Campania"},
  {c:"Castrovillari",p:"CS",z:"87012",r:"Calabria"},
  {c:"Catania",p:"CT",z:"95100",r:"Sicilia"},
  {c:"Catanzaro",p:"CZ",z:"88100",r:"Calabria"},
  {c:"Cava de Tirreni",p:"SA",z:"84013",r:"Campania"},
  {c:"Cento",p:"FE",z:"44042",r:"Emilia-Romagna"},
  {c:"Cerignola",p:"FG",z:"71042",r:"Puglia"},
  {c:"Cesano Maderno",p:"MB",z:"20811",r:"Lombardia"},
  {c:"Cesena",p:"FC",z:"47521",r:"Emilia-Romagna"},
  {c:"Chieti",p:"CH",z:"66100",r:"Abruzzo"},
  {c:"Chioggia",p:"VE",z:"30015",r:"Veneto"},
  {c:"Chivasso",p:"TO",z:"10034",r:"Piemonte"},
  {c:"Ciampino",p:"RM",z:"00043",r:"Lazio"},
  {c:"Cinisello Balsamo",p:"MI",z:"20092",r:"Lombardia"},
  {c:"Civitanova Marche",p:"MC",z:"62012",r:"Marche"},
  {c:"Civitavecchia",p:"RM",z:"00053",r:"Lazio"},
  {c:"Colleferro",p:"RM",z:"00034",r:"Lazio"},
  {c:"Collegno",p:"TO",z:"10093",r:"Piemonte"},
  {c:"Comiso",p:"RG",z:"97013",r:"Sicilia"},
  {c:"Como",p:"CO",z:"22100",r:"Lombardia"},
  {c:"Conegliano",p:"TV",z:"31015",r:"Veneto"},
  {c:"Corigliano Calabro",p:"CS",z:"87064",r:"Calabria"},
  {c:"Corsico",p:"MI",z:"20094",r:"Lombardia"},
  {c:"Cosenza",p:"CS",z:"87100",r:"Calabria"},
  {c:"Cremona",p:"CR",z:"26100",r:"Lombardia"},
  {c:"Crotone",p:"KR",z:"88900",r:"Calabria"},
  {c:"Cuneo",p:"CN",z:"12100",r:"Piemonte"},
  {c:"Dalmine",p:"BG",z:"24044",r:"Lombardia"},
  {c:"Desio",p:"MB",z:"20832",r:"Lombardia"},
  {c:"Empoli",p:"FI",z:"50053",r:"Toscana"},
  {c:"Enna",p:"EN",z:"94100",r:"Sicilia"},
  {c:"Ercolano",p:"NA",z:"80056",r:"Campania"},
  {c:"Fabriano",p:"AN",z:"60044",r:"Marche"},
  {c:"Faenza",p:"RA",z:"48018",r:"Emilia-Romagna"},
  {c:"Fano",p:"PU",z:"61032",r:"Marche"},
  {c:"Fasano",p:"BR",z:"72015",r:"Puglia"},
  {c:"Favara",p:"AG",z:"92026",r:"Sicilia"},
  {c:"Ferrara",p:"FE",z:"44100",r:"Emilia-Romagna"},
  {c:"Fidenza",p:"PR",z:"43036",r:"Emilia-Romagna"},
  {c:"Firenze",p:"FI",z:"50100",r:"Toscana"},
  {c:"Fiumicino",p:"RM",z:"00054",r:"Lazio"},
  {c:"Foggia",p:"FG",z:"71100",r:"Puglia"},
  {c:"Foligno",p:"PG",z:"06034",r:"Umbria"},
  {c:"Forli",p:"FC",z:"47100",r:"Emilia-Romagna"},
  {c:"Formia",p:"LT",z:"04023",r:"Lazio"},
  {c:"Fossano",p:"CN",z:"12045",r:"Piemonte"},
  {c:"Frattamaggiore",p:"NA",z:"80027",r:"Campania"},
  {c:"Frosinone",p:"FR",z:"03100",r:"Lazio"},
  {c:"Gallarate",p:"VA",z:"21013",r:"Lombardia"},
  {c:"Gela",p:"CL",z:"93012",r:"Sicilia"},
  {c:"Genova",p:"GE",z:"16100",r:"Liguria"},
  {c:"Giarre",p:"CT",z:"95014",r:"Sicilia"},
  {c:"Gioia Tauro",p:"RC",z:"89013",r:"Calabria"},
  {c:"Giugliano in Campania",p:"NA",z:"80014",r:"Campania"},
  {c:"Giulianova",p:"TE",z:"64021",r:"Abruzzo"},
  {c:"Gorizia",p:"GO",z:"34170",r:"Friuli-Venezia Giulia"},
  {c:"Gravina in Puglia",p:"BA",z:"70024",r:"Puglia"},
  {c:"Grosseto",p:"GR",z:"58100",r:"Toscana"},
  {c:"Grugliasco",p:"TO",z:"10095",r:"Piemonte"},
  {c:"Guidonia",p:"RM",z:"00012",r:"Lazio"},
  {c:"Imola",p:"BO",z:"40026",r:"Emilia-Romagna"},
  {c:"Imperia",p:"IM",z:"18100",r:"Liguria"},
  {c:"Ivrea",p:"TO",z:"10015",r:"Piemonte"},
  {c:"Jesolo",p:"VE",z:"30016",r:"Veneto"},
  {c:"L Aquila",p:"AQ",z:"67100",r:"Abruzzo"},
  {c:"La Spezia",p:"SP",z:"19100",r:"Liguria"},
  {c:"Lamezia Terme",p:"CZ",z:"88046",r:"Calabria"},
  {c:"Lanciano",p:"CH",z:"66034",r:"Abruzzo"},
  {c:"Latina",p:"LT",z:"04100",r:"Lazio"},
  {c:"Lecce",p:"LE",z:"73100",r:"Puglia"},
  {c:"Lecco",p:"LC",z:"23900",r:"Lombardia"},
  {c:"Legnago",p:"VR",z:"37045",r:"Veneto"},
  {c:"Legnano",p:"MI",z:"20025",r:"Lombardia"},
  {c:"Lentini",p:"SR",z:"96016",r:"Sicilia"},
  {c:"Lissone",p:"MB",z:"20851",r:"Lombardia"},
  {c:"Livorno",p:"LI",z:"57100",r:"Toscana"},
  {c:"Lodi",p:"LO",z:"26900",r:"Lombardia"},
  {c:"Lucca",p:"LU",z:"55100",r:"Toscana"},
  {c:"Lucera",p:"FG",z:"71036",r:"Puglia"},
  {c:"Lugo",p:"RA",z:"48022",r:"Emilia-Romagna"},
  {c:"Macerata",p:"MC",z:"62100",r:"Marche"},
  {c:"Maddaloni",p:"CE",z:"81024",r:"Campania"},
  {c:"Manfredonia",p:"FG",z:"71043",r:"Puglia"},
  {c:"Mantova",p:"MN",z:"46100",r:"Lombardia"},
  {c:"Marano di Napoli",p:"NA",z:"80016",r:"Campania"},
  {c:"Marsala",p:"TP",z:"91025",r:"Sicilia"},
  {c:"Martina Franca",p:"TA",z:"74015",r:"Puglia"},
  {c:"Massa",p:"MS",z:"54100",r:"Toscana"},
  {c:"Matera",p:"MT",z:"75100",r:"Basilicata"},
  {c:"Meda",p:"MB",z:"20821",r:"Lombardia"},
  {c:"Melegnano",p:"MI",z:"20077",r:"Lombardia"},
  {c:"Melito di Napoli",p:"NA",z:"80017",r:"Campania"},
  {c:"Merano",p:"BZ",z:"39012",r:"Trentino-Alto Adige"},
  {c:"Messina",p:"ME",z:"98100",r:"Sicilia"},
  {c:"Mestre",p:"VE",z:"30170",r:"Veneto"},
  {c:"Milano",p:"MI",z:"20100",r:"Lombardia"},
  {c:"Misterbianco",p:"CT",z:"95045",r:"Sicilia"},
  {c:"Modena",p:"MO",z:"41100",r:"Emilia-Romagna"},
  {c:"Modica",p:"RG",z:"97015",r:"Sicilia"},
  {c:"Molfetta",p:"BA",z:"70056",r:"Puglia"},
  {c:"Monopoli",p:"BA",z:"70043",r:"Puglia"},
  {c:"Monreale",p:"PA",z:"90046",r:"Sicilia"},
  {c:"Monselice",p:"PD",z:"35043",r:"Veneto"},
  {c:"Montesilvano",p:"PE",z:"65015",r:"Abruzzo"},
  {c:"Monza",p:"MB",z:"20900",r:"Lombardia"},
  {c:"Napoli",p:"NA",z:"80100",r:"Campania"},
  {c:"Nichelino",p:"TO",z:"10042",r:"Piemonte"},
  {c:"Nola",p:"NA",z:"80035",r:"Campania"},
  {c:"Noto",p:"SR",z:"96017",r:"Sicilia"},
  {c:"Novara",p:"NO",z:"28100",r:"Piemonte"},
  {c:"Novate Milanese",p:"MI",z:"20026",r:"Lombardia"},
  {c:"Nuoro",p:"NU",z:"08100",r:"Sardegna"},
  {c:"Orbassano",p:"TO",z:"10043",r:"Piemonte"},
  {c:"Oristano",p:"OR",z:"09170",r:"Sardegna"},
  {c:"Ortona",p:"CH",z:"66026",r:"Abruzzo"},
  {c:"Ostia",p:"RM",z:"00121",r:"Lazio"},
  {c:"Pachino",p:"SR",z:"96018",r:"Sicilia"},
  {c:"Padova",p:"PD",z:"35100",r:"Veneto"},
  {c:"Palagonia",p:"CT",z:"95046",r:"Sicilia"},
  {c:"Palermo",p:"PA",z:"90100",r:"Sicilia"},
  {c:"Palmi",p:"RC",z:"89015",r:"Calabria"},
  {c:"Parabiago",p:"MI",z:"20015",r:"Lombardia"},
  {c:"Parma",p:"PR",z:"43100",r:"Emilia-Romagna"},
  {c:"Partinico",p:"PA",z:"90047",r:"Sicilia"},
  {c:"Pavia",p:"PV",z:"27100",r:"Lombardia"},
  {c:"Perugia",p:"PG",z:"06100",r:"Umbria"},
  {c:"Pesaro",p:"PU",z:"61121",r:"Marche"},
  {c:"Pescara",p:"PE",z:"65100",r:"Abruzzo"},
  {c:"Piacenza",p:"PC",z:"29121",r:"Emilia-Romagna"},
  {c:"Pioltello",p:"MI",z:"20096",r:"Lombardia"},
  {c:"Piombino",p:"LI",z:"57025",r:"Toscana"},
  {c:"Pisa",p:"PI",z:"56100",r:"Toscana"},
  {c:"Pistoia",p:"PT",z:"51100",r:"Toscana"},
  {c:"Pomigliano d Arco",p:"NA",z:"80038",r:"Campania"},
  {c:"Pompei",p:"NA",z:"80045",r:"Campania"},
  {c:"Pordenone",p:"PN",z:"33170",r:"Friuli-Venezia Giulia"},
  {c:"Portici",p:"NA",z:"80055",r:"Campania"},
  {c:"Portogruaro",p:"VE",z:"30026",r:"Veneto"},
  {c:"Potenza",p:"PZ",z:"85100",r:"Basilicata"},
  {c:"Pozzuoli",p:"NA",z:"80078",r:"Campania"},
  {c:"Prato",p:"PO",z:"59100",r:"Toscana"},
  {c:"Ragusa",p:"RG",z:"97100",r:"Sicilia"},
  {c:"Rapallo",p:"GE",z:"16035",r:"Liguria"},
  {c:"Ravenna",p:"RA",z:"48121",r:"Emilia-Romagna"},
  {c:"Reggio Calabria",p:"RC",z:"89100",r:"Calabria"},
  {c:"Reggio Emilia",p:"RE",z:"42100",r:"Emilia-Romagna"},
  {c:"Rho",p:"MI",z:"20017",r:"Lombardia"},
  {c:"Riccione",p:"RN",z:"47838",r:"Emilia-Romagna"},
  {c:"Rieti",p:"RI",z:"02100",r:"Lazio"},
  {c:"Rimini",p:"RN",z:"47921",r:"Emilia-Romagna"},
  {c:"Rivoli",p:"TO",z:"10098",r:"Piemonte"},
  {c:"Roma",p:"RM",z:"00100",r:"Lazio"},
  {c:"Rosolini",p:"SR",z:"96019",r:"Sicilia"},
  {c:"Rovereto",p:"TN",z:"38068",r:"Trentino-Alto Adige"},
  {c:"Rovigo",p:"RO",z:"45100",r:"Veneto"},
  {c:"Salerno",p:"SA",z:"84121",r:"Campania"},
  {c:"Saluzzo",p:"CN",z:"12037",r:"Piemonte"},
  {c:"San Benedetto del Tronto",p:"AP",z:"63074",r:"Marche"},
  {c:"San Cataldo",p:"CL",z:"93017",r:"Sicilia"},
  {c:"San Dona di Piave",p:"VE",z:"30027",r:"Veneto"},
  {c:"San Giorgio a Cremano",p:"NA",z:"80046",r:"Campania"},
  {c:"San Giovanni Rotondo",p:"FG",z:"71013",r:"Puglia"},
  {c:"San Giovanni in Persiceto",p:"BO",z:"40017",r:"Emilia-Romagna"},
  {c:"San Giuliano Milanese",p:"MI",z:"20098",r:"Lombardia"},
  {c:"San Lazzaro di Savena",p:"BO",z:"40068",r:"Emilia-Romagna"},
  {c:"San Remo",p:"IM",z:"18038",r:"Liguria"},
  {c:"San Severo",p:"FG",z:"71016",r:"Puglia"},
  {c:"Sarzana",p:"SP",z:"19038",r:"Liguria"},
  {c:"Sassari",p:"SS",z:"07100",r:"Sardegna"},
  {c:"Schio",p:"VI",z:"36015",r:"Veneto"},
  {c:"Sciacca",p:"AG",z:"92019",r:"Sicilia"},
  {c:"Segrate",p:"MI",z:"20054",r:"Lombardia"},
  {c:"Seriate",p:"BG",z:"24068",r:"Lombardia"},
  {c:"Sesto Fiorentino",p:"FI",z:"50019",r:"Toscana"},
  {c:"Sesto San Giovanni",p:"MI",z:"20099",r:"Lombardia"},
  {c:"Settimo Torinese",p:"TO",z:"10036",r:"Piemonte"},
  {c:"Siena",p:"SI",z:"53100",r:"Toscana"},
  {c:"Siracusa",p:"SR",z:"96100",r:"Sicilia"},
  {c:"Sondrio",p:"SO",z:"23100",r:"Lombardia"},
  {c:"Sorrento",p:"NA",z:"80067",r:"Campania"},
  {c:"Spoleto",p:"PG",z:"06049",r:"Umbria"},
  {c:"Taranto",p:"TA",z:"74121",r:"Puglia"},
  {c:"Termini Imerese",p:"PA",z:"90018",r:"Sicilia"},
  {c:"Terni",p:"TR",z:"05100",r:"Umbria"},
  {c:"Thiene",p:"VI",z:"36016",r:"Veneto"},
  {c:"Tivoli",p:"RM",z:"00019",r:"Lazio"},
  {c:"Torino",p:"TO",z:"10100",r:"Piemonte"},
  {c:"Torre Annunziata",p:"NA",z:"80058",r:"Campania"},
  {c:"Torre del Greco",p:"NA",z:"80059",r:"Campania"},
  {c:"Tortona",p:"AL",z:"15057",r:"Piemonte"},
  {c:"Trani",p:"BT",z:"76125",r:"Puglia"},
  {c:"Trapani",p:"TP",z:"91100",r:"Sicilia"},
  {c:"Trento",p:"TN",z:"38121",r:"Trentino-Alto Adige"},
  {c:"Treviglio",p:"BG",z:"24047",r:"Lombardia"},
  {c:"Treviso",p:"TV",z:"31100",r:"Veneto"},
  {c:"Tricase",p:"LE",z:"73039",r:"Puglia"},
  {c:"Trieste",p:"TS",z:"34100",r:"Friuli-Venezia Giulia"},
  {c:"Udine",p:"UD",z:"33100",r:"Friuli-Venezia Giulia"},
  {c:"Valdagno",p:"VI",z:"36078",r:"Veneto"},
  {c:"Varese",p:"VA",z:"21100",r:"Lombardia"},
  {c:"Venezia",p:"VE",z:"30121",r:"Veneto"},
  {c:"Ventimiglia",p:"IM",z:"18039",r:"Liguria"},
  {c:"Verbania",p:"VB",z:"28921",r:"Piemonte"},
  {c:"Vercelli",p:"VC",z:"13100",r:"Piemonte"},
  {c:"Verona",p:"VR",z:"37121",r:"Veneto"},
  {c:"Viareggio",p:"LU",z:"55049",r:"Toscana"},
  {c:"Vicenza",p:"VI",z:"36100",r:"Veneto"},
  {c:"Vigevano",p:"PV",z:"27029",r:"Lombardia"},
  {c:"Vignola",p:"MO",z:"41058",r:"Emilia-Romagna"},
  {c:"Viterbo",p:"VT",z:"01100",r:"Lazio"},
  {c:"Vittoria",p:"RG",z:"97019",r:"Sicilia"},
  {c:"Voghera",p:"PV",z:"27058",r:"Lombardia"},
];

// - AUTOCOMPLETE COMUNE ITALIANO -
const emptyGuest = () => ({
  id:genGuestId(), tipo:"individuale",
  cognome:"", nome:"", sesso:"M", dataNascita:"",
  luogoNascita:"", provinciaNascita:"", nazionalita:"IT",
  tipoDoc:"Carta d'identità", numDoc:"", rilasciatoDa:"",
  dataRilascio:"", scadenzaDoc:"",
  indirizzo:"", citta:"", cap:"", provincia:"", paese:"Italia",
  email:"", telefono:"", note:"",
});

const emptyAzienda = () => ({
  id:genGuestId(), tipo:"azienda",
  ragioneSociale:"", piva:"", codiceFiscale:"", sdi:"", pec:"",
  settore:"", referente:"", ruoloReferente:"",
  indirizzo:"", citta:"", cap:"", provincia:"", paese:"Italia",
  email:"", telefono:"", note:"",
});

// - DATI DEMO -

const DEMO_GUESTS = [
  { id:"GST001", cognome:"Bianchi", nome:"Marco", sesso:"M",
    dataNascita:"1980-05-15", luogoNascita:"Milano", provinciaNascita:"MI",
    nazionalita:"IT", tipoDoc:"Carta d'identità", numDoc:"AX1234567",
    rilasciatoDa:"Comune di Milano", dataRilascio:"2020-01-10", scadenzaDoc:"2030-01-10",
    indirizzo:"Via Dante 5", citta:"Milano", cap:"20121", provincia:"MI", paese:"Italia",
    email:"marco.bianchi@email.it", telefono:"333-1234567", note:"Cliente VIP" },
  { id:"GST002", cognome:"Romano", nome:"Sofia", sesso:"F",
    dataNascita:"1990-08-22", luogoNascita:"Napoli", provinciaNascita:"NA",
    nazionalita:"IT", tipoDoc:"Passaporto", numDoc:"YA9876543",
    rilasciatoDa:"Questura di Napoli", dataRilascio:"2022-03-15", scadenzaDoc:"2032-03-15",
    indirizzo:"Corso Umberto 12", citta:"Napoli", cap:"80138", provincia:"NA", paese:"Italia",
    email:"sofia.romano@email.it", telefono:"347-9876543", note:"" },
  { id:"GST003", cognome:"Müller", nome:"Hans", sesso:"M",
    dataNascita:"1975-03-08", luogoNascita:"Berlin", provinciaNascita:"BE",
    nazionalita:"DE", tipoDoc:"Passaporto", numDoc:"DE8765432",
    rilasciatoDa:"Ausländerbehörde Berlin", dataRilascio:"2021-06-20", scadenzaDoc:"2031-06-20",
    indirizzo:"Unter den Linden 10", citta:"Berlin", cap:"10117", provincia:"", paese:"Germania",
    email:"hans.muller@email.de", telefono:"+49-30-1234567", note:"Parla italiano" },
];

const DEMO_RESERVATIONS = [
  { id:"RES001", guestId:"GST001", guestName:"Bianchi Marco",
    companions:[], roomId:201, checkIn:"2026-02-22", checkOut:"2026-02-25",
    guests:2, adulti:2, bambini:0, services:["colazione","parcheggio"], status:"checked-in",
    notes:"Cliente VIP", roomServiceItems:[], payments:[{amount:100,method:"Carta di Credito",date:"22/02/2026"}],
    checkInTime:"2026-02-22T14:30:00", psInviato:true, istatRegistrato:false },
  { id:"RES002", guestId:"GST002", guestName:"Romano Sofia",
    companions:[], roomId:301, checkIn:"2026-02-24", checkOut:"2026-02-28",
    guests:4, adulti:2, bambini:2, services:["spa","colazione"], status:"reserved",
    notes:"", roomServiceItems:[], payments:[], psInviato:false, istatRegistrato:false },
  { id:"RES003", guestId:"GST003", guestName:"Müller Hans",
    companions:[], roomId:203, checkIn:"2026-02-20", checkOut:"2026-02-22",
    guests:1, adulti:1, bambini:0, services:["colazione"], status:"checked-out",
    notes:"", roomServiceItems:[],
    payments:[{amount:396,method:"Carta di Credito",date:"22/02/2026"}],
    psInviato:true, istatRegistrato:true },
];

// - POS RISTORANTE — DATI STATICI -

const TAVOLI_LAYOUT = [
  // sala principale
  { id:1,  nome:"T1",  posti:2, x:8,   y:10,  w:80,  h:70,  sala:"Sala Principale" },
  { id:2,  nome:"T2",  posti:2, x:110, y:10,  w:80,  h:70,  sala:"Sala Principale" },
  { id:3,  nome:"T3",  posti:4, x:212, y:10,  w:100, h:70,  sala:"Sala Principale" },
  { id:4,  nome:"T4",  posti:4, x:334, y:10,  w:100, h:70,  sala:"Sala Principale" },
  { id:5,  nome:"T5",  posti:6, x:456, y:10,  w:120, h:70,  sala:"Sala Principale" },
  { id:6,  nome:"T6",  posti:2, x:8,   y:110, w:80,  h:70,  sala:"Sala Principale" },
  { id:7,  nome:"T7",  posti:4, x:110, y:110, w:100, h:70,  sala:"Sala Principale" },
  { id:8,  nome:"T8",  posti:4, x:232, y:110, w:100, h:70,  sala:"Sala Principale" },
  { id:9,  nome:"T9",  posti:6, x:354, y:110, w:120, h:70,  sala:"Sala Principale" },
  { id:10, nome:"T10", posti:8, x:496, y:110, w:140, h:70,  sala:"Sala Principale" },
  // terrazza
  { id:11, nome:"Ter1",posti:2, x:8,   y:10,  w:80,  h:70,  sala:"Terrazza" },
  { id:12, nome:"Ter2",posti:2, x:110, y:10,  w:80,  h:70,  sala:"Terrazza" },
  { id:13, nome:"Ter3",posti:4, x:212, y:10,  w:100, h:70,  sala:"Terrazza" },
  { id:14, nome:"Ter4",posti:4, x:334, y:10,  w:100, h:70,  sala:"Terrazza" },
  // sala privata
  { id:15, nome:"Priv1",posti:10,x:8,  y:10,  w:200, h:100, sala:"Sala Privata" },
  { id:16, nome:"Priv2",posti:12,x:230,y:10,  w:220, h:100, sala:"Sala Privata" },
];

const MENU_VOCI = [
  // Antipasti
  { id:"A01", cat:"Antipasti", nome:"Carpaccio di Branzino",         prezzo:16, iva:10, tempoKitchen:8  },
  { id:"A02", cat:"Antipasti", nome:"Vitello Tonnato",               prezzo:14, iva:10, tempoKitchen:5  },
  { id:"A03", cat:"Antipasti", nome:"Burrata con Pomodori Confit",   prezzo:13, iva:10, tempoKitchen:4  },
  { id:"A04", cat:"Antipasti", nome:"Tagliere Salumi e Formaggi",    prezzo:18, iva:10, tempoKitchen:5  },
  { id:"A05", cat:"Antipasti", nome:"Gamberi in Tempura",            prezzo:17, iva:10, tempoKitchen:10 },
  // Primi
  { id:"P01", cat:"Primi",     nome:"Risotto al Nero di Seppia",     prezzo:20, iva:10, tempoKitchen:18 },
  { id:"P02", cat:"Primi",     nome:"Tagliolini al Ragù di Agnello", prezzo:18, iva:10, tempoKitchen:14 },
  { id:"P03", cat:"Primi",     nome:"Spaghetti alle Vongole",        prezzo:19, iva:10, tempoKitchen:16 },
  { id:"P04", cat:"Primi",     nome:"Gnocchi al Gorgonzola",         prezzo:16, iva:10, tempoKitchen:12 },
  { id:"P05", cat:"Primi",     nome:"Pappardelle al Cinghiale",      prezzo:19, iva:10, tempoKitchen:15 },
  // Secondi
  { id:"S01", cat:"Secondi",   nome:"Branzino al Forno",             prezzo:26, iva:10, tempoKitchen:22 },
  { id:"S02", cat:"Secondi",   nome:"Tagliata di Manzo",             prezzo:28, iva:10, tempoKitchen:18 },
  { id:"S03", cat:"Secondi",   nome:"Costolette d'Agnello",          prezzo:30, iva:10, tempoKitchen:24 },
  { id:"S04", cat:"Secondi",   nome:"Scaloppine al Limone",          prezzo:22, iva:10, tempoKitchen:16 },
  { id:"S05", cat:"Secondi",   nome:"Branzino alla Griglia",         prezzo:24, iva:10, tempoKitchen:20 },
  // Contorni
  { id:"C01", cat:"Contorni",  nome:"Patate al Rosmarino",           prezzo:6,  iva:10, tempoKitchen:10 },
  { id:"C02", cat:"Contorni",  nome:"Verdure Grigliate",             prezzo:7,  iva:10, tempoKitchen:8  },
  { id:"C03", cat:"Contorni",  nome:"Insalata Mista",                prezzo:6,  iva:10, tempoKitchen:3  },
  { id:"C04", cat:"Contorni",  nome:"Spinaci Saltati",               prezzo:7,  iva:10, tempoKitchen:8  },
  // Dolci
  { id:"D01", cat:"Dolci",     nome:"Tiramisù della Casa",           prezzo:9,  iva:10, tempoKitchen:5  },
  { id:"D02", cat:"Dolci",     nome:"Panna Cotta ai Frutti di Bosco",prezzo:8,  iva:10, tempoKitchen:4  },
  { id:"D03", cat:"Dolci",     nome:"Soufflé al Cioccolato",         prezzo:11, iva:10, tempoKitchen:18 },
  { id:"D04", cat:"Dolci",     nome:"Selezione Gelati",              prezzo:7,  iva:10, tempoKitchen:4  },
  // Bevande
  { id:"B01", cat:"Bevande",   nome:"Acqua Naturale 1L",             prezzo:4,  iva:10, tempoKitchen:1  },
  { id:"B02", cat:"Bevande",   nome:"Acqua Frizzante 1L",            prezzo:4,  iva:10, tempoKitchen:1  },
  { id:"B03", cat:"Bevande",   nome:"Vino Bianco (calice)",          prezzo:8,  iva:10, tempoKitchen:1  },
  { id:"B04", cat:"Bevande",   nome:"Vino Rosso (calice)",           prezzo:9,  iva:10, tempoKitchen:1  },
  { id:"B05", cat:"Bevande",   nome:"Prosecco (calice)",             prezzo:8,  iva:10, tempoKitchen:1  },
  { id:"B06", cat:"Bevande",   nome:"Birra Artigianale 33cl",        prezzo:6,  iva:10, tempoKitchen:1  },
  { id:"B07", cat:"Bevande",   nome:"Succo di Frutta",               prezzo:5,  iva:10, tempoKitchen:1  },
  { id:"B08", cat:"Bevande",   nome:"Caffè / Espresso",              prezzo:3,  iva:10, tempoKitchen:2  },
  { id:"B09", cat:"Bevande",   nome:"Amaro della Casa",              prezzo:7,  iva:22, tempoKitchen:1  },
  // Colazione / Buffet (per pre-comanda)
  { id:"K01", cat:"Colazione", nome:"Colazione Continentale",        prezzo:18, iva:10, tempoKitchen:10 },
  { id:"K02", cat:"Colazione", nome:"Uova Strapazzate",              prezzo:10, iva:10, tempoKitchen:8  },
  { id:"K03", cat:"Colazione", nome:"Pancakes con Sciroppo",         prezzo:9,  iva:10, tempoKitchen:10 },
  { id:"K04", cat:"Colazione", nome:"Selezione Frutta Fresca",       prezzo:8,  iva:10, tempoKitchen:4  },
];

const CAT_COLORS = {
  "Antipasti": { bg:"#fff7ed", border:"#fed7aa", text:"#c2410c" },
  "Primi":     { bg:"#fffbeb", border:"#fde68a", text:"#b45309" },
  "Secondi":   { bg:"#f0fdf4", border:"#bbf7d0", text:"#15803d" },
  "Contorni":  { bg:"#f0fdf4", border:"#86efac", text:"#166534" },
  "Dolci":     { bg:"#fdf4ff", border:"#e9d5ff", text:"#7e22ce" },
  "Bevande":   { bg:"#eff6ff", border:"#bfdbfe", text:"#1d4ed8" },
  "Colazione": { bg:"#fef9c3", border:"#fef08a", text:"#854d0e" },
};

// - CSS -

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'IBM Plex Sans', system-ui, sans-serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border2}; border-radius: 3px; }
  input, select, textarea { font-family: 'IBM Plex Sans', sans-serif; }

  /* ── SIDEBAR ── */
  /* .sidebar — width/transform managed via React inline styles */
  .sidebar-logo {
    padding: 20px 20px 16px;
    border-bottom: 1px solid rgba(255,255,255,.08);
  }
  .sidebar-logo-name {
    font-size: 15px; font-weight: 700; color: #fff; letter-spacing: .5px;
  }
  .sidebar-logo-sub {
    font-size: 9px; letter-spacing: 2.5px; color: ${C.sidebarT};
    text-transform: uppercase; margin-top: 2px;
  }
  .sidebar-section {
    font-size: 9px; letter-spacing: 2px; color: rgba(144,180,212,.5);
    text-transform: uppercase; padding: 18px 20px 6px; font-weight: 600;
  }
  .nav-btn {
    display: flex; align-items: center; gap: 10px;
    width: 100%; padding: 9px 20px; border: none; background: none;
    cursor: pointer; font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; font-weight: 400; color: ${C.sidebarT};
    transition: all .15s; text-align: left; border-radius: 0;
    border-left: 3px solid transparent;
    white-space: nowrap; overflow: hidden;
  }
  .nav-btn:hover {
    background: ${C.sidebarM}; color: #fff;
    border-left-color: rgba(21,101,192,.5);
  }
  .nav-btn.active {
    background: ${C.sidebarA}; color: ${C.sidebarAT};
    border-left-color: #5b9dff; font-weight: 600;
  }
  .nav-btn .nav-icon { font-size: 15px; width: 18px; flex-shrink: 0; }
  .sidebar-bottom {
    margin-top: auto; padding: 16px 20px;
    border-top: 1px solid rgba(255,255,255,.08);
    font-size: 11px; color: ${C.sidebarT};
  }

  /* ── TOPBAR ── */
  .topbar {
    position: fixed; top: 0; left: 230px; right: 0; height: 52px;
    background: ${C.surface}; border-bottom: 1px solid ${C.border};
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; z-index: 90;
    box-shadow: 0 1px 4px rgba(0,0,0,.06);
  }
  .topbar-breadcrumb {
    font-size: 13px; color: ${C.text2}; display: flex; align-items: center; gap: 8px;
  }
  .topbar-breadcrumb .current {
    font-weight: 600; color: ${C.text};
  }
  .topbar-actions {
    display: flex; align-items: center; gap: 10px;
  }

  /* ── MAIN CONTENT ── */
  .main-content {
    margin-left: 230px;
    padding: 72px 28px 32px;
    min-height: 100vh;
  }

  /* ── PAGE HEADER ── */
  .page-header {
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid ${C.border};
    display: flex; align-items: flex-end; justify-content: space-between;
  }
  .page-header h1 {
    font-size: 22px; font-weight: 600; color: ${C.text}; letter-spacing: -.3px;
  }
  .page-header .page-subtitle {
    font-size: 12px; color: ${C.text3}; margin-top: 3px;
  }

  /* ── CARDS ── */
  .card {
    background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 6px;
    padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,.04);
  }
  .stat-card {
    background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 6px;
    padding: 18px 20px; position: relative; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,.04);
    transition: box-shadow .2s;
  }
  .stat-card:hover { box-shadow: 0 4px 12px rgba(15,98,254,.1); }
  .stat-card::before {
    content:''; position:absolute; top:0; left:0; width:3px; height:100%;
    background: ${C.gold};
  }

  /* ── BUTTONS ── */
  .btn-primary {
    background: ${C.gold}; color: #fff; border: none; padding: 8px 18px;
    font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500;
    cursor: pointer; border-radius: 4px; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-primary:hover { background: #0050d8; box-shadow: 0 2px 8px rgba(15,98,254,.3); }

  .btn-secondary {
    background: ${C.surface}; border: 1px solid ${C.border2}; color: ${C.text2};
    padding: 7px 16px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
    cursor: pointer; border-radius: 4px; transition: all .15s;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn-secondary:hover { border-color: ${C.gold}; color: ${C.gold}; background: ${C.goldL}; }

  .btn-blue {
    background: ${C.navyL}; border: 1px solid ${C.navyLb}; color: ${C.navy};
    padding: 7px 14px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
    cursor: pointer; border-radius: 4px; transition: all .15s;
  }
  .btn-blue:hover { background: ${C.navyLb}; }

  .btn-danger {
    background: ${C.redL}; border: 1px solid ${C.redLb}; color: ${C.red};
    padding: 7px 14px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px;
    cursor: pointer; border-radius: 4px; transition: all .15s;
  }
  .btn-danger:hover { background: ${C.redLb}; }

  /* ── FORM ── */
  .input-field {
    background: ${C.surface}; border: 1px solid ${C.border2};
    color: ${C.text}; padding: 8px 12px; width: 100%; border-radius: 4px;
    font-size: 13px; outline: none; transition: border .15s;
  }
  .input-field:focus { border-color: ${C.gold}; box-shadow: 0 0 0 3px rgba(15,98,254,.1); }
  .label {
    font-size: 11px; font-weight: 600; color: ${C.text3}; margin-bottom: 4px;
    display: block; letter-spacing: .3px; text-transform: uppercase;
  }
  .section-title {
    font-size: 11px; letter-spacing: 2px; text-transform: uppercase;
    color: ${C.text3}; margin-bottom: 14px; padding-bottom: 8px;
    border-bottom: 1px solid ${C.border}; font-weight: 600;
  }
  .badge {
    display: inline-block; padding: 2px 9px; border-radius: 3px;
    font-size: 11px; font-weight: 600; letter-spacing: .2px;
  }
  .divider { border: none; border-top: 1px solid ${C.border}; margin: 14px 0; }
  .form-grid   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }

  /* ── MODAL ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(10,25,41,.5);
    z-index: 1000; display: flex; align-items: center; justify-content: center;
    padding: 16px; backdrop-filter: blur(4px);
  }
  .modal-box {
    background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 6px;
    width: 100%; max-width: 780px; max-height: 93vh; overflow-y: auto;
    box-shadow: 0 24px 64px rgba(0,0,0,.22);
  }
  .modal-header {
    padding: 18px 24px 14px; border-bottom: 1px solid ${C.border};
    display: flex; justify-content: space-between; align-items: center;
    position: sticky; top: 0; background: ${C.surface}; z-index: 2;
    border-radius: 6px 6px 0 0;
  }
  .modal-body   { padding: 20px 24px; }
  .modal-footer {
    padding: 14px 24px 18px; border-top: 1px solid ${C.border};
    display: flex; gap: 8px; justify-content: flex-end;
    position: sticky; bottom: 0; background: ${C.surface};
    border-radius: 0 0 6px 6px;
  }

  /* ── TABELLE ── */
  .res-row {
    padding: 11px 16px; border-bottom: 1px solid ${C.border};
    display: flex; align-items: center; gap: 12px;
    transition: background .1s; cursor: pointer; font-size: 13px;
  }
  .res-row:hover { background: ${C.goldL}; }

  /* ── CAMERE ── */
  .room-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px,1fr)); gap: 10px; }
  .room-card {
    background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 5px;
    padding: 14px; cursor: pointer; transition: all .15s;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  .room-card:hover { border-color: ${C.gold}; box-shadow: 0 3px 10px rgba(15,98,254,.12); transform: translateY(-1px); }

  /* ── CHIP SERVIZI ── */
  .service-chip {
    display: inline-flex; align-items: center; gap: 5px;
    background: ${C.surface2}; border: 1px solid ${C.border};
    border-radius: 3px; padding: 4px 10px; font-size: 12px;
    cursor: pointer; margin: 3px; transition: all .15s; color: ${C.text2};
  }
  .service-chip:hover { border-color: ${C.gold}; color: ${C.gold}; }
  .service-chip.sel { background: ${C.goldL}; border-color: ${C.goldLb}; color: ${C.gold}; font-weight: 600; }

  /* ── OSPITI ── */
  .guest-card {
    background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 5px;
    padding: 16px; transition: all .15s; box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  .guest-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); border-color: ${C.border2}; }

  /* ── TOAST ── */
  .toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    padding: 11px 18px; border-radius: 4px; font-size: 13px;
    animation: fadeUp .25s ease; font-family: 'IBM Plex Sans', sans-serif;
    box-shadow: 0 4px 16px rgba(0,0,0,.14); min-width: 220px;
  }
  .toast.success { background: ${C.greenL}; border-left: 3px solid ${C.green}; color: ${C.green}; }
  .toast.error   { background: ${C.redL};   border-left: 3px solid ${C.red};   color: ${C.red}; }
  @keyframes fadeUp { from { transform: translateY(12px); opacity:0; } to { transform: translateY(0); opacity:1; } }

  /* ── INVOICE ── */
  .invoice-paper {
    background: white; color: #1a1a1a; border-radius: 4px;
    padding: 36px; font-family: 'IBM Plex Sans', Georgia, sans-serif;
  }
  .invoice-line {
    display: flex; justify-content: space-between; padding: 6px 0;
    border-bottom: 1px solid #f0f0f0; font-size: 13px;
  }

  /* ── PS/ISTAT ── */
  .ps-doc { background: white; color: #111; font-family: Arial, sans-serif; padding: 28px; font-size: 12px; }
  .ps-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
  .ps-table th { background: #0a1929; color: white; padding: 5px 7px; text-align: left; font-weight: 600; font-size: 10px; }
  .ps-table td { padding: 5px 7px; border-bottom: 1px solid #e8e0d8; vertical-align: top; }
  .ps-table tr:nth-child(even) td { background: #f5f7fa; }
  .istat-doc { background: white; color: #111; font-family: Arial, sans-serif; padding: 28px; font-size: 12px; }
  .istat-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  .istat-table th { background: #0f62fe; color: white; padding: 6px 8px; text-align: center; font-weight: 600; font-size: 10px; }
  .istat-table td { padding: 5px 8px; border: 1px solid #d0d4dc; text-align: center; }
  .istat-table .lc { text-align: left; font-weight: 600; background: #e8f0ff; }

  @media print { .no-print { display: none !important; } }
  div:hover > .tl-plus { opacity: 1 !important; }

  /* ── AI PANEL ── */
  .ai-panel {
    position: fixed; bottom: 24px; right: 24px; width: 360px; max-height: 520px;
    background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 8px;
    box-shadow: 0 8px 40px rgba(0,0,0,.18); z-index: 500;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .ai-msg-user { background:${C.goldL}; border:1px solid ${C.goldLb}; color:${C.text}; padding:8px 12px; border-radius:8px 8px 2px 8px; font-size:13px; max-width:90%; align-self:flex-end; }
  .ai-msg-ai   { background:${C.surface2}; border:1px solid ${C.border}; color:${C.text}; padding:8px 12px; border-radius:8px 8px 8px 2px; font-size:13px; max-width:92%; align-self:flex-start; white-space:pre-wrap; line-height:1.5; }
  .ai-suggestion-box { background:${C.goldL}; border:1px solid ${C.goldLb}; border-left:3px solid ${C.gold}; border-radius:5px; padding:12px 16px; margin-bottom:16px; }
  @keyframes aiPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .ai-loading-dot { animation:aiPulse 1.2s ease infinite; display:inline-block; }
  .ai-loading-dot:nth-child(2){animation-delay:.2s}
  .ai-loading-dot:nth-child(3){animation-delay:.4s}

  /* ── API TABS ── */
  .api-tab { background:none; border:none; cursor:pointer; padding:8px 14px; font-size:12px; font-weight:600; color:${C.text3}; border-bottom:2px solid transparent; transition:all .2s; }
  .api-tab.active { color:${C.gold}; border-bottom-color:${C.gold}; }
  .api-tab:hover  { color:${C.gold}; }
  .endpoint-row { padding:10px 14px; border-bottom:1px solid ${C.border}; display:flex; align-items:center; gap:10px; font-size:12px; }
  .endpoint-row:hover { background:${C.surface2}; }
  .method-badge { padding:2px 7px; border-radius:3px; font-size:10px; font-weight:700; letter-spacing:.5px; font-family:'IBM Plex Mono',monospace; }
  .method-GET    { background:#dbeafe; color:#1d4ed8; }
  .method-POST   { background:#dcfce7; color:#15803d; }
  .method-PUT    { background:#fef3c7; color:#92400e; }
  .method-DELETE { background:#fee2e2; color:#b91c1c; }

  /* ── POS RISTORANTE ── */
  .pos-tab { background:none; border:none; cursor:pointer; padding:7px 16px; font-size:12px; font-weight:600; color:${C.text3}; border-radius:3px; transition:all .15s; }
  .pos-tab:hover  { background:${C.goldL}; color:${C.gold}; }
  .pos-tab.active { background:${C.gold}; color:#fff; }
  .tavolo-svg { cursor:pointer; transition:all .15s; filter:drop-shadow(0 1px 2px rgba(0,0,0,.06)); }
  .tavolo-svg:hover { filter:drop-shadow(0 3px 8px rgba(15,98,254,.2)); }
  .menu-item-btn { background:${C.surface}; border:1px solid ${C.border}; border-radius:5px; padding:11px 12px; cursor:pointer; text-align:left; transition:all .15s; width:100%; }
  .menu-item-btn:hover { border-color:${C.gold}; box-shadow:0 2px 8px rgba(15,98,254,.1); }
  .order-row { padding:8px 12px; border-bottom:1px solid ${C.border}; display:flex; align-items:center; gap:8px; font-size:13px; }
  .kitchen-ticket { background:white; border:2px solid #1a2535; border-radius:5px; padding:14px; font-family:'IBM Plex Mono',monospace; font-size:12px; }
  .kitchen-ticket.urgent { border-color:${C.red}; background:${C.redL}; }
  @keyframes ticketIn { from{transform:translateY(-8px);opacity:0} to{transform:translateY(0);opacity:1} }
  .kitchen-ticket { animation:ticketIn .25s ease; }
  .precomanda-row { padding:9px 14px; border-bottom:1px solid ${C.border}; display:grid; grid-template-columns:1fr 60px 90px 90px; gap:8px; align-items:center; font-size:13px; }
  .pos-stat { background:${C.surface}; border:1px solid ${C.border}; border-radius:5px; padding:16px 20px; position:relative; overflow:hidden; }
  .pos-stat::before { content:''; position:absolute; top:0; left:0; width:3px; height:100%; background:${C.gold}; }

  /* ── RESPONSIVE BREAKPOINTS ─────────────────── */

  /* Tablet: form grids collapse (sidebar gestita via React inline style) */
  @media (max-width: 1199px) {
    .form-grid   { grid-template-columns: 1fr !important; }
    .form-grid-3 { grid-template-columns: 1fr 1fr !important; }
  }

  /* Mobile: < 768px */
  @media (max-width: 767px) {
    .sidebar { display: none !important; }
    .topbar {
      left: 0 !important; right: 0 !important;
      height: 54px; padding: 0 14px;
    }
    .main-content {
      margin-left: 0 !important;
      padding: 66px 12px 80px !important;
    }
    .form-grid   { grid-template-columns: 1fr !important; }
    .form-grid-3 { grid-template-columns: 1fr !important; }
    .stat-card { padding: 14px 16px; }
    .btn-primary, .btn-secondary, .btn-blue, .btn-danger {
      padding: 10px 14px; font-size: 14px;
      min-height: 44px; touch-action: manipulation;
    }
    .input-field { font-size: 16px; min-height: 44px; padding: 10px 12px; }
    select, input[type="text"], input[type="email"], input[type="tel"],
    input[type="number"], input[type="date"], input[type="time"] {
      font-size: 16px !important; /* Prevent iOS zoom */
      min-height: 44px;
    }
    table { font-size: 12px; }
    th, td { padding: 8px 10px !important; }
  }

  /* Bottom nav (mobile only) */
  .bottom-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0; height: 62px;
    background: ${C.sidebar}; border-top: 1px solid rgba(255,255,255,.1);
    z-index: 200; align-items: stretch;
    box-shadow: 0 -2px 12px rgba(0,0,0,.3);
  }
  @media (max-width: 767px) {
    .bottom-nav { display: flex !important; }
  }
  .bn-tab {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 3px; border: none; background: none;
    cursor: pointer; color: ${C.sidebarT}; font-size: 10px;
    font-family: 'IBM Plex Sans', sans-serif; font-weight: 500;
    padding: 6px 2px; touch-action: manipulation; transition: color .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .bn-tab.active { color: ${C.sidebarAT}; }
  .bn-tab .bn-icon { font-size: 20px; line-height: 1; }
  .bn-tab .bn-label { font-size: 9px; letter-spacing: .2px; white-space: nowrap; }

  /* Mobile card stacking helper */
  .mob-stack { display: flex; flex-direction: column; gap: 10px; }
  @media (min-width: 768px) {
    .mob-stack { flex-direction: row; }
  }
`;

// ════════════════════════════════════════════
// MICE & MEETING — DATI STATICI
// ════════════════════════════════════════════

const MEETING_ROOMS = [
  { id:"MR1", nome:"Sala Adriatico",   capTeatro:80, capCabaret:48, capUShape:36, capBoardroom:20, capBanquet:60, mq:90,  prezzo:350, piano:1, features:["Proiettore 4K","Sistema audio","Lavagna smart","WiFi dedicato","Luce naturale"] },
  { id:"MR2", nome:"Sala Laguna",      capTeatro:50, capCabaret:30, capUShape:24, capBoardroom:16, capBanquet:36, mq:60,  prezzo:220, piano:1, features:["Proiettore","Sistema audio","Lavagna bianca","WiFi dedicato"] },
  { id:"MR3", nome:"Sala Chioggia",    capTeatro:30, capCabaret:18, capUShape:16, capBoardroom:12, capBanquet:24, mq:40,  prezzo:150, piano:2, features:["TV 75\"","Videoconferenza","WiFi dedicato","Luce naturale"] },
  { id:"MR4", nome:"Executive Board",  capTeatro:16, capCabaret:0,  capUShape:0,  capBoardroom:14, capBanquet:0,  mq:28,  prezzo:120, piano:3, features:["TV 65\"","Videoconferenza HD","Poltroncine executive","Mini bar"] },
  { id:"MR5", nome:"Terrazza Venezia", capTeatro:100,capCabaret:60, capUShape:0,  capBoardroom:0,  capBanquet:80, mq:200, prezzo:600, piano:5, features:["Vista laguna","Struttura tendato","Impianto audio/luci","Catering dedicato"] },
];

const MICE_ATTREZZATURE = [
  { id:"AV1", cat:"Audio/Video",    nome:"Proiettore 4K Full HD",         prezzo:80,  um:"giorno", icon:"📽" },
  { id:"AV2", cat:"Audio/Video",    nome:"Schermo motorizzato 200cm",      prezzo:30,  um:"giorno", icon:"🎞" },
  { id:"AV3", cat:"Audio/Video",    nome:"Sistema audio professionale",    prezzo:120, um:"giorno", icon:"🔊" },
  { id:"AV4", cat:"Audio/Video",    nome:"Microfono a gelato (x2)",        prezzo:40,  um:"giorno", icon:"🎤" },
  { id:"AV5", cat:"Audio/Video",    nome:"Microfono lavalier wireless",    prezzo:35,  um:"giorno", icon:"🎙" },
  { id:"VC1", cat:"Videoconferenza",nome:"Sistema VC HD (Zoom/Teams)",     prezzo:150, um:"giorno", icon:"📹" },
  { id:"VC2", cat:"Videoconferenza",nome:"Camera PTZ 4K",                  prezzo:80,  um:"giorno", icon:"📸" },
  { id:"IT1", cat:"IT",             nome:"Laptop presentazioni",           prezzo:50,  um:"giorno", icon:"💻" },
  { id:"IT2", cat:"IT",             nome:"WiFi dedicato 100Mbps",          prezzo:60,  um:"giorno", icon:"📡" },
  { id:"IT3", cat:"IT",             nome:"Switch HDMI 4 ingressi",         prezzo:25,  um:"giorno", icon:"🔌" },
  { id:"AR1", cat:"Arredamento",    nome:"Allestimento a teatro",          prezzo:120, um:"evento", icon:"🪑" },
  { id:"AR2", cat:"Arredamento",    nome:"Allestimento cabaret",           prezzo:150, um:"evento", icon:"🍽" },
  { id:"AR3", cat:"Arredamento",    nome:"Allestimento U-shape",           prezzo:100, um:"evento", icon:"🔲" },
  { id:"AR4", cat:"Arredamento",    nome:"Podio / Leggio",                 prezzo:30,  um:"evento", icon:"🎭" },
  { id:"AR5", cat:"Arredamento",    nome:"Bancone registrazione",          prezzo:80,  um:"evento", icon:"📋" },
  { id:"FL1", cat:"Floral/Deco",    nome:"Centrotavola floreale",          prezzo:45,  um:"pezzo",  icon:"🌸" },
  { id:"FL2", cat:"Floral/Deco",    nome:"Composizione palco",             prezzo:120, um:"evento", icon:"💐" },
  { id:"TR1", cat:"Traduzione",     nome:"Cabina traduzione simult. (x2)", prezzo:400, um:"giorno", icon:"🌐" },
  { id:"TR2", cat:"Traduzione",     nome:"Ricevitore traduzione (cad.)",   prezzo:15,  um:"pezzo/g",icon:"🎧" },
];

const MICE_FB = [
  { id:"FB01", cat:"Coffee Break", nome:"Coffee break standard",     prezzo:8,  um:"persona",     icon:"☕" },
  { id:"FB02", cat:"Coffee Break", nome:"Coffee break premium",      prezzo:14, um:"persona",     icon:"🫖" },
  { id:"FB03", cat:"Pranzo",       nome:"Pranzo buffet business",    prezzo:32, um:"persona",     icon:"🥗" },
  { id:"FB04", cat:"Pranzo",       nome:"Pranzo seduto 3 portate",   prezzo:48, um:"persona",     icon:"🍽" },
  { id:"FB05", cat:"Pranzo",       nome:"Pranzo gourmet 4 portate",  prezzo:68, um:"persona",     icon:"⭐" },
  { id:"FB06", cat:"Cena",         nome:"Cena di gala 4 portate",    prezzo:85, um:"persona",     icon:"🥂" },
  { id:"FB07", cat:"Cena",         nome:"Cena a tema veneziano",     prezzo:95, um:"persona",     icon:"🎭" },
  { id:"FB08", cat:"Aperitivo",    nome:"Aperitivo finger food",     prezzo:18, um:"persona",     icon:"🍹" },
  { id:"FB09", cat:"Aperitivo",    nome:"Aperitivo prosecco DOC",    prezzo:24, um:"persona",     icon:"🥂" },
  { id:"FB10", cat:"Rinfresco",    nome:"Rinfresco base",            prezzo:12, um:"persona",     icon:"🧁" },
  { id:"FB11", cat:"Rinfresco",    nome:"Torta aziendale personaliz.",prezzo:6, um:"persona",     icon:"🎂" },
  { id:"FB12", cat:"Bevande",      nome:"Open bar analcolici",       prezzo:10, um:"persona/ora", icon:"🥤" },
  { id:"FB13", cat:"Bevande",      nome:"Open bar completo",         prezzo:22, um:"persona/ora", icon:"🍾" },
  { id:"FB14", cat:"Bevande",      nome:"Acqua e bevande tavolo",    prezzo:5,  um:"persona",     icon:"💧" },
];

const MICE_STATUS = {
  preventivo: { label:"Preventivo",   bg:"#fff8e1", color:"#b45309", border:"#f6c90e" },
  confermato: { label:"Confermato",   bg:"#e8f5e9", color:"#2e7d32", border:"#a8d5b5" },
  acconto:    { label:"Acconto rice.",bg:"#e3f2fd", color:"#1565c0", border:"#90caf9" },
  completato: { label:"Completato",   bg:"#f3e5f5", color:"#7b1fa2", border:"#ce93d8" },
  annullato:  { label:"Annullato",    bg:"#fdecea", color:"#c0392b", border:"#ef9a9a" },
};

const SETUP_LABELS = { teatro:"Teatro", cabaret:"Cabaret", ushape:"U-Shape", boardroom:"Boardroom", banquet:"Banquet" };

const emptyMiceEvent = () => ({
  id:"EV"+Date.now().toString(36).toUpperCase().slice(-5),
  status:"preventivo",
  cliente:"", referente:"", email:"", telefono:"", azienda:"", piva:"",
  nomeEvento:"", tipoEvento:"", data:"", oraInizio:"09:00", oraFine:"18:00",
  partecipanti:20, linguaEvento:"it",
  salaId:"", setup:"teatro",
  attrezzature:[], fb:[],
  noteInterne:"", noteCliente:"", scontoPerc:0,
  createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(),
});

const DEMO_MICE = [
  { id:"EV001", status:"confermato", cliente:"TechCorp S.r.l.", referente:"Luca Neri", email:"luca.neri@techcorp.it", telefono:"+39 02 1234567", azienda:"TechCorp S.r.l.", piva:"IT12345678901",
    nomeEvento:"Riunione Consiglio CDA", tipoEvento:"Board Meeting", data:"2026-03-12", oraInizio:"09:00", oraFine:"18:00", partecipanti:14, linguaEvento:"it",
    salaId:"MR4", setup:"boardroom", attrezzature:[{id:"VC1",qty:1},{id:"IT1",qty:1},{id:"IT2",qty:1}],
    fb:[{id:"FB01",qty:1,persone:14},{id:"FB03",qty:1,persone:14},{id:"FB08",qty:1,persone:14}],
    noteInterne:"Cliente VIP — servizio premium", noteCliente:"", scontoPerc:10,
    createdAt:"2026-02-01T10:00:00.000Z", updatedAt:"2026-02-10T14:00:00.000Z" },
  { id:"EV002", status:"preventivo", cliente:"Farmaceutica Veneta S.p.A.", referente:"Sara Moretti", email:"s.moretti@farmaveneta.it", telefono:"+39 041 9876543", azienda:"Farmaceutica Veneta S.p.A.", piva:"IT09876543210",
    nomeEvento:"Convegno Scientifico 2026", tipoEvento:"Convegno", data:"2026-04-18", oraInizio:"08:30", oraFine:"19:00", partecipanti:75, linguaEvento:"it",
    salaId:"MR1", setup:"teatro", attrezzature:[{id:"AV1",qty:1},{id:"AV2",qty:1},{id:"AV3",qty:1},{id:"AV4",qty:2},{id:"VC1",qty:1},{id:"AR4",qty:1}],
    fb:[{id:"FB01",qty:2,persone:75},{id:"FB04",qty:1,persone:75},{id:"FB08",qty:1,persone:75}],
    noteInterne:"Richiesta traduzione simultanea se confermano", noteCliente:"Possibile estensione al giorno successivo", scontoPerc:5,
    createdAt:"2026-02-15T09:00:00.000Z", updatedAt:"2026-02-15T09:00:00.000Z" },
  { id:"EV003", status:"completato", cliente:"Hotel Partners Group", referente:"Marco Rossi", email:"m.rossi@hpg.it", telefono:"+39 06 5554433", azienda:"Hotel Partners Group", piva:"IT44556677890",
    nomeEvento:"Cena di Gala — Awards Night", tipoEvento:"Gala Dinner", data:"2026-02-14", oraInizio:"19:30", oraFine:"23:59", partecipanti:80, linguaEvento:"en",
    salaId:"MR5", setup:"banquet", attrezzature:[{id:"AV3",qty:1},{id:"AR5",qty:1},{id:"FL1",qty:8},{id:"FL2",qty:1}],
    fb:[{id:"FB06",qty:1,persone:80},{id:"FB13",qty:2,persone:80},{id:"FB11",qty:1,persone:80}],
    noteInterne:"Completato con successo", noteCliente:"", scontoPerc:0,
    createdAt:"2026-01-10T11:00:00.000Z", updatedAt:"2026-02-15T08:00:00.000Z" },
];

// - COMPONENTE PRINCIPALE -

const PAGE_ICONS = {
  "Dashboard":         "grid",
  "Prenotazioni":      "calendar",
  "Anagrafica":        "users",
  "Check-In/Out":      "key",
  "Disponibilità":     "layout",
  "Camere":            "bed",
  "Prezzi & Revenue":  "trending-up",
  "Cassa":             "receipt",
  "Pubblica Sicurezza":"shield",
  "ISTAT Veneto":      "bar-chart",
  "API & Integrazioni":"zap",
  "Ristorante POS":    "utensils",
  "MICE & Meeting":    "presentation",
  "Statistiche":       "pie-chart",
  "Configurazione":    "settings",
};
const PAGE_GROUPS = [
  { label:"Front Office",   pages:["Dashboard","Prenotazioni","Anagrafica","Check-In/Out","Disponibilità"] },
  { label:"Gestione",       pages:["Camere","Prezzi & Revenue","Cassa","MICE & Meeting"] },
  { label:"Reportistica",   pages:["Pubblica Sicurezza","ISTAT Veneto","Statistiche"] },
  { label:"Integrazioni",   pages:["API & Integrazioni","Ristorante POS"] },
  { label:"Sistema",        pages:["Configurazione"] },
];


// ── SVG ICON COMPONENT ──────────────────────────────────────────────
// Icone stile Lucide — stroke-only, 24x24 viewBox, 1.5px stroke
// ── ICONE SVG multi-elemento — stile Lucide 24×24 ─────────────────
const ICONS = {
  "grid":        [[["rect",{x:3,y:3,width:7,height:7,rx:1}],["rect",{x:14,y:3,width:7,height:7,rx:1}],["rect",{x:3,y:14,width:7,height:7,rx:1}],["rect",{x:14,y:14,width:7,height:7,rx:1}]]],
  "calendar":    [[["rect",{x:3,y:4,width:18,height:18,rx:2}],["path",{d:"M16 2v4M8 2v4M3 10h18"}],["path",{d:"M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"}]]],
  "users":       [[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"}],["circle",{cx:9,cy:7,r:4}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"}]]],
  "key":         [[["circle",{cx:7.5,cy:15.5,r:5.5}],["path",{d:"m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3m-3.5 3.5 1.5 1.5"}]]],
  "layout":      [[["rect",{x:3,y:3,width:18,height:7,rx:1}],["rect",{x:3,y:14,width:7,height:7,rx:1}],["rect",{x:14,y:14,width:7,height:7,rx:1}]]],
  "bed":         [[["path",{d:"M2 4v16M2 8h20v12H2M12 8V4H2"}],["rect",{x:7,y:11,width:4,height:3,rx:.5}],["rect",{x:13,y:11,width:4,height:3,rx:.5}]]],
  "trending-up": [[["polyline",{points:"22 7 13.5 15.5 8.5 10.5 2 17"}],["polyline",{points:"16 7 22 7 22 13"}]]],
  "receipt":     [[["path",{d:"M4 2h16a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 0 1 1-1z"}],["path",{d:"M8 8h8M8 12h8M8 16h5"}]]],
  "shield":      [[["path",{d:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"}],["path",{d:"m9 12 2 2 4-4"}]]],
  "bar-chart":   [[["path",{d:"M3 3v18h18"}],["path",{d:"M7 16v-3M11 16V9M15 16v-6M19 16v-9"}]]],
  "zap":         [[["polygon",{points:"13 2 3 14 12 14 11 22 21 10 12 10 13 2"}]]],
  "utensils":    [[["path",{d:"M3 2v7c0 1.66 1.34 3 3 3s3-1.34 3-3V2M6 12v10M20 2v5a4 4 0 0 1-4 4v11"}]]],
  "presentation":[[["rect",{x:2,y:3,width:20,height:13,rx:1}],["path",{d:"M8 21h8M12 17v4M7 8l3 3 2-2 3 3"}]]],
  "pie-chart":   [[["path",{d:"M21.21 15.89A10 10 0 1 1 8 2.83"}],["path",{d:"M22 12A10 10 0 0 0 12 2v10z"}]]],
  "settings":    [[["circle",{cx:12,cy:12,r:3}],["path",{d:"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"}]]],
  "home":        [[["path",{d:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}],["polyline",{points:"9 22 9 12 15 12 15 22"}]]],
  "check-circle":[[["path",{d:"M22 11.08V12a10 10 0 1 1-5.93-9.14"}],["polyline",{points:"22 4 12 14.01 9 11.01"}]]],
  "log-out":     [[["path",{d:"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"}],["polyline",{points:"16 17 21 12 16 7"}],["line",{x1:21,y1:12,x2:9,y2:12}]]],
  "database":    [[["ellipse",{cx:12,cy:5,rx:9,ry:3}],["path",{d:"M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"}],["path",{d:"M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"}]]],
  "bell":        [[["path",{d:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"}],["path",{d:"M13.73 21a2 2 0 0 1-3.46 0"}]]],
  "credit-card": [[["rect",{x:1,y:4,width:22,height:16,rx:2}],["line",{x1:1,y1:10,x2:23,y2:10}]]],
  "activity":    [[["polyline",{points:"22 12 18 12 15 21 9 3 6 12 2 12"}]]],
  "map-pin":     [[["path",{d:"M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"}],["circle",{cx:12,cy:10,r:3}]]],
  "file-text":   [[["path",{d:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"}],["polyline",{points:"14 2 14 8 20 8"}],["line",{x1:16,y1:13,x2:8,y2:13}],["line",{x1:16,y1:17,x2:8,y2:17}]]],
};

function Icon({ name, size=16, color="currentColor", strokeWidth=1.5, style={} }) {
  const elems = ICONS[name]?.[0];
  if (!elems) return <span style={{ width:size, height:size, display:"inline-block" }}/>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink:0, ...style }}>
      {elems.map(([tag, attrs], i) => {
        const p = { key:i, ...attrs, stroke:color, strokeWidth, fill:"none" };
        if (tag==="path")     return <path {...p}/>;
        if (tag==="rect")     return <rect {...p}/>;
        if (tag==="circle")   return <circle {...p}/>;
        if (tag==="ellipse")  return <ellipse {...p}/>;
        if (tag==="line")     return <line {...p}/>;
        if (tag==="polyline") return <polyline {...p}/>;
        if (tag==="polygon")  return <polygon {...p} fill={color} stroke="none"/>;
        return null;
      })}
    </svg>
  );
}


// - Componente suggerimento AI contestuale -
export default function HotelPMS() {
  const [page, setPage]               = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile,    setIsMobile]    = useState(() => window.innerWidth < 768);
    const [isTablet,    setIsTablet]    = useState(() => window.innerWidth < 1200);
    useEffect(() => {
      const onResize = () => {
        const w = window.innerWidth;
        setIsMobile(w < 768);
        setIsTablet(w < 1200);
        if (w < 768)         setSidebarOpen(false);  // mobile: sidebar nascosta
        else if (w < 1200)   setSidebarOpen(false);  // tablet: sidebar collassata a icone
        else                 setSidebarOpen(true);   // desktop: sidebar aperta
      };
      window.addEventListener('resize', onResize);
      onResize();
      return () => window.removeEventListener('resize', onResize);
    }, []);
  const [guests, setGuests]           = useState(DEMO_GUESTS);
  const [reservations, setReservations] = useState(DEMO_RESERVATIONS);
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({});
  const [guestForm, setGuestForm]     = useState(emptyGuest());
  const [toast, setToast]             = useState(null);
  const [invoiceRes, setInvoiceRes]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQ, setSearchQ]         = useState("");
  const [guestSearch, setGuestSearch]     = useState("");
  const [anagraficaTab, setAnagraficaTab] = useState("individuali"); // individuali | aziende
  const [emailPreviewRes, setEmailPreviewRes] = useState(null);    // modal anteprima email conferma
  const [emailTo, setEmailTo]               = useState("");         // campo A: modal email
  const [emailCc, setEmailCc]               = useState("");         // campo CC
  const [emailTab, setEmailTab]             = useState("preview");  // preview | html
  const [psMonth, setPsMonth]         = useState("2026-02");
  const [istatMonth, setIstatMonth]   = useState("2026-02");
  // Disponibilità state
  const [dispOffset, setDispOffset]   = useState(0);
  const [dispMode, setDispMode]       = useState("timeline");
  const [dispHover, setDispHover]     = useState(null);
  const [dispSelType, setDispSelType] = useState(null);
  const [dispSelStart, setDispSelStart] = useState(null);
  const [dispSelEnd, setDispSelEnd]   = useState(null);
  // Revenue Management state
  const [rooms, setRooms]             = useState(ROOMS.map(r => ({...r})));
  const [pricingRules, setPricingRules] = useState([]);
  const [priceViewMode, setPriceViewMode] = useState("tipologia"); // tipologia | camera
  const [ruleForm, setRuleForm]       = useState({ name:"", type:"occupancy", threshold:80, operator:"gte", adjustment:10, adjustType:"pct", enabled:true, roomTypes:"all", direction:"increase" });
  const [editRuleId, setEditRuleId]   = useState(null);
  // - POS Ristorante state -
  const [posTab, setPosTab]           = useState("mappa");    // mappa | ordine | cucina | precomanda | cassa-pos
  const [posSala, setPosSala]         = useState("Sala Principale");
  const [tavoliState, setTavoliState] = useState(
    TAVOLI_LAYOUT.reduce((acc,t) => ({ ...acc, [t.id]: { status:"libero", ospiti:0, ordini:[], aperto:null, cameriere:"" } }), {})
  );
  const [tavoloAttivo, setTavoloAttivo] = useState(null);   // id tavolo in editing
  const [posMenuCat, setPosMenuCat]   = useState("Antipasti");
  const [ordiniCucina, setOrdiniCucina] = useState([]);      // ticket cucina
  const [precomande, setPrecomande]   = useState([]);         // pre-comande pranzo/cena
  const [precomandaForm, setPrecomandaForm] = useState({ servizio:"pranzo", data: new Date().toISOString().slice(0,10), note:"" });
  const [posContoModal, setPosContoModal] = useState(null);   // tavolo per checkout pos
  const [posCassaMethod, setPosCassaMethod] = useState("camera"); // camera | carta | contanti
  // - MICE & Meeting state -
  const [miceEvents, setMiceEvents]         = useState(DEMO_MICE);
  const [miceTab, setMiceTab]               = useState("lista");      // lista | sale | config
  const [miceForm, setMiceForm]             = useState(null);         // evento in editing (null = lista)
  const [miceFormTab, setMiceFormTab]       = useState("cliente");    // cliente | sala | attrezzature | fb | preventivo
  const [miceSearch, setMiceSearch]         = useState("");
  const [miceFilterStatus, setMiceFilterStatus] = useState("all");
  const [micePreviewEv, setMicePreviewEv]   = useState(null);         // modal preventivo PDF
  const [meetingRooms, setMeetingRooms]     = useState(MEETING_ROOMS.map(r=>({...r})));
  const [miceConfigRoom, setMiceConfigRoom] = useState(null);         // sala in editing config
  // - Supabase sync state -
  const [dbStatus, setDbStatus]   = useState("connecting"); // connecting | ok | error | offline
  const [dbError, setDbError]     = useState(null);
  const syncRef = useRef(false);

  // - Boot: carica dati da Supabase -
  useEffect(() => {
    if (syncRef.current) return;
    syncRef.current = true;
    (async () => {
      try {
        // Carica camere
        const cam = await sb.select("camere", "?select=*&order=id");
        // Carica ospiti
        const osp = await sb.select("ospiti", "?select=*&order=cognome");
        // Carica prenotazioni + pagamenti + extra
        const pren = await sb.select("prenotazioni", "?select=*&order=created_at.desc");
        const pag  = await sb.select("pagamenti",    "?select=*");
        const ext  = await sb.select("extra",        "?select=*");
        // Carica regole pricing
        const reg  = await sb.select("regole_pricing","?select=*");
        // Carica precomande
        const pcom = await sb.select("precomande",   "?select=*&order=created_at.desc");
        // Carica log API
        const logs = await sb.select("api_logs",     "?select=*&order=created_at.desc&limit=100");
        // Carica webhooks
        const wh   = await sb.select("webhooks",     "?select=*");

        // Se il DB è vuoto (prima connessione) fa il seed delle camere
        if (cam.length === 0) {
          setDbStatus("seeding");
          // Le camere vengono dal codice statico ROOMS — upsert tutto
          for (const r of ROOMS) {
            await sb.upsert("camere", { id:r.id, tipo:r.type, capacita:r.capacity, prezzo:r.price, piano:r.floor });
          }
          setDbStatus("ok");
          setToast({ msg:"✦ Database inizializzato con le 59 camere ✓", type:"success" });
          setTimeout(()=>setToast(null),4000);
        } else {
          // Merge camere da DB con stato locale (prezzi potrebbero essere aggiornati)
          if (cam.length > 0) {
            setRooms(cam.map(c => ({ id:c.id, type:c.tipo, capacity:c.capacita, price:parseFloat(c.prezzo), floor:c.piano })));
          }
        }

        // Merge ospiti
        if (osp.length > 0) {
          setGuests(osp.map(g => ({
            id: g.id, cognome: g.cognome, nome: g.nome,
            dataNascita: g.data_nascita||"", luogoNascita: g.luogo_nascita||"",
            nazionalita: g.nazionalita||"ITA", tipoDoc: g.tipo_doc||"Carta d'Identità",
            numDoc: g.num_doc||"", scadenzaDoc: g.scadenza_doc||"",
            indirizzo: g.indirizzo||"", citta: g.citta||"", cap: g.cap||"",
            email: g.email||"", telefono: g.telefono||"", note: g.note||""
          })));
        }

        // Merge prenotazioni con pagamenti ed extra annidati
        if (pren.length > 0) {
          setReservations(pren.map(r => ({
            id: r.id, roomId: r.camera_id, guestId: r.ospite_id,
            guestName: r.ospite_nome, checkIn: r.check_in, checkOut: r.check_out,
            guests: r.guests||1, adulti: r.adulti||1, bambini: r.bambini||0,
            status: r.status, services: r.servizi||[],
            psInviato: r.ps_inviato, checkInTime: r.check_in_time,
            checkOutTime: r.check_out_time, note: r.note||"", fonte: r.fonte||"diretta",
            payments: pag.filter(p=>p.prenotazione_id===r.id).map(p=>({ amount:parseFloat(p.importo), method:p.metodo, date:p.data, _id:p.id })),
            roomServiceItems: ext.filter(e=>e.prenotazione_id===r.id).map(e=>({ desc:e.descrizione, price:parseFloat(e.importo), date:e.data, _id:e.id })),
          })));
        }

        // Merge regole pricing
        if (reg.length > 0) {
          setPricingRules(reg.map(r => ({
            id: r.id, name: r.nome, type: r.tipo, operator: r.operatore,
            threshold: parseFloat(r.soglia), direction: r.direzione,
            adjustType: r.tipo_variazione, adjustment: parseFloat(r.valore),
            roomTypes: r.tipi_camera, enabled: r.attiva
          })));
        }

        // Merge precomande
        if (pcom.length > 0) setPrecomande(pcom.map(p=>({ id:p.id, servizio:p.servizio, data:p.data, righe:p.righe||[], note:p.note||"", creata:new Date(p.created_at).toLocaleString("it-IT"), inviata:p.inviata })));

        // Merge log API
        if (logs.length > 0) setApiLogs(logs.map(l=>({ id:l.id, ts:new Date(l.created_at).toLocaleTimeString("it-IT"), endpoint:l.endpoint, method:l.metodo, status:l.status, ms:l.ms, note:l.nota||"" })));

        // Merge webhooks
        if (wh.length > 0) setWebhooks(wh.map(w=>({ id:w.id, url:w.url, events:w.eventi||[], secret:w.segreto||"", active:w.attivo, calls:w.chiamate||0 })));

        setDbStatus("ok");
      } catch(e) {
        console.error("Supabase boot error:", e);
        setDbStatus("error");
        setDbError(e.message);
      }
    })();
  }, []);

  // - DB helpers: wrap delle operazioni di scrittura -
  const dbSaveGuest = async (g) => {
    const row = { id:g.id, cognome:g.cognome, nome:g.nome, data_nascita:g.dataNascita||null,
      luogo_nascita:g.luogoNascita||null, nazionalita:g.nazionalita, tipo_doc:g.tipoDoc,
      num_doc:g.numDoc||null, scadenza_doc:g.scadenzaDoc||null, indirizzo:g.indirizzo||null,
      citta:g.citta||null, cap:g.cap||null, email:g.email||null, telefono:g.telefono||null, note:g.note||null };
    return await sb.upsert("ospiti", row);
  };

  const dbSaveReservation = async (r) => {
    const row = { id:r.id, camera_id:r.roomId, ospite_id:r.guestId||null, ospite_nome:r.guestName,
      check_in:r.checkIn, check_out:r.checkOut, guests:r.guests, adulti:r.adulti||1, bambini:r.bambini||0,
      status:r.status, servizi:r.services||[], ps_inviato:r.psInviato||false,
      check_in_time:r.checkInTime||null, check_out_time:r.checkOutTime||null,
      note:r.note||null, fonte:r.fonte||"diretta" };
    return await sb.upsert("prenotazioni", row);
  };

  const dbSavePayment = async (prenotazioneId, importo, metodo) => {
    return await sb.insert("pagamenti", { prenotazione_id:prenotazioneId, importo, metodo, data:new Date().toISOString().slice(0,10) });
  };

  const dbSaveExtra = async (prenotazioneId, descrizione, importo, categoria="extra") => {
    return await sb.insert("extra", { prenotazione_id:prenotazioneId, descrizione, importo, data:new Date().toISOString().slice(0,10), categoria });
  };

  const dbSavePricingRule = async (rule) => {
    const row = { id:rule.id, nome:rule.name, tipo:rule.type, operatore:rule.operator,
      soglia:rule.threshold, direzione:rule.direction, tipo_variazione:rule.adjustType,
      valore:rule.adjustment, tipi_camera:rule.roomTypes, attiva:rule.enabled };
    return await sb.upsert("regole_pricing", row);
  };

  const dbDeletePricingRule = async (id) => await sb.delete("regole_pricing", id);

  const dbSavePrecomanda = async (pc) => {
    return await sb.upsert("precomande", { id:pc.id, servizio:pc.servizio, data:pc.data, righe:pc.righe, note:pc.note||null, inviata:pc.inviata||false });
  };

  const dbSaveCameraPrice = async (id, prezzo) => {
    return await sb.update("camere", id, { prezzo });
  };

  const dbLogApi = async (endpoint, metodo, status, ms, nota="") => {
    sb.insert("api_logs", { endpoint, metodo, status, ms, nota: nota.slice(0,200) });
  };
  // Split conto state
  const [splitMode, setSplitMode]       = useState(false);       // attiva divisione conto
  const [splitPersone, setSplitPersone] = useState([]);          // [{nome, items:[], paid:false, method:""}]
  const [splitTab, setSplitTab]         = useState(0);           // indice persona attiva
  const [splitType, setSplitType]       = useState("equale");    // equale | personalizzata | per_voce
  const [pcRighe, setPcRighe]           = useState(
    MENU_VOCI.filter(v => v.cat !== "Bevande").map(v => ({ id:v.id, nome:v.nome, cat:v.cat, pranzo:0, cena:0 }))
  );
  // Dashboard chart state (deve stare a livello componente — regole React Hooks)
  const [chartHovIdx, setChartHovIdx]   = useState(null);
  const [chartRange, setChartRange]     = useState(30);
  const [prevModal, setPrevModal]       = useState(null); // modal da ripristinare dopo guest-form
  // API & Integrazioni state
  const [apiKeys, setApiKeys] = useState({
    anthropic: "", booking: "", stripe: "", channelManager: ""
  });
  const [apiLogs, setApiLogs] = useState([]);
  const [apiTab, setApiTab]   = useState("overview"); // overview | rest | booking | payments | logs
  const [restFilter, setRestFilter] = useState("all");
  const [webhooks, setWebhooks] = useState([]);
  const [webhookForm, setWebhookForm] = useState({ url:"", events:[], secret:"" });
  // AI Assistente state
  const [aiVisible, setAiVisible]   = useState(false);
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput]       = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null); // suggerimento contestuale

  const pushLog = (endpoint, method, status, ms, note="") => {
    setApiLogs(p => [{
      id: Date.now(), ts: new Date().toLocaleTimeString("it-IT"),
      endpoint, method, status, ms, note
    }, ...p].slice(0,100));
    dbLogApi(endpoint, method, status, ms, note).catch(()=>{});
  };

  // - AI: chiama Anthropic e aggiunge risposta -
  const callAI = async (userMsg, systemCtx="") => {
    if (!apiKeys.anthropic) {
      showToast("Inserisci la chiave API Anthropic nella sezione API & Integrazioni", "error");
      return null;
    }
    const t0 = Date.now();
    try {
      const today0 = new Date().toISOString().slice(0,10);
      const occNow  = reservations.filter(r => !["cancelled","checked-out"].includes(r.status) && r.checkIn <= today0 && r.checkOut > today0).length;
      const context = `Sei l'assistente AI dell'Hotel Gasparini, un PMS alberghiero italiano.
Dati attuali: ${rooms.length} camere, ${reservations.length} prenotazioni totali, ${occNow} camere occupate oggi, ${guests.length} ospiti in anagrafica.
Oggi: ${today0}. ${systemCtx}
Rispondi in italiano, in modo conciso e professionale.`;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: context,
          messages: [{ role:"user", content: userMsg }]
        })
      });
      const data = await res.json();
      const ms = Date.now() - t0;
      const text = data?.content?.[0]?.text || "Errore nella risposta.";
      pushLog("POST /v1/messages", "POST", res.ok ? 200 : data?.error?.status||500, ms, userMsg.slice(0,60));
      return { text, ms };
    } catch(e) {
      pushLog("POST /v1/messages", "POST", 0, Date.now()-t0, "Network error");
      return null;
    }
  };

  // - AI: suggerimento contestuale per pagina -
  const requestAiSuggestion = async (currentPage) => {
    if (!apiKeys.anthropic || aiLoading) return;
    setAiLoading(true); setAiSuggestion(null);
    const today0 = new Date().toISOString().slice(0,10);
    const pageCtx = {
      "Dashboard":         `Pagina dashboard. Occupazione: ${reservations.filter(r=>!["cancelled","checked-out"].includes(r.status)&&r.checkIn<=today0&&r.checkOut>today0).length}/${rooms.length} camere. Arrivi oggi: ${reservations.filter(r=>r.checkIn===today0&&r.status==="reserved").length}. Dammi 2-3 azioni prioritarie per il duty manager stamattina.`,
      "Prenotazioni":      `Pagina prenotazioni. ${reservations.filter(r=>r.status==="reserved").length} prenotazioni pending, ${reservations.filter(r=>r.status==="checked-in").length} check-in attivi. Segnala anomalie o azioni urgenti.`,
      "Check-In/Out":      `Front desk. ${reservations.filter(r=>r.checkIn===today0&&r.status==="reserved").length} arrivi e ${reservations.filter(r=>r.checkOut===today0&&r.status==="checked-in").length} partenze oggi. Consigli operativi per velocizzare i processi.`,
      "Disponibilità":     `Vista disponibilità. Suggerisci strategie per ottimizzare il riempimento nei prossimi 7 giorni.`,
      "Prezzi & Revenue":  `Revenue management. Dammi 2-3 suggerimenti di pricing basati sull'occupazione attuale.`,
      "Cassa":             `Gestione cassa. ${reservations.filter(r=>r.status==="checked-in"&&calcTotal(r)>calcPaid(r)).length} conti aperti con saldo. Segnala priorità di incasso.`,
      "Pubblica Sicurezza":`PS/TULPS. ${reservations.filter(r=>r.status!=="cancelled"&&!r.psInviato).length} schedine non ancora inviate. Ricordami le scadenze e obblighi normativi chiave.`,
      "ISTAT Veneto":      `Statistica ISTAT. Suggerisci come migliorare la qualità dei dati per la rendicontazione regionale.`,
      "API & Integrazioni":`Sezione API. Suggerisci come ottimizzare le integrazioni per massimizzare le prenotazioni online.`,
      "Anagrafica":        `Anagrafica ospiti. ${guests.length} ospiti registrati. Suggerisci come migliorare la gestione del CRM.`,
      "Camere":            `Gestione camere. Suggerisci politiche di manutenzione o upgrades per massimizzare RevPAR.`,
    };
    const prompt = pageCtx[currentPage] || `Pagina: ${currentPage}. Dammi un suggerimento operativo utile.`;
    const result = await callAI(prompt, "Dai una risposta breve: max 3 punti con bullet point •");
    setAiSuggestion(result ? { page: currentPage, text: result.text, ts: new Date().toLocaleTimeString("it-IT") } : null);
    setAiLoading(false);
  };

  // - AI: chat libera -
  const sendAiChat = async () => {
    const msg = aiInput.trim(); if (!msg) return;
    const newMsgs = [...aiMessages, { role:"user", content: msg }];
    setAiMessages(newMsgs); setAiInput(""); setAiLoading(true);
    const result = await callAI(msg, `Storico chat: ${aiMessages.slice(-4).map(m=>`${m.role}: ${m.content}`).join(" | ")}`);
    setAiMessages(p => [...p, { role:"assistant", content: result?.text || "Errore nella risposta AI." }]);
    setAiLoading(false);
  };

  // - REST API mock: simula risposta endpoint -
  const mockRestCall = (endpoint, method="GET") => {
    const t0 = Date.now();
    setTimeout(() => {
      const ms = Date.now()-t0 + Math.floor(Math.random()*80+20);
      pushLog(endpoint, method, 200, ms, "Mock call simulata");
      showToast(`${method} ${endpoint} → 200 OK (${ms}ms)`);
    }, 100);
  };

  // - Booking.com mock sync -
  const syncBooking = () => {
    if (!apiKeys.booking) { showToast("Inserisci la chiave API Booking.com", "error"); return; }
    const t0 = Date.now();
    showToast("Sincronizzazione Booking.com in corso...");
    setTimeout(() => {
      pushLog("GET /booking/availability", "GET", 200, Date.now()-t0+180, "Disponibilità aggiornata");
      pushLog("POST /booking/rates", "POST", 200, Date.now()-t0+240, "Tariffe inviate");
      showToast("Booking.com sincronizzato — disponibilità e tariffe aggiornate ✓");
    }, 1200);
  };

  // - Stripe mock payment -
  const stripeCharge = (amount, guestName) => {
    if (!apiKeys.stripe) { showToast("Inserisci la chiave API Stripe", "error"); return; }
    const t0 = Date.now();
    showToast(`Elaborazione pagamento €${amount}...`);
    setTimeout(() => {
      const ok = Math.random() > 0.1;
      pushLog("POST /stripe/charges", "POST", ok?200:402, Date.now()-t0+320, `${guestName} €${amount}`);
      showToast(ok ? `Pagamento €${amount} autorizzato ✓ (${guestName})` : "Carta rifiutata — verificare con l'ospite", ok?"success":"error");
    }, 1400);
  };

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const getGuest = (id) => guests.find(g => g.id === id);


  // - calcoli -

  // POS helpers
  const posTavoloTotale = (tavoloId) => {
    const ts = tavoliState[tavoloId];
    return (ts?.ordini||[]).reduce((s,o) => s + o.prezzo * o.qty, 0);
  };
  const posAggiungiVoce = (voce) => {
    if (!tavoloAttivo) return;
    setTavoliState(prev => {
      const ts = prev[tavoloAttivo];
      const existing = ts.ordini.find(o => o.id === voce.id);
      const nuoviOrdini = existing
        ? ts.ordini.map(o => o.id===voce.id ? {...o, qty:o.qty+1} : o)
        : [...ts.ordini, { ...voce, qty:1, note:"", inviato:false }];
      return { ...prev, [tavoloAttivo]: { ...ts, ordini: nuoviOrdini } };
    });
  };
  const posRimuoviVoce = (tavoloId, voceId) => {
    setTavoliState(prev => {
      const ts = prev[tavoloId];
      const nuoviOrdini = ts.ordini
        .map(o => o.id===voceId ? {...o, qty:o.qty-1} : o)
        .filter(o => o.qty > 0);
      return { ...prev, [tavoloId]: { ...ts, ordini: nuoviOrdini } };
    });
  };
  const posInviaCucina = (tavoloId) => {
    const ts = tavoliState[tavoloId];
    const tavolo = TAVOLI_LAYOUT.find(t => t.id===tavoloId);
    const nonInviati = ts.ordini.filter(o => !o.inviato);
    if (nonInviati.length === 0) { showToast("Nessun articolo da inviare", "error"); return; }
    const ticket = {
      id: "TKT"+Date.now().toString().slice(-5),
      tavoloId, tavoloNome: tavolo?.nome,
      sala: tavolo?.sala,
      ts: new Date().toLocaleTimeString("it-IT"),
      voci: nonInviati,
      status: "in_preparazione", // in_preparazione | pronto | servito
      urgente: false,
    };
    setOrdiniCucina(prev => [ticket, ...prev]);
    setTavoliState(prev => ({
      ...prev, [tavoloId]: { ...prev[tavoloId], ordini: prev[tavoloId].ordini.map(o => ({...o, inviato:true})) }
    }));
    showToast(`Ordine inviato in cucina — ${tavolo?.nome} (${nonInviati.length} voci)`);
  };
  const posApriTavolo = (tavoloId, ospiti, cameriere="") => {
    setTavoliState(prev => ({
      ...prev, [tavoloId]: { ...prev[tavoloId], status:"occupato", ospiti, cameriere, aperto: new Date().toLocaleTimeString("it-IT"), ordini:[] }
    }));
    setTavoloAttivo(tavoloId);
    setPosTab("ordine");
  };
  const posChiudiTavolo = (tavoloId) => {
    setTavoliState(prev => ({
      ...prev, [tavoloId]: { status:"libero", ospiti:0, ordini:[], aperto:null, cameriere:"" }
    }));
    setOrdiniCucina(prev => prev.filter(t => t.tavoloId !== tavoloId));
    if (tavoloAttivo===tavoloId) setTavoloAttivo(null);
    setPosContoModal(null);
    setPosTab("mappa");
    showToast("Tavolo chiuso ✓");
  };
  const posTicketStatus = (id, status) => setOrdiniCucina(prev => prev.map(t => t.id===id ? {...t, status} : t));

  const posAggiungiPrecomanda = (righe) => {
    const pc = {
      id: "PC"+Date.now().toString().slice(-5),
      servizio: precomandaForm.servizio,
      data: precomandaForm.data,
      note: precomandaForm.note,
      righe,
      creata: new Date().toLocaleString("it-IT"),
      inviata: false,
    };
    setPrecomande(prev => [pc, ...prev]);
    dbSavePrecomanda(pc).catch(()=>{});
    showToast(`Pre-comanda ${pc.servizio} del ${pc.data} salvata ✓`);
  };

  const calcTotal = (res) => {
    const room = ROOMS.find(r => r.id === res.roomId); if (!room) return 0;
    const n = nights(res.checkIn, res.checkOut);
    return room.price * n
      + (res.services||[]).reduce((s,sid) => { const sv=SERVICES.find(x=>x.id===sid); return s+(sv?sv.price*n:0); },0)
      + (res.roomServiceItems||[]).reduce((s,x) => s+x.price, 0);
  };
  const calcPaid  = (res) => (res.payments||[]).reduce((s,p) => s+p.amount, 0);

  // ─── MICE Calcoli ───
  const calcMiceSala = (ev) => {
    const sala = meetingRooms.find(r => r.id === ev.salaId);
    return sala ? sala.prezzo : 0;
  };
  const calcMiceAttr = (ev) => {
    return (ev.attrezzature||[]).reduce((sum, item) => {
      const a = MICE_ATTREZZATURE.find(x => x.id === item.id);
      return sum + (a ? a.prezzo * (item.qty||1) : 0);
    }, 0);
  };
  const calcMiceFB = (ev) => {
    return (ev.fb||[]).reduce((sum, item) => {
      const f = MICE_FB.find(x => x.id === item.id);
      if (!f) return sum;
      const qty = item.qty || 1;
      const pers = item.persone || ev.partecipanti || 1;
      // Moltiplicatori: se um contiene "persona" moltiplica per persone, altrimenti per qty
      return sum + (f.um.includes("persona") ? f.prezzo * pers * qty : f.prezzo * qty);
    }, 0);
  };
  const calcMiceSubtotal = (ev) => calcMiceSala(ev) + calcMiceAttr(ev) + calcMiceFB(ev);
  const calcMiceSconto = (ev) => calcMiceSubtotal(ev) * ((ev.scontoPerc||0) / 100);
  const calcMiceIva = (ev) => (calcMiceSubtotal(ev) - calcMiceSconto(ev)) * TAX_RATE;
  const calcMiceTotal = (ev) => calcMiceSubtotal(ev) - calcMiceSconto(ev) + calcMiceIva(ev);

  const saveMiceEvent = (ev) => {
    const upd = { ...ev, updatedAt: new Date().toISOString() };
    setMiceEvents(prev => prev.find(e => e.id === ev.id) ? prev.map(e => e.id===ev.id ? upd : e) : [...prev, upd]);
    setMiceForm(null);
    showToast("Evento salvato ✓");
  };
  const deleteMiceEvent = (id) => {
    if (!window.confirm("Eliminare questo evento MICE?")) return;
    setMiceEvents(prev => prev.filter(e => e.id !== id));
    showToast("Evento eliminato");
  };
  const dupMiceEvent = (ev) => {
    const dup = { ...ev, id:"EV"+Date.now().toString(36).toUpperCase().slice(-5), status:"preventivo", createdAt:new Date().toISOString() };
    setMiceEvents(prev => [...prev, dup]);
    showToast("Evento duplicato come nuovo preventivo");
  };

  // - Ospiti -

  const openNewGuest    = (forRes=null) => { setGuestForm(emptyGuest());   setModal(forRes ? "guest-form-for-"+forRes : "guest-form"); };
  const openNewAzienda  = ()           => { setGuestForm(emptyAzienda()); setModal("guest-form"); };
  const openEditGuest   = (g)          => { setGuestForm({...g});          setModal("guest-form"); };

  const saveGuest = () => {
    const g = guestForm;
    const isAz = g.tipo === "azienda";
    if (isAz) {
      if (!g.ragioneSociale || !g.piva) { showToast("Compila Ragione Sociale e P.IVA","error"); return; }
    } else {
      if (!g.cognome||!g.nome||!g.dataNascita||!g.numDoc) { showToast("Compila cognome, nome, data nascita e n° documento","error"); return; }
    }
    const isNew = !guests.find(x => x.id===g.id);
    if (isNew) {
      setGuests(p => [...p, g]);
      // Se siamo arrivati da una prenotazione, torna alla prenotazione con l'ospite già selezionato
      if (modal.startsWith("guest-form-for-")) {
        const rid = modal.replace("guest-form-for-","");
        // Aggiorna form con il nuovo ospite come principale
        setForm(prev => ({
          ...prev,
          guestId:   g.id,
          guestName: `${g.cognome} ${g.nome}`,
        }));
        showToast(`Ospite ${g.cognome} ${g.nome} aggiunto e selezionato`);
        dbSaveGuest(g).catch(()=>{});
        // Torna alla modal prenotazione (new-res o edit-res)
        setModal(prevModal || (reservations.find(r=>r.id===rid) ? "edit-res" : "new-res"));
        setPrevModal(null);
        return;
      }
      showToast(`Ospite ${g.cognome} ${g.nome} aggiunto`);
    } else {
      setGuests(p => p.map(x => x.id===g.id ? g : x));
      showToast("Ospite aggiornato");
      // Se modifica ospite da dentro prenotazione, torna alla prenotazione
      if (prevModal) {
        dbSaveGuest(g).catch(()=>{});
        setModal(prevModal);
        setPrevModal(null);
        return;
      }
    }
    dbSaveGuest(g).catch(()=>{});
    setModal(null);
  };

  const deleteGuest = (id) => {
    if (!window.confirm("Eliminare questo ospite?")) return;
    setGuests(p => p.filter(g => g.id!==id));
    sb.delete("ospiti", id).catch(()=>{});
    showToast("Ospite eliminato");
  };

  // - Prenotazioni -

  const openNewReservation = (prefill={}) => {
    setForm({ id:genId(), guestId:"", guestName:"", companions:[], roomId:"",
      checkIn:"", checkOut:"", guests:1, adulti:1, bambini:0, services:[], notes:"",
      roomServiceItems:[], payments:[], status:"reserved",
      psInviato:false, istatRegistrato:false,
      trattamento:"", canale:"", motivoSoggiorno:"", linguaOspite:"", mercato:"",
      ...prefill });
    setModal("new-res");
  };
  const openEditReservation = (res) => { setForm({...res, services:[...(res.services||[])]}); setModal("edit-res"); };

  const saveReservation = () => {
    if (!form.roomId||!form.checkIn||!form.checkOut) { showToast("Compila camera e date","error"); return; }
    if (!form.guestId&&!form.guestName)              { showToast("Seleziona o inserisci un ospite","error"); return; }
    if (new Date(form.checkOut)<=new Date(form.checkIn)) { showToast("Check-out deve essere dopo il check-in","error"); return; }
    const room = ROOMS.find(r => r.id===parseInt(form.roomId));
    if (!roomAvail(room, form.checkIn, form.checkOut, reservations, form.id)) { showToast("Camera non disponibile per quelle date","error"); return; }
    const g = guests.find(x => x.id===form.guestId);
    const saved = { ...form, roomId:parseInt(form.roomId), guests:parseInt(form.guests),
      guestName: g ? `${g.cognome} ${g.nome}` : form.guestName };
    if (modal==="new-res") { setReservations(p => [...p, saved]); showToast("Prenotazione creata! ✓"); setModal(null); setEmailPreviewRes(saved); const _g2=guests.find(x=>x.id===saved.guestId); setEmailTo(_g2?.email||""); setEmailCc(""); setEmailTab("preview"); }
    else                   { setReservations(p => p.map(r => r.id===form.id ? saved : r)); showToast("Prenotazione aggiornata!"); setModal(null); }
  };

  // ─── Genera HTML email di conferma prenotazione ───
  const buildConfirmEmail = (res, guestObj) => {
    const room   = ROOMS.find(r => r.id === parseInt(res.roomId));
    const n      = nights(res.checkIn, res.checkOut);
    const svcLines = (res.services||[]).map(sid => SERVICES.find(s=>s.id===sid)).filter(Boolean);
    const sub    = calcTotal(res);
    const tax    = sub * TAX_RATE;
    const grand  = sub + tax;
    const TRATTAMENTO_LABEL = {RO:"Solo Pernottamento",BB:"Bed & Breakfast",HB:"Mezza Pensione",FB:"Pensione Completa",AI:"All Inclusive"};
    const guestName = guestObj ? `${guestObj.cognome} ${guestObj.nome}` : (res.guestName || "Gentile Ospite");
    const guestEmail = guestObj?.email || "";

    const svcRows = svcLines.map(s => `
      <tr>
        <td style="padding:9px 16px;border-bottom:1px solid #e8edf3;color:#4a5568;font-size:14px;">${s.label}</td>
        <td style="padding:9px 16px;border-bottom:1px solid #e8edf3;text-align:right;color:#4a5568;font-size:14px;">€${s.price.toFixed(2)} × ${n} notti</td>
        <td style="padding:9px 16px;border-bottom:1px solid #e8edf3;text-align:right;font-weight:600;font-size:14px;">€${(s.price*n).toFixed(2)}</td>
      </tr>`).join("");

    return `<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Conferma Prenotazione ${res.id} — Hotel Gasparini</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a202c}
  .wrapper{max-width:620px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
  .header{background:linear-gradient(135deg,#0a1929 0%,#1565c0 100%);padding:40px 40px 32px;text-align:center}
  .logo-box{display:inline-flex;align-items:center;gap:14px;margin-bottom:22px}
  .logo-g{width:48px;height:48px;border-radius:10px;background:linear-gradient(135deg,#1976d2,#42a5f5);display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:800;color:#fff}
  .logo-name{text-align:left}
  .logo-name h1{font-size:22px;font-weight:700;color:#fff;letter-spacing:.5px}
  .logo-name p{font-size:10px;letter-spacing:3px;color:#90caf9;text-transform:uppercase;margin-top:2px}
  .confirm-badge{display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:24px;padding:7px 20px;color:#fff;font-size:13px;font-weight:600;letter-spacing:.5px;margin-bottom:16px}
  .res-id{font-size:32px;font-weight:800;color:#fff;letter-spacing:1px;margin-bottom:6px}
  .header-sub{color:#90caf9;font-size:14px}
  .hero{background:linear-gradient(135deg,#e3f2fd,#fafcff);border-bottom:2px solid #bbdefb;padding:28px 40px;display:flex;align-items:center;gap:18px}
  .hero-icon{font-size:42px;flex-shrink:0}
  .hero-text h2{font-size:20px;font-weight:700;color:#0a1929;margin-bottom:4px}
  .hero-text p{font-size:14px;color:#546e7a;line-height:1.5}
  .section{padding:28px 40px}
  .section-title{font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#90a4ae;margin-bottom:14px}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid #e8edf3;border-radius:10px;overflow:hidden}
  .info-cell{padding:14px 18px;border-right:1px solid #e8edf3;border-bottom:1px solid #e8edf3}
  .info-cell:nth-child(even){border-right:none}
  .info-cell:nth-last-child(-n+2){border-bottom:none}
  .info-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#90a4ae;margin-bottom:4px}
  .info-value{font-size:15px;font-weight:600;color:#1a202c}
  .info-value.accent{color:#1565c0}
  .dates-row{display:grid;grid-template-columns:1fr auto 1fr;gap:0;background:#f8fafc;border:1px solid #e8edf3;border-radius:10px;overflow:hidden;margin-bottom:8px;text-align:center}
  .date-box{padding:18px 14px}
  .date-label{font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#90a4ae;margin-bottom:6px}
  .date-val{font-size:18px;font-weight:800;color:#1a202c}
  .date-sub{font-size:11px;color:#78909c;margin-top:3px}
  .nights-box{display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(135deg,#0a1929,#1565c0);padding:12px 18px}
  .nights-num{font-size:26px;font-weight:800;color:#fff}
  .nights-label{font-size:10px;color:#90caf9;text-transform:uppercase;letter-spacing:1px}
  .totale-box{background:linear-gradient(135deg,#0a1929,#1565c0);border-radius:10px;padding:20px 24px;margin:0 40px 28px;display:flex;justify-content:space-between;align-items:center}
  .totale-label{color:#90caf9;font-size:13px;font-weight:600;letter-spacing:.5px}
  .totale-val{color:#fff;font-size:28px;font-weight:800;font-family:monospace;letter-spacing:1px}
  .totale-sub{color:#90caf9;font-size:11px;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  th{padding:10px 16px;background:#f8fafc;text-align:left;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#90a4ae;border-bottom:2px solid #e8edf3}
  .total-row td{padding:12px 16px;font-weight:700;font-size:15px;border-top:2px solid #e8edf3}
  .divider{height:1px;background:#e8edf3;margin:0 40px}
  .chip{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;background:#e3f2fd;color:#1565c0;margin:2px 2px 2px 0}
  .note-box{background:#fffde7;border-left:3px solid #f6c90e;border-radius:4px;padding:12px 16px;font-size:13px;color:#5d4037;line-height:1.5}
  .info-strip{background:#f8fafc;border-top:1px solid #e8edf3;padding:22px 40px;display:flex;gap:20px;flex-wrap:wrap}
  .info-item{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#546e7a;flex:1;min-width:140px}
  .info-item strong{display:block;color:#1a202c;font-size:13px;margin-bottom:2px}
  .footer{background:#0a1929;padding:28px 40px;text-align:center}
  .footer p{color:#90b4d4;font-size:12px;line-height:1.8}
  .footer a{color:#64b5f6;text-decoration:none}
  .footer .social{margin-top:14px;display:flex;justify-content:center;gap:10px}
  @media(max-width:480px){
    .info-grid{grid-template-columns:1fr}
    .info-cell{border-right:none}
    .info-cell:nth-last-child(-n+2){border-bottom:1px solid #e8edf3}
    .info-cell:last-child{border-bottom:none}
    .dates-row{grid-template-columns:1fr}
    .nights-box{flex-direction:row;gap:8px;padding:10px 18px}
    .hero{flex-direction:column;text-align:center}
    .info-strip{flex-direction:column}
    .totale-box{flex-direction:column;gap:6px;text-align:center}
    .section{padding:20px 24px}
    .header{padding:28px 24px 24px}
    .totale-box{margin:0 24px 24px}
    .divider{margin:0 24px}
    table{font-size:13px}
  }
</style>
</head>
<body>
<div class="wrapper">

  <!-- HEADER -->
  <div class="header">
    <div class="logo-box">
      <div class="logo-g">G</div>
      <div class="logo-name"><h1>Hotel Gasparini</h1><p>Chioggia, Venezia</p></div>
    </div>
    <div class="confirm-badge">✓ PRENOTAZIONE CONFERMATA</div>
    <div class="res-id">${res.id}</div>
    <div class="header-sub">Data conferma: ${new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"})}</div>
  </div>

  <!-- HERO -->
  <div class="hero">
    <div class="hero-icon">🏨</div>
    <div class="hero-text">
      <h2>Benvenuto/a, ${guestName}!</h2>
      <p>Siamo lieti di confermare la sua prenotazione presso Hotel Gasparini. Di seguito troverà tutti i dettagli del suo soggiorno.</p>
    </div>
  </div>

  <!-- DATE SOGGIORNO -->
  <div class="section">
    <div class="section-title">Periodo di Soggiorno</div>
    <div class="dates-row">
      <div class="date-box">
        <div class="date-label">Check-In</div>
        <div class="date-val">${new Date(res.checkIn).toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</div>
        <div class="date-sub">${new Date(res.checkIn).toLocaleDateString("it-IT",{year:"numeric"})}</div>
      </div>
      <div class="nights-box">
        <div class="nights-num">${n}</div>
        <div class="nights-label">nott${n===1?"e":"i"}</div>
      </div>
      <div class="date-box">
        <div class="date-label">Check-Out</div>
        <div class="date-val">${new Date(res.checkOut).toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</div>
        <div class="date-sub">${new Date(res.checkOut).toLocaleDateString("it-IT",{year:"numeric"})}</div>
      </div>
    </div>
  </div>

  <!-- DETTAGLI CAMERA -->
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Dettagli Camera</div>
    <div class="info-grid">
      <div class="info-cell">
        <div class="info-label">Camera</div>
        <div class="info-value accent">N° ${res.roomId}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Tipologia</div>
        <div class="info-value">${room?.type || "—"}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Ospiti</div>
        <div class="info-value">${res.adulti||1} adult${(res.adulti||1)===1?"o":"i"}${res.bambini>0?` · ${res.bambini} bambin${res.bambini===1?"o":"i"}`:""}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">Trattamento</div>
        <div class="info-value">${TRATTAMENTO_LABEL[res.trattamento]||"—"}</div>
      </div>
      ${room?.floor ? `<div class="info-cell"><div class="info-label">Piano</div><div class="info-value">${room.floor}° piano</div></div>` : ""}
      ${res.motivoSoggiorno ? `<div class="info-cell"><div class="info-label">Motivo Soggiorno</div><div class="info-value">${res.motivoSoggiorno}</div></div>` : ""}
    </div>
  </div>
  ${(res.canale||res.linguaOspite||res.mercato) ? `
  <!-- DETTAGLI PRENOTAZIONE -->
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Dettagli Prenotazione</div>
    <div class="info-grid">
      ${res.canale ? `<div class="info-cell"><div class="info-label">Canale</div><div class="info-value">${{"booking":"Booking.com","expedia":"Expedia","airbnb":"Airbnb","direct-web":"Sito Web","telefono":"Telefono","email":"Email","walk-in":"Walk-in","agenzia":"Agenzia di Viaggi","to":"Tour Operator","gds":"GDS","altro":"Altro"}[res.canale]||res.canale}</div></div>` : ""}
      ${res.linguaOspite ? `<div class="info-cell"><div class="info-label">Lingua Preferita</div><div class="info-value">${{"it":"🇮🇹 Italiano","en":"🇬🇧 English","de":"🇩🇪 Deutsch","fr":"🇫🇷 Français","es":"🇪🇸 Español","pt":"🇵🇹 Português","ru":"🇷🇺 Русский","zh":"🇨🇳 中文","ja":"🇯🇵 日本語","ar":"🇸🇦 العربية","nl":"🇳🇱 Nederlands","pl":"🇵🇱 Polski"}[res.linguaOspite]||res.linguaOspite}</div></div>` : ""}
      ${res.mercato ? `<div class="info-cell" style="grid-column:1/-1"><div class="info-label">Mercato di Provenienza</div><div class="info-value">${{"IT-nord":"Nord Italia","IT-centro":"Centro Italia","IT-sud":"Sud Italia","EU-dach":"DACH (Germania/Austria/Svizzera)","EU-uk":"Regno Unito","EU-fr":"Francia","EU-benelux":"Benelux","EU-scandinavia":"Scandinavia","EU-est":"Europa Orientale","EU-other":"Altro Europa","AM-nord":"Nord America","AM-sud":"Sud America","ASIA":"Asia","MENA":"Medio Oriente / Africa","OCE":"Oceania"}[res.mercato]||res.mercato}</div></div>` : ""}
    </div>
  </div>` : ""}

  <!-- RIEPILOGO COSTI -->
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Riepilogo Importi</div>
    <table>
      <thead>
        <tr>
          <th>Voce</th>
          <th style="text-align:right">Dettaglio</th>
          <th style="text-align:right">Importo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:9px 16px;border-bottom:1px solid #e8edf3;color:#4a5568;font-size:14px;">Camera ${res.roomId} — ${room?.type||""}</td>
          <td style="padding:9px 16px;border-bottom:1px solid #e8edf3;text-align:right;color:#4a5568;font-size:14px;">€${room?.price?.toFixed(2)||"—"} × ${n} notti</td>
          <td style="padding:9px 16px;border-bottom:1px solid #e8edf3;text-align:right;font-weight:600;font-size:14px;">€${((room?.price||0)*n).toFixed(2)}</td>
        </tr>
        ${svcRows}
        <tr class="total-row">
          <td colspan="2" style="text-align:right;color:#546e7a;">Subtotale</td>
          <td style="text-align:right;">€${sub.toFixed(2)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="text-align:right;color:#546e7a;font-weight:400;font-size:13px;">IVA (10%)</td>
          <td style="text-align:right;font-weight:400;font-size:13px;">€${tax.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- TOTALE -->
  <div class="totale-box">
    <div>
      <div class="totale-label">TOTALE SOGGIORNO</div>
      <div class="totale-sub">IVA inclusa</div>
    </div>
    <div class="totale-val">€${grand.toFixed(2)}</div>
  </div>

  ${svcLines.length > 0 ? `
  <!-- SERVIZI -->
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Servizi Inclusi</div>
    <div style="margin-top:4px">${svcLines.map(s=>`<span class="chip">✓ ${s.label}</span>`).join("")}</div>
  </div>` : ""}

  ${res.notes ? `
  <div class="divider"></div>
  <div class="section">
    <div class="section-title">Note / Richieste Speciali</div>
    <div class="note-box">📋 ${res.notes}</div>
  </div>` : ""}

  <!-- INFO PRATICHE -->
  <div class="divider"></div>
  <div class="info-strip">
    <div class="info-item">
      <span>🕐</span>
      <div><strong>Orari</strong>Check-in: dalle 14:00<br/>Check-out: entro le 11:00</div>
    </div>
    <div class="info-item">
      <span>📍</span>
      <div><strong>Indirizzo</strong>Corso del Popolo, 1059<br/>30015 Chioggia (VE)</div>
    </div>
    <div class="info-item">
      <span>📞</span>
      <div><strong>Contatti</strong>+39 041 400 000<br/>info@hotelgasparini.it</div>
    </div>
    <div class="info-item">
      <span>🅿</span>
      <div><strong>Parcheggio</strong>Disponibile su richiesta<br/>€20/giorno</div>
    </div>
  </div>

  <!-- FOOTER -->
  <div class="footer">
    <p>
      <strong style="color:#fff;font-size:14px">Hotel Gasparini ★★★</strong><br/>
      Corso del Popolo, 1059 · 30015 Chioggia (VE) · Italia<br/>
      📞 +39 041 400 000 · ✉ <a href="mailto:info@hotelgasparini.it">info@hotelgasparini.it</a><br/>
      <a href="https://www.hotelgasparini.it">www.hotelgasparini.it</a>
    </p>
    <p style="margin-top:14px;font-size:11px;color:#546e7a;">
      Questa è una comunicazione automatica. Per modifiche o cancellazioni contattaci entro 24 ore.<br/>
      P.IVA 01234567890 · REA VE-123456 · Rif. pren. ${res.id}
    </p>
  </div>

</div>
</body>
</html>`;
  };

  const doCheckIn  = (res) => {
    const upd = {...res, status:"checked-in", checkInTime:new Date().toISOString()};
    setReservations(p => p.map(r => r.id===res.id ? upd : r));
    dbSaveReservation(upd).catch(()=>{});
    showToast(`Check-in — ${res.guestName}`);
  };
  const doCheckOut = (res) => { setForm(res); setSplitMode(false); setSplitPersone([]); setSplitTab(0); setSplitType("equale"); setModal("checkout"); };

  const initSplit = (res, n) => {
    const tot = calcTotal(res) * (1 + TAX_RATE);
    const share = parseFloat((tot / n).toFixed(2));
    const items = buildInvoiceLines(res);
    const persons = Array.from({length: n}, (_, i) => ({
      id: i,
      nome: i === 0 ? res.guestName : `Persona ${i+1}`,
      importo: i === n-1 ? parseFloat((tot - share*(n-1)).toFixed(2)) : share, // last absorbs rounding
      items: i === 0 ? items : [],
      method: "Carta di Credito",
      paid: false,
    }));
    setSplitPersone(persons);
    setSplitTab(0);
    setSplitType("equale");
    setSplitMode(true);
  };

  const buildInvoiceLines = (res) => {
    const room = rooms.find(r => r.id === res.roomId) || ROOMS.find(r => r.id === res.roomId);
    const n = nights(res.checkIn, res.checkOut);
    const lines = [];
    if (room) lines.push({ id:"room", desc:`Camera ${res.roomId} (${room.type}) — ${n} notti`, amount: room.price * n });
    (res.services||[]).forEach(sid => {
      const s = SERVICES.find(x => x.id===sid);
      if (s) lines.push({ id:sid, desc:`${s.label} — ${n} notti`, amount: s.price * n });
    });
    (res.roomServiceItems||[]).forEach((item,i) => {
      lines.push({ id:`rsi${i}`, desc:`Extra: ${item.desc}`, amount: item.price });
    });
    return lines;
  };

  const finalizeCheckout = () => {
    const upd = {...form, status:"checked-out", checkOutTime:new Date().toISOString()};
    setReservations(p => p.map(r => r.id===form.id ? upd : r));
    dbSaveReservation(upd).catch(()=>{});
    setInvoiceRes(upd); setModal("invoice"); showToast("Check-out completato!");
  };

  const cancelReservation = (id) => {
    setReservations(p => p.map(r => r.id===id ? {...r,status:"cancelled"} : r));
    sb.update("prenotazioni", id, { status:"cancelled" }).catch(()=>{});
    showToast("Prenotazione annullata"); setModal(null);
  };
  const openInvoice = (res) => { setInvoiceRes(res); setModal("invoice"); };

  const addRoomService = () => {
    const item = { desc:form.rsDesc||"", price:parseFloat(form.rsPrice)||0, date:new Date().toLocaleDateString("it-IT") };
    if (!item.desc||item.price<=0) return;
    const upd = {...form, roomServiceItems:[...(form.roomServiceItems||[]),item], rsDesc:"", rsPrice:""};
    setForm(upd); setReservations(p => p.map(r => r.id===form.id ? upd : r));
    dbSaveExtra(form.id, item.desc, item.price, "extra").catch(()=>{});
  };

  const addPayment = (res, amount, method) => {
    const pay = { amount:parseFloat(amount), method, date:new Date().toLocaleDateString("it-IT") };
    const upd = {...res, payments:[...(res.payments||[]),pay]};
    setReservations(p => p.map(r => r.id===res.id ? upd : r));
    if (invoiceRes?.id===res.id) setInvoiceRes(upd);
    dbSavePayment(res.id, parseFloat(amount), method).catch(()=>{});
    showToast(`Pagamento €${parseFloat(amount).toFixed(2)} registrato`);
  };

  // - Stats -
  const today = new Date().toISOString().slice(0,10);
  const occupied  = reservations.filter(r => r.status==="checked-in").length;
  const arriving  = reservations.filter(r => r.checkIn===today && r.status==="reserved").length;
  const departing = reservations.filter(r => r.checkOut===today && r.status==="checked-in").length;

  const filteredRes = reservations.filter(r => {
    if (filterStatus!=="all" && r.status!==filterStatus) return false;
    const q = searchQ.toLowerCase();
    return !q || r.guestName?.toLowerCase().includes(q) || r.id?.includes(q);
  });
  const filteredGuests = guests.filter(g => {
    if (g.tipo === "azienda") return false;
    const q = guestSearch.toLowerCase();
    return !q || `${g.cognome} ${g.nome}`.toLowerCase().includes(q) || g.numDoc?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q);
  });

  const filteredAziende = guests.filter(g => {
    if (g.tipo !== "azienda") return false;
    const q = guestSearch.toLowerCase();
    return !q || g.ragioneSociale?.toLowerCase().includes(q) || g.piva?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q) || g.referente?.toLowerCase().includes(q);
  });

  const psRes    = reservations.filter(r => r.status!=="cancelled" && r.checkIn?.startsWith(psMonth));
  const istatRes = reservations.filter(r => r.status!=="cancelled" && r.checkIn?.startsWith(istatMonth));

  // - RENDER -

  const dayStr = (d) => typeof d==="string" ? d : d.toISOString().slice(0,10);

  // - COMPONENTE AUTOCOMPLETE COMUNE (definito dentro il componente) -




  const AiBar = ({ pg }) => (
    <div style={{ marginBottom:20 }}>
      {(!aiSuggestion || aiSuggestion.page !== pg) && !aiLoading && (
        <button onClick={() => requestAiSuggestion(pg)} style={{ background:"none", border:`1px dashed ${C.goldLb}`, borderRadius:8, padding:"7px 14px", fontSize:11, color:C.gold, cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", gap:6, transition:"all .2s" }}
          onMouseEnter={e=>{e.currentTarget.style.background=C.goldL}} onMouseLeave={e=>{e.currentTarget.style.background="none"}}>
          ✦ Chiedi suggerimento AI per questa pagina
        </button>
      )}
      {aiLoading && (
        <div style={{ background:C.goldL, border:`1px solid ${C.goldLb}`, borderRadius:8, padding:"10px 16px", fontSize:12, color:C.gold, display:"flex", alignItems:"center", gap:8 }}>
          <span className="ai-loading-dot">●</span><span className="ai-loading-dot">●</span><span className="ai-loading-dot">●</span>
          <span style={{ marginLeft:4 }}>L'assistente AI sta analizzando i dati...</span>
        </div>
      )}
      {aiSuggestion && aiSuggestion.page === pg && !aiLoading && (
        <div className="ai-suggestion-box">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.gold, letterSpacing:1, textTransform:"uppercase", display:"flex", alignItems:"center", gap:6 }}>
              ✦ Assistente AI — Suggerimenti per {pg}
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:10, color:C.text3 }}>{aiSuggestion.ts}</span>
              <button onClick={() => requestAiSuggestion(pg)} title="Aggiorna" style={{ background:"none", border:`1px solid ${C.goldLb}`, borderRadius:4, padding:"2px 6px", fontSize:10, color:C.gold, cursor:"pointer" }}>↺</button>
              <button onClick={() => setAiSuggestion(null)} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:14 }}>×</button>
            </div>
          </div>
          <div style={{ fontSize:13, color:C.text, lineHeight:1.7, whiteSpace:"pre-wrap" }}>{aiSuggestion.text}</div>
          <button onClick={() => { setAiMessages([{role:"user",content:`Approfondisci i suggerimenti per la pagina ${pg}: ${aiSuggestion.text}`}]); setAiVisible(true); callAI(`Approfondisci: ${aiSuggestion.text}`, `Pagina: ${pg}`).then(r=>r&&setAiMessages(p=>[...p,{role:"assistant",content:r.text}])); }} style={{ marginTop:8, background:"none", border:`1px solid ${C.goldLb}`, borderRadius:6, padding:"4px 12px", fontSize:11, color:C.gold, cursor:"pointer" }}>
            Approfondisci in chat ›
          </button>
        </div>
      )}
    </div>
  );

  const ComuneInput = ({ label, value, onChange, placeholder="Cerca comune..." }) => {
    const [query, setQuery]   = useState(value || "");
    const [open, setOpen]     = useState(false);
    const [hiIdx, setHiIdx]   = useState(0);
    const inputRef            = useRef(null);
    const listRef             = useRef(null);

    // Sincronizza query con value esterno (es. reset form)
    useEffect(() => { setQuery(value || ""); }, [value]);

    const results = useMemo(() => {
      if (!query || query.length < 2) return [];
      const q = query.toLowerCase();
      return COMUNI_IT.filter(x => x.c.toLowerCase().startsWith(q)).slice(0, 8)
        .concat(COMUNI_IT.filter(x => !x.c.toLowerCase().startsWith(q) && x.c.toLowerCase().includes(q)).slice(0, 4));
    }, [query]);

    const select = (item) => {
      setQuery(item.c);
      setOpen(false);
      onChange(item);
    };

    const handleKey = (e) => {
      if (!open || !results.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setHiIdx(i => Math.min(i+1, results.length-1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setHiIdx(i => Math.max(i-1, 0)); }
      if (e.key === "Enter")     { e.preventDefault(); if (results[hiIdx]) select(results[hiIdx]); }
      if (e.key === "Escape")    { setOpen(false); }
    };

    // Scrolla il risultato evidenziato in vista
    useEffect(() => {
      if (listRef.current) {
        const el = listRef.current.querySelector(`[data-idx="${hiIdx}"]`);
        if (el) el.scrollIntoView({ block:"nearest" });
      }
    }, [hiIdx]);

    return (
      <div style={{ position:"relative" }}>
        {label && <label className="label">{label}</label>}
        <input
          ref={inputRef}
          className="input-field"
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          onChange={e => { setQuery(e.target.value); setOpen(true); setHiIdx(0); if (!e.target.value) onChange({c:"",p:"",z:""}); }}
          onFocus={() => { if (query.length >= 2) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKey}
        />
        {open && results.length > 0 && (
          <div ref={listRef} style={{
            position:"absolute", zIndex:9999, top:"100%", left:0, right:0,
            background:"white", border:"1.5px solid #d4b896", borderRadius:"0 0 8px 8px",
            boxShadow:"0 6px 20px rgba(0,0,0,.12)", maxHeight:220, overflowY:"auto"
          }}>
            {results.map((item, i) => (
              <div key={item.c} data-idx={i}
                onMouseDown={() => select(item)}
                style={{
                  padding:"8px 12px", cursor:"pointer", fontSize:13,
                  background: i===hiIdx ? "#f5ead0" : "white",
                  borderBottom:"1px solid #f0ece6",
                  display:"flex", justifyContent:"space-between", alignItems:"center",
                }}>
                <span style={{ fontWeight: i===hiIdx ? 700 : 400 }}>{item.c}</span>
                <span style={{ fontSize:11, color:"#9c8f82", display:"flex", gap:8 }}>
                  <span style={{ background:"#f5ead0", padding:"1px 6px", borderRadius:8, fontWeight:700, color:"#a0720a" }}>{item.p}</span>
                  <span style={{ color:"#c0b8b0" }}>{item.z}</span>
                  <span style={{ color:"#c0b8b0" }}>{item.r}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ fontFamily:"IBM Plex Sans,system-ui,sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      <style>{CSS}</style>

      {/*   SIDEBAR   */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:99,
        }}/>
      )}
            <aside style={{
              position:"fixed", left:0, top:0, bottom:0,
              width: isMobile ? 0 : sidebarOpen ? 230 : 64,
              background:"#0a1929",
              display:"flex", flexDirection:"column",
              zIndex:100, overflowY:"auto", overflowX:"hidden",
              boxShadow:"2px 0 16px rgba(0,0,0,.3)",
              transition:"width .22s cubic-bezier(.4,0,.2,1)",
            }}>
              {/* Logo */}
              <div style={{ padding:sidebarOpen?"18px 16px 14px":"14px 0", borderBottom:"1px solid rgba(255,255,255,.08)", display:"flex", alignItems:"center", gap:10, overflow:"hidden", flexShrink:0, justifyContent:sidebarOpen?"flex-start":"center" }}>
                <div style={{ width:34, height:34, borderRadius:8, background:"linear-gradient(135deg,#1565c0,#0f62fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:800, color:"#fff", flexShrink:0, boxShadow:"0 2px 8px rgba(15,98,254,.4)" }}>G</div>
                <div style={{ overflow:"hidden", maxWidth:sidebarOpen?160:0, opacity:sidebarOpen?1:0, transition:"max-width .22s ease, opacity .18s ease", whiteSpace:"nowrap" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"#fff", letterSpacing:.3 }}>Hotel Gasparini</div>
                  <div style={{ fontSize:9, letterSpacing:2.5, color:"#90b4d4", textTransform:"uppercase", marginTop:1 }}>PMS · Chioggia</div>
                </div>
              </div>

              {/* Nav Groups */}
              <div style={{ flex:1, paddingTop:8, paddingBottom:8 }}>
                {PAGE_GROUPS.map(group => (
                  <div key={group.label}>
                    <div style={{
                      fontSize:9, letterSpacing:2.2, color:"rgba(144,180,212,.45)",
                      textTransform:"uppercase", fontWeight:700,
                      padding: sidebarOpen ? "14px 20px 5px" : "0",
                      maxHeight: sidebarOpen ? 30 : 0,
                      opacity: sidebarOpen ? 1 : 0,
                      overflow:"hidden",
                      transition:"max-height .2s ease, opacity .15s ease, padding .2s ease",
                    }}>{group.label}</div>

                    {group.pages.map(p => (
                      <button key={p}
                        onClick={() => { setPage(p); if(isMobile) setSidebarOpen(false); }}
                        title={!sidebarOpen ? p : ""}
                        style={{
                          display:"flex", alignItems:"center",
                          justifyContent: sidebarOpen ? "flex-start" : "center",
                          width:"100%", padding: sidebarOpen ? "9px 20px 9px 17px" : "11px 0",
                          border:"none", borderLeft: page===p ? "3px solid #5b9dff" : "3px solid transparent",
                          background: page===p ? "rgba(21,101,192,.35)" : "none",
                          cursor:"pointer", fontSize:13,
                          color: page===p ? "#e8f0ff" : "#90b4d4",
                          textAlign:"left", transition:"all .15s",
                          fontFamily:"'IBM Plex Sans',sans-serif",
                          fontWeight: page===p ? 600 : 400,
                          WebkitTapHighlightColor:"transparent",
                        }}
                        onMouseEnter={e=>{ if(page!==p){ e.currentTarget.style.background="rgba(255,255,255,.06)"; e.currentTarget.style.color="#fff"; }}}
                        onMouseLeave={e=>{ e.currentTarget.style.background=page===p?"rgba(21,101,192,.35)":"none"; e.currentTarget.style.color=page===p?"#e8f0ff":"#90b4d4"; }}
                      >
                        <Icon name={PAGE_ICONS[p]} size={17} color={page===p?"#90c8ff":"#6a8fad"} strokeWidth={page===p?2:1.5} style={{ flexShrink:0 }}/>
                        <span style={{
                          whiteSpace:"nowrap", overflow:"hidden",
                          maxWidth: sidebarOpen ? 160 : 0,
                          opacity: sidebarOpen ? 1 : 0,
                          transition:"max-width .22s ease, opacity .15s ease",
                          display:"block", marginLeft: sidebarOpen ? 10 : 0,
                        }}>{p}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>

              {/* Bottom: DB status */}
              <div style={{
                borderTop:"1px solid rgba(255,255,255,.08)",
                padding: sidebarOpen ? "14px 20px" : "12px 0",
                fontSize:11, color:"rgba(144,180,212,.5)", flexShrink:0,
                display:"flex", flexDirection:"column", gap:4,
                alignItems: sidebarOpen ? "flex-start" : "center",
                transition:"padding .22s ease",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, overflow:"hidden" }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", flexShrink:0, display:"block",
                    background: dbStatus==="ok"?"#6fcf97":dbStatus==="connecting"||dbStatus==="seeding"?"#90caf9":"#ef9a9a" }}/>
                  <span style={{ whiteSpace:"nowrap", overflow:"hidden", maxWidth:sidebarOpen?160:0, opacity:sidebarOpen?1:0, transition:"max-width .22s ease, opacity .15s ease" }}>
                    {dbStatus==="ok"?"DB online":dbStatus==="seeding"?"Init…":"Offline"}
                  </span>
                </div>
                <span style={{ whiteSpace:"nowrap", maxWidth:sidebarOpen?160:0, opacity:sidebarOpen?1:0, transition:"max-width .22s ease, opacity .15s ease", overflow:"hidden", fontSize:10 }}>
                  {new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"})}
                </span>
              </div>
            </aside>

      {/*   TOPBAR CONTESTUALE   */}
      <div className="topbar" style={{ position:"fixed", top:0, left:isMobile?0:sidebarOpen?230:64, right:0, height:52, transition:"left .22s cubic-bezier(.4,0,.2,1)", background:"#fff", borderBottom:"1px solid #dde3ec", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px 0 16px", zIndex:90, boxShadow:"0 1px 4px rgba(0,0,0,.06)", transition:"left .22s ease" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.text2 }}>
          <button onClick={() => setSidebarOpen(v=>!v)} style={{ background:"none", border:"none", cursor:"pointer", color:C.text3, fontSize:20, lineHeight:1, padding:"2px 4px", borderRadius:4, flexShrink:0 }} title={sidebarOpen?"Chiudi barra":"Apri barra"}>☰</button>
          <span style={{ color:"#8896a8", fontSize:12 }}>Hotel Gasparini</span>
          <span style={{ color:"#c4cdd9" }}>›</span>
          <span style={{ fontWeight:600, color:"#1a2535" }}>{page}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={() => setAiVisible(v=>!v)}
            style={{ background: aiVisible ? C.gold : C.goldL, border:`1px solid ${C.goldLb}`, borderRadius:4, padding:"6px 14px", cursor:"pointer", fontSize:12, fontWeight:600, color: aiVisible ? "#fff" : C.gold, display:"flex", alignItems:"center", gap:6, transition:"all .15s" }}>
            ✦ AI Assistant {aiLoading && <span><span className="ai-loading-dot">·</span><span className="ai-loading-dot">·</span><span className="ai-loading-dot">·</span></span>}
          </button>
        </div>
      </div>

      {/*   CONTENUTO PRINCIPALE   */}
      <div className="main-content" style={{ marginLeft:isMobile?0:sidebarOpen?230:64, paddingTop:72, paddingLeft:isMobile?12:28, paddingRight:isMobile?12:28, paddingBottom:isMobile?80:32, minHeight:"100vh", transition:"margin-left .22s cubic-bezier(.4,0,.2,1)" }}>

        {/*   DASHBOARD   */}
        {page==="Dashboard" && (() => {
          // - Metriche oggi -
          const todayStr   = new Date().toISOString().slice(0,10);
          const totalRooms = rooms.length;

          // Prenotazioni attive oggi
          const activeToday = reservations.filter(r =>
            !["cancelled","checked-out"].includes(r.status) &&
            r.checkIn <= todayStr && r.checkOut > todayStr
          );
          const occToday    = activeToday.length;
          const occPctToday = totalRooms > 0 ? Math.round((occToday / totalRooms) * 100) : 0;

          // RevPAR oggi = revenue generato dalle camere occupate oggi / totale camere
          const revenueToday = activeToday.reduce((sum, r) => {
            const room = rooms.find(x => x.id === r.roomId);
            return sum + (room ? room.price : 0);
          }, 0);
          const revParToday = totalRooms > 0 ? Math.round(revenueToday / totalRooms * 100) / 100 : 0;

          // ADR oggi = revenue / camere occupate
          const adrToday = occToday > 0 ? Math.round((revenueToday / occToday) * 100) / 100 : 0;

          // - Stessa data anno scorso (simulata — ±15% random ma stabile) -
          // Usiamo un seed basato sulla data per valori "stabili"
          const seed = parseInt(todayStr.replace(/-/g,"")) % 100;
          const lyFactor = (75 + (seed % 25)) / 100; // tra 0.75 e 1.00

          const occLY     = Math.round(occPctToday * lyFactor);
          const revParLY  = Math.round(revParToday * lyFactor * 100) / 100;
          const adrLY     = Math.round(adrToday * lyFactor * 100) / 100;

          // Delta e freccia
          const delta = (curr, prev) => {
            if (prev === 0) return { val:0, pct:0, up: curr >= 0 };
            const d = curr - prev;
            const pct = Math.round((d / prev) * 100 * 10) / 10;
            return { val: d, pct, up: d >= 0 };
          };
          const dOcc    = delta(occPctToday, occLY);
          const dRevPar = delta(revParToday, revParLY);
          const dAdr    = delta(adrToday, adrLY);

          // - Arrivi di oggi -
          const arrivalsToday = reservations.filter(r =>
            r.checkIn === todayStr && r.status === "reserved"
          );
          const totAdulti  = arrivalsToday.reduce((s,r) => s + (r.adulti  || r.guests || 1), 0);
          const totBambini = arrivalsToday.reduce((s,r) => s + (r.bambini || 0), 0);
          const totOspiti  = totAdulti + totBambini;

          // - Partenze -
          const departuresToday = reservations.filter(r =>
            r.checkOut === todayStr && r.status === "checked-in"
          );

          // Gauge SVG helper
          const Gauge = ({ pct, color, size=80 }) => {
            const r2 = (size/2) - 8;
            const circ = Math.PI * r2; // half circle
            const dash = circ * Math.min(pct,100) / 100;
            return (
              <svg width={size} height={size/2+10} viewBox={`0 0 ${size} ${size/2+10}`}>
                <path d={`M8,${size/2} A${r2},${r2} 0 0,1 ${size-8},${size/2}`}
                  fill="none" stroke="#dde3ec" strokeWidth="8" strokeLinecap="round"/>
                <path d={`M8,${size/2} A${r2},${r2} 0 0,1 ${size-8},${size/2}`}
                  fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${dash} ${circ}`} style={{ transition:"stroke-dasharray .8s ease" }}/>
                <text x={size/2} y={size/2+8} textAnchor="middle" fontSize="14" fontWeight="700" fill={color}>{pct}%</text>
              </svg>
            );
          };

          // Mini spark-bar helper (7 valori)
          const SparkBar = ({ values, color }) => {
            const max = Math.max(...values, 1);
            return (
              <div style={{ display:"flex", alignItems:"flex-end", gap:2, height:28 }}>
                {values.map((v,i) => (
                  <div key={i} style={{ flex:1, height:`${Math.max(4,(v/max)*100)}%`, background: i===values.length-1 ? color : `${color}60`, borderRadius:"2px 2px 0 0", transition:"height .4s" }} />
                ))}
              </div>
            );
          };

          // Valori spark simulati per la settimana (crescenti verso oggi)
          const sparkOcc    = [42,55,61,58,65,70,occPctToday];
          const sparkRevPar = [28,35,40,38,44,50,revParToday].map(v=>Math.round(v));
          const sparkAdr    = [80,90,100,95,110,115,adrToday].map(v=>Math.round(v));

          // Colore semaforo occupazione
          const occColor = occPctToday >= 80 ? C.green : occPctToday >= 50 ? C.amber : C.red;

          return (
            <div>
              {/*   Page header Opera Cloud style   */}
              <div className="page-header">
                <div>
                  <div style={{ fontSize:11, color:C.text3, fontWeight:600, letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>
                    {new Date().toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}
                  </div>
                  <h1>Dashboard</h1>
                  <div className="page-subtitle">Panoramica operativa · {totalRooms} camere disponibili</div>
                </div>
                <button className="btn-primary" onClick={openNewReservation}>+ Nuova Prenotazione</button>
              </div>
              <AiBar pg="Dashboard" />

              {/*   KPI strip — stile Opera Cloud   */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":isTablet?"repeat(3,1fr)":"repeat(6,1fr)", gap:10, marginBottom:18 }}>
                {[
                  { l:"Occupate oggi",   v:`${occToday}`,            sub:`/${totalRooms} camere`,  c:C.navy,   accent:"#0f62fe", icon:"🏨" },
                  { l:"Occupazione %",   v:`${occPctToday}%`,        sub:"tasso oggi",             c:occPctToday>=80?C.green:occPctToday>=50?C.amber:C.red, accent:occPctToday>=80?"#1b7a4a":occPctToday>=50?"#e65100":"#c62828", icon:"📊" },
                  { l:"Arrivi",          v:arrivalsToday.length,     sub:"da fare oggi",           c:C.green,  accent:"#1b7a4a", icon:"▲" },
                  { l:"Partenze",        v:departuresToday.length,   sub:"da fare oggi",           c:C.amber,  accent:"#e65100", icon:"▼" },
                  { l:"RevPAR",          v:`€${revParToday.toFixed(0)}`, sub:"revenue/camera",     c:C.navy,   accent:"#0f62fe", icon:"💰" },
                  { l:"ADR",             v:`€${adrToday.toFixed(0)}`, sub:"tariffa media",         c:C.purple, accent:"#5c35cc", icon:"📈" },
                ].map(s => (
                  <div key={s.l} style={{
                    background:C.surface, border:`1px solid ${C.border}`, borderRadius:5,
                    padding:"14px 16px", borderTop:`3px solid ${s.accent}`,
                    boxShadow:"0 1px 3px rgba(0,0,0,.04)"
                  }}>
                    <div style={{ fontSize:10, fontWeight:600, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      {s.l} <span style={{ fontSize:14 }}>{s.icon}</span>
                    </div>
                    <div style={{ fontSize:26, fontWeight:700, color:s.c, lineHeight:1, fontFamily:"IBM Plex Sans,sans-serif", letterSpacing:"-.5px" }}>{s.v}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>{s.sub}</div>
                  </div>
                ))}
              </div>

              {/*   Riga 2: Gadget avanzati (occupazione, RevPAR, ADR, Arrivi)   */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:14, marginBottom:20 }}>

                {/* GADGET 1: Occupazione YoY */}
                <div className="card" style={{ padding:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Occupazione</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:32, fontWeight:700, color:occColor, lineHeight:1, letterSpacing:"-.5px" }}>{occPctToday}<span style={{ fontSize:16 }}>%</span></div>
                      <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>Oggi · {occToday}/{totalRooms} cam.</div>
                    </div>
                    <Gauge pct={occPctToday} color={occColor} size={72} />
                  </div>
                  {/* Confronto LY */}
                  <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:10, color:C.text3 }}>Stesso giorno anno scorso</div>
                        <div style={{ fontSize:18, fontWeight:600, color:C.text2, fontFamily:"IBM Plex Sans,sans-serif" }}>{occLY}%</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:18, fontWeight:700, color: dOcc.up ? C.green : C.red }}>
                          {dOcc.up ? "▲" : "▼"} {Math.abs(dOcc.pct)}%
                        </div>
                        <div style={{ fontSize:10, color: dOcc.up ? C.green : C.red }}>vs anno scorso</div>
                      </div>
                    </div>
                    <div style={{ marginTop:8 }}>
                      <SparkBar values={sparkOcc} color={occColor} />
                      <div style={{ fontSize:9, color:C.text3, marginTop:2, textAlign:"right" }}>ultimi 7gg</div>
                    </div>
                  </div>
                </div>

                {/* GADGET 2: RevPAR YoY */}
                <div className="card" style={{ padding:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>RevPAR</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:11, color:C.text3, marginBottom:2 }}>Revenue Per Available Room</div>
                      <div style={{ fontSize:32, fontWeight:700, color:C.navy, lineHeight:1, letterSpacing:"-.5px" }}>€{revParToday.toFixed(0)}</div>
                      <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>Oggi · €{revenueToday.toLocaleString()}/{totalRooms} cam.</div>
                    </div>
                  </div>
                  {/* Confronto LY */}
                  <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:10, color:C.text3 }}>Stesso giorno anno scorso</div>
                        <div style={{ fontSize:18, fontWeight:600, color:C.text2, fontFamily:"IBM Plex Sans,sans-serif" }}>€{revParLY.toFixed(0)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:18, fontWeight:700, color: dRevPar.up ? C.green : C.red }}>
                          {dRevPar.up ? "▲" : "▼"} {Math.abs(dRevPar.pct)}%
                        </div>
                        <div style={{ fontSize:10, color: dRevPar.up ? C.green : C.red }}>
                          {dRevPar.up ? "+" : "−"}€{Math.abs(Math.round(dRevPar.val))} vs LY
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop:8 }}>
                      <SparkBar values={sparkRevPar} color={C.navy} />
                      <div style={{ fontSize:9, color:C.text3, marginTop:2, textAlign:"right" }}>ultimi 7gg</div>
                    </div>
                  </div>
                  <div style={{ marginTop:10, padding:"7px 10px", background:C.navyL, borderRadius:6, fontSize:11, color:C.navy }}>
                    <b>Formula:</b> Revenue totale ÷ Camere disponibili ({totalRooms})
                  </div>
                </div>

                {/* GADGET 3: ADR YoY */}
                <div className="card" style={{ padding:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>ADR — Average Daily Rate</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                    <div>
                      <div style={{ fontSize:11, color:C.text3, marginBottom:2 }}>Tariffa media giornaliera</div>
                      <div style={{ fontSize:32, fontWeight:700, color:C.gold, lineHeight:1, letterSpacing:"-.5px" }}>€{adrToday.toFixed(0)}</div>
                      <div style={{ fontSize:11, color:C.text3, marginTop:4 }}>
                        {occToday > 0 ? `€${revenueToday.toLocaleString()} ÷ ${occToday} occ.` : "Nessuna camera occupata"}
                      </div>
                    </div>
                  </div>
                  {/* Confronto LY */}
                  <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:10, color:C.text3 }}>Stesso giorno anno scorso</div>
                        <div style={{ fontSize:18, fontWeight:600, color:C.text2, fontFamily:"IBM Plex Sans,sans-serif" }}>€{adrLY.toFixed(0)}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:18, fontWeight:700, color: dAdr.up ? C.green : C.red }}>
                          {dAdr.up ? "▲" : "▼"} {Math.abs(dAdr.pct)}%
                        </div>
                        <div style={{ fontSize:10, color: dAdr.up ? C.green : C.red }}>
                          {dAdr.up ? "+" : "−"}€{Math.abs(Math.round(dAdr.val))} vs LY
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop:8 }}>
                      <SparkBar values={sparkAdr} color={C.gold} />
                      <div style={{ fontSize:9, color:C.text3, marginTop:2, textAlign:"right" }}>ultimi 7gg</div>
                    </div>
                  </div>
                  <div style={{ marginTop:10, padding:"7px 10px", background:C.goldL, borderRadius:6, fontSize:11, color:C.gold }}>
                    <b>Formula:</b> Revenue totale ÷ Camere occupate ({occToday})
                  </div>
                </div>

                {/* GADGET 4: Arrivi adulti/bambini */}
                <div className="card" style={{ padding:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase", marginBottom:12 }}>Arrivi di Oggi</div>
                  <div style={{ fontSize:32, fontWeight:700, color:C.green, lineHeight:1, letterSpacing:"-.5px", marginBottom:4 }}>
                    {arrivalsToday.length} <span style={{ fontSize:16 }}>pren.</span>
                  </div>
                  {/* Donut adulti/bambini */}
                  <div style={{ display:"flex", alignItems:"center", gap:16, margin:"14px 0" }}>
                    {totOspiti > 0 ? (
                      <svg width={70} height={70} viewBox="0 0 70 70">
                        {/* Donut chart adulti/bambini */}
                        {(() => {
                          const R = 28, cx = 35, cy = 35, stroke = 10;
                          const circ = 2 * Math.PI * R;
                          const adultPct = totOspiti > 0 ? totAdulti / totOspiti : 1;
                          const adultDash = circ * adultPct;
                          const childDash = circ * (1 - adultPct);
                          return (
                            <>
                              <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.greenL} strokeWidth={stroke}/>
                              <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.green} strokeWidth={stroke}
                                strokeDasharray={`${adultDash} ${circ}`}
                                strokeDashoffset={0}
                                transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt"/>
                              <circle cx={cx} cy={cy} r={R} fill="none" stroke={C.amber} strokeWidth={stroke}
                                strokeDasharray={`${childDash} ${circ}`}
                                strokeDashoffset={-adultDash}
                                transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt"/>
                              <text x={cx} y={cy+5} textAnchor="middle" fontSize="14" fontWeight="700" fill={C.text}>{totOspiti}</text>
                            </>
                          );
                        })()}
                      </svg>
                    ) : (
                      <div style={{ width:70, height:70, borderRadius:"50%", background:C.surface2, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:C.text3 }}>–</div>
                    )}
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:C.green }} />
                          <span style={{ fontSize:12, color:C.text2 }}>Adulti</span>
                        </div>
                        <span style={{ fontSize:20, fontWeight:700, color:C.green, fontFamily:"IBM Plex Sans,sans-serif" }}>{totAdulti}</span>
                      </div>
                      <div style={{ height:6, background:C.surface2, borderRadius:3, marginBottom:10 }}>
                        <div style={{ height:6, width:`${totOspiti>0?(totAdulti/totOspiti)*100:0}%`, background:C.green, borderRadius:3, transition:"width .5s" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:C.amber }} />
                          <span style={{ fontSize:12, color:C.text2 }}>Bambini</span>
                        </div>
                        <span style={{ fontSize:20, fontWeight:700, color:C.amber, fontFamily:"IBM Plex Sans,sans-serif" }}>{totBambini}</span>
                      </div>
                      <div style={{ height:6, background:C.surface2, borderRadius:3 }}>
                        <div style={{ height:6, width:`${totOspiti>0?(totBambini/totOspiti)*100:0}%`, background:C.amber, borderRadius:3, transition:"width .5s" }} />
                      </div>
                    </div>
                  </div>
                  {/* Lista arrivi */}
                  <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, marginTop:4 }}>
                    {arrivalsToday.length === 0 && <div style={{ fontSize:12, color:C.text3, textAlign:"center", padding:"8px 0" }}>Nessun arrivo oggi</div>}
                    {arrivalsToday.slice(0,3).map(r => {
                      const room = rooms.find(x => x.id === r.roomId);
                      const a = r.adulti || r.guests || 1;
                      const b = r.bambini || 0;
                      return (
                        <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                          <div>
                            <div style={{ fontWeight:600 }}>{r.guestName}</div>
                            <div style={{ fontSize:10, color:C.text3 }}>Cam {r.roomId} · {room?.type}</div>
                          </div>
                          <div style={{ textAlign:"right", fontSize:11 }}>
                            <span style={{ color:C.green, fontWeight:600 }}>{a}A</span>
                            {b > 0 && <span style={{ color:C.amber, fontWeight:600, marginLeft:4 }}>{b}B</span>}
                          </div>
                        </div>
                      );
                    })}
                    {arrivalsToday.length > 3 && <div style={{ fontSize:11, color:C.text3, textAlign:"center", marginTop:5 }}>+{arrivalsToday.length-3} altri arrivi</div>}
                  </div>
                </div>
              </div>

              {/*   Riga 2b: Grafico Occupazione 30 giorni   */}
              {(() => {
                const hovIdx    = chartHovIdx;
                const setHovIdx = setChartHovIdx;

                const oggi = new Date(); oggi.setHours(0,0,0,0);
                const totalRooms = rooms.length || 59;

                const giorniN = Array.from({length:chartRange}, (_,i) => {
                  const d = new Date(oggi); d.setDate(d.getDate()+i); return d;
                });
                const ds = d => d.toISOString().slice(0,10);

                const dati = giorniN.map(d => {
                  const dss = ds(d);
                  const occ = reservations.filter(r => r.status==="checked-in" && r.checkIn<=dss && r.checkOut>dss).length;
                  const res = reservations.filter(r => r.status==="reserved"   && r.checkIn<=dss && r.checkOut>dss).length;
                  const tot = occ + res;
                  const rev = reservations
                    .filter(r => ["checked-in","reserved"].includes(r.status) && r.checkIn<=dss && r.checkOut>dss)
                    .reduce((s,r) => { const rm = ROOMS.find(x=>x.id===r.roomId); return s+(rm?.price||0); }, 0);
                  return { d, dss, occ, res, tot, pct: Math.round((tot/totalRooms)*100), rev };
                });

                const mediaPct   = Math.round(dati.reduce((s,d)=>s+d.pct,0)/chartRange);
                const mediaRev   = Math.round(dati.reduce((s,d)=>s+d.rev,0)/chartRange);
                const piccoIdx   = dati.reduce((mi,d,i)=>d.pct>dati[mi].pct?i:mi,0);
                const minimoIdx  = dati.reduce((mi,d,i)=>d.pct<dati[mi].pct?i:mi,0);
                const giorniSopra80 = dati.filter(d=>d.pct>=80).length;
                const giorniSotto20 = dati.filter(d=>d.pct<20).length;

                // Linea di tendenza (regressione lineare semplice)
                const n = dati.length;
                const sumX = dati.reduce((s,_,i)=>s+i,0);
                const sumY = dati.reduce((s,d)=>s+d.pct,0);
                const sumXY = dati.reduce((s,d,i)=>s+i*d.pct,0);
                const sumX2 = dati.reduce((s,_,i)=>s+i*i,0);
                const slope = (n*sumXY - sumX*sumY) / (n*sumX2 - sumX*sumX);
                const intercept = (sumY - slope*sumX) / n;
                const trendY = i => intercept + slope*i;

                const W=860, H=200, PL=44, PR=14, PT=20, PB=40;
                const cW=W-PL-PR, cH=H-PT-PB;
                const bW = Math.max(4, Math.floor(cW/chartRange)-2);

                const xOf = i => PL + i*(cW/chartRange) + 1;
                const yOf = pct => PT + cH - (Math.min(pct,100)/100)*cH;

                const hov = hovIdx !== null ? dati[hovIdx] : null;
                const hovX = hovIdx !== null ? xOf(hovIdx) + bW/2 : 0;

                return (
                  <div className="card" style={{ marginBottom:18 }}>
                    {/* Header */}
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <div>
                        <div className="section-title">Occupazione Prevista</div>
                        <div style={{ fontSize:11, color:C.text3 }}>Camere occupate + prenotate · {chartRange} giorni</div>
                      </div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        {/* Toggle range */}
                        <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                          {[7,14,30].map(r => (
                            <button key={r} onClick={()=>setChartRange(r)}
                              style={{ padding:"4px 12px", background:chartRange===r?C.gold:C.surface, color:chartRange===r?"#fff":C.text2, border:"none", fontWeight:700, fontSize:11, cursor:"pointer" }}>
                              {r}gg
                            </button>
                          ))}
                        </div>
                        {/* Legenda */}
                        {[["Checked-in",C.green],["Prenotate",C.navy],["Trend",C.amber]].map(([l,c])=>(
                          <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:C.text3 }}>
                            <div style={{ width:10, height:10, borderRadius:l==="Trend"?0:2, background:l==="Trend"?"none":"transparent", border:l==="Trend"?`2px dashed ${c}`:`2px solid ${c}` }}/>
                            {l}
                          </div>
                        ))}
                        <div style={{ padding:"4px 12px", background:C.goldL, border:`1px solid ${C.goldLb}`, borderRadius:20, fontSize:11, fontWeight:700, color:C.gold }}>
                          Media {mediaPct}%
                        </div>
                      </div>
                    </div>

                    {/* SVG chart */}
                    <div style={{ overflowX:"auto", position:"relative" }}>
                      <svg width={W} height={H} style={{ display:"block", maxWidth:"100%", cursor:"crosshair" }}
                        onMouseLeave={()=>setHovIdx(null)}>

                        {/* Sfondo chart */}
                        <rect x={PL} y={PT} width={cW} height={cH} fill={C.surface2} rx="4"/>

                        {/* Grid lines */}
                        {[0,25,50,75,100].map(pct => {
                          const y = yOf(pct);
                          return (
                            <g key={pct}>
                              <line x1={PL} y1={y} x2={PL+cW} y2={y}
                                stroke={pct===0?C.border2:C.border}
                                strokeWidth={pct===0?1.5:0.7}
                                strokeDasharray={pct===0?"0":"3,5"}/>
                              <text x={PL-4} y={y+4} textAnchor="end" fontSize="9" fill={C.text3}>{pct}%</text>
                            </g>
                          );
                        })}

                        {/* Linea media */}
                        {(() => {
                          const ym = yOf(mediaPct);
                          return (
                            <g>
                              <line x1={PL} y1={ym} x2={PL+cW} y2={ym}
                                stroke={C.gold} strokeWidth={1.2} strokeDasharray="4,4" opacity={0.6}/>
                              <rect x={PL+4} y={ym-8} width={34} height={13} rx="3" fill={C.goldL}/>
                              <text x={PL+21} y={ym+1} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.gold}>med {mediaPct}%</text>
                            </g>
                          );
                        })()}

                        {/* Linea di tendenza */}
                        {(() => {
                          const x0 = xOf(0)+bW/2, y0 = yOf(Math.max(0,Math.min(100,trendY(0))));
                          const x1 = xOf(n-1)+bW/2, y1 = yOf(Math.max(0,Math.min(100,trendY(n-1))));
                          const goingUp = slope > 0.3;
                          const goingDown = slope < -0.3;
                          return (
                            <g>
                              <line x1={x0} y1={y0} x2={x1} y2={y1}
                                stroke={goingUp?C.green:goingDown?C.red:C.amber}
                                strokeWidth={1.8} strokeDasharray="6,3" opacity={0.8}/>
                              <circle cx={x1} cy={y1} r="3" fill={goingUp?C.green:goingDown?C.red:C.amber}/>
                              <text x={x1+5} y={y1+4} fontSize="8" fontWeight="700"
                                fill={goingUp?C.green:goingDown?C.red:C.amber}>
                                {goingUp?"↗":goingDown?"↘":"→"}
                              </text>
                            </g>
                          );
                        })()}

                        {/* Barre */}
                        {dati.map((g, i) => {
                          const x    = xOf(i);
                          const hOcc = (g.occ/totalRooms)*cH;
                          const hRes = (g.res/totalRooms)*cH;
                          const yOcc = PT + cH - hOcc;
                          const yRes = yOcc - hRes;
                          const isOggi   = g.dss === todayStr;
                          const isPicco  = i === piccoIdx && g.pct>0;
                          const isMinimo = i === minimoIdx && g.pct < mediaPct - 10;
                          const isHov    = hovIdx === i;
                          const isWeekend= g.d.getDay()===0||g.d.getDay()===6;
                          return (
                            <g key={i}
                              onMouseEnter={()=>setHovIdx(i)}
                              style={{ cursor:"pointer" }}>
                              {/* sfondo weekend */}
                              {isWeekend && <rect x={x} y={PT} width={bW} height={cH} fill={C.navyL} opacity={0.25}/>}
                              {/* hover highlight */}
                              {isHov && <rect x={x-1} y={PT} width={bW+2} height={cH} fill={C.goldL} opacity={0.4} rx="2"/>}
                              {/* barra prenotate */}
                              {hRes > 0 && <rect x={x} y={yRes} width={bW} height={hRes} fill={C.navy} opacity={isHov?1:0.7} rx="1"/>}
                              {/* barra occ */}
                              {hOcc > 0 && <rect x={x} y={yOcc} width={bW} height={hOcc} fill={C.green} opacity={isHov?1:0.8} rx="1"/>}
                              {/* outline oggi */}
                              {isOggi && <rect x={x-1} y={PT-2} width={bW+2} height={cH+4} fill="none" stroke={C.gold} strokeWidth="1.5" rx="2"/>}
                              {/* badge picco */}
                              {isPicco && (
                                <g>
                                  <rect x={x-3} y={yRes-16} width={bW+6} height={13} rx="3" fill={C.redL} stroke={C.redLb} strokeWidth="0.5"/>
                                  <text x={x+bW/2} y={yRes-6} textAnchor="middle" fontSize="8" fontWeight="700" fill={C.red}>▲{g.pct}%</text>
                                </g>
                              )}
                              {/* badge minimo */}
                              {isMinimo && (
                                <g>
                                  <rect x={x-3} y={PT+cH+6} width={bW+6} height={12} rx="3" fill={C.navyL} stroke={C.navyLb} strokeWidth="0.5"/>
                                  <text x={x+bW/2} y={PT+cH+14} textAnchor="middle" fontSize="7" fontWeight="700" fill={C.navy}>▼{g.pct}%</text>
                                </g>
                              )}
                              {/* label pct ogni 5gg o oggi */}
                              {(i%5===0||isOggi) && g.pct>0 && !isPicco && (
                                <text x={x+bW/2} y={Math.min(yRes,yOcc)-4} textAnchor="middle" fontSize="8"
                                  fill={isOggi?C.gold:C.text3} fontWeight={isOggi?"700":"400"}>{g.pct}%</text>
                              )}
                              {/* Asse X */}
                              {(i===0||i%Math.ceil(chartRange/6)===0||i===chartRange-1||isOggi||g.d.getDate()===1) && (
                                <g>
                                  <line x1={x+bW/2} y1={PT+cH} x2={x+bW/2} y2={PT+cH+4} stroke={C.border2} strokeWidth="1"/>
                                  <text x={x+bW/2} y={H-6} textAnchor="middle" fontSize="9"
                                    fontWeight={isOggi?"700":"400"} fill={isOggi?C.gold:isWeekend?C.navy:C.text3}>
                                    {isOggi ? "Oggi" : `${g.d.getDate()}/${g.d.getMonth()+1}`}
                                  </text>
                                </g>
                              )}
                            </g>
                          );
                        })}

                        {/* Tooltip hover */}
                        {hov && (() => {
                          const tx = Math.min(Math.max(hovX - 55, PL), PL+cW-114);
                          const ty = PT + 4;
                          return (
                            <g style={{ pointerEvents:"none" }}>
                              {/* Linea verticale */}
                              <line x1={hovX} y1={PT} x2={hovX} y2={PT+cH} stroke={C.gold} strokeWidth={1} strokeDasharray="3,3" opacity={0.8}/>
                              {/* Box tooltip */}
                              <rect x={tx} y={ty} width={114} height={72} rx="6" fill="white" stroke={C.border} strokeWidth="1"
                                style={{ filter:"drop-shadow(0 2px 6px rgba(0,0,0,.1))" }}/>
                              <text x={tx+8} y={ty+14} fontSize="10" fontWeight="700" fill={C.text}>
                                {hov.d.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"2-digit"})}
                              </text>
                              <rect x={tx+8} y={ty+20} width={7} height={7} rx="1" fill={C.green}/>
                              <text x={tx+18} y={ty+27} fontSize="9" fill={C.text2}>Occ: <tspan fontWeight="700" fill={C.green}>{hov.occ} cam</tspan></text>
                              <rect x={tx+8} y={ty+33} width={7} height={7} rx="1" fill={C.navy}/>
                              <text x={tx+18} y={ty+40} fontSize="9" fill={C.text2}>Res: <tspan fontWeight="700" fill={C.navy}>{hov.res} cam</tspan></text>
                              <line x1={tx+8} y1={ty+47} x2={tx+106} y2={ty+47} stroke={C.border} strokeWidth="0.5"/>
                              <text x={tx+8} y={ty+58} fontSize="9" fill={C.text2}>Occu: <tspan fontWeight="700" fill={hov.pct>=80?C.green:hov.pct>=50?C.amber:C.navy}>{hov.pct}%</tspan></text>
                              <text x={tx+62} y={ty+58} fontSize="9" fill={C.text2}>Rev: <tspan fontWeight="700" fill={C.gold}>€{hov.rev.toFixed(0)}</tspan></text>
                              <text x={tx+8} y={ty+68} fontSize="8" fill={C.text3}>
                                {hov.d.getDay()===0||hov.d.getDay()===6?"🏖 Weekend":"Giorno feriale"}
                              </text>
                            </g>
                          );
                        })()}
                      </svg>
                    </div>

                    {/* Mini KPI strip */}
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginTop:14 }}>
                      {[
                        { l:"Oggi",       v:`${dati[0]?.pct||0}%`,    c:dati[0]?.pct>=80?C.green:dati[0]?.pct>=50?C.amber:C.navy },
                        { l:`Media ${chartRange}gg`, v:`${mediaPct}%`, c:C.gold },
                        { l:"Picco",      v:`${dati[piccoIdx]?.pct||0}% · ${dati[piccoIdx]?.d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})}`, c:C.red },
                        { l:"Rev/giorno", v:`€${mediaRev.toFixed(0)}`, c:C.gold },
                        { l:"Giorni >80%",v:giorniSopra80,             c:C.green },
                        { l:"Giorni <20%",v:giorniSotto20,             c:giorniSotto20>3?C.red:C.text3 },
                      ].map(s=>(
                        <div key={s.l} style={{ textAlign:"center", padding:"8px 4px", background:C.surface2, borderRadius:6 }}>
                          <div style={{ fontSize:9, color:C.text3, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>{s.l}</div>
                          <div style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/*   Riga 3: Movimenti oggi + Mappa camere   */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                <div className="card">
                  <div className="section-title" style={{ color:C.green }}>Movimenti Oggi</div>
                  {reservations.filter(r => (r.checkIn===todayStr&&r.status==="reserved")||(r.checkOut===todayStr&&r.status==="checked-in")).length===0
                    && <div style={{ color:C.text3, fontSize:14 }}>Nessun movimento oggi</div>}
                  {reservations.filter(r => (r.checkIn===todayStr&&r.status==="reserved")||(r.checkOut===todayStr&&r.status==="checked-in")).map(r => {
                    const room = rooms.find(x=>x.id===r.roomId);
                    const isArr = r.checkIn===todayStr && r.status==="reserved";
                    return (
                      <div key={r.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:`1px solid ${C.border}` }}>
                        <div>
                          <div style={{ fontWeight:600 }}>{r.guestName}</div>
                          <div style={{ fontSize:12, color:C.text3 }}>Cam {r.roomId} · {room?.type}</div>
                        </div>
                        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                          <span style={{ fontSize:11, color:isArr?C.green:C.amber, fontWeight:600, background:isArr?C.greenL:C.amberL, padding:"2px 8px", borderRadius:20 }}>{isArr?"▲ ARRIVO":"▼ PARTENZA"}</span>
                          {isArr  && <button className="btn-primary" style={{ padding:"5px 12px", fontSize:11 }} onClick={() => doCheckIn(r)}>Check-In</button>}
                          {!isArr && <button className="btn-secondary" style={{ padding:"5px 12px", fontSize:11 }} onClick={() => doCheckOut(r)}>Check-Out</button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="card">
                  <div className="section-title">Mappa Camere</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {rooms.map(room => {
                      const ar = reservations.find(r=>r.roomId===room.id&&["checked-in","reserved"].includes(r.status));
                      const isOcc=ar?.status==="checked-in", isRes=ar?.status==="reserved";
                      return (
                        <div key={room.id} title={ar?ar.guestName:"Libera"} style={{
                          width:52, height:44, borderRadius:5, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                          background:isOcc?C.greenL:isRes?C.navyL:C.surface2,
                          border:`1.5px solid ${isOcc?C.greenLb:isRes?C.navyLb:C.border}`,
                        }}>
                          <div style={{ fontSize:12, fontWeight:700, color:isOcc?C.green:isRes?C.navy:C.text3 }}>{room.id}</div>
                          <div style={{ fontSize:6, color:C.text3, letterSpacing:.5, textTransform:"uppercase", marginTop:1 }}>{room.type.slice(0,5)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", gap:14, marginTop:12, fontSize:11, color:C.text3 }}>
                    {[[C.greenL,C.greenLb,C.green,"Occupata"],[C.navyL,C.navyLb,C.navy,"Prenotata"],[C.surface2,C.border,C.text3,"Libera"]].map(([bg,br,tc,l]) => (
                      <div key={l} style={{ display:"flex", alignItems:"center", gap:5 }}>
                        <div style={{ width:10, height:10, background:bg, border:`1.5px solid ${br}`, borderRadius:3 }} />
                        <span style={{ color:tc }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/*   PRENOTAZIONI   */}
        {page==="Prenotazioni" && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:22 }}>
              <div className="page-header"><div><h1>Prenotazioni</h1><div className="page-subtitle">Archivio prenotazioni · ricerca, modifica e nuove inserzioni</div></div></div>
              <button className="btn-primary" onClick={openNewReservation}>+ Nuova</button>
            </div>
            <AiBar pg="Prenotazioni" />
            <div style={{ display:"flex", gap:10, marginBottom:16 }}>
              <input className="input-field" placeholder="Cerca ospite o n°..." style={{ maxWidth:240 }} value={searchQ} onChange={e=>setSearchQ(e.target.value)} />
              <select className="input-field" style={{ maxWidth:160 }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="all">Tutti gli stati</option>
                {Object.entries(STATUS_CFG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:isMobile?"1fr":"110px 1fr 90px 190px 130px 110px", gap:10, fontSize:10, fontWeight:600, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>
                <div>N° Pren.</div><div>Ospite</div><div>Camera</div><div>Date</div><div>Importo</div><div>Stato</div>
              </div>
              {filteredRes.length===0 && <div style={{ padding:"32px", textAlign:"center", color:C.text3 }}>Nessuna prenotazione trovata</div>}
              {filteredRes.map(r => {
                const room=ROOMS.find(x=>x.id===r.roomId), sc=STATUS_CFG[r.status];
                return (
                  <div key={r.id} className="res-row" onClick={() => openEditReservation(r)}
                    style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"110px 1fr 90px 190px 130px 110px", gap:10, alignItems:"center" }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.gold }}>{r.id}</div>
                    <div>
                      <div style={{ fontWeight:600 }}>{r.guestName}</div>
                      <div style={{ fontSize:11, color:C.text3 }}>{(r.companions||[]).length>0?`+${r.companions.length} acc.`:""}{!r.guestId?" ⚠ no anagrafica":""}</div>
                    </div>
                    <div><div style={{ fontWeight:600 }}>Cam {r.roomId}</div><div style={{ fontSize:11, color:C.text3 }}>{room?.type}</div></div>
                    <div style={{ fontSize:13 }}>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}<div style={{ fontSize:11, color:C.text3 }}>{nights(r.checkIn,r.checkOut)}n</div></div>
                    <div><div style={{ fontWeight:700, color:C.gold }}>€{calcTotal(r).toFixed(2)}</div>{calcPaid(r)>0&&<div style={{ fontSize:11, color:C.green }}>Pag €{calcPaid(r).toFixed(2)}</div>}</div>
                    <span className="badge" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}` }}>{sc.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/*   ANAGRAFICA   */}
        {page==="Anagrafica" && (
          <div>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:22 }}>
              <div className="page-header"><div><h1>Anagrafica</h1><div className="page-subtitle">Clienti individuali e aziende · {guests.filter(g=>g.tipo!=="azienda").length} persone · {guests.filter(g=>g.tipo==="azienda").length} aziende</div></div></div>
              <div style={{ display:"flex", gap:8 }}>
                {anagraficaTab==="individuali"
                  ? <button className="btn-primary" onClick={() => openNewGuest()}>+ Nuovo Ospite</button>
                  : <button className="btn-primary" onClick={() => openNewAzienda()}>+ Nuova Azienda</button>}
              </div>
            </div>

            {/* Tab switcher */}
            <div style={{ display:"flex", gap:0, marginBottom:20, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", width:"fit-content" }}>
              {[["individuali","👤 Clienti Individuali"], ["aziende","🏢 Clienti Aziende"]].map(([tab,label]) => (
                <button key={tab} onClick={() => { setAnagraficaTab(tab); setGuestSearch(""); }}
                  style={{ padding:"9px 22px", border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
                    background: anagraficaTab===tab ? C.gold : C.surface,
                    color: anagraficaTab===tab ? "#fff" : C.text2,
                    borderRight: tab==="individuali" ? `1px solid ${C.border}` : "none",
                    transition:"all .15s" }}>
                  {label}
                  <span style={{ marginLeft:8, background: anagraficaTab===tab?"rgba(255,255,255,.25)":C.surface2, color: anagraficaTab===tab?"#fff":C.text3, borderRadius:10, padding:"1px 7px", fontSize:11 }}>
                    {tab==="individuali" ? guests.filter(g=>g.tipo!=="azienda").length : guests.filter(g=>g.tipo==="azienda").length}
                  </span>
                </button>
              ))}
            </div>

            {/* Barra ricerca */}
            <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center" }}>
              <input className="input-field" style={{ maxWidth:340 }}
                placeholder={anagraficaTab==="individuali" ? "Cerca per nome, documento, email..." : "Cerca per ragione sociale, P.IVA, referente..."}
                value={guestSearch} onChange={e=>setGuestSearch(e.target.value)} />
              <span style={{ fontSize:12, color:C.text3, fontWeight:500 }}>
                {anagraficaTab==="individuali" ? filteredGuests.length : filteredAziende.length} risultati
              </span>
            </div>

            {/* ─── TAB: INDIVIDUALI ─── */}
            {anagraficaTab==="individuali" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(370px,1fr))", gap:14 }}>
                {filteredGuests.map(g => {
                  const gRes=reservations.filter(r=>r.guestId===g.id||(r.companions||[]).includes(g.id));
                  const last=gRes.sort((a,b)=>new Date(b.checkIn)-new Date(a.checkIn))[0];
                  const naz=NAZIONALITA.find(n=>n.code===g.nazionalita);
                  const docExp=g.scadenzaDoc?new Date(g.scadenzaDoc)<new Date():false;
                  return (
                    <div key={g.id} className="guest-card">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg,${C.navy},${C.gold})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:700, flexShrink:0 }}>
                              {(g.cognome||"?")[0]}{(g.nome||"")[0]}
                            </div>
                            <div>
                              <div style={{ fontSize:16, fontWeight:700 }}>{g.cognome} {g.nome}</div>
                              <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{g.id} · {naz?.name}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className="btn-secondary" style={{ padding:"4px 10px", fontSize:11 }} onClick={() => openEditGuest(g)}>Modifica</button>
                          <button className="btn-danger"    style={{ padding:"4px 10px", fontSize:11 }} onClick={() => deleteGuest(g.id)}>✕</button>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, fontSize:12, color:C.text2 }}>
                        <div>📅 {fmtDate(g.dataNascita)}</div>
                        <div>📍 {g.luogoNascita} ({g.provinciaNascita})</div>
                        <div style={{ color:docExp?C.red:C.text2 }}>🪪 {g.tipoDoc}</div>
                        <div style={{ fontWeight:docExp?700:400, color:docExp?C.red:C.text2 }}>{g.numDoc}{docExp?" ⚠ SCADUTO":""}</div>
                        {g.email    && <div>📧 {g.email}</div>}
                        {g.telefono && <div>📞 {g.telefono}</div>}
                      </div>
                      {last && (
                        <div style={{ marginTop:10, padding:"7px 10px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, color:C.text3 }}>
                          Ultimo sogg: {last.id} · Cam {last.roomId} · {fmtDate(last.checkIn)} &nbsp;
                          <span className="badge" style={{ background:STATUS_CFG[last.status].bg, color:STATUS_CFG[last.status].text, border:`1px solid ${STATUS_CFG[last.status].border}`, fontSize:9 }}>{STATUS_CFG[last.status].label}</span>
                        </div>
                      )}
                      <div style={{ marginTop:8, fontSize:11, color:C.text3 }}>{gRes.length} soggiorni registrati</div>
                    </div>
                  );
                })}
                {filteredGuests.length===0 && <div style={{ color:C.text3, padding:40, textAlign:"center", gridColumn:"1/-1" }}>Nessun ospite trovato</div>}
              </div>
            )}

            {/* ─── TAB: AZIENDE ─── */}
            {anagraficaTab==="aziende" && (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(400px,1fr))", gap:14 }}>
                {filteredAziende.map(az => {
                  const azRes = reservations.filter(r => r.guestId===az.id);
                  const last  = azRes.sort((a,b)=>new Date(b.checkIn)-new Date(a.checkIn))[0];
                  return (
                    <div key={az.id} className="guest-card">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ width:38, height:38, borderRadius:8, background:`linear-gradient(135deg,${C.navy},#1565c0)`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, flexShrink:0 }}>🏢</div>
                          <div>
                            <div style={{ fontSize:16, fontWeight:700 }}>{az.ragioneSociale}</div>
                            <div style={{ fontSize:11, color:C.text3, marginTop:1 }}>{az.id} · P.IVA {az.piva||"—"}</div>
                          </div>
                        </div>
                        <div style={{ display:"flex", gap:6 }}>
                          <button className="btn-secondary" style={{ padding:"4px 10px", fontSize:11 }} onClick={() => openEditGuest(az)}>Modifica</button>
                          <button className="btn-danger"    style={{ padding:"4px 10px", fontSize:11 }} onClick={() => deleteGuest(az.id)}>✕</button>
                        </div>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, fontSize:12, color:C.text2 }}>
                        {az.settore    && <div>🏭 {az.settore}</div>}
                        {az.referente  && <div>👤 {az.referente}{az.ruoloReferente ? ` · ${az.ruoloReferente}` : ""}</div>}
                        {az.pec        && <div style={{ gridColumn:"1/-1" }}>📧 PEC: {az.pec}</div>}
                        {az.sdi        && <div>📋 SDI: {az.sdi}</div>}
                        {az.telefono   && <div>📞 {az.telefono}</div>}
                        {az.citta      && <div style={{ gridColumn:"1/-1" }}>📍 {az.indirizzo ? az.indirizzo+", " : ""}{az.citta} {az.cap} ({az.provincia})</div>}
                      </div>
                      {last && (
                        <div style={{ marginTop:10, padding:"7px 10px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:6, fontSize:11, color:C.text3 }}>
                          Ultima pren: {last.id} · Cam {last.roomId} · {fmtDate(last.checkIn)} &nbsp;
                          <span className="badge" style={{ background:STATUS_CFG[last.status].bg, color:STATUS_CFG[last.status].text, border:`1px solid ${STATUS_CFG[last.status].border}`, fontSize:9 }}>{STATUS_CFG[last.status].label}</span>
                        </div>
                      )}
                      <div style={{ marginTop:8, fontSize:11, color:C.text3 }}>{azRes.length} prenotazioni registrate</div>
                    </div>
                  );
                })}
                {filteredAziende.length===0 && <div style={{ color:C.text3, padding:40, textAlign:"center", gridColumn:"1/-1" }}>Nessuna azienda trovata. Clicca "+ Nuova Azienda" per aggiungerne una.</div>}
              </div>
            )}
          </div>
        )}

        {/*   CHECK-IN/OUT   */}
        {page==="Check-In/Out" && (() => {
          const todayStr = new Date().toISOString().slice(0,10);
          const arrivi   = reservations.filter(r => r.status==="reserved");
          const inCasa   = reservations.filter(r => r.status==="checked-in");
          const partenze = inCasa.filter(r => r.checkOut === todayStr);
          const inCasaAltri = inCasa.filter(r => r.checkOut !== todayStr);

          // ordina per check-out più vicino
          const sortByCheckout = arr => [...arr].sort((a,b) => a.checkOut.localeCompare(b.checkOut));

          return (
            <div>
              <div className="page-header"><div><h1>Check-In / Check-Out</h1><div className="page-subtitle">Gestione arrivi, partenze e ospiti in casa</div></div></div>
              <AiBar pg="Check-In/Out" />

              {/* KPI strip */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":isTablet?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                {[
                  { l:"Arrivi in Attesa",    v:arrivi.length,   c:C.green,  icon:"▲" },
                  { l:"Ospiti in Casa",       v:inCasa.length,   c:C.navy,   icon:"🏨" },
                  { l:"Partenze Oggi",        v:partenze.length, c:C.amber,  icon:"▼" },
                  { l:"Coperti Totali",       v:inCasa.reduce((s,r)=>s+(r.guests||0),0), c:C.gold, icon:"👥" },
                ].map(s => (
                  <div key={s.l} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:"14px 18px", borderLeft:`3px solid ${s.c}` }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{s.icon} {s.l}</div>
                    <div style={{ fontSize:32, fontWeight:700, color:s.c, fontFamily:"IBM Plex Sans,sans-serif" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Griglia 3 colonne */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":isTablet?"1fr 1fr":"1fr 2fr 1fr", gap:16 }}>

                {/*   COLONNA 1: Arrivi   */}
                <div className="card" style={{ padding:0, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", background:C.greenL, borderBottom:`2px solid ${C.greenLb}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.green, letterSpacing:1, textTransform:"uppercase" }}>▲ Arrivi in Attesa</div>
                    <span style={{ background:C.green, color:"#fff", borderRadius:12, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{arrivi.length}</span>
                  </div>
                  {arrivi.length === 0 && <div style={{ padding:"24px 16px", color:C.text3, fontSize:13, textAlign:"center" }}>Nessun arrivo in attesa</div>}
                  <div style={{ maxHeight:640, overflowY:"auto" }}>
                    {arrivi.map(r => {
                      const room = ROOMS.find(x=>x.id===r.roomId);
                      const g    = getGuest(r.guestId);
                      const isToday = r.checkIn === todayStr;
                      return (
                        <div key={r.id} style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, background: isToday ? C.greenL : "transparent" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:14 }}>{r.guestName}</div>
                              <div style={{ fontSize:11, color:C.text3 }}>Cam {r.roomId} · {room?.type}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              {isToday && <span style={{ fontSize:10, fontWeight:700, background:C.green, color:"#fff", padding:"1px 6px", borderRadius:10 }}>OGGI</span>}
                              <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>{r.guests} osp.</div>
                            </div>
                          </div>
                          <div style={{ fontSize:11, color:C.text2, marginBottom:8 }}>
                            {fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} · {nights(r.checkIn,r.checkOut)} notti
                          </div>
                          {!g && <div style={{ fontSize:10, color:C.amber, marginBottom:6 }}>⚠ Non in anagrafica</div>}
                          <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                            <button className="btn-primary" style={{ fontSize:11, padding:"5px 10px" }} onClick={()=>doCheckIn(r)}>Check-In</button>
                            <button className="btn-secondary" style={{ fontSize:11, padding:"5px 10px" }} onClick={()=>openEditReservation(r)}>Dettagli</button>
                            {!r.psInviato && <button className="btn-blue" style={{ fontSize:11, padding:"5px 10px" }} onClick={()=>{setReservations(p=>p.map(x=>x.id===r.id?{...x,psInviato:true}:x));showToast("PS segnata");}}>PS ✓</button>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/*   COLONNA 2: Ospiti in Casa   */}
                <div className="card" style={{ padding:0, overflow:"hidden" }}>
                  <div style={{ padding:"12px 16px", background:C.navyL, borderBottom:`2px solid ${C.navyLb}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:C.navy, letterSpacing:1, textTransform:"uppercase" }}>🏨 Ospiti in Casa</div>
                    <span style={{ background:C.navy, color:"#fff", borderRadius:12, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{inCasa.length}</span>
                  </div>
                  {inCasa.length === 0 && <div style={{ padding:"24px 16px", color:C.text3, fontSize:13, textAlign:"center" }}>Nessun ospite in casa</div>}

                  {/* Sub-header partenze oggi se ce ne sono */}
                  {partenze.length > 0 && (
                    <>
                      <div style={{ padding:"6px 16px", background:C.amberL, borderBottom:`1px solid ${C.amberLb}`, fontSize:10, fontWeight:700, color:C.amber, letterSpacing:1, textTransform:"uppercase" }}>
                        ▼ Partenze di Oggi ({partenze.length})
                      </div>
                      {sortByCheckout(partenze).map(r => {
                        const room  = ROOMS.find(x=>x.id===r.roomId);
                        const total = calcTotal(r), paid = calcPaid(r), bal = total*(1+TAX_RATE) - paid;
                        const g     = getGuest(r.guestId);
                        const checkInTime = r.checkInTime ? new Date(r.checkInTime).toLocaleDateString("it-IT") : null;
                        const notti = nights(r.checkIn, r.checkOut);
                        return (
                          <div key={r.id} style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, background:C.amberL }}>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, marginBottom:6 }}>
                              <div>
                                <div style={{ fontWeight:700, fontSize:15 }}>{r.guestName}</div>
                                <div style={{ fontSize:11, color:C.text3 }}>{r.id} · Cam {r.roomId} · {room?.type}</div>
                                {g && <div style={{ fontSize:11, color:C.text3 }}>🪪 {g.tipoDoc} {g.numDoc}</div>}
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontWeight:700, fontSize:17, color:C.gold }}>€{(total*(1+TAX_RATE)).toFixed(2)}</div>
                                {bal > 0.01 && <div style={{ fontSize:11, color:C.red, fontWeight:700 }}>Da: €{bal.toFixed(2)}</div>}
                                {bal <= 0.01 && paid > 0 && <div style={{ fontSize:11, color:C.green, fontWeight:700 }}>✓ Saldato</div>}
                              </div>
                            </div>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:6, fontSize:11, color:C.text3, marginBottom:8 }}>
                              <span>📅 {fmtDate(r.checkIn)} → {fmtDate(r.checkOut)}</span>
                              <span>· {notti} notti</span>
                              <span>· {r.guests} ospiti ({r.adulti||r.guests}A {r.bambini||0}B)</span>
                              {checkInTime && <span>· CI: {checkInTime}</span>}
                            </div>
                            {(r.services||[]).length > 0 && (
                              <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
                                {(r.services||[]).map(sid => { const s=SERVICES.find(x=>x.id===sid); return s?<span key={sid} className="service-chip">{s.label}</span>:null; })}
                              </div>
                            )}
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <button className="btn-primary" style={{ fontSize:11, padding:"5px 10px" }} onClick={()=>doCheckOut(r)}>Check-Out</button>
                              <button className="btn-secondary" style={{ fontSize:11, padding:"5px 10px" }} onClick={()=>openInvoice(r)}>Conto</button>
                              <button className="btn-secondary" style={{ fontSize:11, padding:"5px 10px" }} onClick={()=>openEditReservation(r)}>Dettagli</button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {/* Tutti gli altri ospiti in casa */}
                  {inCasaAltri.length > 0 && (
                    <>
                      <div style={{ padding:"6px 16px", background:C.navyL, borderBottom:`1px solid ${C.navyLb}`, fontSize:10, fontWeight:700, color:C.navy, letterSpacing:1, textTransform:"uppercase" }}>
                        Soggiorno in Corso ({inCasaAltri.length})
                      </div>
                      <div style={{ maxHeight:500, overflowY:"auto" }}>
                        {sortByCheckout(inCasaAltri).map(r => {
                          const room  = ROOMS.find(x=>x.id===r.roomId);
                          const total = calcTotal(r), paid = calcPaid(r), bal = total*(1+TAX_RATE) - paid;
                          const g     = getGuest(r.guestId);
                          const notti = nights(r.checkIn, r.checkOut);
                          const rimanenti = Math.max(0, Math.ceil((new Date(r.checkOut) - new Date()) / 86400000));
                          return (
                            <div key={r.id} style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
                              <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, marginBottom:5 }}>
                                <div>
                                  <div style={{ fontWeight:700, fontSize:14 }}>{r.guestName}</div>
                                  <div style={{ fontSize:11, color:C.text3 }}>{r.id} · Cam {r.roomId} · {room?.type}</div>
                                  {g && <div style={{ fontSize:11, color:C.text3 }}>🪪 {g.tipoDoc} {g.numDoc}</div>}
                                </div>
                                <div style={{ textAlign:"right" }}>
                                  <span style={{ fontSize:10, fontWeight:700, background: rimanenti<=1?C.amberL:C.navyL, color:rimanenti<=1?C.amber:C.navy, padding:"2px 7px", borderRadius:10, border:`1px solid ${rimanenti<=1?C.amberLb:C.navyLb}` }}>
                                    {rimanenti === 0 ? "OGGI" : rimanenti === 1 ? "domani" : `${rimanenti} gg`}
                                  </span>
                                  <div style={{ fontWeight:700, fontSize:14, color:C.gold, marginTop:3 }}>€{(total*(1+TAX_RATE)).toFixed(2)}</div>
                                  {bal > 0.01 && <div style={{ fontSize:10, color:C.red, fontWeight:700 }}>Da: €{bal.toFixed(2)}</div>}
                                </div>
                              </div>
                              <div style={{ fontSize:11, color:C.text3, marginBottom:7 }}>
                                {fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} · {notti} notti · {r.guests} ospiti ({r.adulti||r.guests}A {r.bambini||0}B)
                              </div>
                              {(r.services||[]).length > 0 && (
                                <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:7 }}>
                                  {(r.services||[]).map(sid => { const s=SERVICES.find(x=>x.id===sid); return s?<span key={sid} className="service-chip">{s.label}</span>:null; })}
                                </div>
                              )}
                              {(r.roomServiceItems||[]).length > 0 && (
                                <div style={{ fontSize:10, color:C.text3, marginBottom:7 }}>
                                  🍽 {r.roomServiceItems.length} extra ristorante
                                </div>
                              )}
                              <div style={{ display:"flex", gap:5 }}>
                                <button className="btn-secondary" style={{ fontSize:11, padding:"4px 9px" }} onClick={()=>openInvoice(r)}>Conto</button>
                                <button className="btn-secondary" style={{ fontSize:11, padding:"4px 9px" }} onClick={()=>openEditReservation(r)}>Dettagli</button>
                                <button className="btn-blue" style={{ fontSize:11, padding:"4px 9px" }} onClick={()=>doCheckOut(r)}>Check-Out</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/*   COLONNA 3: Riepilogo rapido   */}
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {/* Ripartizione piani */}
                  <div className="card">
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Occupazione per Piano</div>
                    {[1,2,3,4,5,6].map(floor => {
                      const floorRooms  = ROOMS.filter(r=>r.floor===floor);
                      const floorOcc    = floorRooms.filter(fr => inCasa.some(r=>r.roomId===fr.id)).length;
                      const pct         = floorRooms.length > 0 ? Math.round((floorOcc/floorRooms.length)*100) : 0;
                      return (
                        <div key={floor} style={{ marginBottom:8 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                            <span style={{ color:C.text2, fontWeight:600 }}>Piano {floor}</span>
                            <span style={{ color:pct>=80?C.green:pct>=50?C.amber:C.text3, fontWeight:700 }}>{floorOcc}/{floorRooms.length}</span>
                          </div>
                          <div style={{ height:5, background:C.border, borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:5, width:`${pct}%`, background:pct>=80?C.green:pct>=50?C.amber:C.navy, borderRadius:3, transition:"width .4s" }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Notti medie */}
                  <div className="card">
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Quick Stats</div>
                    {[
                      { l:"Notti medie soggiorno", v: inCasa.length>0 ? (inCasa.reduce((s,r)=>s+nights(r.checkIn,r.checkOut),0)/inCasa.length).toFixed(1)+"n" : "—", c:C.navy },
                      { l:"Saldi aperti",           v: inCasa.filter(r=>(calcTotal(r)*(1+TAX_RATE)-calcPaid(r))>0.01).length, c:C.red },
                      { l:"Servizi aggiuntivi",     v: inCasa.filter(r=>(r.services||[]).length>0).length+" cam", c:C.gold },
                      { l:"Con extra ristorante",   v: inCasa.filter(r=>(r.roomServiceItems||[]).length>0).length+" cam", c:C.amber },
                    ].map(s=>(
                      <div key={s.l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                        <span style={{ color:C.text2 }}>{s.l}</span>
                        <span style={{ fontWeight:700, color:s.c }}>{s.v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Prossime partenze */}
                  <div className="card">
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Prossime Partenze</div>
                    {sortByCheckout(inCasa).slice(0,5).map(r => (
                      <div key={r.id} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.border}`, fontSize:12 }}>
                        <span style={{ color:C.text, fontWeight:600 }}>{r.guestName}</span>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:11, fontWeight:700, color: r.checkOut===todayStr?C.amber:C.navy }}>{fmtDate(r.checkOut)}</div>
                          <div style={{ fontSize:10, color:C.text3 }}>Cam {r.roomId}</div>
                        </div>
                      </div>
                    ))}
                    {inCasa.length === 0 && <div style={{ color:C.text3, fontSize:12 }}>—</div>}
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/*   DISPONIBILITÀ   */}
        {page==="Disponibilità" && (() => {
          const COL = 42;
          const daysCount = 35;
          const today0 = new Date(); today0.setHours(0,0,0,0);
          const viewStart = new Date(today0); viewStart.setDate(viewStart.getDate() + dispOffset*7);
          const days = Array.from({length:daysCount}, (_,i) => { const d=new Date(viewStart); d.setDate(d.getDate()+i); return d; });
          const ds = (d) => typeof d==="string" ? d : d.toISOString().slice(0,10);
          const WD = ["Do","Lu","Ma","Me","Gi","Ve","Sa"];
          const MN = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
          const roomTypes = [...new Set(ROOMS.map(r=>r.type))];

          // Colori per tipo (sfondo chiaro)
          const TC = {
            "Standard":             { bar:"#3b82f6", barL:"#dbeafe", text:C.navy   },
            "Standard Accessibile": { bar:"#0ea5e9", barL:"#e0f2fe", text:"#0369a1" },
            "Superior":             { bar:"#8b5cf6", barL:"#ede9fe", text:"#5b21b6" },
            "Deluxe":               { bar:"#d97706", barL:"#fef3c7", text:"#92400e" },
            "Junior Suite":         { bar:"#0d9488", barL:"#ccfbf1", text:"#065f46" },
            "Suite":                { bar:"#059669", barL:"#d1fae5", text:"#065f46" },
            "Suite Vista Laguna":   { bar:"#0891b2", barL:"#cffafe", text:"#164e63" },
            "Suite Presidenziale":  { bar:"#dc2626", barL:"#fee2e2", text:"#991b1b" },
            "Penthouse":            { bar:"#9333ea", barL:"#f3e8ff", text:"#581c87" },
          };
          const tc = (type) => TC[type]||TC["Standard"];

          // mesi header
          const mHeaders=[];
          let cm=-1, cs=0;
          days.forEach((d,i) => { if(d.getMonth()!==cm){if(cm!==-1)mHeaders.push({m:cm,y:d.getFullYear(),from:cs,to:i-1}); cm=d.getMonth(); cs=i;} });
          mHeaders.push({m:cm, y:days[days.length-1].getFullYear(), from:cs, to:days.length-1});

          // Cell data (griglia)
          const getCellData = (type, day) => {
            const dss=ds(day), rooms=ROOMS.filter(r=>r.type===type);
            let occ=0, res=0; const arr=[];
            rooms.forEach(room => {
              const ar=reservations.find(r=>r.roomId===room.id&&!["checked-out","cancelled"].includes(r.status)&&r.checkIn<=dss&&r.checkOut>dss);
              if(ar){ if(ar.status==="checked-in"){occ++; arr.push({...ar,room});} else{res++; arr.push({...ar,room});} }
            });
            return { total:rooms.length, occ, res, free:rooms.length-occ-res, arr };
          };

          // Selezione timeline
          const tlRoom  = typeof dispSelType==="number" ? dispSelType : null;
          const tlA     = dispSelStart;
          const tlB     = dispSelEnd;
          const inSel   = (roomId, day) => tlRoom===roomId && tlA && tlB &&
            day >= (tlA<=tlB?tlA:tlB) && day <= (tlA<=tlB?tlB:tlA);

          const handleTlClick = (room, day) => {
            const dss=ds(day);
            const busy=reservations.find(r=>r.roomId===room.id&&!["checked-out","cancelled"].includes(r.status)&&r.checkIn<=dss&&r.checkOut>dss);
            if(busy){ openEditReservation(busy); return; }
            if(!tlA || tlRoom!==room.id){ setDispSelType(room.id); setDispSelStart(day); setDispSelEnd(day); }
            else {
              const d1=day>=tlA?tlA:day, d2=day>=tlA?day:tlA;
              openNewReservation({ roomId:room.id, checkIn:ds(d1), checkOut:ds(new Date(d2.getTime()+86400000)) });
              setDispSelStart(null); setDispSelEnd(null); setDispSelType(null);
            }
          };

          // Header giorni condiviso
          const DayHeader = () => (
            <>
              <div style={{ display:"flex", marginLeft: dispMode==="timeline"?150:170 }}>
                {mHeaders.map((m,i) => (
                  <div key={i} style={{ width:`${COL*(m.to-m.from+1)}px`, fontSize:10, fontWeight:700, color:C.gold, padding:"4px 0", borderLeft:`1px solid ${C.border}`, textAlign:"center", background:C.surface2, letterSpacing:2, textTransform:"uppercase" }}>
                    {MN[m.m]} {m.y}
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", background:C.surface, borderBottom:`2px solid ${C.border2}`, position:"sticky", top:56, zIndex:10 }}>
                <div style={{ width: dispMode==="timeline"?150:170, flexShrink:0, padding:"8px 12px", fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", borderRight:`1px solid ${C.border}` }}>
                  {dispMode==="timeline" ? "Camera" : "Tipologia"}
                </div>
                {days.map((d,i) => {
                  const isT=ds(d)===ds(today0), isW=d.getDay()===0||d.getDay()===6;
                  return (
                    <div key={i} style={{ width:COL, flexShrink:0, textAlign:"center", padding:"4px 0",
                      background:isT?"#e8f5e9":isW?"#fafafa":"transparent",
                      borderLeft:`1px solid ${isT?C.greenLb:C.border}` }}>
                      <div style={{ fontSize:10, fontWeight:600, color:isT?C.green:isW?C.purple:C.text3 }}>{WD[d.getDay()]}</div>
                      <div style={{ fontSize:14, fontWeight:isT?700:400, color:isT?C.green:isW?"#6d28d9":C.text }}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </>
          );

          return (
            <div>
              {/* Toolbar */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
                <div>
                  
                  <h1>Disponibilità Camere</h1>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <button className="btn-secondary" onClick={() => { setDispMode(m=>m==="grid"?"timeline":"grid"); setDispSelStart(null); setDispSelEnd(null); setDispSelType(null); }}>
                    {dispMode==="grid" ? "↕ Vista Timeline" : "⊞ Vista Griglia"}
                  </button>
                  <button className="btn-secondary" onClick={() => { setDispOffset(0); setDispSelStart(null); setDispSelEnd(null); setDispSelType(null); }}>Oggi</button>
                  <button className="btn-secondary" style={{ padding:"8px 12px" }} onClick={() => setDispOffset(o=>o-1)}>‹</button>
                  <span style={{ minWidth:110, textAlign:"center", fontSize:13, fontWeight:600, color:C.gold }}>{MN[viewStart.getMonth()]} {viewStart.getFullYear()}</span>
                  <button className="btn-secondary" style={{ padding:"8px 12px" }} onClick={() => setDispOffset(o=>o+1)}>›</button>
                  <button className="btn-primary" onClick={openNewReservation}>+ Prenotazione</button>
                </div>
              </div>

              {/* Legenda */}
              <div style={{ display:"flex", gap:16, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
                {[[C.greenL,C.greenLb,C.green,"Occupata"],[C.navyL,C.navyLb,C.navy,"Prenotata"],[C.surface2,C.border,C.text3,"Libera"],[C.redL,C.redLb,C.red,"Bloccata"]].map(([bg,br,tc2,l]) => (
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                    <div style={{ width:13, height:13, background:bg, border:`1.5px solid ${br}`, borderRadius:3 }} />
                    <span style={{ color:tc2, fontWeight:500 }}>{l}</span>
                  </div>
                ))}
                {dispMode==="timeline" && (
                  <span style={{ marginLeft:"auto", fontSize:11, color: tlA ? C.gold : C.text3, fontWeight: tlA ? 600 : 400 }}>
                    {tlA ? `Camera ${tlRoom} selezionata — clicca la data di fine per prenotare` : "Clicca su una cella libera per iniziare la selezione"}
                  </span>
                )}
                {tlA && (
                  <button className="btn-secondary" style={{ padding:"4px 10px", fontSize:11 }} onClick={() => { setDispSelStart(null); setDispSelEnd(null); setDispSelType(null); }}>✕ Annulla selezione</button>
                )}
              </div>

              <div style={{ overflowX:"auto", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,.06)" }}>
                <div style={{ minWidth:`${(dispMode==="timeline"?150:170)+COL*daysCount}px` }}>

                  <DayHeader />

                  {/*   GRIGLIA (per tipo)   */}
                  {dispMode==="grid" && roomTypes.map(type => {
                    const t=tc(type), rooms=ROOMS.filter(r=>r.type===type);
                    return (
                      <div key={type} style={{ borderTop:`2px solid ${C.border}` }}>
                        <div style={{ display:"flex" }}>
                          <div style={{ width:170, flexShrink:0, padding:"10px 14px", background:C.surface, borderRight:`1px solid ${C.border}`, position:"sticky", left:0, zIndex:4 }}>
                            <div style={{ fontSize:13, fontWeight:700, color:t.bar, marginBottom:2 }}>{type}</div>
                            <div style={{ fontSize:10, color:C.text3 }}>{rooms.length} camere · €{Math.min(...rooms.map(r=>r.price))}–{Math.max(...rooms.map(r=>r.price))}/n</div>
                          </div>
                          {days.map((d,i) => {
                            const cell=getCellData(type,d), dss=ds(d);
                            const isT=dss===ds(today0), isW=d.getDay()===0||d.getDay()===6;
                            const pct=cell.total>0?Math.round(((cell.occ+cell.res)/cell.total)*100):0;
                            let bg=isW?C.surface2:C.surface;
                            if(cell.free===0&&cell.occ>0) bg=C.greenL;
                            else if(cell.free===0&&cell.res>0) bg=C.navyL;
                            return (
                              <div key={i} onMouseEnter={() => setDispHover({type,d,cell})} onMouseLeave={() => setDispHover(null)}
                                style={{ width:COL, flexShrink:0, height:56, background:isT?"#f0fdf4":bg,
                                  borderLeft:`1px solid ${isT?C.greenLb:C.border}`, borderBottom:`1px solid ${C.border}`,
                                  position:"relative", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                                {/* barra occupazione */}
                                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:`${pct}%`, background:cell.occ>0?`${C.greenLb}60`:`${C.navyLb}40`, transition:"height .3s" }} />
                                <div style={{ fontSize:18, fontWeight:700, color:cell.free>0?t.bar:cell.occ>0?C.green:C.navy, position:"relative" }}>{cell.free}</div>
                                <div style={{ fontSize:9, color:C.text3, position:"relative" }}>/{cell.total}</div>
                                {isW && <div style={{ position:"absolute", top:2, right:2, fontSize:7, color:C.gold, fontWeight:700 }}>W</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/*   TIMELINE (per camera)   */}
                  {dispMode==="timeline" && (() => {
                    const tlSelMin = tlA && tlB ? (tlA<=tlB?tlA:tlB) : null;
                    const tlSelMax = tlA && tlB ? (tlA<=tlB?tlB:tlA) : null;
                    return roomTypes.map(type => {
                      const t=tc(type), rooms=ROOMS.filter(r=>r.type===type);
                      return (
                        <div key={type}>
                          {/* Separatore tipo */}
                          <div style={{ display:"flex", background:C.surface2, borderTop:`2px solid ${C.border2}` }}>
                            <div style={{ width:150, flexShrink:0, padding:"6px 12px", position:"sticky", left:0, zIndex:4, background:C.surface2, borderRight:`1px solid ${C.border}` }}>
                              <div style={{ fontSize:11, fontWeight:700, color:t.bar, letterSpacing:1, textTransform:"uppercase" }}>{type}</div>
                            </div>
                            <div style={{ flex:1 }} />
                          </div>
                          {rooms.map(room => (
                            <div key={room.id} style={{ display:"flex", borderTop:`1px solid ${C.border}` }}>
                              {/* Label camera */}
                              <div style={{ width:150, flexShrink:0, padding:"7px 12px",
                                background:tlRoom===room.id?"#fffbeb":C.surface,
                                borderRight:`1px solid ${tlRoom===room.id?C.gold:C.border}`,
                                position:"sticky", left:0, zIndex:3, transition:"all .15s" }}>
                                <div style={{ fontSize:13, fontWeight:600, color:tlRoom===room.id?C.gold:C.text }}>Cam {room.id}</div>
                                <div style={{ fontSize:10, color:C.text3 }}>€{room.price}/n · {room.capacity}p</div>
                                {tlRoom===room.id && <div style={{ fontSize:9, color:C.gold, fontWeight:700, letterSpacing:1, marginTop:1 }}>SELEZIONE...</div>}
                              </div>
                              {/* Celle giorno */}
                              {days.map((d,i) => {
                                const dss=ds(d), isT=dss===ds(today0), isW=d.getDay()===0||d.getDay()===6;
                                const ar=reservations.find(r=>r.roomId===room.id&&!["checked-out","cancelled"].includes(r.status)&&r.checkIn<=dss&&r.checkOut>dss);
                                const isCi=ar?.checkIn===dss, isCo=ar?.checkOut===dss;
                                const sel=inSel(room.id,d), isBusy=!!ar;
                                const isSelS = tlRoom===room.id && tlSelMin && ds(d)===ds(tlSelMin);
                                const isSelE = tlRoom===room.id && tlSelMax && ds(d)===ds(tlSelMax);
                                let bg=isT?"#f0fdf4":isW?C.surface2:C.surface;
                                if(sel&&!isBusy) bg="#fffbeb";
                                let barBg="transparent", barBorder="none";
                                if(ar?.status==="checked-in"){ barBg=`${C.greenL}`; barBorder=`1px solid ${C.greenLb}`; }
                                else if(ar?.status==="reserved"){ barBg=t.barL; barBorder=`1px solid ${t.bar}50`; }
                                return (
                                  <div key={i}
                                    onClick={() => handleTlClick(room,d)}
                                    onMouseEnter={() => { if(tlA&&tlRoom===room.id) setDispSelEnd(d); setDispHover({room,d,ar}); }}
                                    onMouseLeave={() => setDispHover(null)}
                                    style={{ width:COL, flexShrink:0, height:40, background:bg,
                                      borderLeft:`1px solid ${isT?C.greenLb:sel?C.gold:C.border}`,
                                      position:"relative", overflow:"visible", cursor:isBusy?"pointer":"crosshair",
                                      userSelect:"none" }}>
                                    {/* Barra prenotazione */}
                                    {ar && (
                                      <div style={{ position:"absolute", left:isCi?3:0, right:0, top:5, bottom:5,
                                        background:barBg, border:barBorder,
                                        borderRadius:isCi?"4px 0 0 4px":"0",
                                        display:"flex", alignItems:"center", paddingLeft:isCi?6:0,
                                        overflow:"hidden", zIndex:2 }}>
                                        {isCi && <span style={{ fontSize:11, fontWeight:700, color:ar.status==="checked-in"?C.green:t.bar, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{ar.guestName}</span>}
                                      </div>
                                    )}
                                    {/* Selezione evidenziata */}
                                    {sel && !isBusy && (
                                      <div style={{ position:"absolute", inset:0,
                                        background:"linear-gradient(90deg,rgba(160,114,10,.08),rgba(160,114,10,.18))",
                                        borderTop:`1px solid ${C.gold}50`, borderBottom:`1px solid ${C.gold}50`,
                                        borderLeft:isSelS?`2px solid ${C.gold}`:"none",
                                        borderRight:isSelE?`2px solid ${C.gold}`:"none",
                                        pointerEvents:"none", zIndex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                        {isSelS && <span style={{ fontSize:10, fontWeight:700, color:C.gold }}>IN</span>}
                                        {isSelE && !isSelS && <span style={{ fontSize:10, fontWeight:700, color:C.gold }}>OUT</span>}
                                      </div>
                                    )}
                                    {/* Check-out marker */}
                                    {isCo && <div style={{ position:"absolute", left:0, top:0, bottom:0, width:2, background:C.amber, zIndex:3 }} />}
                                    {/* + hover */}
                                    {!isBusy && !sel && (
                                      <div className="tl-plus" style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", opacity:0, transition:"opacity .15s", zIndex:1 }}>
                                        <div style={{ width:16, height:16, borderRadius:"50%", background:C.goldL, border:`1px solid ${C.gold}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:C.gold, fontWeight:700 }}>+</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      );
                    });
                  })()}

                  {/* Preview selezione in basso */}
                  {dispMode==="timeline" && tlA && tlB && tlRoom && (() => {
                    const d1=tlA<=tlB?tlA:tlB, d2=tlA<=tlB?tlB:tlA;
                    const n=nights(ds(d1), ds(new Date(d2.getTime()+86400000)));
                    const room=ROOMS.find(r=>r.id===tlRoom);
                    return (
                      <div style={{ padding:"10px 16px", background:C.goldL, borderTop:`1px solid ${C.goldLb}`, display:"flex", alignItems:"center", gap:16, fontSize:12, color:C.gold, fontWeight:600 }}>
                        <span>✦ Cam {tlRoom}</span>
                        <span>{d1.toLocaleDateString("it-IT",{day:"2-digit",month:"short"})} → {d2.toLocaleDateString("it-IT",{day:"2-digit",month:"short"})}</span>
                        <span style={{ color:C.text }}><b>{n}</b> {n===1?"notte":"notti"}</span>
                        <span>€{((room?.price||0)*n).toFixed(2)} stimati</span>
                        <span style={{ color:C.text2, fontSize:11 }}>Clicca la data di fine per confermare</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tooltip hover griglia */}
              {dispHover && dispMode==="grid" && dispHover.cell && (
                <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 20px", zIndex:100, fontSize:12, minWidth:280, boxShadow:"0 8px 30px rgba(0,0,0,.15)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                    <span style={{ fontWeight:700, color:tc(dispHover.type).bar }}>{dispHover.type}</span>
                    <span style={{ color:C.text2 }}>{dispHover.d.toLocaleDateString("it-IT",{weekday:"short",day:"2-digit",month:"long"})}</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:8 }}>
                    {[["Libere",dispHover.cell.free,C.text],["Occupate",dispHover.cell.occ,C.green],["Prenotate",dispHover.cell.res,C.navy],["Totali",dispHover.cell.total,C.text2]].map(([l,v,co]) => (
                      <div key={l} style={{ textAlign:"center" }}>
                        <div style={{ fontSize:22, fontWeight:700, color:co }}>{v}</div>
                        <div style={{ fontSize:10, color:C.text3, textTransform:"uppercase" }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {dispHover.cell.arr.length>0 && <div style={{ fontSize:11, color:C.text3, borderTop:`1px solid ${C.border}`, paddingTop:7 }}>
                    {dispHover.cell.arr.slice(0,3).map(r => <div key={r.id}>{r.room.id}: {r.guestName}</div>)}
                  </div>}
                </div>
              )}
            </div>
          );
        })()}

        {/*   CAMERE   */}
        {page==="Camere" && (
          <div>
            <div className="page-header"><div><h1>Gestione Camere</h1><div className="page-subtitle">Configurazione camere, tipologie e stato occupazione</div></div></div>
            <div className="room-grid">
              {ROOMS.map(room => {
                const ar=reservations.find(r=>r.roomId===room.id&&["checked-in","reserved"].includes(r.status));
                const isOcc=ar?.status==="checked-in", isRes=ar?.status==="reserved";
                const c=isOcc?C.green:isRes?C.navy:C.text3;
                return (
                  <div key={room.id} className="room-card" style={{ borderColor:isOcc?C.greenLb:isRes?C.navyLb:C.border }}>
                    <div style={{ fontSize:22, fontWeight:600, color:c, marginBottom:6, fontFamily:"IBM Plex Sans,sans-serif" }}>Camera {room.id}</div>
                    <div style={{ fontSize:12, color:C.text2, fontWeight:500 }}>{room.type} · Piano {room.floor}</div>
                    <div style={{ fontSize:11, color:C.text3, marginTop:3 }}>{room.capacity} ospiti · <b style={{ color:C.gold }}>€{room.price}</b>/notte</div>
                    <div style={{ marginTop:10, fontSize:11, textTransform:"uppercase", fontWeight:600, color:c }}>
                      {isOcc?`● ${ar.guestName}`:isRes?`● ${ar.guestName}`:"○ Disponibile"}
                    </div>
                    {ar && <div style={{ fontSize:10, color:C.text3, marginTop:2 }}>fino al {fmtDate(ar.checkOut)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {/*   PREZZI & REVENUE   */}
        {page==="Prezzi & Revenue" && (() => {
          const roomTypes = [...new Set(ROOMS.map(r => r.type))];

          // Calcola occupazione attuale per tipo/globale
          const today0 = new Date(); today0.setHours(0,0,0,0);
          const ds0 = today0.toISOString().slice(0,10);

          const getOccupancy = (typeFilter = null) => {
            const filtered = typeFilter ? rooms.filter(r => r.type === typeFilter) : rooms;
            const occ = filtered.filter(r =>
              reservations.some(res => res.roomId === r.id && res.status === "checked-in")
            ).length;
            return filtered.length > 0 ? Math.round((occ / filtered.length) * 100) : 0;
          };

          // Pick-up: prenotazioni negli ultimi N giorni
          const getPickup = (days = 7, typeFilter = null) => {
            const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
            return reservations.filter(r => {
              if (["cancelled","checked-out"].includes(r.status)) return false;
              if (typeFilter && rooms.find(rm => rm.id === r.roomId)?.type !== typeFilter) return false;
              const created = r.checkIn; // usiamo checkIn come proxy
              return new Date(created) >= cutoff;
            }).length;
          };

          // Calcola prezzo effettivo applicando le regole attive
          const computeEffectivePrice = (room) => {
            let price = room.price;
            const occ = getOccupancy(room.type);
            const pickup7 = getPickup(7, room.type);
            const pickup30 = getPickup(30, room.type);
            const activeRules = pricingRules.filter(rule => {
              if (!rule.enabled) return false;
              if (rule.roomTypes !== "all" && rule.roomTypes !== room.type) return false;
              const metric = rule.type === "occupancy" ? occ
                : rule.type === "pickup7" ? pickup7
                : pickup30;
              if (rule.operator === "gte") return metric >= rule.threshold;
              if (rule.operator === "lte") return metric <= rule.threshold;
              if (rule.operator === "between") return metric >= rule.threshold && metric <= rule.threshold2;
              return false;
            });
            activeRules.forEach(rule => {
              const delta = rule.adjustType === "pct"
                ? price * (rule.adjustment / 100)
                : rule.adjustment;
              price = rule.direction === "increase" ? price + delta : price - delta;
            });
            return Math.max(0, Math.round(price));
          };

          const globalOcc = getOccupancy();
          const pickup7d  = getPickup(7);
          const pickup30d = getPickup(30);

          // Tipi per mostrare prezzi aggregati
          const typeStats = roomTypes.map(type => {
            const typeRooms = rooms.filter(r => r.type === type);
            const baseMin = Math.min(...typeRooms.map(r => r.price));
            const baseMax = Math.max(...typeRooms.map(r => r.price));
            const effPrices = typeRooms.map(r => computeEffectivePrice(r));
            const effMin = Math.min(...effPrices);
            const effMax = Math.max(...effPrices);
            const occ = getOccupancy(type);
            const pu7 = getPickup(7, type);
            const activeRuleCount = pricingRules.filter(rule => rule.enabled && (rule.roomTypes === "all" || rule.roomTypes === type)).length;
            return { type, typeRooms, baseMin, baseMax, effMin, effMax, occ, pu7, activeRuleCount };
          });

          const RULE_TYPES = [
            { value:"occupancy", label:"Occupazione %" },
            { value:"pickup7",   label:"Pick-up 7 giorni" },
            { value:"pickup30",  label:"Pick-up 30 giorni" },
          ];

          const genRuleId = () => "RULE" + Date.now().toString().slice(-5);

          const saveRule = () => {
            if (!ruleForm.name) { showToast("Inserisci un nome per la regola","error"); return; }
            if (editRuleId) {
              const updated = {...ruleForm, id: editRuleId};
              setPricingRules(p => p.map(r => r.id === editRuleId ? updated : r));
              dbSavePricingRule(updated).catch(()=>{});
              showToast("Regola aggiornata");
            } else {
              const newRule = {...ruleForm, id: genRuleId()};
              setPricingRules(p => [...p, newRule]);
              dbSavePricingRule(newRule).catch(()=>{});
              showToast("Regola creata!");
            }
            setRuleForm({ name:"", type:"occupancy", threshold:80, operator:"gte", adjustment:10, adjustType:"pct", enabled:true, roomTypes:"all", direction:"increase" });
            setEditRuleId(null);
          };

          const deleteRule = (id) => {
            setPricingRules(p => p.filter(r => r.id !== id));
            dbDeletePricingRule(id).catch(()=>{});
            showToast("Regola eliminata");
          };
          const toggleRule = (id) => {
            setPricingRules(p => p.map(r => {
              if (r.id !== id) return r;
              const upd = {...r, enabled: !r.enabled};
              dbSavePricingRule(upd).catch(()=>{});
              return upd;
            }));
          };
          const editRule = (rule) => { setRuleForm({...rule}); setEditRuleId(rule.id); };

          const updateRoomPrice = (roomId, newPrice) => {
            setRooms(p => p.map(r => r.id === roomId ? {...r, price: parseFloat(newPrice)||r.price} : r));
            dbSaveCameraPrice(roomId, parseFloat(newPrice)).catch(()=>{});
          };

          const updateTypePrice = (type, newBase) => {
            const base = parseFloat(newBase); if (!base || base <= 0) return;
            const typeRms = ROOMS.filter(r => r.type === type);
            setRooms(p => p.map(r => {
              if (r.type !== type) return r;
              const orig = typeRms.find(x => x.id === r.id);
              const ratio = base / Math.min(...typeRms.map(x => x.price));
              return {...r, price: Math.round(r.price * ratio)};
            }));
            showToast(`Prezzi ${type} aggiornati`);
          };

          const applyPctToType = (type, pct) => {
            setRooms(p => p.map(r => r.type === type ? {...r, price: Math.round(r.price * (1 + pct/100))} : r));
            showToast(`${type}: prezzi ${pct > 0 ? "+" : ""}${pct}%`);
          };

          const resetTypePrice = (type) => {
            const origRooms = ROOMS.filter(r => r.type === type);
            setRooms(p => p.map(r => {
              if (r.type !== type) return r;
              return {...r, price: ROOMS.find(orig => orig.id === r.id)?.price || r.price};
            }));
            showToast(`Prezzi ${type} ripristinati`);
          };

          const RULE_LABEL = (rule) => {
            const metric = RULE_TYPES.find(x=>x.value===rule.type)?.label || rule.type;
            const op = rule.operator === "gte" ? "≥" : rule.operator === "lte" ? "≤" : "tra";
            const dir = rule.direction === "increase" ? "▲" : "▼";
            const adj = rule.adjustType === "pct" ? `${rule.adjustment}%` : `€${rule.adjustment}`;
            const who = rule.roomTypes === "all" ? "Tutte le tipologie" : rule.roomTypes;
            return `${metric} ${op} ${rule.threshold} → ${dir} ${adj} (${who})`;
          };

          return (
            <div>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:24 }}>
                <div>
                  <div className="section-title">Revenue Management</div>
                  <h1>Prezzi & Revenue Management</h1>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className={`btn-secondary${priceViewMode==="tipologia"?" active-tab":""}`}
                    style={{ fontWeight: priceViewMode==="tipologia"?700:400, borderColor: priceViewMode==="tipologia"?C.gold:"", color: priceViewMode==="tipologia"?C.gold:"" }}
                    onClick={() => setPriceViewMode("tipologia")}>⊞ Per Tipologia</button>
                  <button className={`btn-secondary${priceViewMode==="camera"?" active-tab":""}`}
                    style={{ fontWeight: priceViewMode==="camera"?700:400, borderColor: priceViewMode==="camera"?C.gold:"", color: priceViewMode==="camera"?C.gold:"" }}
                    onClick={() => setPriceViewMode("camera")}>≡ Per Camera</button>
                </div>
              </div>

              {/* KPI strip */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:24 }}>
                {[
                  { l:"Occupazione Globale", v:`${globalOcc}%`,  c: globalOcc>=80?C.green:globalOcc>=50?C.amber:C.red, icon:"🏨" },
                  { l:"Pick-up 7 giorni",    v:pickup7d,         c:C.navy,   icon:"📈" },
                  { l:"Pick-up 30 giorni",   v:pickup30d,        c:C.purple, icon:"📊" },
                  { l:"Regole Attive",       v:pricingRules.filter(r=>r.enabled).length, c:C.gold, icon:"⚙" },
                ].map(s => (
                  <div key={s.l} className="stat-card">
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                      <span style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>{s.l}</span>
                      <span style={{ fontSize:18 }}>{s.icon}</span>
                    </div>
                    <div style={{ fontSize:36, fontWeight:700, color:s.c, fontFamily:"IBM Plex Sans,sans-serif" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 420px", gap:20, alignItems:"start" }}>

                {/*   Colonna sinistra: tabella prezzi   */}
                <div>
                  {/*   Vista per TIPOLOGIA   */}
                  {priceViewMode === "tipologia" && (
                    <div className="card" style={{ padding:0, overflow:"hidden" }}>
                      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"1fr 80px 80px 80px 80px 80px 120px 90px", gap:8, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>
                        <div>Tipologia</div><div style={{ textAlign:"center" }}>Camere</div><div style={{ textAlign:"center" }}>Occup.</div><div style={{ textAlign:"center" }}>Pick-up 7g</div><div style={{ textAlign:"right" }}>Prezzo Base</div><div style={{ textAlign:"right" }}>Prezzo Eff.</div><div style={{ textAlign:"center" }}>Regole attive</div><div style={{ textAlign:"center" }}>Azioni</div>
                      </div>
                      {typeStats.map(({ type, typeRooms, baseMin, baseMax, effMin, effMax, occ, pu7, activeRuleCount }) => {
                        const diffPct = baseMin > 0 ? Math.round(((effMin - baseMin) / baseMin) * 100) : 0;
                        const occColor = occ >= 80 ? C.green : occ >= 50 ? C.amber : C.red;
                        return (
                          <div key={type} style={{ borderBottom:`1px solid ${C.border}` }}>
                            <div style={{ padding:"13px 20px", display:"grid", gridTemplateColumns:"1fr 80px 80px 80px 80px 80px 120px 90px", gap:8, alignItems:"center" }}>
                              <div>
                                <div style={{ fontWeight:700, fontSize:14 }}>{type}</div>
                                <div style={{ fontSize:11, color:C.text3 }}>{typeRooms.length} camere</div>
                              </div>
                              <div style={{ textAlign:"center", fontSize:13, fontWeight:600 }}>{typeRooms.length}</div>
                              <div style={{ textAlign:"center" }}>
                                <div style={{ fontSize:14, fontWeight:700, color:occColor }}>{occ}%</div>
                                <div style={{ height:3, background:C.border, borderRadius:2, marginTop:3 }}>
                                  <div style={{ height:3, width:`${occ}%`, background:occColor, borderRadius:2, transition:"width .4s" }} />
                                </div>
                              </div>
                              <div style={{ textAlign:"center", fontSize:14, fontWeight:700, color:C.navy }}>{pu7}</div>
                              <div style={{ textAlign:"right", fontSize:13, color:C.text2 }}>
                                {baseMin === baseMax ? `€${baseMin}` : `€${baseMin}–${baseMax}`}
                              </div>
                              <div style={{ textAlign:"right" }}>
                                <div style={{ fontSize:14, fontWeight:700, color: diffPct > 0 ? C.green : diffPct < 0 ? C.red : C.text }}>
                                  {effMin === effMax ? `€${effMin}` : `€${effMin}–${effMax}`}
                                </div>
                                {diffPct !== 0 && (
                                  <div style={{ fontSize:10, color: diffPct > 0 ? C.green : C.red, fontWeight:700 }}>
                                    {diffPct > 0 ? "▲" : "▼"} {Math.abs(diffPct)}%
                                  </div>
                                )}
                              </div>
                              <div style={{ textAlign:"center" }}>
                                {activeRuleCount > 0
                                  ? <span style={{ background:C.goldL, color:C.gold, border:`1px solid ${C.goldLb}`, padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:700 }}>{activeRuleCount} regole</span>
                                  : <span style={{ color:C.text3, fontSize:11 }}>—</span>}
                              </div>
                              <div style={{ textAlign:"center", display:"flex", gap:4, justifyContent:"center", flexWrap:"wrap" }}>
                                <button className="btn-secondary" style={{ padding:"3px 8px", fontSize:10 }}
                                  onClick={() => { const pct = prompt(`Modifica prezzi ${type} di %:\n(es. +10 o -5)`, "0"); if(pct!==null) applyPctToType(type, parseFloat(pct)||0); }}>%</button>
                                <button className="btn-secondary" style={{ padding:"3px 8px", fontSize:10 }}
                                  onClick={() => resetTypePrice(type)}>↺</button>
                              </div>
                            </div>
                            {/* Sub-righe camere on expand */}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/*   Vista per CAMERA   */}
                  {priceViewMode === "camera" && (
                    <div className="card" style={{ padding:0, overflow:"hidden" }}>
                      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"70px 1fr 70px 70px 90px 100px 90px", gap:8, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>
                        <div>Camera</div><div>Tipologia</div><div style={{ textAlign:"center" }}>Piano</div><div style={{ textAlign:"center" }}>Ospiti</div><div style={{ textAlign:"right" }}>Prezzo Base</div><div style={{ textAlign:"right" }}>Prezzo Effettivo</div><div style={{ textAlign:"center" }}>Modifica</div>
                      </div>
                      {roomTypes.map(type => {
                        const typeRooms = rooms.filter(r => r.type === type);
                        return (
                          <div key={type}>
                            <div style={{ padding:"7px 20px", background:C.surface2, borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.text2, letterSpacing:1, textTransform:"uppercase" }}>
                              {type} — {typeRooms.length} camere
                            </div>
                            {typeRooms.map(room => {
                              const origRoom = ROOMS.find(r => r.id === room.id);
                              const eff = computeEffectivePrice(room);
                              const diff = eff - room.price;
                              const ar = reservations.find(r => r.roomId === room.id && ["checked-in","reserved"].includes(r.status));
                              return (
                                <div key={room.id} style={{ padding:"10px 20px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"70px 1fr 70px 70px 90px 100px 90px", gap:8, alignItems:"center", background: ar ? (ar.status==="checked-in" ? C.greenL+"60" : C.navyL+"60") : "transparent" }}>
                                  <div style={{ fontWeight:700, color:ar?( ar.status==="checked-in"?C.green:C.navy):C.text }}>{room.id}</div>
                                  <div style={{ fontSize:12, color:C.text2 }}>{room.type}</div>
                                  <div style={{ textAlign:"center", fontSize:12, color:C.text3 }}>{room.floor}°</div>
                                  <div style={{ textAlign:"center", fontSize:12, color:C.text3 }}>{room.capacity}p</div>
                                  <div style={{ textAlign:"right" }}>
                                    <input
                                      type="number"
                                      value={room.price}
                                      min={1}
                                      onChange={e => updateRoomPrice(room.id, e.target.value)}
                                      style={{ width:80, textAlign:"right", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:4, padding:"4px 6px", fontSize:13, fontWeight:700, color:C.gold, outline:"none" }}
                                    />
                                  </div>
                                  <div style={{ textAlign:"right" }}>
                                    <span style={{ fontSize:14, fontWeight:700, color: diff > 0 ? C.green : diff < 0 ? C.red : C.text }}>€{eff}</span>
                                    {diff !== 0 && <div style={{ fontSize:10, color: diff > 0 ? C.green : C.red }}>{diff > 0 ? "▲" : "▼"} €{Math.abs(diff)}</div>}
                                  </div>
                                  <div style={{ textAlign:"center", fontSize:10, color:C.text3 }}>
                                    {origRoom && room.price !== origRoom.price
                                      ? <button className="btn-secondary" style={{ padding:"2px 7px", fontSize:10 }} onClick={() => updateRoomPrice(room.id, origRoom.price)}>↺</button>
                                      : <span style={{ color:C.border2 }}>—</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/*   Colonna destra: regole dinamiche   */}
                <div>
                  {/* Form nuova regola */}
                  <div className="card" style={{ marginBottom:16, border:`2px solid ${editRuleId ? C.goldLb : C.border}` }}>
                    <div className="section-title" style={{ color: editRuleId ? C.gold : C.text3 }}>
                      {editRuleId ? "✏ Modifica Regola" : "⚙ Nuova Regola Dinamica"}
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <label className="label">Nome regola</label>
                      <input className="input-field" placeholder="es. Alta stagione, Weekend, ..." value={ruleForm.name} onChange={e => setRuleForm(f=>({...f, name:e.target.value}))} />
                    </div>

                    <div className="form-grid" style={{ marginBottom:10 }}>
                      <div>
                        <label className="label">Metrica</label>
                        <select className="input-field" value={ruleForm.type} onChange={e => setRuleForm(f=>({...f, type:e.target.value}))}>
                          {RULE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Condizione</label>
                        <select className="input-field" value={ruleForm.operator} onChange={e => setRuleForm(f=>({...f, operator:e.target.value}))}>
                          <option value="gte">≥ (maggiore o uguale)</option>
                          <option value="lte">≤ (minore o uguale)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <label className="label">
                        Soglia {ruleForm.type === "occupancy" ? "(% occupazione)" : "(n° prenotazioni)"}
                      </label>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <input type="range" min={0} max={ruleForm.type==="occupancy"?100:50} value={ruleForm.threshold}
                          onChange={e => setRuleForm(f=>({...f, threshold:parseInt(e.target.value)}))}
                          style={{ flex:1, accentColor:C.gold }} />
                        <div style={{ minWidth:50, textAlign:"center", fontWeight:700, color:C.gold, fontSize:18, fontFamily:"IBM Plex Sans,sans-serif" }}>
                          {ruleForm.threshold}{ruleForm.type==="occupancy"?"%":""}
                        </div>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:C.text3, marginTop:2 }}>
                        <span>0</span><span style={{ color:C.amber }}>Soglia attuale</span><span>{ruleForm.type==="occupancy"?"100%":"50"}</span>
                      </div>
                    </div>

                    <div style={{ marginBottom:10 }}>
                      <label className="label">Applica a tipologia</label>
                      <select className="input-field" value={ruleForm.roomTypes} onChange={e => setRuleForm(f=>({...f, roomTypes:e.target.value}))}>
                        <option value="all">Tutte le tipologie</option>
                        {roomTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="form-grid" style={{ marginBottom:10 }}>
                      <div>
                        <label className="label">Direzione</label>
                        <select className="input-field" value={ruleForm.direction} onChange={e => setRuleForm(f=>({...f, direction:e.target.value}))}>
                          <option value="increase">▲ Aumenta prezzo</option>
                          <option value="decrease">▼ Riduci prezzo</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Tipo variazione</label>
                        <select className="input-field" value={ruleForm.adjustType} onChange={e => setRuleForm(f=>({...f, adjustType:e.target.value}))}>
                          <option value="pct">Percentuale (%)</option>
                          <option value="eur">Euro fisso (€)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom:14 }}>
                      <label className="label">
                        Valore {ruleForm.adjustType === "pct" ? "percentuale (%)" : "in euro (€)"}
                      </label>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <input type="range" min={1} max={ruleForm.adjustType==="pct"?100:500} value={ruleForm.adjustment}
                          onChange={e => setRuleForm(f=>({...f, adjustment:parseInt(e.target.value)}))}
                          style={{ flex:1, accentColor: ruleForm.direction==="increase" ? C.green : C.red }} />
                        <div style={{ minWidth:60, textAlign:"center", fontWeight:700, color: ruleForm.direction==="increase" ? C.green : C.red, fontSize:18, fontFamily:"IBM Plex Sans,sans-serif" }}>
                          {ruleForm.direction==="increase" ? "+" : "−"}{ruleForm.adjustType === "pct" ? `${ruleForm.adjustment}%` : `€${ruleForm.adjustment}`}
                        </div>
                      </div>
                    </div>

                    {/* Preview dell'effetto */}
                    <div style={{ background: C.surface2, border:`1px solid ${C.border}`, borderRadius:6, padding:"10px 14px", marginBottom:14, fontSize:12 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:C.text3, marginBottom:6, letterSpacing:1, textTransform:"uppercase" }}>Preview Effetto</div>
                      <div style={{ color:C.text2 }}>
                        Quando <b style={{ color:C.navy }}>{RULE_TYPES.find(t=>t.value===ruleForm.type)?.label}</b> {ruleForm.operator==="gte"?"≥":"≤"} <b style={{ color:C.gold }}>{ruleForm.threshold}{ruleForm.type==="occupancy"?"%":""}</b>
                      </div>
                      <div style={{ color:C.text2, marginTop:4 }}>
                        → Prezzo <b style={{ color: ruleForm.direction==="increase"?C.green:C.red }}>{ruleForm.direction==="increase"?"aumenta":"diminuisce"}</b> di <b style={{ color: ruleForm.direction==="increase"?C.green:C.red }}>{ruleForm.adjustType==="pct"?`${ruleForm.adjustment}%`:`€${ruleForm.adjustment}`}</b>
                      </div>
                      {(ruleForm.roomTypes === "all" ? roomTypes.slice(0,3) : [ruleForm.roomTypes]).map(type => {
                        const typeRms = rooms.filter(r => r.type === type);
                        const baseP = Math.min(...typeRms.map(r => r.price));
                        const delta = ruleForm.adjustType === "pct" ? baseP * ruleForm.adjustment/100 : ruleForm.adjustment;
                        const newP = ruleForm.direction === "increase" ? baseP + delta : baseP - delta;
                        return (
                          <div key={type} style={{ marginTop:4, fontSize:11, display:"flex", justifyContent:"space-between" }}>
                            <span style={{ color:C.text3 }}>{type}</span>
                            <span>€{baseP} → <b style={{ color: ruleForm.direction==="increase"?C.green:C.red }}>€{Math.round(Math.max(0,newP))}</b></span>
                          </div>
                        );
                      })}
                      {ruleForm.roomTypes === "all" && roomTypes.length > 3 && <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>...e altre {roomTypes.length-3} tipologie</div>}
                    </div>

                    <div style={{ display:"flex", gap:8 }}>
                      {editRuleId && <button className="btn-secondary" onClick={() => { setEditRuleId(null); setRuleForm({ name:"", type:"occupancy", threshold:80, operator:"gte", adjustment:10, adjustType:"pct", enabled:true, roomTypes:"all", direction:"increase" }); }}>Annulla</button>}
                      <button className="btn-primary" style={{ flex:1 }} onClick={saveRule}>{editRuleId ? "Aggiorna Regola" : "Crea Regola"}</button>
                    </div>
                  </div>

                  {/* Lista regole esistenti */}
                  <div className="card" style={{ padding:0, overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span>Regole Configurate ({pricingRules.length})</span>
                      {pricingRules.length > 0 && <span style={{ color:C.green, fontSize:11 }}>{pricingRules.filter(r=>r.enabled).length} attive</span>}
                    </div>
                    {pricingRules.length === 0 && (
                      <div style={{ padding:"28px 20px", textAlign:"center", color:C.text3, fontSize:13 }}>
                        <div style={{ fontSize:28, marginBottom:8 }}>⚙</div>
                        Nessuna regola configurata.<br/>Crea la prima regola dinamica sopra.
                      </div>
                    )}
                    {pricingRules.map((rule, idx) => {
                      const metric = rule.type === "occupancy" ? getOccupancy(rule.roomTypes === "all" ? null : rule.roomTypes)
                        : rule.type === "pickup7" ? getPickup(7, rule.roomTypes === "all" ? null : rule.roomTypes)
                        : getPickup(30, rule.roomTypes === "all" ? null : rule.roomTypes);
                      const isTriggered = rule.operator === "gte" ? metric >= rule.threshold : metric <= rule.threshold;
                      return (
                        <div key={rule.id} style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, opacity: rule.enabled ? 1 : 0.5 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              {/* Toggle on/off */}
                              <div onClick={() => toggleRule(rule.id)} style={{ width:34, height:18, borderRadius:9, background: rule.enabled ? C.green : C.border2, position:"relative", cursor:"pointer", transition:"background .2s", flexShrink:0 }}>
                                <div style={{ width:14, height:14, borderRadius:"50%", background:"white", position:"absolute", top:2, left: rule.enabled ? 18 : 2, transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
                              </div>
                              <div>
                                <div style={{ fontWeight:700, fontSize:13 }}>{rule.name}</div>
                                <div style={{ fontSize:10, color:C.text3, marginTop:1 }}>{RULE_LABEL(rule)}</div>
                              </div>
                            </div>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                              {rule.enabled && (
                                <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20,
                                  background: isTriggered ? (rule.direction==="increase"?C.greenL:C.redL) : C.surface2,
                                  color: isTriggered ? (rule.direction==="increase"?C.green:C.red) : C.text3,
                                  border:`1px solid ${isTriggered?(rule.direction==="increase"?C.greenLb:C.redLb):C.border}` }}>
                                  {isTriggered ? (rule.direction==="increase" ? "▲ ATTIVA" : "▼ ATTIVA") : "In attesa"}
                                </span>
                              )}
                              <button className="btn-secondary" style={{ padding:"3px 8px", fontSize:10 }} onClick={() => editRule(rule)}>✏</button>
                              <button className="btn-danger"    style={{ padding:"3px 8px", fontSize:10 }} onClick={() => deleteRule(rule.id)}>✕</button>
                            </div>
                          </div>
                          {rule.enabled && (
                            <div style={{ fontSize:11, color:C.text3, paddingLeft:42 }}>
                              Metrica corrente: <b style={{ color: isTriggered ? (rule.direction==="increase"?C.green:C.red) : C.text2 }}>{metric}{rule.type==="occupancy"?"%":""}</b>
                              {isTriggered && <span style={{ color: rule.direction==="increase"?C.green:C.red, fontWeight:700, marginLeft:6 }}>✓ Soglia {rule.threshold}{rule.type==="occupancy"?"%":""} superata</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/*   CASSA   */}
        {page==="Cassa" && (
          <div>
            <div className="page-header"><div><h1>Cassa</h1><div className="page-subtitle">Pagamenti ricevuti, estratto conto e report fiscali</div></div></div>
            <AiBar pg="Cassa" />
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":isTablet?"1fr 1fr":"repeat(4,1fr)", gap:14, marginBottom:22 }}>
              {[
                { l:"Totale Fatturato",v:reservations.filter(r=>r.status!=="cancelled").reduce((s,r)=>s+calcTotal(r),0), c:C.gold   },
                { l:"Totale Incassato",v:reservations.reduce((s,r)=>s+calcPaid(r),0),                                    c:C.green  },
                { l:"Da Riscuotere",   v:reservations.filter(r=>r.status==="checked-in").reduce((s,r)=>s+Math.max(0,calcTotal(r)-calcPaid(r)),0), c:C.amber },
                { l:"IVA (10%)",       v:reservations.filter(r=>r.status!=="cancelled").reduce((s,r)=>s+calcTotal(r)*TAX_RATE,0),c:C.purple },
              ].map(s => (
                <div key={s.l} className="stat-card">
                  <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{s.l}</div>
                  <div style={{ fontSize:30, fontWeight:300, color:s.c, fontFamily:"IBM Plex Sans,sans-serif" }}>€{s.v.toLocaleString("it-IT",{minimumFractionDigits:2})}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:"13px 20px", borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, letterSpacing:2, textTransform:"uppercase", color:C.text3 }}>Situazione Conti</div>
              {reservations.filter(r=>r.status!=="cancelled").map(r => {
                const room=ROOMS.find(x=>x.id===r.roomId), total=calcTotal(r), paid=calcPaid(r), bal=total-paid, sc=STATUS_CFG[r.status];
                return (
                  <div key={r.id} style={{ padding:"12px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontWeight:600 }}>{r.guestName}</span>
                        <span className="badge" style={{ background:sc.bg, color:sc.text, border:`1px solid ${sc.border}`, fontSize:9 }}>{sc.label}</span>
                      </div>
                      <div style={{ fontSize:11, color:C.text3 }}>{r.id} · Cam {r.roomId} {room?.type} · {nights(r.checkIn,r.checkOut)}n</div>
                    </div>
                    <div style={{ display:"flex", gap:18, alignItems:"center" }}>
                      {[["Tot",`€${total.toFixed(2)}`,C.gold],["Pag",`€${paid.toFixed(2)}`,C.green],["Sal",`€${bal.toFixed(2)}`,bal>0?C.red:C.green]].map(([l,v,co]) => (
                        <div key={l} style={{ textAlign:"right" }}>
                          <div style={{ fontSize:10, color:C.text3, fontWeight:600 }}>{l}</div>
                          <div style={{ fontWeight:700, color:co, fontSize:14 }}>{v}</div>
                        </div>
                      ))}
                      <button className="btn-secondary" style={{ padding:"5px 12px", fontSize:11 }} onClick={() => openInvoice(r)}>Conto</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/*   PUBBLICA SICUREZZA   */}
        {page==="Pubblica Sicurezza" && (
          <div>
            <div style={{ marginBottom:22 }}>
              <div className="section-title">Comunicazione Autorità</div>
              <h1>Pubblica Sicurezza</h1>
              <div style={{ fontSize:12, color:C.text3, marginTop:5 }}>Schedine alloggiati · Art. 109 T.U.L.P.S. · Modello 349 · Portale Alloggiati Web</div>
            </div>
            <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"flex-end" }}>
              <div><label className="label">Mese</label><input type="month" className="input-field" style={{ width:175 }} value={psMonth} onChange={e=>setPsMonth(e.target.value)} /></div>
              <button className="btn-primary" onClick={() => window.print()}>🖨 Stampa</button>
              <div style={{ fontSize:11, color:C.text3, alignSelf:"center" }}>
                {psRes.length} pren · <span style={{ color:C.green }}>{psRes.filter(r=>r.psInviato).length} inviate</span> · <span style={{ color:C.red }}>{psRes.filter(r=>!r.psInviato).length} da inviare</span>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 2fr", gap:16, marginBottom:20 }}>
              <div className="card">
                <div className="section-title">Riepilogo</div>
                {[["Totale schedine",psRes.reduce((s,r)=>s+1+(r.companions?.length||0),0),C.gold],
                  ["Prenotazioni",psRes.length,C.navy],
                  ["✓ Inviate",psRes.filter(r=>r.psInviato).length,C.green],
                  ["⚠ Da inviare",psRes.filter(r=>!r.psInviato).length,C.red]].map(([l,v,c]) => (
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:13, color:C.text2 }}>{l}</span>
                    <span style={{ fontWeight:700, color:c }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="card" style={{ background:C.navyL, border:`1px solid ${C.navyLb}` }}>
                <div className="section-title" style={{ color:C.navy }}>ℹ Normativa</div>
                <div style={{ fontSize:13, color:C.text2, lineHeight:1.8 }}>
                  <b style={{ color:C.navy }}>Termine:</b> entro le 24h dall'arrivo dell'ospite.<br/>
                  <b style={{ color:C.navy }}>Obbligati:</b> tutti i maggiorenni separatamente. Minori sotto il genitore/tutore.<br/>
                  <b style={{ color:C.navy }}>Portale:</b> alloggiatiweb.poliziadistato.it<br/>
                  <b style={{ color:C.navy }}>Sanzioni:</b> art. 17 bis T.U.L.P.S. — fino a €206 per omissione.
                </div>
              </div>
            </div>
            {/* Documento stampabile */}
            <div className="ps-doc">
              <h1 style={{ fontSize:15, textAlign:"center", fontWeight:700, marginBottom:4 }}>SCHEDINE DI PUBBLICA SICUREZZA</h1>
              <div style={{ textAlign:"center", fontSize:11, color:"#444", marginBottom:14 }}>ai sensi dell'art. 109 T.U.L.P.S. (R.D. 18/06/1931 n. 773)</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:14, fontSize:11, border:"1px solid #ddd", padding:10, background:"#fafaf8" }}>
                {[["Struttura","Hotel Gasparini"],["P.IVA","IT01234567890"],["Cod. ISTAT","027042-001"],["Indirizzo","Via della Repubblica 1"],["Comune","Venezia (VE)"],["Periodo",psMonth]].map(([l,v]) => <div key={l}><b>{l}:</b> {v}</div>)}
              </div>
              {psRes.map(res => {
                const mg=getGuest(res.guestId), cgs=(res.companions||[]).map(cid=>getGuest(cid)).filter(Boolean);
                const all=mg?[mg,...cgs]:cgs, room=ROOMS.find(r=>r.id===res.roomId);
                return (
                  <div key={res.id} style={{ marginBottom:22, pageBreakInside:"avoid" }}>
                    <div style={{ background:"#1a2a3a", color:"white", padding:"5px 10px", fontSize:11, fontWeight:700, display:"flex", justifyContent:"space-between" }}>
                      <span>PREN. {res.id} — Camera {res.roomId} ({room?.type})</span>
                      <span>{fmtDate(res.checkIn)} → {fmtDate(res.checkOut)} · {nights(res.checkIn,res.checkOut)}n</span>
                    </div>
                    {all.length===0 && <div style={{ padding:9, background:"#fff3cd", border:"1px solid #ffc107", fontSize:11, color:"#856404" }}>⚠ Ospite "{res.guestName}" non censito in anagrafica.</div>}
                    {all.map((g,gi) => {
                      const naz=NAZIONALITA.find(n=>n.code===g.nazionalita);
                      return (
                        <table key={g.id} className="ps-table" style={{ marginBottom:4 }}>
                          <thead>
                            <tr><th colSpan={8} style={{ background:gi===0?"#2c5282":"#4a5568" }}>{gi===0?"👤 OSPITE PRINCIPALE":`👥 ACCOMPAGNATORE ${gi}`} — {g.cognome.toUpperCase()} {g.nome.toUpperCase()}</th></tr>
                            <tr><th>Cognome</th><th>Nome</th><th>Sesso</th><th>Data Nasc.</th><th>Luogo Nasc.</th><th>Nazionalità</th><th>Tipo Doc.</th><th>N° Documento</th></tr>
                          </thead>
                          <tbody>
                            <tr><td>{g.cognome.toUpperCase()}</td><td>{g.nome.toUpperCase()}</td><td>{g.sesso}</td><td>{fmtDate(g.dataNascita)}</td><td>{g.luogoNascita} ({g.provinciaNascita})</td><td>{naz?.name||g.nazionalita}</td><td>{g.tipoDoc}</td><td style={{ fontWeight:700 }}>{g.numDoc}</td></tr>
                            <tr><td colSpan={2}><b>Rilasciato da:</b> {g.rilasciatoDa||"—"}</td><td colSpan={2}><b>Data rilascio:</b> {fmtDate(g.dataRilascio)}</td><td colSpan={2}><b>Scadenza:</b> {fmtDate(g.scadenzaDoc)}</td><td colSpan={2}><b>Residenza:</b> {g.indirizzo}, {g.citta} {g.cap}</td></tr>
                          </tbody>
                        </table>
                      );
                    })}
                    <div style={{ padding:"4px 8px", background:res.psInviato?"#d4edda":"#fff3cd", border:`1px solid ${res.psInviato?"#c3e6cb":"#ffc107"}`, fontSize:10, textAlign:"right", color:res.psInviato?"#155724":"#856404" }}>
                      {res.psInviato?"✓ SCHEDINA INVIATA AL PORTALE ALLOGGIATI WEB":"⚠ IN ATTESA DI TRASMISSIONE"}
                    </div>
                  </div>
                );
              })}
              {psRes.length===0 && <div style={{ textAlign:"center", padding:28, color:"#888" }}>Nessuna prenotazione per il mese selezionato</div>}
              <div style={{ marginTop:18, borderTop:"2px solid #1a1a1a", paddingTop:10, fontSize:10, color:"#555", display:"flex", justifyContent:"space-between" }}>
                <span>Generato: {new Date().toLocaleString("it-IT")}</span><span>Responsabile: _________________________</span><span>Timbro e Firma</span>
              </div>
            </div>
          </div>
        )}

        {/*   ISTAT VENETO   */}
        {page==="ISTAT Veneto" && (() => {
          const mRes=istatRes;
          const italRes=mRes.filter(r=>{const g=getGuest(r.guestId); return !g||g.nazionalita==="IT";});
          const stranRes=mRes.filter(r=>{const g=getGuest(r.guestId); return g&&g.nazionalita!=="IT";});
          const totArr=mRes.length, totPres=mRes.reduce((s,r)=>s+nights(r.checkIn,r.checkOut)*(r.guests||1),0);
          const itArr=italRes.length, itPres=italRes.reduce((s,r)=>s+nights(r.checkIn,r.checkOut)*(r.guests||1),0);
          const stArr=stranRes.length, stPres=stranRes.reduce((s,r)=>s+nights(r.checkIn,r.checkOut)*(r.guests||1),0);
          const pm=totArr>0?(totPres/totArr).toFixed(2):"–";
          const dim=new Date(parseInt(istatMonth.split("-")[0]),parseInt(istatMonth.split("-")[1]),0).getDate();
          const byNaz={};
          stranRes.forEach(r=>{const g=getGuest(r.guestId); const code=g?.nazionalita||"XX"; const name=NAZIONALITA.find(n=>n.code===code)?.name||"Altra"; if(!byNaz[code])byNaz[code]={name,arr:0,pres:0}; byNaz[code].arr++; byNaz[code].pres+=nights(r.checkIn,r.checkOut)*(r.guests||1);});
          return (
            <div>
              <div style={{ marginBottom:22 }}>
                <div className="section-title">Statistica Regionale</div>
                <h1>ISTAT Veneto</h1>
                <div style={{ fontSize:12, color:C.text3, marginTop:5 }}>Rilevazione movimento clienti esercizi ricettivi · Modello C/59 · Regione Veneto</div>
              </div>
              <div style={{ display:"flex", gap:12, marginBottom:20, alignItems:"flex-end" }}>
                <div><label className="label">Mese</label><input type="month" className="input-field" style={{ width:175 }} value={istatMonth} onChange={e=>setIstatMonth(e.target.value)} /></div>
                <button className="btn-primary" onClick={() => window.print()}>🖨 Stampa</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":isTablet?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                {[["Arrivi Totali",totArr,C.gold],["Presenze Totali",totPres,C.navy],["Arr. Italiani",itArr,C.green],["Arr. Stranieri",stArr,C.purple]].map(([l,v,c]) => (
                  <div key={l} className="stat-card"><div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{l}</div><div style={{ fontSize:30, fontWeight:300, color:c, fontFamily:"IBM Plex Sans,sans-serif" }}>{v}</div></div>
                ))}
              </div>
              <div className="istat-doc">
                <div style={{ textAlign:"center", marginBottom:14 }}>
                  <div style={{ fontSize:9, letterSpacing:2, color:"#555", marginBottom:3 }}>REGIONE VENETO — SISTEMA STATISTICO REGIONALE</div>
                  <h1 style={{ fontSize:15, fontWeight:700, color:"#003580" }}>RILEVAZIONE MOVIMENTO CLIENTI NEGLI ESERCIZI RICETTIVI</h1>
                  <div style={{ fontSize:11, color:"#555", marginTop:3 }}>Modello C/59 · Mese: {istatMonth.split("-")[1]}/{istatMonth.split("-")[0]}</div>
                </div>
                <div style={{ border:"1px solid #003580", padding:"9px 12px", marginBottom:14, fontSize:11 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                    {[["Denominazione","Hotel Gasparini"],["Codice ISTAT","VE-027042-001"],["Categoria","Albergo 4 stelle"],["Comune","Venezia"],["Provincia","Venezia (VE)"],["N° Camere",ROOMS.length],["N° Letti",ROOMS.reduce((s,r)=>s+r.capacity,0)],["P.IVA","IT01234567890"],["Periodo",istatMonth]].map(([l,v]) => <div key={l}><b>{l}:</b> {v}</div>)}
                  </div>
                </div>
                <table className="istat-table" style={{ marginBottom:14 }}>
                  <thead>
                    <tr><th rowSpan={2} className="lc" style={{ textAlign:"left",width:200 }}>PROVENIENZA</th><th colSpan={2} style={{ background:"#003580" }}>ARRIVI</th><th colSpan={2} style={{ background:"#005AB5" }}>PRESENZE</th><th rowSpan={2} style={{ background:"#1a4a8a" }}>PERM. MEDIA</th></tr>
                    <tr><th style={{ background:"#1a5276" }}>N°</th><th style={{ background:"#1a5276" }}>%</th><th style={{ background:"#2874a6" }}>N°</th><th style={{ background:"#2874a6" }}>%</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="lc">🇮🇹 Italiani — Totale</td><td style={{ fontWeight:700 }}>{itArr}</td><td>{totArr>0?((itArr/totArr)*100).toFixed(1):0}%</td><td style={{ fontWeight:700 }}>{itPres}</td><td>{totPres>0?((itPres/totPres)*100).toFixed(1):0}%</td><td>{itArr>0?(itPres/itArr).toFixed(2):"–"}</td></tr>
                    {[["Nord Italia",.4],["Centro Italia",.3],["Sud e Isole",.3]].map(([l,p]) => <tr key={l}><td className="lc" style={{ paddingLeft:18 }}>· {l}</td><td>{Math.round(itArr*p)}</td><td>–</td><td>{Math.round(itPres*p)}</td><td>–</td><td>–</td></tr>)}
                    <tr><td className="lc">🌍 Stranieri — Totale</td><td style={{ fontWeight:700 }}>{stArr}</td><td>{totArr>0?((stArr/totArr)*100).toFixed(1):0}%</td><td style={{ fontWeight:700 }}>{stPres}</td><td>{totPres>0?((stPres/totPres)*100).toFixed(1):0}%</td><td>{stArr>0?(stPres/stArr).toFixed(2):"–"}</td></tr>
                    {Object.entries(byNaz).map(([code,d]) => <tr key={code}><td className="lc" style={{ paddingLeft:18 }}>· {d.name}</td><td>{d.arr}</td><td>–</td><td>{d.pres}</td><td>–</td><td>{d.arr>0?(d.pres/d.arr).toFixed(2):"–"}</td></tr>)}
                    <tr style={{ background:"#003580", color:"white", fontWeight:700 }}>
                      <td style={{ textAlign:"left", padding:"7px 10px", background:"#003580", color:"white" }}>TOTALE</td>
                      <td style={{ color:"white" }}>{totArr}</td><td style={{ color:"white" }}>100%</td>
                      <td style={{ color:"white" }}>{totPres}</td><td style={{ color:"white" }}>100%</td>
                      <td style={{ color:"white" }}>{pm}</td>
                    </tr>
                  </tbody>
                </table>
                <table className="istat-table" style={{ marginBottom:14 }}>
                  <thead><tr><th className="lc" style={{ textAlign:"left" }}>CAPACITÀ</th><th>Camere</th><th>Letti</th><th>Gg apertura</th><th>Cam-notti disp.</th><th>Tasso Occup.</th></tr></thead>
                  <tbody><tr><td className="lc">Hotel Gasparini</td><td>{ROOMS.length}</td><td>{ROOMS.reduce((s,r)=>s+r.capacity,0)}</td><td>{dim}</td><td>{ROOMS.length*dim}</td><td>{totArr>0?`${((totPres/(ROOMS.length*dim))*100).toFixed(1)}%`:"0%"}</td></tr></tbody>
                </table>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:18, marginTop:18, borderTop:"1px solid #ccc", paddingTop:14, fontSize:11 }}>
                  <div><b>Compilato da:</b><div style={{ marginTop:4 }}>_______________________</div></div>
                  <div><b>Data:</b><div style={{ marginTop:4 }}>{new Date().toLocaleDateString("it-IT")}</div><div style={{ color:"#666" }}>Firma: _______________</div></div>
                  <div><b>Inviare a:</b><div style={{ marginTop:4 }}>Regione Veneto – Statistica</div><div style={{ color:"#666" }}>stat@regione.veneto.it</div></div>
                </div>
                <div style={{ marginTop:12, fontSize:9, color:"#888", borderTop:"1px solid #eee", paddingTop:7 }}>Ai sensi del D.Lgs. 322/89 e L.R. Veneto 11/2013 — Dati riservati per uso statistico.</div>
              </div>
            </div>
          );
        })()}


      {/*   MODAL: FORM OSPITE / AZIENDA   */}
      {modal && modal.startsWith("guest-form") && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal-box" style={{ maxWidth:860 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, marginBottom:3 }}>
                  {guestForm.tipo==="azienda" ? "ANAGRAFICA AZIENDA" : "ANAGRAFICA INDIVIDUALE"}
                </div>
                <h2 style={{ fontSize:22, fontWeight:600 }}>
                  {guests.find(g=>g.id===guestForm.id)
                    ? (guestForm.tipo==="azienda" ? guestForm.ragioneSociale : `${guestForm.cognome} ${guestForm.nome}`)
                    : (guestForm.tipo==="azienda" ? "Nuova Azienda" : "Nuovo Ospite")}
                </h2>
              </div>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                <span style={{ fontSize:11, color:C.text3 }}>{guestForm.id}</span>
                {/* Badge tipo — non modificabile in edit, solo in creazione */}
                {!guests.find(g=>g.id===guestForm.id) && (
                  <div style={{ display:"flex", gap:0, border:`1px solid ${C.border}`, borderRadius:6, overflow:"hidden", fontSize:11 }}>
                    {[["individuale","👤 Individuale"],["azienda","🏢 Azienda"]].map(([t,l]) => (
                      <button key={t} onClick={() => setGuestForm(t==="azienda" ? emptyAzienda() : emptyGuest())}
                        style={{ padding:"4px 12px", border:"none", cursor:"pointer", fontWeight:600,
                          background: guestForm.tipo===t ? C.navy : C.surface,
                          color: guestForm.tipo===t ? "#fff" : C.text2 }}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-body">

              {/* ═══ FORM INDIVIDUALE ═══ */}
              {guestForm.tipo !== "azienda" && (<>
                <div className="section-title">Dati Anagrafici</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div><label className="label">Cognome *</label><input className="input-field" value={guestForm.cognome||""} onChange={e=>setGuestForm(f=>({...f,cognome:e.target.value}))} /></div>
                  <div><label className="label">Nome *</label><input className="input-field" value={guestForm.nome||""} onChange={e=>setGuestForm(f=>({...f,nome:e.target.value}))} /></div>
                  <div><label className="label">Sesso</label>
                    <select className="input-field" value={guestForm.sesso||"M"} onChange={e=>setGuestForm(f=>({...f,sesso:e.target.value}))}>
                      <option value="M">Maschile</option><option value="F">Femminile</option>
                    </select>
                  </div>
                  <div><label className="label">Data di Nascita *</label><input type="date" className="input-field" value={guestForm.dataNascita||""} onChange={e=>setGuestForm(f=>({...f,dataNascita:e.target.value}))} /></div>
                  <div style={{ gridColumn:"1/-1" }}>
                    <ComuneInput label="Comune di Nascita *" value={guestForm.luogoNascita||""}
                      onChange={item => setGuestForm(f=>({...f, luogoNascita:item.c, provinciaNascita:item.p||f.provinciaNascita}))} />
                  </div>
                  <div><label className="label">Provincia Nascita</label><input className="input-field" maxLength={2} placeholder="MI" value={guestForm.provinciaNascita||""} onChange={e=>setGuestForm(f=>({...f,provinciaNascita:e.target.value.toUpperCase()}))} /></div>
                  <div><label className="label">Nazionalità</label>
                    <select className="input-field" value={guestForm.nazionalita||"IT"} onChange={e=>setGuestForm(f=>({...f,nazionalita:e.target.value}))}>
                      {NAZIONALITA.map(n=><option key={n.code} value={n.code}>{n.name}</option>)}
                    </select>
                  </div>
                </div>

                <hr className="divider"/>
                <div className="section-title">Documento d'Identità <span style={{ color:C.text3, fontWeight:400 }}>(obbligatorio per Pubblica Sicurezza)</span></div>
                <div className="form-grid-3" style={{ marginBottom:12 }}>
                  <div><label className="label">Tipo Documento *</label>
                    <select className="input-field" value={guestForm.tipoDoc||""} onChange={e=>setGuestForm(f=>({...f,tipoDoc:e.target.value}))}>
                      {TIPO_DOC.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className="label">N° Documento *</label><input className="input-field" value={guestForm.numDoc||""} onChange={e=>setGuestForm(f=>({...f,numDoc:e.target.value.toUpperCase()}))} /></div>
                  <div><label className="label">Rilasciato da</label><input className="input-field" value={guestForm.rilasciatoDa||""} onChange={e=>setGuestForm(f=>({...f,rilasciatoDa:e.target.value}))} /></div>
                  <div><label className="label">Data Rilascio</label><input type="date" className="input-field" value={guestForm.dataRilascio||""} onChange={e=>setGuestForm(f=>({...f,dataRilascio:e.target.value}))} /></div>
                  <div><label className="label">Scadenza</label><input type="date" className="input-field" value={guestForm.scadenzaDoc||""} onChange={e=>setGuestForm(f=>({...f,scadenzaDoc:e.target.value}))} /></div>
                </div>

                <hr className="divider"/>
                <div className="section-title">Residenza</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div style={{ gridColumn:"1/-1" }}><label className="label">Indirizzo</label><input className="input-field" value={guestForm.indirizzo||""} onChange={e=>setGuestForm(f=>({...f,indirizzo:e.target.value}))} /></div>
                  <div style={{ gridColumn:"span 2" }}>
                    <ComuneInput label="Città di Residenza" value={guestForm.citta||""}
                      onChange={item => setGuestForm(f=>({...f, citta:item.c, cap:item.z||f.cap, provincia:item.p||f.provincia}))} />
                  </div>
                  <div><label className="label">CAP</label><input className="input-field" maxLength={5} value={guestForm.cap||""} onChange={e=>setGuestForm(f=>({...f,cap:e.target.value}))} /></div>
                  <div><label className="label">Prov.</label><input className="input-field" maxLength={2} placeholder="VE" value={guestForm.provincia||""} onChange={e=>setGuestForm(f=>({...f,provincia:e.target.value.toUpperCase()}))} /></div>
                  <div><label className="label">Paese</label><input className="input-field" value={guestForm.paese||"Italia"} onChange={e=>setGuestForm(f=>({...f,paese:e.target.value}))} /></div>
                </div>

                <hr className="divider"/>
                <div className="section-title">Contatti</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div><label className="label">Email</label><input type="email" className="input-field" value={guestForm.email||""} onChange={e=>setGuestForm(f=>({...f,email:e.target.value}))} /></div>
                  <div><label className="label">Telefono</label><input className="input-field" value={guestForm.telefono||""} onChange={e=>setGuestForm(f=>({...f,telefono:e.target.value}))} /></div>
                </div>
              </>)}

              {/* ═══ FORM AZIENDA ═══ */}
              {guestForm.tipo === "azienda" && (<>
                <div className="section-title">Dati Societari</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div style={{ gridColumn:"1/-1" }}><label className="label">Ragione Sociale *</label><input className="input-field" value={guestForm.ragioneSociale||""} onChange={e=>setGuestForm(f=>({...f,ragioneSociale:e.target.value}))} placeholder="Es. Acme S.r.l." /></div>
                  <div><label className="label">Partita IVA *</label><input className="input-field" value={guestForm.piva||""} onChange={e=>setGuestForm(f=>({...f,piva:e.target.value.toUpperCase()}))} placeholder="IT01234567890" maxLength={13} /></div>
                  <div><label className="label">Codice Fiscale</label><input className="input-field" value={guestForm.codiceFiscale||""} onChange={e=>setGuestForm(f=>({...f,codiceFiscale:e.target.value.toUpperCase()}))} maxLength={16} /></div>
                  <div><label className="label">Codice SDI</label><input className="input-field" value={guestForm.sdi||""} onChange={e=>setGuestForm(f=>({...f,sdi:e.target.value.toUpperCase()}))} placeholder="0000000" maxLength={7} /></div>
                  <div><label className="label">Settore / Attività</label>
                    <select className="input-field" value={guestForm.settore||""} onChange={e=>setGuestForm(f=>({...f,settore:e.target.value}))}>
                      <option value="">— Seleziona —</option>
                      {["Turismo / Hospitality","Commercio al dettaglio","Commercio all'ingrosso","Industria manifatturiera","Edilizia / Costruzioni","Trasporti / Logistica","Finanza / Assicurazioni","Sanità / Farmaceutico","ICT / Tecnologia","Media / Comunicazione","Agricoltura / Alimentare","Istruzione / Formazione","Pubblica Amministrazione","Professionisti / Studi","Sport / Intrattenimento","Altro"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <hr className="divider"/>
                <div className="section-title">Persona di Riferimento</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div><label className="label">Cognome e Nome</label><input className="input-field" value={guestForm.referente||""} onChange={e=>setGuestForm(f=>({...f,referente:e.target.value}))} placeholder="Rossi Mario" /></div>
                  <div><label className="label">Ruolo / Qualifica</label>
                    <select className="input-field" value={guestForm.ruoloReferente||""} onChange={e=>setGuestForm(f=>({...f,ruoloReferente:e.target.value}))}>
                      <option value="">— Seleziona —</option>
                      {["Titolare / CEO","Direttore Generale","Responsabile Acquisti","Responsabile Viaggi","Segreteria","Ufficio Amministrativo","Ufficio Marketing","Travel Manager","Altro"].map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                </div>

                <hr className="divider"/>
                <div className="section-title">Sede Legale</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div style={{ gridColumn:"1/-1" }}><label className="label">Indirizzo</label><input className="input-field" value={guestForm.indirizzo||""} onChange={e=>setGuestForm(f=>({...f,indirizzo:e.target.value}))} /></div>
                  <div style={{ gridColumn:"span 2" }}>
                    <ComuneInput label="Città" value={guestForm.citta||""}
                      onChange={item => setGuestForm(f=>({...f, citta:item.c, cap:item.z||f.cap, provincia:item.p||f.provincia}))} />
                  </div>
                  <div><label className="label">CAP</label><input className="input-field" maxLength={5} value={guestForm.cap||""} onChange={e=>setGuestForm(f=>({...f,cap:e.target.value}))} /></div>
                  <div><label className="label">Prov.</label><input className="input-field" maxLength={2} placeholder="VE" value={guestForm.provincia||""} onChange={e=>setGuestForm(f=>({...f,provincia:e.target.value.toUpperCase()}))} /></div>
                  <div><label className="label">Paese</label><input className="input-field" value={guestForm.paese||"Italia"} onChange={e=>setGuestForm(f=>({...f,paese:e.target.value}))} /></div>
                </div>

                <hr className="divider"/>
                <div className="section-title">Contatti & Fatturazione</div>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div><label className="label">Email generica</label><input type="email" className="input-field" value={guestForm.email||""} onChange={e=>setGuestForm(f=>({...f,email:e.target.value}))} /></div>
                  <div><label className="label">Telefono</label><input className="input-field" value={guestForm.telefono||""} onChange={e=>setGuestForm(f=>({...f,telefono:e.target.value}))} /></div>
                  <div><label className="label">PEC (fatturazione)</label><input type="email" className="input-field" value={guestForm.pec||""} onChange={e=>setGuestForm(f=>({...f,pec:e.target.value}))} placeholder="azienda@pec.it" /></div>
                </div>
              </>)}

              {/* Note — comune a entrambi */}
              <div><label className="label">Note interne</label><textarea className="input-field" rows={2} value={guestForm.note||""} onChange={e=>setGuestForm(f=>({...f,note:e.target.value}))} style={{ resize:"none" }} /></div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { if(prevModal){ setModal(prevModal); setPrevModal(null); } else setModal(null); }}>Annulla</button>
              <button className="btn-primary" onClick={saveGuest}>
                {guestForm.tipo==="azienda" ? "Salva Azienda" : "Salva Ospite"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/*   MODAL: PRENOTAZIONE   */}
      {(modal==="new-res"||modal==="edit-res") && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <div><div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, marginBottom:3 }}>{modal==="new-res"?"NUOVA":"MODIFICA"} PRENOTAZIONE</div>
                <h2 style={{ fontSize:22, fontWeight:600 }}>Prenotazione {form.id}</h2></div>
              {modal==="edit-res" && <span className="badge" style={{ background:STATUS_CFG[form.status]?.bg, color:STATUS_CFG[form.status]?.text, border:`1px solid ${STATUS_CFG[form.status]?.border}` }}>{STATUS_CFG[form.status]?.label}</span>}
            </div>
            <div className="modal-body">
              <div className="section-title">Ospite Principale</div>
              <div style={{ display:"flex", gap:8, marginBottom:10 }}>
                <select className="input-field" value={form.guestId||""} onChange={e=>{const g=guests.find(x=>x.id===e.target.value); setForm(f=>({...f,guestId:e.target.value,guestName:g?`${g.cognome} ${g.nome}`:f.guestName}));}}>
                  <option value="">— Seleziona dall'anagrafica —</option>
                  {guests.map(g=><option key={g.id} value={g.id}>{g.cognome} {g.nome} · {g.numDoc}</option>)}
                </select>
                <button className="btn-blue" onClick={() => { setPrevModal(modal); setGuestForm(emptyGuest()); setModal(`guest-form-for-${form.id}`); }}>+ Nuovo</button>
              </div>
              {!form.guestId && <div style={{ marginBottom:10 }}><label className="label">Nome manuale</label><input className="input-field" placeholder="Cognome e Nome" value={form.guestName||""} onChange={e=>setForm(f=>({...f,guestName:e.target.value}))} /></div>}
              {form.guestId && <div style={{ marginBottom:10, padding:"8px 12px", background:C.greenL, border:`1px solid ${C.greenLb}`, borderRadius:6, fontSize:12, color:C.green, fontWeight:600 }}>✓ {guests.find(g=>g.id===form.guestId)?.tipoDoc} {guests.find(g=>g.id===form.guestId)?.numDoc}</div>}

              <div style={{ marginBottom:12 }}>
                <label className="label">Accompagnatori ({(form.companions||[]).length})</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:7 }}>
                  {(form.companions||[]).map(cid=>{const cg=getGuest(cid); return cg?(<span key={cid} style={{ background:C.navyL, border:`1px solid ${C.navyLb}`, color:C.navy, padding:"3px 8px", fontSize:11, borderRadius:20, display:"inline-flex", alignItems:"center", gap:4 }}>{cg.cognome} {cg.nome}<button onClick={()=>setForm(f=>({...f,companions:f.companions.filter(x=>x!==cid)}))} style={{ background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:13 }}>×</button></span>):null;})}
                </div>
                <div style={{ display:"flex", gap:7 }}>
                  <select className="input-field" id="comp-sel"><option value="">— Aggiungi —</option>{guests.filter(g=>g.id!==form.guestId&&!(form.companions||[]).includes(g.id)).map(g=><option key={g.id} value={g.id}>{g.cognome} {g.nome}</option>)}</select>
                  <button className="btn-secondary" onClick={()=>{const v=document.getElementById("comp-sel").value; if(v)setForm(f=>({...f,companions:[...(f.companions||[]),v]}));}}>Aggiungi</button>
                </div>
              </div>

              <hr className="divider"/>
              <div className="section-title">Soggiorno</div>
              <div className="form-grid" style={{ marginBottom:12 }}>
                <div><label className="label">Check-In *</label><input type="date" className="input-field" value={form.checkIn||""} onChange={e=>setForm(f=>({...f,checkIn:e.target.value}))} /></div>
                <div><label className="label">Check-Out *</label><input type="date" className="input-field" value={form.checkOut||""} onChange={e=>setForm(f=>({...f,checkOut:e.target.value}))} /></div>
                <div><label className="label">Camera *</label>
                  <select className="input-field" value={form.roomId||""} onChange={e=>setForm(f=>({...f,roomId:e.target.value}))}>
                    <option value="">Seleziona...</option>
                    {ROOMS.map(r=>{const ok=roomAvail(r,form.checkIn,form.checkOut,reservations,form.id); return <option key={r.id} value={r.id} disabled={!ok}>Cam {r.id} · {r.type} · €{r.price}/n{!ok?" (occupata)":""}</option>;})}
                  </select>
                </div>
                <div><label className="label">Adulti</label><input type="number" className="input-field" min={1} max={10} value={form.adulti||1} onChange={e=>setForm(f=>({...f,adulti:parseInt(e.target.value)||1,guests:(parseInt(e.target.value)||1)+(f.bambini||0)}))} /></div>
                <div><label className="label">Bambini</label><input type="number" className="input-field" min={0} max={6} value={form.bambini||0} onChange={e=>setForm(f=>({...f,bambini:parseInt(e.target.value)||0,guests:(f.adulti||1)+(parseInt(e.target.value)||0)}))} /></div>
              </div>

              <div className="section-title">Servizi</div>
              <div style={{ display:"flex", flexWrap:"wrap", marginBottom:12 }}>
                {SERVICES.map(s=><span key={s.id} className={`service-chip${(form.services||[]).includes(s.id)?" sel":""}`}
                  onClick={()=>setForm(f=>({...f,services:f.services?.includes(s.id)?f.services.filter(x=>x!==s.id):[...(f.services||[]),s.id]}))}>
                  {(form.services||[]).includes(s.id)?"✓ ":""}{s.label} <span style={{ color:C.text3 }}>+€{s.price}/n</span>
                </span>)}
              </div>

              <hr className="divider"/>
              <div className="section-title">Dettagli Soggiorno</div>
              <div className="form-grid" style={{ marginBottom:12 }}>
                <div>
                  <label className="label">Trattamento</label>
                  <select className="input-field" value={form.trattamento||""} onChange={e=>setForm(f=>({...f,trattamento:e.target.value}))}>
                    <option value="">— Seleziona —</option>
                    <option value="RO">RO · Solo Pernottamento</option>
                    <option value="BB">BB · Bed & Breakfast</option>
                    <option value="HB">HB · Mezza Pensione</option>
                    <option value="FB">FB · Pensione Completa</option>
                    <option value="AI">AI · All Inclusive</option>
                  </select>
                </div>
                <div>
                  <label className="label">Canale di Provenienza</label>
                  <select className="input-field" value={form.canale||""} onChange={e=>setForm(f=>({...f,canale:e.target.value}))}>
                    <option value="">— Seleziona —</option>
                    <option value="booking">Booking.com</option>
                    <option value="expedia">Expedia</option>
                    <option value="airbnb">Airbnb</option>
                    <option value="direct-web">Sito Web diretto</option>
                    <option value="telefono">Telefono</option>
                    <option value="email">Email</option>
                    <option value="walk-in">Walk-in</option>
                    <option value="agenzia">Agenzia di Viaggi</option>
                    <option value="to">Tour Operator</option>
                    <option value="gds">GDS (Amadeus/Galileo)</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="label">Motivo del Soggiorno</label>
                  <select className="input-field" value={form.motivoSoggiorno||""} onChange={e=>setForm(f=>({...f,motivoSoggiorno:e.target.value}))}>
                    <option value="">— Seleziona —</option>
                    <option value="leisure">Leisure / Vacanza</option>
                    <option value="business">Business / Lavoro</option>
                    <option value="mice">MICE / Congresso</option>
                    <option value="evento">Evento / Cerimonia</option>
                    <option value="luna-di-miele">Luna di Miele</option>
                    <option value="anniversario">Anniversario</option>
                    <option value="famiglia">Visita Familiare</option>
                    <option value="sport">Sport / Competizione</option>
                    <option value="salute">Salute / Benessere</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
                <div>
                  <label className="label">Lingua Preferita</label>
                  <select className="input-field" value={form.linguaOspite||""} onChange={e=>setForm(f=>({...f,linguaOspite:e.target.value}))}>
                    <option value="">— Seleziona —</option>
                    <option value="it">🇮🇹 Italiano</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="fr">🇫🇷 Français</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="pt">🇵🇹 Português</option>
                    <option value="ru">🇷🇺 Русский</option>
                    <option value="zh">🇨🇳 中文</option>
                    <option value="ja">🇯🇵 日本語</option>
                    <option value="ar">🇸🇦 العربية</option>
                    <option value="nl">🇳🇱 Nederlands</option>
                    <option value="pl">🇵🇱 Polski</option>
                  </select>
                </div>
                <div>
                  <label className="label">Mercato di Provenienza</label>
                  <select className="input-field" value={form.mercato||""} onChange={e=>setForm(f=>({...f,mercato:e.target.value}))}>
                    <option value="">— Seleziona —</option>
                    <optgroup label="Italia">
                      <option value="IT-nord">Nord Italia</option>
                      <option value="IT-centro">Centro Italia</option>
                      <option value="IT-sud">Sud Italia e Isole</option>
                    </optgroup>
                    <optgroup label="Europa">
                      <option value="EU-dach">DACH (Germania/Austria/Svizzera)</option>
                      <option value="EU-uk">Regno Unito</option>
                      <option value="EU-fr">Francia</option>
                      <option value="EU-benelux">Benelux</option>
                      <option value="EU-scandinavia">Scandinavia</option>
                      <option value="EU-est">Europa Orientale</option>
                      <option value="EU-other">Altro Europa</option>
                    </optgroup>
                    <optgroup label="Resto del Mondo">
                      <option value="AM-nord">Nord America</option>
                      <option value="AM-sud">Sud America</option>
                      <option value="ASIA">Asia</option>
                      <option value="MENA">Medio Oriente / Africa</option>
                      <option value="OCE">Oceania</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              <div><label className="label">Note</label><textarea className="input-field" rows={2} value={form.notes||""} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{ resize:"none" }} /></div>

              {modal==="edit-res" && form.status==="checked-in" && (
                <>
                  <hr className="divider"/>
                  <div className="section-title">Extra in Camera</div>
                  {(form.roomServiceItems||[]).map((item,i)=><div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:`1px solid ${C.border}` }}><span>{item.date} · {item.desc}</span><span style={{ color:C.gold, fontWeight:700 }}>€{item.price.toFixed(2)}</span></div>)}
                  <div style={{ display:"flex", gap:7, marginTop:8 }}>
                    <input className="input-field" placeholder="Descrizione..." style={{ flex:2 }} value={form.rsDesc||""} onChange={e=>setForm(f=>({...f,rsDesc:e.target.value}))} />
                    <input className="input-field" placeholder="€" type="number" style={{ flex:1 }} value={form.rsPrice||""} onChange={e=>setForm(f=>({...f,rsPrice:e.target.value}))} />
                    <button className="btn-secondary" onClick={addRoomService}>+</button>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              {modal==="edit-res" && !["checked-out","cancelled"].includes(form.status) && <button className="btn-danger" onClick={()=>cancelReservation(form.id)}>Annulla Pren.</button>}
              {modal==="edit-res" && <button className="btn-secondary" onClick={()=>openInvoice(form)}>Conto</button>}
              {modal==="edit-res" && <button className="btn-secondary" style={{ gap:5 }} onClick={()=>{ const g2=guests.find(x=>x.id===form.id); setEmailPreviewRes({...form}); setEmailTo(guests.find(x=>x.id===form.guestId)?.email||""); setEmailCc(""); setEmailTab("preview"); setModal(null); }}>✉ Email Conferma</button>}
              <button className="btn-secondary" onClick={()=>setModal(null)}>Chiudi</button>
              {!["checked-out","cancelled"].includes(form.status) && <button className="btn-primary" onClick={saveReservation}>Salva</button>}
            </div>
          </div>
        </div>
      )}

      {/*   MODAL: CHECKOUT   */}
      {modal==="checkout" && form && (() => {
        const tot     = calcTotal(form);
        const tax     = tot * TAX_RATE;
        const grand   = tot + tax;
        const paid    = calcPaid(form);
        const bal     = grand - paid;
        const lines   = buildInvoiceLines(form);
        const n       = nights(form.checkIn, form.checkOut);
        const room    = rooms.find(r => r.id === form.roomId) || ROOMS.find(r => r.id === form.roomId);

        // Ricalcola importi equali quando cambiano le persone
        const recalcEquale = (persone) => {
          const share = parseFloat((grand / persone.length).toFixed(2));
          return persone.map((p, i) => ({
            ...p,
            importo: i === persone.length-1
              ? parseFloat((grand - share * (persone.length-1)).toFixed(2))
              : share
          }));
        };

        const totaleSplit  = splitPersone.reduce((s,p) => s + (parseFloat(p.importo)||0), 0);
        const differenza   = parseFloat((grand - totaleSplit).toFixed(2));
        const tuttiPagati  = splitPersone.length > 0 && splitPersone.every(p => p.paid);
        const splitValido  = splitPersone.length > 0 && Math.abs(differenza) < 0.05;

        const METHODS = ["Carta di Credito","Carta di Debito","Contanti","Bonifico","Buono Regalo"];

        return (
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
            <div className="modal-box" style={{ maxWidth: splitMode ? 860 : 500 }}>

              {/* Header */}
              <div className="modal-header">
                <h2 style={{ fontSize:20, fontWeight:600 }}>Check-Out — {form.guestName}</h2>
                <div style={{ fontSize:12, color:C.text3 }}>Camera {form.roomId} · {fmtDate(form.checkIn)} → {fmtDate(form.checkOut)} · {n} notti</div>
              </div>

              <div className="modal-body">
                <div style={{ display:"grid", gridTemplateColumns: splitMode ? "1fr 1fr" : "1fr", gap:18 }}>

                  {/*   Colonna sinistra: riepilogo conto   */}
                  <div>
                    {/* Riepilogo importo */}
                    <div style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:8, padding:14, marginBottom:14 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Riepilogo Conto</div>
                      {lines.map(l => (
                        <div key={l.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0", borderBottom:`1px solid ${C.border}` }}>
                          <span style={{ color:C.text2 }}>{l.desc}</span>
                          <span style={{ fontWeight:600 }}>€{l.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"6px 0", color:C.text3 }}><span>Imponibile</span><span>€{tot.toFixed(2)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", color:C.text3 }}><span>IVA 10%</span><span>€{tax.toFixed(2)}</span></div>
                      {paid > 0 && <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", color:C.green }}><span>Già pagato</span><span>−€{paid.toFixed(2)}</span></div>}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:17, fontWeight:700, padding:"8px 0", marginTop:4, borderTop:`2px solid ${C.border}` }}>
                        <span>TOTALE DA SALDARE</span>
                        <span style={{ color:C.gold }}>€{bal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Bottone split */}
                    {!splitMode ? (
                      <div>
                        <div style={{ fontSize:11, color:C.text3, marginBottom:10 }}>Scegli come procedere con il pagamento:</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                          <button className="btn-primary" onClick={finalizeCheckout} style={{ justifyContent:"center" }}>
                            ✓ Pagamento Unico — Emetti Conto
                          </button>
                          <button onClick={() => initSplit(form, 2)}
                            style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"10px 16px", background:C.navyL, border:`1px solid ${C.navyLb}`, borderRadius:8, color:C.navy, fontWeight:700, fontSize:13, cursor:"pointer" }}>
                            ⊘ Dividi il Conto
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {/* Controlli split */}
                        <div style={{ marginBottom:12 }}>
                          <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Tipo di divisione</div>
                          <div style={{ display:"flex", gap:0, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden", marginBottom:10 }}>
                            {[["equale","⊘ Parti uguali"],["personalizzata","✎ Importi liberi"],["per_voce","📋 Per voce"]].map(([v,l]) => (
                              <button key={v} onClick={() => {
                                setSplitType(v);
                                if (v==="equale") setSplitPersone(p => recalcEquale(p));
                              }} style={{ flex:1, padding:"8px 4px", background:splitType===v?C.navy:C.surface, color:splitType===v?"#fff":C.text2, border:"none", fontWeight:600, fontSize:11, cursor:"pointer", transition:"all .2s" }}>{l}</button>
                            ))}
                          </div>

                          {/* N° persone */}
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                            <span style={{ fontSize:13, color:C.text2, fontWeight:600 }}>Persone:</span>
                            <div style={{ display:"flex", gap:0, border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                              {[2,3,4,5,6].map(n => (
                                <button key={n} onClick={() => {
                                  const newP = Array.from({length:n}, (_,i) => splitPersone[i] || {
                                    id:i, nome:`Persona ${i+1}`, importo:0, items:[], method:"Carta di Credito", paid:false
                                  });
                                  const updated = splitType==="equale" ? recalcEquale(newP) : newP;
                                  setSplitPersone(updated);
                                  if (splitTab >= n) setSplitTab(n-1);
                                }} style={{ padding:"7px 14px", background:splitPersone.length===n?C.gold:C.surface, color:splitPersone.length===n?"#fff":C.text2, border:"none", fontWeight:700, fontSize:13, cursor:"pointer" }}>{n}</button>
                              ))}
                            </div>
                            {differenza !== 0 && Math.abs(differenza) > 0.01 && (
                              <span style={{ fontSize:11, fontWeight:700, color: differenza>0?C.red:C.green }}>
                                {differenza>0 ? `⚠ mancano €${differenza.toFixed(2)}` : `⚠ eccesso €${Math.abs(differenza).toFixed(2)}`}
                              </span>
                            )}
                            {splitValido && <span style={{ fontSize:11, color:C.green, fontWeight:700 }}>✓ Totale corretto</span>}
                          </div>
                        </div>

                        {/* Barra progressione pagamenti */}
                        <div style={{ marginBottom:12 }}>
                          <div style={{ height:6, background:C.border, borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:6, background:C.green, width:`${(splitPersone.filter(p=>p.paid).length/Math.max(splitPersone.length,1))*100}%`, transition:"width .4s", borderRadius:3 }}/>
                          </div>
                          <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>
                            {splitPersone.filter(p=>p.paid).length}/{splitPersone.length} pagamenti completati
                          </div>
                        </div>

                        <button className="btn-secondary" style={{ width:"100%", fontSize:11 }} onClick={() => { setSplitMode(false); setSplitPersone([]); }}>← Torna al pagamento unico</button>
                      </div>
                    )}
                  </div>

                  {/*   Colonna destra: persone split   */}
                  {splitMode && splitPersone.length > 0 && (
                    <div>
                      {/* Tab persone */}
                      <div style={{ display:"flex", gap:4, marginBottom:14, flexWrap:"wrap" }}>
                        {splitPersone.map((p, i) => (
                          <button key={i} onClick={() => setSplitTab(i)} style={{
                            padding:"6px 14px", borderRadius:20, fontWeight:700, fontSize:12, cursor:"pointer", border:"none", transition:"all .2s",
                            background: p.paid ? C.greenL : splitTab===i ? C.gold : C.surface2,
                            color: p.paid ? C.green : splitTab===i ? "#fff" : C.text2,
                            outline: splitTab===i ? `2px solid ${C.gold}` : "none"
                          }}>
                            {p.paid ? "✓ " : ""}{p.nome.length > 10 ? p.nome.slice(0,9)+"…" : p.nome}
                            <span style={{ marginLeft:5, fontSize:11 }}>€{p.importo.toFixed(0)}</span>
                          </button>
                        ))}
                      </div>

                      {/* Scheda persona attiva */}
                      {(() => {
                        const p = splitPersone[splitTab];
                        if (!p) return null;
                        return (
                          <div style={{ background:C.surface2, border:`1.5px solid ${p.paid ? C.greenLb : C.border}`, borderRadius:10, padding:16 }}>
                            {/* Nome */}
                            <div style={{ marginBottom:10 }}>
                              <label className="label">Nome</label>
                              <input className="input-field" value={p.nome}
                                onChange={e => setSplitPersone(prev => prev.map((x,i) => i===splitTab?{...x,nome:e.target.value}:x))} />
                            </div>

                            {/* Importo */}
                            {splitType !== "per_voce" && (
                              <div style={{ marginBottom:12 }}>
                                <label className="label">Importo da pagare (€)</label>
                                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                  <input type="number" className="input-field" value={p.importo} min={0} step={0.01}
                                    readOnly={splitType==="equale"}
                                    onChange={e => {
                                      const val = parseFloat(e.target.value)||0;
                                      setSplitPersone(prev => prev.map((x,i) => i===splitTab?{...x,importo:val}:x));
                                    }}
                                    style={{ flex:1, fontSize:18, fontWeight:700, color:C.gold, background: splitType==="equale"?C.surface2:"white" }} />
                                  <div style={{ textAlign:"right" }}>
                                    <div style={{ fontSize:13, color:C.text2 }}>{grand > 0 ? Math.round((p.importo/grand)*100) : 0}%</div>
                                    <div style={{ fontSize:10, color:C.text3 }}>del totale</div>
                                  </div>
                                </div>
                                {splitType==="equale" && (
                                  <div style={{ fontSize:10, color:C.text3, marginTop:3 }}>Importo calcolato automaticamente</div>
                                )}
                              </div>
                            )}

                            {/* Vista per voce */}
                            {splitType==="per_voce" && (
                              <div style={{ marginBottom:12 }}>
                                <label className="label">Seleziona le voci da addebitare</label>
                                <div style={{ maxHeight:130, overflowY:"auto" }}>
                                  {lines.map(l => {
                                    const checked = (p.items||[]).some(x=>x.id===l.id);
                                    const disabledBy = splitPersone.findIndex((x,i) => i!==splitTab && (x.items||[]).some(y=>y.id===l.id));
                                    const disabled = disabledBy >= 0;
                                    return (
                                      <div key={l.id} onClick={() => {
                                        if (disabled) return;
                                        setSplitPersone(prev => prev.map((x,i) => {
                                          if (i!==splitTab) return x;
                                          const newItems = checked ? x.items.filter(y=>y.id!==l.id) : [...(x.items||[]),l];
                                          const newImporto = newItems.reduce((s,item)=>s+item.amount*(1+TAX_RATE),0);
                                          return {...x, items:newItems, importo:parseFloat(newImporto.toFixed(2))};
                                        }));
                                      }} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 8px", borderRadius:6, marginBottom:3, cursor:disabled?"not-allowed":"pointer", opacity:disabled?0.4:1, background:checked?C.goldL:C.surface, border:`1px solid ${checked?C.goldLb:C.border}` }}>
                                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                                          <div style={{ width:16, height:16, borderRadius:4, background:checked?C.gold:C.surface, border:`2px solid ${checked?C.gold:C.border2}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                                            {checked && <span style={{ color:"white", fontSize:10, fontWeight:900 }}>✓</span>}
                                          </div>
                                          <span style={{ fontSize:12, color:checked?C.gold:C.text }}>{l.desc}</span>
                                        </div>
                                        <div style={{ textAlign:"right" }}>
                                          <span style={{ fontWeight:700, fontSize:12 }}>€{l.amount.toFixed(2)}</span>
                                          {disabled && <div style={{ fontSize:9, color:C.text3 }}>{splitPersone[disabledBy]?.nome}</div>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ fontSize:11, fontWeight:700, color:C.gold, marginTop:8, textAlign:"right" }}>
                                  Subtotale: €{p.importo.toFixed(2)}
                                </div>
                              </div>
                            )}

                            {/* Metodo pagamento */}
                            <div style={{ marginBottom:14 }}>
                              <label className="label">Metodo di pagamento</label>
                              <select className="input-field" value={p.method}
                                onChange={e => setSplitPersone(prev => prev.map((x,i) => i===splitTab?{...x,method:e.target.value}:x))}>
                                {METHODS.map(m => <option key={m}>{m}</option>)}
                              </select>
                            </div>

                            {/* Bottone paga */}
                            {!p.paid ? (
                              <button className="btn-primary" style={{ width:"100%" }}
                                onClick={() => {
                                  if (p.importo <= 0) { showToast("Importo non valido","error"); return; }
                                  setSplitPersone(prev => prev.map((x,i) => i===splitTab?{...x,paid:true}:x));
                                  showToast(`${p.nome} — €${p.importo.toFixed(2)} (${p.method}) ✓`);
                                  // Avanza alla prossima persona non pagata
                                  const next = splitPersone.findIndex((x,i) => i>splitTab && !x.paid);
                                  if (next>=0) setSplitTab(next);
                                }}>
                                💳 Incassa €{p.importo.toFixed(2)} — {p.nome}
                              </button>
                            ) : (
                              <div style={{ background:C.greenL, border:`1px solid ${C.greenLb}`, borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <span style={{ color:C.green, fontWeight:700 }}>✓ Pagato — €{p.importo.toFixed(2)}</span>
                                <button onClick={() => setSplitPersone(prev => prev.map((x,i) => i===splitTab?{...x,paid:false}:x))}
                                  style={{ background:"none", border:`1px solid ${C.greenLb}`, borderRadius:6, padding:"3px 8px", fontSize:11, color:C.green, cursor:"pointer" }}>Annulla</button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Riepilogo split */}
                      <div style={{ marginTop:14, padding:"10px 14px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:8 }}>
                        <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Riepilogo Divisione</div>
                        {splitPersone.map((p,i) => (
                          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 0", fontSize:12, borderBottom:`1px solid ${C.border}` }}>
                            <span style={{ color: p.paid?C.green:C.text2 }}>{p.paid?"✓ ":""}{p.nome}</span>
                            <div style={{ textAlign:"right" }}>
                              <span style={{ fontWeight:700, color:p.paid?C.green:C.gold }}>€{p.importo.toFixed(2)}</span>
                              <span style={{ fontSize:10, color:C.text3, marginLeft:5 }}>({p.method.split(" ")[0]})</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:13, marginTop:6, padding:"4px 0" }}>
                          <span>Totale diviso</span>
                          <span style={{ color: splitValido?C.green: Math.abs(differenza)<0.01?C.green:C.red }}>€{totaleSplit.toFixed(2)} / €{grand.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={()=>setModal(null)}>Annulla</button>
                {!splitMode && (
                  <button className="btn-primary" onClick={finalizeCheckout}>Conferma & Emetti Conto</button>
                )}
                {splitMode && (
                  <button className="btn-primary"
                    disabled={!tuttiPagati || !splitValido}
                    style={{ opacity: (tuttiPagati && splitValido) ? 1 : 0.5, cursor: (tuttiPagati && splitValido)?"pointer":"not-allowed" }}
                    onClick={() => {
                      // Registra tutti i pagamenti split e finalizza
                      let res = {...form};
                      splitPersone.forEach(p => {
                        res = {...res, payments:[...(res.payments||[]),{amount:p.importo,method:p.method+" (Split: "+p.nome+")",date:new Date().toLocaleDateString("it-IT")}]};
                      });
                      setForm(res);
                      setReservations(prev => prev.map(r => r.id===res.id ? res : r));
                      finalizeCheckout();
                    }}>
                    {tuttiPagati && splitValido ? "✓ Finalizza Check-Out" : !splitValido ? "⚠ Correggi importi" : `In attesa di ${splitPersone.filter(p=>!p.paid).length} pagamenti`}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/*   MODAL: ANTEPRIMA EMAIL CONFERMA   */}
      {emailPreviewRes && (() => {
        const res = emailPreviewRes;
        const g   = guests.find(x => x.id === res.guestId);
        const htmlEmail = buildConfirmEmail(res, g);
        const subject   = `Conferma Prenotazione ${res.id} — Hotel Gasparini`;
        const subjectEnc = encodeURIComponent(subject);
        const textBody  = encodeURIComponent(
          `Gentile ${g ? g.cognome+" "+g.nome : res.guestName||"Ospite"},\n\nLa sua prenotazione ${res.id} è stata confermata.\n\nCamera: ${res.roomId} | Check-In: ${res.checkIn} | Check-Out: ${res.checkOut}\nImporto: €${calcTotal(res).toFixed(2)}\n\nPer qualsiasi informazione siamo a sua disposizione.\n\nCordiali saluti,\nHotel Gasparini — Chioggia (VE)\n📞 +39 041 400 000 | info@hotelgasparini.it`
        );
        const mailtoUrl = `mailto:${emailTo}${emailCc?`?cc=${encodeURIComponent(emailCc)}&`:"?"}subject=${subjectEnc}&body=${textBody}`;

        const copyHtml = () => {
          navigator.clipboard.writeText(htmlEmail)
            .then(() => showToast("HTML email copiato negli appunti ✓"))
            .catch(() => showToast("Copia non riuscita","error"));
        };
        const downloadHtml = () => {
          const blob = new Blob([htmlEmail], { type:"text/html" });
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `conferma-${res.id}.html`;
          a.click();
          showToast("File HTML scaricato ✓");
        };
        const printEmail = () => {
          const win = window.open("","_blank");
          win.document.write(htmlEmail);
          win.document.close();
          win.focus();
          win.print();
        };

        return (
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEmailPreviewRes(null)}
            style={{ zIndex:600 }}>
            <div style={{ background:"#fff", borderRadius:12, width:"min(94vw,860px)", maxHeight:"95vh",
              display:"flex", flexDirection:"column", boxShadow:"0 24px 70px rgba(0,0,0,.28)", overflow:"hidden" }}>

              {/* ── Header ── */}
              <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, background:C.navy }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:"#90b4d4", letterSpacing:2, marginBottom:2 }}>EMAIL CONFERMA PRENOTAZIONE</div>
                  <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{res.id} · {res.guestName}</div>
                </div>
                <button onClick={()=>setEmailPreviewRes(null)} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#90b4d4", lineHeight:1 }}>×</button>
              </div>

              {/* ── Composition strip ── */}
              <div style={{ padding:"14px 22px", borderBottom:`1px solid ${C.border}`, background:"#f8fafc", flexShrink:0 }}>
                {/* Campo A: */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.text3, width:40, flexShrink:0 }}>A:</span>
                  <input className="input-field" style={{ flex:1, fontSize:13 }}
                    placeholder="email@destinatario.it"
                    value={emailTo} onChange={e=>setEmailTo(e.target.value)} />
                  {g?.email && emailTo !== g.email && (
                    <button onClick={()=>setEmailTo(g.email||"")}
                      style={{ fontSize:11, background:C.navyL, border:`1px solid ${C.navyLb}`, borderRadius:5, padding:"4px 10px", cursor:"pointer", color:C.navy, whiteSpace:"nowrap", fontWeight:600 }}>
                      ← Ospite: {g.email}
                    </button>
                  )}
                </div>
                {/* Campo CC: */}
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.text3, width:40, flexShrink:0 }}>CC:</span>
                  <input className="input-field" style={{ flex:1, fontSize:13 }}
                    placeholder="info@hotelgasparini.it (opzionale)"
                    value={emailCc} onChange={e=>setEmailCc(e.target.value)} />
                </div>
                {/* Oggetto (statico) */}
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:11, fontWeight:700, color:C.text3, width:40, flexShrink:0 }}>Ogg:</span>
                  <span style={{ fontSize:13, color:C.text2, background:"#fff", border:`1px solid ${C.border}`, borderRadius:6, padding:"6px 12px", flex:1 }}>{subject}</span>
                </div>
              </div>

              {/* ── Tabs Anteprima / HTML ── */}
              <div style={{ display:"flex", gap:0, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
                {[["preview","👁 Anteprima"],["html","</> Codice HTML"]].map(([t,l])=>(
                  <button key={t} onClick={()=>setEmailTab(t)}
                    style={{ padding:"10px 20px", border:"none", cursor:"pointer", fontSize:12, fontWeight:600,
                      background: emailTab===t ? "#fff" : C.surface2,
                      color: emailTab===t ? C.navy : C.text3,
                      borderBottom: emailTab===t ? `2px solid ${C.navy}` : "2px solid transparent" }}>
                    {l}
                  </button>
                ))}
                {/* Info badge */}
                <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", padding:"0 16px", gap:8 }}>
                  {emailTo
                    ? <span style={{ fontSize:11, background:C.greenL, border:`1px solid ${C.greenLb}`, color:C.green, padding:"2px 9px", borderRadius:12, fontWeight:600 }}>✓ Destinatario impostato</span>
                    : <span style={{ fontSize:11, background:C.goldL, border:`1px solid ${C.goldLb}`, color:C.gold, padding:"2px 9px", borderRadius:12, fontWeight:600 }}>⚠ Imposta un destinatario</span>}
                </div>
              </div>

              {/* ── Corpo: anteprima iframe o codice ── */}
              <div style={{ flex:1, overflow:"hidden", background: emailTab==="preview" ? "#e8edf3" : "#1e293b", padding:16 }}>
                {emailTab==="preview" ? (
                  <iframe
                    srcDoc={htmlEmail}
                    title="Anteprima email"
                    style={{ width:"100%", height:"100%", border:"none", borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,.15)", background:"#fff" }}
                    sandbox="allow-same-origin"
                  />
                ) : (
                  <div style={{ height:"100%", overflow:"auto" }}>
                    <pre style={{ color:"#e2e8f0", fontSize:11, lineHeight:1.6, whiteSpace:"pre-wrap", fontFamily:"'JetBrains Mono',Consolas,monospace", margin:0 }}>
                      {htmlEmail}
                    </pre>
                  </div>
                )}
              </div>

              {/* ── Footer azioni ── */}
              <div style={{ padding:"12px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexShrink:0, background:"#fafbfc" }}>
                <div style={{ display:"flex", gap:6 }}>
                  <button className="btn-secondary" onClick={copyHtml} style={{ fontSize:12 }} title="Copia sorgente HTML">
                    📋 Copia HTML
                  </button>
                  <button className="btn-secondary" onClick={downloadHtml} style={{ fontSize:12 }} title="Scarica file .html">
                    ⬇ Scarica .html
                  </button>
                  <button className="btn-secondary" onClick={printEmail} style={{ fontSize:12 }} title="Stampa / Salva PDF">
                    🖨 Stampa
                  </button>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <a href={emailTo ? mailtoUrl : "#"} onClick={e=>{ if(!emailTo){e.preventDefault(); showToast("Inserisci un indirizzo email destinatario","error"); }}}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 14px",
                      background: emailTo ? C.surface2 : "#f0f0f0",
                      border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, fontWeight:600,
                      color: emailTo ? C.text2 : C.text3, textDecoration:"none", cursor: emailTo ? "pointer" : "not-allowed" }}>
                    ✉ Apri client posta
                  </a>
                  <a href={emailTo ? mailtoUrl : "#"} onClick={e=>{ if(!emailTo){e.preventDefault(); showToast("Inserisci un indirizzo email destinatario","error"); }}}
                    style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"8px 18px",
                      background: emailTo ? C.navy : "#ccc",
                      border:`1px solid ${emailTo ? C.navy : "#ccc"}`, borderRadius:6, fontSize:13,
                      fontWeight:700, color:"#fff", textDecoration:"none", cursor: emailTo ? "pointer" : "not-allowed" }}>
                    📤 Invia{emailTo ? ` a ${emailTo.split("@")[0]}…` : ""}
                  </a>
                  <button className="btn-secondary" onClick={()=>setEmailPreviewRes(null)} style={{ fontSize:12 }}>Chiudi</button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/*   MODAL: FATTURA   */}
      {modal==="invoice" && invoiceRes && (() => {
        const r={...invoiceRes,...reservations.find(x=>x.id===invoiceRes.id)};
        const room=ROOMS.find(x=>x.id===r.roomId);
        const n=nights(r.checkIn,r.checkOut);
        const svcLines=(r.services||[]).map(sid=>{const s=SERVICES.find(x=>x.id===sid); return s?{label:s.label,price:s.price*n}:null;}).filter(Boolean);
        const sub=calcTotal(r), tax=sub*TAX_RATE, grand=sub+tax, paid=calcPaid(r), bal=grand-paid;
        const g=getGuest(r.guestId);
        return (
          <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
            <div className="modal-box" style={{ maxWidth:660 }}>
              <div className="modal-header no-print">
                <h2 style={{ fontSize:22, fontWeight:600 }}>Conto / Ricevuta</h2>
                <div style={{ display:"flex", gap:7 }}>
                  <button className="btn-secondary" onClick={()=>window.print()}>🖨 Stampa</button>
                  <button className="btn-secondary" onClick={()=>setModal(null)}>Chiudi</button>
                </div>
              </div>
              <div className="modal-body">
                {bal>0 && (
                  <div className="no-print" style={{ background:C.goldL, border:`1px solid ${C.goldLb}`, padding:14, borderRadius:8, marginBottom:16 }}>
                    <div className="section-title" style={{ marginBottom:9 }}>Registra Pagamento</div>
                    <div style={{ display:"flex", gap:7 }}>
                      <input id="pay-amt" className="input-field" type="number" defaultValue={bal.toFixed(2)} style={{ flex:1 }} />
                      <select id="pay-mth" className="input-field" style={{ flex:1 }}>{["Contanti","Carta di Credito","Carta di Debito","Bonifico","Buono Regalo"].map(m=><option key={m}>{m}</option>)}</select>
                      <button className="btn-primary" onClick={()=>{const a=document.getElementById("pay-amt").value; const m=document.getElementById("pay-mth").value; if(a>0)addPayment(r,a,m);}}>Registra</button>
                    </div>
                  </div>
                )}
                <div className="invoice-paper">
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:22, borderBottom:"2px solid #1a1a1a", paddingBottom:16 }}>
                    <div>
                      <div style={{ fontSize:26, fontWeight:700, letterSpacing:4, fontFamily:"IBM Plex Sans,sans-serif" }}>HOTEL GASPARINI</div>
                      <div style={{ fontSize:10, color:"#666", letterSpacing:2 }}>Via della Repubblica, 1 · Venezia (VE)</div>
                      <div style={{ fontSize:11, color:"#444", marginTop:5 }}>P.IVA: IT01234567890 · Tel: +39 041 1234567</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:18, fontWeight:700, color:"#003580" }}>CONTO FINALE</div>
                      <div style={{ fontSize:11, color:"#666" }}>N° {r.id} · {new Date().toLocaleDateString("it-IT")}</div>
                    </div>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                    <div>
                      <div style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:"#888", marginBottom:3 }}>Ospite</div>
                      <div style={{ fontWeight:700, fontSize:16 }}>{r.guestName}</div>
                      {g&&<div style={{ fontSize:11, color:"#555" }}>{g.tipoDoc}: {g.numDoc}</div>}
                      {g&&<div style={{ fontSize:11, color:"#555" }}>{g.indirizzo}, {g.citta} {g.cap}</div>}
                    </div>
                    <div>
                      <div style={{ fontSize:9, letterSpacing:2, textTransform:"uppercase", color:"#888", marginBottom:3 }}>Soggiorno</div>
                      <div style={{ fontSize:14 }}>Camera {r.roomId} — {room?.type}</div>
                      <div style={{ fontSize:11, color:"#555" }}>{fmtDate(r.checkIn)} → {fmtDate(r.checkOut)} · {n} notti · {r.guests} ospiti</div>
                    </div>
                  </div>
                  <div style={{ background:"#f0f4ff", padding:"7px 10px", fontWeight:700, fontSize:12, display:"flex", justifyContent:"space-between" }}><span>Descrizione</span><span>Importo</span></div>
                  <div className="invoice-line"><span>Camera {r.roomId} ({room?.type}) — {n} notti × €{room?.price}</span><span>€{((room?.price||0)*n).toFixed(2)}</span></div>
                  {svcLines.map((s,i)=><div key={i} className="invoice-line"><span>{s.label} — {n} notti</span><span>€{s.price.toFixed(2)}</span></div>)}
                  {(r.roomServiceItems||[]).map((item,i)=><div key={i} className="invoice-line"><span>Extra ({item.date}): {item.desc}</span><span>€{item.price.toFixed(2)}</span></div>)}
                  <div className="invoice-line" style={{ color:"#666" }}><span>Imponibile</span><span>€{sub.toFixed(2)}</span></div>
                  <div className="invoice-line" style={{ color:"#666" }}><span>IVA 10%</span><span>€{tax.toFixed(2)}</span></div>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 0", fontSize:17, fontWeight:700, borderTop:"2px solid #1a1a1a" }}><span>TOTALE</span><span>€{grand.toFixed(2)}</span></div>
                  {(r.payments||[]).length>0 && (
                    <div style={{ marginTop:10, borderTop:"1px solid #eee", paddingTop:8 }}>
                      <div style={{ fontSize:10, letterSpacing:1, textTransform:"uppercase", color:"#888", marginBottom:5 }}>Pagamenti</div>
                      {(r.payments||[]).map((p,i)=><div key={i} className="invoice-line" style={{ color:"#155724" }}><span>{p.date} · {p.method}</span><span>-€{p.amount.toFixed(2)}</span></div>)}
                      <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", fontWeight:700, color:bal<=0?"#155724":"#c0392b", fontSize:14 }}>
                        <span>{bal<=0?"✓ SALDATO":"SALDO RIMANENTE"}</span><span>€{Math.abs(bal).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop:18, fontSize:11, color:"#aaa", textAlign:"center", borderTop:"1px solid #eee", paddingTop:10 }}>Grazie per aver scelto Hotel Gasparini · A presto</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

        {/*   API & INTEGRAZIONI   */}
        {page==="API & Integrazioni" && (() => {
          const REST_ENDPOINTS = [
            // Prenotazioni
            { method:"GET",    path:"/api/v1/reservations",         desc:"Lista tutte le prenotazioni", group:"Prenotazioni",  params:"?status=&from=&to=" },
            { method:"GET",    path:"/api/v1/reservations/:id",     desc:"Dettaglio prenotazione",      group:"Prenotazioni",  params:"" },
            { method:"POST",   path:"/api/v1/reservations",         desc:"Crea nuova prenotazione",     group:"Prenotazioni",  params:"body: {roomId,guestId,checkIn,checkOut,...}" },
            { method:"PUT",    path:"/api/v1/reservations/:id",     desc:"Aggiorna prenotazione",       group:"Prenotazioni",  params:"body: partial reservation" },
            { method:"DELETE", path:"/api/v1/reservations/:id",     desc:"Annulla prenotazione",        group:"Prenotazioni",  params:"" },
            { method:"POST",   path:"/api/v1/reservations/:id/checkin",  desc:"Esegui check-in",        group:"Prenotazioni",  params:"" },
            { method:"POST",   path:"/api/v1/reservations/:id/checkout", desc:"Esegui check-out",       group:"Prenotazioni",  params:"" },
            // Camere
            { method:"GET",    path:"/api/v1/rooms",                desc:"Lista tutte le camere",       group:"Camere",       params:"?type=&floor=&available=" },
            { method:"GET",    path:"/api/v1/rooms/:id",            desc:"Dettaglio camera",            group:"Camere",       params:"" },
            { method:"GET",    path:"/api/v1/rooms/:id/availability",desc:"Disponibilità camera",       group:"Camere",       params:"?from=&to=" },
            { method:"PUT",    path:"/api/v1/rooms/:id/price",      desc:"Aggiorna prezzo camera",      group:"Camere",       params:"body: {price}" },
            // Ospiti
            { method:"GET",    path:"/api/v1/guests",               desc:"Lista ospiti",                group:"Ospiti",       params:"?q=&nazionalita=" },
            { method:"GET",    path:"/api/v1/guests/:id",           desc:"Profilo ospite",              group:"Ospiti",       params:"" },
            { method:"POST",   path:"/api/v1/guests",               desc:"Registra nuovo ospite",       group:"Ospiti",       params:"body: guest object" },
            { method:"PUT",    path:"/api/v1/guests/:id",           desc:"Aggiorna profilo ospite",     group:"Ospiti",       params:"body: partial guest" },
            // Disponibilità
            { method:"GET",    path:"/api/v1/availability",         desc:"Disponibilità generale",      group:"Disponibilità",params:"?from=&to=&type=" },
            { method:"GET",    path:"/api/v1/availability/heatmap", desc:"Heatmap occupazione",         group:"Disponibilità",params:"?from=&to=" },
            // Revenue
            { method:"GET",    path:"/api/v1/revenue/kpi",          desc:"KPI: RevPAR, ADR, OCC",       group:"Revenue",      params:"?date=" },
            { method:"GET",    path:"/api/v1/revenue/forecast",     desc:"Forecast revenue",            group:"Revenue",      params:"?days=30" },
            { method:"GET",    path:"/api/v1/pricing/rules",        desc:"Lista regole pricing",        group:"Revenue",      params:"" },
            { method:"POST",   path:"/api/v1/pricing/rules",        desc:"Crea regola pricing",         group:"Revenue",      params:"body: pricing rule" },
            // Pubblica Sicurezza
            { method:"GET",    path:"/api/v1/ps/schedine",          desc:"Schedine PS del mese",        group:"Compliance",   params:"?month=YYYY-MM" },
            { method:"POST",   path:"/api/v1/ps/transmit",          desc:"Trasmetti schedine",          group:"Compliance",   params:"body: {reservationIds:[]}" },
            { method:"GET",    path:"/api/v1/istat/report",         desc:"Report ISTAT mensile",        group:"Compliance",   params:"?month=YYYY-MM" },
            // Webhooks
            { method:"GET",    path:"/api/v1/webhooks",             desc:"Lista webhooks configurati",  group:"Webhooks",     params:"" },
            { method:"POST",   path:"/api/v1/webhooks",             desc:"Registra webhook",            group:"Webhooks",     params:"body: {url,events:[],secret}" },
            { method:"DELETE", path:"/api/v1/webhooks/:id",         desc:"Rimuovi webhook",             group:"Webhooks",     params:"" },
          ];

          const groups = [...new Set(REST_ENDPOINTS.map(e => e.group))];
          const filtered = restFilter === "all" ? REST_ENDPOINTS : REST_ENDPOINTS.filter(e => e.group === restFilter);

          const WEBHOOK_EVENTS = ["reservation.created","reservation.updated","reservation.cancelled","checkin.completed","checkout.completed","payment.received","guest.created","availability.changed"];

          const addWebhook = () => {
            if (!webhookForm.url || webhookForm.events.length === 0) { showToast("Inserisci URL e almeno un evento","error"); return; }
            setWebhooks(p => [...p, { ...webhookForm, id:"WHK"+Date.now(), active:true, calls:0 }]);
            setWebhookForm({ url:"", events:[], secret:"" });
            showToast("Webhook registrato ✓");
          };

          const testWebhook = (wh) => {
            const t0 = Date.now();
            showToast(`Test webhook: ${wh.url}...`);
            setTimeout(() => {
              setWebhooks(p => p.map(w => w.id===wh.id ? {...w, calls:w.calls+1, lastCall: new Date().toLocaleTimeString()} : w));
              pushLog(`POST ${wh.url}`, "POST", 200, Date.now()-t0+Math.floor(Math.random()*200+50), "Webhook test event");
              showToast("Webhook risposto 200 OK ✓");
            }, 800);
          };

          return (
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
                <div>
                  <div className="section-title">Connettività</div>
                  <h1 style={{ fontSize:22, fontWeight:600 }}>API & Integrazioni</h1>
                </div>
              </div>
              <AiBar pg="API & Integrazioni" />

              {/* Tab nav */}
              <div style={{ borderBottom:`2px solid ${C.border}`, display:"flex", gap:2, marginBottom:22, overflowX:"auto", overflowY:"hidden", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
                {[["overview","⊞ Panoramica"],["keys","🔑 Chiavi API"],["rest","</> REST API"],["booking","🌐 Booking.com"],["payments","💳 Stripe"],["webhooks","⚡ Webhooks"],["logs","📋 Logs"]].map(([t,l]) => (
                  <button key={t} className={`api-tab${apiTab===t?" active":""}`} onClick={() => setApiTab(t)} style={{ flexShrink:0 }}>{l}</button>
                ))}
              </div>

              {/*   TAB: Panoramica   */}
              {apiTab === "overview" && (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
                    {[
                      { l:"Endpoint REST",    v:REST_ENDPOINTS.length, c:C.navy,   icon:"</>" },
                      { l:"Integrazioni",     v:3,                     c:C.purple, icon:"🔌" },
                      { l:"Webhooks attivi",  v:webhooks.filter(w=>w.active).length, c:C.green, icon:"⚡" },
                      { l:"Log API (24h)",    v:apiLogs.length,        c:C.gold,   icon:"📋" },
                    ].map(s => (
                      <div key={s.l} className="stat-card">
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                          <span style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>{s.l}</span>
                          <span style={{ fontSize:20 }}>{s.icon}</span>
                        </div>
                        <div style={{ fontSize:34, fontWeight:700, color:s.c, fontFamily:"IBM Plex Sans,sans-serif" }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16 }}>
                    {[
                      { name:"Anthropic Claude AI", status: !!apiKeys.anthropic, icon:"✦", color:C.gold, desc:"Suggerimenti contestuali e analisi intelligente" },
                      { name:"Booking.com",         status: !!apiKeys.booking,   icon:"🌐", color:"#003580", desc:"Sincronizzazione disponibilità e tariffe" },
                      { name:"Stripe Payments",     status: !!apiKeys.stripe,    icon:"💳", color:C.purple, desc:"Pagamenti online e terminali POS" },
                    ].map(int => (
                      <div key={int.name} className="card">
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                          <div style={{ width:42, height:42, borderRadius:10, background: int.status ? `${int.color}20` : C.surface2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, border:`1px solid ${int.status?int.color+"40":C.border}` }}>{int.icon}</div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:14 }}>{int.name}</div>
                            <div style={{ fontSize:11 }}>
                              <span style={{ color: int.status ? C.green : C.red, fontWeight:700 }}>{int.status ? "● Connessa" : "○ Non configurata"}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize:12, color:C.text3, marginBottom:12 }}>{int.desc}</div>
                        <button className="btn-secondary" style={{ fontSize:11, padding:"5px 12px" }} onClick={() => setApiTab("keys")}>
                          {int.status ? "Gestisci chiave" : "Configura →"}
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* Quick-start */}
                  <div className="card" style={{ marginTop:18, background:C.surface2 }}>
                    <div className="section-title">Quick Start — Esempio di integrazione</div>
                    <pre style={{ background:"#1e293b", color:"#e2e8f0", padding:16, borderRadius:8, fontSize:11, overflowX:"auto", lineHeight:1.7 }}>{`// Autenticazione — Header richiesto su ogni chiamata
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

// GET disponibilità
fetch('https://api.hotelgasparini.it/api/v1/availability?from=2026-03-01&to=2026-03-07')

// POST nuova prenotazione
fetch('https://api.hotelgasparini.it/api/v1/reservations', {
  method: 'POST',
  body: JSON.stringify({
    roomId: 205, guestId: "GST001",
    checkIn: "2026-03-15", checkOut: "2026-03-18",
    adulti: 2, bambini: 0, services: ["colazione"]
  })
})`}</pre>
                  </div>
                </div>
              )}

              {/*   TAB: Chiavi API   */}
              {apiTab === "keys" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                  {[
                    { key:"anthropic",      label:"Anthropic Claude AI",   icon:"✦", placeholder:"sk-ant-api...", color:C.gold,   hint:"Ottieni la chiave su console.anthropic.com" },
                    { key:"booking",        label:"Booking.com Partner API",icon:"🌐",placeholder:"sk-booking-...", color:"#003580",hint:"Accedi al Booking.com Partner Hub" },
                    { key:"stripe",         label:"Stripe (Pagamenti)",     icon:"💳",placeholder:"sk_live_...",    color:C.purple, hint:"Disponibile nella Stripe Dashboard" },
                    { key:"channelManager", label:"Channel Manager",        icon:"📡",placeholder:"cm-api-key-...", color:C.navy,   hint:"Inserisci la chiave del tuo Channel Manager" },
                  ].map(({ key, label, icon, placeholder, color, hint }) => (
                    <div key={key} className="card">
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                        <div style={{ width:36, height:36, borderRadius:8, background:`${color}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:`1px solid ${color}30` }}>{icon}</div>
                        <div>
                          <div style={{ fontWeight:700 }}>{label}</div>
                          <div style={{ fontSize:11, color: apiKeys[key] ? C.green : C.text3 }}>{apiKeys[key] ? "● Chiave configurata" : "○ Non configurata"}</div>
                        </div>
                      </div>
                      <label className="label">API Key</label>
                      <div style={{ display:"flex", gap:8, marginBottom:6 }}>
                        <input type="password" className="input-field" placeholder={placeholder} value={apiKeys[key]}
                          onChange={e => setApiKeys(p => ({...p, [key]: e.target.value}))} />
                        <button className="btn-secondary" style={{ flexShrink:0, padding:"8px 12px", fontSize:11 }}
                          onClick={() => { showToast(`Chiave ${label} salvata ✓`); pushLog(`PUT /api/v1/config/${key}`, "PUT", 200, 45, "Chiave API aggiornata"); }}>
                          Salva
                        </button>
                      </div>
                      <div style={{ fontSize:11, color:C.text3 }}>💡 {hint}</div>
                    </div>
                  ))}
                </div>
              )}

              {/*   TAB: REST API   */}
              {apiTab === "rest" && (
                <div>
                  <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
                    <select className="input-field" style={{ maxWidth:200 }} value={restFilter} onChange={e => setRestFilter(e.target.value)}>
                      <option value="all">Tutti i gruppi</option>
                      {groups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <span style={{ fontSize:12, color:C.text3 }}>{filtered.length} endpoint</span>
                    <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                      {["GET","POST","PUT","DELETE"].map(m => (
                        <span key={m} className={`method-badge method-${m}`}>{m}</span>
                      ))}
                    </div>
                  </div>
                  <div className="card" style={{ padding:0, overflow:"hidden" }}>
                    {groups.filter(g => restFilter==="all" || g===restFilter).map(group => (
                      <div key={group}>
                        <div style={{ padding:"8px 14px", background:C.surface2, borderBottom:`1px solid ${C.border}`, fontSize:11, fontWeight:700, color:C.text2, letterSpacing:1, textTransform:"uppercase" }}>{group}</div>
                        {filtered.filter(e => e.group===group).map((e, i) => (
                          <div key={i} className="endpoint-row">
                            <span className={`method-badge method-${e.method}`}>{e.method}</span>
                            <code style={{ fontFamily:"monospace", fontSize:12, color:C.navy, flex:"0 0 auto", minWidth:280 }}>{e.path}</code>
                            <span style={{ color:C.text2, flex:1, fontSize:12 }}>{e.desc}</span>
                            {e.params && <span style={{ fontSize:10, color:C.text3, fontFamily:"monospace" }}>{e.params}</span>}
                            <button className="btn-secondary" style={{ padding:"3px 10px", fontSize:10, flexShrink:0 }}
                              onClick={() => mockRestCall(e.path, e.method)}>Test</button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*   TAB: Booking.com   */}
              {apiTab === "booking" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                  <div className="card">
                    <div className="section-title">Sincronizzazione Disponibilità</div>
                    <div style={{ fontSize:13, color:C.text2, marginBottom:16, lineHeight:1.7 }}>
                      Aggiorna in tempo reale le disponibilità e le tariffe su Booking.com. Il sistema invia blocchi per le camere occupate e aggiorna i prezzi in base alle regole Revenue configurate.
                    </div>
                    <div style={{ display:"flex", gap:10, marginBottom:14 }}>
                      <button className="btn-primary" onClick={syncBooking}>🔄 Sincronizza ora</button>
                      <button className="btn-secondary" onClick={() => mockRestCall("/booking/rooms","GET")}>Verifica stato</button>
                    </div>
                    <div style={{ padding:"10px 14px", background:C.navyL, border:`1px solid ${C.navyLb}`, borderRadius:8, fontSize:12, color:C.navy }}>
                      <b>Sync automatica:</b> ogni 15 min · <b>Ultima sync:</b> {new Date().toLocaleTimeString("it-IT")}
                    </div>
                  </div>
                  <div className="card">
                    <div className="section-title">Tariffe & Rate Plans</div>
                    {[["BAR — Best Available Rate","Prezzo dinamico base","Attiva"],["NRF — Non Refundable","-15% sul BAR","Attiva"],["Early Booking","-10% prenotando 30+ giorni prima","Attiva"],["Last Minute","+5% entro 48h","In attesa"]].map(([name,desc,status]) => (
                      <div key={name} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                        <div><div style={{ fontWeight:600 }}>{name}</div><div style={{ fontSize:11, color:C.text3 }}>{desc}</div></div>
                        <span style={{ fontSize:10, fontWeight:700, color:status==="Attiva"?C.green:C.amber, background:status==="Attiva"?C.greenL:C.amberL, padding:"2px 8px", borderRadius:20 }}>{status}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="section-title">Statistiche Canale</div>
                    {[["Prenotazioni ricevute (mese)","12",C.navy],["Revenue da Booking.com","€3.240",C.gold],["Commissione media","15%",C.red],["Review score medio","8.7/10",C.green]].map(([l,v,c]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                        <span style={{ color:C.text2 }}>{l}</span><span style={{ fontWeight:700, color:c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <div className="section-title">Restrizioni & Policies</div>
                    {[["Soggiorno minimo","1 notte"],["Cancellazione gratuita","fino a 48h prima"],["No-show policy","Prima notte addebitata"],["Check-in online","Disponibile"]].map(([l,v]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                        <span style={{ color:C.text2 }}>{l}</span><span style={{ fontWeight:600, color:C.text }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*   TAB: Pagamenti Stripe   */}
              {apiTab === "payments" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                  <div className="card">
                    <div className="section-title">Addebita Pagamento</div>
                    <div style={{ marginBottom:12 }}>
                      <label className="label">Prenotazione</label>
                      <select className="input-field" id="stripe-res">
                        {reservations.filter(r=>["reserved","checked-in"].includes(r.status)).map(r => (
                          <option key={r.id} value={r.id}>{r.id} — {r.guestName} (€{(calcTotal(r)-calcPaid(r)).toFixed(2)} da saldare)</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-grid" style={{ marginBottom:14 }}>
                      <div><label className="label">Importo (€)</label><input type="number" className="input-field" id="stripe-amt" placeholder="0.00" /></div>
                      <div><label className="label">Metodo</label>
                        <select className="input-field" id="stripe-mth">
                          {["Carta di Credito","Carta di Debito","Apple Pay","Google Pay","SEPA Direct"].map(m=><option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <button className="btn-primary" onClick={() => {
                      const res = reservations.find(r=>r.id===document.getElementById("stripe-res").value);
                      const amt = document.getElementById("stripe-amt").value;
                      if(res && amt > 0) stripeCharge(parseFloat(amt), res.guestName);
                    }}>💳 Addebita con Stripe</button>
                  </div>
                  <div className="card">
                    <div className="section-title">Riepilogo Pagamenti</div>
                    {[["Volume totale (mese)","€12.840",C.gold],["Transazioni riuscite","47",C.green],["Transazioni fallite","2",C.red],["Commissione Stripe (1.4%)","€179.76",C.text3],["Pagamenti in sospeso","€1.320",C.amber]].map(([l,v,c]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                        <span style={{ color:C.text2 }}>{l}</span><span style={{ fontWeight:700, color:c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="card" style={{ gridColumn:"1/-1" }}>
                    <div className="section-title">Metodi di Pagamento Accettati</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
                      {["Visa","Mastercard","American Express","PayPal","Apple Pay","Google Pay","Bonifico SEPA","Contanti"].map(m => (
                        <div key={m} style={{ padding:"6px 14px", background:C.surface2, border:`1px solid ${C.border}`, borderRadius:20, fontSize:12, fontWeight:600, color:C.text2 }}>{m}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/*   TAB: Webhooks   */}
              {apiTab === "webhooks" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                  <div className="card">
                    <div className="section-title">Nuovo Webhook</div>
                    <div style={{ marginBottom:10 }}>
                      <label className="label">URL endpoint</label>
                      <input className="input-field" placeholder="https://your-system.com/webhook" value={webhookForm.url} onChange={e => setWebhookForm(f=>({...f,url:e.target.value}))} />
                    </div>
                    <div style={{ marginBottom:10 }}>
                      <label className="label">Segreto (HMAC)</label>
                      <input className="input-field" placeholder="whsec_..." value={webhookForm.secret} onChange={e => setWebhookForm(f=>({...f,secret:e.target.value}))} />
                    </div>
                    <div style={{ marginBottom:14 }}>
                      <label className="label">Eventi da notificare</label>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginTop:6 }}>
                        {WEBHOOK_EVENTS.map(evt => (
                          <span key={evt} className={`service-chip${webhookForm.events.includes(evt)?" sel":""}`}
                            onClick={() => setWebhookForm(f => ({ ...f, events: f.events.includes(evt) ? f.events.filter(e=>e!==evt) : [...f.events, evt] }))}>
                            {evt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className="btn-primary" onClick={addWebhook}>+ Registra Webhook</button>
                  </div>
                  <div className="card" style={{ padding:0, overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase" }}>
                      Webhooks Registrati ({webhooks.length})
                    </div>
                    {webhooks.length === 0 && <div style={{ padding:"28px", textAlign:"center", color:C.text3, fontSize:13 }}>Nessun webhook configurato</div>}
                    {webhooks.map(wh => (
                      <div key={wh.id} style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:6 }}>
                          <div>
                            <div style={{ fontWeight:600, fontSize:13, wordBreak:"break-all" }}>{wh.url}</div>
                            <div style={{ fontSize:11, color:C.text3, marginTop:2 }}>
                              {wh.events.length} eventi · {wh.calls} chiamate
                              {wh.lastCall && ` · ultima: ${wh.lastCall}`}
                            </div>
                          </div>
                          <div style={{ display:"flex", gap:6 }}>
                            <button className="btn-blue" style={{ padding:"3px 8px", fontSize:10 }} onClick={() => testWebhook(wh)}>Test</button>
                            <button className="btn-danger" style={{ padding:"3px 8px", fontSize:10 }} onClick={() => setWebhooks(p => p.filter(w=>w.id!==wh.id))}>✕</button>
                          </div>
                        </div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                          {wh.events.map(e => <span key={e} style={{ fontSize:10, background:C.navyL, color:C.navy, padding:"1px 6px", borderRadius:10 }}>{e}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/*   TAB: Logs   */}
              {apiTab === "logs" && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                    <span style={{ fontSize:13, color:C.text2 }}>{apiLogs.length} chiamate registrate</span>
                    <button className="btn-secondary" style={{ fontSize:11, padding:"5px 12px" }} onClick={() => setApiLogs([])}>Svuota log</button>
                  </div>
                  <div className="card" style={{ padding:0, overflow:"hidden" }}>
                    <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"70px 60px 80px 1fr 80px 100px", gap:8, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>
                      <div>Ora</div><div>Metodo</div><div>Status</div><div>Endpoint</div><div>ms</div><div>Note</div>
                    </div>
                    {apiLogs.length === 0 && <div style={{ padding:"32px", textAlign:"center", color:C.text3 }}>Nessuna chiamata registrata</div>}
                    {apiLogs.map(log => (
                      <div key={log.id} style={{ padding:"9px 14px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"70px 60px 80px 1fr 80px 100px", gap:8, alignItems:"center", fontSize:12 }}>
                        <span style={{ color:C.text3, fontFamily:"monospace" }}>{log.ts}</span>
                        <span className={`method-badge method-${log.method}`}>{log.method}</span>
                        <span style={{ fontWeight:700, color: log.status>=200&&log.status<300?C.green:log.status>=400?C.red:C.amber }}>{log.status||"ERR"}</span>
                        <code style={{ fontSize:11, color:C.navy, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.endpoint}</code>
                        <span style={{ color:C.text3, textAlign:"right" }}>{log.ms}ms</span>
                        <span style={{ fontSize:11, color:C.text3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/*   PANNELLO CHAT AI FLOTTANTE   */}
        {aiVisible && (
          <div className="ai-panel no-print">
            <div style={{ padding:"12px 16px", background:`linear-gradient(135deg,${C.goldL},${C.surface})`, borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ fontWeight:700, fontSize:14, color:C.gold, display:"flex", alignItems:"center", gap:6 }}>
                ✦ Assistente Hotel Gasparini
                {!apiKeys.anthropic && <span style={{ fontSize:10, color:C.red, fontWeight:400 }}>— chiave API mancante</span>}
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setAiMessages([])} title="Pulisci chat" style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:4, padding:"2px 7px", fontSize:11, cursor:"pointer", color:C.text3 }}>🗑</button>
                <button onClick={() => setAiVisible(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:C.text3 }}>×</button>
              </div>
            </div>
            {/* Messaggi */}
            <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8, maxHeight:340 }}>
              {aiMessages.length === 0 && (
                <div style={{ textAlign:"center", color:C.text3, fontSize:12, padding:"16px 0" }}>
                  <div style={{ fontSize:24, marginBottom:6 }}>✦</div>
                  Ciao! Sono l'assistente AI di Hotel Gasparini.<br/>Chiedimi analisi, consigli operativi, previsioni revenue o qualsiasi cosa ti serva.
                  {!apiKeys.anthropic && <div style={{ marginTop:8, color:C.red, fontSize:11 }}>⚠ Configura la chiave Anthropic in API & Integrazioni per abilitare l'AI</div>}
                </div>
              )}
              {aiMessages.map((m, i) => (
                <div key={i} style={{ display:"flex", justifyContent: m.role==="user" ? "flex-end" : "flex-start" }}>
                  <div className={m.role==="user" ? "ai-msg-user" : "ai-msg-ai"}>{m.content}</div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ display:"flex", justifyContent:"flex-start" }}>
                  <div className="ai-msg-ai">
                    <span className="ai-loading-dot">●</span> <span className="ai-loading-dot">●</span> <span className="ai-loading-dot">●</span>
                  </div>
                </div>
              )}
            </div>
            {/* Suggerimenti rapidi */}
            {aiMessages.length === 0 && (
              <div style={{ padding:"0 12px 8px", display:"flex", flexWrap:"wrap", gap:5 }}>
                {["📊 Analisi RevPAR oggi","🏨 Situazione camere","💡 Consigli pricing","📋 PS da inviare"].map(q => (
                  <button key={q} onClick={() => { setAiInput(q.slice(2)); }} style={{ background:C.surface2, border:`1px solid ${C.border}`, borderRadius:16, padding:"4px 10px", fontSize:11, cursor:"pointer", color:C.text2, transition:"all .15s" }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=C.gold} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>{q}</button>
                ))}
              </div>
            )}
            {/* Input */}
            <div style={{ padding:"10px 12px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
              <input className="input-field" placeholder="Chiedi all'AI..." value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && !e.shiftKey && sendAiChat()}
                style={{ fontSize:13 }} />
              <button className="btn-primary" style={{ padding:"8px 14px", flexShrink:0 }} onClick={sendAiChat} disabled={aiLoading}>›</button>
            </div>
          </div>
        )}

        {/*   RISTORANTE POS   */}
        {page==="Ristorante POS" && (() => {
          const sale = [...new Set(TAVOLI_LAYOUT.map(t=>t.sala))];
          const tavoliSala = TAVOLI_LAYOUT.filter(t => t.sala===posSala);
          const cats = [...new Set(MENU_VOCI.map(v=>v.cat))];
          const voceMenu = MENU_VOCI.filter(v=>v.cat===posMenuCat);
          const tavoloObj = tavoloAttivo ? TAVOLI_LAYOUT.find(t=>t.id===tavoloAttivo) : null;
          const tavoloTs  = tavoloAttivo ? tavoliState[tavoloAttivo] : null;
          const totaleAttivo = tavoloAttivo ? posTavoloTotale(tavoloAttivo) : 0;
          const tavoliOccupati = Object.values(tavoliState).filter(t=>t.status==="occupato").length;
          const revenuePos = Object.values(tavoliState).reduce((s,t)=>(t.ordini||[]).reduce((ss,o)=>ss+o.prezzo*o.qty,s),0);
          const ticketPendenti = ordiniCucina.filter(t=>t.status==="in_preparazione").length;
          const copertiOra = Object.values(tavoliState).filter(t=>t.status==="occupato").reduce((s,t)=>s+t.ospiti,0);

          return (
            <div>
              {/* Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20 }}>
                <div>
                  <div className="section-title">Food & Beverage</div>
                  <h1 style={{ fontSize:22, fontWeight:600 }}>Ristorante POS</h1>
                </div>
                {tavoloAttivo && (
                  <div style={{ padding:"7px 14px", background:C.goldL, border:`1px solid ${C.goldLb}`, borderRadius:8, fontSize:12, fontWeight:700, color:C.gold }}>
                    ● {tavoloObj?.nome} · {tavoloTs?.ospiti} ospiti · €{totaleAttivo.toFixed(2)}
                  </div>
                )}
              </div>

              {/* KPI strip */}
              <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr 1fr":isTablet?"1fr 1fr":"repeat(4,1fr)", gap:12, marginBottom:20 }}>
                {[
                  { l:"Tavoli Occupati",  v:`${tavoliOccupati}/${TAVOLI_LAYOUT.length}`, c:C.green },
                  { l:"Coperti in Sala",  v:copertiOra,                                  c:C.navy  },
                  { l:"Ticket Cucina",    v:ticketPendenti, c:ticketPendenti>0?C.red:C.text3       },
                  { l:"Revenue Sessione", v:`€${revenuePos.toFixed(2)}`,                 c:C.gold  },
                ].map(s => (
                  <div key={s.l} className="pos-stat">
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:6 }}>{s.l}</div>
                    <div style={{ fontSize:26, fontWeight:700, color:s.c, fontFamily:"IBM Plex Sans,sans-serif" }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {/* Tab nav */}
              <div style={{ display:"flex", gap:6, marginBottom:20, background:C.surface2, padding:6, borderRadius:12, border:`1px solid ${C.border}`, width:"fit-content" }}>
                {[["mappa","🗺 Mappa"],["ordine","📋 Ordine"],["cucina","👨‍🍳 Cucina"],["precomanda","📅 Pre-Comanda"],["cassa-pos","💰 Cassa"]].map(([t,l]) => (
                  <button key={t} className={`pos-tab${posTab===t?" active":""}`} onClick={()=>setPosTab(t)}>
                    {l}
                    {t==="cucina" && ticketPendenti>0 && <span style={{ marginLeft:4, background:C.red, color:"white", borderRadius:10, padding:"0 5px", fontSize:10 }}>{ticketPendenti}</span>}
                  </button>
                ))}
              </div>

              {/*   MAPPA TAVOLI   */}
              {posTab==="mappa" && (
                <div style={{ display:"grid", gridTemplateColumns:"150px 1fr", gap:20 }}>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Sale</div>
                    {sale.map(s => (
                      <button key={s} onClick={()=>setPosSala(s)} style={{ padding:"9px 14px", background:posSala===s?C.gold:C.surface, border:`1px solid ${posSala===s?C.gold:C.border}`, borderRadius:8, color:posSala===s?"#fff":C.text2, fontWeight:600, fontSize:12, cursor:"pointer", transition:"all .2s", textAlign:"left" }}>{s}</button>
                    ))}
                    <div style={{ height:1, background:C.border, margin:"6px 0" }}/>
                    <div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>Legenda</div>
                    {[[C.greenL,C.greenLb,C.green,"Occupato"],[C.surface,C.border,C.text3,"Libero"]].map(([bg,br,tc,l]) => (
                      <div key={l} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11 }}>
                        <div style={{ width:12, height:12, background:bg, border:`2px solid ${br}`, borderRadius:3 }}/>
                        <span style={{ color:tc }}>{l}</span>
                      </div>
                    ))}
                  </div>

                  <div className="card" style={{ padding:16, overflow:"auto" }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text2, marginBottom:14, display:"flex", justifyContent:"space-between" }}>
                      <span>{posSala}</span>
                      <span style={{ fontSize:11, color:C.text3 }}>{tavoliSala.filter(t=>tavoliState[t.id]?.status==="occupato").length}/{tavoliSala.length} tavoli occupati</span>
                    </div>
                    <svg width={660} height={220} style={{ display:"block", maxWidth:"100%" }}>
                      <rect x="0" y="0" width="660" height="220" rx="10" fill={C.surface2} stroke={C.border} strokeWidth="1.5"/>
                      {posSala==="Terrazza" && [60,180,300,420,540].map(x=>(
                        <g key={x}>
                          <rect x={x} y="205" width="50" height="10" rx="3" fill={C.goldL} stroke={C.goldLb} strokeWidth="1"/>
                        </g>
                      ))}
                      {tavoliSala.map(tv => {
                        const ts = tavoliState[tv.id];
                        const isOcc = ts.status==="occupato";
                        const isAct = tavoloAttivo===tv.id;
                        const tot   = posTavoloTotale(tv.id);
                        return (
                          <g key={tv.id} style={{ cursor:"pointer" }} onClick={()=>{
                            if(isOcc){ setTavoloAttivo(tv.id); setPosTab("ordine"); }
                            else {
                              const osp = parseInt(prompt(`Apri ${tv.nome} — quanti coperti? (max ${tv.posti})`, String(tv.posti))||String(tv.posti));
                              if(osp>0) posApriTavolo(tv.id, Math.min(osp,tv.posti));
                            }
                          }}>
                            <rect x={tv.x} y={tv.y} width={tv.w} height={tv.h} rx="8"
                              fill={isOcc?C.greenL:C.surface}
                              stroke={isAct?C.gold:isOcc?"#86efac":C.border}
                              strokeWidth={isAct?3:isOcc?2:1.5}/>
                            {Array.from({length:Math.min(tv.posti,4)}).map((_,i)=>(
                              <circle key={i} cx={tv.x+10+(i*(tv.w-14)/Math.max(Math.min(tv.posti,4)-1,1))} cy={tv.y-8} r="6"
                                fill={isOcc?"#4ade80":C.border} stroke={isOcc?"#16a34a":C.border2} strokeWidth="1"/>
                            ))}
                            <text x={tv.x+tv.w/2} y={tv.y+22} textAnchor="middle" fontSize="13" fontWeight="700" fill={isOcc?C.green:C.text2}>{tv.nome}</text>
                            <text x={tv.x+tv.w/2} y={tv.y+36} textAnchor="middle" fontSize="10" fill={C.text3}>{tv.posti} posti</text>
                            {isOcc && <text x={tv.x+tv.w/2} y={tv.y+52} textAnchor="middle" fontSize="12" fontWeight="700" fill={C.gold}>€{tot.toFixed(0)}</text>}
                            {isOcc && ts.aperto && <text x={tv.x+tv.w/2} y={tv.y+64} textAnchor="middle" fontSize="9" fill={C.text3}>{ts.aperto}</text>}
                          </g>
                        );
                      })}
                    </svg>
                    <div style={{ marginTop:10, fontSize:11, color:C.text3 }}>Clicca un tavolo libero per aprirlo · uno occupato per gestire l'ordine</div>
                  </div>
                </div>
              )}

              {/*   ORDINE   */}
              {posTab==="ordine" && (
                <div>
                  {!tavoloAttivo ? (
                    <div style={{ padding:"40px", textAlign:"center", color:C.text3 }}>
                      <div style={{ fontSize:36, marginBottom:10 }}>🍽</div>
                      <div style={{ fontSize:14, marginBottom:16 }}>Seleziona un tavolo dalla mappa</div>
                      <button className="btn-primary" onClick={()=>setPosTab("mappa")}>→ Vai alla Mappa</button>
                    </div>
                  ) : (
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 310px", gap:16 }}>
                      {/* Menu */}
                      <div>
                        <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                          {cats.map(cat => {
                            const cc=CAT_COLORS[cat]||{bg:C.surface2,border:C.border,text:C.text3};
                            const active=posMenuCat===cat;
                            return (
                              <button key={cat} onClick={()=>setPosMenuCat(cat)} style={{ padding:"5px 14px", background:active?cc.bg:C.surface, border:`1.5px solid ${active?cc.border:C.border}`, borderRadius:20, color:active?cc.text:C.text3, fontSize:12, fontWeight:active?700:400, cursor:"pointer", transition:"all .15s" }}>{cat}</button>
                            );
                          })}
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))", gap:8 }}>
                          {voceMenu.map(voce => {
                            const cc=CAT_COLORS[voce.cat]||{bg:C.surface2,border:C.border,text:C.text3};
                            const inOrd=(tavoloTs?.ordini||[]).find(o=>o.id===voce.id);
                            return (
                              <button key={voce.id} className="menu-item-btn"
                                style={{ borderColor:inOrd?cc.border:C.border, background:inOrd?cc.bg:C.surface }}
                                onClick={()=>posAggiungiVoce(voce)}>
                                <div style={{ fontWeight:600, fontSize:13, color:inOrd?cc.text:C.text, marginBottom:4 }}>{voce.nome}</div>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                  <span style={{ color:C.gold, fontWeight:700, fontSize:14 }}>€{voce.prezzo}</span>
                                  <span style={{ fontSize:10, color:C.text3 }}>~{voce.tempoKitchen}min</span>
                                  {inOrd && <span style={{ background:cc.border, color:cc.text, borderRadius:12, padding:"1px 7px", fontSize:11, fontWeight:700 }}>×{inOrd.qty}</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Riepilogo ordine */}
                      <div className="card" style={{ padding:0, overflow:"hidden", position:"sticky", top:80, alignSelf:"start" }}>
                        <div style={{ padding:"12px 16px", background:C.goldL, borderBottom:`1px solid ${C.goldLb}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:15, color:C.gold }}>{tavoloObj?.nome} — {tavoloObj?.sala}</div>
                            <div style={{ fontSize:11, color:C.text3 }}>{tavoloTs?.ospiti} coperti · aperto {tavoloTs?.aperto}</div>
                          </div>
                          <button onClick={()=>setPosTab("mappa")} style={{ background:"none", border:"none", color:C.text3, cursor:"pointer", fontSize:20 }}>‹</button>
                        </div>
                        {/* Collega camera */}
                        <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, background:C.surface2 }}>
                          <label className="label">Collega a camera hotel</label>
                          <select className="input-field" style={{ fontSize:12 }}
                            value={tavoloTs?.guestId||""}
                            onChange={e=>setTavoliState(p=>({...p,[tavoloAttivo]:{...p[tavoloAttivo],guestId:e.target.value}}))}>
                            <option value="">— Seleziona ospite —</option>
                            {reservations.filter(r=>r.status==="checked-in").map(r=>(
                              <option key={r.id} value={r.guestId}>{r.guestName} · Cam {r.roomId}</option>
                            ))}
                          </select>
                        </div>
                        {/* Lista articoli */}
                        <div style={{ maxHeight:260, overflowY:"auto" }}>
                          {(tavoloTs?.ordini||[]).length===0 && <div style={{ padding:"20px", textAlign:"center", color:C.text3, fontSize:13 }}>Nessun articolo aggiunto</div>}
                          {(tavoloTs?.ordini||[]).map(o=>(
                            <div key={o.id} className="order-row">
                              <div style={{ flex:1 }}>
                                <div style={{ fontWeight:600, fontSize:12 }}>{o.nome}</div>
                                {o.inviato && <div style={{ fontSize:10, color:C.green, fontWeight:700 }}>✓ in cucina</div>}
                              </div>
                              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <button onClick={()=>posRimuoviVoce(tavoloAttivo,o.id)} style={{ width:22,height:22,borderRadius:"50%",background:C.redL,border:`1px solid ${C.redLb}`,color:C.red,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                                <span style={{ fontWeight:700,minWidth:16,textAlign:"center" }}>{o.qty}</span>
                                <button onClick={()=>posAggiungiVoce(o)} style={{ width:22,height:22,borderRadius:"50%",background:C.greenL,border:`1px solid ${C.greenLb}`,color:C.green,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                              </div>
                              <span style={{ fontWeight:700,color:C.gold,minWidth:50,textAlign:"right" }}>€{(o.prezzo*o.qty).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        {/* Totale e azioni */}
                        <div style={{ padding:"12px 16px", borderTop:`2px solid ${C.border}` }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                            <span style={{ fontWeight:700, fontSize:15 }}>Totale</span>
                            <span style={{ fontWeight:700, fontSize:22, color:C.gold, fontFamily:"IBM Plex Sans,sans-serif" }}>€{totaleAttivo.toFixed(2)}</span>
                          </div>
                          <div style={{ display:"flex", gap:7 }}>
                            <button className="btn-blue" style={{ flex:1, fontSize:12 }} onClick={()=>posInviaCucina(tavoloAttivo)}>👨‍🍳 Cucina</button>
                            <button className="btn-primary" style={{ flex:1, fontSize:12 }} onClick={()=>{setPosContoModal(tavoloAttivo);setPosTab("cassa-pos");}}>💰 Conto</button>
                          </div>
                          <button className="btn-danger" style={{ width:"100%",marginTop:6,fontSize:11 }}
                            onClick={()=>{ if(window.confirm("Chiudere il tavolo senza incassare?")) posChiudiTavolo(tavoloAttivo); }}>✕ Chiudi tavolo</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*   CUCINA   */}
              {posTab==="cucina" && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                    <div style={{ display:"flex", gap:16, fontSize:13 }}>
                      {[["in_preparazione","🔥 In preparazione",C.amber],["pronto","✓ Pronti",C.green],["servito","Serviti",C.text3]].map(([s,l,c])=>(
                        <span key={s}><b style={{ color:c }}>{ordiniCucina.filter(t=>t.status===s).length}</b> {l}</span>
                      ))}
                    </div>
                    <span style={{ fontSize:11, color:C.text3 }}>🕐 {new Date().toLocaleTimeString("it-IT")}</span>
                  </div>

                  {ordiniCucina.length===0 && (
                    <div style={{ textAlign:"center", padding:"48px", color:C.text3 }}>
                      <div style={{ fontSize:40, marginBottom:10 }}>👨‍🍳</div>
                      <div>Nessun ordine in cucina</div>
                    </div>
                  )}

                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:14 }}>
                    {ordiniCucina.map(ticket => {
                      const now = new Date();
                      const [h,m,s] = ticket.ts.split(":").map(Number);
                      const elapsed = Math.max(0, Math.round((now - new Date().setHours(h,m,s,0))/60000));
                      const isUrgente = elapsed>25 || ticket.urgente;
                      return (
                        <div key={ticket.id} className={`kitchen-ticket${isUrgente?" urgent":""}`}
                          style={{ borderColor:ticket.status==="pronto"?"#86efac":isUrgente?C.red:"#d1d5db" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8, paddingBottom:8, borderBottom:"1px solid #e5e7eb" }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:15 }}>{ticket.tavoloNome}</div>
                              <div style={{ fontSize:10, color:"#6b7280" }}>{ticket.sala} · {ticket.id} · {ticket.ts}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:14, fontWeight:700, color:ticket.status==="pronto"?C.green:elapsed>15?C.red:C.amber }}>{elapsed}min</div>
                              {isUrgente && <div style={{ fontSize:9, color:C.red, fontWeight:700 }}>⚠ URGENTE</div>}
                            </div>
                          </div>
                          {ticket.voci.map((v,i)=>(
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:"1px dashed #f3f4f6", fontSize:13 }}>
                              <span><b>×{v.qty}</b> {v.nome}</span>
                              <span style={{ fontSize:10, color:"#9ca3af" }}>~{v.tempoKitchen}min</span>
                            </div>
                          ))}
                          <div style={{ marginTop:10, display:"flex", gap:6 }}>
                            {ticket.status==="in_preparazione" && (
                              <button style={{ flex:1, background:"#dcfce7", border:"1px solid #86efac", color:"#166534", borderRadius:6, padding:"7px", fontSize:12, fontWeight:700, cursor:"pointer" }}
                                onClick={()=>posTicketStatus(ticket.id,"pronto")}>✓ PRONTO</button>
                            )}
                            {ticket.status==="pronto" && (
                              <button style={{ flex:1, background:"#f9fafb", border:"1px solid #e5e7eb", color:"#6b7280", borderRadius:6, padding:"7px", fontSize:12, fontWeight:700, cursor:"pointer" }}
                                onClick={()=>posTicketStatus(ticket.id,"servito")}>✓ SERVITO</button>
                            )}
                            {ticket.status==="servito" && (
                              <span style={{ flex:1, textAlign:"center", fontSize:11, color:"#9ca3af", padding:"7px" }}>✓ Completato</span>
                            )}
                            <button title="Segna urgente" onClick={()=>setOrdiniCucina(p=>p.map(t=>t.id===ticket.id?{...t,urgente:!t.urgente}:t))}
                              style={{ background:ticket.urgente?C.redL:"#f9fafb", border:`1px solid ${ticket.urgente?C.redLb:"#e5e7eb"}`, borderRadius:6, padding:"7px 10px", fontSize:12, cursor:"pointer" }}>⚠</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/*   PRE-COMANDA   */}
              {posTab==="precomanda" && (() => {
                const risorseServizio = precomandaForm.servizio==="colazione"
                  ? pcRighe.filter(r=>r.cat==="Colazione")
                  : pcRighe.filter(r=>!["Bevande","Colazione"].includes(r.cat));

                return (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
                    <div>
                      {/* Controlli */}
                      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"flex-end", flexWrap:"wrap" }}>
                        <div>
                          <label className="label">Data</label>
                          <input type="date" className="input-field" style={{ width:150 }} value={precomandaForm.data} onChange={e=>setPrecomandaForm(f=>({...f,data:e.target.value}))}/>
                        </div>
                        <div>
                          <label className="label">Servizio</label>
                          <div style={{ display:"flex", border:`1px solid ${C.border}`, borderRadius:8, overflow:"hidden" }}>
                            {["colazione","pranzo","cena"].map(s=>(
                              <button key={s} onClick={()=>setPrecomandaForm(f=>({...f,servizio:s}))}
                                style={{ padding:"8px 14px", background:precomandaForm.servizio===s?C.gold:C.surface, color:precomandaForm.servizio===s?"#fff":C.text2, border:"none", fontWeight:600, fontSize:12, cursor:"pointer", textTransform:"capitalize" }}>{s}</button>
                            ))}
                          </div>
                        </div>
                        <div style={{ flex:1 }}>
                          <label className="label">Note per lo chef</label>
                          <input className="input-field" placeholder="Es. allergie, ospiti VIP, richieste speciali..." value={precomandaForm.note} onChange={e=>setPrecomandaForm(f=>({...f,note:e.target.value}))}/>
                        </div>
                      </div>

                      <div className="card" style={{ padding:0, overflow:"hidden" }}>
                        <div style={{ padding:"10px 14px", background:C.surface2, borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"1fr 70px 90px 90px", gap:8, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>
                          <div>Piatto</div><div>Categoria</div>
                          <div style={{ textAlign:"center", color:C.navy }}>🌞 Pranzo</div>
                          <div style={{ textAlign:"center", color:C.gold }}>🌙 Cena</div>
                        </div>
                        {risorseServizio.map(riga => {
                          const cc=CAT_COLORS[riga.cat]||{bg:C.surface2,border:C.border,text:C.text3};
                          const hasQty=riga.pranzo>0||riga.cena>0;
                          return (
                            <div key={riga.id} style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"1fr 70px 90px 90px", gap:8, alignItems:"center", background:hasQty?cc.bg:"transparent" }}>
                              <div style={{ fontWeight:hasQty?700:400, fontSize:13, color:hasQty?cc.text:C.text }}>{riga.nome}</div>
                              <div><span style={{ fontSize:10, background:cc.bg, color:cc.text, padding:"1px 6px", borderRadius:10, border:`1px solid ${cc.border}` }}>{riga.cat.slice(0,3)}</span></div>
                              {["pranzo","cena"].map(srv=>(
                                <div key={srv} style={{ textAlign:"center" }}>
                                  {precomandaForm.servizio==="colazione" && srv==="cena" ? <span style={{ color:C.text3 }}>—</span> : (
                                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
                                      <button onClick={()=>setPcRighe(p=>p.map(r=>r.id===riga.id?{...r,[srv]:Math.max(0,r[srv]-1)}:r))}
                                        style={{ width:22,height:22,borderRadius:"50%",background:C.redL,border:`1px solid ${C.redLb}`,color:C.red,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                                      <span style={{ fontWeight:700,minWidth:24,textAlign:"center",color:riga[srv]>0?cc.text:C.text3,fontSize:14 }}>{riga[srv]}</span>
                                      <button onClick={()=>setPcRighe(p=>p.map(r=>r.id===riga.id?{...r,[srv]:r[srv]+1}:r))}
                                        style={{ width:22,height:22,borderRadius:"50%",background:C.greenL,border:`1px solid ${C.greenLb}`,color:C.green,cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                        {/* Totali */}
                        <div style={{ padding:"10px 14px", background:C.surface2, display:"grid", gridTemplateColumns:"1fr 70px 90px 90px", gap:8, fontWeight:700, fontSize:13 }}>
                          <span style={{ color:C.text3 }}>TOTALE PORZIONI</span>
                          <span/>
                          <span style={{ textAlign:"center", color:C.navy }}>{risorseServizio.reduce((s,r)=>s+r.pranzo,0)}</span>
                          <span style={{ textAlign:"center", color:C.gold }}>{risorseServizio.reduce((s,r)=>s+r.cena,0)}</span>
                        </div>
                      </div>

                      <div style={{ display:"flex", gap:8, marginTop:12 }}>
                        <button className="btn-primary" onClick={()=>{
                          const hasAny=risorseServizio.some(r=>r.pranzo>0||r.cena>0);
                          if(!hasAny){showToast("Inserisci almeno un piatto","error");return;}
                          posAggiungiPrecomanda(risorseServizio.filter(r=>r.pranzo>0||r.cena>0));
                          setPcRighe(p=>p.map(r=>({...r,pranzo:0,cena:0})));
                        }}>💾 Salva Pre-Comanda</button>
                        <button className="btn-secondary" onClick={()=>setPcRighe(p=>p.map(r=>({...r,pranzo:0,cena:0})))}>↺ Azzera</button>
                        <button className="btn-secondary" onClick={()=>window.print()}>🖨 Stampa per Chef</button>
                      </div>
                    </div>

                    {/* Storico */}
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:C.text2 }}>Storico Pre-Comande</div>
                      {precomande.length===0 && <div style={{ color:C.text3, fontSize:13, textAlign:"center", padding:"20px", background:C.surface2, borderRadius:8 }}>Nessuna pre-comanda salvata</div>}
                      {precomande.map(pc=>(
                        <div key={pc.id} className="card" style={{ padding:14, marginBottom:10 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:13, textTransform:"capitalize" }}>{pc.servizio} · {new Date(pc.data).toLocaleDateString("it-IT")}</div>
                              <div style={{ fontSize:11, color:C.text3 }}>{pc.id} · {pc.creata}</div>
                              {pc.note && <div style={{ fontSize:11, color:C.amber, marginTop:2 }}>📝 {pc.note}</div>}
                            </div>
                            <div style={{ display:"flex", gap:5 }}>
                              <button className="btn-secondary" style={{ padding:"3px 8px",fontSize:10 }} onClick={()=>window.print()}>🖨</button>
                              <button className="btn-danger" style={{ padding:"3px 8px",fontSize:10 }} onClick={()=>setPrecomande(p=>p.filter(x=>x.id!==pc.id))}>✕</button>
                            </div>
                          </div>
                          {pc.righe.map(r=>(
                            <div key={r.id} style={{ display:"grid", gridTemplateColumns:"1fr 34px 34px", gap:6, fontSize:12, padding:"3px 0", borderBottom:`1px solid ${C.border}` }}>
                              <span style={{ color:C.text }}>{r.nome}</span>
                              <span style={{ textAlign:"center", fontWeight:r.pranzo>0?700:400, color:r.pranzo>0?C.navy:C.text3 }}>{r.pranzo||"—"}</span>
                              <span style={{ textAlign:"center", fontWeight:r.cena>0?700:400, color:r.cena>0?C.gold:C.text3 }}>{r.cena||"—"}</span>
                            </div>
                          ))}
                          <div style={{ marginTop:6, display:"grid", gridTemplateColumns:"1fr 34px 34px", gap:6, fontSize:11, fontWeight:700 }}>
                            <span style={{ color:C.text3 }}>Tot. porzioni</span>
                            <span style={{ textAlign:"center",color:C.navy }}>{pc.righe.reduce((s,r)=>s+r.pranzo,0)}</span>
                            <span style={{ textAlign:"center",color:C.gold }}>{pc.righe.reduce((s,r)=>s+r.cena,0)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/*   CASSA POS   */}
              {posTab==="cassa-pos" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                  {/* Lista tavoli aperti */}
                  <div className="card" style={{ padding:0, overflow:"hidden" }}>
                    <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, textTransform:"uppercase" }}>
                      Tavoli Aperti
                    </div>
                    {TAVOLI_LAYOUT.filter(t=>tavoliState[t.id]?.status==="occupato").length===0 && (
                      <div style={{ padding:"28px", textAlign:"center", color:C.text3, fontSize:13 }}>Nessun tavolo aperto</div>
                    )}
                    {TAVOLI_LAYOUT.filter(t=>tavoliState[t.id]?.status==="occupato").map(tavolo=>{
                      const ts=tavoliState[tavolo.id];
                      const tot=posTavoloTotale(tavolo.id);
                      const isAct=posContoModal===tavolo.id;
                      const lr=ts.guestId?reservations.find(r=>r.guestId===ts.guestId&&r.status==="checked-in"):null;
                      return (
                        <div key={tavolo.id} onClick={()=>setPosContoModal(tavolo.id)}
                          style={{ padding:"14px 16px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", background:isAct?C.goldL:"transparent", transition:"background .15s" }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                            <div>
                              <div style={{ fontWeight:700, fontSize:15, color:isAct?C.gold:C.text }}>{tavolo.nome} <span style={{ fontWeight:400, fontSize:12, color:C.text3 }}>· {tavolo.sala}</span></div>
                              <div style={{ fontSize:11, color:C.text3 }}>{ts.ospiti} coperti · aperto {ts.aperto}</div>
                              {lr && <div style={{ fontSize:11, color:C.navy, marginTop:2 }}>🔗 {lr.guestName} · Cam {lr.roomId}</div>}
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:22, fontWeight:600, color:C.gold, fontFamily:"IBM Plex Sans,sans-serif" }}>€{tot.toFixed(2)}</div>
                              <div style={{ fontSize:10, color:C.text3 }}>{(ts.ordini||[]).reduce((s,o)=>s+o.qty,0)} articoli</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dettaglio conto */}
                  {posContoModal ? (() => {
                    const tv=TAVOLI_LAYOUT.find(t=>t.id===posContoModal);
                    const ts=tavoliState[posContoModal];
                    const tot=posTavoloTotale(posContoModal);
                    const imponibile=tot/1.1;
                    const iva=tot-imponibile;
                    const lr=ts?.guestId?reservations.find(r=>r.guestId===ts.guestId&&r.status==="checked-in"):null;
                    return (
                      <div className="card" style={{ padding:0, overflow:"hidden" }}>
                        <div style={{ padding:"12px 16px", background:C.goldL, borderBottom:`1px solid ${C.goldLb}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontWeight:700, fontSize:15, color:C.gold }}>Conto — {tv?.nome}</div>
                          <span style={{ fontSize:12, color:C.text3 }}>{ts?.ospiti} coperti</span>
                        </div>
                        <div style={{ padding:"10px 16px", maxHeight:220, overflowY:"auto" }}>
                          {(ts?.ordini||[]).map((o,i)=>(
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${C.border}`, fontSize:13 }}>
                              <span>{o.qty}× {o.nome}</span>
                              <span style={{ fontWeight:600, color:C.gold }}>€{(o.prezzo*o.qty).toFixed(2)}</span>
                            </div>
                          ))}
                          <div style={{ padding:"6px 0", display:"flex", justifyContent:"space-between", fontSize:12, color:C.text3 }}><span>Imponibile</span><span>€{imponibile.toFixed(2)}</span></div>
                          <div style={{ padding:"6px 0", display:"flex", justifyContent:"space-between", fontSize:12, color:C.text3 }}><span>IVA 10%</span><span>€{iva.toFixed(2)}</span></div>
                          <div style={{ padding:"10px 0", display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:18, borderTop:`2px solid ${C.border}` }}>
                            <span>TOTALE</span><span style={{ color:C.gold }}>€{tot.toFixed(2)}</span>
                          </div>
                        </div>
                        <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}` }}>
                          <label className="label">Metodo di pagamento</label>
                          <div style={{ display:"flex", gap:6, marginBottom:12 }}>
                            {[["camera","🏨 Camera"],["carta","💳 Carta"],["contanti","💵 Contanti"]].map(([v,l])=>(
                              <button key={v} onClick={()=>setPosCassaMethod(v)}
                                style={{ flex:1, padding:"7px 4px", background:posCassaMethod===v?C.gold:C.surface, border:`1px solid ${posCassaMethod===v?C.gold:C.border}`, borderRadius:8, color:posCassaMethod===v?"#fff":C.text2, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all .2s" }}>{l}</button>
                            ))}
                          </div>
                          {posCassaMethod==="camera" && lr && (
                            <div style={{ background:C.navyL, border:`1px solid ${C.navyLb}`, borderRadius:8, padding:"8px 12px", fontSize:12, color:C.navy, marginBottom:10 }}>
                              Addebito su <b>{lr.guestName}</b> · Camera {lr.roomId}
                            </div>
                          )}
                          {posCassaMethod==="camera" && !lr && (
                            <div style={{ background:C.redL, border:`1px solid ${C.redLb}`, borderRadius:8, padding:"8px 12px", fontSize:12, color:C.red, marginBottom:10 }}>
                              ⚠ Nessun ospite collegato. Collegalo nella scheda Ordine.
                            </div>
                          )}
                          <div style={{ display:"flex", gap:8 }}>
                            <button className="btn-primary" style={{ flex:1 }} onClick={()=>{
                              if(posCassaMethod==="camera"){
                                if(!lr){showToast("Collega prima un ospite","error");return;}
                                setReservations(p=>p.map(r=>r.id!==lr.id?r:{
                                  ...r,
                                  payments:[...(r.payments||[]),{amount:tot,method:"Ristorante F&B",date:new Date().toLocaleDateString("it-IT")}],
                                  roomServiceItems:[...(r.roomServiceItems||[]),...(ts.ordini||[]).map(o=>({desc:`🍽 ${o.nome}`,price:o.prezzo*o.qty,date:new Date().toLocaleDateString("it-IT")}))]
                                }));
                                showToast(`€${tot.toFixed(2)} addebitati su Camera ${lr.roomId} ✓`);
                              } else {
                                showToast(`Incasso €${tot.toFixed(2)} — ${posCassaMethod==="carta"?"carta di credito":"contanti"} ✓`);
                              }
                              posChiudiTavolo(posContoModal);
                            }}>✓ Incassa €{tot.toFixed(2)}</button>
                            <button className="btn-secondary" onClick={()=>window.print()} style={{ padding:"9px 14px" }}>🖨</button>
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", color:C.text3, fontSize:13, background:C.surface2, borderRadius:8 }}>
                      ← Seleziona un tavolo
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/*   MICE & MEETING   */}
        {page==="MICE & Meeting" && <MICEModule reservations={reservations} setReservations={setReservations} guests={guests} />}
        {page==="Statistiche"   && <StatisticheModule reservations={reservations} guests={guests} rooms={rooms} />}
        {page==="Configurazione" && <ConfigurazioneModule rooms={rooms} setRooms={setRooms} />}

        {/* ── MODAL PREVENTIVO MICE ── */}
        {micePreviewEv && (() => {
          const ev  = {...micePreviewEv, ...(miceForm?.id===micePreviewEv.id ? miceForm : {})};
          const sala = meetingRooms.find(r=>r.id===ev.salaId);
          const sub  = calcMiceSubtotal(ev);
          const sc   = calcMiceSconto(ev);
          const iva  = calcMiceIva(ev);
          const tot  = calcMiceTotal(ev);
          const fmtE = n => `€${(n||0).toLocaleString("it-IT",{minimumFractionDigits:2})}`;
          const acconto = tot * ((ev.accontoPerc||30)/100);

          const htmlPrev = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Preventivo ${ev.id}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1a2840;background:#fff;padding:0}
.wrapper{max-width:800px;margin:0 auto;padding:0}
.header{background:linear-gradient(135deg,#0a1929,#1565c0);padding:40px 48px 36px;color:#fff}
.logo-row{display:flex;align-items:center;gap:16px;margin-bottom:24px}
.logo-g{width:46px;height:46px;border-radius:10px;background:linear-gradient(135deg,#1976d2,#c9a84c);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#fff}
.logo-name h1{font-size:20px;font-weight:700;color:#fff}
.logo-name p{font-size:10px;letter-spacing:3px;color:#90caf9;text-transform:uppercase;margin-top:2px}
.prev-meta{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-top:8px}
.meta-label{font-size:9px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.5);margin-bottom:3px}
.meta-val{font-size:15px;font-weight:700;color:#fff}
.meta-val.gold{color:#e8c97a}
.section{padding:28px 48px}
.section-title{font-size:9px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#90a4ae;border-bottom:1px solid #e8edf3;padding-bottom:7px;margin-bottom:16px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px}
.info-item .label{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#90a4ae;margin-bottom:2px}
.info-item .val{font-size:14px;font-weight:600;color:#1a2840}
.room-box{background:linear-gradient(135deg,#f0f4ff,#fff);border:1.5px solid #1565c0;border-radius:10px;padding:18px 22px;display:flex;justify-content:space-between;align-items:center}
.room-name{font-size:17px;font-weight:700;color:#0a1929}
.room-sub{font-size:12px;color:#546e7a;margin-top:3px}
.room-price{font-size:20px;font-weight:800;color:#1565c0}
.chip{display:inline-block;padding:3px 9px;border-radius:20px;font-size:10px;font-weight:600;background:#e3f2fd;color:#1565c0;margin:2px}
table{width:100%;border-collapse:collapse}
th{padding:9px 14px;background:#f8fafc;text-align:left;font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#90a4ae;border-bottom:2px solid #e8edf3}
td{padding:9px 14px;border-bottom:1px solid #e8edf3;font-size:13px;color:#3a4f66}
.total-row td{background:#0a1929;color:#fff;font-weight:700;font-size:15px;border:none}
.conditions{background:#f8fafc;border-left:3px solid #1565c0;padding:16px 20px;border-radius:4px;font-size:12px;color:#546e7a;line-height:1.7}
.footer{background:#0a1929;padding:24px 48px;text-align:center;color:rgba(255,255,255,.6);font-size:11px;line-height:1.8}
.footer a{color:#64b5f6}
@media print{body{padding:0}}
</style></head><body>
<div class="wrapper">
<div class="header">
  <div class="logo-row">
    <div class="logo-g">G</div>
    <div class="logo-name"><h1>Hotel Gasparini</h1><p>MICE &amp; Meeting · Chioggia, Venezia</p></div>
  </div>
  <div class="prev-meta">
    <div><div class="meta-label">N° Preventivo</div><div class="meta-val gold">${ev.id}</div></div>
    <div><div class="meta-label">Data emissione</div><div class="meta-val">${new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"})}</div></div>
    <div style="margin-top:14px"><div class="meta-label">Valido fino al</div><div class="meta-val">${(()=>{const d=new Date();d.setDate(d.getDate()+(ev.validitaGiorni||15));return d.toLocaleDateString("it-IT",{day:"2-digit",month:"long",year:"numeric"})})()}</div></div>
    <div style="margin-top:14px"><div class="meta-label">Stato</div><div class="meta-val" style="color:#e8c97a">${MICE_STATUS[ev.status]?.label||""}</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Cliente / Richiedente</div>
  <div class="info-grid">
    <div class="info-item"><div class="label">Azienda</div><div class="val">${ev.azienda||ev.cliente||"—"}</div></div>
    <div class="info-item"><div class="label">P.IVA</div><div class="val">${ev.piva||"—"}</div></div>
    <div class="info-item"><div class="label">Referente</div><div class="val">${ev.referente||"—"}${ev.ruolo?` · ${ev.ruolo}`:""}</div></div>
    <div class="info-item"><div class="label">Contatti</div><div class="val">${ev.email||""} · ${ev.telefono||""}</div></div>
  </div>
</div>

<div style="padding:0 48px">
  <div class="section-title">Dettagli Evento</div>
  <div class="info-grid" style="margin-bottom:16px">
    <div class="info-item"><div class="label">Nome Evento</div><div class="val">${ev.nomeEvento||"—"}</div></div>
    <div class="info-item"><div class="label">Tipo</div><div class="val">${ev.tipoEvento||"—"}</div></div>
    <div class="info-item"><div class="label">Data</div><div class="val">${ev.data?new Date(ev.data+"T12:00:00").toLocaleDateString("it-IT",{weekday:"long",day:"2-digit",month:"long",year:"numeric"}):"—"}</div></div>
    <div class="info-item"><div class="label">Orario</div><div class="val">${ev.oraInizio||"—"} – ${ev.oraFine||"—"}</div></div>
    <div class="info-item"><div class="label">Partecipanti</div><div class="val">${ev.partecipanti}</div></div>
    <div class="info-item"><div class="label">Setup Sala</div><div class="val">${SETUP_LABELS[ev.setup]||"—"}</div></div>
  </div>
  ${sala?`<div class="room-box">
    <div><div class="room-name">🏛 ${sala.nome}</div><div class="room-sub">${sala.mq} m² · Piano ${sala.piano} · ${SETUP_LABELS[ev.setup]||""}: ${capForSetup(sala,ev.setup)} posti</div>
    <div style="margin-top:8px">${(sala.features||[]).map(f=>`<span class="chip">✓ ${f}</span>`).join("")}</div></div>
    <div style="text-align:right"><div class="room-price">${fmtE(sala.prezzo)}</div><div style="font-size:11px;color:#546e7a">/ giorno</div></div>
  </div>`:""}
</div>

${ev.attrezzature?.length>0?`<div class="section">
  <div class="section-title">Attrezzature e Allestimenti</div>
  <table><thead><tr><th>Attrezzatura</th><th>Q.tà</th><th style="text-align:right">Prezzo unit.</th><th style="text-align:right">Totale</th></tr></thead><tbody>
  ${ev.attrezzature.map(item=>{const a=MICE_ATTREZZATURE.find(x=>x.id===item.id);if(!a)return"";return`<tr><td>${a.icon} ${a.nome}</td><td>${item.qty||1}</td><td style="text-align:right">${fmtE(a.prezzo)} / ${a.um}</td><td style="text-align:right;font-weight:600">${fmtE(a.prezzo*(item.qty||1))}</td></tr>`;}).join("")}
  </tbody></table></div>`:""}

${ev.fb?.length>0?`<div class="section">
  <div class="section-title">Food & Beverage</div>
  <table><thead><tr><th>Servizio</th><th>Pers.</th><th>Q.tà</th><th style="text-align:right">Prezzo unit.</th><th style="text-align:right">Totale</th></tr></thead><tbody>
  ${ev.fb.map(item=>{const f=MICE_FB.find(x=>x.id===item.id);if(!f)return"";const pers=item.persone||ev.partecipanti||1;const qty=item.qty||1;const tot=f.um.includes("persona")?f.prezzo*pers*qty:f.prezzo*qty;return`<tr><td>${f.icon} ${f.nome}</td><td>${f.um.includes("persona")?pers:"—"}</td><td>${qty}</td><td style="text-align:right">${fmtE(f.prezzo)} / ${f.um}</td><td style="text-align:right;font-weight:600">${fmtE(tot)}</td></tr>`;}).join("")}
  </tbody></table></div>`:""}

<div style="padding:0 48px 28px">
  <div class="section-title">Riepilogo Economico</div>
  <table>
    <tbody>
      <tr><td style="padding:8px 14px">Subtotale imponibile</td><td style="text-align:right;padding:8px 14px;font-weight:600">${fmtE(sub)}</td></tr>
      ${ev.scontoPerc>0?`<tr style="color:#2e7d32"><td style="padding:8px 14px">Sconto ${ev.scontoPerc}%</td><td style="text-align:right;padding:8px 14px;font-weight:600">−${fmtE(sc)}</td></tr>`:""}
      <tr><td style="padding:8px 14px">IVA 10%</td><td style="text-align:right;padding:8px 14px">${fmtE(iva)}</td></tr>
      <tr class="total-row"><td style="padding:12px 14px;border-radius:0 0 0 6px">TOTALE IVA INCLUSA</td><td style="text-align:right;padding:12px 14px;font-size:18px;border-radius:0 0 6px 0">${fmtE(tot)}</td></tr>
    </tbody>
  </table>
  <div style="margin-top:16px;padding:14px;background:#e8f5e9;border-radius:6px;font-size:13px;color:#2e7d32">
    💳 Acconto richiesto (${ev.accontoPerc||30}%): <strong>${fmtE(acconto)}</strong> — Modalità: ${ev.pagamento||"Bonifico bancario"}
  </div>
</div>

${ev.noteCliente?`<div style="padding:0 48px 28px"><div class="conditions">${ev.noteCliente}</div></div>`:""}

<div style="padding:0 48px 28px">
  <div class="section-title">Condizioni Generali</div>
  <div class="conditions">
    Il presente preventivo ha validità di ${ev.validitaGiorni||15} giorni dalla data di emissione. La conferma dell'evento deve pervenire in forma scritta (email o fax) entro tale termine, accompagnata dal versamento dell'acconto pari al ${ev.accontoPerc||30}% del totale. In caso di annullamento: oltre 30 gg: nessuna penale; 15–30 gg: 30% del totale; 7–15 gg: 50% del totale; meno di 7 gg: 100% del totale. I prezzi si intendono IVA inclusa al 10%. L'Hotel Gasparini si riserva di adeguare le tariffe in caso di variazioni significative del numero di partecipanti.
  </div>
</div>

<div class="footer">
  <strong style="color:#fff;font-size:14px">Hotel Gasparini ★★★ — MICE &amp; Meeting</strong><br/>
  Corso del Popolo 1059 · 30015 Chioggia (VE) · Italia<br/>
  📞 +39 041 400 000 · ✉ <a href="mailto:mice@hotelgasparini.it">mice@hotelgasparini.it</a> · <a href="https://www.hotelgasparini.it">www.hotelgasparini.it</a><br/>
  P.IVA 01234567890 · REA VE-123456
</div>
</div></body></html>`;

          const capForSetupLocal = (s,st) => ({ teatro:s?.capTeatro, cabaret:s?.capCabaret, ushape:s?.capUShape, boardroom:s?.capBoardroom, banquet:s?.capBanquet }[st]||0);
          const copyHtml = () => navigator.clipboard.writeText(htmlPrev).then(()=>showToast("HTML preventivo copiato ✓")).catch(()=>showToast("Errore copia","error"));
          const printPrev = () => { const w=window.open("","_blank"); w.document.write(htmlPrev); w.document.close(); w.focus(); w.print(); };
          const downloadPrev = () => { const b=new Blob([htmlPrev],{type:"text/html"}); const a=document.createElement("a"); a.href=URL.createObjectURL(b); a.download=`preventivo-mice-${ev.id}.html`; a.click(); showToast("File scaricato ✓"); };

          return (
            <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setMicePreviewEv(null)} style={{ zIndex:600 }}>
              <div style={{ background:"#fff", borderRadius:12, width:"min(94vw,920px)", maxHeight:"92vh", display:"flex", flexDirection:"column", boxShadow:"0 24px 70px rgba(0,0,0,.28)", overflow:"hidden" }}>
                <div style={{ padding:"16px 22px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0, background:C.navy }}>
                  <div>
                    <div style={{ fontSize:10, fontWeight:700, color:"#90b4d4", letterSpacing:2 }}>PREVENTIVO MICE</div>
                    <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{ev.id} · {ev.nomeEvento}</div>
                  </div>
                  <button onClick={()=>setMicePreviewEv(null)} style={{ background:"none", border:"none", fontSize:24, cursor:"pointer", color:"#90b4d4" }}>×</button>
                </div>
                <div style={{ flex:1, overflow:"hidden", background:"#e8edf3", padding:16 }}>
                  <iframe srcDoc={htmlPrev} title="Preventivo MICE" style={{ width:"100%", height:"100%", border:"none", borderRadius:8, boxShadow:"0 4px 20px rgba(0,0,0,.15)", background:"#fff" }} sandbox="allow-same-origin" />
                </div>
                <div style={{ padding:"12px 22px", borderTop:`1px solid ${C.border}`, display:"flex", gap:8, justifyContent:"space-between", alignItems:"center", flexShrink:0, background:"#fafbfc" }}>
                  <div style={{ fontSize:12, color:C.text3 }}>Preventivo responsive · pronto per stampa e invio</div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="btn-secondary" style={{ fontSize:12 }} onClick={copyHtml}>📋 Copia HTML</button>
                    <button className="btn-secondary" style={{ fontSize:12 }} onClick={downloadPrev}>⬇ Scarica</button>
                    <button className="btn-secondary" style={{ fontSize:12 }} onClick={printPrev}>🖨 Stampa / PDF</button>
                    <a href={`mailto:${ev.email}?subject=${encodeURIComponent("Preventivo MICE "+ev.id+" — Hotel Gasparini")}&body=${encodeURIComponent("Gentile "+ev.referente+",\n\nIn allegato il preventivo per l'evento "+ev.nomeEvento+" del "+ev.data+".\n\nHotel Gasparini MICE\n+39 041 400 000 · mice@hotelgasparini.it")}`}
                      style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 18px",background:C.navy,border:`1px solid ${C.navy}`,borderRadius:6,fontSize:13,fontWeight:700,color:"#fff",textDecoration:"none" }}>
                      📤 Invia a {ev.email||"cliente"}
                    </a>
                    <button className="btn-secondary" style={{ fontSize:12 }} onClick={()=>setMicePreviewEv(null)}>Chiudi</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}


        {/* ── BOTTOM NAV (mobile only) ── */}
        <nav className="bottom-nav">
          {[
            { k:"Dashboard",     icon:"grid",     label:"Home" },
            { k:"Prenotazioni",  icon:"calendar", label:"Prenot." },
            { k:"Check-In/Out",  icon:"key",      label:"Check-in" },
            { k:"Cassa",         icon:"receipt",  label:"Cassa" },
            { k:"Disponibilità", icon:"layout",   label:"Camere" },
          ].map(item => (
            <button key={item.k} className={`bn-tab${page===item.k?" active":""}`}
              onClick={() => setPage(item.k)}>
              <Icon name={item.icon} size={22} color={page===item.k?"#5b9dff":"#90b4d4"} strokeWidth={1.5}/>
              <span className="bn-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>{/* fine main content */}

    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MICE MODULE — integrato in App.jsx
// ═══════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
//  HOTEL GASPARINI PMS — MODULO MICE
//  Meetings · Incentives · Conferences · Events
//  Gestione sale, attrezzature, F&B e preventivi
// ════════════════════════════════════════════════════════════════
//
//  INTEGRAZIONE NEL PMS PRINCIPALE:
//  1. Copia questo file nella stessa cartella di App.jsx
//  2. In App.jsx aggiungi import: import MICEModule from './MICE.jsx'
//  3. Aggiungi "MICE" all'array PAGES in App.jsx
//  4. Nel router di pagina aggiungi: case "MICE": return <MICEModule />
//
// ════════════════════════════════════════════════════════════════


// ─── PALETTE (speculare a App.jsx) ──────────────────────────────
const MC = {
  bg: "#f0f3f7", surface: "#ffffff", surface2: "#f5f7fa",
  border: "#dde3ec", border2: "#c4cdd9",
  text: "#1a2535", text2: "#4a5568", text3: "#8896a8",
  blue: "#0f62fe", blueL: "#e8f0ff", blueLb: "#b3ccff",
  navy: "#1565c0", navyL: "#e3f0ff",
  green: "#1b7a4a", greenL: "#e6f7ee", greenLb: "#6fcf97",
  red: "#c62828", redL: "#fdecea", redLb: "#ef9a9a",
  amber: "#e65100", amberL: "#fff3e0", amberLb: "#ffcc80",
  purple: "#5c35cc", purpleL: "#ede9fe",
  teal: "#00695c", tealL: "#e0f2f1",
  sidebar: "#0a1929",
};

// ─── DATI SALE MEETING ──────────────────────────────────────────
const SALE_DEFAULT = [
  {
    id: "S1", nome: "Sala Chioggia", piano: 1, mq: 80,
    capienze: { theatre: 80, classroom: 50, uShape: 30, boardroom: 20, cabaret: 40, banquet: 60 },
    tariffe: { mezza: 380, intera: 680, settimanale: 2800 },
    dotazioni: ["Schermo motorizzato 200\"","Proiettore 5000 lm","Sistema audio","WiFi dedicato","Climatizzazione","Luce naturale","Accesso disabili"],
    note: "Sala principale con affaccio sul canal vena. Divisibile in 2 ambienti da 40 mq.",
    attiva: true, colore: "#1565c0",
  },
  {
    id: "S2", nome: "Sala Laguna", piano: 2, mq: 60,
    capienze: { theatre: 60, classroom: 36, uShape: 22, boardroom: 16, cabaret: 30, banquet: 40 },
    tariffe: { mezza: 290, intera: 520, settimanale: 2100 },
    dotazioni: ["Schermo motorizzato 180\"","Proiettore 4000 lm","Sistema audio","WiFi dedicato","Climatizzazione","Luce naturale"],
    note: "Vista panoramica sulla laguna. Ideale per presentazioni e workshop.",
    attiva: true, colore: "#1b7a4a",
  },
  {
    id: "S3", nome: "Board Room", piano: 3, mq: 40,
    capienze: { theatre: 0, classroom: 0, uShape: 0, boardroom: 14, cabaret: 0, banquet: 0 },
    tariffe: { mezza: 220, intera: 380, settimanale: 1500 },
    dotazioni: ["Monitor 86\" 4K","Videoconferenza Logitech","Telefono conference","WiFi dedicato","Climatizzazione","Blackout totale"],
    note: "Sala CdA con tavolo in noce massello per 14 persone. Solo configurazione boardroom.",
    attiva: true, colore: "#5c35cc",
  },
  {
    id: "S4", nome: "Sala Venezia", piano: 4, mq: 50,
    capienze: { theatre: 50, classroom: 30, uShape: 20, boardroom: 14, cabaret: 24, banquet: 36 },
    tariffe: { mezza: 260, intera: 450, settimanale: 1800 },
    dotazioni: ["Schermo motorizzato 180\"","Proiettore laser","Sistema audio","WiFi dedicato","Climatizzazione"],
    note: "Sala versatile al 4° piano. Ideale per training e team building.",
    attiva: true, colore: "#e65100",
  },
  {
    id: "S5", nome: "Terrazza Adriatico", piano: 5, mq: 120,
    capienze: { theatre: 0, classroom: 0, uShape: 0, boardroom: 0, cabaret: 60, banquet: 80 },
    tariffe: { mezza: 500, intera: 900, settimanale: 0 },
    dotazioni: ["Sistema audio outdoor","Tende da sole motorizzate","Riscaldamento esterno","Vista panoramica 360°","Illuminazione scenografica"],
    note: "Terrazza panoramica esclusiva. Disponibile solo per eventi e cene di gala (maggio–settembre).",
    attiva: true, colore: "#00695c",
  },
];

// ─── CATALOGO ATTREZZATURE ──────────────────────────────────────
const ATTREZZATURE = [
  // Audio/Video
  { id:"AV01", cat:"Audio/Video", nome:"Proiettore aggiuntivo 5000 lm",     prezzo:120, um:"giorno" },
  { id:"AV02", cat:"Audio/Video", nome:"Schermo aggiuntivo 200\"",           prezzo:60,  um:"giorno" },
  { id:"AV03", cat:"Audio/Video", nome:"Monitor LED 75\" su carrello",       prezzo:80,  um:"giorno" },
  { id:"AV04", cat:"Audio/Video", nome:"Sistema videoconferenza Teams/Zoom", prezzo:150, um:"giorno" },
  { id:"AV05", cat:"Audio/Video", nome:"Microfono palmare wireless",         prezzo:30,  um:"giorno" },
  { id:"AV06", cat:"Audio/Video", nome:"Microfono lavalier wireless",        prezzo:40,  um:"giorno" },
  { id:"AV07", cat:"Audio/Video", nome:"Impianto audio portatile",           prezzo:90,  um:"giorno" },
  { id:"AV08", cat:"Audio/Video", nome:"Puntatore laser + telecomando",      prezzo:15,  um:"giorno" },
  // Arredi
  { id:"AR01", cat:"Arredi",      nome:"Flip chart con blocco da 50 fogli",  prezzo:25,  um:"giorno" },
  { id:"AR02", cat:"Arredi",      nome:"Lavagna bianca 120×90 cm",           prezzo:20,  um:"giorno" },
  { id:"AR03", cat:"Arredi",      nome:"Leggìo professionale",               prezzo:15,  um:"giorno" },
  { id:"AR04", cat:"Arredi",      nome:"Separé/pannello divisorio 2m",       prezzo:35,  um:"cad" },
  { id:"AR05", cat:"Arredi",      nome:"Tavolo rotondo aggiuntivo",          prezzo:30,  um:"cad" },
  { id:"AR06", cat:"Arredi",      nome:"Sedia aggiuntiva",                   prezzo:8,   um:"cad" },
  { id:"AR07", cat:"Arredi",      nome:"Pedana/palco 2×1 m",                 prezzo:80,  um:"elemento" },
  // Allestimento
  { id:"AL01", cat:"Allestimento",nome:"Decorazioni floreali da tavolo",     prezzo:45,  um:"tavolo" },
  { id:"AL02", cat:"Allestimento",nome:"Allestimento welcome desk",          prezzo:120, um:"evento" },
  { id:"AL03", cat:"Allestimento",nome:"Segnaletica direzionale (set 5 pz)", prezzo:60,  um:"evento" },
  { id:"AL04", cat:"Allestimento",nome:"Totem segnaposto personalizzato",    prezzo:40,  um:"cad" },
  { id:"AL05", cat:"Allestimento",nome:"Backdrop telonato 3×2 m",            prezzo:200, um:"evento" },
  // Servizi
  { id:"SV01", cat:"Servizi",     nome:"Hostess/steward",                    prezzo:180, um:"persona/giorno" },
  { id:"SV02", cat:"Servizi",     nome:"Tecnico AV dedicato",                prezzo:220, um:"giorno" },
  { id:"SV03", cat:"Servizi",     nome:"Traduzione simultanea (cabina+2 cuffie)", prezzo:380, um:"giorno" },
  { id:"SV04", cat:"Servizi",     nome:"Servizio guardaroba",                prezzo:80,  um:"giorno" },
  { id:"SV05", cat:"Servizi",     nome:"Parcheggio riservato",               prezzo:15,  um:"posto/giorno" },
  { id:"SV06", cat:"Servizi",     nome:"Connessione Internet dedicata 1Gbps",prezzo:120, um:"giorno" },
];

// ─── MENU F&B ───────────────────────────────────────────────────
const FB_PACKAGES = [
  // Coffee Break
  { id:"CB01", cat:"Coffee Break",    nome:"Coffee Break Classico",        prezzo:8,   um:"persona", desc:"Caffè, tè, succhi, acqua, pasticceria secca" },
  { id:"CB02", cat:"Coffee Break",    nome:"Coffee Break Gourmet",         prezzo:14,  um:"persona", desc:"Coffee break classico + frutta fresca, dolci artigianali locali" },
  { id:"CB03", cat:"Coffee Break",    nome:"Coffee Break Salato",          prezzo:12,  um:"persona", desc:"Caffè, succhi, mini tramezzini, focaccine, pizzette" },
  // Pranzo
  { id:"PZ01", cat:"Pranzo",          nome:"Lunch Box da lavoro",          prezzo:22,  um:"persona", desc:"Panino gourmet, frutta, dolce, acqua — servito in sala" },
  { id:"PZ02", cat:"Pranzo",          nome:"Pranzo di Lavoro (buffet)",    prezzo:38,  um:"persona", desc:"Buffet freddo/caldo, dolce, acqua e bevande analcoliche" },
  { id:"PZ03", cat:"Pranzo",          nome:"Pranzo Seduto 3 portate",      prezzo:55,  um:"persona", desc:"Menu fisso 3 portate con vino e acqua inclusi" },
  { id:"PZ04", cat:"Pranzo",          nome:"Pranzo Seduto 4 portate",      prezzo:72,  um:"persona", desc:"Menu gourmet 4 portate con vini abbinati inclusi" },
  // Aperitivo
  { id:"AP01", cat:"Aperitivo",       nome:"Aperitivo di Benvenuto",       prezzo:18,  um:"persona", desc:"Prosecco/succhi, finger food, stuzzichini locali" },
  { id:"AP02", cat:"Aperitivo",       nome:"Aperitivo Lagunare",           prezzo:28,  um:"persona", desc:"Bollicine, cicchetti veneziani, frittura di paranza" },
  // Cena
  { id:"CE01", cat:"Cena",            nome:"Cena di Gala 4 portate",       prezzo:85,  um:"persona", desc:"Menu di pesce adriatico, vini selezionati, dessert" },
  { id:"CE02", cat:"Cena",            nome:"Cena di Gala 5 portate",       prezzo:110, um:"persona", desc:"Menu gourmet completo con abbinamento vini premium" },
  { id:"CE03", cat:"Cena",            nome:"Cena Tematica Veneziana",      prezzo:95,  um:"persona", desc:"Ricette della tradizione veneziana, vini DOC, live music" },
  // Bevande
  { id:"BV01", cat:"Bevande",         nome:"Open Bar (3h)",                prezzo:25,  um:"persona", desc:"Vino, birra, analcolici, acqua a volontà per 3 ore" },
  { id:"BV02", cat:"Bevande",         nome:"Open Bar Premium (3h)",        prezzo:40,  um:"persona", desc:"Cocktail, vini premium, bollicine, analcolici — 3 ore" },
  { id:"BV03", cat:"Bevande",         nome:"Welcome drink",                prezzo:10,  um:"persona", desc:"Prosecco DOC o succo al momento dell'arrivo" },
  // Pausa Pranzo
  { id:"PP01", cat:"Spuntino",        nome:"Spuntino pomeridiano",         prezzo:10,  um:"persona", desc:"Caffè, tè, macedonie, dolcetti" },
];

// ─── STATI PREVENTIVO ───────────────────────────────────────────
const STATI = {
  bozza:      { label:"Bozza",       bg:"#f0f3f7", text:"#607080", border:"#c4cdd9" },
  inviato:    { label:"Inviato",     bg:"#e8f0ff", text:"#0f62fe", border:"#b3ccff" },
  confermato: { label:"Confermato",  bg:"#e6f7ee", text:"#1b7a4a", border:"#6fcf97" },
  declinato:  { label:"Declinato",   bg:"#fdecea", text:"#c62828", border:"#ef9a9a" },
  annullato:  { label:"Annullato",   bg:"#fff3e0", text:"#e65100", border:"#ffcc80" },
  completato: { label:"Completato",  bg:"#ede9fe", text:"#5c35cc", border:"#c4b5fd" },
};

const LAYOUT_LABELS = {
  theatre:"Theatre","classroom":"Classroom","uShape":"U-Shape",
  boardroom:"Boardroom","cabaret":"Cabaret","banquet":"Banquet",
};
const LAYOUT_ICONS = {
  theatre:"🎭","classroom":"📚","uShape":"🔷","boardroom":"💼","cabaret":"🍽️","banquet":"🥂",
};

// ─── HELPERS ────────────────────────────────────────────────────
const genMICEId = () => "MICE" + Date.now().toString().slice(-6);
const mFmtEur = (n) => "€" + (Number(n)||0).toLocaleString("it-IT", {minimumFractionDigits:2, maximumFractionDigits:2});
const mFmtDate = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const mFmtDateShort = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"}) : "—";
const mTodayStr = () => new Date().toISOString().split("T")[0];
const mDiffDays = (d1,d2) => Math.max(0,Math.round((new Date(d2)-new Date(d1))/86400000));

// ─── DATI DEMO ───────────────────────────────────────────────────
const DEMO_PREV = [
  {
    id:"MICE001", stato:"confermato",
    cliente:{ nome:"Dott.", cognome:"Marco Ferretti", azienda:"Ferretti Group S.p.A.", email:"m.ferretti@ferrettigroup.com", tel:"+39 041 512 3456", piva:"01234567890" },
    evento:{ titolo:"Board Meeting Q1 2025", tipo:"meeting", dataInizio:"2025-03-15", dataFine:"2025-03-15", oraInizio:"09:00", oraFine:"18:00", partecipanti:12 },
    sala:{ id:"S3", layout:"boardroom", allestimento:"Standard" },
    attrezzature:[{ id:"AV04", qty:1 },{ id:"AV05", qty:2 }],
    fb:[{ id:"CB01", qty:12, momento:"Mattina" },{ id:"PZ02", qty:12, momento:"Pranzo" },{ id:"CB01", qty:12, momento:"Pomeriggio" }],
    note:"Riservatezza richiesta. Nessun personale esterno durante le sessioni.",
    creatoIl:"2025-02-10", inviatoIl:"2025-02-10", confermatoIl:"2025-02-12",
    sconto:5,
  },
  {
    id:"MICE002", stato:"inviato",
    cliente:{ nome:"", cognome:"Lucia Barzotto", azienda:"Consorzio Vini DOC Colli Euganei", email:"l.barzotto@cvdce.it", tel:"+39 049 873 2100", piva:"98765432100" },
    evento:{ titolo:"Convegno Annuale Produttori", tipo:"conference", dataInizio:"2025-04-10", dataFine:"2025-04-11", oraInizio:"09:30", oraFine:"17:30", partecipanti:65 },
    sala:{ id:"S1", layout:"theatre", allestimento:"Premium" },
    attrezzature:[{ id:"AV01", qty:1 },{ id:"AV05", qty:3 },{ id:"SV01", qty:2 },{ id:"SV02", qty:1 }],
    fb:[{ id:"CB02", qty:65, momento:"Mattina" },{ id:"PZ02", qty:65, momento:"Pranzo" },{ id:"AP02", qty:65, momento:"Sera" },{ id:"CE01", qty:65, momento:"Cena" }],
    note:"Richiesta area espositiva per 8 produttori nel corridoio antistante.",
    creatoIl:"2025-02-20", inviatoIl:"2025-02-22", confermatoIl:null,
    sconto:8,
  },
  {
    id:"MICE003", stato:"bozza",
    cliente:{ nome:"Ing.", cognome:"Sara Nobile", azienda:"NovaConstruct S.r.l.", email:"s.nobile@novaconstruct.it", tel:"+39 049 660 7890", piva:"45678901234" },
    evento:{ titolo:"Training Sicurezza Cantiere", tipo:"training", dataInizio:"2025-03-28", dataFine:"2025-03-29", oraInizio:"08:30", oraFine:"17:00", partecipanti:30 },
    sala:{ id:"S4", layout:"classroom", allestimento:"Standard" },
    attrezzature:[{ id:"AR01", qty:2 },{ id:"AV08", qty:1 }],
    fb:[{ id:"CB01", qty:30, momento:"Mattina" },{ id:"PZ01", qty:30, momento:"Pranzo" }],
    note:"",
    creatoIl:"2025-02-24", inviatoIl:null, confermatoIl:null,
    sconto:0,
  },
];

// ════════════════════════════════════════════════════════════════
//  COMPONENTE PRINCIPALE
// ════════════════════════════════════════════════════════════════
function MICEModule({ reservations=[], setReservations=()=>{}, guests=[] }) {
  const [view, setView]           = useState("dashboard");   // dashboard | lista | form | dettaglio | sale | config
  const [preventivi, setPreventivi] = useState(DEMO_PREV);
  const [sale, setSale]           = useState(SALE_DEFAULT);
  const [selected, setSelected]   = useState(null);          // preventivo attivo
  const [formData, setFormData]   = useState(null);          // form nuovo/edit
  const [filterStato, setFilterStato] = useState("tutti");
  const [searchQ, setSearchQ]     = useState("");
  const [toast, setToast]         = useState(null);
  const [activeTab, setActiveTab] = useState("preventivo");  // tab form

  // ─── TOAST ───
  const showToast = useCallback((msg, type="ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  // ─── CALC TOTALE PREVENTIVO ───
  const calcTotale = useCallback((prev, saleList) => {
    if (!prev) return { sala:0, attr:0, fb:0, sub:0, sconto:0, iva:0, totale:0 };
    const salaObj  = saleList.find(s => s.id === prev.sala?.id);
    const giorni   = Math.max(1, mDiffDays(prev.evento?.dataInizio, prev.evento?.dataFine) + 1);

    // Costo sala
    const tariffa = prev.sala?.allestimento === "Giornata intera" ? "intera" : "mezza";
    const costSala = (salaObj?.tariffe[tariffa] || 0) * giorni;

    // Attrezzature
    const costAttr = (prev.attrezzature||[]).reduce((s,a) => {
      const item = ATTREZZATURE.find(x => x.id === a.id);
      return s + (item?.prezzo||0) * (a.qty||1) * giorni;
    }, 0);

    // F&B
    const costFb = (prev.fb||[]).reduce((s,f) => {
      const item = FB_PACKAGES.find(x => x.id === f.id);
      return s + (item?.prezzo||0) * (f.qty||1);
    }, 0);

    // Camere hotel
    const costCamere = (prev.camere||[]).reduce((s,c) => {
      const tipoRoom = ROOMS.find(r => r.type === c.tipo);
      const nottiCam = Math.max(1, mDiffDays(c.checkIn||prev.evento?.dataInizio, c.checkOut||prev.evento?.dataFine));
      return s + (tipoRoom?.price||0) * (c.qty||1) * nottiCam;
    }, 0);

    const sub      = costSala + costAttr + costFb + costCamere;
    const scontVal = sub * ((prev.sconto||0)/100);
    const imponib  = sub - scontVal;
    const iva      = imponib * 0.10;

    return { sala:costSala, attr:costAttr, fb:costFb, camere:costCamere, sub, sconto:scontVal, iva, totale:imponib+iva };
  }, []);

  // ─── LISTA FILTRATA ───
  const listFiltrata = useMemo(() => {
    return preventivi.filter(p => {
      const matchStato = filterStato === "tutti" || p.stato === filterStato;
      const q = searchQ.toLowerCase();
      const matchQ = !q || p.id.toLowerCase().includes(q)
        || p.cliente?.azienda?.toLowerCase().includes(q)
        || p.cliente?.cognome?.toLowerCase().includes(q)
        || p.evento?.titolo?.toLowerCase().includes(q);
      return matchStato && matchQ;
    });
  }, [preventivi, filterStato, searchQ]);

  // ─── NUOVO PREVENTIVO ───
  const nuovoPreventivo = () => {
    setFormData({
      id: genMICEId(), stato:"bozza",
      cliente:{ nome:"", cognome:"", azienda:"", email:"", tel:"", piva:"" },
      evento:{ titolo:"", tipo:"meeting", dataInizio:"", dataFine:"", oraInizio:"09:00", oraFine:"18:00", partecipanti:10 },
      sala:{ id:"S1", layout:"boardroom", allestimento:"Mezza giornata" },
      attrezzature:[], fb:[], camere:[],
      note:"", sconto:0,
      creatoIl: mTodayStr(), inviatoIl:null, confermatoIl:null,
    });
    setActiveTab("preventivo");
    setView("form");
  };

  const editPreventivo = (prev) => {
    setFormData({ ...JSON.parse(JSON.stringify(prev)) });
    setActiveTab("preventivo");
    setView("form");
  };

  const salvaPreventivo = (data) => {
    setPreventivi(prev => {
      const idx = prev.findIndex(p => p.id === data.id);
      if (idx >= 0) { const a = [...prev]; a[idx]=data; return a; }
      return [data, ...prev];
    });
    showToast(`Preventivo ${data.id} salvato`, "ok");
    setView("lista");
  };

  const cambiaStato = (id, stato) => {
    setPreventivi(prev => prev.map(p => {
      if (p.id !== id) return p;
      const up = { ...p, stato };
      if (stato === "inviato" && !p.inviatoIl) up.inviatoIl = mTodayStr();
      if (stato === "confermato" && !p.confermatoIl) up.confermatoIl = mTodayStr();
      return up;
    }));
    showToast(`Stato aggiornato: ${STATI[stato].label}`,"ok");
  };

  const eliminaPreventivo = (id) => {
    setPreventivi(prev => prev.filter(p => p.id !== id));
    showToast("Preventivo eliminato","warn");
    if (view === "dettaglio") setView("lista");
  };

  // ─── SALVA CONFIGURAZIONE SALE ───
  const salvaSala = (salaAggiornata) => {
    setSale(prev => prev.map(s => s.id === salaAggiornata.id ? salaAggiornata : s));
    showToast(`Sala ${salaAggiornata.nome} aggiornata`,"ok");
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'IBM Plex Sans', system-ui, sans-serif", background:MC.bg, minHeight:"100%", color:MC.text }}>

      {/* Topbar MICE */}
      <div style={{ background:MC.surface, borderBottom:`1px solid ${MC.border}`, padding:"0 24px", display:"flex", alignItems:"center", gap:16, height:56 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:"linear-gradient(135deg,#5c35cc,#0f62fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🎪</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:MC.text }}>MICE Manager</div>
            <div style={{ fontSize:10, letterSpacing:2, textTransform:"uppercase", color:MC.text3 }}>Meetings · Incentives · Conferences · Events</div>
          </div>
        </div>
        <div style={{ flex:1 }} />
        {/* Nav pillole */}
        {[
          { k:"dashboard", icon:"📊", label:"Dashboard" },
          { k:"lista",     icon:"📋", label:"Preventivi" },
          { k:"sale",      icon:"🏛️", label:"Sale" },
        ].map(n => (
          <button key={n.k} onClick={() => setView(n.k)} style={{
            padding:"6px 14px", borderRadius:6, border:"none", cursor:"pointer",
            fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13, fontWeight:500,
            background: view===n.k ? MC.blueL : "transparent",
            color: view===n.k ? MC.blue : MC.text2,
            display:"flex", alignItems:"center", gap:6,
          }}>
            <span>{n.icon}</span>{n.label}
          </button>
        ))}
        <button onClick={nuovoPreventivo} style={{
          display:"flex", alignItems:"center", gap:6,
          padding:"8px 16px", borderRadius:6, border:"none", cursor:"pointer",
          background:MC.blue, color:"#fff", fontWeight:600, fontSize:13,
          fontFamily:"'IBM Plex Sans',sans-serif",
        }}>+ Nuovo Preventivo</button>
      </div>

      {/* BODY */}
      <div style={{ padding:24 }}>
        {view === "dashboard"  && <Dashboard preventivi={preventivi} sale={sale} calcTotale={calcTotale} onNew={nuovoPreventivo} onView={p=>{setSelected(p);setView("dettaglio");}} />}
        {view === "lista"      && <ListaPreventivi preventivi={listFiltrata} sale={sale} calcTotale={calcTotale} filterStato={filterStato} setFilterStato={setFilterStato} searchQ={searchQ} setSearchQ={setSearchQ} onNew={nuovoPreventivo} onEdit={editPreventivo} onView={p=>{setSelected(p);setView("dettaglio");}} onStato={cambiaStato} onDelete={eliminaPreventivo} />}
        {view === "form"       && formData && <FormPreventivo data={formData} setData={setFormData} sale={sale} calcTotale={calcTotale} activeTab={activeTab} setActiveTab={setActiveTab} onSave={salvaPreventivo} onCancel={() => setView("lista")} reservations={reservations} />}
        {view === "dettaglio"  && selected && <DettaglioPreventivo prev={selected} sale={sale} calcTotale={calcTotale} onEdit={() => editPreventivo(selected)} onStato={cambiaStato} onDelete={eliminaPreventivo} onBack={() => setView("lista")} reservations={reservations} setReservations={setReservations} guests={guests} />}
        {view === "sale"       && <GestioneSale sale={sale} preventivi={preventivi} onSalva={salvaSala} />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed", bottom:24, right:24, zIndex:9999,
          background: toast.type==="ok" ? MC.green : toast.type==="warn" ? MC.amber : MC.red,
          color:"#fff", borderRadius:8, padding:"12px 20px", fontSize:13, fontWeight:500,
          boxShadow:"0 4px 20px rgba(0,0,0,.2)",
          animation:"slideInRight .3s ease",
        }}>
          {toast.type==="ok" ? "✓" : "⚠"} {toast.msg}
        </div>
      )}
      <style>{`@keyframes slideInRight{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════
function Dashboard({ preventivi, sale, calcTotale, onNew, onView }) {
  const stats = useMemo(() => {
    const totali    = preventivi.length;
    const confermati = preventivi.filter(p=>p.stato==="confermato").length;
    const inviati    = preventivi.filter(p=>p.stato==="inviato").length;
    const bozze      = preventivi.filter(p=>p.stato==="bozza").length;
    const revenue    = preventivi.filter(p=>p.stato==="confermato").reduce((s,p) => s + calcTotale(p,sale).totale, 0);
    const pipeline   = preventivi.filter(p=>["inviato","bozza"].includes(p.stato)).reduce((s,p) => s + calcTotale(p,sale).totale, 0);
    return { totali, confermati, inviati, bozze, revenue, pipeline };
  }, [preventivi, sale, calcTotale]);

  // Prossimi 30 gg per calendario sale
  const today = new Date();
  const mese  = Array.from({length:30}, (_,i) => { const d=new Date(today); d.setDate(today.getDate()+i); return d.toISOString().split("T")[0]; });

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, margin:0 }}>Dashboard MICE</h2>
          <p style={{ fontSize:12, color:MC.text3, marginTop:3 }}>Panoramica sale, preventivi e revenue</p>
        </div>
        <button onClick={onNew} style={{ padding:"9px 18px", borderRadius:6, border:"none", cursor:"pointer", background:MC.blue, color:"#fff", fontWeight:600, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>
          + Nuovo Preventivo
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:24 }}>
        {[
          { label:"Preventivi totali", val:stats.totali,    bg:MC.surface, accent:MC.text, icon:"📋" },
          { label:"Bozze",             val:stats.bozze,     bg:MC.surface, accent:MC.text3,icon:"✏️" },
          { label:"Inviati",           val:stats.inviati,   bg:MC.blueL,  accent:MC.blue,  icon:"📤" },
          { label:"Confermati",        val:stats.confermati,bg:MC.greenL, accent:MC.green, icon:"✅" },
          { label:"Revenue confermata",val:mFmtEur(stats.revenue),   bg:"linear-gradient(135deg,#1b7a4a,#2ecc71)", accent:"#fff", icon:"💰", light:true },
          { label:"Pipeline attiva",   val:mFmtEur(stats.pipeline),  bg:"linear-gradient(135deg,#5c35cc,#818cf8)", accent:"#fff", icon:"📈", light:true },
        ].map((k,i) => (
          <div key={i} style={{ background:k.bg, borderRadius:10, padding:"16px", border: k.light?0:`1px solid ${MC.border}`, boxShadow: k.light?"0 4px 16px rgba(0,0,0,.12)":"none" }}>
            <div style={{ fontSize:18, marginBottom:6 }}>{k.icon}</div>
            <div style={{ fontSize:22, fontWeight:700, color:k.light?"#fff":k.accent }}>{k.val}</div>
            <div style={{ fontSize:11, color:k.light?"rgba(255,255,255,.75)":MC.text3, marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        {/* Occupazione sale prossimi 14 gg */}
        <div style={{ background:MC.surface, borderRadius:10, border:`1px solid ${MC.border}`, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${MC.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:15 }}>🏛️</span>
            <span style={{ fontSize:14, fontWeight:700 }}>Occupazione Sale — prossimi 14 giorni</span>
          </div>
          <div style={{ padding:"12px 18px", overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", padding:"4px 8px", color:MC.text3, fontWeight:600, whiteSpace:"nowrap", width:100 }}>Sala</th>
                  {mese.slice(0,14).map(d => (
                    <th key={d} style={{ textAlign:"center", padding:"4px 4px", color:MC.text3, fontWeight:500, fontSize:10, minWidth:28 }}>
                      {new Date(d+"T12:00:00").toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"}).slice(0,5)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sale.filter(s=>s.attiva).map(sala => (
                  <tr key={sala.id}>
                    <td style={{ padding:"5px 8px", fontWeight:600, fontSize:12, color:sala.colore, whiteSpace:"nowrap" }}>
                      {sala.nome.split(" ").slice(-1)[0]}
                    </td>
                    {mese.slice(0,14).map(d => {
                      const occ = preventivi.filter(p =>
                        p.sala?.id === sala.id &&
                        ["confermato","inviato"].includes(p.stato) &&
                        p.evento?.dataInizio <= d && p.evento?.dataFine >= d
                      );
                      return (
                        <td key={d} style={{ textAlign:"center", padding:"3px" }}>
                          <div style={{
                            width:24, height:24, borderRadius:4, margin:"0 auto",
                            background: occ.length>0 ? (occ[0].stato==="confermato" ? MC.greenL : MC.blueL) : MC.surface2,
                            border: `1px solid ${occ.length>0 ? (occ[0].stato==="confermato" ? MC.greenLb : MC.blueLb) : MC.border}`,
                            display:"flex", alignItems:"center", justifyContent:"center", fontSize:10,
                          }} title={occ.length>0 ? occ[0].evento?.titolo : "Libera"}>
                            {occ.length>0 ? (occ[0].stato==="confermato"?"✓":"·") : ""}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display:"flex", gap:12, marginTop:10, fontSize:10, color:MC.text3 }}>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:12,height:12,borderRadius:2,background:MC.greenL,border:`1px solid ${MC.greenLb}`,display:"inline-block" }}/> Confermato</span>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:12,height:12,borderRadius:2,background:MC.blueL,border:`1px solid ${MC.blueLb}`,display:"inline-block" }}/> In attesa</span>
              <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:12,height:12,borderRadius:2,background:MC.surface2,border:`1px solid ${MC.border}`,display:"inline-block" }}/> Libera</span>
            </div>
          </div>
        </div>

        {/* Ultimi preventivi */}
        <div style={{ background:MC.surface, borderRadius:10, border:`1px solid ${MC.border}`, overflow:"hidden" }}>
          <div style={{ padding:"14px 18px", borderBottom:`1px solid ${MC.border}`, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:15 }}>📋</span>
            <span style={{ fontSize:14, fontWeight:700 }}>Preventivi recenti</span>
          </div>
          <div>
            {preventivi.slice(0,5).map((p, i) => {
              const s = STATI[p.stato];
              const tot = calcTotale(p, sale);
              return (
                <div key={p.id} onClick={() => onView(p)} style={{
                  padding:"12px 18px", borderBottom: i<4 ? `1px solid ${MC.border}` : "none",
                  cursor:"pointer", transition:"background .15s",
                  display:"flex", alignItems:"center", gap:12,
                }}
                onMouseEnter={e=>e.currentTarget.style.background=MC.surface2}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.evento?.titolo}</div>
                    <div style={{ fontSize:11, color:MC.text3 }}>{p.cliente?.azienda} · {mFmtDate(p.evento?.dataInizio)}</div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:12, fontWeight:700 }}>{mFmtEur(tot.totale)}</div>
                    <div style={{ fontSize:10, background:s.bg, color:s.text, border:`1px solid ${s.border}`, borderRadius:20, padding:"1px 8px", marginTop:2 }}>{s.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sale overview */}
      <div style={{ marginTop:20 }}>
        <h3 style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Sale Meeting</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
          {sale.map(s => {
            const occOggi = preventivi.filter(p => p.sala?.id===s.id && ["confermato","inviato"].includes(p.stato) && p.evento?.dataInizio <= mTodayStr() && p.evento?.dataFine >= mTodayStr());
            return (
              <div key={s.id} style={{ background:MC.surface, borderRadius:10, border:`1px solid ${MC.border}`, overflow:"hidden" }}>
                <div style={{ height:6, background:s.colore }} />
                <div style={{ padding:"14px" }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:2, color:s.colore }}>{s.nome}</div>
                  <div style={{ fontSize:11, color:MC.text3, marginBottom:10 }}>Piano {s.piano} · {s.mq} mq</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:4, fontSize:10, marginBottom:10 }}>
                    {Object.entries(s.capienze).filter(([,v])=>v>0).slice(0,4).map(([k,v]) => (
                      <div key={k} style={{ color:MC.text3 }}>{LAYOUT_ICONS[k]} {v}px</div>
                    ))}
                  </div>
                  <div style={{ fontSize:11, fontWeight:600, color: occOggi.length>0?MC.amber:MC.green }}>
                    {occOggi.length>0 ? "● Occupata oggi" : "● Libera oggi"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  LISTA PREVENTIVI
// ════════════════════════════════════════════════════════════════
function ListaPreventivi({ preventivi, sale, calcTotale, filterStato, setFilterStato, searchQ, setSearchQ, onNew, onEdit, onView, onStato, onDelete }) {
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, margin:0 }}>Preventivi MICE</h2>
          <p style={{ fontSize:12, color:MC.text3 }}>{preventivi.length} preventivo{preventivi.length!==1?"i":""} trovato{preventivi.length!==1?"i":""}</p>
        </div>
        <button onClick={onNew} style={{ padding:"9px 18px", borderRadius:6, border:"none", cursor:"pointer", background:MC.blue, color:"#fff", fontWeight:600, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>
          + Nuovo Preventivo
        </button>
      </div>

      {/* Filtri */}
      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center", flexWrap:"wrap" }}>
        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="🔍 Cerca cliente, evento, ID…" style={{ padding:"8px 12px", borderRadius:6, border:`1px solid ${MC.border}`, fontSize:13, width:260, fontFamily:"'IBM Plex Sans',sans-serif", outline:"none" }}/>
        {["tutti","bozza","inviato","confermato","declinato","annullato","completato"].map(s => (
          <button key={s} onClick={()=>setFilterStato(s)} style={{
            padding:"6px 12px", borderRadius:20, border:`1px solid ${filterStato===s?MC.blue:MC.border}`,
            background: filterStato===s?MC.blueL:"transparent", color: filterStato===s?MC.blue:MC.text3,
            fontSize:12, fontWeight:filterStato===s?700:400, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif",
          }}>
            {s==="tutti" ? "Tutti" : STATI[s]?.label}
          </button>
        ))}
      </div>

      {/* Tabella */}
      <div style={{ background:MC.surface, borderRadius:10, border:`1px solid ${MC.border}`, overflow:"hidden" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:MC.surface2, borderBottom:`1px solid ${MC.border}` }}>
              {["ID","Cliente / Azienda","Evento","Date","Sala","Partec.","Totale IVA incl.","Stato","Azioni"].map(h=>(
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preventivi.length === 0 && (
              <tr><td colSpan={9} style={{ padding:"40px", textAlign:"center", color:MC.text3, fontSize:14 }}>Nessun preventivo trovato</td></tr>
            )}
            {preventivi.map((p, i) => {
              const sala = sale.find(s=>s.id===p.sala?.id);
              const st   = STATI[p.stato];
              const tot  = calcTotale(p, sale);
              return (
                <tr key={p.id} style={{ borderBottom:`1px solid ${MC.border}`, cursor:"pointer", transition:"background .1s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=MC.surface2}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <td style={{ padding:"10px 14px", fontWeight:700, fontSize:12, color:MC.blue }} onClick={()=>onView(p)}>{p.id}</td>
                  <td style={{ padding:"10px 14px" }} onClick={()=>onView(p)}>
                    <div style={{ fontWeight:600 }}>{p.cliente?.azienda}</div>
                    <div style={{ fontSize:11, color:MC.text3 }}>{p.cliente?.nome} {p.cliente?.cognome}</div>
                  </td>
                  <td style={{ padding:"10px 14px", maxWidth:180 }} onClick={()=>onView(p)}>
                    <div style={{ fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.evento?.titolo}</div>
                    <div style={{ fontSize:11, color:MC.text3 }}>{p.evento?.tipo}</div>
                  </td>
                  <td style={{ padding:"10px 14px", whiteSpace:"nowrap", fontSize:12 }} onClick={()=>onView(p)}>
                    {mFmtDateShort(p.evento?.dataInizio)}
                    {p.evento?.dataFine && p.evento.dataFine !== p.evento.dataInizio ? ` → ${mFmtDateShort(p.evento.dataFine)}` : ""}
                  </td>
                  <td style={{ padding:"10px 14px" }} onClick={()=>onView(p)}>
                    {sala ? <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:12 }}>
                      <span style={{ width:8,height:8,borderRadius:"50%",background:sala.colore,display:"inline-block",flexShrink:0 }}/>
                      {sala.nome}
                    </span> : "—"}
                  </td>
                  <td style={{ padding:"10px 14px", textAlign:"center", fontSize:12 }} onClick={()=>onView(p)}>{p.evento?.partecipanti}</td>
                  <td style={{ padding:"10px 14px", fontWeight:700, fontSize:13 }} onClick={()=>onView(p)}>{mFmtEur(tot.totale)}</td>
                  <td style={{ padding:"10px 14px" }}>
                    <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:st.bg, color:st.text, border:`1px solid ${st.border}` }}>{st.label}</span>
                  </td>
                  <td style={{ padding:"10px 10px" }}>
                    <div style={{ display:"flex", gap:4 }}>
                      <button onClick={()=>onView(p)} title="Dettaglio" style={btnSmall}><span>👁</span></button>
                      <button onClick={()=>onEdit(p)} title="Modifica" style={btnSmall}><span>✏️</span></button>
                      <select value={p.stato} onChange={e=>onStato(p.id,e.target.value)} onClick={e=>e.stopPropagation()} style={{ fontSize:11, padding:"3px 6px", borderRadius:4, border:`1px solid ${MC.border}`, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif" }}>
                        {Object.entries(STATI).map(([k,v])=>(<option key={k} value={k}>{v.label}</option>))}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const btnSmall = { padding:"5px 8px", borderRadius:5, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontSize:13, display:"flex",alignItems:"center" };

// ════════════════════════════════════════════════════════════════
//  FORM PREVENTIVO (multi-tab)
// ════════════════════════════════════════════════════════════════
function FormPreventivo({ data, setData, sale, calcTotale, activeTab, setActiveTab, onSave, onCancel, reservations=[] }) {
  const upd = (path, val) => {
    setData(prev => {
      const clone = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = clone;
      for (let i=0;i<parts.length-1;i++) obj = obj[parts[i]];
      obj[parts[parts.length-1]] = val;
      return clone;
    });
  };

  const tot = calcTotale(data, sale);
  const salaObj = sale.find(s=>s.id===data.sala?.id);

  const tabs = [
    { k:"preventivo", label:"1 · Cliente & Evento", icon:"👤" },
    { k:"sala",       label:"2 · Sala & Allestimento", icon:"🏛️" },
    { k:"attr",       label:"3 · Attrezzature", icon:"🖥️" },
    { k:"fb",         label:"4 · F&B", icon:"🍽️" },
    { k:"camere",     label:"5 · Camere Hotel", icon:"🛏️" },
    { k:"riepilogo",  label:"6 · Riepilogo & Sconto", icon:"💶" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onCancel} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13 }}>← Indietro</button>
        <div>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700 }}>{data.id ? `Preventivo ${data.id}` : "Nuovo Preventivo"}</h2>
          <div style={{ fontSize:12, color:MC.text3 }}>Creato il {mFmtDate(data.creatoIl)}</div>
        </div>
        <div style={{ flex:1 }} />
        {/* Mini totale */}
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:MC.text3 }}>Totale IVA incl.</div>
          <div style={{ fontSize:20, fontWeight:800, color:MC.blue }}>{mFmtEur(tot.totale)}</div>
        </div>
        <button onClick={() => onSave(data)} style={{ padding:"9px 20px", borderRadius:6, border:"none", background:MC.blue, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"'IBM Plex Sans',sans-serif" }}>
          💾 Salva Preventivo
        </button>
      </div>

      {/* Tab nav */}
      <div style={{ display:"flex", gap:0, marginBottom:20, background:MC.surface, borderRadius:8, border:`1px solid ${MC.border}`, overflow:"hidden" }}>
        {tabs.map(t => (
          <button key={t.k} onClick={()=>setActiveTab(t.k)} style={{
            flex:1, padding:"11px 12px", border:"none", borderRight:`1px solid ${MC.border}`,
            background: activeTab===t.k ? MC.blue : MC.surface, cursor:"pointer",
            color: activeTab===t.k ? "#fff" : MC.text2,
            fontWeight: activeTab===t.k ? 700 : 400, fontSize:12,
            fontFamily:"'IBM Plex Sans',sans-serif",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            transition:"all .15s",
          }}>
            <span>{t.icon}</span>
            <span style={{ display:"block" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      <div style={{ background:MC.surface, borderRadius:10, border:`1px solid ${MC.border}`, padding:24 }}>

        {/* ── TAB 1: CLIENTE & EVENTO ── */}
        {activeTab === "preventivo" && (
          <div>
            <SectionHeader icon="🏢" title="Dati Azienda / Cliente" />
            <div style={grid2}>
              <Field label="Ragione Sociale / Azienda *">
                <input style={inp} value={data.cliente?.azienda||""} onChange={e=>upd("cliente.azienda",e.target.value)} placeholder="Nome azienda"/>
              </Field>
              <Field label="P.IVA">
                <input style={inp} value={data.cliente?.piva||""} onChange={e=>upd("cliente.piva",e.target.value)} placeholder="01234567890"/>
              </Field>
              <Field label="Referente — Titolo">
                <input style={inp} value={data.cliente?.nome||""} onChange={e=>upd("cliente.nome",e.target.value)} placeholder="Dott. / Ing. / Sig.ra"/>
              </Field>
              <Field label="Referente — Cognome e Nome">
                <input style={inp} value={data.cliente?.cognome||""} onChange={e=>upd("cliente.cognome",e.target.value)} placeholder="Mario Rossi"/>
              </Field>
              <Field label="Email">
                <input style={inp} type="email" value={data.cliente?.email||""} onChange={e=>upd("cliente.email",e.target.value)} placeholder="m.rossi@azienda.it"/>
              </Field>
              <Field label="Telefono">
                <input style={inp} value={data.cliente?.tel||""} onChange={e=>upd("cliente.tel",e.target.value)} placeholder="+39 02 1234567"/>
              </Field>
            </div>

            <SectionHeader icon="🎯" title="Dettagli Evento" mt={24} />
            <div style={grid2}>
              <Field label="Titolo Evento *" style={{ gridColumn:"1/-1" }}>
                <input style={inp} value={data.evento?.titolo||""} onChange={e=>upd("evento.titolo",e.target.value)} placeholder="Nome dell'evento o meeting"/>
              </Field>
              <Field label="Tipologia">
                <select style={inp} value={data.evento?.tipo||"meeting"} onChange={e=>upd("evento.tipo",e.target.value)}>
                  {["meeting","conference","training","incentive","gala","workshop","product-launch","team-building","altro"].map(t=>(
                    <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1).replace("-"," ")}</option>
                  ))}
                </select>
              </Field>
              <Field label="N° Partecipanti">
                <input style={inp} type="number" min={1} max={500} value={data.evento?.partecipanti||10} onChange={e=>upd("evento.partecipanti",parseInt(e.target.value)||1)}/>
              </Field>
              <Field label="Data Inizio *">
                <input style={inp} type="date" value={data.evento?.dataInizio||""} onChange={e=>upd("evento.dataInizio",e.target.value)}/>
              </Field>
              <Field label="Data Fine">
                <input style={inp} type="date" value={data.evento?.dataFine||""} onChange={e=>upd("evento.dataFine",e.target.value)}/>
              </Field>
              <Field label="Ora Inizio">
                <input style={inp} type="time" value={data.evento?.oraInizio||"09:00"} onChange={e=>upd("evento.oraInizio",e.target.value)}/>
              </Field>
              <Field label="Ora Fine">
                <input style={inp} type="time" value={data.evento?.oraFine||"18:00"} onChange={e=>upd("evento.oraFine",e.target.value)}/>
              </Field>
            </div>

            <Field label="Note interne / Richieste speciali" mt={16}>
              <textarea style={{...inp, height:80, resize:"vertical"}} value={data.note||""} onChange={e=>upd("note",e.target.value)} placeholder="Richieste particolari, riservatezza, accessibilità, parking…"/>
            </Field>

            <div style={{ marginTop:20, display:"flex", justifyContent:"flex-end" }}>
              <button onClick={()=>setActiveTab("sala")} style={btnNext}>Avanti: Sala & Allestimento →</button>
            </div>
          </div>
        )}

        {/* ── TAB 2: SALA ── */}
        {activeTab === "sala" && (
          <div>
            <SectionHeader icon="🏛️" title="Selezione Sala" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
              {sale.filter(s=>s.attiva).map(s => {
                const isSelected = data.sala?.id === s.id;
                const capMax = Math.max(...Object.values(s.capienze));
                return (
                  <div key={s.id} onClick={()=>upd("sala.id",s.id)} style={{
                    border:`2px solid ${isSelected?s.colore:MC.border}`,
                    borderRadius:10, padding:16, cursor:"pointer",
                    background: isSelected ? `${s.colore}10` : MC.surface,
                    transition:"all .15s",
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                      <div style={{ width:12, height:12, borderRadius:"50%", background:s.colore, flexShrink:0 }}/>
                      <div style={{ fontWeight:700, fontSize:14, color:s.colore }}>{s.nome}</div>
                    </div>
                    <div style={{ fontSize:12, color:MC.text3, marginBottom:8 }}>Piano {s.piano} · {s.mq} mq · fino a {capMax}px</div>
                    <div style={{ fontSize:11, color:MC.text2, lineHeight:1.5 }}>{s.note?.slice(0,80)}{s.note?.length>80?"…":""}</div>
                    <div style={{ marginTop:8, fontSize:12, fontWeight:700, color:s.colore }}>
                      da {mFmtEur(s.tariffe.mezza)}/mezza giornata
                    </div>
                  </div>
                );
              })}
            </div>

            {salaObj && (
              <div>
                <SectionHeader icon="🪑" title="Configurazione Layout" mt={8} />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
                  {Object.entries(salaObj.capienze).map(([layout, cap]) => {
                    if (!cap) return null;
                    const isActive = data.sala?.layout === layout;
                    return (
                      <div key={layout} onClick={()=>upd("sala.layout",layout)} style={{
                        border:`2px solid ${isActive?MC.blue:MC.border}`,
                        borderRadius:8, padding:"12px 10px", textAlign:"center", cursor:"pointer",
                        background: isActive ? MC.blueL : MC.surface, transition:"all .15s",
                      }}>
                        <div style={{ fontSize:22, marginBottom:4 }}>{LAYOUT_ICONS[layout]}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:isActive?MC.blue:MC.text }}>{LAYOUT_LABELS[layout]}</div>
                        <div style={{ fontSize:11, color:MC.text3 }}>{cap} px max</div>
                      </div>
                    );
                  })}
                </div>

                <SectionHeader icon="⏱️" title="Durata / Tariffa" mt={8} />
                <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
                  {[
                    { k:"Mezza giornata", label:`Mezza giornata — ${mFmtEur(salaObj.tariffe.mezza)}/giorno` },
                    { k:"Giornata intera", label:`Giornata intera — ${mFmtEur(salaObj.tariffe.intera)}/giorno` },
                    ...(salaObj.tariffe.settimanale>0?[{ k:"Settimana", label:`Settimanale — ${mFmtEur(salaObj.tariffe.settimanale)}` }]:[]),
                  ].map(opt => (
                    <button key={opt.k} onClick={()=>upd("sala.allestimento",opt.k)} style={{
                      padding:"10px 18px", borderRadius:8, border:`2px solid ${data.sala?.allestimento===opt.k?MC.blue:MC.border}`,
                      background: data.sala?.allestimento===opt.k?MC.blueL:MC.surface,
                      color: data.sala?.allestimento===opt.k?MC.blue:MC.text, fontWeight:600,
                      cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
                    }}>{opt.label}</button>
                  ))}
                </div>

                {/* Dotazioni incluse */}
                <div style={{ background:MC.surface2, borderRadius:8, padding:14 }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:8 }}>Dotazioni incluse nella sala</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {salaObj.dotazioni.map(d => (
                      <span key={d} style={{ padding:"4px 10px", borderRadius:20, background:MC.surface, border:`1px solid ${MC.border}`, fontSize:12, color:MC.text2 }}>✓ {d}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop:20, display:"flex", justifyContent:"space-between" }}>
              <button onClick={()=>setActiveTab("preventivo")} style={btnBack}>← Cliente & Evento</button>
              <button onClick={()=>setActiveTab("attr")} style={btnNext}>Avanti: Attrezzature →</button>
            </div>
          </div>
        )}

        {/* ── TAB 3: ATTREZZATURE ── */}
        {activeTab === "attr" && (
          <div>
            <SectionHeader icon="🖥️" title="Attrezzature Aggiuntive" />
            <p style={{ fontSize:13, color:MC.text3, marginBottom:16 }}>Le dotazioni base della sala sono incluse. Seleziona attrezzature aggiuntive:</p>

            {["Audio/Video","Arredi","Allestimento","Servizi"].map(cat => {
              const items = ATTREZZATURE.filter(a=>a.cat===cat);
              return (
                <div key={cat} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, borderBottom:`1px solid ${MC.border}`, paddingBottom:6, marginBottom:10 }}>{cat}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
                    {items.map(item => {
                      const sel = data.attrezzature?.find(a=>a.id===item.id);
                      return (
                        <div key={item.id} style={{
                          display:"flex", alignItems:"center", gap:10, padding:"10px 12px",
                          border:`1.5px solid ${sel?MC.blue:MC.border}`, borderRadius:8,
                          background: sel?MC.blueL:MC.surface, cursor:"pointer", transition:"all .15s",
                        }} onClick={()=>{
                          setData(prev=>{
                            const clone = JSON.parse(JSON.stringify(prev));
                            const idx = clone.attrezzature.findIndex(a=>a.id===item.id);
                            if (idx>=0) clone.attrezzature.splice(idx,1);
                            else clone.attrezzature.push({id:item.id,qty:1});
                            return clone;
                          });
                        }}>
                          <div style={{ width:20,height:20,borderRadius:4,border:`2px solid ${sel?MC.blue:MC.border}`,background:sel?MC.blue:MC.surface,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                            {sel && <span style={{ color:"#fff",fontSize:12,fontWeight:700 }}>✓</span>}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:13, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.nome}</div>
                            <div style={{ fontSize:11, color:MC.text3 }}>{mFmtEur(item.prezzo)} / {item.um}</div>
                          </div>
                          {sel && (
                            <div style={{ display:"flex", alignItems:"center", gap:4 }} onClick={e=>e.stopPropagation()}>
                              <button onClick={()=>{setData(prev=>{const c=JSON.parse(JSON.stringify(prev));const a=c.attrezzature.find(a=>a.id===item.id);if(a&&a.qty>1)a.qty--;return c;})}} style={{ width:22,height:22,borderRadius:4,border:`1px solid ${MC.border}`,background:MC.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13 }}>−</button>
                              <span style={{ fontSize:13,fontWeight:700,minWidth:20,textAlign:"center" }}>{sel.qty}</span>
                              <button onClick={()=>{setData(prev=>{const c=JSON.parse(JSON.stringify(prev));const a=c.attrezzature.find(a=>a.id===item.id);if(a)a.qty++;return c;})}} style={{ width:22,height:22,borderRadius:4,border:`1px solid ${MC.border}`,background:MC.surface,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13 }}>+</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop:20, display:"flex", justifyContent:"space-between" }}>
              <button onClick={()=>setActiveTab("sala")} style={btnBack}>← Sala</button>
              <button onClick={()=>setActiveTab("fb")} style={btnNext}>Avanti: F&B →</button>
            </div>
          </div>
        )}

        {/* ── TAB 4: F&B ── */}
        {activeTab === "fb" && (
          <div>
            <SectionHeader icon="🍽️" title="Food & Beverage" />
            <p style={{ fontSize:13, color:MC.text3, marginBottom:16 }}>Seleziona e configura i servizi F&B per l'evento:</p>

            {["Coffee Break","Pranzo","Aperitivo","Cena","Bevande","Spuntino"].map(cat => {
              const items = FB_PACKAGES.filter(f=>f.cat===cat);
              return (
                <div key={cat} style={{ marginBottom:20 }}>
                  <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, borderBottom:`1px solid ${MC.border}`, paddingBottom:6, marginBottom:10 }}>{cat}</div>
                  <div style={{ display:"grid", gap:8 }}>
                    {items.map(item => {
                      const sels = data.fb?.filter(f=>f.id===item.id) || [];
                      return (
                        <div key={item.id} style={{ border:`1.5px solid ${MC.border}`, borderRadius:8, overflow:"hidden" }}>
                          <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12, background: sels.length>0?MC.blueL:MC.surface }}>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:600, fontSize:13 }}>{item.nome}</div>
                              <div style={{ fontSize:11, color:MC.text3 }}>{item.desc}</div>
                            </div>
                            <div style={{ fontWeight:700, fontSize:13, color:MC.blue, whiteSpace:"nowrap" }}>{mFmtEur(item.prezzo)} / {item.um}</div>
                            <button onClick={()=>{
                              setData(prev=>{
                                const c=JSON.parse(JSON.stringify(prev));
                                c.fb.push({ id:item.id, qty:data.evento?.partecipanti||10, momento:"Mattina" });
                                return c;
                              });
                            }} style={{ padding:"6px 12px", borderRadius:6, border:"none", background:MC.blue, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                              + Aggiungi
                            </button>
                          </div>

                          {/* Righe FB selezionate */}
                          {sels.map((sel, si) => {
                            const globalIdx = data.fb?.findIndex((f,i)=>f.id===item.id && data.fb.slice(0,i+1).filter(x=>x.id===item.id).length === si+1);
                            return (
                              <div key={si} style={{ padding:"8px 14px", background:"#f8f9fc", borderTop:`1px solid ${MC.border}`, display:"flex", alignItems:"center", gap:10 }}>
                                <div style={{ fontSize:11, color:MC.text3 }}>Momento:</div>
                                <select value={sel.momento||"Mattina"} onChange={e=>{
                                  setData(prev=>{const c=JSON.parse(JSON.stringify(prev));c.fb[globalIdx].momento=e.target.value;return c;});
                                }} style={{ fontSize:12, padding:"4px 8px", borderRadius:4, border:`1px solid ${MC.border}`, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                                  {["Mattina","Pranzo","Pomeriggio","Sera","Cena","Welcome"].map(m=><option key={m}>{m}</option>)}
                                </select>
                                <div style={{ fontSize:11, color:MC.text3 }}>Persone:</div>
                                <input type="number" min={1} value={sel.qty} onChange={e=>{
                                  setData(prev=>{const c=JSON.parse(JSON.stringify(prev));c.fb[globalIdx].qty=parseInt(e.target.value)||1;return c;});
                                }} style={{ width:60, padding:"4px 8px", borderRadius:4, border:`1px solid ${MC.border}`, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}/>
                                <span style={{ fontSize:12, color:MC.text3 }}>= {mFmtEur(item.prezzo * sel.qty)}</span>
                                <button onClick={()=>{
                                  setData(prev=>{const c=JSON.parse(JSON.stringify(prev));c.fb.splice(globalIdx,1);return c;});
                                }} style={{ marginLeft:"auto", background:"none", border:"none", color:MC.red, cursor:"pointer", fontSize:16 }}>×</button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <div style={{ marginTop:20, display:"flex", justifyContent:"space-between" }}>
              <button onClick={()=>setActiveTab("attr")} style={btnBack}>← Attrezzature</button>
              <button onClick={()=>setActiveTab("camere")} style={btnNext}>Avanti: Camere Hotel →</button>
            </div>
          </div>
        )}

        {/* ── TAB 5: CAMERE HOTEL ── */}
        {activeTab === "camere" && (
          <CamereTab data={data} setData={setData} reservations={reservations}
            onBack={()=>setActiveTab("fb")} onNext={()=>setActiveTab("riepilogo")} />
        )}

        {/* ── TAB 6: RIEPILOGO ── */}
        {activeTab === "riepilogo" && (
          <RiepilogoTab data={data} setData={setData} sale={sale} calcTotale={calcTotale} onBack={()=>setActiveTab("camere")} onSave={()=>onSave(data)} />
        )}
      </div>
    </div>
  );
}

// ─── CAMERE TAB ──────────────────────────────────────────────────
function CamereTab({ data, setData, reservations, onBack, onNext }) {
  // Raggruppa ROOMS per tipo e prendi prezzo minimo
  const tipiCamera = useMemo(() => {
    const map = {};
    ROOMS.forEach(r => {
      if (!map[r.type]) map[r.type] = { tipo:r.type, prezzoMin:r.price, prezzoMax:r.price, capacita:r.capacity };
      else {
        map[r.type].prezzoMin = Math.min(map[r.type].prezzoMin, r.price);
        map[r.type].prezzoMax = Math.max(map[r.type].prezzoMax, r.price);
        map[r.type].capacita  = Math.max(map[r.type].capacita,  r.capacity);
      }
    });
    return Object.values(map);
  }, []);

  // Conta camere disponibili per tipo nelle date dell'evento
  const disponibili = useCallback((tipo, checkIn, checkOut) => {
    if (!checkIn || !checkOut) return ROOMS.filter(r=>r.type===tipo).length;
    const occupate = reservations.filter(res =>
      ROOMS.find(r=>r.id===res.roomId&&r.type===tipo) &&
      !["cancelled","checked-out"].includes(res.status) &&
      res.checkIn < checkOut && res.checkOut > checkIn
    ).length;
    const totali = ROOMS.filter(r=>r.type===tipo).length;
    return Math.max(0, totali - occupate);
  }, [reservations]);

  const TRATTAMENTI = ["Solo pernottamento","B&B","Mezza pensione","Pensione completa"];
  const ICONE_CAMERA = {
    "Standard":"🛏️","Standard Accessibile":"♿","Superior":"🌟",
    "Deluxe":"✨","Junior Suite":"🛋️","Suite":"👑","Suite Vista Laguna":"🌊",
  };

  const addCamera = (tipo) => {
    setData(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      c.camere = [...(c.camere||[]), {
        tipo, qty:1,
        checkIn:  prev.evento?.dataInizio || "",
        checkOut: prev.evento?.dataFine   || prev.evento?.dataInizio || "",
        trattamento:"B&B", note:"",
      }];
      return c;
    });
  };

  const updCamera = (idx, field, val) => {
    setData(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      c.camere[idx][field] = val;
      return c;
    });
  };

  const removeCamera = (idx) => {
    setData(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      c.camere.splice(idx, 1);
      return c;
    });
  };

  const camere = data.camere || [];
  const ci = data.evento?.dataInizio;
  const co = data.evento?.dataFine || data.evento?.dataInizio;

  return (
    <div>
      <SectionHeader icon="🛏️" title="Camere Hotel" subtitle="Aggiungi camere per i partecipanti all'evento" />

      {/* Info date evento */}
      {ci && (
        <div style={{ background:MC.blueL, border:`1px solid ${MC.blueLb}`, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:MC.navy, display:"flex", alignItems:"center", gap:8 }}>
          📅 Date evento: <strong>{mFmtDate(ci)}</strong> → <strong>{mFmtDate(co||ci)}</strong>
          {" · "}Le date camere sono preimpostate ma modificabili per soggiorni estesi.
        </div>
      )}

      {/* Griglia tipi camera */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:24 }}>
        {tipiCamera.map(t => {
          const disp = disponibili(t.tipo, ci, co);
          const giàAggiunte = camere.filter(c=>c.tipo===t.tipo).reduce((s,c)=>s+(c.qty||1),0);
          const dispReale = Math.max(0, disp - giàAggiunte);
          return (
            <div key={t.tipo} style={{
              border:`1.5px solid ${MC.border}`, borderRadius:10, padding:14, background:MC.surface,
              opacity: dispReale===0 ? .5 : 1,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:24 }}>{ICONE_CAMERA[t.tipo]||"🏨"}</span>
                <div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{t.tipo}</div>
                  <div style={{ fontSize:11, color:MC.text3 }}>fino a {t.capacita} ospiti</div>
                </div>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:MC.blue, marginBottom:4 }}>
                €{t.prezzoMin}{t.prezzoMin!==t.prezzoMax?`–${t.prezzoMax}`:""}<span style={{ fontSize:11, fontWeight:400, color:MC.text3 }}>/notte</span>
              </div>
              <div style={{ fontSize:11, marginBottom:10, color: dispReale>0?MC.green:MC.red, fontWeight:600 }}>
                {dispReale>0 ? `✓ ${dispReale} disponibili` : "✗ Non disponibile"}
              </div>
              <button
                onClick={() => dispReale>0 && addCamera(t.tipo)}
                disabled={dispReale===0}
                style={{
                  width:"100%", padding:"7px", borderRadius:6, border:"none", cursor: dispReale>0?"pointer":"not-allowed",
                  background: dispReale>0 ? MC.blue : MC.border, color: dispReale>0?"#fff":MC.text3,
                  fontSize:12, fontWeight:600, fontFamily:"'IBM Plex Sans',sans-serif",
                }}>
                + Aggiungi
              </button>
            </div>
          );
        })}
      </div>

      {/* Camere selezionate */}
      {camere.length > 0 && (
        <div>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:10, borderBottom:`1px solid ${MC.border}`, paddingBottom:6 }}>
            Camere selezionate ({camere.length})
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {camere.map((cam, idx) => {
              const tipo = tipiCamera.find(t=>t.tipo===cam.tipo);
              const notti = Math.max(1, mDiffDays(cam.checkIn||ci, cam.checkOut||co||ci));
              const subtot = (tipo?.prezzoMin||0) * (cam.qty||1) * notti;
              return (
                <div key={idx} style={{ border:`1.5px solid ${MC.border}`, borderRadius:10, overflow:"hidden" }}>
                  {/* Header riga camera */}
                  <div style={{ background:MC.blueL, padding:"10px 14px", display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:20 }}>{ICONE_CAMERA[cam.tipo]||"🏨"}</span>
                    <span style={{ fontWeight:700, fontSize:14, color:MC.navy, flex:1 }}>{cam.tipo}</span>
                    <span style={{ fontSize:13, fontWeight:700, color:MC.blue }}>≈ {mFmtEur(subtot)}</span>
                    <button onClick={() => removeCamera(idx)} style={{ background:"none", border:"none", color:MC.red, cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 4px" }}>×</button>
                  </div>
                  {/* Dettagli riga */}
                  <div style={{ padding:"12px 14px", display:"grid", gridTemplateColumns:"80px 1fr 1fr auto auto", gap:10, alignItems:"end", background:MC.surface }}>
                    <Field label="N° camere">
                      <input type="number" min={1} max={10} style={{...mInp, textAlign:"center"}}
                        value={cam.qty||1} onChange={e=>updCamera(idx,"qty",Math.max(1,parseInt(e.target.value)||1))}/>
                    </Field>
                    <Field label="Check-In">
                      <input type="date" style={mInp} value={cam.checkIn||ci||""}
                        onChange={e=>updCamera(idx,"checkIn",e.target.value)}/>
                    </Field>
                    <Field label="Check-Out">
                      <input type="date" style={mInp} value={cam.checkOut||co||""}
                        onChange={e=>updCamera(idx,"checkOut",e.target.value)}/>
                    </Field>
                    <Field label="Trattamento">
                      <select style={mInp} value={cam.trattamento||"B&B"}
                        onChange={e=>updCamera(idx,"trattamento",e.target.value)}>
                        {TRATTAMENTI.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </Field>
                    <div style={{ fontSize:11, color:MC.text3, textAlign:"center", paddingBottom:4 }}>
                      <div style={{ fontWeight:700, color:MC.navy, fontSize:13 }}>{notti} nott{notti===1?"e":"i"}</div>
                      <div>× €{tipo?.prezzoMin}/notte</div>
                    </div>
                  </div>
                  <div style={{ padding:"0 14px 12px", background:MC.surface }}>
                    <Field label="Note camera (es. piano alto, letti separati)">
                      <input style={mInp} placeholder="Richieste speciali per questa camera…"
                        value={cam.note||""} onChange={e=>updCamera(idx,"note",e.target.value)}/>
                    </Field>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totale camere */}
          <div style={{ marginTop:12, background:MC.surface2, borderRadius:8, padding:"10px 14px", display:"flex", justifyContent:"space-between", fontSize:13 }}>
            <span style={{ color:MC.text3 }}>Subtotale camere ({camere.reduce((s,c)=>s+(c.qty||1),0)} camera{camere.reduce((s,c)=>s+(c.qty||1),0)!==1?"e":""})</span>
            <span style={{ fontWeight:700 }}>
              {mFmtEur(camere.reduce((s,cam)=>{
                const tipo=tipiCamera.find(t=>t.tipo===cam.tipo);
                const notti=Math.max(1,mDiffDays(cam.checkIn||ci,cam.checkOut||co||ci));
                return s+(tipo?.prezzoMin||0)*(cam.qty||1)*notti;
              },0))}
            </span>
          </div>
        </div>
      )}

      {camere.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px 20px", color:MC.text3, background:MC.surface2, borderRadius:10, border:`1px dashed ${MC.border2}` }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🛏️</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Nessuna camera aggiunta</div>
          <div style={{ fontSize:13 }}>Le camere sono opzionali. Puoi procedere senza aggiungerle.</div>
        </div>
      )}

      <div style={{ marginTop:20, display:"flex", justifyContent:"space-between" }}>
        <button onClick={onBack} style={btnBack}>← F&B</button>
        <button onClick={onNext} style={btnNext}>Avanti: Riepilogo →</button>
      </div>
    </div>
  );
}

// Stile input interno al MICE (alias locale)
const mInp = {
  border:`1.5px solid ${MC.border}`, borderRadius:6, padding:"8px 12px",
  fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", color:MC.text,
  outline:"none", width:"100%", background:MC.surface,
};

// ─── RIEPILOGO TAB ───────────────────────────────────────────────
function RiepilogoTab({ data, setData, sale, calcTotale, onBack, onSave }) {
  const tot      = calcTotale(data, sale);
  const salaObj  = sale.find(s=>s.id===data.sala?.id);
  const giorni   = Math.max(1, mDiffDays(data.evento?.dataInizio, data.evento?.dataFine) + 1);

  const Row = ({ label, val, bold, color, sep }) => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderTop: sep?`1px solid ${MC.border}`:"none", fontWeight:bold?700:400, color:color||MC.text }}>
      <span>{label}</span><span>{val}</span>
    </div>
  );

  return (
    <div>
      <SectionHeader icon="💶" title="Riepilogo Preventivo" />

      <div style={{ display:"grid", gridTemplateColumns:"1fr 360px", gap:24 }}>
        {/* Dettaglio voci */}
        <div>
          {/* Cliente / Evento */}
          <div style={{ background:MC.surface2, borderRadius:8, padding:16, marginBottom:16, fontSize:13 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:8, color:MC.text }}>📋 {data.evento?.titolo || "(senza titolo)"}</div>
            <div style={{ color:MC.text2 }}><b>{data.cliente?.azienda}</b> · {data.cliente?.nome} {data.cliente?.cognome}</div>
            <div style={{ color:MC.text3, marginTop:4 }}>{mFmtDate(data.evento?.dataInizio)}{data.evento?.dataFine&&data.evento.dataFine!==data.evento.dataInizio?` → ${mFmtDate(data.evento.dataFine)}`:""} · {data.evento?.partecipanti} partecipanti</div>
          </div>

          {/* Sala */}
          <div style={{ background:MC.surface2, borderRadius:8, padding:14, marginBottom:12 }}>
            <div style={{ fontWeight:700, fontSize:12, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, marginBottom:8 }}>🏛️ Sala Meeting</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13 }}>
              <span>{salaObj?.nome} — {LAYOUT_LABELS[data.sala?.layout]}, {data.sala?.allestimento}</span>
              <span style={{ fontWeight:700 }}>{mFmtEur(tot.sala)}</span>
            </div>
            <div style={{ fontSize:11, color:MC.text3 }}>
              {giorni} giorno{giorni>1?"i":""} × {mFmtEur(salaObj?.tariffe[data.sala?.allestimento==="Giornata intera"?"intera":"mezza"] || 0)}
            </div>
          </div>

          {/* Attrezzature */}
          {data.attrezzature?.length>0 && (
            <div style={{ background:MC.surface2, borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, marginBottom:8 }}>🖥️ Attrezzature ({data.attrezzature.length})</div>
              {data.attrezzature.map(a=>{
                const item=ATTREZZATURE.find(x=>x.id===a.id);
                return item ? (
                  <div key={a.id} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0" }}>
                    <span>{item.nome} × {a.qty}</span>
                    <span style={{ fontWeight:600 }}>{mFmtEur(item.prezzo*a.qty*giorni)}</span>
                  </div>
                ):null;
              })}
              <div style={{ textAlign:"right", fontSize:12, color:MC.text3, marginTop:6 }}>Subtotale: {mFmtEur(tot.attr)}</div>
            </div>
          )}

          {/* F&B */}
          {data.fb?.length>0 && (
            <div style={{ background:MC.surface2, borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, marginBottom:8 }}>🍽️ Food & Beverage ({data.fb.length})</div>
              {data.fb.map((f,i)=>{
                const item=FB_PACKAGES.find(x=>x.id===f.id);
                return item ? (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"3px 0" }}>
                    <span>{item.nome} · {f.momento} × {f.qty}px</span>
                    <span style={{ fontWeight:600 }}>{mFmtEur(item.prezzo*f.qty)}</span>
                  </div>
                ):null;
              })}
              <div style={{ textAlign:"right", fontSize:12, color:MC.text3, marginTop:6 }}>Subtotale: {mFmtEur(tot.fb)}</div>
            </div>
          )}

          {/* Camere */}
          {data.camere?.length>0 && (
            <div style={{ background:MC.surface2, borderRadius:8, padding:14, marginBottom:12 }}>
              <div style={{ fontWeight:700, fontSize:12, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, marginBottom:8 }}>
                🛏️ Camere Hotel ({data.camere.reduce((s,c)=>s+(c.qty||1),0)} camera{data.camere.reduce((s,c)=>s+(c.qty||1),0)!==1?"e":""})
              </div>
              {data.camere.map((cam,i)=>{
                const tipoRoom=ROOMS.find(r=>r.type===cam.tipo);
                const notti=Math.max(1,mDiffDays(cam.checkIn||data.evento?.dataInizio, cam.checkOut||data.evento?.dataFine||data.evento?.dataInizio));
                return (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"5px 0", borderBottom:`1px solid ${MC.border}` }}>
                    <div>
                      <span style={{fontWeight:600}}>{cam.tipo}</span>
                      <span style={{color:MC.text3}}> × {cam.qty} · {cam.trattamento} · {notti} nott{notti===1?"e":"i"}</span>
                      <div style={{fontSize:11,color:MC.text3}}>{mFmtDate(cam.checkIn)} → {mFmtDate(cam.checkOut)}{cam.note?` · ${cam.note}`:""}</div>
                    </div>
                    <span style={{fontWeight:600}}>{mFmtEur((tipoRoom?.price||0)*(cam.qty||1)*notti)}</span>
                  </div>
                );
              })}
              <div style={{ textAlign:"right", fontSize:12, color:MC.text3, marginTop:6 }}>Subtotale: {mFmtEur(tot.camere)}</div>
            </div>
          )}
        </div>

        {/* Box totali + sconto */}
        <div>
          <div style={{ background:MC.surface, border:`1.5px solid ${MC.border}`, borderRadius:10, padding:20, position:"sticky", top:20 }}>
            <div style={{ fontSize:13, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, marginBottom:12 }}>Totale Preventivo</div>

            <Row label="Sala meeting" val={mFmtEur(tot.sala)} />
            <Row label="Attrezzature" val={mFmtEur(tot.attr)} />
            <Row label="F&B totale" val={mFmtEur(tot.fb)} />
            {tot.camere > 0 && <Row label="Camere hotel" val={mFmtEur(tot.camere)} />}
            <Row label="Subtotale" val={mFmtEur(tot.sub)} bold sep />

            {/* Sconto */}
            <div style={{ padding:"12px 0", borderTop:`1px solid ${MC.border}` }}>
              <div style={{ fontSize:12, color:MC.text3, marginBottom:6 }}>Sconto (%)</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <input type="number" min={0} max={50} step={0.5} value={data.sconto||0}
                  onChange={e=>setData(prev=>({...prev,sconto:parseFloat(e.target.value)||0}))}
                  style={{ width:70, padding:"6px 10px", borderRadius:6, border:`1.5px solid ${MC.border}`, fontSize:14, fontWeight:700, textAlign:"center", fontFamily:"'IBM Plex Sans',sans-serif" }}/>
                <span style={{ fontSize:13, color:MC.red, fontWeight:600 }}>− {mFmtEur(tot.sconto)}</span>
              </div>
            </div>

            <div style={{ height:1, background:MC.border, margin:"4px 0" }}/>
            <Row label="Imponibile netto" val={mFmtEur(tot.sub - tot.sconto)} sep />
            <Row label="IVA 10%" val={mFmtEur(tot.iva)} />

            <div style={{ background:"linear-gradient(135deg,#0a1929,#1565c0)", borderRadius:8, padding:"14px 16px", marginTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:"rgba(255,255,255,.7)", fontSize:14, fontWeight:600 }}>TOTALE IVA incl.</span>
              <span style={{ color:"#fff", fontSize:22, fontWeight:800, fontFamily:"monospace" }}>{mFmtEur(tot.totale)}</span>
            </div>

            <button onClick={onSave} style={{ ...btnNext, width:"100%", justifyContent:"center", marginTop:14, padding:"12px", fontSize:14 }}>
              💾 Salva Preventivo
            </button>
            <button onClick={()=>printPreventivo(data, sale, calcTotale)} style={{ ...btnBack, width:"100%", justifyContent:"center", marginTop:8, padding:"11px", fontSize:13 }}>
              🖨️ Anteprima di stampa
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop:20 }}>
        <button onClick={onBack} style={btnBack}>← Camere Hotel</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  DETTAGLIO PREVENTIVO
// ════════════════════════════════════════════════════════════════
function DettaglioPreventivo({ prev, sale, calcTotale, onEdit, onStato, onDelete, onBack, reservations=[], setReservations=()=>{}, guests=[] }) {
  const [confDel, setConfDel] = useState(false);
  const [creatoMsg, setCreatoMsg] = useState(null);
  const tot      = calcTotale(prev, sale);
  const salaObj  = sale.find(s=>s.id===prev.sala?.id);
  const st       = STATI[prev.stato];
  const giorni   = Math.max(1, mDiffDays(prev.evento?.dataInizio, prev.evento?.dataFine)+1);

  // Crea prenotazioni camere nel PMS
  const creaPrenotazioni = () => {
    if (!prev.camere?.length) return;
    const nuoveRes = [];
    prev.camere.forEach(cam => {
      const roomsDisp = ROOMS.filter(r => r.type === cam.tipo);
      // Trova camere libere nelle date richieste
      const libere = roomsDisp.filter(room => {
        return !reservations.some(res =>
          res.roomId === room.id &&
          !["cancelled"].includes(res.status) &&
          (cam.checkIn||prev.evento?.dataInizio) < (res.checkOut) &&
          (cam.checkOut||prev.evento?.dataFine||prev.evento?.dataInizio) > (res.checkIn)
        );
      });
      const qty = Math.min(cam.qty||1, libere.length);
      for (let i=0; i<qty; i++) {
        nuoveRes.push({
          id: "RES" + Date.now().toString().slice(-6) + Math.floor(Math.random()*100) + i,
          guestId: null,
          guestName: prev.cliente?.azienda || `${prev.cliente?.nome||""} ${prev.cliente?.cognome||""}`.trim() || "Ospite MICE",
          roomId: libere[i].id,
          checkIn:  cam.checkIn  || prev.evento?.dataInizio || "",
          checkOut: cam.checkOut || prev.evento?.dataFine   || prev.evento?.dataInizio || "",
          guests: libere[i].capacity,
          adulti: libere[i].capacity, bambini: 0,
          services: cam.trattamento==="B&B"?["colazione"]:[],
          status: "reserved",
          notes: `MICE ${prev.id} — ${prev.evento?.titolo||""}${cam.note?` — ${cam.note}`:""}`,
          roomServiceItems:[], payments:[],
          psInviato:false, istatRegistrato:false,
          miceId: prev.id,
        });
      }
    });
    if (nuoveRes.length > 0) {
      setReservations(r => [...r, ...nuoveRes]);
      setCreatoMsg(`✓ Create ${nuoveRes.length} prenotazione${nuoveRes.length!==1?"i":""} nel PMS`);
      setTimeout(()=>setCreatoMsg(null), 5000);
    }
  };

  // Prenotazioni già create per questo MICE
  const resCollegati = reservations.filter(r => r.miceId === prev.id);

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={onBack} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontFamily:"'IBM Plex Sans',sans-serif", fontSize:13 }}>← Lista</button>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>{prev.id}</h2>
            <span style={{ padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:700, background:st.bg, color:st.text, border:`1px solid ${st.border}` }}>{st.label}</span>
          </div>
          <div style={{ fontSize:12, color:MC.text3 }}>Creato {mFmtDate(prev.creatoIl)}{prev.inviatoIl?` · Inviato ${mFmtDate(prev.inviatoIl)}`:""}{prev.confermatoIl?` · Confermato ${mFmtDate(prev.confermatoIl)}`:""}</div>
        </div>
        <div style={{ flex:1 }}/>
        <div style={{ display:"flex", gap:8 }}>
          {prev.stato === "bozza"   && <CtaBtn color={MC.blue} onClick={()=>onStato(prev.id,"inviato")}>📤 Segna come Inviato</CtaBtn>}
          {prev.stato === "inviato" && <CtaBtn color={MC.green} onClick={()=>onStato(prev.id,"confermato")}>✅ Conferma</CtaBtn>}
          {prev.stato === "inviato" && <CtaBtn color={MC.red} outline onClick={()=>onStato(prev.id,"declinato")}>✗ Declinato</CtaBtn>}
          {prev.stato === "confermato" && <CtaBtn color={MC.purple} onClick={()=>onStato(prev.id,"completato")}>🏁 Segna Completato</CtaBtn>}
          <button onClick={onEdit} style={{ padding:"8px 16px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>✏️ Modifica</button>
          <button onClick={()=>printPreventivo(prev, sale, calcTotale)} style={{ padding:"8px 16px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>🖨️ Stampa</button>
          {!confDel && <button onClick={()=>setConfDel(true)} style={{ padding:"8px 14px", borderRadius:6, border:`1px solid ${MC.redL}`, background:MC.redL, color:MC.red, cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>🗑</button>}
          {confDel && <><button onClick={()=>onDelete(prev.id)} style={{ padding:"8px 14px", borderRadius:6, border:`none`, background:MC.red, color:"#fff", cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", fontWeight:700 }}>Elimina</button><button onClick={()=>setConfDel(false)} style={{ padding:"8px 12px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer" }}>Annulla</button></>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
        {/* Main */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Evento */}
          <InfoCard icon="🎯" title={prev.evento?.titolo || "(senza titolo)"} subtitle={`${prev.evento?.tipo} · ${prev.evento?.partecipanti} partecipanti`}>
            <InfoGrid items={[
              { k:"Data inizio", v:mFmtDate(prev.evento?.dataInizio) },
              { k:"Data fine",   v:mFmtDate(prev.evento?.dataFine)||"—" },
              { k:"Ora inizio",  v:prev.evento?.oraInizio },
              { k:"Ora fine",    v:prev.evento?.oraFine },
              { k:"Durata",      v:`${giorni} giorno${giorni>1?"i":""}` },
            ]}/>
            {prev.note && <div style={{ marginTop:10, background:MC.amberL, border:`1px solid ${MC.amberLb}`, borderRadius:6, padding:"8px 12px", fontSize:12, color:MC.amber }}>📌 {prev.note}</div>}
          </InfoCard>

          {/* Cliente */}
          <InfoCard icon="🏢" title={prev.cliente?.azienda||"—"} subtitle={`${prev.cliente?.nome} ${prev.cliente?.cognome}`.trim()}>
            <InfoGrid items={[
              { k:"Email",  v:<a href={`mailto:${prev.cliente?.email}`} style={{color:MC.blue}}>{prev.cliente?.email}</a> },
              { k:"Tel",    v:prev.cliente?.tel },
              { k:"P.IVA",  v:prev.cliente?.piva||"—" },
            ]}/>
          </InfoCard>

          {/* Sala */}
          {salaObj && (
            <InfoCard icon="🏛️" title={salaObj.nome} subtitle={`Piano ${salaObj.piano} · ${salaObj.mq} mq`}>
              <InfoGrid items={[
                { k:"Layout",     v:LAYOUT_LABELS[prev.sala?.layout]||"—" },
                { k:"Tariffa",    v:prev.sala?.allestimento||"—" },
                { k:"Costo sala", v:mFmtEur(tot.sala) },
              ]}/>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:10 }}>
                {salaObj.dotazioni.map(d=><span key={d} style={{ fontSize:11, padding:"3px 8px", borderRadius:20, background:MC.surface2, border:`1px solid ${MC.border}`, color:MC.text2 }}>✓ {d}</span>)}
              </div>
            </InfoCard>
          )}

          {/* Attrezzature */}
          {prev.attrezzature?.length>0 && (
            <InfoCard icon="🖥️" title="Attrezzature" subtitle={`${prev.attrezzature.length} voce${prev.attrezzature.length>1?"i":""}`}>
              {prev.attrezzature.map(a=>{
                const item=ATTREZZATURE.find(x=>x.id===a.id);
                return item?<div key={a.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13 }}>
                  <span>{item.nome} <span style={{color:MC.text3}}>× {a.qty}</span></span>
                  <span style={{fontWeight:600}}>{mFmtEur(item.prezzo*a.qty*giorni)}</span>
                </div>:null;
              })}
            </InfoCard>
          )}

          {/* F&B */}
          {prev.fb?.length>0 && (
            <InfoCard icon="🍽️" title="Food & Beverage" subtitle={`${prev.fb.length} servizi`}>
              {prev.fb.map((f,i)=>{
                const item=FB_PACKAGES.find(x=>x.id===f.id);
                return item?<div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13 }}>
                  <span>{item.nome} <span style={{color:MC.text3}}>· {f.momento} · {f.qty}px</span></span>
                  <span style={{fontWeight:600}}>{mFmtEur(item.prezzo*f.qty)}</span>
                </div>:null;
              })}
            </InfoCard>
          )}

          {/* Camere hotel */}
          {prev.camere?.length>0 && (
            <InfoCard icon="🛏️" title="Camere Hotel" subtitle={`${prev.camere.reduce((s,c)=>s+(c.qty||1),0)} camera${prev.camere.reduce((s,c)=>s+(c.qty||1),0)!==1?"e":""} · ${mFmtEur(tot.camere)}`}>
              {prev.camere.map((cam,i)=>{
                const tipoRoom=ROOMS.find(r=>r.type===cam.tipo);
                const notti=Math.max(1,mDiffDays(cam.checkIn||prev.evento?.dataInizio, cam.checkOut||prev.evento?.dataFine||prev.evento?.dataInizio));
                return (
                  <div key={i} style={{ padding:"8px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{fontWeight:600}}>{cam.tipo} × {cam.qty}</span>
                      <span style={{fontWeight:600}}>{mFmtEur((tipoRoom?.price||0)*(cam.qty||1)*notti)}</span>
                    </div>
                    <div style={{fontSize:11,color:MC.text3}}>
                      {mFmtDate(cam.checkIn)} → {mFmtDate(cam.checkOut)} · {notti} nott{notti===1?"e":"i"} · {cam.trattamento}
                      {cam.note ? ` · ${cam.note}` : ""}
                    </div>
                  </div>
                );
              })}

              {/* Prenotazioni già create */}
              {resCollegati.length > 0 && (
                <div style={{ marginTop:12, background:MC.greenL, border:`1px solid ${MC.greenLb}`, borderRadius:6, padding:"8px 12px" }}>
                  <div style={{ fontSize:11, fontWeight:700, color:MC.green, marginBottom:4 }}>✓ Prenotazioni PMS collegate ({resCollegati.length})</div>
                  {resCollegati.map(r => (
                    <div key={r.id} style={{ fontSize:12, color:MC.green }}>
                      {r.id} · Camera {r.roomId} · {r.checkIn} → {r.checkOut}
                    </div>
                  ))}
                </div>
              )}

              {/* Bottone crea prenotazioni */}
              {prev.stato === "confermato" && resCollegati.length === 0 && (
                <div style={{ marginTop:12 }}>
                  <button onClick={creaPrenotazioni} style={{
                    width:"100%", padding:"10px", borderRadius:8, border:"none", cursor:"pointer",
                    background:`linear-gradient(135deg,${MC.green},#2ecc71)`, color:"#fff",
                    fontWeight:700, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
                    boxShadow:"0 4px 14px rgba(27,122,74,.3)",
                  }}>
                    🏨 Crea prenotazioni nel PMS
                  </button>
                  <div style={{ fontSize:11, color:MC.text3, textAlign:"center", marginTop:4 }}>
                    Le camere verranno registrate in "Prenotazioni" con stato Riservato
                  </div>
                </div>
              )}
              {prev.stato === "confermato" && resCollegati.length > 0 && (
                <div style={{ marginTop:10 }}>
                  <button onClick={creaPrenotazioni} style={{
                    width:"100%", padding:"8px", borderRadius:8, border:`1px solid ${MC.border}`,
                    cursor:"pointer", background:MC.surface, color:MC.text3,
                    fontSize:12, fontFamily:"'IBM Plex Sans',sans-serif",
                  }}>
                    + Crea ulteriori prenotazioni
                  </button>
                </div>
              )}
              {prev.stato !== "confermato" && resCollegati.length === 0 && (
                <div style={{ marginTop:10, fontSize:12, color:MC.text3, background:MC.amberL, borderRadius:6, padding:"8px 10px" }}>
                  ⚠ Conferma il preventivo per creare le prenotazioni nel PMS
                </div>
              )}
              {creatoMsg && (
                <div style={{ marginTop:8, background:MC.greenL, color:MC.green, borderRadius:6, padding:"8px 12px", fontSize:13, fontWeight:600, textAlign:"center" }}>
                  {creatoMsg}
                </div>
              )}
            </InfoCard>
          )}
        </div>

        {/* Sidebar totali */}
        <div>
          <div style={{ background:MC.surface, border:`1.5px solid ${MC.border}`, borderRadius:10, padding:20, position:"sticky", top:20 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:14 }}>Riepilogo Economico</div>
            {[
              { label:"Sala meeting", val:tot.sala },
              { label:"Attrezzature", val:tot.attr },
              { label:"Food & Beverage", val:tot.fb },
              ...(tot.camere>0 ? [{ label:"Camere hotel", val:tot.camere }] : []),
            ].map(r=>(
              <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13 }}>
                <span style={{color:MC.text2}}>{r.label}</span><span style={{fontWeight:600}}>{mFmtEur(r.val)}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13, fontWeight:600 }}>
              <span>Subtotale</span><span>{mFmtEur(tot.sub)}</span>
            </div>
            {prev.sconto>0 && <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13, color:MC.red }}>
              <span>Sconto {prev.sconto}%</span><span>− {mFmtEur(tot.sconto)}</span>
            </div>}
            <div style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${MC.border}`, fontSize:13 }}>
              <span style={{color:MC.text2}}>IVA 10%</span><span>{mFmtEur(tot.iva)}</span>
            </div>
            <div style={{ background:"linear-gradient(135deg,#0a1929,#1565c0)", borderRadius:8, padding:"14px 16px", marginTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:"rgba(255,255,255,.7)", fontSize:13 }}>TOTALE IVA incl.</span>
              <span style={{ color:"#fff", fontSize:20, fontWeight:800 }}>{mFmtEur(tot.totale)}</span>
            </div>

            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:8 }}>Cambia stato</div>
              <select value={prev.stato} onChange={e=>onStato(prev.id,e.target.value)} style={{ width:"100%", padding:"9px", borderRadius:6, border:`1.5px solid ${MC.border}`, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>
                {Object.entries(STATI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  GESTIONE SALE
// ════════════════════════════════════════════════════════════════
function GestioneSale({ sale, preventivi, onSalva }) {
  const [editing, setEditing]   = useState(null);
  const [editData, setEditData] = useState(null);

  const startEdit = (sala) => {
    setEditing(sala.id);
    setEditData(JSON.parse(JSON.stringify(sala)));
  };

  const saveEdit = () => {
    onSalva(editData);
    setEditing(null);
  };

  const upd = (path, val) => {
    setEditData(prev => {
      const c = JSON.parse(JSON.stringify(prev));
      const parts = path.split(".");
      let obj = c;
      for (let i=0;i<parts.length-1;i++) obj=obj[parts[i]];
      obj[parts[parts.length-1]] = val;
      return c;
    });
  };

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontSize:22, fontWeight:700 }}>Configurazione Sale Meeting</h2>
        <p style={{ fontSize:13, color:MC.text3 }}>5 sale configurabili. Modifica capienze, tariffe e dotazioni.</p>
      </div>

      <div style={{ display:"grid", gap:16 }}>
        {sale.map(sala => {
          const occTotali = preventivi.filter(p=>p.sala?.id===sala.id&&p.stato==="confermato").length;
          const isEditing = editing === sala.id;
          const sd = isEditing ? editData : sala;

          return (
            <div key={sala.id} style={{ background:MC.surface, borderRadius:12, border:`1px solid ${MC.border}`, overflow:"hidden" }}>
              {/* Header sala */}
              <div style={{ borderLeft:`5px solid ${sala.colore}`, padding:"14px 20px", display:"flex", alignItems:"center", gap:14, borderBottom: isEditing?`1px solid ${MC.border}`:"none" }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:18, fontWeight:800, color:sala.colore }}>{sala.nome}</span>
                    <span style={{ fontSize:11, color:MC.text3 }}>Piano {sala.piano} · {sala.mq} mq</span>
                    <span style={{ fontSize:11, background:sala.attiva?MC.greenL:MC.redL, color:sala.attiva?MC.green:MC.red, border:`1px solid ${sala.attiva?MC.greenLb:MC.redLb}`, borderRadius:20, padding:"2px 8px" }}>
                      {sala.attiva?"● Attiva":"● Inattiva"}
                    </span>
                  </div>
                  <div style={{ fontSize:12, color:MC.text3, marginTop:2 }}>{occTotali} eventi confermati in totale</div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  {!isEditing && <button onClick={()=>startEdit(sala)} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>✏️ Modifica</button>}
                  {isEditing && <>
                    <button onClick={saveEdit} style={{ padding:"7px 16px", borderRadius:6, border:"none", background:MC.blue, color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>💾 Salva</button>
                    <button onClick={()=>setEditing(null)} style={{ padding:"7px 14px", borderRadius:6, border:`1px solid ${MC.border}`, background:MC.surface, cursor:"pointer", fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif" }}>Annulla</button>
                  </>}
                </div>
              </div>

              {/* Vista sintetica (non edit) */}
              {!isEditing && (
                <div style={{ padding:"14px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:16 }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:6 }}>Capienze</div>
                    {Object.entries(sala.capienze).map(([k,v])=>v>0?<div key={k} style={{fontSize:12,color:MC.text2,marginBottom:2}}>{LAYOUT_ICONS[k]} {LAYOUT_LABELS[k]}: <b>{v}</b>px</div>:null)}
                  </div>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:6 }}>Tariffe</div>
                    <div style={{fontSize:12,color:MC.text2,marginBottom:2}}>½ giornata: <b>{mFmtEur(sala.tariffe.mezza)}</b></div>
                    <div style={{fontSize:12,color:MC.text2,marginBottom:2}}>Giornata: <b>{mFmtEur(sala.tariffe.intera)}</b></div>
                    {sala.tariffe.settimanale>0&&<div style={{fontSize:12,color:MC.text2}}>Settimana: <b>{mFmtEur(sala.tariffe.settimanale)}</b></div>}
                  </div>
                  <div style={{ gridColumn:"3/5" }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:6 }}>Dotazioni</div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                      {sala.dotazioni.map(d=><span key={d} style={{fontSize:11,padding:"2px 8px",borderRadius:20,background:MC.surface2,border:`1px solid ${MC.border}`,color:MC.text2}}>✓ {d}</span>)}
                    </div>
                  </div>
                </div>
              )}

              {/* FORM MODIFICA */}
              {isEditing && (
                <div style={{ padding:20 }}>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
                    <Field label="Nome Sala">
                      <input style={inp} value={sd.nome} onChange={e=>upd("nome",e.target.value)}/>
                    </Field>
                    <Field label="Piano">
                      <input style={inp} type="number" min={1} max={10} value={sd.piano} onChange={e=>upd("piano",parseInt(e.target.value)||1)}/>
                    </Field>
                    <Field label="Superficie (mq)">
                      <input style={inp} type="number" min={10} value={sd.mq} onChange={e=>upd("mq",parseInt(e.target.value)||10)}/>
                    </Field>
                  </div>

                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:10, borderBottom:`1px solid ${MC.border}`, paddingBottom:6 }}>Capienze per layout</div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:20 }}>
                    {Object.entries(sd.capienze).map(([k,v])=>(
                      <Field key={k} label={`${LAYOUT_ICONS[k]} ${LAYOUT_LABELS[k]}`}>
                        <input style={{...inp,textAlign:"center"}} type="number" min={0} value={v} onChange={e=>upd(`capienze.${k}`,parseInt(e.target.value)||0)}/>
                      </Field>
                    ))}
                  </div>

                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:MC.text3, marginBottom:10, borderBottom:`1px solid ${MC.border}`, paddingBottom:6 }}>Tariffe (€/periodo)</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:20 }}>
                    <Field label="Mezza Giornata (€)">
                      <input style={inp} type="number" min={0} value={sd.tariffe.mezza} onChange={e=>upd("tariffe.mezza",parseFloat(e.target.value)||0)}/>
                    </Field>
                    <Field label="Giornata Intera (€)">
                      <input style={inp} type="number" min={0} value={sd.tariffe.intera} onChange={e=>upd("tariffe.intera",parseFloat(e.target.value)||0)}/>
                    </Field>
                    <Field label="Settimanale (€, 0=no)">
                      <input style={inp} type="number" min={0} value={sd.tariffe.settimanale} onChange={e=>upd("tariffe.settimanale",parseFloat(e.target.value)||0)}/>
                    </Field>
                  </div>

                  <Field label="Note (interne)">
                    <textarea style={{...inp, height:60, resize:"vertical"}} value={sd.note} onChange={e=>upd("note",e.target.value)}/>
                  </Field>

                  <div style={{ marginTop:12, display:"flex", gap:8, alignItems:"center" }}>
                    <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
                      <input type="checkbox" checked={sd.attiva} onChange={e=>upd("attiva",e.target.checked)} style={{width:16,height:16,accentColor:MC.blue}}/>
                      Sala attiva (disponibile per prenotazione)
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
//  PRINT / STAMPA PREVENTIVO
// ════════════════════════════════════════════════════════════════
function printPreventivo(prev, sale, calcTotale) {
  const tot      = calcTotale(prev, sale);
  const salaObj  = sale.find(s=>s.id===prev.sala?.id);
  const giorni   = Math.max(1, mDiffDays(prev.evento?.dataInizio, prev.evento?.dataFine)+1);
  const st       = STATI[prev.stato];

  const righeAttr = (prev.attrezzature||[]).map(a=>{
    const item=ATTREZZATURE.find(x=>x.id===a.id);
    return item ? `<tr><td>${item.nome}</td><td style="text-align:center">${a.qty} × ${giorni}gg</td><td style="text-align:right;font-weight:600">€ ${(item.prezzo*a.qty*giorni).toFixed(2)}</td></tr>` : "";
  }).join("");

  const righeFb = (prev.fb||[]).map(f=>{
    const item=FB_PACKAGES.find(x=>x.id===f.id);
    return item ? `<tr><td>${item.nome} <span style="color:#888">· ${f.momento}</span></td><td style="text-align:center">${f.qty} px</td><td style="text-align:right;font-weight:600">€ ${(item.prezzo*f.qty).toFixed(2)}</td></tr>` : "";
  }).join("");

  const html = `<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"/>
<title>Preventivo ${prev.id} — Hotel Gasparini MICE</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;600;700&display=swap" rel="stylesheet"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'IBM Plex Sans',sans-serif;color:#1a2535;background:#fff;padding:0}
  .page{max-width:800px;margin:0 auto;padding:40px}
  .hdr{background:linear-gradient(135deg,#0a1929,#1565c0);color:#fff;padding:32px;border-radius:0 0 12px 12px;margin-bottom:32px}
  .hdr h1{font-size:28px;font-weight:700;margin-bottom:4px}
  .hdr-row{display:flex;justify-content:space-between;align-items:flex-start}
  .badge{display:inline-block;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:rgba(255,255,255,.15);color:#fff;margin-top:8px}
  .logo-area{text-align:right}
  .logo-area h2{font-size:20px;font-weight:700;color:#fff}
  .logo-area p{font-size:11px;color:rgba(255,255,255,.6);letter-spacing:2px;text-transform:uppercase}
  h3{font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#607080;border-bottom:2px solid #dde3ec;padding-bottom:6px;margin:24px 0 12px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;margin-bottom:8px}
  .grid2 .lbl{color:#8896a8;font-size:11px}
  .grid2 .val{font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f5f7fa;padding:8px 12px;text-align:left;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:#8896a8}
  td{padding:8px 12px;border-bottom:1px solid #dde3ec}
  .total-box{background:linear-gradient(135deg,#0a1929,#1565c0);color:#fff;border-radius:10px;padding:20px 24px;margin-top:20px}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px}
  .total-final{display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.2);margin-top:8px;padding-top:10px;font-size:20px;font-weight:800}
  .footer{margin-top:32px;text-align:center;font-size:11px;color:#8896a8;border-top:1px solid #dde3ec;padding-top:16px}
  @media print{.page{padding:20px}.hdr{border-radius:0}}
</style>
</head><body>
<div class="page">
  <div class="hdr">
    <div class="hdr-row">
      <div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:.6;margin-bottom:4px">PREVENTIVO MICE</div>
        <h1>${prev.id}</h1>
        <span class="badge">${st.label}</span>
        <div style="font-size:12px;margin-top:8px;opacity:.7">Emesso il ${mFmtDate(prev.creatoIl)}</div>
      </div>
      <div class="logo-area">
        <h2>Hotel Gasparini ★★★</h2>
        <p>Chioggia · Venezia</p>
        <p style="margin-top:4px">Corso del Popolo 1059</p>
        <p>info@hotelgasparini.it</p>
      </div>
    </div>
  </div>

  <h3>Cliente & Azienda</h3>
  <div class="grid2">
    <div><div class="lbl">Azienda</div><div class="val">${prev.cliente?.azienda||"—"}</div></div>
    <div><div class="lbl">Referente</div><div class="val">${prev.cliente?.nome||""} ${prev.cliente?.cognome||""}</div></div>
    <div><div class="lbl">Email</div><div class="val">${prev.cliente?.email||"—"}</div></div>
    <div><div class="lbl">Telefono</div><div class="val">${prev.cliente?.tel||"—"}</div></div>
    <div><div class="lbl">P.IVA</div><div class="val">${prev.cliente?.piva||"—"}</div></div>
  </div>

  <h3>Dettagli Evento</h3>
  <div class="grid2">
    <div><div class="lbl">Evento</div><div class="val">${prev.evento?.titolo||"—"}</div></div>
    <div><div class="lbl">Tipologia</div><div class="val">${prev.evento?.tipo||"—"}</div></div>
    <div><div class="lbl">Data inizio</div><div class="val">${mFmtDate(prev.evento?.dataInizio)}</div></div>
    <div><div class="lbl">Data fine</div><div class="val">${mFmtDate(prev.evento?.dataFine)||"—"}</div></div>
    <div><div class="lbl">Orari</div><div class="val">${prev.evento?.oraInizio||"—"} → ${prev.evento?.oraFine||"—"}</div></div>
    <div><div class="lbl">Partecipanti</div><div class="val">${prev.evento?.partecipanti||"—"}</div></div>
  </div>
  ${prev.note?`<div style="background:#fff3e0;border-left:3px solid #e65100;padding:10px 14px;border-radius:4px;font-size:13px;color:#7d3a00;margin-top:8px">📌 ${prev.note}</div>`:""}

  <h3>Sala Meeting</h3>
  <table>
    <thead><tr><th>Sala</th><th>Layout</th><th>Durata</th><th>Tariffa/gg</th><th style="text-align:right">Totale</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>${salaObj?.nome||"—"}</strong></td>
        <td>${LAYOUT_LABELS[prev.sala?.layout]||"—"}</td>
        <td>${prev.sala?.allestimento||"—"} × ${giorni}gg</td>
        <td>€ ${(salaObj?.tariffe[prev.sala?.allestimento==="Giornata intera"?"intera":"mezza"]||0).toFixed(2)}</td>
        <td style="text-align:right;font-weight:700">€ ${tot.sala.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  ${righeAttr ? `<h3>Attrezzature</h3><table><thead><tr><th>Voce</th><th>Quantità</th><th style="text-align:right">Importo</th></tr></thead><tbody>${righeAttr}</tbody></table>` : ""}
  ${righeFb ? `<h3>Food & Beverage</h3><table><thead><tr><th>Servizio</th><th>Persone</th><th style="text-align:right">Importo</th></tr></thead><tbody>${righeFb}</tbody></table>` : ""}

  <div class="total-box">
    <div class="total-row"><span>Sala meeting</span><span>€ ${tot.sala.toFixed(2)}</span></div>
    <div class="total-row"><span>Attrezzature</span><span>€ ${tot.attr.toFixed(2)}</span></div>
    <div class="total-row"><span>Food & Beverage</span><span>€ ${tot.fb.toFixed(2)}</span></div>
    <div class="total-row"><span>Subtotale</span><span>€ ${tot.sub.toFixed(2)}</span></div>
    ${prev.sconto>0?`<div class="total-row" style="color:#fca5a5"><span>Sconto ${prev.sconto}%</span><span>− € ${tot.sconto.toFixed(2)}</span></div>`:""}
    <div class="total-row"><span>IVA 10%</span><span>€ ${tot.iva.toFixed(2)}</span></div>
    <div class="total-final"><span>TOTALE IVA inclusa</span><span>€ ${tot.totale.toFixed(2)}</span></div>
  </div>

  <div class="footer">
    <p>Hotel Gasparini S.r.l. · Corso del Popolo 1059, 30015 Chioggia (VE) · P.IVA 01234567890</p>
    <p style="margin-top:4px">Preventivo valido 30 giorni dalla data di emissione. La prenotazione si perfeziona al ricevimento del deposito del 30%.</p>
  </div>
</div>
<script>window.print()</script>
</body></html>`;

  const w = window.open("","_blank","width=900,height=700");
  w.document.write(html);
  w.document.close();
}

// ════════════════════════════════════════════════════════════════
//  HELPER COMPONENTS
// ════════════════════════════════════════════════════════════════
function Field({ label, children, mt, style }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:5, marginTop:mt||0, ...style }}>
      <label style={{ fontSize:11, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:MC.text3 }}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, mt }) {
  return (
    <div style={{ marginTop:mt||0, marginBottom:16, paddingBottom:8, borderBottom:`2px solid ${MC.border}`, display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div>
        <div style={{ fontSize:15, fontWeight:700 }}>{title}</div>
        {subtitle && <div style={{ fontSize:12, color:MC.text3 }}>{subtitle}</div>}
      </div>
    </div>
  );
}

function InfoCard({ icon, title, subtitle, children }) {
  return (
    <div style={{ background:MC.surface, border:`1px solid ${MC.border}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ padding:"12px 16px", borderBottom:`1px solid ${MC.border}`, display:"flex", alignItems:"center", gap:8, background:MC.surface2 }}>
        <span style={{ fontSize:15 }}>{icon}</span>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{title}</div>
          {subtitle && <div style={{ fontSize:11, color:MC.text3 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ padding:"14px 16px" }}>{children}</div>
    </div>
  );
}

function InfoGrid({ items }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
      {items.map(it=>(
        <div key={it.k}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:MC.text3, marginBottom:2 }}>{it.k}</div>
          <div style={{ fontSize:13, fontWeight:600 }}>{it.v||"—"}</div>
        </div>
      ))}
    </div>
  );
}

function CtaBtn({ color, outline, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding:"8px 16px", borderRadius:6, cursor:"pointer", fontWeight:700, fontSize:13,
      fontFamily:"'IBM Plex Sans',sans-serif",
      border: outline?`1.5px solid ${color}`:"none",
      background: outline?"transparent":color,
      color: outline?color:"#fff",
    }}>{children}</button>
  );
}

// ─── STYLE CONSTANTS ─────────────────────────────────────────────
const inp = {
  border:`1.5px solid ${MC.border}`, borderRadius:6, padding:"8px 12px",
  fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif", color:MC.text,
  outline:"none", width:"100%", background:MC.surface,
};
const grid2 = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 };
const btnNext = {
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"10px 20px", borderRadius:6, border:"none",
  background:MC.blue, color:"#fff", cursor:"pointer", fontWeight:700,
  fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
};
const btnBack = {
  display:"inline-flex", alignItems:"center", gap:6,
  padding:"10px 18px", borderRadius:6, border:`1px solid ${MC.border}`,
  background:MC.surface, color:MC.text2, cursor:"pointer",
  fontSize:13, fontFamily:"'IBM Plex Sans',sans-serif",
};



// ═══════════════════════════════════════════════════════════════════
//  MODULO BI — Business Intelligence Dashboard
//  Hotel Gasparini PMS · KPI · Charts · Heatmap · Trend Analysis
// ═══════════════════════════════════════════════════════════════════

// ─── DATI DEMO (12 mesi di storia) ──────────────────────────────────
const DEMO_STATS_RES = (() => {
  const ROOM_TYPES  = ["Standard","Standard","Standard","Standard","Standard","Superior","Superior","Deluxe","Deluxe","Junior Suite","Suite","Suite Vista Laguna"];
  const ROOM_PRICES = { "Standard":90,"Superior":140,"Deluxe":190,"Junior Suite":240,"Suite":300,"Suite Vista Laguna":360 };
  const NAZIONI     = ["IT","IT","IT","IT","IT","DE","DE","DE","FR","FR","GB","AT","CH","NL","US","BE","PL","CN","JP","ES"];
  const SERVIZI_ALL = [["colazione"],["colazione","parcheggio"],["spa","colazione"],["colazione"],["parcheggio"],["transfer"],["colazione","minibar"],["spa"],[]];
  const METODI      = ["Carta di Credito","Carta di Credito","Carta di Credito","Contanti","Bonifico","PayPal"];
  const SVC_PRICE   = {colazione:18,parcheggio:20,spa:45,transfer:60,minibar:35,laundry:25};
  const BASE = new Date("2026-02-26");

  // Stagionalità mensile (gen=0 … dic=11)
  const STAGIONE = [0.44,0.49,0.60,0.71,0.82,0.91,0.96,0.93,0.86,0.70,0.53,0.46];
  // Fattore giorno settimana (0=dom … 6=sab)
  const DOW_W    = [0.65,0.78,0.82,0.85,0.90,0.95,0.72];

  const res = []; let id = 2000;
  for (let m = 0; m < 14; m++) {
    const d = new Date(BASE); d.setMonth(d.getMonth() - m);
    const mese = d.getMonth();
    const anno = d.getFullYear();
    const giorni_nel_mese = new Date(anno, mese+1, 0).getDate();
    const coeff = STAGIONE[mese];
    const nPrenotazioni = Math.round(20 * coeff + (Math.random()*5-2.5));
    for (let i = 0; i < nPrenotazioni; i++) {
      const gg = Math.floor(Math.random() * (giorni_nel_mese - 5)) + 1;
      const dow = new Date(anno, mese, gg).getDay();
      const notti = Math.floor(Math.random() * 5) + 1;
      const tipo  = ROOM_TYPES[Math.floor(Math.random()*ROOM_TYPES.length)];
      const prezzo = ROOM_PRICES[tipo] || 120;
      const svcs = SERVIZI_ALL[Math.floor(Math.random()*SERVIZI_ALL.length)];
      const svcCost = svcs.reduce((s,sv)=>s+(SVC_PRICE[sv]||0),0);
      const ci = new Date(anno,mese,gg);
      const co = new Date(ci); co.setDate(co.getDate()+notti);
      const totale = prezzo * notti + svcCost;
      const naz = NAZIONI[Math.floor(Math.random()*NAZIONI.length)];
      const adulti = Math.floor(Math.random()*2)+1;
      const stato  = m===0&&i<3?"checked-in":m===0&&i<7?"reserved":"checked-out";
      // Booking window (giorni di anticipo)
      const window = Math.floor(Math.random()*90);
      res.push({
        id:`RS${id++}`, guestName:`Ospite ${id}`, guestId:`G_DEMO_${id}`,
        roomId: 100+Math.floor(Math.random()*50), roomType:tipo,
        checkIn:ci.toISOString().slice(0,10), checkOut:co.toISOString().slice(0,10),
        notti, adulti, bambini:Math.random()>.75?1:0, guests:adulti,
        services:svcs, status:stato,
        payments:[{amount:totale,method:METODI[Math.floor(Math.random()*METODI.length)],date:ci.toISOString().slice(0,10)}],
        nazionalita:naz, prezzo, totale, dow, bookingWindow:window,
        istatRegistrato:stato==="checked-out", psInviato:stato==="checked-out",
      });
    }
  }
  return res;
})();

// ─── BI COLOR PALETTE (dark theme) ──────────────────────────────────
const BI = {
  bg:       "#070c14",
  surface:  "#0d1520",
  surface2: "#111d2e",
  surface3: "#162336",
  border:   "#1e3048",
  border2:  "#243a56",
  text:     "#e2eaf5",
  text2:    "#8aa3bf",
  text3:    "#4a6480",
  // Accenti
  cyan:     "#00c8ff",
  cyanDim:  "#0a3d52",
  green:    "#00e676",
  greenDim: "#0a3322",
  red:      "#ff4d6d",
  redDim:   "#3a0a14",
  amber:    "#ffa726",
  amberDim: "#3a2200",
  purple:   "#b388ff",
  purpleDim:"#2a1a4a",
  // Serie grafici
  series: ["#00c8ff","#00e676","#ffa726","#b388ff","#ff4d6d","#40c4ff","#69f0ae","#ffd740"],
};

// ─── MINI COMPONENTI SVG ────────────────────────────────────────────
function SparkLine({ data, color="#00c8ff", width=80, height=28 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data.map((v,i) => {
    const x = (i / (data.length-1)) * width;
    const y = height - ((v-min)/range) * (height-4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const area = `0,${height} ` + pts + ` ${width},${height}`;
  return (
    <svg width={width} height={height} style={{overflow:"visible"}}>
      <defs>
        <linearGradient id={`sg_${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg_${color.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function AreaChart({ data, color="#00c8ff", color2=null, label1="", label2="", yFmt=v=>v, width=440, height=160 }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data || data.length === 0) return null;
  const pad = { l:44, r:12, t:10, b:28 };
  const cw = width - pad.l - pad.r;
  const ch = height - pad.t - pad.b;

  const vals1 = data.map(d=>d.v1||0);
  const vals2 = data.map(d=>d.v2||0);
  const allVals = color2 ? [...vals1,...vals2] : vals1;
  const maxV = Math.max(...allVals, 1);

  const toX = i => pad.l + (i/(data.length-1)) * cw;
  const toY = v => pad.t + ch - (v/maxV)*ch;

  const pts1 = data.map((d,i)=>`${toX(i)},${toY(d.v1||0)}`).join(" ");
  const area1 = `${pad.l},${pad.t+ch} ` + pts1 + ` ${pad.l+cw},${pad.t+ch}`;
  const pts2 = color2 ? data.map((d,i)=>`${toX(i)},${toY(d.v2||0)}`).join(" ") : "";
  const area2 = color2 ? `${pad.l},${pad.t+ch} ` + pts2 + ` ${pad.l+cw},${pad.t+ch}` : "";

  // Y grid lines (4)
  const yTicks = [0,.25,.5,.75,1].map(f=>maxV*f);

  return (
    <svg width={width} height={height} style={{overflow:"visible",cursor:"crosshair"}}
      onMouseMove={e=>{
        const rect = e.currentTarget.getBoundingClientRect();
        const mx = e.clientX - rect.left - pad.l;
        const idx = Math.round(mx/cw*(data.length-1));
        if(idx>=0&&idx<data.length) setTooltip({idx,x:toX(idx),y:e.clientY-rect.top});
      }}
      onMouseLeave={()=>setTooltip(null)}>
      <defs>
        <linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        {color2 && <linearGradient id="ga2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color2} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={color2} stopOpacity="0"/>
        </linearGradient>}
      </defs>
      {/* Grid */}
      {yTicks.map((v,i)=>(
        <g key={i}>
          <line x1={pad.l} y1={toY(v)} x2={pad.l+cw} y2={toY(v)} stroke={BI.border} strokeWidth="1" strokeDasharray="3,4"/>
          <text x={pad.l-6} y={toY(v)+4} textAnchor="end" fontSize="9" fill={BI.text3}>{yFmt(v)}</text>
        </g>
      ))}
      {/* Areas */}
      {color2 && <polygon points={area2} fill="url(#ga2)"/>}
      <polygon points={area1} fill="url(#ga1)"/>
      {/* Lines */}
      {color2 && <polyline points={pts2} fill="none" stroke={color2} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4,3"/>}
      <polyline points={pts1} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      {/* X labels */}
      {data.filter((_,i)=>i%2===0||data.length<=8).map((d,origIdx)=>(
        <text key={origIdx} x={toX(origIdx*( data.length<=8 ? 1 : 2))} y={pad.t+ch+16} textAnchor="middle" fontSize="9" fill={BI.text3}>{d.label}</text>
      ))}
      {/* Tooltip */}
      {tooltip && tooltip.idx < data.length && (
        <g>
          <line x1={tooltip.x} y1={pad.t} x2={tooltip.x} y2={pad.t+ch} stroke={BI.text3} strokeWidth="1" strokeDasharray="3,3"/>
          <circle cx={tooltip.x} cy={toY(data[tooltip.idx].v1||0)} r="4" fill={color} stroke={BI.bg} strokeWidth="2"/>
          {color2&&<circle cx={tooltip.x} cy={toY(data[tooltip.idx].v2||0)} r="3" fill={color2} stroke={BI.bg} strokeWidth="1.5"/>}
          <rect x={tooltip.x+8} y={tooltip.y-28} width={90} height={color2?38:22} rx="4" fill={BI.surface3} stroke={BI.border2}/>
          <text x={tooltip.x+13} y={tooltip.y-14} fontSize="10" fill={BI.text}>{label1}: {yFmt(data[tooltip.idx].v1||0)}</text>
          {color2&&<text x={tooltip.x+13} y={tooltip.y+2} fontSize="10" fill={color2}>{label2}: {yFmt(data[tooltip.idx].v2||0)}</text>}
        </g>
      )}
    </svg>
  );
}

function DonutChart({ slices, size=120 }) {
  const r = size*0.38, cx=size/2, cy=size/2, stroke=size*0.18;
  const tot = slices.reduce((s,v)=>s+v.val,0)||1;
  let angle = -90;
  const paths = slices.map(s=>{
    const pct=s.val/tot, a1=angle*Math.PI/180, a2=(angle+pct*360)*Math.PI/180;
    const x1=cx+r*Math.cos(a1),y1=cy+r*Math.sin(a1),x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2);
    const large=pct>0.5?1:0;
    const d=`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2}Z`;
    angle+=pct*360;
    return {...s,d,pct};
  });
  return (
    <svg width={size} height={size}>
      {paths.map((p,i)=><path key={i} d={p.d} fill={p.color} stroke={BI.bg} strokeWidth="2"/>)}
      <circle cx={cx} cy={cy} r={r-stroke} fill={BI.surface}/>
    </svg>
  );
}

function HeatMap({ data, rows, cols, colorFn, cellW=32, cellH=22 }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:2}}>
      {rows.map((row,ri)=>(
        <div key={ri} style={{display:"flex",alignItems:"center",gap:2}}>
          <div style={{width:28,fontSize:9,color:BI.text3,textAlign:"right",paddingRight:4,flexShrink:0}}>{row}</div>
          {cols.map((col,ci)=>{
            const v=data[ri]?.[ci]??0;
            const {bg,label}=colorFn(v);
            return (
              <div key={ci} title={`${row} ${col}: ${label}`} style={{
                width:cellW,height:cellH,borderRadius:3,background:bg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:8,color:v>0.6?"#000":"#fff",fontWeight:600,cursor:"default",
                transition:"transform .1s",
              }}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.15)"}
              onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}>
                {v>0?Math.round(v*100):""}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{display:"flex",gap:2,marginTop:4}}>
        <div style={{width:28}}/>
        {cols.map((c,i)=><div key={i} style={{width:cellW,textAlign:"center",fontSize:9,color:BI.text3}}>{c}</div>)}
      </div>
    </div>
  );
}

// ─── MAIN MODULE ────────────────────────────────────────────────────
function StatisticheModule({ reservations=[], guests=[], rooms=[] }) {
  const [periodo,    setPeriodo]    = useState("12m");
  const [sezione,    setSezione]    = useState("overview");
  const [confronto,  setConfronto]  = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("tutti");

  // ─── MERGE dati reali + demo ──────────────────────────────────────
  const allRes = useMemo(()=>{
    const reali = reservations.map(r=>{
      if(r.roomType) return r;
      const rm=ROOMS.find(x=>x.id===r.roomId);
      return{...r,roomType:rm?.type||"Standard",prezzo:rm?.price||90,
        totale:(r.payments||[]).reduce((s,p)=>s+(p.amount||0),0),
        nazionalita:guests.find(g=>g.id===r.guestId)?.nazionalita||"IT",
        notti:Math.max(1,Math.round((new Date(r.checkOut)-new Date(r.checkIn))/86400000)),
      };
    });
    return [...DEMO_STATS_RES,...reali];
  },[reservations,guests]);

  // ─── RANGE PERIODI ────────────────────────────────────────────────
  const ranges = useMemo(()=>{
    const oggi = new Date("2026-02-26");
    const sub  = (months) => { const d=new Date(oggi);d.setMonth(d.getMonth()-months);return d.toISOString().slice(0,10); };
    const map  = {
      "1m":  { cur:[sub(1),oggi.toISOString().slice(0,10)],   prev:[sub(2),sub(1)],   label:"Ultimo mese" },
      "3m":  { cur:[sub(3),oggi.toISOString().slice(0,10)],   prev:[sub(6),sub(3)],   label:"Ultimi 3 mesi" },
      "6m":  { cur:[sub(6),oggi.toISOString().slice(0,10)],   prev:[sub(12),sub(6)],  label:"Ultimi 6 mesi" },
      "12m": { cur:[sub(12),oggi.toISOString().slice(0,10)],  prev:[sub(24),sub(12)], label:"Ultimi 12 mesi" },
      "ytd": { cur:["2026-01-01",oggi.toISOString().slice(0,10)], prev:["2025-01-01","2025-02-26"], label:"Anno corrente" },
    };
    return map[periodo]||map["12m"];
  },[periodo]);

  const filterRes = useCallback((from,to,tipo="tutti")=>
    allRes.filter(r=>r.checkIn>=from&&r.checkIn<=to&&r.status!=="cancelled"&&(tipo==="tutti"||r.roomType===tipo))
  ,[allRes]);

  const resCur  = useMemo(()=>filterRes(...ranges.cur,filtroTipo),[filterRes,ranges,filtroTipo]);
  const resPrev = useMemo(()=>filterRes(...ranges.prev,filtroTipo),[filterRes,ranges,filtroTipo]);

  // ─── KPI CALC ─────────────────────────────────────────────────────
  const calcKPI = useCallback((res,from,to)=>{
    const giorni=Math.max(1,Math.round((new Date(to)-new Date(from))/86400000));
    const filteredRooms = filtroTipo==="tutti" ? ROOMS : ROOMS.filter(r=>r.type===filtroTipo);
    const totCam=filteredRooms.length;
    const dispNotti=totCam*giorni;
    const venduteNotti=res.reduce((s,r)=>s+(r.notti||1),0);
    const revCam=res.reduce((s,r)=>s+((r.prezzo||90)*(r.notti||1)),0);
    const revSvc=res.reduce((s,r)=>s+Math.max(0,(r.totale||0)-((r.prezzo||90)*(r.notti||1))),0);
    const n=res.length;
    return {
      occ:   dispNotti>0?Math.min(100,(venduteNotti/dispNotti)*100):0,
      adr:   venduteNotti>0?revCam/venduteNotti:0,
      revpar:dispNotti>0?revCam/dispNotti:0,
      trevpar:dispNotti>0?(revCam+revSvc)/dispNotti:0,
      los:   n>0?venduteNotti/n:0,
      rev:   revCam+revSvc,
      revCam,revSvc,n,venduteNotti,dispNotti,
    };
  },[filtroTipo]);

  const kpiCur  = useMemo(()=>calcKPI(resCur,...ranges.cur),[calcKPI,resCur,ranges]);
  const kpiPrev = useMemo(()=>calcKPI(resPrev,...ranges.prev),[calcKPI,resPrev,ranges]);

  // Delta % vs periodo precedente
  const delta = useCallback((cur,prev)=>{
    if(prev===0) return {pct:null,up:true};
    const pct=(cur-prev)/prev*100;
    return {pct,up:pct>=0,fmt:(pct>=0?"▲":"▼")+Math.abs(pct).toFixed(1)+"%"};
  },[]);

  // ─── TREND MENSILE ────────────────────────────────────────────────
  const trendMensile = useMemo(()=>{
    const mesi=[];
    const base=new Date("2026-02-26");
    for(let i=11;i>=0;i--){
      const d=new Date(base); d.setMonth(d.getMonth()-i);
      const key=d.toISOString().slice(0,7);
      const label=d.toLocaleDateString("it-IT",{month:"short"}).slice(0,3).toUpperCase();
      const res=allRes.filter(r=>r.checkIn?.startsWith(key)&&r.status!=="cancelled"&&(filtroTipo==="tutti"||r.roomType===filtroTipo));
      const giorni=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
      const filteredRooms=filtroTipo==="tutti"?ROOMS:ROOMS.filter(r=>r.type===filtroTipo);
      const disp=filteredRooms.length*giorni;
      const notti=res.reduce((s,r)=>s+(r.notti||1),0);
      const rev=res.reduce((s,r)=>s+((r.prezzo||90)*(r.notti||1)),0);
      const adr=notti>0?rev/notti:0;
      const prevKey=new Date(d.getFullYear(),d.getMonth()-12,1).toISOString().slice(0,7);
      const resPrevM=allRes.filter(r=>r.checkIn?.startsWith(prevKey)&&r.status!=="cancelled");
      const revPrevM=resPrevM.reduce((s,r)=>s+((r.prezzo||90)*(r.notti||1)),0);
      mesi.push({key,label,v1:rev,v2:revPrevM,occ:disp>0?Math.min(100,notti/disp*100):0,adr,res:res.length});
    }
    return mesi;
  },[allRes,filtroTipo]);

  // Sparkline data per KPI
  const sparklines = useMemo(()=>{
    const base=new Date("2026-02-26");
    return ["occ","adr","revpar","rev","los"].reduce((acc,k)=>{
      acc[k]=Array.from({length:8},(_,i)=>{
        const d=new Date(base);d.setMonth(d.getMonth()-(7-i));
        const key=d.toISOString().slice(0,7);
        const res=allRes.filter(r=>r.checkIn?.startsWith(key)&&r.status!=="cancelled");
        const giorni=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();
        const disp=ROOMS.length*giorni;
        const notti=res.reduce((s,r)=>s+(r.notti||1),0);
        const rev=res.reduce((s,r)=>s+((r.prezzo||90)*(r.notti||1)),0);
        if(k==="occ")    return disp>0?notti/disp*100:0;
        if(k==="adr")    return notti>0?rev/notti:0;
        if(k==="revpar") return disp>0?rev/disp:0;
        if(k==="rev")    return rev;
        if(k==="los")    return res.length>0?notti/res.length:0;
        return 0;
      });
      return acc;
    },{});
  },[allRes]);

  // ─── HEATMAP DoW × Mese ──────────────────────────────────────────
  const heatData = useMemo(()=>{
    const DOW=["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
    const MESI_12=[];
    const base=new Date("2026-02-26");
    for(let i=5;i>=0;i--){const d=new Date(base);d.setMonth(d.getMonth()-i);MESI_12.push(d.toISOString().slice(0,7));}
    const grid=DOW.map(()=>MESI_12.map(()=>0));
    const cnt =DOW.map(()=>MESI_12.map(()=>0));
    allRes.filter(r=>r.status!=="cancelled").forEach(r=>{
      if(!r.checkIn) return;
      const d=new Date(r.checkIn+"T12:00:00");
      const dow=(d.getDay()+6)%7; // 0=lun
      const mkey=r.checkIn.slice(0,7);
      const mi=MESI_12.indexOf(mkey);
      if(mi>=0){grid[dow][mi]+=(r.notti||1);cnt[dow][mi]++;}
    });
    const flatRooms=ROOMS.length;
    const maxVal=Math.max(1,...grid.flat());
    return{
      rows:DOW,
      cols:MESI_12.map(k=>{const d=new Date(k+"-15");return d.toLocaleDateString("it-IT",{month:"short"}).toUpperCase();}),
      data:grid.map(row=>row.map(v=>v/maxVal)),
      raw:grid,
    };
  },[allRes]);

  // ─── PERFORMANCE PER TIPO CAMERA ─────────────────────────────────
  const perfTipo = useMemo(()=>{
    const tipi=[...new Set(ROOMS.map(r=>r.type))];
    return tipi.map(tipo=>{
      const res=resCur.filter(r=>r.roomType===tipo);
      const nc=ROOMS.filter(r=>r.type===tipo).length;
      const giorni=Math.max(1,Math.round((new Date(ranges.cur[1])-new Date(ranges.cur[0]))/86400000));
      const disp=nc*giorni,notti=res.reduce((s,r)=>s+(r.notti||1),0);
      const rev=res.reduce((s,r)=>s+((r.prezzo||90)*(r.notti||1)),0);
      return{tipo,nc,res:res.length,occ:disp>0?Math.min(100,notti/disp*100):0,adr:notti>0?rev/notti:0,revpar:disp>0?rev/disp:0,rev};
    }).sort((a,b)=>b.rev-a.rev);
  },[resCur,ranges]);

  // ─── TOP NAZIONALITÀ ─────────────────────────────────────────────
  const topNaz = useMemo(()=>{
    const map={};
    resCur.forEach(r=>{const n=r.nazionalita||"IT";map[n]=(map[n]||0)+1;});
    const NOMI={IT:"Italia",DE:"Germania",FR:"Francia",GB:"Gran Bretagna",AT:"Austria",CH:"Svizzera",NL:"Olanda",US:"USA",BE:"Belgio",PL:"Polonia",RU:"Russia",CN:"Cina",JP:"Giappone",ES:"Spagna"};
    const FLAGS={IT:"🇮🇹",DE:"🇩🇪",FR:"🇫🇷",GB:"🇬🇧",AT:"🇦🇹",CH:"🇨🇭",NL:"🇳🇱",US:"🇺🇸",BE:"🇧🇪",PL:"🇵🇱",RU:"🇷🇺",CN:"🇨🇳",JP:"🇯🇵",ES:"🇪🇸"};
    return Object.entries(map).map(([k,v])=>({k,nome:NOMI[k]||k,flag:FLAGS[k]||"🌍",val:v})).sort((a,b)=>b.val-a.val).slice(0,8);
  },[resCur]);

  // ─── BOOKING WINDOW ──────────────────────────────────────────────
  const bookingWindow = useMemo(()=>[
    {label:"Same day",check:n=>n===0},
    {label:"1-7 gg",check:n=>n>=1&&n<=7},
    {label:"8-14 gg",check:n=>n>=8&&n<=14},
    {label:"15-30 gg",check:n=>n>=15&&n<=30},
    {label:"31-60 gg",check:n=>n>=31&&n<=60},
    {label:"61-90 gg",check:n=>n>=61&&n<=90},
    {label:"90+ gg",check:n=>n>90},
  ].map(f=>({...f,val:resCur.filter(r=>f.check(r.bookingWindow??0)).length})),[resCur]);

  // ─── FORMATTERS ───────────────────────────────────────────────────
  const fE  = n=>"€"+(n||0).toLocaleString("it-IT",{maximumFractionDigits:0});
  const fP  = n=>(n||0).toFixed(1)+"%";
  const fN  = n=>(n||0).toFixed(1);

  // ─── TIPI CAMERA per filtro ───────────────────────────────────────
  const tipiCamera = [...new Set(ROOMS.map(r=>r.type))];

  // Heatmap color fn
  const heatColor = (v)=>{
    if(v===0) return {bg:BI.surface3,label:"0"};
    const intensity=Math.min(1,v);
    if(intensity<0.33) return {bg:`rgba(0,200,255,${0.15+intensity*0.5})`,label:fP(v*100)};
    if(intensity<0.67) return {bg:`rgba(0,230,118,${0.25+intensity*0.4})`,label:fP(v*100)};
    return {bg:`rgba(255,167,38,${0.35+intensity*0.45})`,label:fP(v*100)};
  };

  // ─── UI HELPERS ───────────────────────────────────────────────────
  const KPICard = ({label,val,delta:d,spark,sparkColor,unit,icon})=>{
    const dEl = d && d.pct!==null ? (
      <span style={{fontSize:11,color:d.up?BI.green:BI.red,fontWeight:700,marginLeft:6}}>{d.fmt}</span>
    ):null;
    return (
      <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:"14px 16px",display:"flex",flexDirection:"column",gap:6,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",bottom:0,right:0,opacity:.35}}>
          {spark && <SparkLine data={spark} color={sparkColor||BI.cyan} width={80} height={36}/>}
        </div>
        <div style={{fontSize:11,color:BI.text3,letterSpacing:.8,textTransform:"uppercase",fontWeight:600}}>{icon} {label}</div>
        <div style={{fontSize:26,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:BI.text,letterSpacing:-1}}>
          {val}{unit&&<span style={{fontSize:14,fontWeight:400,color:BI.text2,marginLeft:2}}>{unit}</span>}
        </div>
        {confronto && <div style={{fontSize:11,color:BI.text3}}>
          vs periodo prec.{dEl}
        </div>}
      </div>
    );
  };

  const sezNav=[
    {k:"overview",icon:"◈",label:"Overview"},
    {k:"revenue",icon:"◆",label:"Revenue"},
    {k:"ospiti",icon:"◉",label:"Ospiti"},
    {k:"camere",icon:"▣",label:"Camere"},
    {k:"booking",icon:"◎",label:"Booking"},
  ];

  // ─── RENDER ───────────────────────────────────────────────────────
  return (
    <div style={{background:BI.bg,borderRadius:12,minHeight:"calc(100vh - 120px)",padding:20,fontFamily:"'IBM Plex Sans',monospace",color:BI.text}}>
      <style>{`
        .bi-tab:hover{background:${BI.surface2}!important;}
        .bi-row:hover{background:${BI.surface2}!important;}
        .bi-pill{display:inline-flex;align-items:center;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid;}
        @keyframes biPulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* ── TOPBAR ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:36,height:36,borderRadius:8,background:"linear-gradient(135deg,#00c8ff22,#00c8ff44)",border:`1px solid ${BI.cyan}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>📊</div>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:BI.cyan,letterSpacing:.5}}>BUSINESS INTELLIGENCE</div>
            <div style={{fontSize:11,color:BI.text3}}>{ranges.label} · {resCur.length} prenotazioni analizzate</div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          {/* Filtro tipo camera */}
          <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
            style={{background:BI.surface2,border:`1px solid ${BI.border2}`,color:BI.text2,padding:"6px 10px",borderRadius:6,fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif",cursor:"pointer"}}>
            <option value="tutti">Tutte le camere</option>
            {tipiCamera.map(t=><option key={t} value={t}>{t}</option>)}
          </select>

          {/* Periodo */}
          <div style={{display:"flex",background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:8,padding:3,gap:2}}>
            {[["1m","1M"],["3m","3M"],["6m","6M"],["12m","12M"],["ytd","YTD"]].map(([k,l])=>(
              <button key={k} onClick={()=>setPeriodo(k)} className="bi-tab" style={{
                padding:"5px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,
                fontFamily:"'IBM Plex Mono',monospace",letterSpacing:.5,
                background:periodo===k?"linear-gradient(135deg,#00c8ff22,#00c8ff11)":"transparent",
                color:periodo===k?BI.cyan:BI.text3,
                boxShadow:periodo===k?`0 0 8px ${BI.cyan}22`:"none",
              }}>{l}</button>
            ))}
          </div>

          {/* Toggle confronto */}
          <button onClick={()=>setConfronto(v=>!v)} style={{
            padding:"6px 12px",borderRadius:6,border:`1px solid ${confronto?BI.cyan+"44":BI.border}`,
            background:confronto?BI.cyanDim:"transparent",color:confronto?BI.cyan:BI.text3,
            fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"'IBM Plex Sans',sans-serif",
          }}>
            {confronto?"◈ VS PREV":"◯ VS PREV"}
          </button>
        </div>
      </div>

      {/* ── SEZIONI NAV ── */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:`1px solid ${BI.border}`}}>
        {sezNav.map(s=>(
          <button key={s.k} onClick={()=>setSezione(s.k)} className="bi-tab" style={{
            padding:"8px 18px",border:"none",cursor:"pointer",background:"transparent",
            color:sezione===s.k?BI.cyan:BI.text3,fontWeight:sezione===s.k?700:400,
            fontSize:12,fontFamily:"'IBM Plex Sans',sans-serif",letterSpacing:.5,
            borderBottom:`2px solid ${sezione===s.k?BI.cyan:"transparent"}`,
            display:"flex",alignItems:"center",gap:6,marginBottom:-1,
            transition:"all .15s",
          }}>
            <span style={{fontSize:14,color:sezione===s.k?BI.cyan:BI.text3}}>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* ════════ OVERVIEW ════════ */}
      {sezione==="overview"&&(
        <div>
          {/* KPI Row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
            <KPICard label="Occupancy"   val={fP(kpiCur.occ)}    delta={delta(kpiCur.occ,kpiPrev.occ)}    spark={sparklines.occ}    sparkColor={BI.cyan}   icon="◈"/>
            <KPICard label="ADR"         val={fE(kpiCur.adr)}    delta={delta(kpiCur.adr,kpiPrev.adr)}    spark={sparklines.adr}    sparkColor={BI.green}  icon="◆"/>
            <KPICard label="RevPAR"      val={fE(kpiCur.revpar)} delta={delta(kpiCur.revpar,kpiPrev.revpar)} spark={sparklines.revpar} sparkColor={BI.purple} icon="◉"/>
            <KPICard label="LOS medio"   val={fN(kpiCur.los)}    delta={delta(kpiCur.los,kpiPrev.los)}     spark={sparklines.los}    sparkColor={BI.amber}  unit="notti" icon="▣"/>
            <KPICard label="Revenue"     val={fE(kpiCur.rev)}    delta={delta(kpiCur.rev,kpiPrev.rev)}     spark={sparklines.rev}    sparkColor={BI.green}  icon="◎"/>
          </div>

          {/* Chart area: Revenue trend + OCC trend */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:BI.text}}>Revenue camere · 12 mesi</div>
                  <div style={{fontSize:11,color:BI.text3}}>Confronto anno precedente</div>
                </div>
                <div style={{display:"flex",gap:12,fontSize:10,color:BI.text3}}>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2,background:BI.green,borderRadius:1}}/> Anno corr.</span>
                  <span style={{display:"flex",alignItems:"center",gap:4}}><span style={{display:"inline-block",width:16,height:2,background:BI.text3,borderRadius:1,borderTop:"2px dashed "+BI.text3}}/> Anno prec.</span>
                </div>
              </div>
              <AreaChart data={trendMensile.map(m=>({label:m.label,v1:m.v1,v2:m.v2}))}
                color={BI.green} color2={BI.text3} label1="Cur" label2="Prev"
                yFmt={v=>v>0?Math.round(v/1000)+"k":"0"} width={380} height={160}/>
            </div>

            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{marginBottom:12}}>
                <div style={{fontSize:13,fontWeight:700,color:BI.text}}>Occupancy % · 12 mesi</div>
                <div style={{fontSize:11,color:BI.text3}}>Con soglia obiettivo 75%</div>
              </div>
              <svg width={380} height={160} style={{overflow:"visible"}}>
                {/* Target line 75% */}
                <line x1={44} y1={44+132-(75/100*132)} x2={392} y2={44+132-(75/100*132)}
                  stroke={BI.amber} strokeWidth="1" strokeDasharray="4,4" opacity=".5"/>
                <text x={46} y={44+132-(75/100*132)-4} fontSize="9" fill={BI.amber} opacity=".7">75%</text>
                {/* Bars */}
                {trendMensile.map((m,i)=>{
                  const barW=22,gap=8,x=44+i*(barW+gap);
                  const h=Math.max(2,(m.occ/100)*132);
                  const y=44+132-h;
                  const color=m.occ>75?BI.cyan:m.occ>50?BI.purple:BI.red;
                  return(
                    <g key={i}>
                      <rect x={x} y={y} width={barW} height={h} rx="2"
                        fill={color} opacity=".8"/>
                      <text x={x+barW/2} y={44+132+12} textAnchor="middle" fontSize="9" fill={BI.text3}>{m.label}</text>
                    </g>
                  );
                })}
                {/* Y axis */}
                {[0,25,50,75,100].map(v=>(
                  <g key={v}>
                    <line x1={44} y1={44+132-(v/100*132)} x2={392} y2={44+132-(v/100*132)} stroke={BI.border} strokeWidth="1"/>
                    <text x={38} y={44+132-(v/100*132)+4} textAnchor="end" fontSize="9" fill={BI.text3}>{v}%</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Heatmap + Donut */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:14}}>
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:4}}>Heatmap occupazione · Giorno settimana × Mese</div>
              <div style={{fontSize:11,color:BI.text3,marginBottom:14}}>Intensità = notti vendute normalizzate</div>
              <HeatMap data={heatData.data} rows={heatData.rows} cols={heatData.cols} colorFn={heatColor} cellW={38} cellH={24}/>
              <div style={{display:"flex",gap:6,marginTop:12,alignItems:"center",fontSize:10,color:BI.text3}}>
                <span>Bassa</span>
                {[.1,.25,.4,.55,.7,.85,1].map((v,i)=><div key={i} style={{width:18,height:10,borderRadius:2,background:heatColor(v).bg}}/>)}
                <span>Alta</span>
              </div>
            </div>

            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:4}}>Revenue mix</div>
              <div style={{fontSize:11,color:BI.text3,marginBottom:12}}>Composizione periodo</div>
              {(()=>{
                const slices=[
                  {label:"Camere",val:kpiCur.revCam,color:BI.cyan},
                  {label:"Servizi",val:kpiCur.revSvc,color:BI.green},
                ].filter(s=>s.val>0);
                const tot=slices.reduce((s,v)=>s+v.val,0)||1;
                return(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
                    <DonutChart slices={slices} size={110}/>
                    <div style={{width:"100%"}}>
                      {slices.map((s,i)=>(
                        <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:i>0?`1px solid ${BI.border}`:"none",fontSize:12}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <div style={{width:8,height:8,borderRadius:"50%",background:s.color}}/>
                            <span style={{color:BI.text2}}>{s.label}</span>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontWeight:700,fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:s.color}}>{fE(s.val)}</div>
                            <div style={{fontSize:10,color:BI.text3}}>{(s.val/tot*100).toFixed(0)}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ════════ REVENUE ════════ */}
      {sezione==="revenue"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {label:"Revenue Totale",val:fE(kpiCur.rev),dlt:delta(kpiCur.rev,kpiPrev.rev),color:BI.cyan,icon:"◈"},
              {label:"Revenue Camere",val:fE(kpiCur.revCam),dlt:delta(kpiCur.revCam,kpiPrev.revCam),color:BI.green,icon:"◆"},
              {label:"Revenue Servizi",val:fE(kpiCur.revSvc),dlt:delta(kpiCur.revSvc,kpiPrev.revSvc),color:BI.purple,icon:"◉"},
              {label:"TRevPAR",val:fE(kpiCur.trevpar),dlt:delta(kpiCur.trevpar,kpiPrev.trevpar),color:BI.amber,icon:"▣"},
            ].map((k,i)=>(
              <div key={i} style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16,borderTop:`2px solid ${k.color}44`}}>
                <div style={{fontSize:11,color:BI.text3,marginBottom:6,letterSpacing:.8,textTransform:"uppercase"}}>{k.icon} {k.label}</div>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:k.color}}>{k.val}</div>
                {confronto&&k.dlt.pct!==null&&<div style={{fontSize:11,color:k.dlt.up?BI.green:BI.red,marginTop:4,fontWeight:700}}>{k.dlt.fmt} vs periodo prec.</div>}
              </div>
            ))}
          </div>

          {/* ADR + RevPAR per tipo camera */}
          <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:16}}>Performance per tipo di camera</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr>
                    {["Tipo","Camere","Soggiorni","Occupancy","ADR","RevPAR","Revenue"].map(h=>(
                      <th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:BI.text3,borderBottom:`1px solid ${BI.border}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perfTipo.map((c,i)=>(
                    <tr key={c.tipo} className="bi-row" style={{borderBottom:`1px solid ${BI.border}`,transition:"background .1s",cursor:"default"}}>
                      <td style={{padding:"10px 12px",fontWeight:700,color:BI.series[i%BI.series.length]}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:BI.series[i%BI.series.length],boxShadow:`0 0 4px ${BI.series[i%BI.series.length]}`}}/>
                          {c.tipo}
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",color:BI.text3}}>{c.nc}</td>
                      <td style={{padding:"10px 12px"}}>{c.res}</td>
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:8}}>
                          <div style={{width:50,height:5,background:BI.surface3,borderRadius:3}}>
                            <div style={{width:`${Math.min(100,c.occ)}%`,height:"100%",borderRadius:3,background:c.occ>75?BI.green:c.occ>50?BI.cyan:BI.red}}/>
                          </div>
                          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:11,color:c.occ>75?BI.green:c.occ>50?BI.cyan:BI.red}}>{c.occ.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700}}>{fE(c.adr)}</td>
                      <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,color:BI.cyan}}>{fE(c.revpar)}</td>
                      <td style={{padding:"10px 12px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:800,color:BI.green}}>{fE(c.rev)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ════════ OSPITI ════════ */}
      {sezione==="ospiti"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
            {[
              {label:"Soggiorni",val:kpiCur.n,dlt:delta(kpiCur.n,kpiPrev.n),color:BI.cyan},
              {label:"Ospiti totali",val:kpiCur.n>0?Math.round(kpiCur.n*1.8):0,color:BI.green},
              {label:"LOS medio",val:fN(kpiCur.los)+" notti",dlt:delta(kpiCur.los,kpiPrev.los),color:BI.purple},
              {label:"Mercati attivi",val:topNaz.length,color:BI.amber},
            ].map((k,i)=>(
              <div key={i} style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
                <div style={{fontSize:11,color:BI.text3,marginBottom:6,letterSpacing:.8,textTransform:"uppercase"}}>{k.label}</div>
                <div style={{fontSize:24,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:k.color}}>{k.val}</div>
                {confronto&&k.dlt&&k.dlt.pct!==null&&<div style={{fontSize:11,color:k.dlt.up?BI.green:BI.red,marginTop:4,fontWeight:700}}>{k.dlt.fmt}</div>}
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {/* Top mercati */}
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:16}}>Top mercati di provenienza</div>
              {topNaz.map((n,i)=>{
                const maxN=topNaz[0]?.val||1;
                return(
                  <div key={n.k} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{fontSize:16,width:22,flexShrink:0}}>{n.flag}</div>
                    <div style={{width:100,fontSize:12,color:BI.text2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{n.nome}</div>
                    <div style={{flex:1,background:BI.surface3,borderRadius:3,height:8}}>
                      <div style={{width:`${(n.val/maxN)*100}%`,height:"100%",borderRadius:3,
                        background:`linear-gradient(90deg,${BI.series[i%BI.series.length]},${BI.series[i%BI.series.length]}66)`,
                        boxShadow:`0 0 6px ${BI.series[i%BI.series.length]}44`}}/>
                    </div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,width:28,textAlign:"right",fontSize:12}}>{n.val}</div>
                    <div style={{color:BI.text3,fontSize:10,width:30,textAlign:"right"}}>{resCur.length>0?(n.val/resCur.length*100).toFixed(0):0}%</div>
                  </div>
                );
              })}
            </div>

            {/* LOS distribution */}
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:16}}>Distribuzione durata soggiorno (LOS)</div>
              {[
                {label:"1 notte",check:n=>n===1},
                {label:"2 notti",check:n=>n===2},
                {label:"3 notti",check:n=>n===3},
                {label:"4–6 notti",check:n=>n>=4&&n<=6},
                {label:"7+ notti",check:n=>n>=7},
              ].map((f,i)=>{
                const v=resCur.filter(r=>f.check(r.notti||1)).length;
                const maxV=Math.max(...[1,2,3,4,7].map(n=>resCur.filter(r=>r.notti===n).length),1);
                return(
                  <div key={f.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{width:70,fontSize:12,color:BI.text2}}>{f.label}</div>
                    <div style={{flex:1,background:BI.surface3,borderRadius:3,height:12,position:"relative"}}>
                      <div style={{width:`${(v/Math.max(resCur.length||1,1))*100}%`,height:"100%",borderRadius:3,
                        background:`linear-gradient(90deg,${BI.series[i]},${BI.series[i]}66)`}}/>
                    </div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:12,width:28,textAlign:"right"}}>{v}</div>
                    <div style={{fontSize:10,color:BI.text3,width:30,textAlign:"right"}}>{resCur.length>0?(v/resCur.length*100).toFixed(0):0}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════ CAMERE ════════ */}
      {sezione==="camere"&&(
        <div>
          {/* ADR Scatter-like: tipo vs ADR vs Occ */}
          <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:4}}>ADR vs Occupancy — per tipo camera</div>
            <div style={{fontSize:11,color:BI.text3,marginBottom:16}}>Ogni barra: ADR (altezza) e Occupancy (colore). Ampiezza = n° camere del tipo.</div>
            <svg width={700} height={200} viewBox="0 0 700 200" preserveAspectRatio="xMidYMid meet" style={{overflow:"visible",maxWidth:"100%"}}>
              {perfTipo.map((c,i)=>{
                const maxAdr=Math.max(...perfTipo.map(x=>x.adr),1);
                const barW=Math.max(20,Math.min(60,c.nc*8));
                const x=50+i*90;
                const h=Math.max(4,(c.adr/maxAdr)*150);
                const y=170-h;
                const color=c.occ>75?BI.cyan:c.occ>50?BI.purple:BI.red;
                return(
                  <g key={c.tipo}>
                    <defs>
                      <linearGradient id={`bg${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.9"/>
                        <stop offset="100%" stopColor={color} stopOpacity="0.3"/>
                      </linearGradient>
                    </defs>
                    <rect x={x} y={y} width={barW} height={h} rx="3" fill={`url(#bg${i})`}/>
                    <text x={x+barW/2} y={168} textAnchor="middle" fontSize="10" fill={color} fontWeight="700">{fE(c.adr)}</text>
                    <text x={x+barW/2} y={182} textAnchor="middle" fontSize="8" fill={BI.text3}>{c.tipo.split(" ")[0]}</text>
                    <text x={x+barW/2} y={y-4} textAnchor="middle" fontSize="9" fill={BI.text3}>{c.occ.toFixed(0)}%</text>
                  </g>
                );
              })}
              {[0,.25,.5,.75,1].map((v,i)=>{
                const maxAdr=Math.max(...perfTipo.map(x=>x.adr),1);
                const y=170-(v*150);
                return<g key={i}>
                  <line x1={40} y1={y} x2={680} y2={y} stroke={BI.border} strokeWidth="1"/>
                  <text x={34} y={y+4} textAnchor="end" fontSize="8" fill={BI.text3}>{fE(maxAdr*v)}</text>
                </g>;
              })}
            </svg>
          </div>

          {/* Tabella dettagliata */}
          <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
            <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:16}}>Revenue matrix · Tipo × KPI</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{borderBottom:`1px solid ${BI.border2}`}}>
                  {["Tipo","N°","Soggiorni","Occ %","ADR","RevPAR","Revenue","Share %"].map(h=>(
                    <th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",color:BI.text3}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perfTipo.map((c,i)=>{
                  const totRev=perfTipo.reduce((s,x)=>s+x.rev,0)||1;
                  return(
                    <tr key={c.tipo} className="bi-row" style={{borderBottom:`1px solid ${BI.border}`,transition:"background .1s"}}>
                      <td style={{padding:"10px",fontWeight:700,color:BI.series[i%BI.series.length],fontSize:12}}>{c.tipo}</td>
                      <td style={{padding:"10px",color:BI.text3}}>{c.nc}</td>
                      <td style={{padding:"10px"}}>{c.res}</td>
                      <td style={{padding:"10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:40,height:4,background:BI.surface3,borderRadius:2}}>
                            <div style={{width:`${Math.min(100,c.occ)}%`,height:"100%",borderRadius:2,background:c.occ>75?BI.green:c.occ>50?BI.cyan:BI.red}}/>
                          </div>
                          <span style={{fontSize:11,fontFamily:"'IBM Plex Mono',monospace",color:c.occ>75?BI.green:c.occ>50?BI.cyan:BI.red}}>{c.occ.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td style={{padding:"10px",fontFamily:"'IBM Plex Mono',monospace"}}>{fE(c.adr)}</td>
                      <td style={{padding:"10px",fontFamily:"'IBM Plex Mono',monospace",color:BI.cyan}}>{fE(c.revpar)}</td>
                      <td style={{padding:"10px",fontFamily:"'IBM Plex Mono',monospace",fontWeight:800,color:BI.green}}>{fE(c.rev)}</td>
                      <td style={{padding:"10px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div style={{width:50,height:4,background:BI.surface3,borderRadius:2}}>
                            <div style={{width:`${(c.rev/totRev)*100}%`,height:"100%",borderRadius:2,background:BI.purple}}/>
                          </div>
                          <span style={{fontSize:10,color:BI.text3}}>{(c.rev/totRev*100).toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════ BOOKING WINDOW ════════ */}
      {sezione==="booking"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            {/* Booking window distribution */}
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:4}}>Finestra di prenotazione</div>
              <div style={{fontSize:11,color:BI.text3,marginBottom:16}}>Giorni di anticipo tra prenotazione e check-in</div>
              {bookingWindow.map((f,i)=>{
                const maxV=Math.max(...bookingWindow.map(x=>x.val),1);
                return(
                  <div key={f.label} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <div style={{width:70,fontSize:12,color:BI.text2,flexShrink:0}}>{f.label}</div>
                    <div style={{flex:1,background:BI.surface3,borderRadius:4,height:16,position:"relative"}}>
                      <div style={{
                        width:`${(f.val/maxV)*100}%`,height:"100%",borderRadius:4,
                        background:`linear-gradient(90deg,${BI.series[i%BI.series.length]},${BI.series[i%BI.series.length]}55)`,
                        boxShadow:`0 0 8px ${BI.series[i%BI.series.length]}33`,
                        transition:"width .6s cubic-bezier(.4,0,.2,1)",
                      }}/>
                    </div>
                    <div style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:12,width:28,textAlign:"right",color:BI.series[i%BI.series.length]}}>{f.val}</div>
                    <div style={{color:BI.text3,fontSize:10,width:34,textAlign:"right"}}>{resCur.length>0?(f.val/resCur.length*100).toFixed(0):0}%</div>
                  </div>
                );
              })}
              <div style={{marginTop:16,padding:"10px 12px",background:BI.surface2,borderRadius:6,fontSize:12,color:BI.text3}}>
                <strong style={{color:BI.cyan}}>Finestra media:</strong> {resCur.length>0?Math.round(resCur.reduce((s,r)=>s+(r.bookingWindow??14),0)/resCur.length):0} giorni
              </div>
            </div>

            {/* Trend ADR mensile */}
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:4}}>ADR trend · 12 mesi</div>
              <div style={{fontSize:11,color:BI.text3,marginBottom:12}}>Tariffa media giornaliera per mese</div>
              <AreaChart
                data={trendMensile.map(m=>({label:m.label,v1:m.adr,v2:0}))}
                color={BI.amber} yFmt={v=>v>0?"€"+Math.round(v):"0"} width={380} height={160} label1="ADR"/>
            </div>
          </div>

          {/* KPI comparativa cur vs prev */}
          {confronto&&(
            <div style={{background:BI.surface,border:`1px solid ${BI.border}`,borderRadius:10,padding:16,marginTop:14}}>
              <div style={{fontSize:13,fontWeight:700,color:BI.text,marginBottom:16}}>Confronto periodo corrente vs precedente</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12}}>
                {[
                  {label:"Soggiorni",cur:kpiCur.n,prev:kpiPrev.n,fmt:v=>v},
                  {label:"Occupancy",cur:kpiCur.occ,prev:kpiPrev.occ,fmt:v=>fP(v)},
                  {label:"ADR",cur:kpiCur.adr,prev:kpiPrev.adr,fmt:fE},
                  {label:"RevPAR",cur:kpiCur.revpar,prev:kpiPrev.revpar,fmt:fE},
                  {label:"Revenue",cur:kpiCur.rev,prev:kpiPrev.rev,fmt:fE},
                ].map((k,i)=>{
                  const d=delta(k.cur,k.prev);
                  return(
                    <div key={i} style={{background:BI.surface2,borderRadius:8,padding:14,border:`1px solid ${BI.border}`}}>
                      <div style={{fontSize:10,color:BI.text3,marginBottom:6,letterSpacing:.8,textTransform:"uppercase"}}>{k.label}</div>
                      <div style={{fontSize:16,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:BI.text}}>{k.fmt(k.cur)}</div>
                      <div style={{fontSize:11,color:BI.text3,marginTop:2}}>prev: {k.fmt(k.prev)}</div>
                      {d.pct!==null&&<div style={{fontSize:12,fontWeight:700,color:d.up?BI.green:BI.red,marginTop:4}}>{d.fmt}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{marginTop:20,padding:"8px 14px",borderRadius:6,border:`1px solid ${BI.border}`,
        fontSize:10,color:BI.text3,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span>KPI · Standard USALI · Dati dimostrativi integrati con dati PMS reali da Supabase</span>
        <span style={{fontFamily:"'IBM Plex Mono',monospace",color:BI.text3}}>
          {resCur.length} records · aggiornato ora
          <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:BI.green,marginLeft:6,animation:"biPulse 2s infinite"}}/>
        </span>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
//  MODULO CONFIGURAZIONE — Backend Settings Panel
//  Hotel Gasparini PMS · Persistenza in localStorage
// ═══════════════════════════════════════════════════════════════════

const CFG_KEY = "gasparini_pms_config";

const CFG_DEFAULT = {
  // Dati hotel
  hotel: {
    nome:         "Hotel Gasparini",
    stelle:       3,
    indirizzo:    "Lungomare Adriatico 42",
    citta:        "Chioggia",
    provincia:    "VE",
    cap:          "30015",
    paese:        "Italia",
    piva:         "IT01234567890",
    cf:           "01234567890",
    codiceSdi:    "M5UXCR1",
    codeAteco:    "55.10",
    email:        "info@hotelgasparini.it",
    pec:          "hotelgasparini@pec.it",
    telefono:     "+39 041 123 4567",
    sito:         "www.hotelgasparini.it",
    logoUrl:      "",
    descrizione:  "Hotel 3 stelle superior sul Lungomare Adriatico di Chioggia, a pochi km da Venezia.",
  },
  // Parametri operativi
  operativo: {
    checkInOra:   "14:00",
    checkOutOra:  "11:00",
    checkInEarly: "10:00",  // Early check-in (a pagamento)
    checkOutLate: "15:00",  // Late check-out (a pagamento)
    timezone:     "Europe/Rome",
    lingua:       "it",
    valuta:       "EUR",
    formatoData:  "DD/MM/YYYY",
    notteMinima:  1,
    prenotazioneMaxAnticipo: 365, // giorni
    overbooking:  false,
    overbookingPct: 5,
  },
  // Tariffe e fiscalità
  fiscale: {
    ivaAlloggio:      10,   // %
    ivaServizi:       22,   // %
    ivaRistorante:    10,   // %
    cityTax:          2.50, // € per persona per notte
    cityTaxEsenzioni: "Under 14, disabili, residenti",
    cityTaxMaxNotti:  5,
    acconto:          30,   // % acconto prenotazione
    penaleAnnullamento: 100, // % se annullo entro 24h
    periodoGratuito:  7,    // giorni annullamento gratuito
    roundingMode:     "math", // math | up | down
  },
  // Tipi camera (estende ROOMS)
  roomTypes: [
    { id:"standard",       label:"Standard",              prezzoBase:90,  capacita:2, descrizione:"Camera doppia standard", attiva:true },
    { id:"standard-acc",   label:"Standard Accessibile",  prezzoBase:90,  capacita:2, descrizione:"Camera accessibile PMR", attiva:true },
    { id:"superior",       label:"Superior",              prezzoBase:140, capacita:2, descrizione:"Camera superior con vista", attiva:true },
    { id:"deluxe",         label:"Deluxe",                prezzoBase:190, capacita:2, descrizione:"Camera deluxe arredata", attiva:true },
    { id:"junior-suite",   label:"Junior Suite",          prezzoBase:240, capacita:3, descrizione:"Junior suite con salottino", attiva:true },
    { id:"suite",          label:"Suite",                 prezzoBase:300, capacita:4, descrizione:"Suite panoramica", attiva:true },
    { id:"suite-laguna",   label:"Suite Vista Laguna",    prezzoBase:360, capacita:4, descrizione:"Suite con vista laguna", attiva:true },
  ],
  // Servizi
  servizi: [
    { id:"colazione",  label:"Colazione",          prezzo:18,  unita:"persona/notte", attivo:true },
    { id:"parcheggio", label:"Parcheggio",          prezzo:20,  unita:"auto/notte",    attivo:true },
    { id:"spa",        label:"Accesso SPA",         prezzo:45,  unita:"persona",       attivo:true },
    { id:"transfer",   label:"Transfer Aeroporto",  prezzo:60,  unita:"corsa",         attivo:true },
    { id:"minibar",    label:"Minibar Deluxe",      prezzo:35,  unita:"notte",         attivo:true },
    { id:"laundry",    label:"Lavanderia",          prezzo:25,  unita:"servizio",      attivo:true },
    { id:"culla",      label:"Culla neonato",       prezzo:15,  unita:"notte",         attivo:false },
    { id:"latecheck",  label:"Late Check-out",      prezzo:40,  unita:"servizio",      attivo:true },
    { id:"earlycheck", label:"Early Check-in",      prezzo:30,  unita:"servizio",      attivo:true },
  ],
  // Integrazioni
  integrazioni: {
    supabaseUrl:   "https://ecxpqxtqdakfmjokudwn.supabase.co",
    supabaseKey:   "",
    stripeKey:     "",
    stripeWebhook: "",
    anthropicKey:  "",
    bookingComId:  "",
    airbnbApiKey:  "",
    channelMgrUrl: "",
    smtpHost:      "",
    smtpPort:      587,
    smtpUser:      "",
    smtpPass:      "",
    smtpFrom:      "noreply@hotelgasparini.it",
  },
  // Utenti
  utenti: [
    { id:"u1", nome:"Marco",    cognome:"Rossi",    email:"m.rossi@hotelgasparini.it",    ruolo:"gm",          attivo:true,  ultimoAccesso:"2026-02-25" },
    { id:"u2", nome:"Sara",     cognome:"Bianchi",  email:"s.bianchi@hotelgasparini.it",  ruolo:"receptionist",attivo:true,  ultimoAccesso:"2026-02-26" },
    { id:"u3", nome:"Luigi",    cognome:"Verde",    email:"l.verde@hotelgasparini.it",    ruolo:"housekeeping",attivo:true,  ultimoAccesso:"2026-02-20" },
    { id:"u4", nome:"Federica", cognome:"Neri",     email:"f.neri@hotelgasparini.it",     ruolo:"admin",       attivo:false, ultimoAccesso:"2026-01-10" },
  ],
};

const RUOLI = {
  gm:           { label:"General Manager",    colore:"#0f62fe", badge:"GM" },
  admin:        { label:"Amministratore",      colore:"#5c35cc", badge:"ADM" },
  receptionist: { label:"Receptionist",        colore:"#1b7a4a", badge:"REC" },
  housekeeping: { label:"Housekeeping",        colore:"#e65100", badge:"HK"  },
  ristorante:   { label:"Responsabile F&B",    colore:"#00695c", badge:"FB"  },
  readonly:     { label:"Solo lettura",        colore:"#8896a8", badge:"RO"  },
};

// ─── HELPER: carica/salva config ───────────────────────────────────
function caricaCfg() {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return CFG_DEFAULT;
    const stored = JSON.parse(raw);
    // Deep merge con default (per nuovi campi)
    return {
      hotel:         { ...CFG_DEFAULT.hotel,        ...stored.hotel },
      operativo:     { ...CFG_DEFAULT.operativo,    ...stored.operativo },
      fiscale:       { ...CFG_DEFAULT.fiscale,      ...stored.fiscale },
      roomTypes:     stored.roomTypes     || CFG_DEFAULT.roomTypes,
      servizi:       stored.servizi       || CFG_DEFAULT.servizi,
      integrazioni:  { ...CFG_DEFAULT.integrazioni, ...stored.integrazioni },
      utenti:        stored.utenti        || CFG_DEFAULT.utenti,
    };
  } catch { return CFG_DEFAULT; }
}

function salvaCfg(cfg) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); return true; }
  catch { return false; }
}

// ─── MODULO PRINCIPALE ──────────────────────────────────────────────
function ConfigurazioneModule({ rooms=[], setRooms=()=>{} }) {
  const [cfg, setCfg]       = useState(caricaCfg);
  const [sezione, setSezione] = useState("hotel");
  const [saved, setSaved]    = useState(null);       // null | "ok" | "err"
  const [showPass, setShowPass] = useState({});       // id => bool
  const [newUtente, setNewUtente] = useState(null);   // form nuovo utente
  const [newServizio, setNewServizio] = useState(null);
  const [newTipo, setNewTipo]   = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // ─── SALVA ──────────────────────────────────────────────────────
  const salva = useCallback((updCfg) => {
    const toSave = updCfg || cfg;
    const ok = salvaCfg(toSave);
    setSaved(ok ? "ok" : "err");
    setTimeout(() => setSaved(null), 3000);
  }, [cfg]);

  // ─── UPDATE HELPERS ─────────────────────────────────────────────
  const upd = (sezione, field, val) => {
    setCfg(prev => {
      const next = { ...prev, [sezione]: { ...prev[sezione], [field]: val } };
      return next;
    });
  };

  // ─── COLORI ─────────────────────────────────────────────────────
  const C = {
    bg: "#f0f3f7", surface: "#ffffff", surface2: "#f5f7fa",
    border: "#dde3ec", border2: "#c4cdd9",
    text: "#1a2535", text2: "#4a5568", text3: "#8896a8",
    blue: "#0f62fe", blueL: "#e8f0ff",
    green: "#1b7a4a", greenL: "#e6f7ee",
    red: "#c62828", redL: "#fdecea",
    amber: "#e65100", amberL: "#fff3e0",
    navy: "#0a1929",
  };

  // ─── STILI RIUSABILI ────────────────────────────────────────────
  const inp = {
    border: `1.5px solid ${C.border}`, borderRadius: 6, padding: "8px 12px",
    fontSize: 13, fontFamily: "'IBM Plex Sans',sans-serif", color: C.text,
    width: "100%", background: C.surface, outline: "none",
  };
  const btnPrimary = {
    padding: "9px 20px", borderRadius: 8, border: "none", cursor: "pointer",
    background: C.blue, color: "#fff", fontWeight: 700, fontSize: 13,
    fontFamily: "'IBM Plex Sans',sans-serif",
  };
  const btnSecondary = {
    padding: "8px 16px", borderRadius: 8, border: `1.5px solid ${C.border}`,
    cursor: "pointer", background: C.surface, color: C.text2, fontWeight: 600,
    fontSize: 13, fontFamily: "'IBM Plex Sans',sans-serif",
  };
  const btnDanger = { ...btnPrimary, background: C.red };

  const Label = ({children}) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
      color: C.text3, marginBottom: 5 }}>{children}</div>
  );
  const Field = ({label, children, col="1/-1"}) => (
    <div style={{ gridColumn: col }}>
      <Label>{label}</Label>
      {children}
    </div>
  );
  const Card = ({children, title, subtitle, action}) => (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
      {title && (
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
  const Grid = ({cols="1fr 1fr", children}) => (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 14 }}>{children}</div>
  );
  const Toggle = ({val, onChange, label}) => (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
      <div onClick={onChange} style={{
        width: 44, height: 24, borderRadius: 12, background: val ? C.blue : C.border,
        position: "relative", transition: "background .2s", cursor: "pointer", flexShrink: 0,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: "50%", background: "#fff",
          position: "absolute", top: 3, left: val ? 23 : 3, transition: "left .2s",
          boxShadow: "0 1px 4px rgba(0,0,0,.2)",
        }}/>
      </div>
      {label && <span style={{ fontSize: 13, color: C.text2 }}>{label}</span>}
    </label>
  );

  const SEZIONI = [
    { k: "hotel",        icon: "🏨", label: "Dati Hotel" },
    { k: "operativo",    icon: "⏰", label: "Parametri Operativi" },
    { k: "fiscale",      icon: "💶", label: "Tariffe & Fiscalità" },
    { k: "roomtypes",    icon: "🛏️", label: "Tipi di Camera" },
    { k: "servizi",      icon: "🧴", label: "Servizi" },
    { k: "integrazioni", icon: "🔌", label: "Integrazioni" },
    { k: "utenti",       icon: "👥", label: "Utenti & Accessi" },
    { k: "sistema",      icon: "💾", label: "Sistema & Backup" },
  ];

  return (
    <div style={{ fontFamily: "'IBM Plex Sans',system-ui,sans-serif", color: C.text, display: "flex", gap: 20 }}>
      {/* ── SIDEBAR SEZIONI ── */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", position: "sticky", top: 20 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, background: C.navy }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#90b4d4" }}>Configurazione</div>
            <div style={{ fontSize: 12, color: "#64b5f6", marginTop: 2 }}>⚙️ Impostazioni PMS</div>
          </div>
          {SEZIONI.map(s => (
            <button key={s.k} onClick={() => setSezione(s.k)} style={{
              width: "100%", padding: "10px 16px", border: "none", borderBottom: `1px solid ${C.border}`,
              background: sezione === s.k ? C.blueL : C.surface, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8, textAlign: "left",
              borderLeft: `3px solid ${sezione === s.k ? C.blue : "transparent"}`,
              color: sezione === s.k ? C.blue : C.text2, fontWeight: sezione === s.k ? 700 : 400,
              fontSize: 13, fontFamily: "'IBM Plex Sans',sans-serif", transition: "all .15s",
            }}>
              <span>{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
              {SEZIONI.find(s => s.k === sezione)?.icon} {SEZIONI.find(s => s.k === sezione)?.label}
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: C.text3 }}>
              Le modifiche vengono salvate localmente nel browser
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved === "ok" && (
              <span style={{ fontSize: 12, color: C.green, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                ✓ Salvato
              </span>
            )}
            {saved === "err" && (
              <span style={{ fontSize: 12, color: C.red, fontWeight: 600 }}>✗ Errore</span>
            )}
            <button onClick={() => { setCfg(CFG_DEFAULT); salva(CFG_DEFAULT); }} style={btnSecondary}>
              ↺ Ripristina default
            </button>
            <button onClick={() => salva()} style={btnPrimary}>
              💾 Salva modifiche
            </button>
          </div>
        </div>

        {/* ════ DATI HOTEL ════ */}
        {sezione === "hotel" && (
          <div>
            <Card title="Informazioni generali" subtitle="Nome, stelle e descrizione">
              <Grid cols="1fr 80px">
                <Field label="Nome hotel">
                  <input style={inp} value={cfg.hotel.nome} onChange={e => upd("hotel","nome",e.target.value)}/>
                </Field>
                <Field label="Stelle">
                  <select style={inp} value={cfg.hotel.stelle} onChange={e => upd("hotel","stelle",parseInt(e.target.value))}>
                    {[1,2,3,4,5].map(s => <option key={s} value={s}>{s} ★</option>)}
                  </select>
                </Field>
              </Grid>
              <div style={{ marginTop: 14 }}>
                <Field label="Descrizione">
                  <textarea style={{...inp, resize:"vertical"}} rows={3} value={cfg.hotel.descrizione}
                    onChange={e => upd("hotel","descrizione",e.target.value)}/>
                </Field>
              </div>
            </Card>

            <Card title="Indirizzo" subtitle="Sede legale e operativa">
              <Grid cols="1fr 1fr">
                <Field label="Indirizzo (via e numero)" col="1/-1">
                  <input style={inp} value={cfg.hotel.indirizzo} onChange={e => upd("hotel","indirizzo",e.target.value)}/>
                </Field>
                <Field label="Città">
                  <input style={inp} value={cfg.hotel.citta} onChange={e => upd("hotel","citta",e.target.value)}/>
                </Field>
                <Field label="Provincia (sigla)">
                  <input style={{...inp, textTransform:"uppercase"}} maxLength={2} value={cfg.hotel.provincia} onChange={e => upd("hotel","provincia",e.target.value.toUpperCase())}/>
                </Field>
                <Field label="CAP">
                  <input style={inp} value={cfg.hotel.cap} onChange={e => upd("hotel","cap",e.target.value)}/>
                </Field>
                <Field label="Paese">
                  <input style={inp} value={cfg.hotel.paese} onChange={e => upd("hotel","paese",e.target.value)}/>
                </Field>
              </Grid>
            </Card>

            <Card title="Dati fiscali" subtitle="P.IVA, Codice Fiscale, Codice ATECO">
              <Grid cols="1fr 1fr">
                <Field label="Partita IVA">
                  <input style={inp} value={cfg.hotel.piva} onChange={e => upd("hotel","piva",e.target.value)}/>
                </Field>
                <Field label="Codice Fiscale">
                  <input style={inp} value={cfg.hotel.cf} onChange={e => upd("hotel","cf",e.target.value)}/>
                </Field>
                <Field label="Codice SDI (fatturazione elettronica)">
                  <input style={inp} value={cfg.hotel.codiceSdi} onChange={e => upd("hotel","codiceSdi",e.target.value)}/>
                </Field>
                <Field label="Codice ATECO">
                  <input style={inp} value={cfg.hotel.codeAteco} onChange={e => upd("hotel","codeAteco",e.target.value)}/>
                </Field>
              </Grid>
            </Card>

            <Card title="Contatti" subtitle="Email, telefono, sito web, PEC">
              <Grid cols="1fr 1fr">
                <Field label="Email principale">
                  <input type="email" style={inp} value={cfg.hotel.email} onChange={e => upd("hotel","email",e.target.value)}/>
                </Field>
                <Field label="PEC">
                  <input type="email" style={inp} value={cfg.hotel.pec} onChange={e => upd("hotel","pec",e.target.value)}/>
                </Field>
                <Field label="Telefono">
                  <input style={inp} value={cfg.hotel.telefono} onChange={e => upd("hotel","telefono",e.target.value)}/>
                </Field>
                <Field label="Sito web">
                  <input style={inp} value={cfg.hotel.sito} onChange={e => upd("hotel","sito",e.target.value)}/>
                </Field>
              </Grid>
            </Card>
          </div>
        )}

        {/* ════ OPERATIVO ════ */}
        {sezione === "operativo" && (
          <div>
            <Card title="Orari check-in / check-out" subtitle="Orari standard e servizi aggiuntivi">
              <Grid cols="1fr 1fr">
                <Field label="Check-in standard (dalle)">
                  <input type="time" style={inp} value={cfg.operativo.checkInOra}
                    onChange={e => upd("operativo","checkInOra",e.target.value)}/>
                </Field>
                <Field label="Check-out standard (entro)">
                  <input type="time" style={inp} value={cfg.operativo.checkOutOra}
                    onChange={e => upd("operativo","checkOutOra",e.target.value)}/>
                </Field>
                <Field label="Early check-in disponibile dalle">
                  <input type="time" style={inp} value={cfg.operativo.checkInEarly}
                    onChange={e => upd("operativo","checkInEarly",e.target.value)}/>
                </Field>
                <Field label="Late check-out disponibile fino alle">
                  <input type="time" style={inp} value={cfg.operativo.checkOutLate}
                    onChange={e => upd("operativo","checkOutLate",e.target.value)}/>
                </Field>
              </Grid>
            </Card>

            <Card title="Localizzazione" subtitle="Fuso orario, lingua e valuta">
              <Grid cols="1fr 1fr">
                <Field label="Fuso orario">
                  <select style={inp} value={cfg.operativo.timezone} onChange={e => upd("operativo","timezone",e.target.value)}>
                    <option value="Europe/Rome">Europe/Rome (CET/CEST)</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="UTC">UTC</option>
                  </select>
                </Field>
                <Field label="Lingua default">
                  <select style={inp} value={cfg.operativo.lingua} onChange={e => upd("operativo","lingua",e.target.value)}>
                    <option value="it">🇮🇹 Italiano</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="fr">🇫🇷 Français</option>
                  </select>
                </Field>
                <Field label="Valuta">
                  <select style={inp} value={cfg.operativo.valuta} onChange={e => upd("operativo","valuta",e.target.value)}>
                    <option value="EUR">€ Euro (EUR)</option>
                    <option value="USD">$ Dollaro USA (USD)</option>
                    <option value="GBP">£ Sterlina (GBP)</option>
                  </select>
                </Field>
                <Field label="Formato data">
                  <select style={inp} value={cfg.operativo.formatoData} onChange={e => upd("operativo","formatoData",e.target.value)}>
                    <option value="DD/MM/YYYY">GG/MM/AAAA (europeo)</option>
                    <option value="MM/DD/YYYY">MM/GG/AAAA (americano)</option>
                    <option value="YYYY-MM-DD">AAAA-MM-GG (ISO)</option>
                  </select>
                </Field>
              </Grid>
            </Card>

            <Card title="Politiche di prenotazione" subtitle="Limiti e regole di prenotazione">
              <Grid cols="1fr 1fr">
                <Field label="Soggiorno minimo (notti)">
                  <input type="number" min={1} max={30} style={inp} value={cfg.operativo.notteMinima}
                    onChange={e => upd("operativo","notteMinima",parseInt(e.target.value)||1)}/>
                </Field>
                <Field label="Anticipo max prenotazione (giorni)">
                  <input type="number" min={30} max={730} style={inp} value={cfg.operativo.prenotazioneMaxAnticipo}
                    onChange={e => upd("operativo","prenotazioneMaxAnticipo",parseInt(e.target.value)||365)}/>
                </Field>
              </Grid>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <Toggle val={cfg.operativo.overbooking} onChange={() => upd("operativo","overbooking",!cfg.operativo.overbooking)} label="Consenti overbooking"/>
                {cfg.operativo.overbooking && (
                  <Field label="Percentuale overbooking ammessa (%)">
                    <input type="number" min={0} max={20} style={{...inp, width: 80}} value={cfg.operativo.overbookingPct}
                      onChange={e => upd("operativo","overbookingPct",parseInt(e.target.value)||0)}/>
                  </Field>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* ════ FISCALE ════ */}
        {sezione === "fiscale" && (
          <div>
            <Card title="Aliquote IVA" subtitle="Percentuali IVA per categoria di servizio">
              <Grid cols="1fr 1fr 1fr">
                <Field label="IVA alloggio (%)">
                  <input type="number" min={0} max={25} style={inp} value={cfg.fiscale.ivaAlloggio}
                    onChange={e => upd("fiscale","ivaAlloggio",parseFloat(e.target.value)||10)}/>
                </Field>
                <Field label="IVA servizi extra (%)">
                  <input type="number" min={0} max={25} style={inp} value={cfg.fiscale.ivaServizi}
                    onChange={e => upd("fiscale","ivaServizi",parseFloat(e.target.value)||22)}/>
                </Field>
                <Field label="IVA ristorante (%)">
                  <input type="number" min={0} max={25} style={inp} value={cfg.fiscale.ivaRistorante}
                    onChange={e => upd("fiscale","ivaRistorante",parseFloat(e.target.value)||10)}/>
                </Field>
              </Grid>
            </Card>

            <Card title="Tassa di soggiorno" subtitle="City tax per persona per notte">
              <Grid cols="1fr 1fr">
                <Field label="Importo city tax (€ / persona / notte)">
                  <input type="number" min={0} max={10} step={0.5} style={inp} value={cfg.fiscale.cityTax}
                    onChange={e => upd("fiscale","cityTax",parseFloat(e.target.value)||0)}/>
                </Field>
                <Field label="Notti massime di applicazione">
                  <input type="number" min={1} max={30} style={inp} value={cfg.fiscale.cityTaxMaxNotti}
                    onChange={e => upd("fiscale","cityTaxMaxNotti",parseInt(e.target.value)||5)}/>
                </Field>
                <Field label="Esenzioni" col="1/-1">
                  <input style={inp} value={cfg.fiscale.cityTaxEsenzioni}
                    onChange={e => upd("fiscale","cityTaxEsenzioni",e.target.value)}
                    placeholder="Es. Under 14, disabili, residenti"/>
                </Field>
              </Grid>
              <div style={{ marginTop: 12, padding: "10px 14px", background: C.blueL, borderRadius: 6, fontSize: 12, color: C.text3 }}>
                ℹ️ La city tax non è soggetta a IVA e va riportata separatamente in fattura (art. 4 DL 23/2011)
              </div>
            </Card>

            <Card title="Politica di cancellazione & Acconto" subtitle="Deposito richiesto e penali">
              <Grid cols="1fr 1fr 1fr">
                <Field label="Acconto richiesto alla prenotazione (%)">
                  <input type="number" min={0} max={100} style={inp} value={cfg.fiscale.acconto}
                    onChange={e => upd("fiscale","acconto",parseInt(e.target.value)||0)}/>
                </Field>
                <Field label="Periodo cancellazione gratuita (giorni)">
                  <input type="number" min={0} max={60} style={inp} value={cfg.fiscale.periodoGratuito}
                    onChange={e => upd("fiscale","periodoGratuito",parseInt(e.target.value)||7)}/>
                </Field>
                <Field label="Penale di cancellazione (%)">
                  <input type="number" min={0} max={100} style={inp} value={cfg.fiscale.penaleAnnullamento}
                    onChange={e => upd("fiscale","penaleAnnullamento",parseInt(e.target.value)||100)}/>
                </Field>
              </Grid>
              <div style={{ marginTop: 12, padding: "10px 14px", background: C.amberL, borderRadius: 6, fontSize: 12, color: C.amber, border: `1px solid #ffcc8044` }}>
                ⚠️ Penale del {cfg.fiscale.penaleAnnullamento}% applicata sulle prenotazioni cancellate entro {cfg.fiscale.periodoGratuito} giorni dall'arrivo.
                Acconto del {cfg.fiscale.acconto}% richiesto alla conferma.
              </div>
            </Card>
          </div>
        )}

        {/* ════ TIPI CAMERA ════ */}
        {sezione === "roomtypes" && (
          <div>
            <Card
              title="Tipi di camera configurati"
              subtitle={`${cfg.roomTypes.filter(r=>r.attiva).length} attivi su ${cfg.roomTypes.length} totali`}
              action={
                <button onClick={() => setNewTipo({ id:"", label:"", prezzoBase:100, capacita:2, descrizione:"", attiva:true })} style={btnPrimary}>
                  + Nuovo tipo
                </button>
              }
            >
              {/* Form nuovo tipo */}
              {newTipo && (
                <div style={{ background: C.blueL, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: C.blue }}>Nuovo tipo camera</div>
                  <Grid cols="1fr 1fr">
                    <Field label="ID (slug, es. 'superior-plus')">
                      <input style={inp} value={newTipo.id} onChange={e => setNewTipo(t=>({...t,id:e.target.value.toLowerCase().replace(/\s+/g,"-")}))}/>
                    </Field>
                    <Field label="Nome visualizzato">
                      <input style={inp} value={newTipo.label} onChange={e => setNewTipo(t=>({...t,label:e.target.value}))}/>
                    </Field>
                    <Field label="Prezzo base (€/notte)">
                      <input type="number" style={inp} value={newTipo.prezzoBase} onChange={e => setNewTipo(t=>({...t,prezzoBase:parseFloat(e.target.value)||0}))}/>
                    </Field>
                    <Field label="Capacità max (persone)">
                      <input type="number" min={1} max={8} style={inp} value={newTipo.capacita} onChange={e => setNewTipo(t=>({...t,capacita:parseInt(e.target.value)||2}))}/>
                    </Field>
                    <Field label="Descrizione" col="1/-1">
                      <input style={inp} value={newTipo.descrizione} onChange={e => setNewTipo(t=>({...t,descrizione:e.target.value}))}/>
                    </Field>
                  </Grid>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => {
                      if(!newTipo.id||!newTipo.label) return;
                      setCfg(p=>({...p,roomTypes:[...p.roomTypes,newTipo]}));
                      setNewTipo(null);
                    }} style={btnPrimary}>✓ Aggiungi</button>
                    <button onClick={() => setNewTipo(null)} style={btnSecondary}>Annulla</button>
                  </div>
                </div>
              )}

              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background: C.surface2 }}>
                    {["Tipo","Prezzo base","Capacità","Descrizione","Attivo","Azioni"].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:C.text3, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfg.roomTypes.map((rt, i) => (
                    <tr key={rt.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:"10px 12px", fontWeight:700 }}>{rt.label}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          €<input type="number" style={{...inp, width:70, padding:"4px 6px"}} value={rt.prezzoBase}
                            onChange={e=>{
                              const v=parseFloat(e.target.value)||0;
                              setCfg(p=>({...p,roomTypes:p.roomTypes.map((r,j)=>j===i?{...r,prezzoBase:v}:r)}));
                            }}/>
                        </div>
                      </td>
                      <td style={{ padding:"10px 12px", textAlign:"center" }}>{rt.capacita} pers.</td>
                      <td style={{ padding:"10px 12px", color:C.text3, fontSize:12 }}>{rt.descrizione}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <Toggle val={rt.attiva} onChange={() =>
                          setCfg(p=>({...p,roomTypes:p.roomTypes.map((r,j)=>j===i?{...r,attiva:!r.attiva}:r)}))}/>
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <button onClick={() => setCfg(p=>({...p,roomTypes:p.roomTypes.filter((_,j)=>j!==i)}))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:16 }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ════ SERVIZI ════ */}
        {sezione === "servizi" && (
          <div>
            <Card
              title="Catalogo servizi aggiuntivi"
              subtitle="Prezzi e disponibilità dei servizi extra"
              action={
                <button onClick={() => setNewServizio({id:"",label:"",prezzo:0,unita:"persona",attivo:true})} style={btnPrimary}>
                  + Aggiungi servizio
                </button>
              }
            >
              {newServizio && (
                <div style={{ background:C.blueL, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:16 }}>
                  <Grid cols="1fr 1fr">
                    <Field label="ID (slug)">
                      <input style={inp} value={newServizio.id} onChange={e=>setNewServizio(s=>({...s,id:e.target.value.toLowerCase().replace(/\s+/g,"-")}))}/>
                    </Field>
                    <Field label="Nome visualizzato">
                      <input style={inp} value={newServizio.label} onChange={e=>setNewServizio(s=>({...s,label:e.target.value}))}/>
                    </Field>
                    <Field label="Prezzo (€)">
                      <input type="number" style={inp} value={newServizio.prezzo} onChange={e=>setNewServizio(s=>({...s,prezzo:parseFloat(e.target.value)||0}))}/>
                    </Field>
                    <Field label="Unità di misura">
                      <select style={inp} value={newServizio.unita} onChange={e=>setNewServizio(s=>({...s,unita:e.target.value}))}>
                        {["persona","persona/notte","auto/notte","servizio","notte","corsa","ora"].map(u=><option key={u}>{u}</option>)}
                      </select>
                    </Field>
                  </Grid>
                  <div style={{ display:"flex", gap:8, marginTop:12 }}>
                    <button onClick={()=>{
                      if(!newServizio.id||!newServizio.label) return;
                      setCfg(p=>({...p,servizi:[...p.servizi,newServizio]}));
                      setNewServizio(null);
                    }} style={btnPrimary}>✓ Aggiungi</button>
                    <button onClick={()=>setNewServizio(null)} style={btnSecondary}>Annulla</button>
                  </div>
                </div>
              )}

              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface2 }}>
                    {["Servizio","Prezzo (€)","Unità","Attivo",""].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:C.text3, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfg.servizi.map((sv, i) => (
                    <tr key={sv.id} style={{ borderBottom:`1px solid ${C.border}`, opacity:sv.attivo?1:.5 }}>
                      <td style={{ padding:"10px 12px", fontWeight:600 }}>{sv.label}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                          €<input type="number" step={0.5} style={{...inp, width:70, padding:"4px 6px"}} value={sv.prezzo}
                            onChange={e=>{
                              const v=parseFloat(e.target.value)||0;
                              setCfg(p=>({...p,servizi:p.servizi.map((s,j)=>j===i?{...s,prezzo:v}:s)}));
                            }}/>
                        </div>
                      </td>
                      <td style={{ padding:"10px 12px", color:C.text3, fontSize:12 }}>{sv.unita}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <Toggle val={sv.attivo} onChange={()=>setCfg(p=>({...p,servizi:p.servizi.map((s,j)=>j===i?{...s,attivo:!s.attivo}:s)}))}/>
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <button onClick={()=>setCfg(p=>({...p,servizi:p.servizi.filter((_,j)=>j!==i)}))}
                          style={{ background:"none", border:"none", cursor:"pointer", color:C.red, fontSize:16 }}>🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ════ INTEGRAZIONI ════ */}
        {sezione === "integrazioni" && (
          <div>
            {/* Supabase */}
            <Card title="🗄️ Database — Supabase" subtitle="Connessione al database PostgreSQL">
              <Grid cols="1fr">
                <Field label="Project URL">
                  <input style={inp} value={cfg.integrazioni.supabaseUrl}
                    onChange={e=>upd("integrazioni","supabaseUrl",e.target.value)}
                    placeholder="https://xxx.supabase.co"/>
                </Field>
                <Field label="Anon Key (pubblica)">
                  <div style={{ position:"relative" }}>
                    <input type={showPass.supabase?"text":"password"} style={{...inp, paddingRight:40}} value={cfg.integrazioni.supabaseKey}
                      onChange={e=>upd("integrazioni","supabaseKey",e.target.value)} placeholder="eyJ..."/>
                    <button onClick={()=>setShowPass(p=>({...p,supabase:!p.supabase}))}
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3 }}>
                      {showPass.supabase?"🙈":"👁"}
                    </button>
                  </div>
                </Field>
              </Grid>
              <div style={{ marginTop:12, display:"flex", gap:8 }}>
                <div style={{ padding:"8px 12px", background:C.greenL, border:`1px solid ${C.greenLb||"#6fcf97"}`, borderRadius:6, fontSize:12, color:C.green, display:"flex", alignItems:"center", gap:6 }}>
                  <span style={{ width:8, height:8, borderRadius:"50%", background:C.green, display:"inline-block" }}/>
                  Connesso · https://ecxpqxtqdakfmjokudwn.supabase.co
                </div>
                <button style={btnSecondary}>Testa connessione</button>
              </div>
            </Card>

            {/* Stripe */}
            <Card title="💳 Pagamenti — Stripe" subtitle="Chiavi API per i pagamenti online">
              <Grid cols="1fr">
                <Field label="Publishable Key (pk_live_...)">
                  <input style={inp} value={cfg.integrazioni.stripeKey}
                    onChange={e=>upd("integrazioni","stripeKey",e.target.value)}
                    placeholder="pk_live_..."/>
                </Field>
                <Field label="Webhook Secret (whsec_...)">
                  <div style={{ position:"relative" }}>
                    <input type={showPass.stripe?"text":"password"} style={{...inp,paddingRight:40}} value={cfg.integrazioni.stripeWebhook}
                      onChange={e=>upd("integrazioni","stripeWebhook",e.target.value)} placeholder="whsec_..."/>
                    <button onClick={()=>setShowPass(p=>({...p,stripe:!p.stripe}))}
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3 }}>
                      {showPass.stripe?"🙈":"👁"}
                    </button>
                  </div>
                </Field>
              </Grid>
              <div style={{ marginTop:10, padding:"8px 12px", background:C.amberL, borderRadius:6, fontSize:12, color:C.amber }}>
                ⚠️ Non inserire mai la Secret Key (sk_live_...) nel frontend. Usare solo la Publishable Key.
              </div>
            </Card>

            {/* AI */}
            <Card title="🤖 AI Assistente — Anthropic" subtitle="Chiave API per Claude">
              <Field label="API Key (sk-ant-...)">
                <div style={{ position:"relative" }}>
                  <input type={showPass.anthropic?"text":"password"} style={{...inp,paddingRight:40}} value={cfg.integrazioni.anthropicKey}
                    onChange={e=>upd("integrazioni","anthropicKey",e.target.value)} placeholder="sk-ant-api03-..."/>
                  <button onClick={()=>setShowPass(p=>({...p,anthropic:!p.anthropic}))}
                    style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3 }}>
                    {showPass.anthropic?"🙈":"👁"}
                  </button>
                </div>
              </Field>
            </Card>

            {/* Email SMTP */}
            <Card title="📧 Email — SMTP" subtitle="Configurazione invio email automatiche">
              <Grid cols="1fr 1fr">
                <Field label="Server SMTP">
                  <input style={inp} value={cfg.integrazioni.smtpHost} onChange={e=>upd("integrazioni","smtpHost",e.target.value)} placeholder="smtp.gmail.com"/>
                </Field>
                <Field label="Porta">
                  <select style={inp} value={cfg.integrazioni.smtpPort} onChange={e=>upd("integrazioni","smtpPort",parseInt(e.target.value))}>
                    <option value={587}>587 (STARTTLS)</option>
                    <option value={465}>465 (SSL)</option>
                    <option value={25}>25</option>
                  </select>
                </Field>
                <Field label="Utente SMTP">
                  <input style={inp} value={cfg.integrazioni.smtpUser} onChange={e=>upd("integrazioni","smtpUser",e.target.value)}/>
                </Field>
                <Field label="Password SMTP">
                  <div style={{ position:"relative" }}>
                    <input type={showPass.smtp?"text":"password"} style={{...inp,paddingRight:40}} value={cfg.integrazioni.smtpPass}
                      onChange={e=>upd("integrazioni","smtpPass",e.target.value)}/>
                    <button onClick={()=>setShowPass(p=>({...p,smtp:!p.smtp}))}
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3 }}>
                      {showPass.smtp?"🙈":"👁"}
                    </button>
                  </div>
                </Field>
                <Field label="Email mittente (From)" col="1/-1">
                  <input type="email" style={inp} value={cfg.integrazioni.smtpFrom} onChange={e=>upd("integrazioni","smtpFrom",e.target.value)}/>
                </Field>
              </Grid>
            </Card>

            {/* Channel Manager / OTA */}
            <Card title="🌐 Channel Manager & OTA" subtitle="Booking.com, Airbnb, Channel Manager">
              <Grid cols="1fr 1fr">
                <Field label="Booking.com Property ID">
                  <input style={inp} value={cfg.integrazioni.bookingComId} onChange={e=>upd("integrazioni","bookingComId",e.target.value)} placeholder="12345678"/>
                </Field>
                <Field label="Airbnb API Key">
                  <div style={{ position:"relative" }}>
                    <input type={showPass.airbnb?"text":"password"} style={{...inp,paddingRight:40}} value={cfg.integrazioni.airbnbApiKey}
                      onChange={e=>upd("integrazioni","airbnbApiKey",e.target.value)}/>
                    <button onClick={()=>setShowPass(p=>({...p,airbnb:!p.airbnb}))}
                      style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text3 }}>
                      {showPass.airbnb?"🙈":"👁"}
                    </button>
                  </div>
                </Field>
                <Field label="Channel Manager URL webhook" col="1/-1">
                  <input style={inp} value={cfg.integrazioni.channelMgrUrl} onChange={e=>upd("integrazioni","channelMgrUrl",e.target.value)} placeholder="https://api.channelmanager.com/webhook/..."/>
                </Field>
              </Grid>
            </Card>
          </div>
        )}

        {/* ════ UTENTI ════ */}
        {sezione === "utenti" && (
          <div>
            <Card
              title="Gestione utenti"
              subtitle={`${cfg.utenti.filter(u=>u.attivo).length} utenti attivi · ${cfg.utenti.length} totali`}
              action={
                <button onClick={() => setNewUtente({id:"u"+Date.now(),nome:"",cognome:"",email:"",ruolo:"receptionist",attivo:true,ultimoAccesso:"-"})} style={btnPrimary}>
                  + Nuovo utente
                </button>
              }
            >
              {newUtente && (
                <div style={{ background:C.blueL, border:`1px solid ${C.border}`, borderRadius:8, padding:16, marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.blue, marginBottom:12 }}>Nuovo utente</div>
                  <Grid cols="1fr 1fr">
                    <Field label="Nome"><input style={inp} value={newUtente.nome} onChange={e=>setNewUtente(u=>({...u,nome:e.target.value}))}/></Field>
                    <Field label="Cognome"><input style={inp} value={newUtente.cognome} onChange={e=>setNewUtente(u=>({...u,cognome:e.target.value}))}/></Field>
                    <Field label="Email"><input type="email" style={inp} value={newUtente.email} onChange={e=>setNewUtente(u=>({...u,email:e.target.value}))}/></Field>
                    <Field label="Ruolo">
                      <select style={inp} value={newUtente.ruolo} onChange={e=>setNewUtente(u=>({...u,ruolo:e.target.value}))}>
                        {Object.entries(RUOLI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </Field>
                  </Grid>
                  <div style={{ display:"flex", gap:8, marginTop:12 }}>
                    <button onClick={()=>{
                      if(!newUtente.nome||!newUtente.email) return;
                      setCfg(p=>({...p,utenti:[...p.utenti,newUtente]}));
                      setNewUtente(null);
                    }} style={btnPrimary}>✓ Aggiungi</button>
                    <button onClick={()=>setNewUtente(null)} style={btnSecondary}>Annulla</button>
                  </div>
                </div>
              )}

              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:C.surface2 }}>
                    {["Nome","Email","Ruolo","Ultimo accesso","Attivo",""].map(h=>(
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:C.text3, borderBottom:`1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cfg.utenti.map((u, i) => {
                    const ruolo = RUOLI[u.ruolo] || RUOLI.readonly;
                    return (
                      <tr key={u.id} style={{ borderBottom:`1px solid ${C.border}`, opacity:u.attivo?1:.5 }}>
                        <td style={{ padding:"10px 12px" }}>
                          <div style={{ fontWeight:700 }}>{u.nome} {u.cognome}</div>
                        </td>
                        <td style={{ padding:"10px 12px", color:C.text3, fontSize:12 }}>{u.email}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:12,
                            background:`${ruolo.colore}18`, color:ruolo.colore, fontSize:11, fontWeight:700, border:`1px solid ${ruolo.colore}44` }}>
                            {ruolo.label}
                          </span>
                        </td>
                        <td style={{ padding:"10px 12px", color:C.text3, fontSize:12 }}>{u.ultimoAccesso}</td>
                        <td style={{ padding:"10px 12px" }}>
                          <Toggle val={u.attivo} onChange={()=>setCfg(p=>({...p,utenti:p.utenti.map((x,j)=>j===i?{...x,attivo:!x.attivo}:x)}))}/>
                        </td>
                        <td style={{ padding:"10px 12px" }}>
                          <select value={u.ruolo} onChange={e=>setCfg(p=>({...p,utenti:p.utenti.map((x,j)=>j===i?{...x,ruolo:e.target.value}:x)}))}
                            style={{...inp, width:150, padding:"4px 8px", fontSize:12}}>
                            {Object.entries(RUOLI).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Matrice permessi */}
            <Card title="Matrice permessi per ruolo" subtitle="Accesso alle sezioni del PMS per ruolo">
              {(() => {
                const sezioniPms = ["Dashboard","Prenotazioni","Anagrafica","Check-In/Out","Camere","Cassa","Statistiche","MICE","Configurazione"];
                const permessi = {
                  gm:           { all: true },
                  admin:        { all: true },
                  receptionist: { allow: ["Dashboard","Prenotazioni","Anagrafica","Check-In/Out","Camere","Cassa"] },
                  housekeeping: { allow: ["Dashboard","Camere"] },
                  ristorante:   { allow: ["Dashboard","Cassa"] },
                  readonly:     { allow: ["Dashboard","Statistiche"] },
                };
                return (
                  <div style={{ overflowX:"auto" }}>
                    <table style={{ borderCollapse:"collapse", fontSize:12, width:"100%" }}>
                      <thead>
                        <tr>
                          <th style={{ padding:"8px 12px", textAlign:"left", color:C.text3, borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", minWidth:140 }}>Ruolo</th>
                          {sezioniPms.map(s=>(
                            <th key={s} style={{ padding:"8px 8px", textAlign:"center", color:C.text3, borderBottom:`1px solid ${C.border}`, fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", whiteSpace:"nowrap", writingMode:"vertical-rl", height:80 }}>{s}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(RUOLI).map(([k,v])=>{
                          const p = permessi[k] || { allow:[] };
                          return (
                            <tr key={k} style={{ borderBottom:`1px solid ${C.border}` }}>
                              <td style={{ padding:"8px 12px" }}>
                                <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:12,
                                  background:`${v.colore}18`, color:v.colore, fontSize:11, fontWeight:700 }}>{v.label}</span>
                              </td>
                              {sezioniPms.map(s=>{
                                const ok = p.all || (p.allow||[]).includes(s);
                                return (
                                  <td key={s} style={{ padding:"8px", textAlign:"center" }}>
                                    <span style={{ fontSize:14 }}>{ok?"✅":"—"}</span>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </Card>
          </div>
        )}

        {/* ════ SISTEMA & BACKUP ════ */}
        {sezione === "sistema" && (
          <div>
            {/* Info versione */}
            <Card title="ℹ️ Informazioni sistema">
              <Grid cols="1fr 1fr">
                {[
                  ["Versione PMS", "2.4.1"],
                  ["Ultima build", "2026-02-26"],
                  ["Framework", "React 18 + Vite"],
                  ["Deploy", "Vercel"],
                  ["Database", "Supabase PostgreSQL"],
                  ["AI Engine", "Claude claude-sonnet-4-6"],
                ].map(([k,v])=>(
                  <div key={k} style={{ padding:"10px 14px", background:C.surface2, borderRadius:8, border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10, fontWeight:700, letterSpacing:.5, textTransform:"uppercase", color:C.text3, marginBottom:3 }}>{k}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"'IBM Plex Mono',monospace" }}>{v}</div>
                  </div>
                ))}
              </Grid>
            </Card>

            {/* Export dati */}
            <Card title="💾 Export & Backup" subtitle="Scarica i dati del PMS in vari formati">
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {[
                  { label:"Export configurazione (JSON)", desc:"Esporta tutte le impostazioni del PMS", icon:"⚙️",
                    onClick: () => {
                      const blob = new Blob([JSON.stringify(cfg, null, 2)], {type:"application/json"});
                      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                      a.download = `gasparini_config_${new Date().toISOString().slice(0,10)}.json`; a.click();
                    }
                  },
                  { label:"Import configurazione (JSON)", desc:"Ripristina impostazioni da file JSON", icon:"📥",
                    onClick: () => {
                      const input = document.createElement("input"); input.type="file"; input.accept=".json";
                      input.onchange = e => {
                        const file = e.target.files[0]; if(!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => {
                          try {
                            const imported = JSON.parse(ev.target.result);
                            setCfg(prev=>({...prev,...imported}));
                            setSaved("ok");
                          } catch { setSaved("err"); }
                        };
                        reader.readAsText(file);
                      };
                      input.click();
                    }
                  },
                ].map((btn,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:C.surface2, borderRadius:8, border:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <span style={{ fontSize:22 }}>{btn.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700 }}>{btn.label}</div>
                        <div style={{ fontSize:12, color:C.text3 }}>{btn.desc}</div>
                      </div>
                    </div>
                    <button onClick={btn.onClick} style={btnSecondary}>{btn.icon === "📥"?"Sfoglia...":"Scarica"}</button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Zona pericolo */}
            <Card title="⚠️ Zona pericolo" subtitle="Operazioni irreversibili — attenzione">
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:C.redL, borderRadius:8, border:`1px solid ${C.redLb||"#ef9a9a"}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.red }}>Reset configurazione</div>
                    <div style={{ fontSize:12, color:C.text3 }}>Ripristina tutti i valori ai default di fabbrica</div>
                  </div>
                  {!confirmReset
                    ? <button onClick={()=>setConfirmReset(true)} style={btnDanger}>Reset</button>
                    : <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:12, color:C.red, fontWeight:600 }}>Sei sicuro?</span>
                        <button onClick={()=>{ setCfg(CFG_DEFAULT); salvaCfg(CFG_DEFAULT); setConfirmReset(false); setSaved("ok"); }} style={btnDanger}>✓ Sì, reset</button>
                        <button onClick={()=>setConfirmReset(false)} style={btnSecondary}>Annulla</button>
                      </div>
                  }
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"14px 16px", background:C.redL, borderRadius:8, border:`1px solid ${C.redLb||"#ef9a9a"}` }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.red }}>Svuota localStorage</div>
                    <div style={{ fontSize:12, color:C.text3 }}>Cancella tutti i dati salvati nel browser</div>
                  </div>
                  <button onClick={()=>{ localStorage.removeItem(CFG_KEY); setCfg(CFG_DEFAULT); setSaved("ok"); }} style={btnDanger}>Svuota</button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── SALVA FISSO IN BASSO ── */}
        <div style={{ position:"sticky", bottom:0, background:`${C.bg}ee`, backdropFilter:"blur(8px)", padding:"12px 0", borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"flex-end", gap:10, marginTop:20 }}>
          {saved === "ok" && <span style={{ fontSize:12, color:C.green, fontWeight:600, display:"flex", alignItems:"center", gap:4, padding:"0 8px" }}>✓ Configurazione salvata</span>}
          {saved === "err" && <span style={{ fontSize:12, color:C.red, fontWeight:600, padding:"0 8px" }}>✗ Errore nel salvataggio</span>}
          <button onClick={() => { setCfg(caricaCfg()); setSaved(null); }} style={btnSecondary}>↺ Annulla modifiche</button>
          <button onClick={() => salva()} style={btnPrimary}>💾 Salva tutte le modifiche</button>
        </div>
      </div>
    </div>
  );
}
