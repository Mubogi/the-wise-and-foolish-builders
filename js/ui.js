/**
 * ui.js — DOM layer. Renders meters, deck, pilings, journal, modals.
 * Pure view: reads state, calls engine methods, never mutates state directly.
 */

import {
  PILINGS,
  PILING_BY_ID,
  FREE_ACTIONS,
  SEASONS,
  DAYS_PER_SEASON,
  VERSE_TICKER,
  HELP_HTML,
  REFLECTIONS,
} from './data.js';
import {
  TOTAL_DAYS,
  HOURS_PER_DAY,
  STORM_DAYS,
  foundationDepth,
  rawDepth,
  crackedCount,
  readiness,
  daysUntilStorm,
  seasonIndex,
} from './state.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createUI(engine, scene) {
  const state = engine.state;
  const refs = {
    seasonName: $('seasonName'),
    dayLabel: $('dayLabel'),
    seasonTrack: $('seasonTrack'),
    deck: $('deck'),
    freeActions: $('freeActions'),
    meters: $('meters'),
    pilings: $('pilings'),
    pilingHint: $('pilingHint'),
    logList: $('logList'),
    weatherText: $('weatherText'),
    weatherChip: $('weatherChip'),
    forecastFill: $('forecastFill'),
    forecastText: $('forecastText'),
    stormBanner: $('stormBanner'),
    stormName: $('stormName'),
    stormSub: $('stormSub'),
    toast: $('collapseToast'),
    tickerText: $('tickerText'),
    modalRoot: $('modalRoot'),
    modal: $('modal'),
    modalTitle: $('modalTitle'),
    modalSub: $('modalSub'),
    modalBody: $('modalBody'),
    modalFoot: $('modalFoot'),
    speed: $('speedControl'),
  };

  let toastTimer = null;
  let tickerTimer = null;
  let lastReadiness = 0;
  let modalOpen = false;

  /* ---------------------------------------------------------------- */
  /* Toasts & ticker                                                  */
  /* ---------------------------------------------------------------- */

  const toast = (text, ms = 3200) => {
    refs.toast.textContent = text;
    refs.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      refs.toast.hidden = true;
    }, ms);
  };

  const rotateTicker = () => {
    let i = Math.floor(Math.random() * VERSE_TICKER.length);
    clearInterval(tickerTimer);
    tickerTimer = setInterval(() => {
      i = (i + 1) % VERSE_TICKER.length;
      refs.tickerText.style.opacity = '0';
      setTimeout(() => {
        refs.tickerText.textContent = VERSE_TICKER[i];
        refs.tickerText.style.opacity = '1';
      }, 380);
    }, 11000);
  };

  /* ---------------------------------------------------------------- */
  /* Header                                                           */
  /* ---------------------------------------------------------------- */

  const renderHeader = () => {
    const sIdx = seasonIndex(state);
    refs.seasonName.textContent = SEASONS[sIdx].name;
    refs.dayLabel.textContent = `Day ${Math.min(state.day + 1, TOTAL_DAYS)} of ${TOTAL_DAYS} · ${state.hours}h left`;

    if (refs.seasonTrack.children.length !== TOTAL_DAYS) {
      refs.seasonTrack.innerHTML = '';
      for (let i = 0; i < TOTAL_DAYS; i++) refs.seasonTrack.appendChild(el('i'));
    }
    Array.from(refs.seasonTrack.children).forEach((n, i) => {
      n.className = '';
      if (STORM_DAYS.includes(i)) n.classList.add('storm');
      if (i < state.day) n.classList.add('done');
      if (i === state.day) n.classList.add('now');
    });
  };

  /* ---------------------------------------------------------------- */
  /* Meters                                                           */
  /* ---------------------------------------------------------------- */

  const METER_DEFS = [
    {
      id: 'hours',
      name: 'Time & Energy',
      color: '#6fbf8f',
      max: HOURS_PER_DAY,
      sub: 'Allocate between the visible and the hidden',
      value: () => state.hours,
    },
    {
      id: 'depth',
      name: 'Foundation Depth',
      color: '#8fb8e8',
      max: 100,
      sub: 'Hidden obedience driven into bedrock',
      value: () => foundationDepth(state),
    },
    {
      id: 'influence',
      name: 'Outward Structure',
      color: '#d4a24a',
      max: 130,
      sub: 'Visible ministry, work, and family life',
      value: () => state.influence,
    },
    {
      id: 'sand',
      name: 'Sand / Shortcuts',
      color: '#d8bd84',
      max: 100,
      sub: 'Warning metric — soft fill under the slab',
      value: () => state.sand,
      invert: true,
    },
    {
      id: 'stress',
      name: 'Structural Stress',
      color: '#d9574f',
      max: 100,
      sub: 'Strain carried by the walls right now',
      value: () => state.stress,
      invert: true,
    },
  ];

  const buildMeters = () => {
    refs.meters.innerHTML = '';
    for (const m of METER_DEFS) {
      const wrap = el('div', 'meter');
      wrap.dataset.id = m.id;
      wrap.innerHTML = `
        <div class="meter-top">
          <span class="meter-name"><i style="background:${m.color}"></i>${m.name}</span>
          <span class="meter-val"></span>
        </div>
        <div class="meter-bar"><i style="background:${m.color}"></i></div>
        <div class="meter-sub">${m.sub}</div>`;
      refs.meters.appendChild(wrap);
    }
  };

  const renderMeters = (changed = []) => {
    for (const m of METER_DEFS) {
      const node = refs.meters.querySelector(`.meter[data-id="${m.id}"]`);
      if (!node) continue;
      const v = m.value();
      const pct = clamp((v / m.max) * 100, 0, 100);
      const fill = node.querySelector('.meter-bar i');
      fill.style.width = `${pct}%`;
      const valNode = node.querySelector('.meter-val');
      if (m.id === 'hours') valNode.textContent = `${Math.round(v)} / ${HOURS_PER_DAY}h`;
      else valNode.textContent = Math.round(v);
      if (m.invert && v > m.max * 0.55) {
        fill.style.background = m.id === 'sand' ? '#c9a15c' : '#d9574f';
      } else {
        fill.style.background = m.color;
      }
      if (changed.includes(m.id)) {
        node.classList.remove('flash');
        void node.offsetWidth;
        node.classList.add('flash');
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Pilings panel                                                    */
  /* ---------------------------------------------------------------- */

  const buildPilings = () => {
    refs.pilings.innerHTML = '';
    for (const p of PILINGS) {
      const node = el('div', 'piling');
      node.dataset.id = p.id;
      node.innerHTML = `
        <div class="p-shaft"><div class="p-fill"></div></div>
        <div class="p-ico">${p.icon}</div>`;
      node.title = `${p.name} — click to read the blueprint`;
      node.addEventListener('click', () => openBlueprint(p.id));
      refs.pilings.appendChild(node);
    }
  };

  const renderPilings = () => {
    let anchored = 0;
    for (const p of PILINGS) {
      const node = refs.pilings.querySelector(`.piling[data-id="${p.id}"]`);
      if (!node) continue;
      const ps = state.pilings[p.id];
      const fill = node.querySelector('.p-fill');
      fill.style.height = `${clamp(ps.depth, 0, 100)}%`;
      node.classList.toggle('deep', ps.depth >= 62 && ps.cracked === 0);
      node.classList.toggle('cracked', ps.cracked > 0);
      if (ps.depth >= 62 && ps.cracked === 0) anchored++;
    }
    refs.pilingHint.textContent = `${anchored}/${PILINGS.length} in rock`;
  };

  /* ---------------------------------------------------------------- */
  /* Weather & forecast                                               */
  /* ---------------------------------------------------------------- */

  const renderWeather = () => {
    const days = daysUntilStorm(state);
    const rd = readiness(state);
    const rising = rd > lastReadiness + 0.4;
    const falling = rd < lastReadiness - 0.4;
    lastReadiness = rd;

    refs.forecastFill.style.width = `${rd}%`;
    if (days <= 1) refs.forecastText.textContent = 'Storm at the door';
    else refs.forecastText.textContent = `${days} day${days === 1 ? '' : 's'} until testing`;

    let label = 'Clear skies';
    let cls = '';
    if (days <= 1) {
      label = 'Storm imminent';
      cls = 'stormy';
    } else if (days === 2) {
      label = 'Clouds gathering';
      cls = 'rainy';
    } else if (days === 3) {
      label = 'Winds shifting';
      cls = 'rainy';
    }
    if (!scene.storm.active) {
      refs.weatherText.textContent = label;
      refs.weatherChip.className = `weather-chip ${cls}`;
    }

    const sub = refs.forecastText;
    sub.title = rising ? 'Improving' : falling ? 'Worsening' : '';
  };

  /* ---------------------------------------------------------------- */
  /* Deck                                                             */
  /* ---------------------------------------------------------------- */

  const effectChips = (effects) => {
    const chips = [];
    if (effects.rock) {
      for (const [id, amt] of Object.entries(effects.rock)) {
        const p = PILING_BY_ID[id];
        if (!p) continue;
        chips.push(`<span class="eff good">+${amt} ${p.name}</span>`);
      }
    }
    if (effects.sand) {
      chips.push(
        `<span class="eff ${effects.sand > 0 ? 'bad' : 'good'}">${effects.sand > 0 ? '+' : ''}${effects.sand} sand</span>`
      );
    }
    if (effects.influence) {
      chips.push(
        `<span class="eff ${effects.influence > 0 ? 'neutral' : 'bad'}">${effects.influence > 0 ? '+' : ''}${effects.influence} structure</span>`
      );
    }
    if (effects.stress) chips.push(`<span class="eff bad">+${effects.stress} stress</span>`);
    return chips.join('');
  };

  const renderDeck = () => {
    refs.deck.innerHTML = '';
    if (state.over) {
      const done = el('div', 'card');
      done.innerHTML = `<div class="card-tag">Complete</div><div class="card-title">The seasons are finished</div>
        <div class="card-body">Open your final report to see what stood.</div>`;
      refs.deck.appendChild(done);
      return;
    }

    state.deck.forEach((id, i) => {
      const d = engine.dilemmaById(id);
      if (!d) return;
      const cheapest = Math.min(...d.choices.map((c) => c.effects.hours || 0));
      const affordable = state.hours >= cheapest;
      const card = el('button', 'card');
      card.type = 'button';
      card.style.animationDelay = `${i * 60}ms`;
      if (!affordable) card.classList.add('locked');
      card.innerHTML = `
        <span class="card-tag">${d.tag}</span>
        <span class="card-title">${d.title}</span>
        <span class="card-body">${d.body}</span>
        <span class="card-meta">
          <span class="cost">${cheapest}h+</span>
          <span class="spacer"></span>
          <span class="card-open">${i + 1} · Decide</span>
        </span>`;
      card.addEventListener('click', () => openDilemma(d.id));
      refs.deck.appendChild(card);
    });
  };

  const renderFreeActions = () => {
    refs.freeActions.innerHTML = '';
    if (state.over) return;

    for (const a of FREE_ACTIONS) {
      const b = el('button', 'fa-btn');
      b.type = 'button';
      b.innerHTML = `${a.label} <span class="fa-cost">${a.cost}h</span>`;
      b.disabled = state.hours < a.cost;
      b.addEventListener('click', () => {
        const res = engine.freeAction(a.id);
        if (res) toast(a.log, 2400);
      });
      refs.freeActions.appendChild(b);
    }

    if (state.sand > 0) {
      const b = el('button', 'fa-btn storm');
      b.type = 'button';
      b.innerHTML = `Clear sand &amp; repent <span class="fa-cost">2h</span>`;
      b.disabled = state.hours < 2;
      b.addEventListener('click', () => {
        if (engine.clearSand()) toast('You swept the fill out of the foundation.', 2600);
      });
      refs.freeActions.appendChild(b);
    }

    const next = el('button', 'fa-btn');
    next.type = 'button';
    const days = daysUntilStorm(state);
    next.innerHTML = `End the day &rarr; <span class="fa-cost">${days <= 1 ? 'STORM TODAY' : `${days}d to storm`}</span>`;
    next.style.marginLeft = 'auto';
    next.style.borderStyle = 'solid';
    next.addEventListener('click', () => engine.advanceDay());
    refs.freeActions.appendChild(next);
  };

  /* ---------------------------------------------------------------- */
  /* Journal                                                          */
  /* ---------------------------------------------------------------- */

  const renderLog = () => {
    refs.logList.innerHTML = '';
    for (const entry of state.log.slice(0, 40)) {
      const li = el('li', entry.tone || '', entry.text);
      refs.logList.appendChild(li);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Modal plumbing                                                   */
  /* ---------------------------------------------------------------- */

  const openModal = ({ title, sub, body, foot }) => {
    refs.modalTitle.textContent = title;
    refs.modalSub.textContent = sub || '';
    refs.modalBody.innerHTML = body;
    refs.modalFoot.innerHTML = '';
    if (foot) {
      for (const f of foot) {
        const b = el('button', `btn ${f.cls || ''}`);
        b.type = 'button';
        b.textContent = f.label;
        b.addEventListener('click', () => f.onClick && f.onClick());
        refs.modalFoot.appendChild(b);
      }
    }
    refs.modalRoot.hidden = false;
    modalOpen = true;
  };

  const closeModal = () => {
    refs.modalRoot.hidden = true;
    modalOpen = false;
  };

  refs.modalRoot.addEventListener('click', (e) => {
    if (e.target.dataset.close) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOpen) {
      closeModal();
      return;
    }
    if (modalOpen) {
      // Number keys pick choices inside a dilemma modal.
      const idx = parseInt(e.key, 10);
      const btns = refs.modalBody.querySelectorAll('.choice');
      if (!Number.isNaN(idx) && btns[idx - 1]) {
        btns[idx - 1].click();
      }
      return;
    }
    const idx = parseInt(e.key, 10);
    if (!Number.isNaN(idx) && idx >= 1 && idx <= state.deck.length) {
      openDilemma(state.deck[idx - 1]);
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      engine.advanceDay();
    } else if (e.key === 'b' || e.key === 'B') openBlueprint();
    else if (e.key === 'r' || e.key === 'R') openReflection();
    else if (e.key === 's' || e.key === 'S') doSave();
    else if (e.key === 'l' || e.key === 'L') doLoad();
    else if (e.key === '?') openHelp();
  });

  /* ---------------------------------------------------------------- */
  /* Dilemma modal                                                    */
  /* ---------------------------------------------------------------- */

  const openDilemma = (id) => {
    const d = engine.dilemmaById(id);
    if (!d) return;

    const choiceHtml = d.choices
      .map((c, i) => {
        const affordable = state.hours >= (c.effects.hours || 0);
        return `
          <button type="button" class="choice" data-choice="${c.key}" ${affordable ? '' : 'disabled style="opacity:.45"'}>
            <span class="c-key">${i + 1}</span>
            <span class="c-main">
              <span class="c-title">${c.title}</span>
              <span class="c-desc">${c.desc}</span>
              <span class="c-effects">
                <span class="eff neutral">${c.effects.hours || 0}h</span>
                ${effectChips(c.effects)}
              </span>
            </span>
          </button>`;
      })
      .join('');

    openModal({
      title: d.title,
      sub: `${d.tag} · a decision in ${state.hours} hours`,
      body: `
        <p class="lead">${d.body}</p>
        <p class="muted">${state.hours} hours of time and energy remain today.</p>
        <div class="choices">${choiceHtml}</div>`,
      foot: [{ label: 'Decide later', onClick: closeModal }],
    });

    refs.modalBody.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const choice = d.choices.find((c) => c.key === btn.dataset.choice);
        if (!choice || state.hours < (choice.effects.hours || 0)) return;
        engine.chooseDilemma(d.id, choice.key);
        closeModal();
        toast(choice.result, 4200);
      });
    });
  };

  /* ---------------------------------------------------------------- */
  /* Blueprint log                                                    */
  /* ---------------------------------------------------------------- */

  let bpFilter = 'all';

  const blueprintFilters = () => [
    { id: 'all', label: 'All stones' },
    ...PILINGS.map((p) => ({ id: p.id, label: p.name })),
    { id: 'sand', label: 'Sand & shortcuts' },
  ];

  const blueprintBody = () => {
    const filters = blueprintFilters();
    let html = `<div class="bp-filters">${filters
      .map(
        (f) =>
          `<button type="button" class="bp-filter ${bpFilter === f.id ? 'active' : ''}" data-f="${f.id}">${f.label}</button>`
      )
      .join('')}</div>`;

    if (bpFilter === 'sand') {
      html += `
        <div class="bp-item">
          <h4>Sand, Wood, Hay, Straw <span class="bp-badge sand">Warning</span></h4>
          <div class="bp-verse">1 Corinthians 3:12-13 — "If anyone builds on the foundation with gold, silver, precious stones, wood, hay, straw — each one's work will become manifest."</div>
          <p>Sand is not a sin you committed; it is the shortcut you took. People-pleasing, hypocrisy, unconfessed sin, building fast without character, and neglecting family or prayer for public applause all pour soft fill under a slab that looks fine from the street.</p>
          <p>The game tracks it as a warning metric. It does not destroy you directly — it lowers the effective depth of every piling, because a foundation is only as strong as what surrounds it. The storms that lean hardest on sand are <strong>Temptation</strong> and <strong>Persecution</strong>.</p>
          <p>Sand can be cleared. That is the point of grace: <strong>Clear sand &amp; repent</strong> costs two hours and raises the repentance piling.</p>
        </div>`;
    } else {
      for (const p of PILINGS.filter((x) => bpFilter === 'all' || bpFilter === x.id)) {
        const ps = state.pilings[p.id];
        const anchored = ps.depth >= 62;
        html += `
          <div class="bp-item">
            <h4>${p.icon} ${p.name} <span class="bp-badge ${anchored ? '' : 'sand'}">${anchored ? 'Anchored in rock' : `${Math.round(ps.depth)} depth`}</span></h4>
            <div class="bp-verse">${p.verse}</div>
            <p>${p.principle}</p>
          </div>`;
      }
    }

    html += `
      <h3>How a storm is calculated</h3>
      <p class="muted">Load = storm power + (outward structure × 0.7) + (sand × 1.9 × storm weight). Defense = average effective depth × sand penalty × stress drag. Each piling is then checked individually, so one neglected piling can crack even when the average looks healthy — which is exactly how a real foundation fails.</p>`;

    return html;
  };

  const openBlueprint = (focusId) => {
    if (focusId) bpFilter = focusId;

    openModal({
      title: "Builder's Blueprint Log",
      sub: 'The biblical principle behind every foundation stone',
      body: blueprintBody(),
      foot: [{ label: 'Close', cls: 'gold', onClick: closeModal }],
    });

  };

  // Registered once so repeated opens never stack duplicate handlers.
  refs.modalBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.bp-filter');
    if (!btn) return;
    bpFilter = btn.dataset.f;
    refs.modalBody.innerHTML = blueprintBody();
  });

  /* ---------------------------------------------------------------- */
  /* Storm report                                                     */
  /* ---------------------------------------------------------------- */

  const OUTCOME_COPY = {
    sheltered: {
      title: 'The house held — and sheltered others',
      note: 'Your foundation was deeper than the load. Neighbors found shelter under your eaves.',
      cls: 'rock',
    },
    held: {
      title: 'The house held',
      note: 'The storm passed. The walls groaned, but nothing fell. Keep digging.',
      cls: 'rock',
    },
    cracked: {
      title: 'The structure cracked',
      note: 'Part of what you built came down. Grace remains: clear the sand, repent, and dig deeper.',
      cls: 'bad',
    },
    collapsed: {
      title: 'The house fell',
      note: 'Only the deep pilings remain standing. This is the mercy of the passage — the ruin is visible while there is still time to rebuild.',
      cls: 'bad',
    },
  };

  const openStormReport = (report) => {
    const copy = OUTCOME_COPY[report.outcome];
    const crackedTags = report.cracked.length
      ? `<div class="tag-row">${report.cracked
          .map((c) => `<span class="tag bad">${c.name}${c.severity >= 2 ? ' (severe)' : ''}</span>`)
          .join('')}</div>`
      : '';
    const heldTags = report.held.length
      ? `<div class="tag-row">${report.held.map((h) => `<span class="tag rock">${h.name} held</span>`).join('')}</div>`
      : '';

    const restoreOptions = report.cracked
      .map(
        (c) => `
        <button type="button" class="choice" data-restore="${c.id}" ${state.hours < 3 ? 'disabled style="opacity:.45"' : ''}>
          <span class="c-key">${PILING_BY_ID[c.id].icon}</span>
          <span class="c-main">
            <span class="c-title">Repour ${c.name}</span>
            <span class="c-desc">Confess the failure behind this crack and rebuild it deeper.</span>
            <span class="c-effects"><span class="eff neutral">3h</span><span class="eff good">+6 depth</span><span class="eff good">-7 sand</span></span>
          </span>
        </button>`
      )
      .join('');

    const body = `
      <p class="lead">${copy.title}</p>
      <p>${copy.note}</p>
      <div class="verse">${report.verse}</div>
      <div class="result-grid">
        <div class="result-cell">
          <div class="rc-label">Storm load</div>
          <div class="rc-val">${report.load}</div>
          <div class="rc-note">${report.storm.name} · season ${report.seasonIndex + 1}</div>
        </div>
        <div class="result-cell">
          <div class="rc-label">Foundation defense</div>
          <div class="rc-val">${report.defense}</div>
          <div class="rc-note">ratio ${report.ratio.toFixed(2)}×</div>
        </div>
      </div>
      ${heldTags}${crackedTags}
      <h3>What the storm revealed</h3>
      <p>${report.reflection}</p>
      ${restoreOptions ? `<h3>Rebuild while it is still today</h3><div class="choices">${restoreOptions}</div>` : ''}`;

    openModal({
      title: report.storm.name,
      sub: `Storm report · day ${report.day + 1}`,
      body,
      foot: [
        { label: 'Reflect together', onClick: () => openReflection() },
        { label: 'Continue building', cls: 'gold', onClick: closeModal },
      ],
    });

    refs.modalBody.querySelectorAll('[data-restore]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.restore;
        if (engine.restore(id)) {
          btn.disabled = true;
          btn.style.opacity = '0.45';
          toast(`${PILING_BY_ID[id].name} repoured deeper.`, 2600);
        }
      });
    });
  };

  /* ---------------------------------------------------------------- */
  /* Reflection guide                                                 */
  /* ---------------------------------------------------------------- */

  const openReflection = () => {
    const body = `
      <p class="lead">Three questions for a class, a family, or a quiet evening alone.</p>
      <p class="muted">Answers are saved in your browser alongside the game.</p>
      ${REFLECTIONS.map(
        (q, i) => `
        <div class="reflect-q">
          <div class="rq-num">Question ${i + 1}</div>
          <div class="rq-text">${q}</div>
          <textarea data-r="${i}" placeholder="Write what you notice...">${state.reflections[i] || ''}</textarea>
        </div>`
      ).join('')}`;

    openModal({
      title: 'Post-Storm Reflection',
      sub: 'For church classes, small groups, and families',
      body,
      foot: [
        { label: 'Close', onClick: closeModal },
        { label: 'Save reflections', cls: 'gold', onClick: () => { saveReflections(); closeModal(); toast('Reflections saved.', 2200); } },
      ],
    });
  };

  const saveReflections = () => {
    state.reflections = Array.from(refs.modalBody.querySelectorAll('textarea')).map((t) => t.value);
  };

  /* ---------------------------------------------------------------- */
  /* Final report                                                     */
  /* ---------------------------------------------------------------- */

  const openFinal = () => {
    const depth = foundationDepth(state);
    const raw = rawDepth(state);
    const cracks = crackedCount(state);
    const ratio = raw > 0 ? depth / Math.max(1, state.influence) : 0;

    let verdict;
    let verdictText;
    if (state.collapsed === 0 && state.stormsSurvived === SEASONS.length && cracks === 0) {
      verdict = 'The Wise Builder';
      verdictText =
        'Five storms came and every one of them found rock. The house stands, the pilings are deep, and the neighbors who sheltered under your eaves will remember it longer than they remember anything you said.';
    } else if (state.collapsed <= 1 && cracks <= 2) {
      verdict = 'The Builder Who Learned';
      verdictText =
        'The house stands, though some walls were rebuilt and some pilings were repoured after the water came. That is not failure — that is repentance doing structural work.';
    } else if (state.stormsSurvived > 0) {
      verdict = 'The Half-Built House';
      verdictText =
        'Something stands. Something fell. The storms were honest with you, which is the most useful thing a storm can be. Read the blueprint log and notice which piling you kept postponing.';
    } else {
      verdict = 'The House on the Sand';
      verdictText =
        'The structure looked impressive and the foundation was never dug. Matthew 7 calls this the foolish builder — not because he was wicked, but because he heard and did not do. The good news is that the game, like grace, lets you start again.';
    }

    const body = `
      <p class="lead">${verdict}</p>
      <p>${verdictText}</p>
      <div class="result-grid">
        <div class="result-cell">
          <div class="rc-label">Foundation depth</div>
          <div class="rc-val">${Math.round(raw)}</div>
          <div class="rc-note">${Math.round(depth)} effective after cracks</div>
        </div>
        <div class="result-cell">
          <div class="rc-label">Outward structure</div>
          <div class="rc-val">${state.influence}</div>
          <div class="rc-note">peak ${state.peakInfluence}</div>
        </div>
        <div class="result-cell">
          <div class="rc-label">Storms weathered</div>
          <div class="rc-val">${state.stormsSurvived} / ${SEASONS.length}</div>
          <div class="rc-note">${state.sheltered} sheltered neighbors</div>
        </div>
        <div class="result-cell">
          <div class="rc-label">Depth per structure</div>
          <div class="rc-val">${ratio.toFixed(2)}</div>
          <div class="rc-note">${cracks} cracked piling${cracks === 1 ? '' : 's'}</div>
        </div>
      </div>
      <h3>Storm history</h3>
      ${state.history
        .map(
          (h) =>
            `<p class="muted">Day ${h.day + 1} · ${h.storm} · <strong>${h.outcome}</strong> (ratio ${h.ratio.toFixed(2)}×)</p>`
        )
        .join('') || '<p class="muted">No storms recorded.</p>'}
      <div class="verse">"The rain fell, and the floods came, and the winds blew and beat on that house, but it did not fall, because it had been founded on the rock."<cite>Matthew 7:25</cite></div>`;

    openModal({
      title: 'Final Report',
      sub: 'What stood when the testing was over',
      body,
      foot: [
        { label: 'Build again', cls: 'gold', onClick: () => { engine.reset(); closeModal(); } },
        { label: 'Close', onClick: closeModal },
      ],
    });
  };

  const openHelp = () => {
    openModal({
      title: 'How to Play',
      sub: 'The Wise & Foolish Builders',
      body: HELP_HTML,
      foot: [{ label: 'Begin building', cls: 'gold', onClick: closeModal }],
    });
  };

  /* ---------------------------------------------------------------- */
  /* Save / load                                                      */
  /* ---------------------------------------------------------------- */

  const doSave = () => {
    if (engine.save()) toast('Progress saved to this browser.', 2200);
    else toast('Could not save — browser storage is unavailable.', 3000);
  };

  const doLoad = () => {
    if (engine.load()) {
      toast('Save loaded.', 2200);
      renderAll();
    } else toast('No save found in this browser.', 2600);
  };

  /* ---------------------------------------------------------------- */
  /* Wiring                                                           */
  /* ---------------------------------------------------------------- */

  const renderAll = () => {
    renderHeader();
    renderMeters();
    renderPilings();
    renderWeather();
    renderDeck();
    renderFreeActions();
    renderLog();
  };

  const changedMeters = (summary) => {
    const changed = [];
    if (summary.hours) changed.push('hours');
    if (Object.keys(summary.rock || {}).length) changed.push('depth');
    if (summary.sand) changed.push('sand');
    if (summary.influence) changed.push('influence');
    if (summary.stress) changed.push('stress');
    return changed;
  };

  engine.on((type, payload) => {
    switch (type) {
      case 'effects': {
        const changed = changedMeters(payload.summary);
        renderHeader();
        renderMeters(changed);
        renderPilings();
        renderWeather();
        renderFreeActions();
        break;
      }
      case 'choice':
      case 'freeAction':
        renderDeck();
        renderLog();
        break;
      case 'log':
        renderLog();
        break;
      case 'deck':
        renderDeck();
        break;
      case 'day':
        renderAll();
        break;
      case 'storm': {
        const r = payload.report;
        refs.stormName.textContent = r.storm.name;
        refs.stormSub.textContent = r.storm.sub;
        refs.stormBanner.hidden = false;
        requestAnimationFrame(() => refs.stormBanner.classList.add('show'));
        refs.weatherChip.className = 'weather-chip stormy';
        refs.weatherText.textContent = 'Storm';
        scene.startStorm(r);
        // Let the storm play out visually before the report lands.
        setTimeout(() => {
          refs.stormBanner.classList.remove('show');
          setTimeout(() => {
            refs.stormBanner.hidden = true;
          }, 400);
          openStormReport(r);
          renderAll();
          scene.endStorm();
          if (state.over) setTimeout(openFinal, 600);
        }, 9000);
        break;
      }
      case 'restore':
      case 'clearSand':
        renderMeters(['depth', 'sand', 'hours']);
        renderPilings();
        renderWeather();
        renderFreeActions();
        renderHeader();
        break;
      case 'reset':
        scene.setState(state);
        renderAll();
        toast('A new foundation. Everyone who hears and does is wise.', 3400);
        break;
      case 'loaded':
        scene.setState(state);
        renderAll();
        break;
      default:
        break;
    }
  });

  // Buttons
  $('btnBlueprint').addEventListener('click', () => openBlueprint());
  $('btnHelp').addEventListener('click', openHelp);
  $('btnSave').addEventListener('click', doSave);
  $('btnLoad').addEventListener('click', doLoad);

  refs.speed.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-speed]');
    if (!b) return;
    const sp = parseFloat(b.dataset.speed);
    scene.speed = sp;
    state.speed = sp;
    refs.speed.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
  });

  buildMeters();
  buildPilings();
  renderAll();
  rotateTicker();
  scene.setState(state);

  return { openHelp, openBlueprint, openReflection, openFinal, renderAll, closeModal };
}
