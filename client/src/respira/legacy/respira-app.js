/* eslint-disable */
// @ts-nocheck
// RespiraKids — código original do artefato, mantido como estava.
// Mudanças: roda dentro de startRespira() para poder ligar/desligar com a página,
// e window.claude (banco/usuário) é fornecido pelo app via Convex (ver ../cloud.ts).

export const MARKUP = "<header class=\"topbar\">\n  <img src=\"/respirakids-logo.png\" alt=\"\">\n  <span class=\"brand\">RespiraKids</span>\n  <button type=\"button\" class=\"child\" id=\"childChip\" data-go=\"criancas\" hidden></button>\n</header>\n<main id=\"app\" tabindex=\"-1\"></main>\n<nav class=\"tabbar\" id=\"tabbar\" aria-label=\"Navegação principal\"></nav>\n<div class=\"toast\" id=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n<input type=\"file\" id=\"fileIn\" accept=\"audio/*\" hidden>";

export function startRespira() {
"use strict";
let __stopped = false;
const __listeners = [];
const __timers = [];
function __on(target, type, fn, opts) { target.addEventListener(type, fn, opts); __listeners.push([target, type, fn, opts]); }
/* ========== utilidades ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const fmtTime = t => { const d = new Date(t); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const fmtDate = t => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
const fmtDay = t => new Date(t).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
const fmtMonth = t => new Date(t).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clone = o => JSON.parse(JSON.stringify(o));
function toast(msg, ms = 3200) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms); }

/* ========== ícones (traço fino, como o logotipo) ========== */
const C = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const IC = {
  mic: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3M8 21h8",
  home: "M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5",
  heart: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10zM8 11h2l1-2 2 4 1-2h2",
  clock: C(12, 12, 9) + "M12 7v5l3 2",
  chat: "M4 5h16v11H9l-5 4zM8 9h8M8 12h5",
  dots: C(5.5, 12, 1.4) + C(12, 12, 1.4) + C(18.5, 12, 1.4),
  thermo: "M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0zM12 10v6",
  drop: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z",
  cough: "M4 12h9a3 3 0 1 0-3-3M4 16h12a3 3 0 1 1-3 3M4 8h3",
  music: "M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z",
  lung: "M12 3v7M12 10c-1 1-3 1-3 3M12 10c1 1 3 1 3 3M9 6C6 7 4 12 4 16c0 3 2 4 4 3l2-1V9M15 6c3 1 5 6 5 10 0 3-2 4-4 3l-2-1V9",
  moon: "M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z",
  throat: "M8 3v5a4 4 0 0 0 8 0V3M12 12v9M9 21h6",
  face: C(12, 12, 9) + "M8.5 10h.01M15.5 10h.01M8 16c2-1.5 6-1.5 8 0",
  ribs: "M12 3v18M12 7c-3 0-6 1-7 3M12 7c3 0 6 1 7 3M12 11c-3 0-5 1-6 3M12 11c3 0 5 1 6 3M12 15c-2 0-4 1-5 2M12 15c2 0 4 1 5 2",
  stridor: "M2 12h3l2-6 3 12 3-9 2 6 2-3h5",
  pause: "M8 5v14M16 5v14",
  lips: "M3 12c3-4 6-4 9-2 3-2 6-2 9 2-3 4-6 5-9 5s-6-1-9-5zM3 12h18",
  cupx: "M6 4h12l-1.5 16h-9zM9 9l6 6M15 9l-6 6",
  zzz: "M4 6h6l-6 6h6M13 12h5l-5 6h5",
  zap: "M13 2L4 14h7l-1 8 9-12h-7z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4z",
  play: "M7 4l13 8-13 8z",
  stop: "M6 6h12v12H6z",
  check: "M4 12l5 5L20 6",
  alert: "M12 3L2 21h20zM12 10v5M12 18h.01",
  info: C(12, 12, 9) + "M12 11v6M12 7.5v.01",
  sun: C(12, 12, 4) + "M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5",
  smoke: "M4 16a4 4 0 0 1 4-4 5 5 0 0 1 9-2 4 4 0 0 1 3 6zM6 20h12",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4",
  user: C(12, 7, 4) + "M4 21c0-4 4-6 8-6s8 2 8 6",
  cross: "M10 3h4v7h7v4h-7v7h-4v-7H3v-4h7z",
  db: "M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  back: "M15 5l-7 7 7 7",
  search: C(11, 11, 7) + "M16 16l5 5",
  download: "M12 3v12M7 10l5 5 5-5M5 21h14",
  timer: C(12, 13, 8) + "M12 9v4l2 2M10 2h4",
  hand: "M7 11V6a1.5 1.5 0 0 1 3 0v5M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M16 12v-2a1.5 1.5 0 0 1 3 0v4a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.5L7 14",
  quiet: "M4 9h4l5-4v14l-5-4H4zM17 9l4 6M21 9l-4 6",
  upload: "M12 21V9M7 14l5-5 5 5M5 3h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13",
  book: "M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z",
  pin: "M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" + C(12, 10, 2.5),
  edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M8 14h3",
  plus: "M12 5v14M5 12h14",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"
};
const icon = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${IC[n] || ""}"/></svg>`;

/* ========== estado local (este aparelho) ========== */
/* Um estado por conta: várias contas podem usar o mesmo aparelho sem ver os dados umas das outras. */
const LS_KEY = "respirakids:v1:" + ((window.claude && window.claude.uid) || "anon");
const DEF = { consent: null, profile: null, kids: [], activeKid: null, records: [], events: [], questions: [], expert: {}, pending: null, chat: [], settings: { demo: true }, cloudHash: {}, cloudAudio: {}, cloudFamHash: null, retornos: {} };
const KID_COLORS = ["#5C9E9C", "#C98B5A", "#7A6FB0", "#4F8FC0", "#B5657A", "#6E9A4E"];
const MAX_KIDS = 12, MAX_BACK_DAYS = 90;
function relink(s) { s.profile = (s.kids || []).find(k => k.id === s.activeKid) || (s.kids || [])[0] || null; s.activeKid = s.profile ? s.profile.id : null; return s; }
function migrate(s) {
  if (!Array.isArray(s.kids)) s.kids = [];
  if (s.profile && !s.kids.length) { const k = Object.assign({}, s.profile); k.id = k.id || "k" + Date.now().toString(36); k.color = k.color || KID_COLORS[0]; s.kids = [k]; s.activeKid = k.id; }
  const first = s.kids[0]; (s.records || []).forEach(r => { if (!r.kid && first) r.kid = first.id; });
  return relink(s);
}
function load() { try { const r = localStorage.getItem(LS_KEY); return migrate(r ? Object.assign(clone(DEF), JSON.parse(r)) : clone(DEF)); } catch (e) { return clone(DEF); } }
/* registros da criança escolhida, em ordem de quando aconteceram */
const KR = () => S.records.filter(r => r.kid === S.activeKid).sort((a, b) => a.t - b.t);
const kidName = id => { const k = S.kids.find(x => x.id === id); return k ? k.nome : ""; };
let S = load();
function saveQuiet() { try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { toast("Não foi possível salvar neste aparelho. Libere espaço e tente de novo."); } }
function save() { saveQuiet(); cloudSchedule(); }
function log(type, detail) { S.events.push({ t: Date.now(), type, detail: detail || "" }); if (S.events.length > 800) S.events.splice(0, S.events.length - 800); save(); }

/* áudios ficam no IndexedDB do aparelho */
const IDB = {
  db: null,
  open() { if (this.db) return Promise.resolve(this.db); return new Promise((res, rej) => { const r = indexedDB.open("respirakids:" + ((window.claude && window.claude.uid) || "anon"), 1); r.onupgradeneeded = () => r.result.createObjectStore("audio"); r.onsuccess = () => { this.db = r.result; res(r.result); }; r.onerror = () => rej(r.error); }); },
  async put(k, v) { try { const db = await this.open(); await new Promise((res, rej) => { const tx = db.transaction("audio", "readwrite"); tx.objectStore("audio").put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); return true; } catch (e) { return false; } },
  async get(k) { try { const db = await this.open(); return await new Promise((res, rej) => { const q = db.transaction("audio").objectStore("audio").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => rej(q.error); }); } catch (e) { return null; } },
  async del(k) { try { const db = await this.open(); db.transaction("audio", "readwrite").objectStore("audio").delete(k); } catch (e) { } },
  async clear() { try { const db = await this.open(); db.transaction("audio", "readwrite").objectStore("audio").clear(); } catch (e) { } }
};

/* ========== fontes médicas e técnicas ========== */
const SRC = {
  aidpi: "Brasil. Ministério da Saúde / OPAS. AIDPI – Atenção Integrada às Doenças Prevalentes na Infância (sinais gerais de perigo, tiragem subcostal, estridor e respiração rápida).",
  oms: "Organização Mundial da Saúde. Pocket Book of Hospital Care for Children, 2ª ed., 2013 (sinais de emergência respiratória: cianose, esforço respiratório grave, apneia).",
  pals: "American Heart Association. PALS – Suporte Avançado de Vida em Pediatria, manual 2020 (frequência respiratória normal por idade: 6–11 anos, 18–25/min; 3–5 anos, 20–28/min).",
  bts: "BTS/SIGN 158 – British Guideline on the Management of Asthma, 2019 (crise grave em maiores de 5 anos: FR > 30/min, falta de ar para falar ou comer).",
  gina: "GINA – Global Initiative for Asthma, relatório 2024 (plano de ação escrito, sinais de piora e quando procurar atendimento).",
  sbp: "Sociedade Brasileira de Pediatria. Tratado de Pediatria, 5ª ed., 2022, e documentos científicos dos Departamentos de Pneumologia e Infectologia.",
  who_aq: "Organização Mundial da Saúde. WHO Global Air Quality Guidelines, 2021 (PM2,5 em 24 h: até 15 µg/m³).",
  umid: "INMET / Defesa Civil – níveis de alerta para baixa umidade do ar: atenção abaixo de 30%, alerta abaixo de 20%, emergência abaixo de 12%.",
  mel: "Oduwole O. et al. Honey for acute cough in children. Cochrane Database of Systematic Reviews, 2018 (mel só acima de 1 ano).",
  pramono: "Pramono R.X.A., Bowyer S., Rodriguez-Villegas E. Automatic adventitious respiratory sound analysis: a systematic review. PLoS ONE, 2017.",
  corsa: "Sovijärvi A.R.A. et al. Characteristics of breath sounds and adventitious respiratory sounds (CORSA). European Respiratory Review, 2000.",
  lgpd: "Lei nº 13.709/2018 – Lei Geral de Proteção de Dados (art. 11, dados de saúde; art. 14, dados de crianças com consentimento de pai, mãe ou responsável)."
};

/* ========== sintomas ========== */
const RED = [
  { k: "tiragem", t: "Costelas ou pescoço afundando", s: "A pele entre as costelas ou na base do pescoço afunda quando ela puxa o ar", ic: "ribs", why: "Pele afundando entre as costelas ou no pescoço (tiragem) mostra esforço grande para respirar.", src: ["aidpi", "oms"], how: "Levante a blusa e olhe o peito e a barriga por 1 minuto. Se a pele “some para dentro” entre as costelas, abaixo delas ou na base do pescoço a cada respiração, é tiragem." },
  { k: "estridor", t: "Barulho rouco ao puxar o ar", s: "Som áspero ou agudo quando ela inspira, mesmo parada", ic: "stridor", why: "Barulho rouco ao puxar o ar com a criança calma (estridor) pode indicar a passagem de ar estreitada.", src: ["aidpi", "oms"], how: "É um som alto e áspero que aparece quando ela puxa o ar (não quando solta), parecido com um “ronco agudo”, mesmo sem chorar." },
  { k: "pausas", t: "Pausas na respiração", s: "Para de respirar por alguns segundos", ic: "pause", why: "Pausas na respiração são um sinal de emergência.", src: ["oms"], how: "O peito para de mexer por vários segundos, principalmente durante o sono, e depois volta." },
  { k: "roxo", t: "Lábios ou unhas roxos", s: "Cor arroxeada ou acinzentada na boca ou nas unhas", ic: "lips", why: "Lábios ou unhas arroxeados podem indicar pouco oxigênio no sangue.", src: ["oms", "aidpi"], how: "Olhe os lábios, a língua e as unhas na luz natural. Arroxeado ou cinza é sinal de emergência." },
  { k: "fala", t: "Não consegue falar ou beber", s: "Fala só palavras soltas ou não consegue beber líquidos", ic: "cupx", why: "Falta de ar a ponto de não conseguir falar frases ou beber é sinal de crise grave.", src: ["bts", "aidpi"], how: "Peça para ela contar até 10 ou falar uma frase. Se precisa parar para respirar a cada palavra, ou não consegue tomar água, é grave." },
  { k: "sono", t: "Muito sonolenta, difícil de acordar", s: "Não responde direito ou volta a dormir logo", ic: "zzz", why: "Criança muito sonolenta ou difícil de acordar é um sinal geral de perigo.", src: ["aidpi"], how: "Ela não abre os olhos quando você chama e toca nela, ou acorda e volta a apagar logo em seguida." },
  { k: "convulsao", t: "Convulsão", s: "Tremores, corpo duro ou olhar parado", ic: "zap", why: "Convulsão é um sinal geral de perigo.", src: ["aidpi"], how: "Movimentos que ela não controla, corpo rígido ou olhar fixo, sem responder." }
];
const COMMON = [
  { k: "tosse", t: "Tosse", ic: "cough", how: "Tosse seca (irritada) ou com catarro.", todo: "Ofereça água várias vezes, lave o nariz com soro e observe se piora à noite." },
  { k: "chiado", t: "Chiado no peito", s: "Som de assobio ao soltar o ar", ic: "music", how: "Um som fininho, parecido com um assobio ou miado, que aparece quando ela solta o ar.", todo: "Grave a respiração e anote. Se ela tem plano de ação para asma, siga o que o pediatra orientou." },
  { k: "cansaco", t: "Respiração afobada", s: "Cansa mais rápido ou respira “ofegante”", ic: "lung", how: "Respira mais rápido que o normal, mesmo parada, ou para de brincar porque cansa.", todo: "Deixe-a sentada e calma, conte as respirações em 1 minuto e compare com o esperado." },
  { k: "febre", t: "Febre", s: "37,8 °C ou mais no termômetro", ic: "thermo", how: "Temperatura medida com termômetro igual ou acima de 37,8 °C.", todo: "Ofereça líquidos, roupas leves. Se durar 3 dias ou vier com falta de ar, procure o pediatra." },
  { k: "coriza", t: "Nariz escorrendo ou entupido", ic: "drop", how: "Secreção no nariz, espirros ou nariz trancado.", todo: "Soro fisiológico no nariz várias vezes ao dia e ambiente arejado." },
  { k: "garganta", t: "Dor de garganta", ic: "throat", how: "Reclama para engolir ou está rouca.", todo: "Líquidos e alimentos mornos ou frios, o que ela aceitar melhor." },
  { k: "quieto", t: "Mais quieta que o normal", s: "Molinha, sem vontade de brincar", ic: "moon", how: "Brinca menos, quer ficar deitada, mas acorda e responde normalmente.", todo: "Observe de perto. Se ficar difícil de acordar, é sinal de alerta." },
  { k: "vomito", t: "Enjoo ou vômito", ic: "face", how: "Enjoo ou vômitos, às vezes depois de tossir muito.", todo: "Ofereça líquidos aos poucos. Se vomitar tudo o que bebe, procure atendimento." }
];
const SYM_ALL = Object.fromEntries([...RED, ...COMMON].map(s => [s.k, s]));

/* ========== limites de frequência respiratória por idade ========== */
function ageThresholds(age) {
  if (age < 1) return { normal: "30 a 53", warn: 50, red: 60 };
  if (age < 3) return { normal: "22 a 37", warn: 40, red: 50 };
  if (age < 6) return { normal: "20 a 28", warn: 40, red: 50 };
  if (age < 12) return { normal: "18 a 25", warn: 31, red: 40 };
  return { normal: "12 a 20", warn: 26, red: 30 };
}
const LEVELS = [
  { name: "Verde", title: "Pode observar em casa", short: "Observar em casa" },
  { name: "Amarelo", title: "Fique de olho e reavalie em 2 horas", short: "Atenção" },
  { name: "Vermelho", title: "Procure atendimento agora", short: "Procurar atendimento" }
];

/* ========== árvore de decisão ========== */
function triage(rec, profile) {
  const age = profile ? Number(profile.age) : 7;
  const sym = new Set(rec.sym || []);
  const red = rec.red || [];
  const reasons = []; let lvl = 0;
  const up = (l, t, src) => { lvl = Math.max(lvl, l); reasons.push({ l, t, src }); };
  red.forEach(k => { const r = SYM_ALL[k]; if (r) up(2, r.why, r.src); });
  const th = ageThresholds(age);
  const rr = rec.rr;
  const ageTxt = age === 1 ? "1 ano" : age + " anos";
  if (rr && rr.value) {
    const reliable = rr.source === "manual" || rr.conf !== "baixa";
    if (reliable) {
      if (rr.value >= th.red) up(2, `Respiração muito rápida: ${rr.value} por minuto. Para ${ageTxt}, o esperado em repouso fica entre ${th.normal}.`, ["pals", "aidpi", "bts"]);
      else if (rr.value >= th.warn) {
        if (age >= 5 && (sym.has("chiado") || sym.has("cansaco"))) up(2, `Respiração rápida (${rr.value}/min) junto com chiado ou cansaço: sinal de crise que precisa de avaliação.`, ["bts", "gina"]);
        else up(1, `Respiração mais rápida que o esperado: ${rr.value} por minuto (esperado para ${ageTxt}: ${th.normal}).`, ["pals", "aidpi"]);
      } else if (rr.value > Number(th.normal.split(" a ")[1])) {
        reasons.push({ l: 0, t: `${rr.value} respirações por minuto: um pouco acima do esperado em repouso (${th.normal}). Agitação, choro e febre aumentam a contagem. Conte de novo com ela calma.`, src: ["pals"] });
      } else reasons.push({ l: 0, t: `${rr.value} respirações por minuto: dentro do esperado para ${ageTxt} (${th.normal}).`, src: ["pals"] });
    } else if (rr.value >= th.warn) {
      up(1, "O áudio sugere respiração rápida, mas o som não ficou claro o bastante. Conte as respirações por 1 minuto para confirmar.", ["pals"]);
    }
  }
  if (age < 1) up(1, "O RespiraKids foi pensado para crianças a partir de 1 ano. Para bebês, qualquer mudança na respiração deve ser conversada com o pediatra.", ["aidpi"]);
  if (sym.has("chiado")) up(1, "Chiado (som de assobio) indica que a passagem de ar está mais fechada e precisa ser acompanhado.", ["gina", "sbp"]);
  if (sym.has("cansaco")) up(1, "Respiração afobada ou cansaço para respirar merece reavaliação.", ["aidpi"]);
  if (sym.has("febre") && Number(rec.feverDays) >= 3) up(1, "Febre há 3 dias ou mais deve ser avaliada pelo pediatra.", ["sbp"]);
  if (sym.has("febre") && (sym.has("cansaco") || sym.has("chiado"))) up(1, "Febre junto com dificuldade para respirar precisa de avaliação no mesmo dia.", ["aidpi", "oms"]);
  if (sym.has("quieto")) up(1, "Criança mais quieta ou molinha que o normal deve ser observada de perto.", ["aidpi"]);
  if (sym.has("vomito")) up(1, "Com enjoo ou vômito, ofereça líquidos aos poucos. Se ela vomitar tudo, procure atendimento.", ["aidpi"]);
  const a = rec.audio;
  if (a && a.tonalSec >= 1) up(1, "A gravação tem sons parecidos com chiado (análise experimental). Confira se você escuta assobio no peito.", ["pramono", "corsa"]);
  if (a && a.coughs >= 6) reasons.push({ l: 0, t: `A gravação registrou cerca de ${a.coughs} tosses em 20 segundos.`, src: [] });
  const cond = (profile && profile.cond) || [];
  if (cond.includes("asma") && (sym.has("tosse") || sym.has("chiado")) && lvl < 2) up(1, "Como a criança tem asma, siga o plano de ação escrito pelo pediatra e reavalie.", ["gina"]);
  const env = rec.env || {};
  const airIssue = env.umid === "seca" || env.fumaca === "sim" || Number(env.pm25) > 15;
  if (airIssue && lvl < 2) {
    const parts = [];
    if (env.umid === "seca") parts.push("o ar seco");
    if (env.fumaca === "sim") parts.push("a fumaça");
    if (Number(env.pm25) > 15) parts.push(`a poluição (PM2,5 de ${env.pm25} µg/m³, acima do limite de 15 da OMS)`);
    reasons.push({ l: 0, t: `${parts.join(" e ").replace(/^./, c => c.toUpperCase())} pode explicar parte da tosse e da irritação no nariz. Isso não descarta outras causas.`, src: ["umid", "who_aq"], env: true });
  }
  if (!reasons.length) reasons.push({ l: 0, t: "Nenhum sinal de alerta foi marcado.", src: [] });
  if (!rr || !rr.value || (rr.source !== "manual" && rr.conf === "baixa")) reasons.push({ l: 0, t: "A contagem de respirações não foi confirmada nesta vez. Se estiver em dúvida, conte por 1 minuto com ela calma.", src: ["pals"] });
  return { level: lvl, reasons, airIssue };
}

function actionsFor(level, airIssue, profile) {
  const cond = (profile && profile.cond) || [];
  if (level === 2) return [
    "Procure agora um pronto-atendimento pediátrico. Não espere para gravar de novo.",
    "Se os lábios estiverem roxos, se ela parar de respirar, tiver convulsão ou não acordar, ligue 192 (SAMU).",
    "Mantenha a criança sentada, no colo ou recostada, e o mais calma possível.",
    cond.includes("asma") ? "Se o pediatra deixou um plano de ação para crise, use o que está escrito nele a caminho do atendimento." : "Leve os remédios que ela usa e o celular com este histórico."
  ];
  if (level === 1) return [
    "Reavalie em 2 horas: grave de novo ou conte as respirações por 1 minuto com ela calma.",
    "Fale hoje com o pediatra ou com um serviço de telemedicina. Você pode enviar este relatório pelo WhatsApp.",
    cond.includes("asma") ? "Siga o plano de ação para asma que o pediatra deixou por escrito." : "Mantenha a criança descansando, sentada ou recostada, e ofereça água aos pouquinhos.",
    "Se aparecer algum sinal de alerta (costelas afundando, lábios roxos, muito sonolenta), procure atendimento na hora."
  ];
  const a = [
    "Ofereça água em pequenos goles ao longo do dia. Xixi clarinho é bom sinal.",
    "Lave o nariz com soro fisiológico quando estiver entupido ou escorrendo."
  ];
  if (airIssue) a.push("Com ar seco ou fumaça: deixe janelas fechadas nas horas de mais fumaça, evite brincadeiras ao ar livre e use uma toalha úmida ou bacia de água no quarto (sem exagerar, para não criar mofo).");
  else a.push("Mantenha a casa arejada e longe de fumaça de cigarro, poeira e cheiros fortes.");
  a.push("Registre de novo no diário amanhã ou se algo mudar.");
  return a;
}
function actionSrc(level) { return level === 2 ? ["aidpi", "oms"] : level === 1 ? ["aidpi", "gina", "sbp"] : ["sbp", "umid", "who_aq"]; }

/* ========== perguntas frequentes ========== */
const FAQ = [
  { q: "Como sei se a respiração está rápida?", tag: "olho", src: ["pals", "bts"], a: "Com a criança calma ou dormindo, levante a blusa e conte quantas vezes a barriga sobe em 1 minuto inteiro. Entre 6 e 11 anos, o esperado em repouso fica entre 18 e 25. De 26 a 30, conte de novo depois que ela se acalmar. Acima de 30, fale com o pediatra no mesmo dia; 40 ou mais, procure atendimento." },
  { q: "O que é chiado no peito?", tag: "olho", src: ["gina"], a: "É um som fininho, como um assobio, quando a criança solta o ar. Acontece quando os canos do pulmão ficam mais fechados, como na asma ou na bronquite. Chiado merece atenção: grave, observe e converse com o pediatra." },
  { q: "O que é tiragem (costela afundando)?", tag: "urgente", src: ["aidpi"], a: "É quando a pele entre as costelas, abaixo delas ou na base do pescoço afunda a cada respiração. Mostra que ela está fazendo muita força para respirar. Procure atendimento agora." },
  { q: "Quando devo ligar 192 (SAMU)?", tag: "urgente", src: ["aidpi", "oms"], a: "Ligue se a criança tiver lábios ou unhas roxos, parar de respirar por alguns segundos, tiver convulsão, ficar muito difícil de acordar ou não conseguir falar nem beber de tanta falta de ar." },
  { q: "Os lábios ficaram arroxeados. O que faço?", tag: "urgente", src: ["oms"], a: "Ligue 192 imediatamente. Deixe a criança sentada ou recostada, afrouxe roupas apertadas e fique com ela até o atendimento chegar." },
  { q: "Tosse seca por causa do tempo seco: o que fazer?", tag: "casa", src: ["umid", "sbp"], a: "Ofereça água várias vezes ao dia, lave o nariz com soro fisiológico, evite brincadeiras ao ar livre nas horas mais quentes e secas, e deixe uma toalha úmida ou bacia de água no quarto. Se aparecer chiado, febre alta ou cansaço para respirar, reavalie." },
  { q: "Posso usar soro fisiológico no nariz?", tag: "casa", src: ["sbp"], a: "Sim. Soro fisiológico 0,9% ajuda a soltar a secreção e a hidratar o nariz e pode ser usado várias vezes ao dia." },
  { q: "Umidificador ou bacia de água no quarto?", tag: "casa", src: ["umid"], a: "Os dois ajudam quando o ar está muito seco (umidade abaixo de 30%). Mantenha o umidificador limpo todos os dias e não deixe o quarto úmido demais, para não favorecer mofo." },
  { q: "Febre: quando me preocupar?", tag: "olho", src: ["sbp", "aidpi"], a: "Procure o pediatra se a febre durar 3 dias ou mais, se vier junto com falta de ar ou respiração rápida, ou se a criança ficar muito molinha mesmo depois que a febre baixa." },
  { q: "Como proteger meu filho da fumaça das queimadas?", tag: "casa", src: ["who_aq"], a: "Feche portas e janelas nas horas de mais fumaça, evite atividades ao ar livre, ofereça bastante água e mantenha os remédios de uso contínuo em dia. Crianças com asma devem ter o plano de ação por perto." },
  { q: "Meu filho tem asma. O que observar?", tag: "olho", src: ["gina"], a: "Tenha um plano de ação escrito pelo pediatra. Sinais de piora: precisar da bombinha de alívio mais vezes que o normal, tosse à noite, chiado ou cansaço para brincar. Se a bombinha não resolve ou o alívio dura pouco, procure atendimento." },
  { q: "Tosse que piora à noite é normal?", tag: "olho", src: ["gina", "sbp"], a: "Pode acontecer com nariz entupido ou ar seco. Se a tosse noturna se repete por várias noites, ou vem com chiado, converse com o pediatra: pode ser sinal de asma ou rinite." },
  { q: "Posso dar xarope para tosse?", tag: "olho", src: ["mel", "sbp"], a: "Não dê xaropes para tosse sem orientação médica. Para crianças acima de 1 ano, uma colher de chá de mel pode aliviar a tosse. Água, soro no nariz e repouso também ajudam." },
  { q: "Inalação com soro ajuda?", tag: "casa", src: ["sbp"], a: "Inalação só com soro fisiológico pode trazer conforto para algumas crianças, mas não trata chiado nem crise. Remédios na inalação só com receita do pediatra." },
  { q: "Ela respira pela boca e ronca. Preciso me preocupar?", tag: "olho", src: ["sbp"], a: "Muitas vezes é nariz entupido ou rinite. Se o ronco acontece todas as noites ou se você percebe pausas na respiração durante o sono, converse com o pediatra." },
  { q: "Quanto de água devo oferecer?", tag: "casa", src: ["sbp"], a: "Ofereça pequenos goles ao longo do dia, mesmo sem ela pedir. Xixi clarinho e boca úmida mostram que ela está bem hidratada." },
  { q: "Como fazer uma boa gravação?", tag: "casa", src: [], a: "Escolha um lugar silencioso, desligue TV e ventilador, deixe a criança sentada e calma, segure o celular a uma mão de distância do queixo (15 a 20 cm) e grave por 15 a 20 segundos sem falar." },
  { q: "O aplicativo substitui o pediatra?", tag: "casa", src: [], a: "Não. O RespiraKids é um assistente de orientação e triagem. Ele ajuda a organizar o que você observa e a decidir os próximos passos, mas não faz diagnóstico." }
];
const TAGS = { casa: "Cuidados em casa", olho: "Fique de olho", urgente: "Procure atendimento" };

/* estação do ano (hemisfério sul) e época de seca/queimadas */
function seasonOf(t) { const m = new Date(t).getMonth(); return m <= 1 || m === 11 ? "Verão" : m <= 4 ? "Outono" : m <= 7 ? "Inverno" : "Primavera"; }
function isDrySeason(t) { const m = new Date(t).getMonth(); return m >= 5 && m <= 9; }
/* ========== motor de análise de áudio ========== */
const AC_ = window.AudioContext || window.webkitAudioContext;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang), h = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let j = 0; j < h; j++) {
        const a = i + j, b = a + h;
        const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
function movAvg(a, w) {
  const n = a.length, o = new Float32Array(n), h = Math.floor(w / 2); let s = 0, c = 0;
  for (let i = 0; i < Math.min(h, n); i++) { s += a[i]; c++; }
  for (let i = 0; i < n; i++) { const add = i + h, rem = i - h - 1; if (add < n) { s += a[add]; c++; } if (rem >= 0) { s -= a[rem]; c--; } o[i] = s / c; }
  return o;
}

async function analyzeAudio(blob) {
  const ac = new AC_();
  let buf;
  try { buf = await ac.decodeAudioData(await blob.arrayBuffer()); } finally { try { ac.close(); } catch (e) { } }
  const sr = buf.sampleRate, n0 = buf.length, ch = buf.numberOfChannels;
  const mono = new Float32Array(n0);
  for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n0; i++) mono[i] += d[i] / ch; }
  const durRaw = n0 / sr;
  // regra do MVP: cortar o 1º e o último segundo (cliques, mão, fala)
  let s0 = 0, s1 = n0, trimmed = false;
  if (durRaw >= 4) { s0 = sr; s1 = n0 - sr; trimmed = true; }
  const x = mono.slice(s0, s1), n = x.length, dur = n / sr;
  let clip = 0, peak = 0; for (let i = 0; i < n; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; if (a > 0.985) clip++; }

  // filtro passa-faixa 150–2000 Hz (região dos sons respiratórios)
  const off = new OfflineAudioContext(1, n, sr);
  const b = off.createBuffer(1, n, sr); b.copyToChannel(x, 0);
  const src = off.createBufferSource(); src.buffer = b;
  const hp = off.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 150; hp.Q.value = 0.707;
  const lp = off.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2000; lp.Q.value = 0.707;
  src.connect(hp); hp.connect(lp); lp.connect(off.destination); src.start();
  const y = (await off.startRendering()).getChannelData(0);

  // envelope de energia em janelas de 50 ms
  const HOPS = 0.05, hop = Math.round(sr * HOPS), nf = Math.floor(n / hop), env = new Float32Array(nf);
  for (let f = 0; f < nf; f++) { let s = 0; for (let i = f * hop; i < (f + 1) * hop; i++) s += y[i] * y[i]; env[f] = Math.sqrt(s / hop); }
  const sorted = Array.from(env).sort((a, b) => a - b);
  const q = p => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] || 0;
  const p10 = q(.1), p50 = q(.5), p90 = q(.9);
  const snr = 20 * Math.log10((p90 + 1e-9) / (p10 + 1e-9));

  // tosses: rajadas curtas (≤ 0,8 s) muito acima do nível médio
  let coughs = 0, run = 0; const cth = Math.max(p50 * 6, p90 * 1.8);
  for (let f = 0; f <= nf; f++) { if (f < nf && env[f] > cth) run++; else { if (run >= 1 && run <= 16) coughs++; run = 0; } }

  // frequência respiratória: autocorrelação do envelope suavizado
  const sm = movAvg(env, 7), base = movAvg(sm, 80), d = new Float32Array(nf);
  for (let i = 0; i < nf; i++) d[i] = Math.min(sm[i] - base[i], (p90 - p10) * 1.5);
  const minL = Math.round(1.0 / HOPS), maxL = Math.min(Math.round(5 / HOPS), Math.floor(nf / 2));
  let r0 = 0; for (let i = 0; i < nf; i++) r0 += d[i] * d[i];
  const acf = new Float32Array(maxL + 2);
  for (let L = 0; L <= maxL + 1 && L < nf; L++) { let s = 0; for (let i = 0; i + L < nf; i++) s += d[i] * d[i + L]; acf[L] = r0 > 0 ? (s / r0) * nf / (nf - L) : 0; }
  let best = -1, bl = 0;
  for (let L = Math.max(minL, 1); L <= maxL; L++) if (acf[L] > acf[L - 1] && acf[L] >= acf[L + 1] && acf[L] > best) { best = acf[L]; bl = L; }
  let rrAudio = null, conf = "baixa", ambiguous = false;
  if (bl > 0) {
    rrAudio = Math.round(60 / (bl * HOPS));
    const half = Math.round(bl / 2);
    if (half >= minL && acf[half] > 0.8 * best) ambiguous = true;
    if (best >= 0.45 && snr >= 8) conf = "alta"; else if (best >= 0.25 && snr >= 5) conf = "media";
    if (coughs > 3 && conf !== "baixa") conf = conf === "alta" ? "media" : "baixa";
    if (ambiguous && conf === "alta") conf = "media";
  }
  // picos (cada inspiração/expiração audível)
  let peaks = 0, last = -1e9; const pth = p10 + 0.35 * (p90 - p10);
  for (let i = 1; i < nf - 1; i++) if (sm[i] > pth && sm[i] >= sm[i - 1] && sm[i] > sm[i + 1] && i - last >= 14) { peaks++; last = i; }

  // espectrograma + sons tonais (possível chiado, análise experimental)
  const N = 1024, H = 512, binHz = sr / N, b100 = Math.ceil(100 / binHz), b2k = Math.floor(2000 / binHz), b4k = Math.min(N / 2, Math.floor(4000 / binHz));
  const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
  const frames = Math.max(0, Math.floor((n - N) / H) + 1);
  const COLS = Math.min(frames, 480), ROWS = 96, spec = new Float32Array(COLS * ROWS);
  const re = new Float64Array(N), im = new Float64Array(N);
  const frameSec = H / sr, minTonal = Math.max(2, Math.round(0.15 / frameSec));
  let tonalSec = 0, segLen = 0, segBin = -10, segments = 0;
  const eThr = (p10 * 2.2) ** 2 * N;
  for (let f = 0; f < frames; f++) {
    const o = f * H; let e = 0;
    for (let i = 0; i < N; i++) { const v = y[o + i]; re[i] = v * win[i]; im[i] = 0; e += v * v; }
    fft(re, im);
    let mx = 0, mb = 0, sum = 0, cnt = 0;
    for (let k = b100; k <= b2k; k++) { const p = re[k] * re[k] + im[k] * im[k]; if (p > mx) { mx = p; mb = k; } }
    for (let k = b100; k <= b2k; k++) if (Math.abs(k - mb) > 3) { sum += re[k] * re[k] + im[k] * im[k]; cnt++; }
    const mean = sum / Math.max(1, cnt);
    const tonal = e > eThr && mx > 20 * mean;
    if (tonal && Math.abs(mb - segBin) <= 2) segLen++;
    else { if (segLen >= minTonal) { tonalSec += segLen * frameSec; segments++; } segLen = tonal ? 1 : 0; }
    segBin = tonal ? mb : -10;
    const col = Math.floor(f * COLS / frames);
    for (let r = 0; r < ROWS; r++) {
      const k0 = Math.floor(r * b4k / ROWS), k1 = Math.max(k0 + 1, Math.floor((r + 1) * b4k / ROWS)); let p = 0;
      for (let k = k0; k < k1; k++) p += re[k] * re[k] + im[k] * im[k];
      const db = 10 * Math.log10(p / (k1 - k0) + 1e-12);
      const idx = col * ROWS + r; if (db > spec[idx] || spec[idx] === 0) spec[idx] = db;
    }
  }
  if (segLen >= minTonal) { tonalSec += segLen * frameSec; segments++; }
  if (segments < 2) tonalSec = Math.min(tonalSec, 0.9);

  // qualidade da gravação
  const issues = [];
  if (durRaw < 14) issues.push("A gravação ficou curta. O ideal é de 15 a 20 segundos.");
  if (peak < 0.01) issues.push("O som ficou muito baixo. Aproxime um pouco o celular (uma mão de distância).");
  if (clip > n * 0.001) issues.push("O som “estourou”. O celular pode estar perto demais ou houve batida no microfone.");
  if (snr < 5) issues.push("Muito barulho em volta ou som da respiração fraco. Procure um lugar mais silencioso.");
  const quality = issues.length === 0 ? (snr >= 8 ? "boa" : "aceitável") : issues.length === 1 && durRaw >= 14 ? "aceitável" : "ruim";

  // áudio cortado em 16 kHz para ouvir e enviar ao médico
  const n16 = Math.max(1, Math.ceil(n * 16000 / sr));
  const off2 = new OfflineAudioContext(1, n16, 16000);
  const b2 = off2.createBuffer(1, n, sr); b2.copyToChannel(x, 0);
  const s2 = off2.createBufferSource(); s2.buffer = b2; s2.connect(off2.destination); s2.start();
  const z = (await off2.startRendering()).getChannelData(0);
  const gain = Math.min(0.9 / (peak || 1), 8);
  const wav = encodeWav(z, 16000, gain);

  return {
    durRaw: +durRaw.toFixed(1), dur: +dur.toFixed(1), trimmed, snr: +snr.toFixed(1), peak: +peak.toFixed(3), clipping: clip,
    rrAudio, conf, acPeak: +best.toFixed(2), ambiguous, peaksPerMin: dur > 0 ? Math.round(peaks / dur * 60) : 0,
    coughs, tonalSec: +tonalSec.toFixed(2), quality, issues, spec: { data: spec, cols: COLS, rows: ROWS }, wav
  };
}

function encodeWav(f32, sr, gain = 1) {
  const n = f32.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0, o = 44; i < n; i++, o += 2) { const s = Math.max(-1, Math.min(1, f32[i] * gain)); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([buf], { type: "audio/wav" });
}

function drawSpec(canvas, spec) {
  if (!canvas || !spec || !spec.cols) return;
  const { data, cols, rows } = spec;
  canvas.width = cols; canvas.height = rows;
  const g = canvas.getContext("2d"), img = g.createImageData(cols, rows);
  let mx = -1e9; for (const v of data) if (v > mx) mx = v;
  const lo = mx - 70;
  const ramp = [[14, 33, 32], [46, 106, 104], [92, 158, 156], [254, 238, 223]];
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    let t = (data[c * rows + r] - lo) / 70; t = Math.max(0, Math.min(1, t)) ** 1.3;
    const p = t * 3, i = Math.min(2, Math.floor(p)), f = p - i, A = ramp[i], B = ramp[i + 1];
    const o = ((rows - 1 - r) * cols + c) * 4;
    img.data[o] = A[0] + (B[0] - A[0]) * f; img.data[o + 1] = A[1] + (B[1] - A[1]) * f; img.data[o + 2] = A[2] + (B[2] - A[2]) * f; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

/* ZIP sem compressão (relatório + áudio) */
function crc32(u8) { let crc = ~0; for (let i = 0; i < u8.length; i++) { crc ^= u8[i]; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1)); } return (~crc) >>> 0; }
function makeZip(files) {
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  for (const f of files) {
    const nm = enc.encode(f.name), crc = crc32(f.data), len = f.data.length;
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(12, 0x21, true);
    lh.setUint32(14, crc, true); lh.setUint32(18, len, true); lh.setUint32(22, len, true); lh.setUint16(26, nm.length, true);
    parts.push(lh.buffer, nm, f.data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, 0x21, true);
    c.setUint32(16, crc, true); c.setUint32(20, len, true); c.setUint32(24, len, true); c.setUint16(28, nm.length, true); c.setUint32(42, offset, true);
    central.push(c.buffer, nm); offset += 30 + nm.length + len;
  }
  let cs = 0; central.forEach(p => cs += p.byteLength);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, offset, true);
  return new Blob([...parts, ...central, e.buffer], { type: "application/zip" });
}

/* ========== gravador ========== */
const R = { stream: null, ac: null, an: null, rec: null, chunks: [], raf: 0, t0: 0, iv: 0, level: 0, recording: false };
function pickMime() { if (!window.MediaRecorder) return ""; for (const m of ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) return m; return ""; }
async function openMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw Object.assign(new Error("sem suporte"), { name: "NotSupportedError" });
  R.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  R.ac = new AC_(); const s = R.ac.createMediaStreamSource(R.stream); R.an = R.ac.createAnalyser(); R.an.fftSize = 1024; s.connect(R.an);
  const buf = new Float32Array(R.an.fftSize);
  const loop = () => { if (!R.an) return; R.an.getFloatTimeDomainData(buf); let s2 = 0; for (let i = 0; i < buf.length; i++) s2 += buf[i] * buf[i]; R.level = Math.sqrt(s2 / buf.length); meterUI(R.level); R.raf = requestAnimationFrame(loop); };
  loop();
}
function closeMic() {
  cancelAnimationFrame(R.raf); clearInterval(R.iv);
  try { if (R.rec && R.rec.state !== "inactive") { R.rec.onstop = null; R.rec.stop(); } } catch (e) { }
  if (R.stream) R.stream.getTracks().forEach(t => t.stop());
  try { R.ac && R.ac.close(); } catch (e) { }
  Object.assign(R, { stream: null, ac: null, an: null, rec: null, recording: false });
}
function meterUI(rms) {
  const db = 20 * Math.log10(rms + 1e-9);
  const bars = $$(".micbars rect");
  const lv = Math.max(0, Math.min(1, (db + 60) / 45));
  bars.forEach((r, i) => { const j = 0.55 + 0.45 * lv * (0.6 + 0.4 * Math.sin(i * 1.7 + performance.now() / 180)); r.style.transform = `scaleY(${j.toFixed(2)})`; });
  const m = $("#noiseMeter"); if (m) m.style.width = (lv * 100).toFixed(0) + "%";
  const l = $("#noiseLabel");
  if (l && !R.recording) l.textContent = db > -32 ? "Está barulhento: afaste TV, ventilador e conversas." : db > -48 ? "Ambiente razoável. Se puder, deixe mais silencioso." : "Ambiente silencioso. Ótimo para gravar.";
}
/* ========== banco de dados compartilhado (v2.1) ==========
   Estrutura:
   familias/<uid>                    perfil, consentimento, resumo dos registros, perguntas, uso
   familias/<uid>/registros/<id>     registro completo (com motivos da orientação)
   familias/<uid>/audios/<id>        áudio 8 kHz / 8 bits em base64
   validacoes/<uid>~<id>             classificação do especialista (só profissionais)
   retornos/<uid>                    devolutivas dos profissionais para a família
*/
const APP_VERSION = "2.2";
const CLOUD = { db: null, user: null, uid: null, admin: false, ready: false, tried: false, status: "conectando", err: null, last: null, queue: new Map(), busy: false, retUnsub: null };
const safeId = s => String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g, "_").slice(0, 180);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const cloudOn = () => !!(CLOUD.ready && CLOUD.uid && S.consent && S.consent.cloud);
const famPath = uid => "familias/" + uid;
function strHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; }
const SYNC_TXT = { conectando: "Conectando ao banco de dados…", ok: "Sincronizado com o banco de dados", enviando: "Enviando para o banco de dados…", erro: "Não foi possível salvar no banco agora. Os dados continuam neste aparelho.", semPermissao: "Sua conta não tem permissão para salvar no banco. Os dados continuam neste aparelho.", indisponivel: "Banco de dados indisponível nesta tela. Os dados ficam neste aparelho.", desligado: "Compartilhamento desligado. Os dados ficam só neste aparelho." };
function syncText() { if (CLOUD.ready && !(S.consent && S.consent.cloud)) return SYNC_TXT.desligado; return SYNC_TXT[CLOUD.status] || ""; }
function setSync(st) { CLOUD.status = st; const b = $("#syncTxt"); if (b) b.textContent = syncText(); }

function enqueue(path, job) { CLOUD.queue.set(path, job); kick(); }
async function kick() {
  if (CLOUD.busy || !CLOUD.db) return;
  CLOUD.busy = true; setSync("enviando"); await sleep(400);
  let failed = null;
  while (CLOUD.queue.size) {
    const [path, job] = CLOUD.queue.entries().next().value; CLOUD.queue.delete(path);
    try {
      const ref = CLOUD.db.doc(path);
      if (job.op === "del") await ref.delete();
      else { const data = typeof job.data === "function" ? await job.data() : job.data; if (data) await ref.set(data); }
      if (job.done) job.done(); CLOUD.last = Date.now();
    } catch (e) {
      const code = (e && e.code) || "erro";
      if (code === "unavailable" && !job.retry) { job.retry = 1; CLOUD.queue.set(path, job); await sleep(1500 + Math.random() * 1000); }
      else { failed = code; CLOUD.err = code; if (code === "revoked" || code === "not_granted") { CLOUD.queue.clear(); break; } }
    }
  }
  CLOUD.busy = false;
  setSync(failed ? (failed === "invalid_argument" ? "semPermissao" : "erro") : "ok");
}

function compact(r) {
  return { id: r.id, t: r.t, type: r.type, level: r.level, rr: r.rr || null, sym: r.sym || [], red: r.red || [], feverDays: r.feverDays || "", local: r.local || null, momento: r.momento || null,
    env: r.env ? { umid: r.env.umid || null, fumaca: r.env.fumaca || null, pm25: r.env.pm25 || "", temp: r.env.temp || "", cidade: r.env.cidade || "", estacao: r.env.estacao || "" } : null,
    anxBefore: r.anxBefore || null, secureAfter: r.secureAfter || null, hasAudio: !!r.hasAudio,
    audio: r.audio ? { quality: r.audio.quality, conf: r.audio.conf, durRaw: r.audio.durRaw, rrAudio: r.audio.rrAudio, tonalSec: r.audio.tonalSec, coughs: r.audio.coughs } : null,
    followup: r.followup ? { outcome: r.followup.outcome, would: r.followup.would || null, state: r.followup.state, sat: r.followup.sat || null } : null,
    kid: r.kid || null, retro: !!r.retro, createdAt: r.createdAt || r.t };
}
function familyDoc() {
  const cont = {}; S.events.forEach(e => cont[e.type] = (cont[e.type] || 0) + 1);
  return { v: APP_VERSION, perfil: S.profile ? clone(S.profile) : null, criancas: S.kids.map(k => clone(k)), consentimento: S.consent ? clone(S.consent) : null, resumo: S.records.slice(-150).map(compact), total: S.records.length,
    perguntas: S.questions.slice(-30), uso: { cont, ult: S.events.slice(-30) } };
}
let pushT = 0;
function cloudSchedule() { if (!cloudOn()) return; clearTimeout(pushT); pushT = setTimeout(pushAll, 1500); }
function pushAll() {
  if (!cloudOn()) return;
  const base = famPath(CLOUD.uid), seen = new Set();
  for (const r of S.records) {
    seen.add(r.id);
    const id = r.id, h = strHash(JSON.stringify(r));
    if (S.cloudHash[id] !== h) enqueue(`${base}/registros/${safeId(id)}`, { op: "set", data: () => { const x = S.records.find(y => y.id === id); return x ? clone(x) : null; }, done: () => { S.cloudHash[id] = h; saveQuiet(); } });
    if (r.hasAudio && !S.cloudAudio[id]) enqueue(`${base}/audios/${safeId(id)}`, { op: "set", data: () => audioDoc(id), done: () => { S.cloudAudio[id] = 1; saveQuiet(); } });
  }
  for (const id of Object.keys(S.cloudHash)) if (!seen.has(id)) {
    enqueue(`${base}/registros/${safeId(id)}`, { op: "del", done: () => { delete S.cloudHash[id]; saveQuiet(); } });
    if (S.cloudAudio[id]) enqueue(`${base}/audios/${safeId(id)}`, { op: "del", done: () => { delete S.cloudAudio[id]; saveQuiet(); } });
  }
  const fd = familyDoc(), fh = strHash(JSON.stringify(fd));
  if (S.cloudFamHash !== fh) enqueue(base, { op: "set", data: () => Object.assign(familyDoc(), { atualizado: Date.now() }), done: () => { S.cloudFamHash = fh; saveQuiet(); } });
}

/* áudio: 16 kHz/16 bits do aparelho → 8 kHz/8 bits no banco (cabe em um documento) */
async function audioDoc(id) {
  const b = await IDB.get(id); if (!b) return null;
  const ab = await b.arrayBuffer(), dv = new DataView(ab), sr = dv.getUint32(24, true), n = (ab.byteLength - 44) >> 1;
  const step = sr / 8000, m = Math.min(Math.floor(n / step), 8000 * 20);
  const out = new Uint8Array(44 + m), v = new DataView(out.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  w(0, "RIFF"); v.setUint32(4, 36 + m, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, "data"); v.setUint32(40, m, true);
  for (let i = 0; i < m; i++) {
    const a = Math.floor(i * step); let s = 0, c = 0;
    for (let k = a; k < Math.min(n, a + Math.max(1, Math.round(step))); k++) { s += dv.getInt16(44 + k * 2, true); c++; }
    out[44 + i] = Math.max(0, Math.min(255, Math.round((c ? s / c : 0) / 256 + 128)));
  }
  let bin = ""; for (let i = 0; i < out.length; i += 0x8000) bin += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
  return { b64: btoa(bin), sr: 8000, bits: 8, dur: +(m / 8000).toFixed(1), t: Date.now() };
}
async function cloudAudioBlob(fam, id) {
  const s = await CLOUD.db.doc(`familias/${fam}/audios/${safeId(id)}`).get(); if (!s.exists) return null;
  const bin = atob(s.data().b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type: "audio/wav" });
}
async function getAudio(id) {
  let b = await IDB.get(id);
  if (!b && cloudOn()) { try { b = await cloudAudioBlob(CLOUD.uid, id); if (b) { await IDB.put(id, b); S.cloudAudio[id] = 1; saveQuiet(); } } catch (e) { b = null; } }
  return b;
}

/* novo aparelho: traz do banco o que ainda não está aqui */
async function hydrate() {
  if (!cloudOn()) return;
  const base = famPath(CLOUD.uid);
  try {
    const fs = await CLOUD.db.doc(base).get();
    if (fs.exists) { const d = fs.data(); if (!S.kids.length) { if (d.criancas && d.criancas.length) S.kids = clone(d.criancas); else if (d.perfil) S.kids = [Object.assign({ id: "k0", color: KID_COLORS[0] }, clone(d.perfil))]; S.activeKid = S.kids[0] ? S.kids[0].id : null; relink(S); } if (!S.questions.length && d.perguntas) S.questions = clone(d.perguntas); }
    const rs = await CLOUD.db.doc(base).collection("registros").get();
    const local = new Set(S.records.map(r => r.id)); let added = 0;
    for (const doc of rs.docs) {
      const r = clone(doc.data()); if (!r || !r.id) continue;
      if (!r.kid && S.kids[0]) r.kid = S.kids[0].id;
      if (!local.has(r.id)) { S.records.push(r); added++; }
      S.cloudHash[r.id] = strHash(JSON.stringify(r)); if (r.hasAudio) S.cloudAudio[r.id] = 1;
    }
    if (added) { S.records.sort((a, b) => a.t - b.t); toast(`${added} registro${added > 1 ? "s" : ""} trazido${added > 1 ? "s" : ""} do banco de dados.`); }
    saveQuiet(); setSync("ok"); render();
  } catch (e) { CLOUD.err = e && e.code; setSync("erro"); }
}
async function cloudWipe() {
  if (!CLOUD.ready || !CLOUD.uid) return;
  CLOUD.queue.clear(); clearTimeout(pushT);
  const base = famPath(CLOUD.uid);
  try {
    for (const c of ["registros", "audios"]) { const s = await CLOUD.db.doc(base).collection(c).get(); for (const d of s.docs) await CLOUD.db.doc(`${base}/${c}/${d.id}`).delete(); }
    await CLOUD.db.doc(base).delete();
  } catch (e) { toast("Não foi possível apagar tudo do banco agora. Tente de novo mais tarde."); }
  S.cloudHash = {}; S.cloudAudio = {}; S.cloudFamHash = null;
}
function subRetornos() {
  if (CLOUD.retUnsub || !cloudOn()) return;
  CLOUD.retUnsub = CLOUD.db.doc("retornos/" + CLOUD.uid).onSnapshot(s => {
    const d = s.exists ? s.data() : null; const n = d && d.itens ? clone(d.itens) : {};
    if (JSON.stringify(n) === JSON.stringify(S.retornos || {})) return;
    S.retornos = n; saveQuiet(); if (["registro", "historico", "inicio"].includes(CUR)) render();
  }, () => { CLOUD.retUnsub = null; });
}
async function initCloud() {
  if (!(window.claude && typeof window.claude.use === "function")) { CLOUD.tried = true; setSync("indisponivel"); if (CUR === "medico") render(); return; }
  const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
  CLOUD.db = db; CLOUD.user = user; CLOUD.tried = true;
  if (db && user) { try { CLOUD.uid = await user.id(); CLOUD.admin = await user.canEdit(); CLOUD.isAdmin = user.isAdmin ? await user.isAdmin() : CLOUD.admin; CLOUD.role = user.role ? await user.role() : "familia"; } catch (e) { } }
  if (!CLOUD.db || !CLOUD.uid) { setSync("indisponivel"); render(); return; }
  CLOUD.ready = true; setSync("ok");
  initContas();
  if (cloudOn()) { await hydrate(); pushAll(); subRetornos(); }
  render();
}

/* assinaturas para os profissionais (app clínico e painel técnico) */
const MD = { fams: null, vals: {}, unsubF: null, unsubV: null, timeout: false, err: null, full: {}, pend: false };
function subMed() {
  if (MD.unsubF || !CLOUD.ready || !CLOUD.admin) return;
  const tm = setTimeout(() => { MD.timeout = true; medRefresh(); }, 10000);
  MD.unsubF = CLOUD.db.collection("familias").onSnapshot(s => {
    if (!s.metadata.fromCache) { clearTimeout(tm); MD.timeout = false; }
    MD.fams = s.docs.filter(d => d.exists).map(d => Object.assign({ uid: d.id }, d.data())); medRefresh();
  }, e => { clearTimeout(tm); MD.err = e.code; MD.fams = MD.fams || []; medRefresh(); });
  MD.unsubV = CLOUD.db.collection("validacoes").onSnapshot(s => {
    const v = {}; s.docs.forEach(d => { const x = d.data(); if (x) v[x.fam + "|" + x.rec] = x; }); MD.vals = v; medRefresh();
  }, () => { });
}
function medRefresh() {
  if (CUR !== "medico" && CUR !== "equipe") return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && ae.type !== "checkbox"))) { MD.pend = true; return; }
  render();
}
__on(document, "focusout", () => { if (MD.pend) { MD.pend = false; setTimeout(medRefresh, 50); } });
/* ========== estado de telas ========== */
let CUR = null, SEL = null, SAMPLE = null, DL = null;
let F = null;                       // fluxo de gravação / diário
let FU = {};                        // formulário de acompanhamento
let PF = {};                        // formulário de cadastro
const FQ = { q: "", tag: "todas" }; // filtro das dúvidas
const SD = { to: "pediatra", num: "", range: "7" };
const HF = { filter: "todos", page: 40 };
const CL = { kid: null };
const ROOTS = { flow: () => F, fu: () => FU, prof: () => PF, faq: () => FQ, send: () => SD, hist: () => HF, med: () => MED };
const LOGO = $(".topbar img").getAttribute("src");

function newFlow(mode) { F = { mode: mode || "gravar", step: mode === "anterior" ? "quando" : "pre", manualTyped: "", when: toLocalInput(Date.now() - 864e5), anx: null, local: null, momento: null, t: Date.now(), micErr: null, micOk: false, audio: null, manual: null, sym: [], red: [], feverDays: "", env: { umid: null, fumaca: null, temp: "", pm25: "", cidade: (S.profile && S.profile.cidade) || "" }, recId: null, secure: null, source: null, count: null }; }
function flowSteps() { return F.mode === "anterior" ? ["quando", "sintomas", "ambiente", "resultado"] : F.mode === "diario" ? ["pre", "sintomas", "ambiente", "resultado"] : ["pre", "prep", "mic", "rec", "ouvir", "sintomas", "ambiente", "resultado"]; }
function setStep(s) { F.step = s; render(); window.scrollTo(0, 0); }
function nextStep() { const st = flowSteps(); let i = st.indexOf(F.step); let nx = st[i + 1]; if (nx === "mic" && R.stream) nx = "rec"; setStep(nx); }
function prevStep() { const st = flowSteps(); let i = st.indexOf(F.step); if (F.step === "rec" || F.step === "ouvir") { closeMic(); setStep("prep"); return; } if (i <= 0) { go("inicio"); return; } setStep(st[i - 1]); }

function go(v) { if (location.hash !== "#" + v) location.hash = v; else render(); }
function getPath(path) { const [root, ...rest] = path.split("."); let o = ROOTS[root](); for (let i = 0; i < rest.length - 1; i++) o = o[rest[i]]; return [o, rest[rest.length - 1]]; }

function micBars(cls = "") {
  const xs = [16, 39, 62, 238, 261, 284], hs = [70, 150, 200, 200, 150, 70];
  return `<svg class="micbars ${cls}" viewBox="0 0 300 300" aria-hidden="true">${xs.map((x, i) => `<rect x="${x - 4}" y="${150 - hs[i] / 2}" width="8" height="${hs[i]}" rx="4"/>`).join("")}</svg>`;
}
function stepsBar() {
  const st = flowSteps().filter(s => s !== "resultado"); const i = st.indexOf(F.step);
  return `<div class="row between" style="margin-bottom:8px"><button class="link" data-act="prev">${icon("back", "sm")} Voltar</button><span class="stepnum">Passo ${Math.min(i + 1, st.length)} de ${st.length}</span></div>
  <div class="steps" aria-hidden="true">${st.map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</div>`;
}
const emergencyNote = () => `<div class="notice r emerg">${icon("alert")}<div><b>Lábios roxos, pausa na respiração, convulsão ou não acorda?</b> Não grave.<a class="btn red" href="tel:192">${icon("phone", "sm")} Ligar 192 agora</a></div></div>`;
const disclaimer = () => `<p class="disclaimer">Esta plataforma é um assistente de orientação e triagem. Ela não substitui a avaliação presencial de um médico pediatra.</p>`;
function faces(path, cur, kind) {
  const L = kind === "seg" ? [["😟", "Nada"], ["😕", "Pouco"], ["😐", "Mais ou menos"], ["🙂", "Seguro(a)"], ["😌", "Muito"]] : [["😌", "Tranquilo(a)"], ["🙂", "Um pouco"], ["😟", "Preocupado(a)"], ["😰", "Muito"], ["😱", "Assustado(a)"]];
  return `<div class="faces" role="group">${L.map((f, i) => `<button class="face" ${kind === "seg" ? `data-act="secure" data-v="${i + 1}"` : `data-set="${path}" data-val="${i + 1}" data-rerender`} aria-pressed="${cur == i + 1}"><span>${f[0]}</span><span>${f[1]}</span></button>`).join("")}</div>`;
}
function chips(path, opts, cur, multi, rerender) {
  return `<div class="chips" role="group">${opts.map(([v, l]) => `<button class="chip" data-set="${path}" data-val="${esc(v)}" ${multi ? "data-multi" : ""} ${rerender ? "data-rerender" : ""} aria-pressed="${multi ? (cur || []).includes(v) : cur === v}">${l}</button>`).join("")}</div>`;
}
function toLocalInput(t) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fromLocalInput(v) { const t = new Date(v).getTime(); return isNaN(t) ? null : t; }
const ageLabel = a => Number(a) < 1 ? "menos de 1 ano" : Number(a) === 1 ? "1 ano" : a + " anos";

/* ========== termo de consentimento ========== */
function vTermos() {
  const done = !!S.consent, old = done && S.consent.version !== APP_VERSION;
  return `${old ? `<div class="notice info">${icon("info")}<div><b>Atualizamos o termo (versão ${APP_VERSION}).</b> Agora uma conta pode acompanhar várias crianças e adicionar registros de dias anteriores. Leia e confirme de novo.</div></div>` : ""}
  <h1>Antes de começar</h1>
  <p class="muted">Leia com calma. Para usar o RespiraKids, você precisa concordar com este termo.</p>
  <div class="notice info">${icon("cross")}<div>É médico(a), hospital ou clínica? <a href="#conta"><b>Crie sua conta profissional</b></a> em vez de aceitar o termo das famílias.</div></div>
  <div class="consent-box" tabindex="0">
    <h3>O que o RespiraKids faz</h3>
    <p>É um assistente de orientação e triagem para a respiração de crianças. Ele ajuda você a observar, registrar e decidir os próximos passos. <b>Ele não faz diagnóstico e não substitui a consulta com o pediatra.</b> Em emergência, ligue 192.</p>
    <h3>Quais dados usamos</h3>
    <ul class="plain"><li>Dados de cada criança que você cadastrar: apelido, idade, problemas respiratórios já diagnosticados, remédios de uso contínuo e orientações do pediatra.</li><li>Gravações de 15 a 20 segundos da respiração e da tosse.</li><li>Sintomas marcados, local, data e hora (inclusive de dias anteriores que você adicionar) e condições do ar informadas por você.</li><li>Suas respostas sobre preocupação, segurança e satisfação.</li></ul>
    <h3>Por que usamos (LGPD)</h3>
    <p>Dados de saúde são dados sensíveis (Lei 13.709/2018, art. 11), e dados de crianças só podem ser tratados com o consentimento de pai, mãe ou responsável legal (art. 14). Usamos os dados para: gerar a orientação; montar o histórico da criança; enviar ao médico quando você escolher; e, sem identificação e só se você permitir, avaliar e melhorar o aplicativo com especialistas.</p>
    <h3>Onde os dados ficam</h3>
    <p>Os dados ficam guardados neste aparelho. <b>Se você autorizar abaixo</b>, eles também são guardados no banco de dados do RespiraKids, ligado à sua conta, para não se perderem e para que os <b>profissionais de saúde autorizados pelo projeto</b> possam analisar os registros e enviar devolutivas. Nenhuma outra família vê os seus dados. Os áudios vão para o banco em qualidade reduzida. Ao enviar pelo WhatsApp, os dados passam a seguir as regras do WhatsApp e de quem recebe. As perguntas feitas ao assistente de dúvidas são enviadas ao Claude (Anthropic) para gerar a resposta, junto com a idade e as condições da criança, sem o nome.</p>
    <h3>Seus direitos</h3>
    <p>Você pode ver, corrigir, exportar e apagar todos os dados a qualquer momento em <b>Mais › Privacidade</b>, e pode retirar este consentimento quando quiser.</p>
    <h3>Isenção de responsabilidade médica</h3>
    <p>As orientações seguem diretrizes públicas (Ministério da Saúde/AIDPI, OMS, Sociedade Brasileira de Pediatria, GINA). A análise do áudio é uma estimativa e pode errar por ruído, posição do celular ou choro. As decisões sobre a saúde da criança são do responsável, junto com um profissional de saúde. Na dúvida, procure atendimento.</p>
  </div>
  <label class="check"><input type="checkbox" id="c1" ${done ? "checked" : ""} data-act="consentChk"> <span>Sou pai, mãe ou responsável legal e autorizo o uso dos dados da criança como descrito acima.</span></label>
  <label class="check"><input type="checkbox" id="c2" ${done ? "checked" : ""} data-act="consentChk"> <span>Entendo que o RespiraKids não substitui o médico e que, em emergência, devo ligar 192.</span></label>
  <label class="check"><input type="checkbox" id="c4" ${done && S.consent.cloud ? "checked" : ""}> <span>(Recomendado) Autorizo guardar os dados no banco de dados do RespiraKids e compartilhá-los com os profissionais de saúde do projeto para análise. Posso desligar isso depois em Mais › Privacidade.</span></label>
  <label class="check"><input type="checkbox" id="c3" ${done && S.consent.research ? "checked" : ""}> <span>(Opcional) Aceito que dados sem identificação sejam usados em pesquisa para melhorar o aplicativo.</span></label>
  <button class="btn block" id="acceptBtn" data-act="accept" ${done ? "" : "disabled"}>${icon("shield")} Concordar e continuar</button>`;
}

/* ========== início ========== */
function vInicio() {
  const kr = KR(), p = S.profile, last = kr[kr.length - 1];
  const wk = kr.filter(r => r.t > Date.now() - 7 * 864e5).length;
  let pend = "";
  if (S.pending && (!S.pending.kid || S.pending.kid === S.activeKid)) {
    const due = S.pending.t <= Date.now();
    pend = `<div class="notice ${due ? "y" : "info"}">${icon("timer")}<div><b>${due ? `Hora de reavaliar ${p ? esc(p.nome) : ""}.` : `Reavaliar ${p ? esc(p.nome) : ""} às ${fmtTime(S.pending.t)}.`}</b> ${due ? "Grave de novo." : ""} ${due ? `<br><button class="link" data-act="pendingDone">Já reavaliei</button>` : ""}</div></div>`;
  }
  const dry = isDrySeason(Date.now()) || (last && last.env && (last.env.umid === "seca" || last.env.fumaca === "sim"));
  return `${pend}
  <section class="hero">
    <h1>${p ? `Como está ${esc(p.nome)}?` : "Respire com a gente"}</h1>
    <div class="micwrap">${micBars("breathe")}
      <button class="micbtn" data-act="startFlow" aria-label="Gravar respiração. Abre a preparação, a gravação ainda não começa."><img src="${LOGO}" alt=""><span class="lbl">${icon("mic", "sm")} Gravar respiração</span></button>
    </div>
    <p class="small muted" style="margin-top:6px">20 segundos. Você recebe uma orientação na hora.</p>
  </section>
  ${emergencyNote()}
  ${S.kids.length > 1 ? `<div class="chips" style="margin-bottom:14px">${S.kids.map(k => `<button class="chip" data-act="pickKid" data-id="${k.id}" aria-pressed="${k.id === S.activeKid}"><span class="kdot" style="background:${k.color || "var(--teal)"}"></span>${esc(k.nome)}</button>`).join("")}</div>` : ""}
  <div class="grid2" style="margin-bottom:14px">
    <button class="btn ghost" data-act="startDiary">${icon("edit", "sm")} Anotar sintomas</button>
    <button class="btn ghost" data-act="startRetro">${icon("calendar", "sm")} Dia anterior</button>
  </div>
  ${last ? `<p class="small muted" style="margin:0 0 6px">Último registro · ${fmtDate(last.t)}${wk > 1 ? ` · ${wk} nos últimos 7 dias` : ""}</p>${tlItem(last)}` : ""}
  ${dry ? `<details class="card flat" style="padding:12px 14px;margin-top:8px"><summary class="row" style="cursor:pointer;list-style:none">${icon("sun")}<b>Dica: tempo seco e fumaça</b></summary><p class="small" style="margin:8px 0 0">Água em pequenos goles, soro no nariz e janelas fechadas nas horas de fumaça ajudam.</p></details>` : ""}
  <div class="grid2" style="margin-top:14px">
    <button class="btn ghost" data-go="enviar">${icon("send", "sm")} Enviar ao médico</button>
    <button class="btn ghost" data-go="conversa">${icon("chat", "sm")} Tirar dúvida</button>
  </div>`;
}

/* ========== cadastro ========== */
function vCadastro() {
  if (!PF._loaded) { const base = { resp: "", rel: null, nome: "", age: "", cond: [], meds: "", pedNotes: "", pedNome: "", pedNum: "", emNum: "", cidade: "" }; PF = PF._new ? Object.assign(base, PF) : Object.assign(base, S.profile ? clone(S.profile) : {}); PF._loaded = true; }
  const fromRec = F && F._pendingRec;
  const ages = [["0", "Menos de 1 ano"]].concat(Array.from({ length: 12 }, (_, i) => [String(i + 1), (i + 1) + (i ? " anos" : " ano")]));
  const inp = (k, label, type = "text", ph = "", extra = "") => `<label class="f" for="pf_${k}">${label}</label><input class="f" id="pf_${k}" type="${type}" data-in="prof.${k}" value="${esc(PF[k])}" placeholder="${esc(ph)}" ${extra}>`;
  return `${fromRec ? `<div class="notice info">${icon("info")}<div><b>A gravação ainda não começou.</b> Antes, conte um pouco sobre a criança. Leva 1 minuto. Depois você pode adicionar outras crianças.</div></div>` : ""}
  <h1>${PF._new ? "Nova criança" : S.profile ? "Perfil de " + esc(S.profile.nome) : "Quem vamos acompanhar?"}</h1>
  <div class="card">
    ${inp("resp", "Seu nome", "text", "Como podemos te chamar", 'autocomplete="given-name"')}
    <label class="f">Você é</label>${chips("prof.rel", [["mae", "Mãe"], ["pai", "Pai"], ["avo", "Avó ou avô"], ["baba", "Babá"], ["outro", "Outro"]], PF.rel)}
    ${inp("nome", "Nome ou apelido da criança", "text", "Ex.: Lulu")}
    <label class="f" for="pf_age">Idade da criança</label>
    <select class="f" id="pf_age" data-in="prof.age"><option value="">Escolha</option>${ages.map(([v, l]) => `<option value="${v}" ${String(PF.age) === v ? "selected" : ""}>${l}</option>`).join("")}</select>
    <label class="f">Ela já teve diagnóstico de</label>${chips("prof.cond", [["asma", "Asma"], ["bronquite", "Bronquite"], ["rinite", "Rinite"], ["alergia", "Alergia"], ["nenhum", "Nenhum"]], PF.cond, true)}
    <label class="f" for="pf_meds">Remédios de uso contínuo ou inalações</label><textarea class="f" id="pf_meds" data-in="prof.meds" placeholder="Ex.: bombinha de manutenção 2 vezes ao dia">${esc(PF.meds)}</textarea>
    <label class="f" for="pf_pedNotes">Orientações que o pediatra deixou</label><textarea class="f" id="pf_pedNotes" data-in="prof.pedNotes" placeholder="Ex.: plano de ação para crise de asma">${esc(PF.pedNotes)}</textarea>
  </div>
  <div class="card">
    <h3>Contatos para enviar relatórios</h3>
    ${inp("pedNome", "Nome do pediatra (opcional)")}
    ${inp("pedNum", "WhatsApp do pediatra (com DDD)", "tel", "(61) 99999-9999", 'inputmode="tel"')}
    ${inp("emNum", "WhatsApp de um contato de confiança (opcional)", "tel", "(61) 99999-9999", 'inputmode="tel"')}
    ${inp("cidade", "Cidade e bairro (opcional)", "text", "Ex.: Brasília, Asa Norte")}
  </div>
  <button class="btn block" data-act="saveProfile">${fromRec ? "Salvar e continuar" : PF._new ? "Adicionar criança" : "Salvar perfil"}</button>`;
}

/* ========== fluxo de gravação ========== */
function vGravar() {
  if (!F) newFlow();
  const s = F.step;
  if (s === "pre") return `${stepsBar()}
    ${emergencyNote()}
    <h2>Quão preocupado(a) você está?</h2>
    ${faces("flow.anx", F.anx)}
    <p class="small muted" style="margin-top:8px">Opcional.</p>
    <button class="btn block" data-act="next">Continuar</button>`;
  if (s === "prep") return `${stepsBar()}
    <h2>Prepare a gravação</h2>
    <div class="guide">
      <div class="gcard"><svg viewBox="0 0 120 70" aria-hidden="true"><rect x="10" y="12" width="44" height="30" rx="4" fill="none" stroke="var(--teal)" stroke-width="2.5"/><path d="M26 50h12M32 42v8" stroke="var(--teal)" stroke-width="2.5"/><path d="M8 8l50 40" stroke="var(--r)" stroke-width="3" stroke-linecap="round"/><path d="M76 25h8l10-8v34l-10-8h-8z" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linejoin="round"/><path d="M100 28l10 12M110 28l-10 12" stroke="var(--teal)" stroke-width="2.5" stroke-linecap="round"/></svg><b>Silêncio</b>Desligue TV e ventilador. Ninguém fala.</div>
      <div class="gcard"><svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="30" cy="30" r="17" fill="none" stroke="var(--teal)" stroke-width="2.5"/><path d="M24 36c3 3 9 3 12 0" fill="none" stroke="var(--teal)" stroke-width="2"/><circle cx="25" cy="27" r="1.6" fill="var(--teal)"/><circle cx="35" cy="27" r="1.6" fill="var(--teal)"/><path d="M8 68c2-12 12-18 22-18s20 6 22 18" fill="none" stroke="var(--teal)" stroke-width="2.5"/><rect x="92" y="18" width="18" height="32" rx="4" fill="none" stroke="var(--teal-d)" stroke-width="2.5"/><path d="M50 40h38M50 40l5-4M50 40l5 4M88 40l-5-4M88 40l-5 4" stroke="var(--ink)" stroke-width="1.8" fill="none" stroke-linecap="round"/><text x="69" y="56" font-size="10" text-anchor="middle" fill="var(--ink)" font-family="Atkinson Hyperlegible, sans-serif">15–20 cm</text></svg><b>Uma mão de distância</b>Celular a 15–20 cm do queixo, microfone virado para a criança.</div>
      <div class="gcard"><svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="60" cy="20" r="12" fill="none" stroke="var(--teal)" stroke-width="2.5"/><path d="M55 23c3 2 7 2 10 0" fill="none" stroke="var(--teal)" stroke-width="2"/><path d="M42 62V44c0-6 8-10 18-10s18 4 18 10v18M30 62h60" fill="none" stroke="var(--teal)" stroke-width="2.5" stroke-linecap="round"/><path d="M84 14c4 2 4 8 0 10M90 10c7 4 7 14 0 18" fill="none" stroke="var(--teal-d)" stroke-width="2" stroke-linecap="round"/></svg><b>Criança calma</b>Sentada ou deitada, sem chorar e sem falar.</div>
      <div class="gcard"><svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="60" cy="38" r="24" fill="none" stroke="var(--teal)" stroke-width="2.5"/><path d="M60 38V24M60 38l10 6M52 8h16" stroke="var(--teal-d)" stroke-width="2.5" stroke-linecap="round"/><path d="M60 14a24 24 0 0 1 22 15" stroke="var(--teal-d)" stroke-width="5" fill="none" stroke-linecap="round"/></svg><b>15 a 20 segundos</b>A gravação para sozinha aos 20 s.</div>
    </div>
    <label class="f">O que a criança está fazendo?</label>${chips("flow.momento", [["dormindo", "Dormindo"], ["calma", "Acordada e calma"], ["brincou", "Acabou de brincar"], ["chorando", "Chorando"]], F.momento, false, true)}
    ${F.momento === "chorando" ? `<div class="notice y" style="margin-top:10px">${icon("info")}<div>O choro muda a respiração. Se puder, espere ela se acalmar antes de gravar.</div></div>` : ""}
    ${F.momento === "brincou" ? `<div class="notice y" style="margin-top:10px">${icon("info")}<div>Depois de brincar a respiração fica mais rápida. Espere uns 5 minutos de descanso.</div></div>` : ""}
    <details class="more"><summary>Onde vocês estão? (opcional)</summary>${chips("flow.local", [["quarto", "Quarto"], ["sala", "Sala"], ["carro", "Carro"], ["fora", "Ao ar livre"], ["outro", "Outro"]], F.local, false, false)}</details>
    <button class="btn block" data-act="next" ${F.momento ? "" : "disabled"}>Continuar</button>`;
  if (s === "mic" || (s === "rec" && !R.stream)) { F.step = "mic"; return vMic(); }
  if (s === "rec") return `${stepsBar()}
    <h2>Grave a respiração</h2>
    <div class="micwrap" style="margin-top:6px">${micBars()}
      <svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><circle class="bgc" cx="50" cy="50" r="46"/><circle class="fgc" id="ringFg" cx="50" cy="50" r="46" stroke-dasharray="289" stroke-dashoffset="289"/></svg>
      <div class="micbtn" style="cursor:default"><img src="${LOGO}" alt="" style="opacity:.35"><div class="bigtime" id="recTime" style="position:relative;color:var(--cream)">20 s</div></div>
    </div>
    <p class="small" id="recHint" aria-live="polite" style="text-align:center;font-weight:700">Celular a uma mão do queixo. Ninguém fala durante a gravação.</p>
    <div class="meter" aria-hidden="true"><i id="noiseMeter"></i></div>
    <p class="small muted" id="noiseLabel" style="margin-top:6px">Medindo o barulho do ambiente…</p>
    <div class="stack" id="recBtns">
      <button class="btn block" data-act="recStart">${icon("mic", "sm")} Começar a gravar</button>
    </div>`;
  if (s === "quando") return vQuando();
  if (s === "proc") return `<div class="card" style="text-align:center"><div class="spinner"></div><h2>Analisando o áudio</h2><p class="muted">Cortando o 1º e o último segundo, filtrando ruídos e contando as respirações.</p></div>`;
  if (s === "ouvir") return vOuvir();
  if (s === "sintomas") return vFlowSintomas();
  if (s === "ambiente") return vAmbiente();
  if (s === "resultado") return vResultado();
  return "";
}

function vMic() {
  const e = F.micErr;
  let help = "";
  if (e === "NotAllowedError" || e === "SecurityError") help = `<b>O microfone está bloqueado.</b> Para liberar: toque no cadeado ou no ícone ao lado do endereço do site › Permissões › Microfone › Permitir. No iPhone, veja também Ajustes › Safari › Microfone. Depois toque em “Tentar de novo”. Se a pergunta não aparecer, use a opção do gravador do celular logo abaixo.`;
  else if (e === "NotFoundError") help = "<b>Não encontramos um microfone neste aparelho.</b> Use o gravador do celular e envie o arquivo.";
  else if (e) help = "<b>Este navegador não deixou gravar aqui.</b> Use o gravador do celular e envie o arquivo pela opção abaixo.";
  return `${stepsBar()}
    <h2>Liberar o microfone</h2>
    <p>Quando o celular perguntar, toque em <b>Permitir</b>.</p>
    <div class="card flat" aria-hidden="true" style="background:var(--field)">
      <div class="row small" style="font-weight:700">${icon("mic", "sm")} Este site quer usar seu microfone</div>
      <div class="row" style="justify-content:flex-end;margin-top:10px;gap:8px"><span class="chip" style="min-height:36px">Bloquear</span><span class="chip" style="min-height:36px;background:var(--teal-d);color:#fff;border-color:var(--teal-d);outline:3px solid var(--y);outline-offset:3px">Permitir</span></div>
      <p class="small" style="text-align:right;margin:8px 0 0;color:var(--y);font-weight:700">↑ toque aqui</p>
    </div>
    ${help ? `<div class="notice y">${icon("alert")}<div>${help}</div></div>` : ""}
    <button class="btn block" data-act="allowMic">${icon("mic", "sm")} ${e ? "Tentar de novo" : "Liberar microfone"}</button>
    <details class="more" ${e ? "open" : ""}><summary>Não funcionou? Use o gravador do celular</summary>
      <ol class="acts small"><li>Grave 20 segundos no app Gravador (Android) ou Memos de Voz (iPhone).</li><li>Volte aqui e envie o arquivo.</li></ol>
      <button class="btn ghost block" data-act="pickFile">${icon("upload", "sm")} Enviar arquivo de áudio</button></details>`;
}

function vOuvir() {
  const a = F.audio.an;
  const noise = a.snr >= 10 ? "baixo" : a.snr >= 5 ? "médio" : "alto";
  const confTxt = { alta: "confiança alta", media: "confiança média", baixa: "confiança baixa" }[a.conf];
  const c = F.count;
  let counter;
  if (c && c.active) counter = `<p class="small" aria-live="polite"><b id="cntTime">${Math.max(0, 30 - Math.floor((Date.now() - c.t0) / 1000))} s</b> restantes · <b id="cntTaps">${c.taps}</b> toques</p><button class="tapbtn" data-act="tap">Toque cada vez que a barriga subir</button>`;
  else if (F.manual) counter = `<div class="notice g">${icon("check")}<div>Você contou <b>${F.manual} respirações por minuto</b>. Vamos usar a sua contagem. <button class="link" data-act="countStart">Contar de novo</button></div></div>`;
  else counter = `<button class="btn ghost block" data-act="countStart">${icon("timer", "sm")} Conferir contando (30 segundos)</button>`;
  const bad = a.quality === "ruim";
  return `${stepsBar()}
    <h2>Ouça a gravação</h2>
    <p>Dá para ouvir a respiração? Se tiver barulho ou choro, grave de novo.</p>
    <audio controls src="${F.audio.url}"></audio>
    ${a.issues.length ? `<div class="notice y">${icon("alert")}<div>${a.issues.join("<br>")}</div></div>` : ""}
    <div class="card">
      ${a.rrAudio ? `<p style="margin:0 0 6px">Respirações: <b>${a.rrAudio} por minuto</b> <span class="small muted">(${confTxt})</span></p>` : `<p style="margin:0 0 6px">O áudio não permitiu contar as respirações.</p>`}
      ${a.conf === "baixa" ? `<p class="small"><b>Conte junto com a gente:</b> toque no botão cada vez que a barriga subir.</p>` : ""}
      ${counter}
    </div>
    <details class="more"><summary>Detalhes da gravação</summary>
      <canvas class="spec" id="specCanvas" role="img" aria-label="Desenho do som da gravação"></canvas>
      <p class="small muted" style="margin-top:6px">As faixas claras são a respiração e a tosse.${a.trimmed ? " Já cortamos o 1º e o último segundo." : ""}</p>
      <div class="qual"><div>Qualidade<b>${a.quality}</b></div><div>Duração<b>${Math.round(a.durRaw)} s</b></div><div>Ruído<b>${noise}</b></div></div>
    </details>
    <div class="grid2">
      <button class="btn ${bad ? "" : "ghost"}" data-act="redo">${icon("mic", "sm")} Gravar de novo</button>
      <button class="btn ${bad ? "ghost" : ""}" data-act="next">${bad ? "Usar mesmo assim" : "Usar esta gravação"}</button>
    </div>`;
}

function symTile(s, red) {
  const on = (red ? F.red : F.sym).includes(s.k);
  return `<button class="stile ${red ? "red" : ""}" data-act="sym" data-k="${s.k}" data-red="${red ? 1 : 0}" aria-pressed="${on}">${icon(s.ic, "lg")}<span class="t">${s.t}</span>${s.s ? `<span class="s">${s.s}</span>` : ""}</button>`;
}
function vFlowSintomas() {
  return `${stepsBar()}
    <h2>${F.mode === "anterior" ? `Como ${esc(S.profile.nome)} estava?` : `Como ${esc(S.profile.nome)} está agora?`}</h2>
    <p class="muted">Marque o que você vê (ou nada).</p>
    <div class="sec-title">${icon("alert")}<h3 style="margin:0">Sinais de alerta</h3></div>
    <div class="sgrid">${RED.map(s => symTile(s, true)).join("")}</div>
    ${F.red.length && F.mode !== "anterior" ? `<div class="notice r" style="margin-top:12px">${icon("alert")}<div><b>Você marcou um sinal de alerta.</b> Procure atendimento agora. Lábios roxos, pausas, convulsão ou difícil de acordar: <a href="tel:192"><b>ligue 192</b></a>.</div></div>` : ""}
    <div class="sec-title">${icon("heart")}<h3 style="margin:0">Outros sintomas</h3></div>
    <div class="sgrid">${COMMON.map(s => symTile(s, false)).join("")}</div>
    ${F.sym.includes("febre") ? `<label class="f">Há quantos dias tem febre?</label>${chips("flow.feverDays", [["1", "1 dia"], ["2", "2 dias"], ["3", "3 dias ou mais"]], F.feverDays)}` : ""}
    <button class="btn block" style="margin-top:16px" data-act="next">Continuar</button>`;
}

function vAmbiente() {
  const e = F.env;
  const inp = (k, label, ph, mode) => `<label class="f" for="env_${k}">${label}</label><input class="f" id="env_${k}" data-in="flow.env.${k}" value="${esc(e[k])}" placeholder="${ph}" ${mode ? `inputmode="${mode}"` : ""}>`;
  return `${stepsBar()}
    <h2>${F.mode === "anterior" ? "Como estava o ar naquele dia?" : "Como está o ar hoje?"}</h2>
    <p class="muted">Ar seco e fumaça também causam tosse. Pode pular.</p>
    <label class="f">Umidade do ar</label>${chips("flow.env.umid", [["seca", "Muito seco"], ["normal", "Normal"], ["umida", "Úmido ou chuvoso"], ["nsei", "Não sei"]], e.umid)}
    <label class="f">Tem fumaça ou cheiro de queimada?</label>${chips("flow.env.fumaca", [["sim", "Sim"], ["nao", "Não"], ["nsei", "Não sei"]], e.fumaca)}
    <details class="more" style="margin-top:12px"><summary>Mais detalhes (opcional)</summary>
      <div class="grid2">${inp("temp", "Temperatura (°C)", "Ex.: 31", "decimal")}${inp("umidPct", "Umidade (%)", "Ex.: 18", "numeric")}</div>
      ${inp("pm25", "Qualidade do ar: PM2,5 (µg/m³)", "Veja no app de qualidade do ar", "decimal")}
      ${inp("cidade", "Cidade e bairro", "Ex.: Cuiabá, Centro")}
    </details>
    <button class="btn block" data-act="finish">${F.mode === "anterior" ? "Salvar registro" : "Ver orientação"}</button>`;
}

function srcList(ids) { return `<details class="srcs"><summary>Fontes médicas desta orientação</summary><ol>${ids.map(id => `<li>${esc(SRC[id])}</li>`).join("")}</ol></details>`; }
function reasonsBlock(rec) {
  const ids = []; const num = id => { let i = ids.indexOf(id); if (i < 0) { ids.push(id); i = ids.length - 1; } return i + 1; };
  const items = rec.reasons.slice().sort((a, b) => b.l - a.l).map(r => `<li>${esc(r.t)} ${(r.src || []).map(s => `<sup class="src">[${num(s)}]</sup>`).join("")}</li>`).join("");
  const acts = actionsFor(rec.level, rec.airIssue, S.profile);
  const aSrc = actionSrc(rec.level).map(s => `<sup class="src">[${num(s)}]</sup>`).join("");
  return { html: `<div class="card"><h3>O que fazer agora ${aSrc}</h3><ol class="acts">${acts.map(a => `<li>${esc(a)}</li>`).join("")}</ol></div>
    <details class="more"><summary>Por que essa orientação?</summary><ul class="plain">${items}</ul></details>`, ids };
}
function rrText(rr) { if (!rr || !rr.value) return "Contagem de respirações não confirmada"; return `${rr.value} respirações por minuto (${rr.source === "manual" ? "contadas por você" : "estimadas pelo áudio, confiança " + (rr.conf === "media" ? "média" : rr.conf)})`; }

function vResultado() {
  const rec = S.records.find(r => r.id === F.recId); if (!rec) return "";
  const L = LEVELS[rec.level]; const rb = reasonsBlock(rec);
  return `<div class="lvl l${rec.level}" role="status">
      <span class="tag"><span class="dot d${rec.level}"></span> Nível ${L.name}</span>
      <h1>${L.title}</h1>
      <p style="margin:0">${icon("lung", "sm")} ${rrText(rec.rr)}</p>
    </div>
    ${rec.retro ? `<div class="notice info">${icon("clock")}<div><b>Registro de ${fmtDay(rec.t)}, ${fmtTime(rec.t)}.</b> A orientação vale para aquele momento. Se ${esc(kidName(rec.kid))} está com sintomas agora, faça também um registro de agora.</div></div>` : ""}
    ${rec.level === 2 && !rec.retro ? `<div class="stack" style="margin-bottom:14px"><a class="btn red block" href="tel:192">${icon("phone", "sm")} Ligar 192 (SAMU)</a><a class="btn ghost block" href="https://www.google.com/maps/search/pronto+atendimento+pedi%C3%A1trico" target="_blank" rel="noopener">${icon("pin", "sm")} Ver pronto-atendimentos no mapa</a></div>` : ""}
    ${rec.level === 1 && S.pending && S.pending.id === rec.id ? `<div class="notice y">${icon("timer")}<div><b>Reavalie às ${fmtTime(S.pending.t)}.</b> Vamos lembrar você na tela inicial.</div></div>` : ""}
    ${rb.html}
    <div class="stack" style="margin-bottom:14px">
      <button class="btn wa block" data-act="sendRec" data-id="${rec.id}">${icon("send", "sm")} Enviar ao médico</button>
      <div class="grid2"><button class="btn ghost" data-act="home">Início</button><button class="btn ghost" data-go="conversa">${icon("chat", "sm")} Tirar dúvida</button></div>
    </div>
    ${rec.retro ? "" : `<div class="card flat"><h3 style="margin-bottom:10px">Você se sente seguro(a) com essa decisão?</h3>${faces("", F.secure, "seg")}
      ${F.secure ? `<p class="small muted" style="margin:10px 0 0">Obrigado!</p>` : ""}</div>`}
    ${srcList(rb.ids)}
    ${disclaimer()}`;
}

/* ========== crianças (várias por conta) ========== */
function vCriancas() {
  if (!S.kids.length) { setTimeout(() => ACT.addKid()); return ""; }
  return `<h1>Crianças</h1>
  <p class="muted">Uma conta pode acompanhar várias crianças. Cada uma tem o próprio histórico. Para trocar, toque no nome dela no alto da tela.</p>
  ${S.kids.map(k => { const n = S.records.filter(r => r.kid === k.id).length; return `<div class="card">
    <div class="row"><span class="kdot" style="width:16px;height:16px;background:${k.color || "var(--teal)"}"></span><div style="flex:1;min-width:0"><h3 style="margin:0">${esc(k.nome)}${k.id === S.activeKid ? ' <span class="small muted">(em uso agora)</span>' : ""}</h3>
      <p class="small muted" style="margin:0">${ageLabel(k.age)}${(k.cond || []).filter(c => c !== "nenhum").length ? " · " + k.cond.filter(c => c !== "nenhum").join(", ") : ""} · ${n} registro${n === 1 ? "" : "s"}</p></div></div>
    <div class="grid2" style="margin-top:12px">${k.id === S.activeKid ? `<button class="btn ghost" data-act="editKid" data-id="${k.id}">${icon("edit", "sm")} Editar</button>` : `<button class="btn" data-act="pickKid" data-id="${k.id}">Escolher</button>`}
      <button class="btn ghost" style="color:var(--r)" data-act="delKid" data-id="${k.id}">${icon("trash", "sm")} Remover</button></div>
    ${k.id !== S.activeKid ? `<button class="link" data-act="editKid" data-id="${k.id}">Editar perfil</button>` : ""}</div>`; }).join("")}
  <button class="btn block" data-act="addKid">${icon("plus", "sm")} Adicionar outra criança</button>`;
}

/* ========== registro de um dia anterior ========== */
function vQuando() {
  const now = Date.now(), t = fromLocalInput(F.when);
  const quick = [["Hoje mais cedo", now - 3 * 36e5], ["Ontem à noite", new Date(new Date(now - 864e5).setHours(21, 0, 0, 0)).getTime()], ["Anteontem", new Date(new Date(now - 2 * 864e5).setHours(12, 0, 0, 0)).getTime()]];
  const a = F.audio && F.audio.an;
  return `${stepsBar()}
    <h2>Quando foi?</h2>
    <p class="muted">Adicione o que você observou em ${esc(S.profile.nome)} num dia anterior. O registro entra no histórico na data certa, com a etiqueta “adicionado depois”.</p>
    <div class="chips" style="margin-bottom:12px">${quick.map(([l, ts]) => `<button class="chip" data-act="setWhen" data-v="${toLocalInput(ts)}">${l}</button>`).join("")}</div>
    <label class="f" for="whenIn">Data e hora</label>
    <input class="f" id="whenIn" type="datetime-local" data-in="flow.when" value="${esc(F.when)}" max="${toLocalInput(now)}" min="${toLocalInput(now - MAX_BACK_DAYS * 864e5)}">
    ${t ? `<p class="small muted" style="margin-top:6px">${icon("clock", "sm")} ${fmtDay(t)}, ${fmtTime(t)} · ${seasonOf(t).toLowerCase()}</p>` : ""}
    <label class="f">Onde vocês estavam?</label>${chips("flow.local", [["quarto", "Quarto"], ["sala", "Sala"], ["carro", "Carro"], ["fora", "Ao ar livre"], ["outro", "Outro"]], F.local)}
    <label class="f">O que a criança estava fazendo?</label>${chips("flow.momento", [["dormindo", "Dormindo"], ["calma", "Acordada e calma"], ["brincou", "Acabou de brincar"], ["chorando", "Chorando"]], F.momento)}
    <div class="card" style="margin-top:16px"><h3>Você contou as respirações naquele dia?</h3><p class="small muted">Opcional. Respirações em 1 minuto.</p>
      <input class="f" type="number" inputmode="numeric" min="4" max="120" data-in="flow.manualTyped" value="${esc(F.manualTyped)}" placeholder="Ex.: 24"></div>
    <div class="card"><h3>Tem uma gravação desse dia?</h3><p class="small muted">Se você gravou com o gravador do celular, envie aqui. O app analisa do mesmo jeito.</p>
      ${a ? `<audio controls src="${F.audio.url}"></audio><div class="qual"><div>Qualidade<b>${a.quality}</b></div><div>Duração<b>${Math.round(a.durRaw)} s</b></div><div>Pelo áudio<b>${a.rrAudio ? a.rrAudio + "/min" : "–"}</b></div></div>${a.issues.length ? `<div class="notice y">${icon("alert")}<div>${a.issues.join("<br>")}</div></div>` : ""}` : ""}
      <button class="btn ghost block" data-act="pickFile">${icon("upload", "sm")} ${a ? "Trocar o arquivo" : "Enviar arquivo de áudio"}</button></div>
    <button class="btn block" data-act="next" ${t ? "" : "disabled"}>Continuar</button>`;
}

/* ========== aba sintomas ========== */
function vSintomas() {
  const item = (s, red) => `<details class="card flat" style="padding:12px 14px;margin-bottom:8px"><summary class="row" style="cursor:pointer;list-style:none">${`<span style="color:${red ? "var(--r)" : "var(--teal-d)"}">${icon(s.ic, "lg")}</span>`}<span><b>${s.t}</b>${s.s ? `<br><span class="small muted">${s.s}</span>` : ""}</span></summary>
    <div style="padding:10px 0 0 46px"><p><b>Como reconhecer:</b> ${s.how}</p><p style="margin:0"><b>O que fazer:</b> ${red ? `Procure atendimento agora. ${["roxo", "pausas", "convulsao", "sono"].includes(s.k) ? '<a href="tel:192"><b>Ligue 192</b></a>.' : ""}` : s.todo}</p>
    ${red ? `<p class="small muted" style="margin:8px 0 0">Fonte: ${s.src.map(x => SRC[x].split(".")[0] + (x === "aidpi" ? " (AIDPI)" : "")).join("; ")}.</p>` : ""}</div></details>`;
  return `<h1>Sintomas</h1>
  <p class="muted">Toque em um símbolo para ver como reconhecer e o que fazer.</p>
  <button class="btn block" data-act="startDiary">${icon("edit", "sm")} Registrar sintomas de hoje</button>
  <div class="sec-title">${icon("alert")}<h2 style="margin:0">Sinais de alerta</h2></div>
  <p class="small muted">Qualquer um destes: procure atendimento agora.</p>
  ${RED.map(s => item(s, true)).join("")}
  <div class="sec-title">${icon("heart")}<h2 style="margin:0">Sintomas comuns</h2></div>
  <p class="small muted">Geralmente dá para cuidar e observar em casa. Fique de olho se eles aumentarem.</p>
  ${COMMON.map(s => item(s, false)).join("")}
  ${disclaimer()}`;
}

/* ========== histórico ========== */
function rrChart(recs, age, h = 150) {
  const pts = recs.filter(r => r.rr && r.rr.value).slice(-30);
  if (pts.length < 2) return `<p class="muted small">O gráfico aparece a partir de 2 registros com contagem de respirações.</p>`;
  const th = ageThresholds(age), [nlo, nhi] = th.normal.split(" a ").map(Number);
  const W = 600, H = h, pl = 34, pr = 10, pt = 10, pb = 22;
  const vals = pts.map(p => p.rr.value), lo = Math.min(nlo - 4, ...vals) - 2, hi = Math.max(th.red + 4, ...vals) + 2;
  const X = i => pl + i * (W - pl - pr) / (pts.length - 1), Y = v => pt + (hi - v) * (H - pt - pb) / (hi - lo);
  const line = pts.map((p, i) => `${X(i).toFixed(1)},${Y(p.rr.value).toFixed(1)}`).join(" ");
  const col = l => ["var(--g)", "var(--y)", "var(--r)"][l];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Respirações por minuto nos últimos registros">
    <rect x="${pl}" y="${Y(nhi)}" width="${W - pl - pr}" height="${Y(nlo) - Y(nhi)}" style="fill:var(--g-bg)"/>
    <line x1="${pl}" x2="${W - pr}" y1="${Y(th.red)}" y2="${Y(th.red)}" style="stroke:var(--r)" stroke-dasharray="4 4"/>
    <line x1="${pl}" x2="${W - pr}" y1="${Y(th.warn)}" y2="${Y(th.warn)}" style="stroke:var(--y)" stroke-dasharray="4 4"/>
    <text x="${pl - 6}" y="${Y(nhi) + 4}" text-anchor="end" font-size="11" style="fill:var(--ink2)">${nhi}</text>
    <text x="${pl - 6}" y="${Y(nlo) + 4}" text-anchor="end" font-size="11" style="fill:var(--ink2)">${nlo}</text>
    <text x="${pl - 6}" y="${Y(th.red) + 4}" text-anchor="end" font-size="11" style="fill:var(--r)">${th.red}</text>
    <polyline points="${line}" fill="none" style="stroke:var(--teal-d)" stroke-width="2.2" stroke-linejoin="round"/>
    ${pts.map((p, i) => `<circle cx="${X(i)}" cy="${Y(p.rr.value)}" r="5" style="fill:${col(p.level)};stroke:var(--card)" stroke-width="2"/>`).join("")}
    <text x="${pl}" y="${H - 5}" font-size="11" style="fill:var(--ink2)">${fmtDate(pts[0].t)}</text>
    <text x="${W - pr}" y="${H - 5}" font-size="11" text-anchor="end" style="fill:var(--ink2)">${fmtDate(pts[pts.length - 1].t)}</text>
  </svg><p class="small muted" style="margin:4px 0 0">Faixa verde: esperado em repouso para ${ageLabel(age)}. Linhas: atenção (${th.warn}) e procurar atendimento (${th.red}).</p>`;
}
function tlItem(r) {
  const syms = [...(r.red || []), ...(r.sym || [])].slice(0, 4);
  return `<button class="tl-item" data-act="openRec" data-id="${r.id}"><span class="dot d${r.level}" aria-label="${LEVELS[r.level].name}"></span>
    <span><span class="time">${fmtTime(r.t)}</span> · <b>${LEVELS[r.level].name}</b>${r.rr && r.rr.value ? ` · ${r.rr.value}/min` : ""}<br><span class="meta">${r.type === "diario" ? "Diário" : "Gravação"}${r.retro ? " · adicionado depois" : ""}${syms.length ? " · " + syms.map(k => SYM_ALL[k].t.toLowerCase()).join(", ") : ""}</span></span>
    <span class="row" style="gap:4px;color:var(--ink2)">${S.retornos && S.retornos[r.id] ? `<span style="color:var(--teal-d)" title="Revisado por profissional">${icon("cross", "sm")}</span>` : ""}${r.retro ? icon("calendar", "sm") : ""}${r.hasAudio ? icon("mic", "sm") : ""}${r.followup ? icon("check", "sm") : ""}</span></button>`;
}
function vHistorico() {
  const p = S.profile;
  const all = KR().reverse();
  if (!all.length) return `<h1>Histórico</h1><div class="card" style="text-align:center">${icon("book", "lg")}<h3>Ainda não há registros</h3><p class="muted">Grave a respiração, registre os sintomas de hoje ou adicione um dia anterior para começar o diário${p ? " de " + esc(p.nome) : " da criança"}.</p><div class="stack"><button class="btn ghost block" data-act="startRetro">${icon("calendar", "sm")} Registrar um dia anterior</button><button class="btn block" data-act="startFlow">${icon("mic", "sm")} Gravar respiração</button><button class="btn ghost block" data-act="startDiary">Registrar sintomas</button></div></div>`;
  const f = HF.filter;
  const list = all.filter(r => f === "todos" || (f === "depois" && r.retro) || (f === "gravacao" && r.type === "gravacao") || (f === "diario" && r.type === "diario") || String(r.level) === f);
  const shown = list.slice(0, HF.page);
  let html = "", lm = "", ld = "";
  for (const r of shown) {
    const m = fmtMonth(r.t), d = new Date(r.t).toDateString();
    if (m !== lm) { html += `<div class="tl-month">${m.charAt(0).toUpperCase() + m.slice(1)}</div>`; lm = m; ld = ""; }
    if (d !== ld) { html += `<div class="tl-day">${fmtDay(r.t)}</div>`; ld = d; }
    html += tlItem(r);
  }
  const c30 = all.filter(r => r.t > Date.now() - 30 * 864e5);
  const cnt = l => c30.filter(r => r.level === l).length;
  return `<h1>Histórico${p ? " de " + esc(p.nome) : ""}</h1>
  <div class="kpis"><div class="kpi"><b>${all.length}</b><span>registros no total</span></div><div class="kpi"><b>${c30.length}</b><span>nos últimos 30 dias</span></div></div>
  <div class="card"><h3>Últimos 30 dias</h3>
    <div class="bar" aria-hidden="true">${[0, 1, 2].map(l => cnt(l) ? `<i style="flex:${cnt(l)};background:${["var(--g)", "var(--y)", "var(--r)"][l]}"></i>` : "").join("")}</div>
    <p class="small muted" style="margin:6px 0 0">${cnt(0)} verde · ${cnt(1)} amarelo · ${cnt(2)} vermelho</p></div>
  <div class="card"><h3>Respirações por minuto</h3>${rrChart(KR(), p ? Number(p.age) : 7)}</div>
  <button class="btn ghost block" style="margin-bottom:12px" data-act="startRetro">${icon("calendar", "sm")} Registrar um dia anterior</button>
  <div class="row wrap" style="gap:8px;margin:6px 0 4px">${chips("hist.filter", [["todos", "Todos"], ["2", "Vermelho"], ["1", "Amarelo"], ["0", "Verde"], ["gravacao", "Gravações"], ["diario", "Diário"], ["depois", "Adicionados depois"]], f, false, true)}</div>
  ${html || `<p class="muted">Nenhum registro com esse filtro.</p>`}
  ${list.length > shown.length ? `<button class="btn ghost block" data-act="more">Mostrar mais ${Math.min(40, list.length - shown.length)}</button>` : ""}
  <div class="card" style="margin-top:16px"><div class="row">${icon("chat", "lg")}<div><h3 style="margin:0">Dúvida sobre o histórico?</h3><p class="small muted" style="margin:0">O assistente lê os últimos registros e explica de forma simples.</p></div></div>
    <div class="hr"></div><button class="btn ghost block" data-act="askHistory">Perguntar ao assistente</button></div>
  <button class="btn wa block" data-go="enviar">${icon("send", "sm")} Enviar histórico ao médico</button>`;
}

function vRegistro() {
  const r = S.records.find(x => x.id === SEL);
  if (!r) { setTimeout(() => go("historico")); return ""; }
  const L = LEVELS[r.level]; const rb = reasonsBlock(r);
  const fu = r.followup;
  if (!FU._id || FU._id !== r.id) FU = { _id: r.id, outcome: null, would: null, state: null, sat: null, note: "" };
  const env = r.env || {};
  const envTxt = [env.umid && { seca: "ar muito seco", normal: "umidade normal", umida: "úmido", nsei: "" }[env.umid], env.fumaca === "sim" && "fumaça", env.temp && env.temp + " °C", env.umidPct && env.umidPct + "% de umidade", env.pm25 && "PM2,5 " + env.pm25, env.estacao, env.cidade].filter(Boolean).join(" · ");
  return `<button class="link" data-go="historico">${icon("back", "sm")} Histórico</button>
  <div class="lvl l${r.level}"><span class="tag"><span class="dot d${r.level}"></span> Nível ${L.name}</span><h2 style="margin:6px 0">${L.title}</h2>
    <p class="small" style="margin:0">${fmtDay(r.t)}, ${fmtTime(r.t)} · ${r.type === "diario" ? "registro no diário" : "gravação"}${r.retro ? " · adicionado depois, em " + fmtDate(r.createdAt || r.t) : ""}${r.local ? " · " + r.local : ""}${r.momento ? " · " + { dormindo: "dormindo", calma: "acordada e calma", brincou: "após brincar", chorando: "chorando" }[r.momento] : ""}</p></div>
  <div class="card"><p>${icon("lung", "sm")} ${rrText(r.rr)}</p>
    <p class="small">${[...r.red, ...r.sym].map(k => SYM_ALL[k].t).join(", ") || "Sem sintomas marcados"}</p>
    ${envTxt ? `<p class="small muted" style="margin:0">${icon("sun", "sm")} ${esc(envTxt)}</p>` : ""}
    ${r.hasAudio ? `<div class="hr"></div><audio controls id="recAudio"></audio><p class="small muted" style="margin:0">Áudio de ${r.audio ? Math.round(r.audio.durRaw) : "–"} s, qualidade ${r.audio ? r.audio.quality : "–"}.</p>` : ""}
    <p class="small muted" style="margin:8px 0 0">Preocupação antes: ${r.anxBefore || "–"}/5 · Segurança depois: ${r.secureAfter || "–"}/5</p></div>
  ${S.retornos && S.retornos[r.id] ? (() => { const rt = S.retornos[r.id]; return `<div class="card retorno"><div class="row">${icon("cross", "lg")}<div><h3 style="margin:0">Revisão do profissional de saúde</h3><p class="small muted" style="margin:0">${fmtDate(rt.t)}, ${fmtTime(rt.t)} · classificação: <span class="dot d${rt.esp}"></span> ${LEVELS[rt.esp].name}</p></div></div><p style="margin:10px 0 0;white-space:pre-wrap">${esc(rt.nota)}</p></div>`; })() : ""}
  ${rb.html}${srcList(rb.ids)}
  <div class="card"><h3>O que aconteceu depois?</h3>
  ${fu ? `<p class="small">${{ casa: "Ficou em casa observando", contato: "Falou com o pediatra", consulta: "Foi a uma consulta", ps: "Foi ao pronto-socorro", internacao: "A criança ficou internada" }[fu.outcome] || ""} · criança ${{ melhorou: "melhorou", igual: "está igual", piorou: "piorou" }[fu.state] || ""} · nota ${fu.sat || "–"}/5</p><p class="small muted" style="margin:0">Obrigado por contar. Isso ajuda a medir se o app evita idas desnecessárias ao pronto-socorro e se as orientações são seguras.</p>` : `
    ${chips("fu.outcome", [["casa", "Fiquei em casa observando"], ["contato", "Falei com o pediatra"], ["consulta", "Fui a uma consulta"], ["ps", "Fui ao pronto-socorro"], ["internacao", "Ficou internada"]], FU.outcome)}
    <label class="f">Sem o RespiraKids, você teria ido ao pronto-socorro?</label>${chips("fu.would", [["sim", "Sim"], ["nao", "Não"], ["talvez", "Talvez"]], FU.would)}
    <label class="f">Como a criança está agora?</label>${chips("fu.state", [["melhorou", "Melhorou"], ["igual", "Igual"], ["piorou", "Piorou"]], FU.state)}
    <label class="f">O quanto a orientação ajudou? (1 a 5)</label>${chips("fu.sat", [["1", "1"], ["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"]], FU.sat)}
    <label class="f" for="fuNote">O que podemos melhorar? (opcional)</label><textarea class="f" id="fuNote" data-in="fu.note">${esc(FU.note)}</textarea>
    <button class="btn block" style="margin-top:12px" data-act="saveFU">Salvar resposta</button>`}
  </div>
  ${disclaimer()}
  <div class="stack"><button class="btn wa block" data-act="sendRec" data-id="${r.id}">${icon("send", "sm")} Enviar este registro ao médico</button>
  <button class="btn ghost block" data-act="delRec" data-id="${r.id}">${icon("trash", "sm")} Apagar registro</button></div>`;
}
/* ========== dúvidas (FAQ) ========== */
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function faqMatches() {
  const words = norm(FQ.q).split(/\s+/).filter(w => w.length > 2);
  return FAQ.filter(f => (FQ.tag === "todas" || f.tag === FQ.tag) && (!words.length || words.every(w => norm(f.q + " " + f.a).includes(w))));
}
function faqListHTML() {
  const list = faqMatches();
  if (!list.length) return `<p class="muted">Nada encontrado com essas palavras. Tente outras ou pergunte ao assistente.</p>`;
  return list.map(f => `<details><summary><span class="gtag ${f.tag}">${TAGS[f.tag]}</span><span>${esc(f.q)}</span></summary><div class="ans"><p>${esc(f.a)}</p>${f.src.length ? `<p class="small muted" style="margin:0">Fonte: ${f.src.map(s => esc(SRC[s].split(" (")[0])).join("; ")}</p>` : ""}</div></details>`).join("");
}
function vDuvidas() {
  return `<h1>Dúvidas</h1>
  <div class="card"><div class="row">${icon("chat", "lg")}<div><h3 style="margin:0">Converse com o assistente</h3><p class="small muted" style="margin:0">Respostas simples sobre cuidados do dia a dia, ar seco, hidratação e sinais de alerta.</p></div></div>
    <div class="hr"></div><button class="btn block" data-go="conversa">Abrir conversa</button></div>
  <h2 style="margin-top:20px">Perguntas frequentes</h2>
  <div class="search">${icon("search")}<input type="search" id="faqQ" data-in="faq.q" value="${esc(FQ.q)}" placeholder="Pesquise: febre, chiado, fumaça…" aria-label="Pesquisar perguntas"></div>
  <div style="margin:10px 0">${chips("faq.tag", [["todas", "Todas"], ["casa", "Cuidados em casa"], ["olho", "Fique de olho"], ["urgente", "Procure atendimento"]], FQ.tag, false, true)}</div>
  <div class="faq" id="faqList">${faqListHTML()}</div>
  <div class="card" style="margin-top:18px"><h3>Não encontrou sua pergunta?</h3>
    <p class="small muted">Envie para a equipe do RespiraKids. As perguntas novas ajudam a melhorar esta lista.</p>
    <textarea class="f" id="newQ" placeholder="Escreva sua dúvida"></textarea>
    <button class="btn ghost block" style="margin-top:10px" data-act="newQ">Enviar pergunta</button>
    ${S.questions.length ? `<div class="hr"></div><h3>Suas perguntas</h3>${S.questions.slice().reverse().map(q => `<p class="small"><b>${esc(q.q)}</b><br><span class="muted">${fmtDate(q.t)} · aguardando resposta da equipe</span></p>`).join("")}` : ""}
  </div>
  ${disclaimer()}`;
}

/* ========== chatbot ========== */
const URGENT_RE = /(roxo|roxa|arroxead|nao acorda|desmai|convuls|parou de respirar|pausa|afundand|tiragem|nao consegue respirar|sufoc|engasg)/;
function botIntro() { return `Oi! Sou o assistente de dúvidas do RespiraKids. Posso explicar cuidados do dia a dia, sinais de alerta e o histórico${S.profile ? " de " + S.profile.nome : ""}. Não faço diagnóstico. Em emergência, ligue 192.`; }
function vConversa() {
  const msgs = S.chat.slice(-40);
  const sugg = ["Como contar as respirações?", "O que fazer com o ar seco?", "Explique o último registro", "Quando procurar o pronto-socorro?"];
  return `<button class="link" data-go="duvidas">${icon("back", "sm")} Dúvidas</button>
  <h1>Assistente de dúvidas</h1>
  ${SAMPLE ? "" : `<div class="notice info">${icon("info")}<div>Nesta tela, o assistente responde com as perguntas frequentes do app. Abra o RespiraKids pelo Claude para conversar com respostas personalizadas.</div></div>`}
  <div class="chat" id="chat">
    <div class="msg bot">${esc(botIntro())}</div>
    ${msgs.map(m => `<div class="msg ${m.r === "u" ? "me" : "bot"}">${esc(m.c)}</div>`).join("")}
  </div>
  ${msgs.length < 2 ? `<div class="chips" style="margin-top:12px">${sugg.map(s => `<button class="chip" data-act="ask" data-q="${esc(s)}">${s}</button>`).join("")}</div>` : ""}
  <div class="composer"><input class="f" id="chatIn" placeholder="Escreva sua dúvida" aria-label="Sua dúvida" enterkeyhint="send"><button class="btn" data-act="ask" aria-label="Enviar">${icon("send", "sm")}</button></div>
  ${msgs.length ? `<button class="link small" data-act="clearChat">Limpar conversa</button>` : ""}
  ${disclaimer()}`;
}
function localAnswer(q) {
  const w = norm(q).split(/\W+/).filter(x => x.length > 3);
  let best = null, bs = 0;
  for (const f of FAQ) { const t = norm(f.q + " " + f.a); const s = w.reduce((a, x) => a + (t.includes(x) ? 1 : 0), 0); if (s > bs) { bs = s; best = f; } }
  const kr = KR(); if (/ultimo registro|historico/.test(norm(q)) && kr.length) { const r = kr[kr.length - 1]; return `O último registro (${fmtDate(r.t)}, ${fmtTime(r.t)}) ficou no nível ${LEVELS[r.level].name}: ${LEVELS[r.level].title.toLowerCase()}. ${r.reasons[0].t} Toque nele no Histórico para ver o que fazer e as fontes.`; }
  if (!best || bs < 1) return "Não encontrei uma resposta pronta para isso. Você pode enviar a pergunta para a equipe na aba Dúvidas ou falar com o pediatra. Se notar algum sinal de alerta, procure atendimento.";
  return `${best.a}\n\nFonte: ${best.src.length ? best.src.map(s => SRC[s].split(" (")[0]).join("; ") : "equipe RespiraKids"}.`;
}
function botPrompt() {
  const p = S.profile || {};
  const recs = KR().slice(-8).map(r => `- ${fmtDate(r.t)} ${fmtTime(r.t)}: nível ${LEVELS[r.level].name}; ${r.rr && r.rr.value ? r.rr.value + " resp/min (" + (r.rr.source === "manual" ? "contadas" : "áudio") + ")" : "sem contagem"}; sintomas: ${[...r.red, ...r.sym].map(k => SYM_ALL[k].t).join(", ") || "nenhum"}; ar: ${(r.env && r.env.umid) || "?"}, fumaça ${(r.env && r.env.fumaca) || "?"}`).join("\n") || "nenhum";
  const conv = S.chat.slice(-10).map(m => (m.r === "u" ? "Responsável: " : "Assistente: ") + m.c).join("\n");
  return `Você é o assistente de dúvidas do aplicativo RespiraKids, que apoia pais, avós, babás e cuidadores de crianças com tosse, chiado ou respiração afobada, principalmente em tempo seco e com fumaça de queimadas.
Regras:
- Responda em português do Brasil, com palavras simples e frases curtas, em no máximo 130 palavras. Sem markdown, sem listas longas.
- Não faça diagnóstico. Não indique remédios nem doses; remédios só como o pediatra orientou.
- Se a mensagem descrever sinal de gravidade (costelas ou pescoço afundando, barulho rouco ao puxar o ar, pausas na respiração, lábios roxos, não consegue falar ou beber, muito sonolenta, convulsão, respiração muito rápida), comece dizendo para procurar atendimento agora ou ligar 192.
- Seja equilibrado: não alarme sem motivo e não minimize sintomas.
- Baseie-se em: AIDPI/Ministério da Saúde, OMS, Sociedade Brasileira de Pediatria, GINA, BTS/SIGN e AHA/PALS. Termine com uma linha "Fonte: ..." citando 1 ou 2 delas.
Referências de frequência respiratória em repouso: 1–2 anos 22–37/min; 3–5 anos 20–28; 6–11 anos 18–25. Em maiores de 5 anos, acima de 30/min é sinal de alerta e 40 ou mais pede atendimento.
Perguntas frequentes do app (use como base):
${FAQ.map(f => "* " + f.q + " " + f.a).join("\n")}
Criança (sem nome): idade ${p.age !== undefined && p.age !== "" ? ageLabel(p.age) : "não informada"}; diagnósticos: ${(p.cond || []).join(", ") || "nenhum informado"}; remédios contínuos: ${p.meds || "nenhum informado"}; orientações do pediatra: ${p.pedNotes || "nenhuma informada"}.
Últimos registros:
${recs}
Conversa até agora:
${conv}
Responda à última mensagem do responsável.`;
}
async function ask(q) {
  q = (q || "").trim(); if (!q) return;
  S.chat.push({ r: "u", c: q, t: Date.now() }); log("pergunta_assistente", q.slice(0, 60));
  const urgent = URGENT_RE.test(norm(q));
  if (urgent) S.chat.push({ r: "b", c: "Isso pode ser um sinal de alerta. Se a criança está com lábios roxos, pausas na respiração, convulsão, costelas afundando ou muito difícil de acordar, ligue 192 agora ou vá ao pronto-atendimento.", t: Date.now() });
  save(); render();
  const chat = $("#chat"); const el = document.createElement("div"); el.className = "msg bot"; el.textContent = "Pensando…"; chat.appendChild(el); el.scrollIntoView({ block: "end" });
  let answer = "";
  if (SAMPLE) {
    try { const r = await SAMPLE(botPrompt(), { cache: false, onText: ({ text }) => { el.textContent = text; } }); answer = r.text; }
    catch (e) { answer = e.text || localAnswer(q); if (e.code === "rate_limited") answer = "Muitas perguntas seguidas. Espere um pouco e tente de novo.\n\n" + localAnswer(q); }
  } else answer = localAnswer(q);
  el.textContent = answer;
  S.chat.push({ r: "b", c: answer, t: Date.now() }); if (S.chat.length > 80) S.chat.splice(0, S.chat.length - 80); save();
}

/* ========== enviar ao médico (WhatsApp) ========== */
function waNumber(n) { let d = String(n || "").replace(/\D/g, ""); if (d.length >= 10 && d.length <= 11) d = "55" + d; return d; }
const LV_EMOJI = ["🟢", "🟡", "🔴"];
function reportRecords() {
  if (SD.range === "um") return S.records.filter(r => r.id === SEL);
  if (SD.range === "ultimo") return KR().slice(-1);
  const days = Number(SD.range); return KR().filter(r => r.t > Date.now() - days * 864e5);
}
function reportText() {
  const p = S.profile || {}; const recs = reportRecords();
  const lines = recs.slice(-15).map(r => `${LV_EMOJI[r.level]} ${fmtDate(r.t)} ${fmtTime(r.t)} – ${LEVELS[r.level].name}${r.retro ? " (adicionado depois)" : ""}${r.rr && r.rr.value ? ` – ${r.rr.value} resp/min (${r.rr.source === "manual" ? "contadas" : "áudio"})` : ""}${[...r.red, ...r.sym].length ? " – " + [...r.red, ...r.sym].map(k => SYM_ALL[k].t.toLowerCase()).join(", ") : ""}${r.env && r.env.umid === "seca" ? " – ar seco" : ""}${r.env && r.env.fumaca === "sim" ? " – fumaça" : ""}`);
  recs.sort((a, b) => b.t - a.t);
  const lastA = recs.find(r => r.hasAudio);
  const range = { um: "registro selecionado", ultimo: "último registro", 7: "últimos 7 dias", 30: "últimos 30 dias" }[SD.range];
  return `*RespiraKids – relatório respiratório*
Criança: ${p.nome || "–"}, ${p.age !== undefined && p.age !== "" ? ageLabel(p.age) : "idade não informada"}
Diagnósticos: ${(p.cond || []).filter(c => c !== "nenhum").join(", ") || "nenhum informado"}
Remédios contínuos: ${p.meds || "nenhum informado"}
Período: ${range} (${recs.length} registro${recs.length === 1 ? "" : "s"})

${lines.join("\n") || "Sem registros no período."}
${recs.length > 15 ? `\n(+${recs.length - 15} registros anteriores no app)` : ""}
${lastA ? `\nÁudio mais recente: ${fmtDate(lastA.t)} ${fmtTime(lastA.t)}, ${Math.round(lastA.audio.durRaw)} s (enviado à parte).` : ""}
Enviado por ${p.resp || "responsável"}. A orientação do app é triagem, não diagnóstico.`;
}
function vEnviar() {
  const p = S.profile || {};
  if (!SD._init) { SD.to = p.pedNum ? "pediatra" : p.emNum ? "emergencia" : "outro"; SD.num = p.pedNum || p.emNum || ""; SD._init = true; }
  if (SEL && SD._fromRec) SD.range = "um";
  const n = waNumber(SD.num);
  const href = `https://wa.me/${n}?text=${encodeURIComponent(reportText())}`;
  const recs = reportRecords(); const hasA = recs.some(r => r.hasAudio);
  return `<button class="link" data-act="back">${icon("back", "sm")} Voltar</button>
  <h1>Enviar para o médico</h1>
  <p class="muted">Monte um resumo do histórico e envie pelo WhatsApp para o pediatra ou para um contato de confiança.</p>
  <div class="card">
    <label class="f" style="margin-top:0">Para quem?</label>
    ${chips("send.to", [["pediatra", "Pediatra"], ["emergencia", "Contato de confiança"], ["outro", "Outro número"]], SD.to, false, true)}
    <label class="f" for="sdNum">Número do WhatsApp (com DDD)</label>
    <input class="f" id="sdNum" type="tel" inputmode="tel" data-in="send.num" value="${esc(SD.num)}" placeholder="(61) 99999-9999">
    <label class="f">O que enviar?</label>
    ${chips("send.range", (SEL && SD._fromRec ? [["um", "Este registro"]] : []).concat([["ultimo", "Último registro"], ["7", "Últimos 7 dias"], ["30", "Últimos 30 dias"]]), SD.range, false, true)}
  </div>
  <div class="card"><h3>Prévia da mensagem</h3><pre class="small" style="white-space:pre-wrap;font-family:var(--sans);margin:0" id="preview">${esc(reportText())}</pre></div>
  <div class="stack">
    <a class="btn wa block" id="waLink" href="${n.length >= 12 ? href : "#"}" target="_blank" rel="noopener" data-act="waOpen" ${n.length >= 12 ? "" : 'aria-disabled="true"'}>${icon("send", "sm")} Abrir WhatsApp com o relatório</a>
    ${hasA ? `<button class="btn ghost block" data-act="shareFiles">${icon("upload", "sm")} Compartilhar áudio e relatório</button>
    <button class="btn ghost block" data-act="saveZip">${icon("download", "sm")} Salvar pacote com áudio (.zip)</button>` : `<p class="small muted">Nenhum áudio no período escolhido. Só o texto será enviado.</p>`}
  </div>
  ${hasA ? `<div class="card" style="margin-top:14px"><h3>Como mandar o áudio</h3><ol class="acts small"><li>Toque em “Abrir WhatsApp com o relatório” e envie o texto.</li><li>Volte e toque em “Compartilhar áudio e relatório”, escolha o WhatsApp e a mesma conversa.</li><li>Se o compartilhar não abrir, salve o pacote .zip e anexe no WhatsApp pelo clipe › Documento.</li></ol></div>` : ""}`;
}
async function audioFilesFor(recs) {
  const out = [];
  for (const r of recs.filter(r => r.hasAudio).slice(-5)) { const b = await getAudio(r.id); if (b) out.push({ name: `respiracao_${new Date(r.t).toISOString().slice(0, 16).replace(/[T:]/g, "-")}.wav`, blob: b }); }
  return out;
}
async function saveFile(name, data) {
  if (DL) { try { await DL.save({ filename: name, data }); toast("Arquivo salvo."); log("arquivo_salvo", name); } catch (e) { if (e.code !== "declined") toast("Não foi possível salvar o arquivo aqui."); } return; }
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(data instanceof Blob ? data : new Blob([data])); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { toast("Salvar arquivos não está disponível nesta tela."); }
}

/* ========== mais ========== */
function vMais() {
  const p = S.profile;
  return `<h1>Mais</h1>
  <div class="card"><div class="row between"><h3 style="margin:0">Crianças acompanhadas</h3><button class="link" data-go="criancas">Gerenciar</button></div>
    ${S.kids.length ? S.kids.map(k => `<p class="row" style="margin:8px 0 0"><span class="kdot" style="background:${k.color || "var(--teal)"}"></span><b>${esc(k.nome)}</b><span class="small muted">${ageLabel(k.age)}${(k.cond || []).filter(c => c !== "nenhum").length ? " · " + k.cond.filter(c => c !== "nenhum").join(", ") : ""}</span></p>`).join("") : `<p class="small muted">Nenhuma criança cadastrada ainda.</p>`}
    <div class="hr"></div><button class="btn ghost block" data-act="addKid">${icon("plus", "sm")} Adicionar outra criança</button></div>
  <div class="card stack">
    <button class="btn ghost block" data-go="medicos">${icon("cross", "sm")} Meus médicos${ctPendentes() ? ` <span class="demo">${ctPendentes()} novo${ctPendentes() > 1 ? "s" : ""}</span>` : ""}</button>
    <button class="btn ghost block" data-go="enviar">${icon("send", "sm")} Enviar relatório ao médico</button>
    <button class="btn ghost block" data-go="sintomas">${icon("heart", "sm")} Guia de sintomas</button>
    <button class="btn ghost block" data-go="conta">${icon("user", "sm")} Minha conta</button>
    ${CLOUD.admin ? `<a class="btn ghost block" href="#medico">${icon("cross", "sm")} App clínico</a>` : ""}
    ${CLOUD.isAdmin ? `<button class="btn ghost block" data-go="equipe">${icon("db", "sm")} Monitoramento (equipe técnica)</button>` : ""}
  </div>
  <details class="more"><summary>Privacidade e meus dados</summary><div class="card stack">
    <p class="small" style="margin:0">${icon("db", "sm")} <span id="syncTxt">${syncText()}</span></p>
    ${CLOUD.ready ? `<button class="btn ghost block" data-act="toggleCloud">${S.consent && S.consent.cloud ? "Parar de compartilhar e apagar do banco" : "Guardar no banco e compartilhar com profissionais"}</button>` : ""}
    <p class="small" style="margin:0">Termo versão ${S.consent ? S.consent.version : "–"} aceito em ${S.consent ? fmtDay(S.consent.t) + ", " + fmtTime(S.consent.t) : "–"}. Pesquisa anônima: ${S.consent && S.consent.research ? "autorizada" : "não autorizada"}.</p>
    <button class="btn ghost block" data-go="termos">Rever o termo de consentimento</button>
    <button class="btn ghost block" data-act="exportJson">${icon("download", "sm")} Exportar meus dados</button>
    <button class="btn ghost block" data-act="wipe" style="color:var(--r)">${icon("trash", "sm")} Apagar tudo e retirar consentimento</button>
  </div></details>
  <details class="more"><summary>Fontes médicas</summary><div class="card"><ol class="small muted" style="padding-left:1.3em;margin:0">${Object.keys(SRC).map(k => `<li style="margin-bottom:6px">${esc(SRC[k])}</li>`).join("")}</ol></div></details>
  ${disclaimer()}
  <p class="small muted">RespiraKids · MVP versão ${APP_VERSION}.</p>`;
}

/* ========== dados de exemplo (fictícios) para os painéis ========== */
function demoData() {
  if (demoData.c) return demoData.c;
  const now = Date.now(), H = 36e5;
  const kids = [
    { id: "demo1", nome: "Criança A", age: 7, cond: ["asma"], meds: "Bombinha de manutenção 2x ao dia", pedNotes: "Plano de ação para crise de asma", demo: true },
    { id: "demo2", nome: "Criança B", age: 5, cond: [], meds: "", pedNotes: "", demo: true },
    { id: "demo3", nome: "Criança C", age: 9, cond: ["rinite"], meds: "Spray nasal", pedNotes: "Lavagem nasal diária", demo: true }
  ];
  const plan = {
    demo1: [[0, 22, ["tosse"]], [0, 24, ["tosse"]], [1, 29, ["tosse", "chiado"]], [1, 33, ["tosse"]], [2, 42, ["chiado", "cansaco"], ["tiragem"]], [1, 30, ["tosse", "chiado"]], [0, 24, ["tosse"]], [0, 22, []], [1, 31, ["tosse"]], [0, 23, []]],
    demo2: [[0, 24, ["coriza"]], [0, 25, ["coriza", "tosse"]], [0, 22, []], [1, 34, ["febre", "tosse"]], [0, 26, ["tosse"]], [0, 23, []]],
    demo3: [[0, 20, ["coriza"]], [1, 27, ["tosse", "quieto"]], [0, 19, ["coriza"]], [0, 21, []], [0, 22, ["tosse"]], [1, 24, ["chiado"]], [0, 20, []], [0, 21, ["coriza"]]]
  };
  const expertMap = { "demo1-2": 1, "demo1-3": 1, "demo1-4": 2, "demo1-5": 1, "demo1-8": 1, "demo1-0": 0, "demo2-3": 1, "demo2-0": 0, "demo2-4": 0, "demo3-1": 1, "demo3-5": 0, "demo3-0": 0, "demo3-2": 0 };
  const recs = [];
  for (const k of kids) plan[k.id].forEach((p, i, arr) => {
    const t = now - (arr.length - i) * 2.3 * 24 * H - (i * 5 % 9) * H;
    const id = k.id + "-" + i;
    recs.push({ id, kid: k.id, demo: true, t, type: i % 3 === 2 ? "diario" : "gravacao", level: p[0], rr: { value: p[1], source: i % 2 ? "manual" : "audio", conf: "media" }, sym: p[2], red: p[3] || [], env: { umid: i % 2 ? "seca" : "normal", fumaca: i === 4 ? "sim" : "nao" }, anxBefore: 2 + p[0] + (i % 2), secureAfter: Math.max(2, 5 - p[0] - (i % 2)), hasAudio: false, audio: i % 3 === 2 ? null : { quality: i % 4 ? "boa" : "aceitável", conf: i % 3 ? "media" : "alta", durRaw: 19 },
      expertDemo: expertMap[id], followup: i % 2 === 0 ? { outcome: p[0] === 2 ? "ps" : p[0] === 1 ? "contato" : "casa", would: p[0] >= 1 ? "sim" : i % 4 ? "nao" : "talvez", state: "melhorou", sat: 4 + (i % 2) } : null, reasons: [] });
  });
  return demoData.c = { kids, recs };
}
function allKidsRecs(includeDemo) {
  const kids = [], recs = [];
  S.kids.forEach(k => kids.push(Object.assign({ local: true }, k))); S.records.forEach(r => recs.push(Object.assign({}, r)));
  if (includeDemo) { const d = demoData(); kids.push(...d.kids); recs.push(...d.recs); }
  return { kids, recs };
}
const expertOf = r => (S.expert[r.id] && S.expert[r.id].lvl !== undefined) ? S.expert[r.id].lvl : r.expertDemo;

/* ========== painel da equipe técnica ========== */
const EQ = { src: "db" };
function vEquipe() {
  const useDb = CLOUD.ready && CLOUD.admin && EQ.src === "db";
  if (useDb) subMed();
  let recs, ev, cnt;
  if (useDb) {
    const fams = MD.fams || [];
    recs = fams.flatMap(f => (f.resumo || []).map(r => Object.assign({}, r, { kid: f.uid })));
    if (S.settings.demo) recs.push(...demoData().recs);
    ev = fams.flatMap(f => (f.uso && f.uso.ult) || []).sort((a, b) => a.t - b.t);
    cnt = t => fams.reduce((a, f) => a + ((f.uso && f.uso.cont && f.uso.cont[t]) || 0), 0);
  } else { recs = allKidsRecs(S.settings.demo).recs; ev = S.events; cnt = t => ev.filter(e => e.type === t).length; }
  const fams = MD.fams || [];
  const dbCard = `<div class="card"><div class="row">${icon("db", "lg")}<div><h3 style="margin:0">Banco de dados</h3><p class="small muted" style="margin:0" id="syncTxt">${syncText()}</p></div></div>
    ${CLOUD.ready && CLOUD.admin ? `<div class="chips" style="margin-top:12px">${[["db", "Todas as famílias (banco)"], ["local", "Só este aparelho"]].map(([v, l]) => `<button class="chip" data-act="eqSrc" data-v="${v}" aria-pressed="${EQ.src === v}">${l}</button>`).join("")}</div>
    ${useDb ? `<div class="kpis" style="margin:12px 0 0"><div class="kpi"><b>${fams.length}</b><span>famílias no banco</span></div><div class="kpi"><b>${fams.reduce((a, f) => a + (f.total || 0), 0)}</b><span>registros no banco</span></div><div class="kpi"><b>${fams.reduce((a, f) => a + (f.resumo || []).filter(r => r.hasAudio).length, 0)}</b><span>áudios guardados</span></div><div class="kpi"><b>${Object.keys(MD.vals).length}</b><span>validações de especialistas</span></div><div class="kpi"><b>${fams.filter(f => f.atualizado > Date.now() - 864e5).length}</b><span>famílias ativas em 24 h</span></div></div>` : ""}` : `<p class="small muted" style="margin:10px 0 0">${CLOUD.ready ? "Para ver os dados de todas as famílias, a conta precisa de acesso de Editor." : ""} Último envio deste aparelho: ${CLOUD.last ? fmtTime(CLOUD.last) : "–"}.</p>`}</div>`;
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : "–";
  const grav = recs.filter(r => r.type === "gravacao");
  const good = grav.filter(r => r.audio && r.audio.quality === "boa").length;
  const fus = recs.filter(r => r.followup);
  const avoided = fus.filter(r => r.followup.would === "sim" && ["casa", "contato", "consulta"].includes(r.followup.outcome)).length;
  const psVisits = fus.filter(r => ["ps", "internacao"].includes(r.followup.outcome)).length;
  const better = fus.filter(r => r.followup.state === "melhorou").length;
  let bytes = 0; try { bytes = (localStorage.getItem(LS_KEY) || "").length; } catch (e) { }
  const funnel = [["Termo aceito", cnt("consentimento")], ["Perfil criado", cnt("cadastro")], ["Clique em gravar", cnt("clique_gravar")], ["Microfone liberado", cnt("microfone_liberado")], ["Áudio analisado", cnt("audio_analisado")], ["Orientação exibida", cnt("resultado")]];
  const fmax = Math.max(1, ...funnel.map(f => f[1]));
  const lv = [0, 1, 2].map(l => recs.filter(r => r.level === l).length);
  const confs = ["alta", "media", "baixa"].map(c => grav.filter(r => r.audio && r.audio.conf === c).length);
  return `<button class="link" data-go="mais">${icon("back", "sm")} Mais</button>
  <h1>Monitoramento de dados</h1>
  <p class="muted">Para a equipe técnica acompanhar fluxo de dados, acessos e registros do sistema.</p>
  ${dbCard}
  <label class="check"><input type="checkbox" data-act="toggleDemo" ${S.settings.demo ? "checked" : ""}> <span>Incluir dados de exemplo</span></label>
  <div class="kpis">
    <div class="kpi"><b>${recs.length}</b><span>registros</span></div>
    <div class="kpi"><b>${grav.length}</b><span>gravações</span></div>
    <div class="kpi"><b>${grav.length ? Math.round(good / grav.length * 100) + "%" : "–"}</b><span>áudios com qualidade boa</span></div>
    <div class="kpi"><b>${cnt("microfone_negado")}</b><span>microfone negado</span></div>
    <div class="kpi"><b>${cnt("regravacao")}</b><span>regravações</span></div>
    <div class="kpi"><b>${cnt("pergunta_assistente")}</b><span>perguntas ao assistente</span></div>
    <div class="kpi"><b>${(bytes / 1024).toFixed(0)} KB</b><span>armazenamento local</span></div>
  </div>
  <div class="cols" style="grid-template-columns:1fr">
  <div class="card"><h3>Impacto e satisfação</h3>
    <div class="kpis" style="margin:0">
      <div class="kpi"><b>${avg(recs.map(r => r.anxBefore).filter(Boolean))}</b><span>preocupação antes (1–5)</span></div>
      <div class="kpi"><b>${avg(recs.map(r => r.secureAfter).filter(Boolean))}</b><span>segurança depois (1–5)</span></div>
      <div class="kpi"><b>${avoided}</b><span>idas ao PS evitadas (relato dos pais)</span></div>
      <div class="kpi"><b>${psVisits}</b><span>idas ao PS ou internações</span></div>
      <div class="kpi"><b>${fus.length ? Math.round(better / fus.length * 100) + "%" : "–"}</b><span>crianças que melhoraram</span></div>
      <div class="kpi"><b>${avg(fus.map(r => Number(r.followup.sat)).filter(Boolean))}</b><span>satisfação média (1–5)</span></div>
    </div>
    <p class="small muted" style="margin:10px 0 0">“Idas evitadas”: acompanhamentos em que o responsável diz que teria ido ao pronto-socorro sem o app e acabou cuidando em casa ou com o pediatra. ${fus.length} acompanhamentos respondidos de ${recs.length} registros.</p></div>
  <div class="card"><h3>Funil de uso (${useDb ? "todas as famílias" : "este aparelho"})</h3>${funnel.map(([l, v]) => `<div class="row small" style="margin-bottom:6px"><span style="width:150px;flex:none">${l}</span><div class="bar" style="flex:1"><i style="width:${v / fmax * 100}%;background:var(--teal-d);display:block"></i></div><b style="width:32px;text-align:right">${v}</b></div>`).join("")}</div>
  <div class="card"><h3>Níveis de alerta e confiança do áudio</h3>
    <div class="bar">${lv.map((v, l) => v ? `<i style="flex:${v};background:${["var(--g)", "var(--y)", "var(--r)"][l]}"></i>` : "").join("")}</div>
    <p class="small muted">${lv[0]} verde · ${lv[1]} amarelo · ${lv[2]} vermelho</p>
    <p class="small">Confiança da contagem pelo áudio: ${confs[0]} alta · ${confs[1]} média · ${confs[2]} baixa</p></div>
  </div>
  <div class="row between" style="margin-top:8px"><h3 style="margin:0">Registro de eventos</h3><span class="small muted">últimos 60</span></div>
  <div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>Quando</th><th>Evento</th><th>Detalhe</th></tr></thead><tbody>
  ${ev.slice(-60).reverse().map(e => `<tr><td>${fmtDate(e.t)} ${fmtTime(e.t)}</td><td>${esc(e.type)}</td><td>${esc(e.detail)}</td></tr>`).join("") || `<tr><td colspan="3">Nenhum evento ainda.</td></tr>`}
  </tbody></table></div>
  <div class="grid2" style="margin-top:14px"><button class="btn ghost" data-act="csvRecs">${icon("download", "sm")} Registros (.csv)</button><button class="btn ghost" data-act="csvEvents">${icon("download", "sm")} Eventos (.csv)</button></div>`;
}

/* ========== roteador ========== */
const VIEWS = { criancas: vCriancas, termos: vTermos, inicio: vInicio, cadastro: vCadastro, gravar: vGravar, sintomas: vSintomas, historico: vHistorico, registro: vRegistro, duvidas: vDuvidas, conversa: vConversa, enviar: vEnviar, mais: vMais, equipe: vEquipe, medico: vMedico };
const TABS = [["inicio", "home", "Início"], ["sintomas", "heart", "Sintomas"], ["historico", "clock", "Histórico"], ["duvidas", "chat", "Dúvidas"], ["mais", "dots", "Mais"]];
const TAB_OF = { criancas: "mais", registro: "historico", conversa: "duvidas", enviar: "mais", equipe: "mais", clinico: "mais", cadastro: "mais", gravar: "inicio" };
function render() {
  if (__stopped || !document.getElementById("app")) return;
  let v = (location.hash || "#inicio").slice(1);
  if (v === "clinico") v = "medico";
  if (!["medico", "hospital", "conta"].includes(v) && (!S.consent || S.consent.version !== APP_VERSION)) v = "termos";
  if (!VIEWS[v]) v = "inicio";
  if (v === "gravar" && !F) newFlow();
  if (CUR === "gravar" && v !== "gravar") closeMic();
  const changed = CUR !== v; CUR = v;
  document.body.classList.toggle("wide", v === "equipe");
  document.body.classList.toggle("medico", v === "medico" || v === "hospital");
  document.title = v === "medico" ? "RespiraKids Clínico" : "RespiraKids";
  document.body.classList.toggle("no-tabs", v === "termos" || v === "gravar" || (v === "conta" && (CLOUD.role || "familia") !== "familia"));
  const tab = TAB_OF[v] || v;
  $("#tabbar").innerHTML = TABS.map(([id, ic, l]) => `<a href="#${id}" ${tab === id ? 'aria-current="page"' : ""}>${icon(ic)}<span>${l}</span></a>`).join("");
  const chip = $("#childChip"); if (S.profile && v !== "termos") { chip.hidden = false; chip.innerHTML = `<span class="kdot" style="background:${S.profile.color || "var(--teal)"}"></span>${esc(S.profile.nome)}, ${ageLabel(S.profile.age)} ${S.kids.length > 1 ? "▾" : "+"}`; chip.setAttribute("aria-label", `Criança: ${S.profile.nome}. Toque para trocar ou adicionar criança`); } else chip.hidden = true;
  $("#app").innerHTML = VIEWS[v]();
  afterRender(v);
  if (changed) { window.scrollTo(0, 0); $("#app").focus({ preventScroll: true }); }
}
function afterRender(v) {
  if (v === "gravar" && F.step === "ouvir" && F.audio) drawSpec($("#specCanvas"), F.audio.an.spec);
  if (v === "gravar" && F.step === "rec" && R.stream && !R.an) { /* microfone já fechado */ }
  if (v === "registro") { const r = S.records.find(x => x.id === SEL); if (r && r.hasAudio) getAudio(r.id).then(b => { const a = $("#recAudio"); if (b && a) a.src = URL.createObjectURL(b); }); }
  if (v === "medico") medAfter();
  if (v === "conversa") { const c = $("#chat"); if (c && c.lastElementChild) c.lastElementChild.scrollIntoView({ block: "end" }); }
}
__on(window, "hashchange", render);
/* ========== RespiraKids Clínico: app de análise médica ========== */
const MED = { tab: "fila", fam: null, rec: null, period: "7", pend: false, demo: false, form: {} };
function medData() {
  const kids = [], recs = [];
  (MD.fams || []).forEach(f => {
    const list = f.criancas && f.criancas.length ? f.criancas : f.perfil ? [Object.assign({ id: "_" }, f.perfil)] : [];
    if (!list.length) return;
    const first = list[0].id, cid = k => f.uid + "~" + (k || first);
    list.forEach(k => kids.push(Object.assign({}, k, { id: cid(k.id), fam: f.uid, uso: f.uso, total: f.total || 0, atualizado: f.atualizado, account: f.uid })));
    (f.resumo || []).forEach(r => recs.push(Object.assign({}, r, { kid: cid(r.kid && list.some(k => k.id === r.kid) ? r.kid : first), fam: f.uid })));
  });
  if (MED.demo) { const d = demoData(); kids.push(...d.kids); recs.push(...d.recs); }
  return { kids, recs };
}
const valOf = r => r.demo ? (r.expertDemo !== undefined ? { esp: r.expertDemo, demo: true } : null) : MD.vals[(r.fam || r.kid) + "|" + r.id] || null;
const agoTxt = t => { const m = Math.round((Date.now() - t) / 6e4); return m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.round(m / 60)} h` : `há ${Math.round(m / 1440)} d`; };
const symTxt = r => [...(r.red || []), ...(r.sym || [])].map(k => SYM_ALL[k] ? SYM_ALL[k].t.toLowerCase() : k).join(", ");

function medShell(inner) {
  const novos = ctPendentes();
  const tabs = [["fila", "Fila de avaliação"], ["criancas", "Crianças"], ...(CLOUD.role === "medico" ? [["vinculos", `Meus pacientes${novos ? ` (${novos} novo${novos > 1 ? "s" : ""})` : ""}`]] : []), ["validacao", "Validação"]];
  return `<header class="medhead"><img src="${LOGO}" alt=""><div><b class="brand">RespiraKids Clínico</b><br><span class="small muted">Análise médica · versão ${APP_VERSION}</span></div>
    ${CLOUD.ready ? `<span class="small muted" style="margin-left:auto;text-align:right"><span data-uid="${CLOUD.uid}">Profissional</span><br><a href="#conta" class="small">Minha conta</a> · <a href="#inicio" class="small">App das famílias</a></span>` : ""}</header>
    ${CLOUD.ready && CLOUD.admin ? `<nav class="medtabs" aria-label="Seções do app clínico">${tabs.map(([k, l]) => `<button class="chip" data-act="medTab" data-k="${k}" aria-pressed="${MED.tab === k}">${l}</button>`).join("")}</nav>` : ""}
    ${inner}`;
}
function vMedico() {
  if (!CLOUD.tried) return medShell(`<div class="card" style="text-align:center"><div class="spinner"></div><p>Conectando ao banco de dados…</p></div>`);
  if (!CLOUD.ready) return medShell(`<div class="card"><h2>Banco de dados indisponível</h2><p>O app clínico lê os registros direto do banco de dados do RespiraKids. Abra este link pelo Claude, conectado à conta que recebeu acesso de profissional.</p></div>`);
  if (!CLOUD.admin) return medShell(`<div class="card"><h2>Acesso restrito a médicos</h2><p>Esta área é para médicos. Se você é médico(a), mude o tipo da sua conta para <b>Médico(a)</b> (com CRM) em Minha conta. Depois, vincule-se às famílias por código ou convite.</p><p class="small muted">As famílias usam o app principal e cada uma só vê os próprios registros. Cada médico vê só as famílias vinculadas a ele.</p><div class="row wrap"><a class="btn" href="#conta">Minha conta</a><a class="btn ghost" href="#inicio">Ir para o app das famílias</a></div></div>`);
  subMed();
  if (!MD.fams) return medShell(`<div class="card" style="text-align:center"><div class="spinner"></div><p>Carregando registros das famílias…</p></div>`);
  const note = MD.timeout ? `<div class="notice y">${icon("alert")}<div>O banco está demorando para responder. Os dados podem estar desatualizados.</div></div>` : "";
  const body = MED.tab === "criancas" ? medCriancas() : MED.tab === "validacao" ? medValidacao() : MED.tab === "vinculos" ? medVinculos() : medFila();
  return medShell(note + body);
}
function demoToggle() { return `<label class="check"><input type="checkbox" data-act="medDemo" ${MED.demo ? "checked" : ""}> <span>Incluir crianças de exemplo <span class="demo">fictícias</span></span></label>`; }

/* fila de prioridade */
function medFila() {
  const { kids, recs } = medData(); const nm = Object.fromEntries(kids.map(k => [k.id, k]));
  const lim = MED.period === "todos" ? 0 : Date.now() - Number(MED.period) * 864e5;
  const list = recs.filter(r => r.t >= lim && (!MED.pend || !valOf(r))).sort((a, b) => (!!valOf(a) - !!valOf(b)) || (b.level - a.level) || (b.t - a.t));
  const d24 = recs.filter(r => r.t > Date.now() - 864e5);
  return `<div class="kpis">
      <div class="kpi"><b>${kids.length}</b><span>crianças no banco</span></div>
      <div class="kpi" style="${d24.some(r => r.level === 2) ? "border-color:var(--r);background:var(--r-bg)" : ""}"><b>${d24.filter(r => r.level === 2).length}</b><span>vermelhos nas últimas 24 h</span></div>
      <div class="kpi"><b>${d24.filter(r => r.level === 1).length}</b><span>amarelos nas últimas 24 h</span></div>
      <div class="kpi"><b>${recs.filter(r => !valOf(r)).length}</b><span>registros sem validação</span></div></div>
    <div class="row wrap" style="gap:8px">${[["1", "24 h"], ["7", "7 dias"], ["30", "30 dias"], ["todos", "Tudo"]].map(([v, l]) => `<button class="chip" data-act="medPeriod" data-v="${v}" aria-pressed="${MED.period === v}">${l}</button>`).join("")}
      <button class="chip" data-act="medPend" aria-pressed="${MED.pend}">Só sem validação</button></div>
    ${demoToggle()}
    <p class="small muted">Ordem: primeiro os não validados, do vermelho para o verde, mais recentes antes.</p>
    ${list.length ? list.slice(0, 120).map(r => { const k = nm[r.kid] || {}; const v = valOf(r); return `<button class="tl-item" data-act="medOpen" data-fam="${r.kid}" data-id="${r.id}"><span class="dot d${r.level}"></span>
      <span><b>${esc(k.nome || "Criança")}</b>, ${ageLabel(k.age)} · <b>${LEVELS[r.level].name}</b>${r.rr && r.rr.value ? ` · ${r.rr.value}/min` : ""}${r.demo ? ' <span class="demo">exemplo</span>' : ""}<br><span class="meta">${agoTxt(r.t)} · ${symTxt(r) || "sem sintomas marcados"}</span></span>
      <span class="small" style="text-align:right">${v ? `<span class="dot d${v.esp}"></span> validado` : "avaliar"}</span></button>`; }).join("") : `<div class="card"><p class="muted" style="margin:0">Nenhum registro neste período. Quando as famílias gravarem, eles aparecem aqui na hora.</p></div>`}`;
}

/* crianças e registro */
function medCriancas() {
  const { kids, recs } = medData();
  if (!kids.length) return `${demoToggle()}<div class="card"><p class="muted" style="margin:0">Nenhuma família compartilhou dados ainda.</p></div>`;
  if (!MED.fam || !kids.find(k => k.id === MED.fam)) MED.fam = kids[0].id;
  const last = id => recs.filter(r => r.kid === id).sort((a, b) => b.t - a.t)[0];
  const sorted = kids.slice().sort((a, b) => (((last(b.id) || {}).level ?? -1) - ((last(a.id) || {}).level ?? -1)) || (((last(b.id) || {}).t || 0) - ((last(a.id) || {}).t || 0)));
  const kid = kids.find(k => k.id === MED.fam), krecs = recs.filter(r => r.kid === kid.id).sort((a, b) => b.t - a.t);
  const avg = a => a.length ? (a.reduce((x, y) => x + Number(y), 0) / a.length).toFixed(1) : "–";
  return `${demoToggle()}<div class="cols">
    <div class="plist">${sorted.map(c => { const l = last(c.id); return `<button data-act="medFam" data-id="${c.id}" aria-current="${c.id === MED.fam}"><span class="dot ${l ? "d" + l.level : "dn"}"></span><span><b>${esc(c.nome)}</b>${c.demo ? ' <span class="demo">exemplo</span>' : ""}<br><span class="small muted">${ageLabel(c.age)} · ${l ? "último " + agoTxt(l.t) : "sem registros"}</span></span></button>`; }).join("")}</div>
    <div>
      <div class="card"><h2>${esc(kid.nome)}, ${ageLabel(kid.age)}</h2>
        <p class="small" style="margin:0 0 4px">Diagnósticos: ${(kid.cond || []).filter(c => c !== "nenhum").join(", ") || "nenhum informado"} · Remédios contínuos: ${esc(kid.meds || "nenhum")}</p>
        ${kid.pedNotes ? `<p class="small" style="margin:0 0 4px">Orientações do pediatra: ${esc(kid.pedNotes)}</p>` : ""}
        <p class="small muted" style="margin:0">${kid.demo ? "Criança fictícia de exemplo" : `Responsável: ${esc(kid.resp || "–")}${kid.rel ? " (" + ({ mae: "mãe", pai: "pai", avo: "avó/avô", baba: "babá", outro: "outro" }[kid.rel]) + ")" : ""} · conta <span data-uid="${kid.account}">–</span>${kid.cidade ? " · " + esc(kid.cidade) : ""}${kid.pedNum ? ` · <a href="https://wa.me/${waNumber(kid.pedNum)}" target="_blank" rel="noopener">WhatsApp do pediatra</a>` : ""}`}</p>
        <p class="small muted" style="margin:6px 0 0">Preocupação média antes: ${avg(krecs.map(r => r.anxBefore).filter(Boolean))}/5 · segurança depois: ${avg(krecs.map(r => r.secureAfter).filter(Boolean))}/5 · ${krecs.length} registros</p></div>
      ${MED.rec ? medRecPanel(kid, krecs.find(r => r.id === MED.rec)) : ""}
      <div class="card"><h3>Respirações por minuto</h3>${rrChart(krecs.slice().reverse(), Number(kid.age))}</div>
      <div class="tablewrap"><table><thead><tr><th>Data</th><th>App</th><th>FR</th><th>Sintomas</th><th>Ar</th><th>Áudio</th><th>Especialista</th></tr></thead><tbody>
      ${krecs.map(r => { const v = valOf(r); return `<tr><td><button class="link" data-act="medOpen" data-fam="${r.kid}" data-id="${r.id}">${fmtDate(r.t)} ${fmtTime(r.t)}</button></td><td><span class="dot d${r.level}"></span> ${LEVELS[r.level].name}</td><td>${r.rr && r.rr.value ? r.rr.value + (r.rr.source === "manual" ? " (c)" : " (a)") : "–"}</td><td style="white-space:normal;min-width:140px">${symTxt(r) || "–"}</td><td>${r.env ? [r.env.umid === "seca" ? "seco" : "", r.env.fumaca === "sim" ? "fumaça" : ""].filter(Boolean).join(", ") || "–" : "–"}</td><td>${r.hasAudio ? "sim" : "–"}</td><td>${v ? `<span class="dot d${v.esp}"></span> ${LEVELS[v.esp].name}` : "–"}</td></tr>`; }).join("") || `<tr><td colspan="7">Sem registros.</td></tr>`}
      </tbody></table></div>
      <p class="small muted" style="margin-top:6px">FR (c) = contada pelo responsável; (a) = estimada pelo áudio. Toque na data para abrir e validar.</p>
    </div></div>`;
}
function medRecPanel(kid, r) {
  if (!r) return "";
  const key = r.kid + "|" + r.id, full = MD.full[key], v = valOf(r);
  if (MED.form._key !== key) MED.form = { _key: key, esp: v ? String(v.esp) : null, nota: v && v.nota || "", devolver: true };
  const fu = r.followup;
  return `<div class="card" style="border:2px solid var(--teal-d)">
    <div class="row between"><h3 style="margin:0">Registro de ${fmtDay(r.t)}, ${fmtTime(r.t)}</h3><button class="link" data-act="medClose">Fechar</button></div>
    <div class="lvl l${r.level}" style="margin:10px 0;padding:12px"><span class="tag"><span class="dot d${r.level}"></span> App: Nível ${LEVELS[r.level].name}</span><p class="small" style="margin:6px 0 0">${rrText(r.rr)}${r.audio ? ` · áudio ${r.audio.quality}, sons tonais ${r.audio.tonalSec || 0} s, tosses ${r.audio.coughs || 0}` : ""}</p></div>
    <p class="small"><b>Sintomas:</b> ${symTxt(r) || "nenhum marcado"}${r.feverDays ? ` · febre há ${r.feverDays} dia(s)` : ""}<br><b>Contexto:</b> ${[r.local, r.momento, r.env && r.env.umid, r.env && r.env.fumaca === "sim" ? "fumaça" : "", r.env && r.env.pm25 ? "PM2,5 " + r.env.pm25 : "", r.env && r.env.estacao].filter(Boolean).join(" · ") || "–"}<br>
    <b>Pais:</b> preocupação ${r.anxBefore || "–"}/5, segurança após ${r.secureAfter || "–"}/5${fu ? ` · depois: ${{ casa: "ficou em casa", contato: "falou com pediatra", consulta: "consulta", ps: "pronto-socorro", internacao: "internação" }[fu.outcome] || "–"}, criança ${fu.state || "–"}, teria ido ao PS: ${fu.would || "–"}` : ""}</p>
    ${r.demo ? "" : full ? `<details class="srcs"><summary>Motivos da orientação do app</summary><ul class="plain small">${(full.reasons || []).map(x => `<li>${esc(x.t)}</li>`).join("")}</ul></details>` : `<p class="small muted">Carregando detalhes…</p>`}
    ${r.hasAudio && !r.demo ? `<button class="btn ghost" data-act="medPlay" data-fam="${r.fam || r.kid}" data-id="${r.id}">${icon("play", "sm")} Ouvir áudio</button><audio id="medAudio" controls hidden></audio>` : ""}
    <div class="hr"></div>
    <h3>Sua classificação</h3>
    ${r.demo ? `<p class="small muted">Registro de exemplo: a validação não é salva.</p>` : `
    <div class="chips">${LEVELS.map((L, i) => `<button class="chip" data-set="med.form.esp" data-val="${i}" aria-pressed="${MED.form.esp === String(i)}"><span class="dot d${i}"></span> ${L.name}</button>`).join("")}</div>
    <label class="f" for="medNota">Comentário clínico</label><textarea class="f" id="medNota" data-in="med.form.nota" placeholder="Ex.: sibilância audível, manter plano de ação e reavaliar em consulta">${esc(MED.form.nota)}</textarea>
    <label class="check"><input type="checkbox" id="medDev" ${MED.form.devolver ? "checked" : ""} data-act="medDev"> <span>Enviar este comentário como devolutiva para a família (aparece no histórico dela)</span></label>
    <button class="btn block" data-act="medSave">Salvar validação</button>
    ${v ? `<p class="small muted" style="margin:8px 0 0">Validado ${agoTxt(v.t)} por <span data-uid="${v.por}">profissional</span>.</p>` : ""}`}
  </div>`;
}

/* validação com especialistas */
function medValidacao() {
  const { kids, recs } = medData(); const nm = Object.fromEntries(kids.map(k => [k.id, k.nome]));
  const vr = recs.filter(r => valOf(r)); const pairs = vr.map(r => [r.level, valOf(r).esp]);
  const sev = vr.filter(r => valOf(r).esp === 2), missed = sev.filter(r => r.level < 2);
  const conc = pairs.length ? Math.round(pairs.filter(p => p[0] === p[1]).length / pairs.length * 100) : null, k = kappa(pairs);
  const alertExp = pairs.filter(p => p[1] >= 1), sensAlert = alertExp.length ? Math.round(alertExp.filter(p => p[0] >= 1).length / alertExp.length * 100) : null;
  const sensRed = sev.length ? Math.round((sev.length - missed.length) / sev.length * 100) : null;
  const matrix = [0, 1, 2].map(a => [0, 1, 2].map(e => pairs.filter(p => p[0] === a && p[1] === e).length));
  const over = vr.filter(r => r.level > valOf(r).esp).length;
  const wa = `*RespiraKids – validação com especialistas*\nCasos avaliados: ${pairs.length}\nConcordância geral: ${conc ?? "–"}%\nKappa de Cohen: ${k !== null ? k.toFixed(2) : "–"}\nSensibilidade para vermelho: ${sensRed ?? "–"}%\nCasos graves sem alerta vermelho: ${missed.length}\nSupertriagem (app acima do especialista): ${over}\nMatriz (linhas = app, colunas = especialista; verde/amarelo/vermelho):\n${matrix.map((r, i) => LEVELS[i].name + ": " + r.join(" / ")).join("\n")}`;
  return `${demoToggle()}
  <p class="muted">Compara a classificação do app com a dos especialistas. A meta principal é que nenhuma criança grave passe sem alerta.</p>
  <div class="kpis">
    <div class="kpi" style="${missed.length ? "border-color:var(--r);background:var(--r-bg)" : ""}"><b>${missed.length}</b><span>casos graves sem alerta vermelho</span></div>
    <div class="kpi"><b>${sensRed !== null ? sensRed + "%" : "–"}</b><span>sensibilidade para vermelho</span></div>
    <div class="kpi"><b>${sensAlert !== null ? sensAlert + "%" : "–"}</b><span>sensibilidade para qualquer alerta</span></div>
    <div class="kpi"><b>${conc !== null ? conc + "%" : "–"}</b><span>concordância (${pairs.length} casos)</span></div>
    <div class="kpi"><b>${k !== null ? k.toFixed(2) : "–"}</b><span>kappa de Cohen</span></div>
    <div class="kpi"><b>${over}</b><span>supertriagem (app acima)</span></div>
  </div>
  <div class="tablewrap"><table><thead><tr><th>App ↓ / Especialista →</th>${LEVELS.map(L => `<th>${L.name}</th>`).join("")}</tr></thead><tbody>${matrix.map((row, a) => `<tr><th>${LEVELS[a].name}</th>${row.map((v, e) => `<td style="${a === e ? "font-weight:700" : a < e && v ? "color:var(--r);font-weight:700" : ""}">${v}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="small muted" style="margin-top:6px">Em vermelho: o app classificou abaixo do especialista (subtriagem).</p>
  ${missed.length ? `<div class="card" style="border-color:var(--r)"><h3>Casos graves sem alerta vermelho</h3>${missed.map(r => `<button class="tl-item" data-act="medOpen" data-fam="${r.kid}" data-id="${r.id}"><span class="dot d${r.level}"></span><span><b>${esc(nm[r.kid] || "Criança")}</b> · app ${LEVELS[r.level].name}, especialista Vermelho<br><span class="meta">${fmtDate(r.t)} · ${symTxt(r) || "sem sintomas"}</span></span><span></span></button>`).join("")}</div>` : ""}
  <div class="grid2" style="margin-top:12px"><a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(wa)}">${icon("send", "sm")} Enviar resumo por WhatsApp</a><button class="btn ghost" data-act="medCsv">${icon("download", "sm")} Exportar (.csv)</button></div>`;
}
function kappa(pairs) {
  const n = pairs.length; if (!n) return null;
  const po = pairs.filter(([a, b]) => a === b).length / n; let pe = 0;
  for (let k = 0; k < 3; k++) pe += (pairs.filter(p => p[0] === k).length / n) * (pairs.filter(p => p[1] === k).length / n);
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}
function medAfter() {
  const ids = [...new Set($$("[data-uid]").map(e => e.dataset.uid).filter(Boolean))];
  if (ids.length && CLOUD.user) CLOUD.user.profiles(ids).then(ps => $$("[data-uid]").forEach(e => { const p = ps[e.dataset.uid]; if (p) e.textContent = p.isMe ? (p.name || "você") + " (você)" : p.name || e.textContent; })).catch(() => { });
  if (MED.tab === "criancas" && MED.rec && CLOUD.ready) {
    const key = MED.fam + "|" + MED.rec, famUid = MED.fam.split("~")[0];
    if (!MD.full[key] && !MED.fam.startsWith("demo")) { MD.full[key] = null; CLOUD.db.doc(`familias/${famUid}/registros/${safeId(MED.rec)}`).get().then(s => { MD.full[key] = s.exists ? s.data() : { reasons: [] }; if (CUR === "medico") render(); }).catch(() => { MD.full[key] = { reasons: [] }; }); }
  }
}
const MED_ACT = {
  medTab(el) { MED.tab = el.dataset.k; render(); window.scrollTo(0, 0); },
  medPeriod(el) { MED.period = el.dataset.v; render(); },
  medPend() { MED.pend = !MED.pend; render(); },
  medDemo(el) { MED.demo = el.checked; render(); },
  medFam(el) { MED.fam = el.dataset.id; MED.rec = null; render(); },
  medOpen(el) { MED.fam = el.dataset.fam; MED.rec = el.dataset.id; MED.tab = "criancas"; render(); window.scrollTo(0, 0); },
  medClose() { MED.rec = null; render(); },
  medDev(el) { MED.form.devolver = el.checked; },
  async medPlay(el) { const a = $("#medAudio"); el.disabled = true; try { const b = await cloudAudioBlob(el.dataset.fam, el.dataset.id); if (!b) { toast("Áudio ainda não chegou ao banco."); return; } a.src = URL.createObjectURL(b); a.hidden = false; a.play().catch(() => { }); } catch (e) { toast("Não foi possível baixar o áudio agora."); } finally { el.disabled = false; } },
  async medSave(el) {
    const f = MED.form; if (f.esp === null || f.esp === undefined) { toast("Escolha a sua classificação."); return; }
    const { recs } = medData(); const r = recs.find(x => x.kid === MED.fam && x.id === MED.rec); if (!r) return;
    const fam = r.fam || r.kid; const doc = { fam, kid: r.kid, rec: r.id, app: r.level, esp: Number(f.esp), nota: String(f.nota || "").trim(), rr: r.rr && r.rr.value || null, t: Date.now(), por: CLOUD.uid };
    el.disabled = true;
    try {
      await CLOUD.db.doc(`validacoes/${safeId(fam)}~${safeId(r.id)}`).set(doc);
      if (f.devolver && doc.nota) {
        const ref = CLOUD.db.doc("retornos/" + fam), s = await ref.get();
        const itens = Object.assign({}, s.exists ? (s.data().itens || {}) : {});
        itens[r.id] = { esp: doc.esp, nota: doc.nota, t: doc.t, por: CLOUD.uid };
        await ref.set({ itens });
      }
      toast(f.devolver && doc.nota ? "Validação salva e devolutiva enviada à família." : "Validação salva."); MED.form = {};
    } catch (e) { toast(e && e.code === "invalid_argument" ? "Sua conta não pode salvar validações." : "Não foi possível salvar agora. Tente de novo."); }
    finally { el.disabled = false; }
  },
  medCsv() {
    const { kids, recs } = medData(); const nm = Object.fromEntries(kids.map(k => [k.id, k]));
    const rows = [["familia", "crianca", "idade", "exemplo", "data", "tipo", "nivel_app", "fr", "fonte_fr", "confianca_audio", "sinais_alerta", "sintomas", "umidade", "fumaca", "preocupacao_antes", "seguranca_depois", "desfecho", "teria_ido_ps", "estado", "nivel_especialista", "comentario"]];
    recs.forEach(r => { const v = valOf(r), k = nm[r.kid] || {}; rows.push([r.demo ? r.kid : "fam-" + Math.abs(strHash(r.fam || r.kid)).toString(36), k.nome, k.age, r.demo ? "sim" : "nao", new Date(r.t).toISOString(), r.type, LEVELS[r.level].name, r.rr && r.rr.value, r.rr && r.rr.source, r.audio && r.audio.conf, (r.red || []).join("|"), (r.sym || []).join("|"), r.env && r.env.umid, r.env && r.env.fumaca, r.anxBefore, r.secureAfter, r.followup && r.followup.outcome, r.followup && r.followup.would, r.followup && r.followup.state, v ? LEVELS[v.esp].name : "", v && v.nota]); });
    saveFile("respirakids_clinico.csv", toCSV(rows));
  }
};
/* ========== ações ========== */
function armed(el, msg) { if (el.dataset.armed) return true; el.dataset.armed = "1"; const t = el.innerHTML; el.innerHTML = msg; setTimeout(() => { if (el.isConnected) { delete el.dataset.armed; el.innerHTML = t; } }, 4000); return false; }
function toCSV(rows) { return "\ufeff" + rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(";")).join("\n"); }

async function processAudio(blob) {
  F.step = "proc"; render();
  try {
    const an = await analyzeAudio(blob);
    if (F.audio && F.audio.url) URL.revokeObjectURL(F.audio.url);
    F.audio = { an, url: URL.createObjectURL(an.wav) }; F.manual = null; F.count = null;
    log("audio_analisado", `${an.quality}; FR ${an.rrAudio || "-"} (${an.conf}); ${F.source}`);
    setStep(F.mode === "anterior" ? "quando" : "ouvir");
  } catch (e) {
    log("erro_audio", String((e && e.message) || e));
    toast("Não conseguimos ler esse áudio. Grave de novo ou envie outro arquivo (m4a, mp3 ou wav).", 5000);
    setStep(F.mode === "anterior" ? "quando" : "mic");
  }
}
function recUI() {
  const el = (performance.now() - R.t0) / 1000, left = Math.max(0, 20 - el);
  const t = $("#recTime"); if (t) t.textContent = Math.ceil(left) + " s";
  const r = $("#ringFg"); if (r) r.style.strokeDashoffset = (289 * (1 - Math.min(el, 20) / 20)).toFixed(1);
  const st = $("#stopBtn"); if (st) st.disabled = el < 15;
  const h = $("#recHint"); if (h) h.textContent = el < 15 ? `Gravando. Segure o celular parado. Faltam ${Math.ceil(15 - el)} s para o mínimo.` : "Já pode parar, ou espere até 20 s.";
  if (el >= 20) stopRec();
}
function stopRec() { clearInterval(R.iv); if (R.rec && R.rec.state !== "inactive") R.rec.stop(); }

const ACT = {
  consentChk() { $("#acceptBtn").disabled = !($("#c1").checked && $("#c2").checked); },
  accept() {
    S.consent = { t: Date.now(), version: APP_VERSION, research: $("#c3").checked, cloud: $("#c4").checked };
    save(); log("consentimento", (S.consent.cloud ? "banco" : "só aparelho") + "; " + (S.consent.research ? "com pesquisa" : "sem pesquisa"));
    if (cloudOn()) { hydrate().then(() => { pushAll(); subRetornos(); }); }
    go("inicio");
  },
  async toggleCloud(el) {
    if (S.consent.cloud) {
      if (!armed(el, "Toque de novo: apaga seus dados do banco")) return;
      el.disabled = true; await cloudWipe(); S.consent.cloud = false; if (CLOUD.retUnsub) { CLOUD.retUnsub(); CLOUD.retUnsub = null; }
      saveQuiet(); log("banco_desligado"); toast("Compartilhamento desligado. Seus dados foram apagados do banco e continuam neste aparelho.", 4500);
    } else { S.consent.cloud = true; S.consent.cloudT = Date.now(); save(); log("banco_ligado"); await hydrate(); pushAll(); subRetornos(); toast("Seus dados estão sendo guardados no banco."); }
    render();
  },
  eqSrc(el) { EQ.src = el.dataset.v; render(); },
  startFlow() { log("clique_gravar"); newFlow("gravar"); if (!S.profile) { F._pendingRec = true; PF = {}; go("cadastro"); } else go("gravar"); },
  startRetro() { log("dia_anterior_iniciado"); newFlow("anterior"); if (!S.profile) { F._pendingRec = true; PF = {}; go("cadastro"); } else go("gravar"); },
  pickKid(el) { S.activeKid = el.dataset.id; relink(S); saveQuiet(); toast(`Agora acompanhando ${S.profile.nome}.`); if (CUR === "criancas") go("inicio"); else render(); },
  addKid() { if (S.kids.length >= MAX_KIDS) { toast(`Cada conta pode acompanhar até ${MAX_KIDS} crianças.`); return; } PF = { _new: true, resp: S.profile ? S.profile.resp : "", rel: S.profile ? S.profile.rel : null }; if (F) F._pendingRec = false; go("cadastro"); },
  editKid(el) { S.activeKid = el.dataset.id; relink(S); PF = {}; if (F) F._pendingRec = false; go("cadastro"); },
  async delKid(el) {
    if (!armed(el, "Toque de novo: apaga a criança e os registros")) return;
    const id = el.dataset.id, recs = S.records.filter(r => r.kid === id);
    recs.forEach(r => IDB.del(r.id)); S.records = S.records.filter(r => r.kid !== id);
    S.kids = S.kids.filter(k => k.id !== id); if (S.pending && S.pending.kid === id) S.pending = null;
    if (S.activeKid === id) S.activeKid = S.kids[0] ? S.kids[0].id : null; relink(S);
    save(); log("crianca_removida"); toast("Criança removida, com os registros dela."); render();
  },
  startDiary() { log("diario_iniciado"); newFlow("diario"); if (!S.profile) { F._pendingRec = true; PF = {}; go("cadastro"); } else go("gravar"); },
  saveProfile() {
    if (!String(PF.nome || "").trim()) { toast("Escreva o nome ou apelido da criança."); $("#pf_nome").focus(); return; }
    if (PF.age === "" || PF.age === undefined) { toast("Escolha a idade da criança."); $("#pf_age").focus(); return; }
    const p = clone(PF); const isNew = !!PF._new || !S.profile; delete p._loaded; delete p._new;
    if (isNew) { p.id = "k" + uid(); p.color = KID_COLORS[S.kids.length % KID_COLORS.length]; S.kids.push(p); }
    else { p.id = S.profile.id; p.color = S.profile.color; S.kids = S.kids.map(k => k.id === p.id ? p : k); }
    S.activeKid = p.id; relink(S); save(); log(isNew ? "crianca_criada" : "cadastro", isNew ? S.kids.length + "ª criança" : ""); PF = {};
    toast(isNew ? `${p.nome} entrou na sua lista de crianças.` : "Perfil salvo.");
    if (F && F._pendingRec) { F._pendingRec = false; go("gravar"); } else go(isNew ? "inicio" : "criancas");
  },
  editProfile() { PF = {}; if (F) F._pendingRec = false; go("cadastro"); },
  prev() { prevStep(); },
  next() { nextStep(); },
  home() { F = null; go("inicio"); },
  async allowMic() {
    try { await openMic(); F.micOk = true; F.micErr = null; log("microfone_liberado"); setStep("rec"); }
    catch (e) { F.micErr = e.name || "erro"; log("microfone_negado", F.micErr); F.step = "mic"; render(); }
  },
  recStart() {
    if (!window.MediaRecorder) { F.micErr = "NotSupportedError"; closeMic(); setStep("mic"); toast("Este navegador não grava áudio. Use o gravador do celular."); return; }
    const mime = pickMime();
    try { R.rec = new MediaRecorder(R.stream, mime ? { mimeType: mime } : undefined); } catch (e) { R.rec = new MediaRecorder(R.stream); }
    R.chunks = [];
    R.rec.ondataavailable = e => { if (e.data && e.data.size) R.chunks.push(e.data); };
    R.rec.onstop = () => { const type = (R.rec && R.rec.mimeType) || mime || "audio/webm"; const blob = new Blob(R.chunks, { type }); closeMic(); F.source = "microfone"; processAudio(blob); };
    R.rec.start(250); R.recording = true; R.t0 = performance.now(); log("gravacao_iniciada");
    $("#recBtns").innerHTML = `<button class="btn block" id="stopBtn" data-act="recStop" disabled>${icon("stop", "sm")} Parar e ouvir</button><button class="btn ghost block" data-act="recCancel">Cancelar</button>`;
    $("#noiseLabel").textContent = "Gravando. Ninguém fala agora.";
    R.iv = setInterval(recUI, 200);
  },
  recStop() { stopRec(); },
  recCancel() { if (R.rec) R.rec.onstop = null; closeMic(); log("gravacao_cancelada"); setStep("prep"); },
  setWhen(el) { F.when = el.dataset.v; render(); },
  pickFile() { $("#fileIn").click(); },
  redo() { log("regravacao"); F.audio = null; F.manual = null; F.count = null; if (F.source === "arquivo") { F.step = "mic"; render(); $("#fileIn").click(); } else { F.step = "mic"; render(); ACT.allowMic(); } },
  countStart() {
    clearInterval(ACT._civ); F.count = { active: true, taps: 0, t0: Date.now() }; F.manual = null; render();
    ACT._civ = setInterval(() => {
      const left = 30 - Math.floor((Date.now() - F.count.t0) / 1000); const t = $("#cntTime"); if (t) t.textContent = Math.max(0, left) + " s";
      if (left <= 0) { clearInterval(ACT._civ); F.count.active = false; const v = F.count.taps * 2; if (v > 0) { F.manual = v; log("contagem_manual", v); } else toast("Nenhum toque registrado. Tente de novo."); render(); }
    }, 250);
  },
  tap() { if (!F.count || !F.count.active) return; F.count.taps++; const t = $("#cntTaps"); if (t) t.textContent = F.count.taps; try { navigator.vibrate && navigator.vibrate(12); } catch (e) { } },
  sym(el) { const k = el.dataset.k, arr = el.dataset.red === "1" ? F.red : F.sym; const i = arr.indexOf(k); if (i >= 0) arr.splice(i, 1); else arr.push(k); render(); },
  async finish() {
    const p = S.profile || {}, a = F.audio && F.audio.an, retro = F.mode === "anterior";
    if (retro) {
      const t = fromLocalInput(F.when);
      if (!t || t > Date.now()) { toast("Escolha uma data e hora que já passou."); setStep("quando"); return; }
      if (t < Date.now() - MAX_BACK_DAYS * 864e5) { toast(`Só dá para adicionar registros dos últimos ${MAX_BACK_DAYS} dias.`); setStep("quando"); return; }
      F.t = t;
      const typed = Math.round(Number(F.manualTyped));
      if (typed >= 4 && typed <= 120) F.manual = typed; else if (F.manualTyped) { toast("A contagem de respirações parece errada. Confira o número."); setStep("quando"); return; }
    }
    const rr = F.manual ? { value: F.manual, source: "manual" } : a && a.rrAudio ? { value: a.rrAudio, source: "audio", conf: a.conf } : null;
    const rec = { id: uid(), t: F.t, type: F.mode === "diario" ? "diario" : "gravacao", anxBefore: Number(F.anx) || null, local: F.local, momento: F.momento, sym: F.sym.slice(), red: F.red.slice(), feverDays: F.feverDays, env: Object.assign({}, F.env, { estacao: seasonOf(F.t) }), rr,
      audio: a ? { durRaw: a.durRaw, dur: a.dur, snr: a.snr, quality: a.quality, conf: a.conf, rrAudio: a.rrAudio, coughs: a.coughs, tonalSec: a.tonalSec, peaksPerMin: a.peaksPerMin, trimmed: a.trimmed, source: F.source } : null,
      ageAt: p.age, hasAudio: false, secureAfter: null, followup: null, kid: S.activeKid, retro, createdAt: Date.now() };
    const tri = triage(rec, p); rec.level = tri.level; rec.reasons = tri.reasons; rec.airIssue = tri.airIssue;
    if (a) rec.hasAudio = await IDB.put(rec.id, a.wav);
    S.records.push(rec);
    if (!retro) S.pending = rec.level === 1 ? { t: Date.now() + 2 * 36e5, id: rec.id, kid: rec.kid } : null;
    save(); log(retro ? "registro_dia_anterior" : "resultado", LEVELS[rec.level].name);
    F.recId = rec.id; setStep("resultado");
  },
  secure(el) { F.secure = Number(el.dataset.v); const r = S.records.find(x => x.id === F.recId); if (r) r.secureAfter = F.secure; save(); log("seguranca_pos", F.secure); render(); },
  sendRec(el) { SEL = el.dataset.id; SD._fromRec = true; SD.range = "um"; go("enviar"); },
  openRec(el) { SEL = el.dataset.id; SD._fromRec = false; go("registro"); },
  more() { HF.page += 40; render(); },
  askHistory() { go("conversa"); setTimeout(() => ask("Me explique de forma simples como está o histórico de registros e se algo merece atenção."), 30); },
  saveFU() {
    if (!FU.outcome || !FU.state) { toast("Responda o que aconteceu e como a criança está."); return; }
    const r = S.records.find(x => x.id === FU._id); if (!r) return;
    r.followup = { outcome: FU.outcome, would: FU.would, state: FU.state, sat: FU.sat, note: FU.note, t: Date.now() };
    save(); log("acompanhamento", `${FU.outcome}; teria ido ao PS: ${FU.would || "-"}; ${FU.state}`); FU = {}; toast("Resposta salva. Obrigado!"); render();
  },
  delRec(el) { if (!armed(el, "Toque de novo para apagar")) return; const id = el.dataset.id; S.records = S.records.filter(r => r.id !== id); IDB.del(id); save(); log("registro_apagado"); toast("Registro apagado."); go("historico"); },
  pendingDone() { S.pending = null; save(); render(); },
  newQ() { const t = $("#newQ").value.trim(); if (!t) { toast("Escreva sua dúvida primeiro."); return; } S.questions.push({ q: t, t: Date.now() }); save(); log("pergunta_nova", t.slice(0, 60)); toast("Pergunta enviada para a equipe."); render(); },
  ask(el) { const q = el && el.dataset && el.dataset.q ? el.dataset.q : ($("#chatIn") ? $("#chatIn").value : ""); ask(q); },
  clearChat() { S.chat = []; save(); render(); },
  back() { if (history.length > 1) history.back(); else go("inicio"); },
  waOpen(el, e) { if (waNumber(SD.num).length < 12) { e.preventDefault(); toast("Digite o número do WhatsApp com DDD."); $("#sdNum").focus(); return; } log("whatsapp_aberto", SD.range); },
  async shareFiles() {
    const recs = reportRecords();
    const files = (await audioFilesFor(recs)).map(f => new File([f.blob], f.name, { type: "audio/wav" }));
    const all = [new File([reportText()], "relatorio_respirakids.txt", { type: "text/plain" }), ...files];
    if (navigator.canShare && navigator.canShare({ files: all })) {
      try { await navigator.share({ files: all, title: "RespiraKids", text: "Relatório respiratório" }); log("compartilhado", files.length + " áudio(s)"); }
      catch (e) { if (e.name !== "AbortError") toast("O compartilhamento não abriu aqui. Use “Salvar pacote com áudio”.", 4500); }
    } else toast("Este navegador não compartilha arquivos. Use “Salvar pacote com áudio”.", 4500);
  },
  async saveZip() {
    const recs = reportRecords(); const enc = new TextEncoder();
    const files = [{ name: "relatorio_respirakids.txt", data: enc.encode(reportText().replace(/\*/g, "")) }];
    for (const f of await audioFilesFor(recs)) files.push({ name: f.name, data: new Uint8Array(await f.blob.arrayBuffer()) });
    await saveFile("respirakids_relatorio.zip", makeZip(files));
  },
  exportJson() { const d = { exportado_em: new Date().toISOString(), consentimento: S.consent, criancas: S.kids, registros: S.records, perguntas: S.questions }; saveFile("respirakids_meus_dados.json", JSON.stringify(d, null, 2)); },
  async wipe(el) { if (!armed(el, "Toque de novo para apagar tudo")) return; el.disabled = true; if (CLOUD.ready && CLOUD.uid) await cloudWipe(); if (CLOUD.retUnsub) { CLOUD.retUnsub(); CLOUD.retUnsub = null; } try { localStorage.removeItem(LS_KEY); } catch (e) { } IDB.clear(); S = load(); F = null; toast("Todos os dados foram apagados."); go("termos"); },
  toggleDemo(el) { S.settings.demo = el.checked; save(); render(); },
  csvRecs() {
    const { kids, recs } = allKidsRecs(S.settings.demo); const nm = Object.fromEntries(kids.map(k => [k.id, k.nome]));
    const rows = [["id", "crianca", "exemplo", "data", "tipo", "nivel", "fr", "fonte_fr", "confianca_audio", "qualidade_audio", "sinais_alerta", "sintomas", "umidade", "fumaca", "pm25", "preocupacao_antes", "seguranca_depois", "desfecho", "teria_ido_ps", "estado_crianca", "satisfacao", "classificacao_especialista"]];
    recs.forEach(r => rows.push([r.id, nm[r.kid], r.demo ? "sim" : "nao", new Date(r.t).toISOString(), r.type, LEVELS[r.level].name, r.rr && r.rr.value, r.rr && r.rr.source, r.audio && r.audio.conf, r.audio && r.audio.quality, (r.red || []).join("|"), (r.sym || []).join("|"), r.env && r.env.umid, r.env && r.env.fumaca, r.env && r.env.pm25, r.anxBefore, r.secureAfter, r.followup && r.followup.outcome, r.followup && r.followup.would, r.followup && r.followup.state, r.followup && r.followup.sat, expertOf(r) !== undefined ? LEVELS[expertOf(r)].name : ""]));
    saveFile("respirakids_registros.csv", toCSV(rows));
  },
  csvEvents() { saveFile("respirakids_eventos.csv", toCSV([["data", "evento", "detalhe"], ...S.events.map(e => [new Date(e.t).toISOString(), e.type, e.detail])])); },
  pickKid(el) { CL.kid = el.dataset.id; render(); },
  async playRec(el) { const b = await IDB.get(el.dataset.id); const a = $("#clinicAudio"); if (!b || !a) { toast("Áudio não encontrado neste aparelho."); return; } a.src = URL.createObjectURL(b); a.hidden = false; a.play().catch(() => { }); },
  expert(el) { const v = el.value, id = el.dataset.id; if (v === "") delete S.expert[id]; else S.expert[id] = { lvl: Number(v), t: Date.now() }; save(); log("validacao_especialista", `${id}: ${v === "" ? "removida" : LEVELS[Number(v)].name}`); render(); }
};

Object.assign(ACT, MED_ACT);

/* ========== contas: família, médico e hospital; vínculos família ↔ médico ========== */
/* Dados e regras ficam no servidor (convex/respiraContas.ts); aqui só as telas. */
const CT = { api: null, p: null, unsub: null, err: null, pend: false, form: {}, code: "", email: "" };
const ROLE_TXT = { familia: "Família", medico: "Médico(a)", hospital: "Hospital ou clínica" };
ROOTS.ct = () => CT;
const fmtCode = c => c ? c.slice(0, 3) + "-" + c.slice(3) : "";
function ctPendentes() { const p = CT.p; return p ? p.meusCodigos.filter(c => c.status === "pedido" && c.expiresAt > Date.now()).length + p.convitesRecebidos.length : 0; }
async function initContas() {
  if (CT.unsub || !window.claude) return;
  try { CT.api = await window.claude.use("contas"); } catch (e) { CT.err = (e && e.code) || "erro"; return; }
  if (__stopped) return;
  CT.unsub = CT.api.painel(p => { CT.p = p; CT.err = null; contasRefresh(); }, e => { CT.err = e.code; contasRefresh(); });
}
function contasRefresh() {
  if (!["conta", "medicos", "hospital", "medico", "mais"].includes(CUR)) return;
  const ae = document.activeElement;
  if (ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && ae.type !== "checkbox"))) { CT.pend = true; return; }
  render();
}
__on(document, "focusout", () => { if (CT.pend) { CT.pend = false; setTimeout(contasRefresh, 50); } });
function contasWait(shell) {
  const wrap = h => shell ? shell(h) : h;
  if (!CLOUD.tried || (CLOUD.ready && !CT.p && !CT.err)) return wrap(`<div class="card" style="text-align:center"><div class="spinner"></div><p>Carregando sua conta…</p></div>`);
  if (!CLOUD.ready || !CT.p) return wrap(`<div class="card"><h2>Conta indisponível</h2><p>Não foi possível conectar ao banco de dados agora. Tente de novo em instantes.</p></div>`);
  return "";
}
function personLine(p) {
  return `<b>${esc(p.nome)}</b>${p.role === "medico" ? ` <span class="small muted">· CRM ${esc(p.crm || "–")}${p.especialidade ? " · " + esc(p.especialidade) : ""}</span>` : p.email ? ` <span class="small muted">· ${esc(p.email)}</span>` : ""}`;
}
function convitesCard() {
  const r = CT.p.convitesRecebidos; if (!r.length) return "";
  return `<div class="card" style="border:2px solid var(--teal-d)"><h3>${icon("send", "sm")} Convites para você</h3>${r.map(i => `<div style="margin:10px 0"><p style="margin:0">${personLine(i.de)} ${i.kind === "hospital" ? "convidou você para a equipe médica." : "quer acompanhar as crianças da sua família."}</p>
    <div class="row wrap" style="margin-top:8px"><button class="btn" data-act="ctAceitar" data-id="${i.id}">Aceitar</button><button class="btn ghost" data-act="ctRecusarConvite" data-id="${i.id}">Recusar</button></div></div>`).join("")}</div>`;
}
function codigoCard(outro) {
  const p = CT.p, now = Date.now(), meus = p.meusCodigos.filter(c => c.expiresAt > now);
  const pedidos = meus.filter(c => c.status === "pedido" && c.pedido), aberto = meus.find(c => c.status === "aberto");
  const wa = aberto ? `https://wa.me/?text=${encodeURIComponent(`Meu código do RespiraKids para nos vincularmos: ${fmtCode(aberto.code)}`)}` : "";
  return `<div class="card"><h3>${icon("shield", "sm")} Vincular por código</h3>
    <p class="small muted">Um lado gera o código e manda para o outro. Quem recebe digita aqui embaixo. Depois, quem gerou o código aprova, e só então o vínculo é feito.</p>
    ${pedidos.map(c => `<div class="notice y">${icon("user")}<div>${personLine(c.pedido)} usou o seu código <b>${fmtCode(c.code)}</b> e quer se vincular a você.
      <div class="row wrap" style="margin-top:8px"><button class="btn" data-act="ctAprovar" data-id="${c.id}">Aprovar</button><button class="btn ghost" data-act="ctRecusar" data-id="${c.id}">Recusar</button></div></div></div>`).join("")}
    ${aberto ? `<div style="text-align:center;margin:12px 0"><div class="small muted">Seu código</div><div class="bigtime" style="letter-spacing:.14em">${fmtCode(aberto.code)}</div>
      <div class="small muted">Mande para ${outro}. Vale até ${fmtDate(aberto.expiresAt)}, ${fmtTime(aberto.expiresAt)}.</div>
      <div class="row wrap" style="justify-content:center;margin-top:10px"><a class="btn wa" href="${wa}" target="_blank" rel="noopener">${icon("send", "sm")} Mandar pelo WhatsApp</a><button class="btn ghost" data-act="ctCancelar" data-id="${aberto.id}">Cancelar código</button></div></div>`
      : `<button class="btn block" data-act="ctGerar">${icon("plus", "sm")} Gerar um código</button>`}
    <div class="hr"></div>
    <label class="f" for="ctCode">Recebeu um código? Digite aqui</label>
    <div class="row"><input class="f" id="ctCode" data-in="ct.code" value="${esc(CT.code)}" placeholder="Ex.: K7P-3QX" autocomplete="off" style="text-transform:uppercase"><button class="btn" data-act="ctUsar">Enviar</button></div>
    ${p.meusPedidos.map(r => `<p class="small" style="margin:10px 0 0">${icon("timer", "sm")} Esperando <b>${esc(r.de.nome)}</b> aprovar o código ${fmtCode(r.code)}. <button class="link" data-act="ctCancelar" data-id="${r.id}">Desistir</button></p>`).join("")}
  </div>`;
}
function convidarCard(titulo, ajuda) {
  const s = CT.p.convitesEnviados;
  return `<div class="card"><h3>${icon("send", "sm")} ${titulo}</h3><p class="small muted">${ajuda}</p>
    <div class="row"><input class="f" type="email" id="ctEmail" data-in="ct.email" value="${esc(CT.email)}" placeholder="email@exemplo.com" autocomplete="off"><button class="btn" data-act="ctConvidar">Convidar</button></div>
    ${s.length ? `<p class="small muted" style="margin:12px 0 4px">Esperando resposta:</p>${s.map(i => `<p class="small" style="margin:4px 0">${esc(i.email)} · enviado ${agoTxt(i.criadoEm)} <button class="link" data-act="ctCancelarConvite" data-id="${i.id}">Cancelar</button></p>`).join("")}` : ""}</div>`;
}

/* Minha conta: tipo de conta e dados */
function vConta() {
  const w = contasWait(); if (w) return w;
  const p = CT.p;
  if (CT.form._for !== p.me.id) CT.form = { _for: p.me.id, role: p.me.role, nome: p.me.nome, crm: p.me.crm, especialidade: p.me.especialidade, cidade: p.me.cidade };
  const f = CT.form, back = p.me.role === "medico" ? "medico" : p.me.role === "hospital" ? "hospital" : S.consent ? "mais" : "termos";
  const help = { familia: "Para pais, mães e responsáveis: gravar, registrar e acompanhar a respiração das crianças.", medico: "Para médicos: ver o histórico dos pacientes vinculados, ouvir as gravações, validar e mandar orientações.", hospital: "Para hospitais e clínicas: montar a equipe de médicos. Cada médico aceita o convite para entrar." };
  return `<button class="link" data-go="${back}">${icon("back", "sm")} Voltar</button>
  <h1>Minha conta</h1>
  <p class="muted">Você entrou como ${esc(p.me.email || "")}. Tipo de conta: <b>${ROLE_TXT[p.me.role]}</b>${p.me.temPerfil ? "" : " (padrão)"}.</p>
  ${convitesCard()}
  <div class="card"><h3>Tipo de conta</h3>
    <div class="chips">${["familia", "medico", "hospital"].map(r => `<button class="chip" data-set="ct.form.role" data-val="${r}" data-rerender aria-pressed="${f.role === r}">${ROLE_TXT[r]}</button>`).join("")}</div>
    <p class="small muted" style="margin:10px 0 0">${help[f.role]}</p>
    <label class="f" for="ctNome">${f.role === "hospital" ? "Nome do hospital ou clínica" : f.role === "medico" ? "Seu nome, como as famílias vão ver (ex.: Dra. Ana Souza)" : "Seu nome"}</label>
    <input class="f" id="ctNome" data-in="ct.form.nome" value="${esc(f.nome || "")}">
    ${f.role === "medico" ? `<label class="f" for="ctCrm">CRM com estado</label><input class="f" id="ctCrm" data-in="ct.form.crm" value="${esc(f.crm || "")}" placeholder="Ex.: 12345-DF">
      <label class="f" for="ctEsp">Especialidade</label><input class="f" id="ctEsp" data-in="ct.form.especialidade" value="${esc(f.especialidade || "")}" placeholder="Ex.: Pediatria">` : ""}
    ${f.role !== "familia" ? `<label class="f" for="ctCid">Cidade</label><input class="f" id="ctCid" data-in="ct.form.cidade" value="${esc(f.cidade || "")}" placeholder="Ex.: Brasília">` : ""}
    <button class="btn block" style="margin-top:16px" data-act="ctSalvarPerfil">Salvar</button>
  </div>
  <div class="card"><button class="btn ghost block" data-act="ctSair">Sair da conta</button>
    <p class="small muted" style="margin:8px 0 0">Os registros guardados neste aparelho continuam aqui. Para apagar, use Mais → Apagar tudo.</p></div>`;
}

/* Família: meus médicos */
function vMedicos() {
  const w = contasWait(); if (w) return w;
  const p = CT.p;
  if (p.me.role !== "familia") return `<h1>Meus médicos</h1><div class="card"><p>Esta tela é das famílias. Sua conta é de ${ROLE_TXT[p.me.role]}.</p><a class="btn" href="#conta">Minha conta</a></div>`;
  const shared = S.consent && S.consent.cloud;
  return `<button class="link" data-go="mais">${icon("back", "sm")} Voltar</button>
  <h1>Meus médicos</h1>
  <p class="muted">Seu médico vê o histórico das crianças e pode mandar orientações. Você pode remover quando quiser.</p>
  ${!shared ? `<div class="notice y">${icon("alert")}<div>Seus registros estão só neste aparelho. Para o médico ver, é preciso compartilhar.${CLOUD.ready ? `<button class="btn block" style="margin-top:10px" data-act="toggleCloud">Compartilhar com meus médicos</button>` : ""}</div></div>` : ""}
  ${convitesCard()}
  <div class="card"><h3>Médicos vinculados</h3>${p.medicos.length ? p.medicos.map(m => `<div class="row between" style="margin:12px 0;align-items:flex-start"><div>${personLine(m)}<br><span class="small muted">${m.hospitais.length ? esc(m.hospitais.join(", ")) + " · " : ""}vinculado em ${fmtDate(m.desde)}</span></div>
    <button class="link" style="color:var(--r)" data-act="ctDesvincular" data-id="${m.id}" data-nome="${esc(m.nome)}">Remover</button></div>`).join("") : `<p class="small muted" style="margin:0">Nenhum médico vinculado ainda.</p>`}</div>
  ${codigoCard("o seu médico")}`;
}

/* Médico: aba "Meus pacientes" do app clínico */
function medVinculos() {
  const w = contasWait(); if (w) return w;
  const p = CT.p;
  if (p.me.role !== "medico") return `<div class="card"><p>Os vínculos com pacientes são para contas de médico. <a href="#conta">Minha conta</a></p></div>`;
  const kidsTxt = f => f.criancas.length ? f.criancas.map(k => esc(k.nome) + (k.age !== null && k.age !== "" ? ", " + ageLabel(k.age) : "")).join(" · ") : `<span class="muted">${f.compartilhando ? "Ainda sem crianças cadastradas" : "A família ainda não ativou o compartilhamento dos dados"}</span>`;
  return `${convitesCard()}
  <div class="card"><h3>Meus pacientes (${p.pacientes.length} família${p.pacientes.length === 1 ? "" : "s"})</h3>
    ${p.pacientes.length ? p.pacientes.map(f => `<div class="row between" style="margin:12px 0;align-items:flex-start"><div><b>${esc(f.nome)}</b> <span class="small muted">${esc(f.email || "")}</span><br><span class="small">${kidsTxt(f)}</span><br><span class="small muted">${f.registros} registro${f.registros === 1 ? "" : "s"} · vinculado em ${fmtDate(f.desde)} por ${f.via === "codigo" ? "código" : "convite"}</span></div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">${f.criancas.length ? `<button class="link" data-act="ctVerFamilia" data-id="${f.id}">Ver histórico</button>` : ""}<button class="link" style="color:var(--r)" data-act="ctDesvincular" data-id="${f.id}" data-nome="${esc(f.nome)}">Remover</button></div></div>`).join("") : `<p class="small muted" style="margin:0">Nenhum paciente ainda. Gere um código e mande para a família, ou convide pelo e-mail.</p>`}</div>
  ${codigoCard("a família")}
  ${convidarCard("Convidar família por e-mail", "Digite o e-mail que a família usa para entrar no RespiraKids. Ela vê o convite em Mais → Meus médicos e aceita.")}
  <div class="card"><h3>Meus hospitais</h3>${p.hospitais.length ? p.hospitais.map(h => `<div class="row between" style="margin:8px 0"><span><b>${esc(h.nome)}</b> <span class="small muted">desde ${fmtDate(h.desde)}</span></span><button class="link" style="color:var(--r)" data-act="ctSairEquipe" data-id="${h.id}" data-nome="${esc(h.nome)}">Sair</button></div>`).join("") : `<p class="small muted" style="margin:0">Você não faz parte de nenhum hospital. Quando um hospital convidar o seu e-mail, o convite aparece aqui.</p>`}</div>`;
}

/* Hospital: equipe médica */
function vHospital() {
  const shell = h => `<header class="medhead"><img src="${LOGO}" alt=""><div><b class="brand">RespiraKids Hospital</b><br><span class="small muted">${CT.p ? esc(CT.p.me.nome) : "Equipe médica"}</span></div><span class="small muted" style="margin-left:auto;text-align:right"><a href="#conta" class="small">Minha conta</a></span></header>${h}`;
  const w = contasWait(shell); if (w) return w;
  const p = CT.p;
  if (p.me.role !== "hospital") return shell(`<div class="card"><h2>Área de hospitais</h2><p>Para montar uma equipe médica, mude o tipo da sua conta para <b>Hospital ou clínica</b>.</p><a class="btn" href="#conta">Minha conta</a></div>`);
  const fam = p.equipe.reduce((a, d) => a + d.pacientes, 0);
  return shell(`<div class="kpis"><div class="kpi"><b>${p.equipe.length}</b><span>médicos na equipe</span></div><div class="kpi"><b>${fam}</b><span>famílias acompanhadas pela equipe</span></div><div class="kpi"><b>${p.convitesEnviados.length}</b><span>convites esperando resposta</span></div></div>
    <div class="card"><h3>Equipe médica</h3>${p.equipe.length ? `<div class="tablewrap"><table><thead><tr><th>Médico(a)</th><th>CRM</th><th>Especialidade</th><th>Famílias</th><th>Desde</th><th></th></tr></thead><tbody>${p.equipe.map(d => `<tr><td>${esc(d.nome)}<br><span class="small muted">${esc(d.email || "")}</span></td><td>${esc(d.crm || "–")}</td><td>${esc(d.especialidade || "–")}</td><td>${d.pacientes}</td><td>${fmtDate(d.desde)}</td><td><button class="link" style="color:var(--r)" data-act="ctSairEquipe" data-id="${d.id}" data-nome="${esc(d.nome)}">Remover</button></td></tr>`).join("")}</tbody></table></div>` : `<p class="small muted" style="margin:0">Nenhum médico na equipe ainda. Convide pelo e-mail abaixo.</p>`}</div>
    ${convidarCard("Convidar médico(a) para a equipe", "Digite o e-mail que o médico usa no RespiraKids. Ele precisa ter uma conta de médico e aceitar o convite.")}
    <p class="small muted">Por privacidade, o hospital vê a equipe e quantas famílias cada médico acompanha, mas não os dados de saúde das crianças. Só o médico vinculado a cada família vê esses dados.</p>`);
}

async function ctRun(name, args, okMsg) {
  if (!CT.api) { toast("Sua conta ainda está carregando. Tente de novo."); return null; }
  try { const r = await CT.api.call(name, args); if (okMsg) toast(okMsg); return r === null || r === undefined ? true : r; }
  catch (e) { toast((e && e.message) || "Não foi possível agora. Tente de novo."); return null; }
}
const CT_ACT = {
  async ctSalvarPerfil(el) {
    const f = CT.form; el.disabled = true;
    const ok = await ctRun("salvarPerfil", { role: f.role, nome: f.nome || "", crm: f.crm || undefined, especialidade: f.especialidade || undefined, cidade: f.cidade || undefined }, "Conta salva.");
    el.disabled = false;
    if (ok) { log("conta_tipo", f.role); go(f.role === "medico" ? "medico" : f.role === "hospital" ? "hospital" : S.consent ? "medicos" : "termos"); }
  },
  async ctGerar(el) { el.disabled = true; const code = await ctRun("gerarCodigo", {}); el.disabled = false; if (code) log("codigo_gerado", ""); },
  async ctUsar() {
    const c = (CT.code || "").trim(); if (!c) { toast("Digite o código."); return; }
    const r = await ctRun("usarCodigo", { code: c });
    if (r) { CT.code = ""; toast(`Pronto! Agora ${r.aguardando} precisa aprovar.`, 4500); log("codigo_usado", ""); render(); }
  },
  async ctAprovar(el) { el.disabled = true; if (await ctRun("responderPedido", { codeId: el.dataset.id, aprovar: true }, "Vínculo feito.")) log("vinculo_aprovado", ""); },
  async ctRecusar(el) { el.disabled = true; await ctRun("responderPedido", { codeId: el.dataset.id, aprovar: false }, "Pedido recusado."); },
  async ctCancelar(el) { await ctRun("cancelarCodigo", { codeId: el.dataset.id }); },
  async ctConvidar() {
    const e = (CT.email || "").trim(); if (!e) { toast("Digite o e-mail."); return; }
    if (await ctRun("convidar", { email: e }, "Convite enviado. A pessoa vê o convite quando entrar no RespiraKids com esse e-mail.")) { CT.email = ""; render(); }
  },
  async ctCancelarConvite(el) { await ctRun("cancelarConvite", { inviteId: el.dataset.id }, "Convite cancelado."); },
  async ctAceitar(el) { el.disabled = true; if (await ctRun("responderConvite", { inviteId: el.dataset.id, aceitar: true }, "Convite aceito.")) log("convite_aceito", ""); },
  async ctRecusarConvite(el) { el.disabled = true; await ctRun("responderConvite", { inviteId: el.dataset.id, aceitar: false }, "Convite recusado."); },
  ctDesvincular(el) { if (!armed(el, "Toque de novo para remover")) return; ctRun("desvincular", { outroId: el.dataset.id }, `${el.dataset.nome} foi removido(a).`); },
  ctSairEquipe(el) { if (!armed(el, "Toque de novo para confirmar")) return; ctRun("sairDaEquipe", { outroId: el.dataset.id }, "Pronto."); },
  async ctSair(el) { el.disabled = true; try { await CT.api.sair(); } catch (e) { el.disabled = false; toast("Não foi possível sair agora."); } },
  ctVerFamilia(el) { const k = medData().kids.find(x => x.fam === el.dataset.id); MED.tab = "criancas"; MED.fam = k ? k.id : null; MED.rec = null; render(); window.scrollTo(0, 0); }
};
Object.assign(ACT, CT_ACT);
Object.assign(VIEWS, { conta: vConta, medicos: vMedicos, hospital: vHospital });
Object.assign(TAB_OF, { conta: "mais", medicos: "mais" });

/* ========== eventos ========== */
function doSet(el) {
  const path = el.dataset.set, val = el.dataset.val, multi = el.hasAttribute("data-multi");
  const [o, k] = getPath(path);
  if (multi) {
    let arr = (o[k] || []).slice();
    if (arr.includes(val)) arr = arr.filter(x => x !== val);
    else { arr.push(val); if (path === "prof.cond") arr = val === "nenhum" ? ["nenhum"] : arr.filter(x => x !== "nenhum"); }
    o[k] = arr;
  } else o[k] = val;
  if (path === "send.to") { const p = S.profile || {}; SD.num = val === "pediatra" ? p.pedNum || "" : val === "emergencia" ? p.emNum || "" : ""; }
  if (path === "hist.filter") HF.page = 40;
  if (el.hasAttribute("data-rerender")) { render(); return; }
  const cur = o[k];
  $$("[data-set]", el.parentElement).forEach(b => b.setAttribute("aria-pressed", multi ? (cur || []).includes(b.dataset.val) : String(cur) === b.dataset.val));
}
function updateWa() {
  const l = $("#waLink"); if (!l) return; const n = waNumber(SD.num);
  if (n.length >= 12) { l.href = `https://wa.me/${n}?text=${encodeURIComponent(reportText())}`; l.removeAttribute("aria-disabled"); } else { l.href = "#"; l.setAttribute("aria-disabled", "true"); }
}
function doInput(el) {
  const [o, k] = getPath(el.dataset.in); o[k] = el.value;
  if (el.dataset.in === "faq.q") $("#faqList").innerHTML = faqListHTML();
  if (el.dataset.in === "send.num") updateWa();
}
__on(document, "click", e => {
  const g = e.target.closest("[data-go]"); if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const s = e.target.closest("[data-set]"); if (s) { doSet(s); return; }
  const a = e.target.closest("[data-act]");
  if (a && ACT[a.dataset.act] && a.tagName !== "SELECT" && a.type !== "checkbox") ACT[a.dataset.act](a, e);
});
__on(document, "change", e => { const a = e.target.closest("[data-act]"); if (a && (a.tagName === "SELECT" || a.type === "checkbox") && ACT[a.dataset.act]) ACT[a.dataset.act](a, e); });
__on(document, "input", e => { const i = e.target.closest("[data-in]"); if (i) doInput(i); });
__on(document, "keydown", e => { if (e.key === "Enter" && e.target.id === "chatIn") { e.preventDefault(); ACT.ask(); } });
$("#fileIn").addEventListener("change", e => { const f = e.target.files[0]; e.target.value = ""; if (!f) return; if (!F) newFlow(); closeMic(); F.source = "arquivo"; log("arquivo_enviado", f.type || "audio"); if (CUR !== "gravar") go("gravar"); processAudio(f); });
__timers.push(setInterval(() => { if (CUR === "inicio" && S.pending && S.pending.t <= Date.now() && !S.pending.shown) { S.pending.shown = true; render(); } }, 30000));

/* capacidades do Claude (assistente e salvar arquivos) */
if (window.claude && typeof window.claude.use === "function") {
  window.claude.use("sample").then(s => { SAMPLE = s; if (CUR === "conversa") render(); }).catch(() => { });
  window.claude.use("downloads").then(d => { DL = d; }).catch(() => { });
}
render();
initCloud();


return function stopRespira() {
  __stopped = true;
  for (const [t, type, fn, opts] of __listeners) t.removeEventListener(type, fn, opts);
  __timers.forEach(clearInterval);
  clearTimeout(pushT);
  try { closeMic(); } catch (e) { }
  try { clearInterval(R.iv); clearInterval(ACT._civ); } catch (e) { }
  for (const get of [() => CLOUD.retUnsub, () => MD.unsubF, () => MD.unsubV, () => CT.unsub]) { try { const u = get(); if (u) u(); } catch (e) { } }
  try { CLOUD.retUnsub = MD.unsubF = MD.unsubV = null; CT.unsub = null; } catch (e) { }
  document.body.classList.remove("wide", "medico", "no-tabs");
};
}
