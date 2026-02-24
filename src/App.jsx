/** @jsxImportSource react */
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

const PAGES = ["Dashboard","Prenotazioni","Anagrafica","Check-In/Out","Disponibilità","Camere","Prezzi & Revenue","Cassa","Pubblica Sicurezza","ISTAT Veneto","API & Integrazioni","Ristorante POS"];

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
  id:genGuestId(), cognome:"", nome:"", sesso:"M", dataNascita:"",
  luogoNascita:"", provinciaNascita:"", nazionalita:"IT",
  tipoDoc:"Carta d'identità", numDoc:"", rilasciatoDa:"",
  dataRilascio:"", scadenzaDoc:"",
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
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0; width: 230px;
    background: ${C.sidebar};
    display: flex; flex-direction: column;
    z-index: 100; overflow-y: auto; overflow-x: hidden;
    box-shadow: 2px 0 12px rgba(0,0,0,.25);
  }
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
`;

// - COMPONENTE PRINCIPALE -

const PAGE_ICONS = {
  "Dashboard":         "⊞",
  "Prenotazioni":      "📋",
  "Anagrafica":        "👤",
  "Check-In/Out":      "🏨",
  "Disponibilità":     "📅",
  "Camere":            "🛏",
  "Prezzi & Revenue":  "💰",
  "Cassa":             "🖨",
  "Pubblica Sicurezza":"🛡",
  "ISTAT Veneto":      "📊",
  "API & Integrazioni":"⚡",
  "Ristorante POS":    "🍽",
};
const PAGE_GROUPS = [
  { label:"Front Office",   pages:["Dashboard","Prenotazioni","Anagrafica","Check-In/Out","Disponibilità"] },
  { label:"Gestione",       pages:["Camere","Prezzi & Revenue","Cassa"] },
  { label:"Reportistica",   pages:["Pubblica Sicurezza","ISTAT Veneto"] },
  { label:"Integrazioni",   pages:["API & Integrazioni","Ristorante POS"] },
];


export default function HotelPMS() {
  const [page, setPage]               = useState("Dashboard");
  const [guests, setGuests]           = useState(DEMO_GUESTS);
  const [reservations, setReservations] = useState(DEMO_RESERVATIONS);
  const [modal, setModal]             = useState(null);
  const [form, setForm]               = useState({});
  const [guestForm, setGuestForm]     = useState(emptyGuest());
  const [toast, setToast]             = useState(null);
  const [invoiceRes, setInvoiceRes]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQ, setSearchQ]         = useState("");
  const [guestSearch, setGuestSearch] = useState("");
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

  // - Componente suggerimento AI contestuale -
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

  // - Ospiti -

  const openNewGuest  = (forRes=null) => { setGuestForm(emptyGuest()); setModal(forRes ? "guest-form-for-"+forRes : "guest-form"); };
  const openEditGuest = (g) => { setGuestForm({...g}); setModal("guest-form"); };

  const saveGuest = () => {
    const g = guestForm;
    if (!g.cognome||!g.nome||!g.dataNascita||!g.numDoc) { showToast("Compila cognome, nome, data nascita e n° documento","error"); return; }
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
      psInviato:false, istatRegistrato:false, ...prefill });
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
    if (modal==="new-res") { setReservations(p => [...p, saved]); showToast("Prenotazione creata!"); }
    else                   { setReservations(p => p.map(r => r.id===form.id ? saved : r)); showToast("Prenotazione aggiornata!"); }
    dbSaveReservation(saved).catch(()=>{});
    setModal(null);
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
    const q = guestSearch.toLowerCase();
    return !q || `${g.cognome} ${g.nome}`.toLowerCase().includes(q) || g.numDoc?.toLowerCase().includes(q) || g.email?.toLowerCase().includes(q);
  });

  const psRes    = reservations.filter(r => r.status!=="cancelled" && r.checkIn?.startsWith(psMonth));
  const istatRes = reservations.filter(r => r.status!=="cancelled" && r.checkIn?.startsWith(istatMonth));

  // - RENDER -

  const dayStr = (d) => typeof d==="string" ? d : d.toISOString().slice(0,10);

  // - COMPONENTE AUTOCOMPLETE COMUNE (definito dentro il componente) -
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
      <aside className="sidebar" style={{ position:"fixed", left:0, top:0, bottom:0, width:230, background:"#0a1929", zIndex:100, overflowY:"auto", display:"flex", flexDirection:"column", boxShadow:"2px 0 12px rgba(0,0,0,.25)" }}>
        {/* Logo */}
        <div className="sidebar-logo" style={{ padding:"20px 20px 16px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
            <div style={{ width:32, height:32, borderRadius:6, background:"linear-gradient(135deg,#1565c0,#0f62fe)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#fff", flexShrink:0 }}>G</div>
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff", letterSpacing:.5 }}>Hotel Gasparini</div>
              <div style={{ fontSize:9, letterSpacing:2.5, color:"#90b4d4", textTransform:"uppercase", marginTop:2 }}>PMS</div>
            </div>
          </div>
        </div>

        {/* Nav Groups */}
        {PAGE_GROUPS.map(group => (
          <div key={group.label}>
            <div className="sidebar-section" style={{ fontSize:9, letterSpacing:2, color:"rgba(144,180,212,.45)", textTransform:"uppercase", padding:"18px 20px 6px", fontWeight:600 }}>{group.label}</div>
            {group.pages.map(p => (
              <button key={p}
                className={`nav-btn${page===p?" active":""}`}
                onClick={() => setPage(p)}
                style={{
                  display:"flex", alignItems:"center", gap:10,
                  width:"100%", padding:"9px 20px", border:"none",
                  background: page===p ? "#1565c0" : "none",
                  cursor:"pointer", fontSize:13, fontWeight: page===p ? 600 : 400,
                  color: page===p ? "#fff" : "#90b4d4",
                  textAlign:"left", borderLeft: page===p ? "3px solid #5b9dff" : "3px solid transparent",
                  transition:"all .15s", whiteSpace:"nowrap",
                }}>
                <span style={{ fontSize:15, width:18, flexShrink:0 }}>{PAGE_ICONS[p]}</span>
                <span>{p}</span>
              </button>
            ))}
          </div>
        ))}

        {/* Bottom: DB status */}
        <div className="sidebar-bottom">
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:8, color: dbStatus==="ok"?"#6fcf97":dbStatus==="connecting"||dbStatus==="seeding"?"#90caf9":"#ef9a9a" }}>●</span>
            <span style={{ fontSize:11 }}>{dbStatus==="ok"?"Database online":dbStatus==="seeding"?"Inizializzazione…":dbStatus==="connecting"?"Connessione…":"Database offline"}</span>
          </div>
          <div style={{ fontSize:11, color:"rgba(144,180,212,.4)" }}>
            {new Date().toLocaleDateString("it-IT",{day:"2-digit",month:"short",year:"numeric"})}
          </div>
        </div>
      </aside>

      {/*   TOPBAR CONTESTUALE   */}
      <div className="topbar" style={{ position:"fixed", top:0, left:230, right:0, height:52, background:"#fff", borderBottom:"1px solid #dde3ec", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", zIndex:90, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, color:C.text2 }}>
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
      <div className="main-content" style={{ marginLeft:230, paddingTop:72, paddingLeft:28, paddingRight:28, paddingBottom:32, minHeight:"100vh" }}>

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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:10, marginBottom:18 }}>
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
              <div className="page-header"><div><h1>Prenotazioni</h1><div className="page-subtitle">Archivio prenotazioni · ricerca, modifica e nuove inserzioni</div></div>
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
              <div style={{ padding:"12px 18px", borderBottom:`1px solid ${C.border}`, display:"grid", gridTemplateColumns:"110px 1fr 90px 190px 130px 110px", gap:10, fontSize:10, fontWeight:600, color:C.text3, letterSpacing:1, textTransform:"uppercase" }}>
                <div>N° Pren.</div><div>Ospite</div><div>Camera</div><div>Date</div><div>Importo</div><div>Stato</div>
              </div>
              {filteredRes.length===0 && <div style={{ padding:"32px", textAlign:"center", color:C.text3 }}>Nessuna prenotazione trovata</div>}
              {filteredRes.map(r => {
                const room=ROOMS.find(x=>x.id===r.roomId), sc=STATUS_CFG[r.status];
                return (
                  <div key={r.id} className="res-row" onClick={() => openEditReservation(r)}
                    style={{ display:"grid", gridTemplateColumns:"110px 1fr 90px 190px 130px 110px", gap:10, alignItems:"center" }}>
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
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:22 }}>
              <div className="page-header"><div><h1>Anagrafica Ospiti</h1><div className="page-subtitle">Gestione anagrafiche, documenti e storico soggiorni</div></div>
              <button className="btn-primary" onClick={() => openNewGuest()}>+ Nuovo Ospite</button>
            </div>
            <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center" }}>
              <input className="input-field" placeholder="Cerca per nome, documento, email..." style={{ maxWidth:320 }} value={guestSearch} onChange={e=>setGuestSearch(e.target.value)} />
              <span style={{ fontSize:12, color:C.text3, fontWeight:500 }}>{filteredGuests.length} ospiti</span>
            </div>
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
                        <div style={{ fontSize:17, fontWeight:700 }}>{g.cognome} {g.nome}</div>
                        <div style={{ fontSize:11, color:C.text3, marginTop:2, fontWeight:500 }}>{g.id} · {naz?.name}</div>
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
              <div className="page-header"><div><h1>Check-In / Check-Out</h1><div className="page-subtitle">Gestione arrivi, partenze e ospiti in casa</div></div>
              <AiBar pg="Check-In/Out" />

              {/* KPI strip */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
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
              <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1fr", gap:16 }}>

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
            <div className="page-header"><div><h1>Gestione Camere</h1><div className="page-subtitle">Configurazione camere, tipologie e stato occupazione</div></div>
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
            <div className="page-header"><div><h1>Cassa</h1><div className="page-subtitle">Pagamenti ricevuti, estratto conto e report fiscali</div></div>
            <AiBar pg="Cassa" />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
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
            <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginBottom:20 }}>
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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
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

      </div>{/* fine main content */}

      {/*   MODAL: FORM OSPITE   */}
      {modal && modal.startsWith("guest-form") && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal-box" style={{ maxWidth:820 }}>
            <div className="modal-header">
              <div><div style={{ fontSize:10, fontWeight:700, color:C.text3, letterSpacing:2, marginBottom:3 }}>ANAGRAFICA</div>
                <h2 style={{ fontSize:22, fontWeight:600 }}>{guests.find(g=>g.id===guestForm.id)?"Modifica Ospite":"Nuovo Ospite"}</h2></div>
              <span style={{ fontSize:11, color:C.text3 }}>{guestForm.id}</span>
            </div>
            <div className="modal-body">
              <div className="section-title">Dati Anagrafici</div>
              <div className="form-grid" style={{ marginBottom:12 }}>
                <div><label className="label">Cognome *</label><input className="input-field" value={guestForm.cognome} onChange={e=>setGuestForm(f=>({...f,cognome:e.target.value}))} /></div>
                <div><label className="label">Nome *</label><input className="input-field" value={guestForm.nome} onChange={e=>setGuestForm(f=>({...f,nome:e.target.value}))} /></div>
                <div><label className="label">Sesso</label><select className="input-field" value={guestForm.sesso} onChange={e=>setGuestForm(f=>({...f,sesso:e.target.value}))}><option value="M">Maschile</option><option value="F">Femminile</option></select></div>
                <div><label className="label">Data di Nascita *</label><input type="date" className="input-field" value={guestForm.dataNascita} onChange={e=>setGuestForm(f=>({...f,dataNascita:e.target.value}))} /></div>
                <div><label className="label">Luogo di Nascita</label><input className="input-field" value={guestForm.luogoNascita} onChange={e=>setGuestForm(f=>({...f,luogoNascita:e.target.value}))} /></div>
                <div style={{ gridColumn:"1/-1" }}>
                  <ComuneInput
                    label="Comune di Nascita *"
                    value={guestForm.luogoNascita}
                    onChange={item => setGuestForm(f=>({...f, luogoNascita:item.c, provinciaNascita:item.p||f.provinciaNascita}))}
                  />
                </div>
                <div><label className="label">Provincia Nascita</label><input className="input-field" maxLength={2} placeholder="MI" value={guestForm.provinciaNascita} onChange={e=>setGuestForm(f=>({...f,provinciaNascita:e.target.value.toUpperCase()}))} /></div>
                <div><label className="label">Nazionalità</label><select className="input-field" value={guestForm.nazionalita} onChange={e=>setGuestForm(f=>({...f,nazionalita:e.target.value}))}>{NAZIONALITA.map(n=><option key={n.code} value={n.code}>{n.name}</option>)}</select></div>
              </div>
              <hr className="divider"/>
              <div className="section-title">Documento d'Identità (obbligatorio PS)</div>
              <div className="form-grid-3" style={{ marginBottom:12 }}>
                <div><label className="label">Tipo Documento *</label><select className="input-field" value={guestForm.tipoDoc} onChange={e=>setGuestForm(f=>({...f,tipoDoc:e.target.value}))}>{TIPO_DOC.map(t=><option key={t}>{t}</option>)}</select></div>
                <div><label className="label">N° Documento *</label><input className="input-field" value={guestForm.numDoc} onChange={e=>setGuestForm(f=>({...f,numDoc:e.target.value.toUpperCase()}))} /></div>
                <div><label className="label">Rilasciato da</label><input className="input-field" value={guestForm.rilasciatoDa} onChange={e=>setGuestForm(f=>({...f,rilasciatoDa:e.target.value}))} /></div>
                <div><label className="label">Data Rilascio</label><input type="date" className="input-field" value={guestForm.dataRilascio} onChange={e=>setGuestForm(f=>({...f,dataRilascio:e.target.value}))} /></div>
                <div><label className="label">Scadenza</label><input type="date" className="input-field" value={guestForm.scadenzaDoc} onChange={e=>setGuestForm(f=>({...f,scadenzaDoc:e.target.value}))} /></div>
              </div>
              <hr className="divider"/>
              <div className="section-title">Residenza</div>
              <div className="form-grid" style={{ marginBottom:12 }}>
                <div style={{ gridColumn:"1/-1" }}><label className="label">Indirizzo</label><input className="input-field" value={guestForm.indirizzo} onChange={e=>setGuestForm(f=>({...f,indirizzo:e.target.value}))} /></div>
                <div style={{ gridColumn:"span 2" }}>
                  <ComuneInput
                    label="Città di Residenza"
                    value={guestForm.citta}
                    onChange={item => setGuestForm(f=>({...f, citta:item.c, cap:item.z||f.cap, provincia:item.p||f.provincia}))}
                  />
                </div>
                <div><label className="label">CAP</label><input className="input-field" maxLength={5} value={guestForm.cap} onChange={e=>setGuestForm(f=>({...f,cap:e.target.value}))} /></div>
                <div><label className="label">Provincia</label><input className="input-field" maxLength={2} placeholder="VE" value={guestForm.provincia} onChange={e=>setGuestForm(f=>({...f,provincia:e.target.value.toUpperCase()}))} /></div>
                <div><label className="label">Paese</label><input className="input-field" value={guestForm.paese} onChange={e=>setGuestForm(f=>({...f,paese:e.target.value}))} /></div>
              </div>
              <hr className="divider"/>
              <div className="section-title">Contatti</div>
              <div className="form-grid" style={{ marginBottom:12 }}>
                <div><label className="label">Email</label><input type="email" className="input-field" value={guestForm.email} onChange={e=>setGuestForm(f=>({...f,email:e.target.value}))} /></div>
                <div><label className="label">Telefono</label><input className="input-field" value={guestForm.telefono} onChange={e=>setGuestForm(f=>({...f,telefono:e.target.value}))} /></div>
              </div>
              <div><label className="label">Note interne</label><textarea className="input-field" rows={2} value={guestForm.note} onChange={e=>setGuestForm(f=>({...f,note:e.target.value}))} style={{ resize:"none" }} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => { if(prevModal){ setModal(prevModal); setPrevModal(null); } else setModal(null); }}>Annulla</button>
              <button className="btn-primary" onClick={saveGuest}>Salva Ospite</button>
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
              <div style={{ borderBottom:`2px solid ${C.border}`, display:"flex", gap:2, marginBottom:22 }}>
                {[["overview","⊞ Panoramica"],["keys","🔑 Chiavi API"],["rest","</> REST API"],["booking","🌐 Booking"],["payments","💳 Pagamenti"],["webhooks","⚡ Webhooks"],["logs","📋 Logs"]].map(([t,l]) => (
                  <button key={t} className={`api-tab${apiTab===t?" active":""}`} onClick={() => setApiTab(t)}>{l}</button>
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
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
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

    </div>
  );
}