const suits = [
  { id: "s", symbol: "♠", name: "黑桃", color: "black" },
  { id: "h", symbol: "♥", name: "红桃", color: "red" },
  { id: "d", symbol: "♦", name: "方块", color: "red" },
  { id: "c", symbol: "♣", name: "梅花", color: "black" }
];
const ranks = [
  { id: 14, label: "A" }, { id: 13, label: "K" }, { id: 12, label: "Q" },
  { id: 11, label: "J" }, { id: 10, label: "10" }, { id: 9, label: "9" },
  { id: 8, label: "8" }, { id: 7, label: "7" }, { id: 6, label: "6" },
  { id: 5, label: "5" }, { id: 4, label: "4" }, { id: 3, label: "3" },
  { id: 2, label: "2" }
];
const handNames = ["高牌", "一对", "两对", "三条", "顺子", "同花", "葫芦", "四条", "同花顺"];
const labelMap = {
  "NOTHING": "高牌",
  "PAIR": "一对",
  "TWO PAIR": "两对",
  "THREE OF A KIND": "三条",
  "STRAIGHT": "顺子",
  "FLUSH": "同花",
  "FULL HOUSE": "葫芦",
  "FOUR OF A KIND": "四条",
  "STRAIGHT FLUSH": "同花顺",
  "ROYAL FLUSH": "皇家同花顺"
};

const state = {
  mode: "hero",
  hero: [],
  board: [],
  model: new Map(),
  rows: 0
};

const $ = (id) => document.getElementById(id);
const fullDeck = () => suits.flatMap(s => ranks.map(r => ({ suit: s.id, rank: r.id })));
const cardId = c => `${c.rank}${c.suit}`;
const rankLabel = rank => ranks.find(r => r.id === rank)?.label || String(rank);
const cardText = c => `${rankLabel(c.rank)}${suits.find(s => s.id === c.suit).symbol}`;
const pct = x => `${(x * 100).toFixed(1)}%`;

function combinations(items, k) {
  const out = [];
  const rec = (start, acc) => {
    if (acc.length === k) {
      out.push(acc.slice());
      return;
    }
    for (let i = start; i <= items.length - (k - acc.length); i++) {
      acc.push(items[i]);
      rec(i + 1, acc);
      acc.pop();
    }
  };
  rec(0, []);
  return out;
}

function evaluateFive(cards) {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const byRank = new Map();
  for (const card of sorted) byRank.set(card.rank, [...(byRank.get(card.rank) || []), card]);
  const groups = [...byRank.entries()]
    .map(([rank, group]) => ({ rank, count: group.length }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);
  const flush = new Set(cards.map(c => c.suit)).size === 1;
  let uniq = [...new Set(sorted.map(c => c.rank))].sort((a, b) => b - a);
  if (uniq.includes(14)) uniq.push(1);
  let straightHigh = 0;
  for (let i = 0; i <= uniq.length - 5; i++) {
    const run = uniq.slice(i, i + 5);
    if (run.every((v, idx) => idx === 0 || v === run[idx - 1] - 1)) {
      straightHigh = run[0];
      break;
    }
  }
  if (flush && straightHigh) return { cat: 8, name: "同花顺", ranks: [straightHigh], cards };
  if (groups[0].count === 4) return { cat: 7, name: "四条", ranks: [groups[0].rank, groups[1].rank], cards };
  if (groups[0].count === 3 && groups[1].count === 2) return { cat: 6, name: "葫芦", ranks: [groups[0].rank, groups[1].rank], cards };
  if (flush) return { cat: 5, name: "同花", ranks: sorted.map(c => c.rank), cards };
  if (straightHigh) return { cat: 4, name: "顺子", ranks: [straightHigh], cards };
  if (groups[0].count === 3) return { cat: 3, name: "三条", ranks: [groups[0].rank, ...groups.slice(1).map(g => g.rank)], cards };
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups.filter(g => g.count === 2).map(g => g.rank).sort((a, b) => b - a);
    const kicker = groups.find(g => g.count === 1).rank;
    return { cat: 2, name: "两对", ranks: [...pairs, kicker], cards };
  }
  if (groups[0].count === 2) return { cat: 1, name: "一对", ranks: [groups[0].rank, ...groups.slice(1).map(g => g.rank)], cards };
  return { cat: 0, name: "高牌", ranks: sorted.map(c => c.rank), cards };
}

function compareEval(a, b) {
  if (a.cat !== b.cat) return a.cat - b.cat;
  const len = Math.max(a.ranks.length, b.ranks.length);
  for (let i = 0; i < len; i++) {
    if ((a.ranks[i] || 0) !== (b.ranks[i] || 0)) return (a.ranks[i] || 0) - (b.ranks[i] || 0);
  }
  return 0;
}

function bestHand(cards) {
  if (cards.length < 5) return null;
  return combinations(cards, 5).map(evaluateFive).sort((a, b) => compareEval(b, a))[0];
}

function remainingDeck() {
  const used = new Set([...state.hero, ...state.board].map(cardId));
  return fullDeck().filter(c => !used.has(cardId(c)));
}

function shuffleCopy(cards) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function simulate() {
  if (state.hero.length !== 2) {
    updateStatus("请先选择两张手牌。");
    return;
  }
  const opponents = Math.max(1, Math.min(8, Number($("opponents").value) || 1));
  const iterations = Math.max(500, Math.min(50000, Number($("iterations").value) || 8000));
  let wins = 0, ties = 0, loses = 0;
  const dist = Array(handNames.length).fill(0);
  const needBoard = 5 - state.board.length;
  const needed = needBoard + opponents * 2;
  if (remainingDeck().length < needed) {
    updateStatus("剩余牌不足，请减少对手数或清空部分牌。");
    return;
  }
  for (let i = 0; i < iterations; i++) {
    const deck = shuffleCopy(remainingDeck());
    const board = state.board.concat(deck.splice(0, needBoard));
    const heroEval = bestHand(state.hero.concat(board));
    dist[heroEval.cat]++;
    let bestOpp = null;
    let tiedOpps = 0;
    for (let o = 0; o < opponents; o++) {
      const opp = deck.splice(0, 2);
      const ev = bestHand(opp.concat(board));
      const cmp = compareEval(ev, bestOpp || { cat: -1, ranks: [] });
      if (cmp > 0) {
        bestOpp = ev;
        tiedOpps = 1;
      } else if (cmp === 0) {
        tiedOpps++;
      }
    }
    const cmpHero = compareEval(heroEval, bestOpp);
    if (cmpHero > 0) wins++;
    else if (cmpHero === 0) ties += 1 / (tiedOpps + 1);
    else loses++;
  }
  renderResults({ wins, ties, loses, iterations, dist });
}

function handBucket() {
  if (state.hero.length !== 2) return "";
  const [a, b] = [...state.hero].sort((x, y) => y.rank - x.rank);
  const suited = a.suit === b.suit ? "s" : "o";
  return a.rank === b.rank ? `${rankLabel(a.rank)}${rankLabel(b.rank)}` : `${rankLabel(a.rank)}${rankLabel(b.rank)}${suited}`;
}

function currentStage() {
  return state.board.length === 0 ? "preflop" : state.board.length === 3 ? "flop" : state.board.length === 4 ? "turn" : state.board.length === 5 ? "river" : "partial";
}

function renderResults(result) {
  const winRate = result.wins / result.iterations;
  const tieRate = result.ties / result.iterations;
  const loseRate = result.loses / result.iterations;
  $("equity").textContent = pct(winRate + tieRate);
  $("winBar").style.width = pct(winRate);
  $("tieBar").style.width = pct(tieRate);
  $("loseBar").style.width = pct(loseRate);
  $("winText").textContent = pct(winRate);
  $("tieText").textContent = pct(tieRate);
  $("loseText").textContent = pct(loseRate);
  $("dist").innerHTML = result.dist.map((count, i) => {
    const ratio = count / result.iterations;
    return `<div class="dist-row"><span>${handNames[i]}</span><b style="width:${pct(ratio)}"></b><em>${pct(ratio)}</em></div>`;
  }).join("");
}

function updateStatus(msg) {
  $("modelStatus").textContent = msg;
}

function estimateOuts() {
  if (state.hero.length !== 2 || state.board.length < 3 || state.board.length >= 5) return "翻牌后且河牌前会显示一张牌改进 outs。";
  const current = bestHand(state.hero.concat(state.board));
  const outs = remainingDeck().filter(c => compareEval(bestHand(state.hero.concat(state.board, c)), current) > 0);
  const seen = new Map();
  for (const card of outs) seen.set(cardId(card), card);
  return `一张牌直接改进约 ${seen.size} 张：${[...seen.values()].slice(0, 12).map(cardText).join(" ")}${seen.size > 12 ? " ..." : ""}`;
}

function renderSlots(container, cards, size) {
  container.innerHTML = "";
  for (let i = 0; i < size; i++) {
    const card = cards[i];
    const el = document.createElement("div");
    if (!card) {
      el.className = "slot";
      el.textContent = "+";
    } else {
      const suit = suits.find(s => s.id === card.suit);
      el.className = `card ${suit.color}`;
      el.textContent = cardText(card);
      el.title = "点击移除";
      el.addEventListener("click", () => {
        state.hero = state.hero.filter(c => cardId(c) !== cardId(card));
        state.board = state.board.filter(c => cardId(c) !== cardId(card));
        render();
      });
    }
    container.appendChild(el);
  }
}

function renderMadeHand() {
  const all = state.hero.concat(state.board);
  const best = bestHand(all);
  if (!best) {
    $("madeHand").innerHTML = "<strong>等待牌面</strong><span>至少五张牌后可显示当前最佳牌。</span>";
  } else {
    $("madeHand").innerHTML = `<strong>${best.name}</strong><span>${best.cards.map(cardText).join(" ")}</span>`;
  }
  $("outs").textContent = estimateOuts();
  const stage = currentStage();
  const key = `${handBucket()}|${stage}`;
  const bucket = state.model.get(key);
  if (!bucket) {
    $("bucketWin").textContent = "-";
  } else {
    const [name, count] = Object.entries(bucket.counts).sort((a, b) => b[1] - a[1])[0];
    $("bucketWin").textContent = `${labelMap[name] || name} ${pct(count / bucket.n)}`;
  }
}

function render() {
  renderSlots($("heroCards"), state.hero, 2);
  renderSlots($("boardCards"), state.board, 5);
  const selected = new Set([...state.hero, ...state.board].map(cardId));
  for (const button of $("deck").querySelectorAll("button")) {
    button.classList.toggle("selected", selected.has(button.dataset.card));
    const full = state.mode === "hero" ? state.hero.length >= 2 : state.board.length >= 5;
    button.disabled = full && !selected.has(button.dataset.card);
  }
  $("modeHero").classList.toggle("active", state.mode === "hero");
  $("modeBoard").classList.toggle("active", state.mode === "board");
  renderMadeHand();
  $("rowCount").textContent = state.rows.toLocaleString("zh-CN");
  $("bucketCount").textContent = state.model.size.toLocaleString("zh-CN");
}

function buildDeck() {
  const deck = $("deck");
  for (const suit of suits) {
    for (const rank of ranks) {
      const card = { suit: suit.id, rank: rank.id };
      const button = document.createElement("button");
      button.className = `card ${suit.color}`;
      button.type = "button";
      button.dataset.card = cardId(card);
      button.textContent = cardText(card);
      button.addEventListener("click", () => {
        const id = cardId(card);
        if ([...state.hero, ...state.board].some(c => cardId(c) === id)) {
          state.hero = state.hero.filter(c => cardId(c) !== id);
          state.board = state.board.filter(c => cardId(c) !== id);
        } else if (state.mode === "hero" && state.hero.length < 2) {
          state.hero.push(card);
        } else if (state.mode === "board" && state.board.length < 5) {
          state.board.push(card);
        }
        render();
      });
      deck.appendChild(button);
    }
  }
}

function parseCardToken(token) {
  const t = token.trim().toUpperCase();
  const suitMap = { S: "s", H: "h", D: "d", C: "c", "♠": "s", "♥": "h", "♦": "d", "♣": "c" };
  const rankMap = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
  const suitFirst = suitMap[t.at(0)];
  const suitLast = suitMap[t.at(-1)];
  const suit = suitFirst || suitLast;
  const rankRaw = suitFirst ? t.slice(1) : t.slice(0, -1);
  const rank = rankMap[rankRaw] || Number(rankRaw);
  if (!suit || !rank) return null;
  return { suit, rank };
}

async function importCsv(file) {
  const text = await file.text();
  state.model.clear();
  state.rows = 0;
  const lines = text.split(/\r?\n/);
  const header = lines[0]?.split(",").map(h => h.trim().toLowerCase()) || [];
  for (const line of lines.slice(header.some(Boolean) ? 1 : 0)) {
    if (!line.trim()) continue;
    const cols = line.split(",").map(x => x.trim());
    const get = names => {
      for (const name of names) {
        const idx = header.indexOf(name);
        if (idx >= 0) return cols[idx];
      }
      return "";
    };
    if (header.includes("hand") && header.includes("result1")) {
      const hole = get(["hand"]).split(/\s+/).map(parseCardToken);
      const b = bucketFromCards(hole);
      if (!b) continue;
      for (const [stage, col] of [["flop", "result1"], ["turn", "result2"], ["river", "result3"]]) {
        const result = get([col]).trim().toUpperCase();
        if (!result) continue;
        const key = `${b}|${stage}`;
        if (!state.model.has(key)) state.model.set(key, { n: 0, counts: {} });
        const item = state.model.get(key);
        item.n++;
        item.counts[result] = (item.counts[result] || 0) + 1;
      }
      state.rows++;
      continue;
    }
    const hole = [get(["card1", "hole1", "p1", "c1"]), get(["card2", "hole2", "p2", "c2"])].map(parseCardToken);
    const result = get(["result", "win", "won", "winner", "label", "target"]);
    if (hole.some(x => !x) || result === "") continue;
    const key = `${bucketFromCards(hole)}|preflop`;
    if (!state.model.has(key)) state.model.set(key, { n: 0, win: 0 });
    const bucket = state.model.get(key);
    bucket.n++;
    bucket.win += /^(1|true|win|won)$/i.test(result) ? 1 : 0;
    state.rows++;
  }
  updateStatus(state.rows ? `已导入 ${state.rows.toLocaleString("zh-CN")} 行，建立经验牌力桶。` : "未识别到 Kaggle hand/result 或 card1/card2/result 等列，可先使用实时模拟。");
  render();
}

function bucketFromCards(cards) {
  if (!cards || cards.length !== 2 || cards.some(x => !x)) return "";
  const sorted = [...cards].sort((x, y) => y.rank - x.rank);
  const [a, b] = sorted;
  if (a.rank === b.rank) return `${rankLabel(a.rank)}${rankLabel(b.rank)}`;
  return `${rankLabel(a.rank)}${rankLabel(b.rank)}${a.suit === b.suit ? "s" : "o"}`;
}

async function loadBuiltModel() {
  try {
    const response = await fetch("kaggle-model.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.model.clear();
    for (const [key, counts] of Object.entries(payload.buckets || {})) {
      const n = Object.values(counts).reduce((sum, value) => sum + value, 0);
      state.model.set(key, { n, counts });
    }
    state.rows = payload.rows || 0;
    updateStatus(`已自动加载 Kaggle 聚合模型：${state.rows.toLocaleString("zh-CN")} 行。`);
    render();
  } catch (error) {
    updateStatus("未加载到 Kaggle 聚合模型。可导入 CSV，实时胜率仍可使用。");
  }
}

function randomDeal() {
  const deck = shuffleCopy(fullDeck());
  state.hero = deck.splice(0, 2);
  state.board = deck.splice(0, 5);
  render();
  simulate();
}

function init() {
  buildDeck();
  $("modeHero").addEventListener("click", () => { state.mode = "hero"; render(); });
  $("modeBoard").addEventListener("click", () => { state.mode = "board"; render(); });
  $("runSim").addEventListener("click", simulate);
  $("dealRandom").addEventListener("click", randomDeal);
  $("clearAll").addEventListener("click", () => { state.hero = []; state.board = []; render(); });
  $("csvFile").addEventListener("change", e => e.target.files[0] && importCsv(e.target.files[0]));
  $("dist").innerHTML = handNames.map(n => `<div class="dist-row"><span>${n}</span><b></b><em>-</em></div>`).join("");
  render();
  loadBuiltModel();
}

init();
