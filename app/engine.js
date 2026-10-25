// ===== Spend grouping engine: sample data, Word2Vec (CBOW / skip-gram), grouping =====
// Pure functions, no DOM. Works in the browser and in Node.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Sample data (fictional) ----------
// Each item is a list of slots; each slot lists the ways buyers write it.
// The first variant is the most common; abbreviations appear less often.
const SAMPLE_CATALOG = [
  { cat: "Fasteners", contract: "Coastal Industrial Supply", share: 0.2, items: [
    { price: [38, 70], slots: [["hex", "hx", "hexagon"], ["screw", "scrw", "scr"], ["m8", "m10", "m12"], ["stainless", "ss", "stnls"], ["box 100", "bx 100", "pk 100"]] },
    { price: [22, 45], slots: [["lock", "lck"], ["washer", "wshr", "wash"], ["m8", "m10", "m12"], ["stainless", "ss"], ["box 100", "bx 100"]] },
    { price: [30, 60], slots: [["anchor", "anch"], ["bolt", "blt"], ["concrete", "conc"], ["3/8 inch", "3/8in"], ["box 50", "bx 50"]] },
  ]},
  { cat: "Safety gear (PPE)", contract: "Sunshine Safety Co.", share: 0.25, items: [
    { price: [9, 16], slots: [["nitrile", "nitr", "nitril"], ["gloves", "glvs", "glove"], ["large", "lg", "medium", "med"], ["box 100", "bx 100"]] },
    { price: [8, 14], slots: [["safety", "sfty", "saf"], ["vest", "vst"], ["hi vis", "high visibility", "hivis"], ["class 2", "cl 2"], ["yellow", "ylw", "orange"]] },
    { price: [12, 25], slots: [["hard", "hrd"], ["hat", "ht"], ["type 1", "typ 1"], ["white", "wht", "yellow"]] },
    { price: [4, 9], slots: [["safety", "sfty"], ["glasses", "glss", "eyewear"], ["clear", "clr"], ["anti fog", "antifog"]] },
  ]},
  { cat: "Office supplies", contract: "Everglades Office Products", share: 0.88, items: [
    { price: [42, 58], slots: [["copy", "cpy"], ["paper", "ppr", "pap"], ["letter", "ltr", "8.5x11"], ["case 10 ream", "cs 10 rm"]] },
    { price: [65, 140], slots: [["toner", "tnr", "toner"], ["cartridge", "cart", "ctg"], ["black", "blk", "cyan"], ["high yield", "hy"]] },
    { price: [6, 14], slots: [["file", "fl"], ["folders", "fldr", "folder"], ["manila", "man"], ["letter", "ltr"], ["box 100", "bx 100"]] },
  ]},
  { cat: "IT hardware", contract: "Biscayne Tech Solutions", share: 0.92, items: [
    { price: [850, 1400], slots: [["laptop", "ltop", "notebook"], ["computer", "comp", "pc"], ["14 inch", "14in", "15 inch"], ["16gb", "16 gb"], ["ram"]] },
    { price: [160, 280], slots: [["monitor", "mntr", "mon"], ["24 inch", "24in", "27 inch"], ["led", "lcd"], ["display", "disp"]] },
    { price: [18, 40], slots: [["usb", "usb c"], ["keyboard", "kybd", "kbd"], ["wired", "wrd"], ["black", "blk"]] },
  ]},
  { cat: "Janitorial", contract: "Tropic Janitorial Supply", share: 0.4, items: [
    { price: [28, 48], slots: [["trash", "trsh", "can"], ["liners", "lnrs", "bags"], ["33 gal", "33gal", "55 gal"], ["black", "blk", "clear"], ["case 250", "cs 250"]] },
    { price: [14, 30], slots: [["disinfectant", "disinf", "dsnf"], ["cleaner", "clnr", "spray"], ["1 gal", "gallon", "gal"], ["case 4", "cs 4"]] },
    { price: [35, 60], slots: [["paper", "ppr"], ["towels", "twls", "towel"], ["roll", "rl"], ["case 12", "cs 12"]] },
  ]},
  { cat: "Fleet parts", contract: "Palmetto Fleet Parts", share: 0.7, items: [
    { price: [60, 140], slots: [["brake", "brk", "brke"], ["pads", "pd", "pad set"], ["front", "frt", "rear"], ["pickup", "pu", "sedan"]] },
    { price: [55, 90], slots: [["motor", "mtr", "eng"], ["oil", "oil"], ["5w30", "5w 30", "10w30"], ["case 12 quart", "cs 12 qt"]] },
    { price: [140, 260], slots: [["tire", "tyre", "tires"], ["all season", "all ssn", "a/s"], ["265/70r17", "245/75r16"]] },
    { price: [18, 40], slots: [["oil", "oil"], ["filter", "fltr", "flt"], ["spin on", "spinon"], ["pickup", "pu", "sedan"]] },
  ]},
  { cat: "Water and sewer pipe", contract: "Gulfstream Pipe & Supply", share: 0.85, items: [
    { price: [90, 240], slots: [["pvc", "pvc"], ["pipe", "pp", "pip"], ["schedule 40", "sch 40", "sch40"], ["4 inch", "4in", "6 inch"], ["20 ft", "20ft"]] },
    { price: [120, 380], slots: [["ductile", "duct", "di"], ["iron", "irn"], ["fitting", "ftg", "fttg"], ["8 inch", "8in", "12 inch"], ["mj", "mech joint"]] },
    { price: [45, 120], slots: [["gate", "gt"], ["valve", "vlv", "valv"], ["brass", "brs"], ["2 inch", "2in"]] },
  ]},
  { cat: "Landscaping", contract: "Keystone Landscape Supply", share: 0.35, items: [
    { price: [28, 45], slots: [["pine", "pn"], ["bark", "brk"], ["mulch", "mlch", "mulch"], ["cubic yard", "cu yd", "cy"]] },
    { price: [22, 40], slots: [["fertilizer", "fert", "fertlzr"], ["16-4-8", "16 4 8"], ["50 lb", "50lb"], ["bag", "bg"]] },
    { price: [8, 18], slots: [["sod", "sd"], ["st augustine", "st aug"], ["pallet", "plt"]] },
  ]},
  { cat: "Uniforms", contract: "Harbor Uniforms", share: 0.85, items: [
    { price: [18, 32], slots: [["uniform", "unif", "uni"], ["shirt", "shrt"], ["polo", "pl"], ["navy", "nvy", "white"], ["embroidered", "embr"]] },
    { price: [90, 160], slots: [["safety", "sfty"], ["boots", "bts", "boot"], ["steel toe", "stl toe"], ["size 10", "sz 10", "size 9"]] },
    { price: [24, 40], slots: [["work", "wrk"], ["pants", "pnts", "trousers"], ["navy", "nvy", "khaki"], ["32x32", "34x32"]] },
  ]},
];

const SAMPLE_DEPARTMENTS = [
  "Water & Sewer", "Transportation & Public Works", "Parks & Recreation", "Police",
  "Fire Rescue", "Internal Services", "Solid Waste", "Aviation", "Seaport",
  "Libraries", "Corrections", "Transit",
];

// Which departments buy from which categories (fictional but plausible).
const SAMPLE_BUYERS = {
  "Fasteners": ["Water & Sewer", "Transportation & Public Works", "Internal Services", "Aviation", "Seaport", "Transit", "Parks & Recreation"],
  "Safety gear (PPE)": ["Water & Sewer", "Transportation & Public Works", "Solid Waste", "Parks & Recreation", "Aviation", "Seaport", "Fire Rescue", "Corrections", "Transit"],
  "Office supplies": SAMPLE_DEPARTMENTS,
  "IT hardware": SAMPLE_DEPARTMENTS,
  "Janitorial": ["Internal Services", "Libraries", "Parks & Recreation", "Corrections", "Aviation", "Transit", "Police"],
  "Fleet parts": ["Internal Services", "Police", "Fire Rescue", "Solid Waste", "Transit", "Water & Sewer"],
  "Water and sewer pipe": ["Water & Sewer", "Transportation & Public Works", "Parks & Recreation"],
  "Landscaping": ["Parks & Recreation", "Transportation & Public Works", "Aviation", "Seaport", "Libraries"],
  "Uniforms": ["Police", "Fire Rescue", "Corrections", "Solid Waste", "Transit", "Parks & Recreation", "Water & Sewer"],
};

const SAMPLE_GENERALISTS = ["Atlantic General Supply", "Metro Wholesale Co.", "Southern Distributors", "Bayside Supply House"];
const SAMPLE_SPECIALISTS = {
  "Fasteners": ["Bayfront Fasteners", "Dade Bolt & Screw"],
  "Safety gear (PPE)": ["SafeWork Supply", "Redline Safety"],
  "Office supplies": ["Paperworks Direct"],
  "IT hardware": ["Coral Computer Center"],
  "Janitorial": ["CleanPro Distributors", "Sparkle Supply"],
  "Fleet parts": ["Route 1 Auto Parts", "Fleetline Parts"],
  "Water and sewer pipe": ["Utility Pipe Co."],
  "Landscaping": ["Green Acres Nursery", "Turfline Supply"],
  "Uniforms": ["Workwear Express"],
};

function pickWeighted(rng, variants) {
  // first variant ~60%, the rest share the remainder
  if (variants.length === 1) return variants[0];
  return rng() < 0.6 ? variants[0] : variants[1 + Math.floor(rng() * (variants.length - 1))];
}

function generateSample(nRows = 6000, seed = 7) {
  const rng = mulberry32(seed);
  const rows = [];
  // category weights roughly by how often they're bought
  const catWeights = [1.3, 1.6, 1.4, 0.7, 1.2, 1.1, 0.6, 0.7, 0.8];
  const totalW = catWeights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < nRows; i++) {
    let r = rng() * totalW, ci = 0;
    while (r > catWeights[ci]) { r -= catWeights[ci]; ci++; }
    const cat = SAMPLE_CATALOG[ci];
    const item = cat.items[Math.floor(rng() * cat.items.length)];
    let words = item.slots.map(s => pickWeighted(rng, s));
    // buyers sometimes drop a slot or swap the first two words
    if (rng() < 0.15 && words.length > 3) words.splice(2 + Math.floor(rng() * (words.length - 2)), 1);
    if (rng() < 0.12) [words[0], words[1]] = [words[1], words[0]];
    let desc = words.join(" ");
    desc = rng() < 0.5 ? desc.toUpperCase() : desc.replace(/\b\w/g, c => c.toUpperCase());
    const buyers = SAMPLE_BUYERS[cat.cat];
    const dept = buyers[Math.floor(rng() * buyers.length)];
    let vendor, contract = "";
    if (rng() < cat.share) {
      vendor = cat.contract;
      contract = "C-" + (1000 + ci * 37);
    } else {
      const pool = SAMPLE_SPECIALISTS[cat.cat].concat(SAMPLE_GENERALISTS);
      vendor = pool[Math.floor(rng() * pool.length)];
    }
    const qty = 1 + Math.floor(rng() * (item.price[1] > 500 ? 3 : 12));
    const unit = item.price[0] + rng() * (item.price[1] - item.price[0]);
    const month = 1 + Math.floor(rng() * 12);
    const day = 1 + Math.floor(rng() * 28);
    rows.push({
      date: `2025-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      department: dept,
      vendor,
      description: desc,
      amount: Math.round(qty * unit * 100) / 100,
      contract,
      _truth: cat.cat,
    });
  }
  return rows;
}

// ---------- Text ----------
const UNIT_WORDS = new Set(["box", "bx", "pk", "case", "cs", "ream", "rm", "roll", "rl", "bag", "bg", "pallet", "plt", "each", "ea", "gal", "lb", "ft", "inch", "in", "size", "sz", "the", "and", "for", "of", "with"]);

function tokenize(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9/.\-]+/g, " ").split(/\s+/)
    .map(t => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(t => t.length > 0);
}
function isNumberish(t) { return /^[0-9][0-9/.\-x]*$/.test(t); }

// ---------- Word2Vec ----------
// Options: dims, window, minCount, negative, epochs, sg (1 = skip-gram, 0 = CBOW), seed
function makeTrainer(sentences, opts) {
  const o = Object.assign({ dims: 50, window: 3, minCount: 3, negative: 5, epochs: 15, sg: 0, seed: 42, lr: 0.05 }, opts);
  const rng = mulberry32(o.seed);
  const counts = new Map();
  for (const s of sentences) for (const t of s) counts.set(t, (counts.get(t) || 0) + 1);
  const vocab = [...counts.entries()].filter(([, c]) => c >= o.minCount).sort((a, b) => b[1] - a[1]);
  const index = new Map(vocab.map(([w], i) => [w, i]));
  const V = vocab.length, D = o.dims;
  const W = new Float32Array(V * D), C = new Float32Array(V * D);
  for (let i = 0; i < W.length; i++) W[i] = (rng() - 0.5) / D;
  // negative-sampling table: counts^0.75
  const TABLE = 100000, table = new Int32Array(TABLE);
  let z = 0; for (const [, c] of vocab) z += Math.pow(c, 0.75);
  let acc = 0, wi = 0;
  for (let i = 0; i < V; i++) {
    acc += Math.pow(vocab[i][1], 0.75) / z;
    const end = Math.min(TABLE, Math.round(acc * TABLE));
    for (; wi < end; wi++) table[wi] = i;
  }
  for (; wi < TABLE; wi++) table[wi] = V - 1;
  const ids = sentences.map(s => s.map(t => index.has(t) ? index.get(t) : -1).filter(i => i >= 0)).filter(s => s.length > 1);
  const totalSteps = ids.reduce((a, s) => a + s.length, 0) * o.epochs;
  let step = 0, epoch = 0;
  const h = new Float32Array(D), grad = new Float32Array(D);
  const sig = x => 1 / (1 + Math.exp(-x));

  function update(inVec, inOff, target, label, alpha, gradAcc) {
    // inVec[inOff..] is the input vector; C[target] is the output vector
    let dot = 0; const t = target * D;
    for (let k = 0; k < D; k++) dot += inVec[inOff + k] * C[t + k];
    const g = (label - sig(dot)) * alpha;
    for (let k = 0; k < D; k++) { gradAcc[k] += g * C[t + k]; C[t + k] += g * inVec[inOff + k]; }
  }

  function runEpoch() {
    for (const s of ids) {
      for (let p = 0; p < s.length; p++) {
        const alpha = Math.max(o.lr * 0.0001, o.lr * (1 - step / totalSteps)); step++;
        const b = Math.floor(rng() * o.window);
        const lo = Math.max(0, p - o.window + b), hi = Math.min(s.length - 1, p + o.window - b);
        if (o.sg) {
          for (let q = lo; q <= hi; q++) {
            if (q === p) continue;
            const inOff = s[q] * D; grad.fill(0);
            update(W, inOff, s[p], 1, alpha, grad);
            for (let n = 0; n < o.negative; n++) { const neg = table[Math.floor(rng() * TABLE)]; if (neg !== s[p]) update(W, inOff, neg, 0, alpha, grad); }
            for (let k = 0; k < D; k++) W[inOff + k] += grad[k];
          }
        } else {
          h.fill(0); let n = 0;
          for (let q = lo; q <= hi; q++) { if (q === p) continue; const off = s[q] * D; for (let k = 0; k < D; k++) h[k] += W[off + k]; n++; }
          if (!n) continue;
          for (let k = 0; k < D; k++) h[k] /= n;
          grad.fill(0);
          update(h, 0, s[p], 1, alpha, grad);
          for (let m = 0; m < o.negative; m++) { const neg = table[Math.floor(rng() * TABLE)]; if (neg !== s[p]) update(h, 0, neg, 0, alpha, grad); }
          for (let q = lo; q <= hi; q++) { if (q === p) continue; const off = s[q] * D; for (let k = 0; k < D; k++) W[off + k] += grad[k]; }
        }
      }
    }
    epoch++;
  }

  function finish() {
    const N = new Float32Array(V * D);
    for (let i = 0; i < V; i++) {
      let nn = 0; for (let k = 0; k < D; k++) nn += W[i * D + k] ** 2;
      nn = Math.sqrt(nn) || 1;
      for (let k = 0; k < D; k++) N[i * D + k] = W[i * D + k] / nn;
    }
    return { vocab: vocab.map(v => v[0]), counts: vocab.map(v => v[1]), index, dims: D, vectors: N };
  }
  return { runEpoch, finish, get epoch() { return epoch; }, epochs: o.epochs, vocabSize: V };
}

function trainSync(sentences, opts) {
  const t = makeTrainer(sentences, opts);
  while (t.epoch < t.epochs) t.runEpoch();
  return t.finish();
}

function wordVec(model, w) { const i = model.index.get(w); return i === undefined ? null : model.vectors.subarray(i * model.dims, (i + 1) * model.dims); }
function cos(a, b) { let d = 0, na = 0, nb = 0; for (let k = 0; k < a.length; k++) { d += a[k] * b[k]; na += a[k] * a[k]; nb += b[k] * b[k]; } return d / (Math.sqrt(na * nb) || 1); }

function neighbors(model, w, topn = 8) {
  const v = wordVec(model, w); if (!v) return null;
  const out = [];
  for (let i = 0; i < model.vocab.length; i++) {
    if (model.vocab[i] === w) continue;
    out.push([model.vocab[i], cos(v, model.vectors.subarray(i * model.dims, (i + 1) * model.dims)), model.counts[i]]);
  }
  return out.sort((a, b) => b[1] - a[1]).slice(0, topn);
}

// a is a likely abbreviation of b: same first letter, shorter, letters appear in order
function isAbbrev(a, b) {
  if (a.length >= b.length || a[0] !== b[0] || a.length < 2 || isNumberish(a) || isNumberish(b)) return false;
  let j = 0; for (let i = 0; i < b.length && j < a.length; i++) if (b[i] === a[j]) j++;
  return j === a.length;
}

function findAbbreviations(model, minSim = 0.5) {
  const out = [];
  for (let i = 0; i < model.vocab.length; i++) {
    const a = model.vocab[i];
    if (a.length > 6 || isNumberish(a)) continue;
    const nb = neighbors(model, a, 12) || [];
    for (const [b, s, c] of nb) {
      if (s >= minSim && isAbbrev(a, b) && c > model.counts[i]) { out.push({ short: a, full: b, sim: s, shortCount: model.counts[i], fullCount: c }); break; }
    }
  }
  return out.sort((x, y) => y.sim - x.sim);
}

// ---------- Grouping ----------
function lineVectors(model, rows, tokensOf) {
  // IDF-weighted average of word vectors; unit words and numbers count less
  const df = new Map(); const N = rows.length;
  const toks = rows.map(r => tokensOf(r));
  for (const t of toks) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
  const D = model.dims;
  return toks.map(t => {
    const v = new Float32Array(D); let wsum = 0;
    for (const w of t) {
      const wv = wordVec(model, w); if (!wv) continue;
      let wt = Math.log(1 + N / (df.get(w) || 1));
      if (UNIT_WORDS.has(w)) wt *= 0.2;
      if (isNumberish(w)) wt *= 0.3;
      for (let k = 0; k < D; k++) v[k] += wt * wv[k];
      wsum += wt;
    }
    if (!wsum) return null;
    let n = 0; for (let k = 0; k < D; k++) n += v[k] * v[k]; n = Math.sqrt(n) || 1;
    for (let k = 0; k < D; k++) v[k] /= n;
    return v;
  });
}

// Groups unique descriptions. Leader clustering by spend, then two refinement passes.
function groupDescriptions(model, rows, threshold = 0.7, skipWords = new Set()) {
  const byDesc = new Map();
  for (const r of rows) {
    const key = tokenize(r.description).join(" ");
    if (!key) continue;
    if (!byDesc.has(key)) byDesc.set(key, { key, text: r.description, rows: [], spend: 0 });
    const u = byDesc.get(key); u.rows.push(r); u.spend += r.amount || 0;
  }
  const uniq = [...byDesc.values()].sort((a, b) => b.spend - a.spend || b.rows.length - a.rows.length);
  const vecs = lineVectors(model, uniq, u => tokenize(u.key));
  const D = model.dims;
  let centers = [];
  const assign = new Int32Array(uniq.length).fill(-1);
  const sims = new Float32Array(uniq.length);
  uniq.forEach((u, i) => {
    const v = vecs[i]; if (!v) return;
    let best = -1, bs = -2;
    for (let c = 0; c < centers.length; c++) { const s = cos(v, centers[c]); if (s > bs) { bs = s; best = c; } }
    if (best >= 0 && bs >= threshold) assign[i] = best;
    else { centers.push(Float32Array.from(v)); assign[i] = centers.length - 1; }
  });
  for (let pass = 0; pass < 2; pass++) {
    // recompute centers, weighted by row count
    const sum = centers.map(() => new Float32Array(D));
    uniq.forEach((u, i) => { if (assign[i] < 0) return; const w = Math.sqrt(u.rows.length); for (let k = 0; k < D; k++) sum[assign[i]][k] += w * vecs[i][k]; });
    centers = sum.map(s => { let n = 0; for (const x of s) n += x * x; n = Math.sqrt(n) || 1; return s.map(x => x / n); });
    uniq.forEach((u, i) => {
      const v = vecs[i]; if (!v) return;
      let best = assign[i], bs = cos(v, centers[best]);
      for (let c = 0; c < centers.length; c++) { const s = cos(v, centers[c]); if (s > bs) { bs = s; best = c; } }
      assign[i] = best; sims[i] = bs;
    });
  }
  const groups = new Map();
  uniq.forEach((u, i) => {
    const g = assign[i] < 0 ? -1 : assign[i];
    if (!groups.has(g)) groups.set(g, { id: g, members: [] });
    groups.get(g).members.push({ ...u, sim: sims[i] });
  });
  const out = [];
  for (const g of groups.values()) {
    const rowsAll = g.members.flatMap(m => m.rows);
    const spend = rowsAll.reduce((a, r) => a + (r.amount || 0), 0);
    const offSpend = rowsAll.filter(r => !r.contract).reduce((a, r) => a + (r.amount || 0), 0);
    const depts = new Set(rowsAll.map(r => r.department).filter(Boolean));
    const vendors = new Set(rowsAll.map(r => r.vendor).filter(Boolean));
    // label: the most frequent meaningful words in the group
    const wc = new Map(), wpos = new Map();
    for (const m of g.members) tokenize(m.key).forEach((w, p) => {
      if (UNIT_WORDS.has(w) || isNumberish(w) || w.length < 2 || skipWords.has(w)) return;
      wc.set(w, (wc.get(w) || 0) + m.rows.length);
      wpos.set(w, (wpos.get(w) || 0) + p * m.rows.length);
    });
    // top three words, shown in the order buyers usually write them
    const label = [...wc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .sort((a, b) => wpos.get(a[0]) / a[1] - wpos.get(b[0]) / b[1]).map(e => e[0]).join(" ");
    g.members.sort((a, b) => b.rows.length - a.rows.length);
    out.push({ id: g.id, label: label || g.members[0].key, members: g.members, lines: rowsAll.length, spend, offSpend,
      departments: [...depts], vendors: [...vendors], unassigned: g.id === -1 });
  }
  return out.sort((a, b) => b.spend - a.spend);
}

// A group is a consolidation opportunity when several departments buy it from several vendors, mostly off contract.
function scoreOpportunity(g) {
  const offShare = g.spend ? g.offSpend / g.spend : 0;
  const flag = g.departments.length >= 4 && g.vendors.length >= 3 && offShare >= 0.5 && g.lines >= 20;
  return { offShare, flag };
}

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(x => x.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field); if (row.some(x => x.trim() !== "")) rows.push(row);
  return rows;
}

function parseAmount(s) {
  if (s == null) return 0;
  const t = String(s).replace(/[$,\s]/g, "");
  const neg = /^\(.*\)$/.test(t);
  const n = parseFloat(t.replace(/[()]/g, ""));
  return isFinite(n) ? (neg ? -n : n) : 0;
}

// Guess which column holds what, from header names
function guessColumns(header) {
  const h = header.map(x => x.toLowerCase().trim());
  const find = res => { for (const re of res) { const i = h.findIndex(x => re.test(x)); if (i >= 0) return i; } return -1; };
  return {
    description: find([/desc/, /item/, /line/, /product/, /material/, /text/]),
    amount: find([/amount/, /total/, /spend/, /extended/, /cost/, /price/, /value/]),
    department: find([/dept/, /department/, /agency/, /business unit/, /division/, /cost center/]),
    vendor: find([/vendor/, /supplier/, /payee/]),
    contract: find([/contract/, /agreement/, /award/]),
  };
}

if (typeof module !== "undefined") module.exports = {
  mulberry32, generateSample, tokenize, makeTrainer, trainSync, neighbors, findAbbreviations,
  groupDescriptions, scoreOpportunity, parseCSV, parseAmount, guessColumns, isAbbrev,
};
