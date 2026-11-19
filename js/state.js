/**
 * state.js — the simulation. Pure-ish model: mutate state, emit events.
 * No DOM, no canvas. The renderer and UI subscribe to what happens here.
 */

import {
  PILINGS,
  DILEMMAS,
  FREE_ACTIONS,
  STORMS,
  SEASONS,
  DAYS_PER_SEASON,
  REFLECTIONS,
} from './data.js';

export const SAVE_KEY = 'twfb.save.v1';
export const TOTAL_DAYS = SEASONS.length * DAYS_PER_SEASON;
export const STORM_DAYS = SEASONS.map((_, i) => i * DAYS_PER_SEASON + DAYS_PER_SEASON - 1);
export const HOURS_PER_DAY = 10;
export const MAX_SAND = 100;
export const MAX_DEPTH = 100;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function createState() {
  const pilings = {};
  for (const p of PILINGS) pilings[p.id] = { depth: 0, cracked: 0 };
  return {
    version: 1,
    day: 0,
    hours: HOURS_PER_DAY,
    influence: 0,
    sand: 0,
    stress: 0,
    pilings,
    deck: [],
    log: [],
    history: [],
    reflections: [],
    stormsSurvived: 0,
    collapsed: 0,
    sheltered: 0,
    peakInfluence: 0,
    over: false,
    speed: 1,
    lastStormReport: null,
  };
}

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

/** Per-piling holding force. Cracks cut it hard. */
export function pilingForce(p) {
  if (!p) return 0;
  const mult = p.cracked >= 2 ? 0.12 : p.cracked === 1 ? 0.45 : 1;
  return p.depth * mult;
}

/** Average effective depth across the seven pilings: 0-100. */
export function foundationDepth(state) {
  const total = PILINGS.reduce((sum, p) => sum + pilingForce(state.pilings[p.id]), 0);
  return total / PILINGS.length;
}

export function rawDepth(state) {
  const total = PILINGS.reduce((sum, p) => sum + state.pilings[p.id].depth, 0);
  return total / PILINGS.length;
}

export function crackedCount(state) {
  return PILINGS.filter((p) => state.pilings[p.id].cracked > 0).length;
}

export function sandPenalty(state) {
  return clamp(state.sand / 55, 0, 0.5);
}

/** Load the structure must carry from a given storm. */
export function stormLoad(state, storm, sIdx) {
  // A taller house catches more wind, so outward structure adds load.
  const power = storm.power * 26 * (1 + 0.34 * sIdx + 0.1 * sIdx * sIdx);
  const heightLoad = state.influence * 0.7;
  const sandLoad = state.sand * 1.9 * storm.sandWeight;
  return power + heightLoad + sandLoad;
}

/** Holding force available against a storm. */
export function stormDefense(state) {
  const penalty = sandPenalty(state);
  const stressDrag = clamp(state.stress / 220, 0, 0.35);
  return foundationDepth(state) * (1 - penalty) * (1 - stressDrag);
}

/** 0-100 readiness. 50 is break-even. */
export function readiness(state) {
  const idx = STORM_DAYS.findIndex((d) => d >= state.day);
  if (idx < 0) return 100;
  const load = stormLoad(state, STORMS[idx], idx);
  const def = stormDefense(state);
  return clamp((def / Math.max(load, 1)) * 50, 0, 100);
}

export function daysUntilStorm(state) {
  const next = STORM_DAYS.find((d) => d >= state.day);
  return next === undefined ? 0 : next - state.day + 1;
}

export function seasonIndex(state) {
  return Math.min(SEASONS.length - 1, Math.floor(state.day / DAYS_PER_SEASON));
}

export function isStormDay(state) {
  return STORM_DAYS.includes(state.day);
}

/* ------------------------------------------------------------------ */
/* Engine                                                              */
/* ------------------------------------------------------------------ */

export function createEngine() {
  const listeners = new Set();
  const state = createState();

  const emit = (type, payload = {}) => {
    for (const fn of listeners) fn(type, payload, state);
  };

  const on = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  const log = (text, tone = '') => {
    state.log.unshift({ text, tone, day: state.day });
    if (state.log.length > 80) state.log.pop();
    emit('log', { text, tone });
  };

  const applyEffects = (effects, source) => {
    const e = effects || {};
    const summary = { hours: 0, rock: {}, sand: 0, influence: 0, stress: 0 };

    if (e.hours) {
      state.hours = clamp(state.hours - e.hours, 0, 999);
      summary.hours = e.hours;
    }

    if (e.rock) {
      for (const [id, amt] of Object.entries(e.rock)) {
        const p = state.pilings[id];
        if (!p) continue;
        const before = p.depth;
        // The deeper a piling goes, the harder each further foot is to dig.
        const resistance = clamp(1 - Math.pow(p.depth / MAX_DEPTH, 1.25) * 0.92, 0.09, 1);
        p.depth = clamp(p.depth + amt * resistance, 0, MAX_DEPTH);
        // Deep obedience grinds out cracks in that piling.
        if (amt > 0 && p.cracked > 0 && p.depth >= 45) p.cracked -= 1;
        summary.rock[id] = p.depth - before;
      }
    }

    if (e.sand) {
      state.sand = clamp(state.sand + e.sand, 0, MAX_SAND);
      summary.sand = e.sand;
    }

    if (e.influence) {
      state.influence = Math.max(0, state.influence + e.influence);
      state.peakInfluence = Math.max(state.peakInfluence, state.influence);
      summary.influence = e.influence;
    }

    if (e.stress) {
      state.stress = clamp(state.stress + e.stress * 6, 0, 100);
      summary.stress = e.stress;
    }

    emit('effects', { summary, source });
    return summary;
  };

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const drawDeck = () => {
    state.deck = shuffle(DILEMMAS).slice(0, 3).map((d) => d.id);
    emit('deck');
  };

  const dilemmaById = (id) => DILEMMAS.find((d) => d.id === id) || null;
  const canAfford = (cost) => state.hours >= cost;

  const chooseDilemma = (dilemmaId, choiceKey) => {
    const d = dilemmaById(dilemmaId);
    if (!d || state.over) return null;
    const c = d.choices.find((x) => x.key === choiceKey);
    if (!c || !canAfford(c.effects.hours || 0)) return null;

    const summary = applyEffects(c.effects, { kind: 'dilemma', id: d.id, choice: c.key });
    log(c.result, c.tone);

    state.deck = state.deck.filter((id) => id !== d.id);
    if (state.deck.length < 3) {
      const used = new Set(state.deck);
      const refill = shuffle(DILEMMAS.filter((x) => !used.has(x.id) && x.id !== d.id));
      state.deck = state.deck.concat(refill.slice(0, 3 - state.deck.length).map((x) => x.id));
    }

    emit('choice', { dilemma: d, choice: c, summary });
    return summary;
  };

  const freeAction = (actionId) => {
    const a = FREE_ACTIONS.find((x) => x.id === actionId);
    if (!a || state.over || !canAfford(a.cost)) return null;
    const summary = applyEffects({ ...a.effects, hours: a.cost }, { kind: 'free', id: a.id });
    log(a.log, 'rock');
    emit('freeAction', { action: a, summary });
    return summary;
  };

  const advanceDay = () => {
    if (state.over) return { storm: null };
    state.day += 1;
    state.hours = HOURS_PER_DAY;
    state.stress = Math.max(0, state.stress - 8);
    drawDeck();

    let stormResult = null;
    if (isStormDay(state)) stormResult = resolveStorm();
    else emit('day', { day: state.day });
    return { storm: stormResult };
  };

  const resolveStorm = () => {
    const idx = seasonIndex(state);
    const storm = STORMS[idx];
    const load = stormLoad(state, storm, idx);
    const defense = stormDefense(state);
    const ratio = defense / Math.max(load, 1);

    const totalDepth = Math.max(1, PILINGS.reduce((s, q) => s + state.pilings[q.id].depth, 0));
    const cracked = [];
    const held = [];

    for (const p of PILINGS) {
      const ps = state.pilings[p.id];
      const share = ps.depth / totalDepth;
      const localLoad = (load * (0.45 + 0.55 * share)) / 7;
      const localDef = pilingForce(ps) * (1 - sandPenalty(state));
      if (localDef < localLoad * 0.92) {
        const severity = localDef < localLoad * 0.5 ? 2 : 1;
        if (severity > ps.cracked) {
          ps.cracked = severity;
          cracked.push({ id: p.id, name: p.name, severity });
        }
      } else {
        held.push({ id: p.id, name: p.name });
      }
    }

    const survived = ratio >= 0.62 && cracked.length < 4;
    const partial = !survived && ratio >= 0.32;

    if (survived) {
      state.stormsSurvived += 1;
      if (ratio >= 1.05) {
        state.sheltered += 1;
        log(`The ${storm.name.toLowerCase()} struck. Your house held — and sheltered neighbors.`, 'rock');
      } else {
        log(`The ${storm.name.toLowerCase()} struck. The house held, but the walls groaned.`, 'gold');
      }
    } else if (partial) {
      state.influence = Math.round(state.influence * 0.55);
      log(`The ${storm.name.toLowerCase()} cracked the structure. Part of what you built came down.`, 'bad');
    } else {
      state.collapsed += 1;
      state.influence = Math.round(state.influence * 0.2);
      state.sand = clamp(state.sand + 8, 0, MAX_SAND);
      log(`The ${storm.name.toLowerCase()} brought the house down. Only the deep pilings remain.`, 'bad');
    }

    // Floodwaters wash some fill out of the cutaway.
    state.sand = clamp(Math.round(state.sand * 0.82), 0, MAX_SAND);
    state.stress = 0;

    const report = {
      storm,
      seasonIndex: idx,
      load: Math.round(load * 10) / 10,
      defense: Math.round(defense * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
      outcome: survived ? (ratio >= 1.05 ? 'sheltered' : 'held') : partial ? 'cracked' : 'collapsed',
      cracked,
      held,
      reflection: storm.reflection,
      verse: storm.verse,
      questions: REFLECTIONS,
      day: state.day,
    };

    state.history.push({
      day: state.day,
      storm: storm.id,
      outcome: report.outcome,
      ratio: report.ratio,
      cracked: cracked.map((c) => c.id),
    });
    state.lastStormReport = report;
    if (state.day >= TOTAL_DAYS - 1) state.over = true;

    emit('storm', { report });
    return report;
  };

  const restore = (pilingId) => {
    const p = state.pilings[pilingId];
    if (!p || p.cracked === 0 || !canAfford(3)) return false;
    p.cracked -= 1;
    p.depth = clamp(p.depth + 6, 0, MAX_DEPTH);
    state.sand = clamp(state.sand - 7, 0, MAX_SAND);
    state.hours -= 3;
    log('You cleared the rubble, confessed, and repoured the piling deeper. Grace is structural.', 'rock');
    emit('restore', { pilingId, depth: p.depth });
    return true;
  };

  const clearSand = () => {
    if (!canAfford(2) || state.sand <= 0) return false;
    state.hours -= 2;
    const removed = Math.min(state.sand, 12);
    state.sand -= removed;
    state.pilings.repentance.depth = clamp(state.pilings.repentance.depth + 5, 0, MAX_DEPTH);
    log(`You swept ${removed} units of fill out of the foundation and repented of the shortcuts.`, 'rock');
    emit('clearSand', { removed });
    return true;
  };

  const save = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
      emit('saved');
      return true;
    } catch {
      return false;
    }
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.assign(state, createState(), data);
      for (const p of PILINGS) {
        if (!state.pilings[p.id]) state.pilings[p.id] = { depth: 0, cracked: 0 };
      }
      if (!Array.isArray(state.deck) || state.deck.length === 0) drawDeck();
      emit('loaded');
      return true;
    } catch {
      return false;
    }
  };

  const reset = () => {
    Object.assign(state, createState());
    drawDeck();
    emit('reset');
  };

  drawDeck();

  return {
    state,
    on,
    emit,
    log,
    chooseDilemma,
    freeAction,
    advanceDay,
    restore,
    clearSand,
    save,
    load,
    reset,
    drawDeck,
    dilemmaById,
    canAfford,
  };
}