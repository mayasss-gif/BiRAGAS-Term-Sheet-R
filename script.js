// BiRAGAS Investor Presentation
// 3D slide deck with per-slide synchronized audio narration

const state = {
  current: -1,
  slides: [],
  audio: null,
  autoplay: true,
  started: false,
  unlocked: false,
  advanceTimer: null,
};

function toast(msg, isErr) {
  const t = document.querySelector("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle("err", !!isErr);
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 3500);
}

// ────────────────────────────────────────────────────────────
// SLIDE TEMPLATING
// ────────────────────────────────────────────────────────────

function escapeHTML(s) {
  return String(s || "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
}

// Block builders — small composable HTML factories per slide kind
function copyBlock(slide, { centered = false, maxW = null } = {}) {
  const align = centered ? "text-align:center;align-items:center;" : "";
  const sub  = maxW ? `style="max-width:${maxW};${centered?'text-align:center;':''}"` : (centered ? 'style="text-align:center;max-width:1100px;"' : "");
  return `
    <div class="copy" style="${align}">
      <div class="kicker">${slide.kicker}</div>
      ${slide.title ? `<div class="title">${slide.title}</div>` : ""}
      <div class="headline">${slide.headline}</div>
      <div class="subhead" ${sub}>${slide.subhead}</div>
    </div>
  `;
}

function renderCover(slide) {
  const top    = slide.cover_top    || "BiRAGAS";
  const bottom = slide.cover_bottom || "SAFE.";
  return `
    <div class="copy cover" style="text-align:center;align-items:center;">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">
        ${top}<br><em>${bottom}</em>
      </div>
      <div class="headline" style="max-width:1100px;text-align:center;">${slide.headline}</div>
      <div class="subhead" style="text-align:center;max-width:880px;">${slide.subhead}</div>
    </div>`;
}

function renderStats(slide) {
  const cells = (slide.stats || []).map(s => `
    <div class="stat">
      <div class="n">${s.n}</div>
      <div class="l">${escapeHTML(s.l)}</div>
    </div>`).join("");
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
      <div class="stats stats-3">${cells}</div>
    </div>`;
}

function renderHero(slide) {
  return `
    <div class="copy" style="text-align:center;align-items:center;">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline" style="max-width:1200px;text-align:center;">${slide.headline}</div>
      <div class="subhead" style="text-align:center;max-width:1000px;">${slide.subhead}</div>
    </div>`;
}

function renderMechanic(slide) {
  const steps = (slide.steps || []).map(s => `
    <div class="step">
      <div class="step-n">${s.n}</div>
      <div class="step-t">${escapeHTML(s.t)}</div>
      <div class="step-d">${escapeHTML(s.d)}</div>
    </div>
    <div class="step-arrow">→</div>`).join("").replace(/<div class="step-arrow">→<\/div>\s*$/, "");
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
      <div class="steps">${steps}</div>
    </div>`;
}

function renderTierCover(slide) {
  const pillars = (slide.pillars || []).map(p => `
    <div class="pillar">
      <div class="n">${escapeHTML(p.n)} · ${escapeHTML(p.t)}</div>
      <div class="t">${escapeHTML(p.d)}</div>
    </div>`).join("");
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="title big">${slide.title}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
      <div class="pillars pillars-${(slide.pillars||[]).length}">${pillars}</div>
    </div>`;
}

function renderTierDetail(slide) {
  return `
    <div class="copy" style="text-align:center;align-items:center;">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline" style="max-width:1300px;text-align:center;">${slide.headline}</div>
      <div class="subhead" style="text-align:center;max-width:1100px;">${slide.subhead}</div>
    </div>`;
}

function renderMilestoneDetail(slide) {
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
    </div>`;
}

function renderMAE(slide) {
  return `
    <div class="copy" style="text-align:center;align-items:center;">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline" style="max-width:1300px;text-align:center;">${slide.headline}</div>
      <div class="subhead" style="text-align:center;max-width:1200px;">${slide.subhead}</div>
    </div>`;
}

function renderUseOfProceeds(slide) {
  const rows = (slide.allocation || []).map(a => `
    <div class="alloc-row">
      <div class="alloc-pct">${escapeHTML(a.pct)}<small>%</small></div>
      <div class="alloc-k">${escapeHTML(a.k)}</div>
      <div class="alloc-d">${escapeHTML(a.d)}</div>
    </div>`).join("");
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
      <div class="alloc">${rows}</div>
    </div>`;
}

function renderKeyValueGrid(slide, key, cols = 3) {
  const items = slide[key] || [];
  const cells = items.map(x => `
    <div class="kv-cell">
      <div class="kv-k">${escapeHTML(x.k)}</div>
      <div class="kv-v">${escapeHTML(x.v)}</div>
      ${x.d ? `<div class="kv-d">${escapeHTML(x.d)}</div>` : ""}
    </div>`).join("");
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
      <div class="kv-grid cols-${cols}">${cells}</div>
    </div>`;
}

function renderRoundMechanics(slide) {
  const rows = (slide.round || []).map(r => `
    <div class="round-row">
      <div class="round-k">${escapeHTML(r.k)}</div>
      <div class="round-v">${escapeHTML(r.v)}</div>
    </div>`).join("");
  return `
    <div class="copy">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${slide.title}</div>
      <div class="headline">${slide.headline}</div>
      <div class="subhead">${slide.subhead}</div>
      <div class="round-table">${rows}</div>
    </div>`;
}

function renderAsk(slide) {
  const grid = (slide.ask_grid || []).map(c => `
    <div class="ask-cell">
      <div class="k">${escapeHTML(c.k)}</div>
      <div class="v">${escapeHTML(c.v)}</div>
    </div>`).join("");
  const displayTitle = slide.display_title || `The <em>${escapeHTML(slide.title || "Ask")}.</em>`;
  return `
    <div class="copy" style="text-align:center;align-items:center;">
      <div class="kicker">${slide.kicker}</div>
      <div class="title">${displayTitle}</div>
      <div class="headline" style="max-width:1300px;text-align:center;">${slide.headline}</div>
      <div class="subhead" style="text-align:center;max-width:1200px;">${slide.subhead}</div>
      <div class="ask-grid">${grid}</div>
    </div>`;
}

const KIND_RENDERERS = {
  "cover":            renderCover,
  "stats":            renderStats,
  "hero":             renderHero,
  "mechanic":         renderMechanic,
  "tier-cover":       renderTierCover,
  "tier-detail":      renderTierDetail,
  "milestone-detail": renderMilestoneDetail,
  "mae":              renderMAE,
  "use-of-proceeds":  renderUseOfProceeds,
  "why-hit":          renderTierDetail,           // same centered layout
  "platform":         renderTierDetail,
  "tam":              (s) => renderKeyValueGrid(s, "verticals", 3),
  "competition":      (s) => renderKeyValueGrid(s, "compare", 4),
  "team":             (s) => renderKeyValueGrid(s, "people", 3),
  "round-mechanics":  renderRoundMechanics,
  "ask":              renderAsk,
};

function renderSlide(slide, idx, total) {
  const slideEl = document.createElement("div");
  slideEl.className = "slide";
  slideEl.dataset.accent = slide.accent || "paper";
  slideEl.dataset.id = slide.id;
  slideEl.dataset.idx = idx;
  slideEl.dataset.kind = slide.kind || "default";

  const renderer = KIND_RENDERERS[slide.kind] || ((s) => copyBlock(s));
  const mainHTML = renderer(slide);

  slideEl.innerHTML = `
    <div class="stage-bg"></div>
    <div class="frame">
      <div class="folio">
        <div class="brand">BiRAGAS · ${slide.id}/${total.toString().padStart(2,"0")}</div>
        <div class="right">${escapeHTML(slide.kicker)}</div>
      </div>
      <div class="content">${mainHTML}</div>
      <div class="foot">
        <div class="step-pill">
          <span class="dot"></span>
          <span>Slide ${idx + 1} of ${total}</span>
        </div>
        <div class="progress"><div class="fill" style="--p: ${((idx + 1) / total) * 100}%"></div></div>
        <div>Ayass Bioscience · MMXXVI · Term Sheet v1.1-R</div>
      </div>
    </div>
  `;
  return slideEl;
}

// ────────────────────────────────────────────────────────────
// NAVIGATION
// ────────────────────────────────────────────────────────────

function showSlide(newIdx, dir = "forward") {
  const total = state.slides.length;
  newIdx = Math.max(0, Math.min(total - 1, newIdx));
  if (newIdx === state.current) return;
  const deck = document.querySelector(".deck");
  const prevIdx = state.current;
  [...deck.children].forEach((el, i) => {
    el.classList.remove("active", "exiting", "entering");
    if (i === newIdx) {
      el.classList.add("active");
    } else if (i === prevIdx && prevIdx !== newIdx && prevIdx >= 0) {
      // show the slide we're leaving for the duration of the transition
      el.classList.add(dir === "back" ? "entering" : "exiting");
      setTimeout(() => el.classList.remove("exiting", "entering"), 1000);
    }
  });
  state.current = newIdx;
  playAudio(newIdx);
  updateChrome();
}

function next() { showSlide(state.current + 1, "forward"); }
function prev() { showSlide(state.current - 1, "back"); }

function clearAdvance() {
  if (state.advanceTimer) {
    clearTimeout(state.advanceTimer);
    state.advanceTimer = null;
  }
}

function playAudio(idx) {
  clearAdvance();
  const slide = state.slides[idx];
  if (!slide) return;
  const a = state.audio;
  a.pause();
  a.src = `audio/slide-${slide.id}.mp3`;
  a.currentTime = 0;
  if (!state.autoplay) return;
  const p = a.play();
  if (p && typeof p.catch === "function") {
    p.catch((e) => {
      console.warn("audio play blocked", e);
      // Fallback: schedule auto-advance after estimated narration length
      const dur = a.duration || estimateDuration(slide.narration);
      toast("Audio blocked — click any slide to unlock");
      state.advanceTimer = setTimeout(() => {
        if (state.autoplay && state.current === idx) next();
      }, dur * 1000 + 1500);
    });
  }
}

function estimateDuration(text) {
  // ~2.5 words/sec
  const words = (text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(6, words / 2.5);
}

function updateChrome() {
  const ctrl = document.querySelector("#autoplay-btn");
  if (ctrl) {
    ctrl.classList.toggle("off", !state.autoplay);
    ctrl.innerHTML = state.autoplay ? "▶ Auto · ON" : "❚❚ Auto · OFF";
  }
  const counter = document.querySelector("#counter");
  if (counter && state.slides.length) {
    counter.textContent = `${(state.current + 1).toString().padStart(2,"0")} / ${state.slides.length.toString().padStart(2,"0")}`;
  }
}

// ────────────────────────────────────────────────────────────
// INIT
// ────────────────────────────────────────────────────────────

async function loadSlides() {
  // Try embedded data first (works from file:// without a server)
  if (typeof window.__SLIDES__ !== "undefined") return window.__SLIDES__;
  try {
    const res = await fetch("slides.json");
    return await res.json();
  } catch (e) {
    console.error("Could not load slides.json — embed it inline as window.__SLIDES__", e);
    return [];
  }
}

function makeAudio() {
  const a = new Audio();
  a.preload = "auto";
  a.crossOrigin = "anonymous";
  a.addEventListener("ended", () => {
    if (state.autoplay && state.current < state.slides.length - 1) {
      state.advanceTimer = setTimeout(() => next(), 600);
    }
  });
  a.addEventListener("error", (e) => {
    console.warn("audio error", e, a.src);
    toast("Audio file failed to load", true);
  });
  return a;
}

// Mark audio as unlocked. Called from any user-gesture handler.
// The real unlock happens implicitly when playAudio() runs within the
// same synchronous call stack as the click/keydown handler — browser
// autoplay policy allows .play() inside a trusted gesture context.
// (Previous src-swap dance raced with playAudio and clobbered the src.)
function unlockAudio() {
  state.unlocked = true;
}

function toggleAutoplay() {
  state.autoplay = !state.autoplay;
  if (state.autoplay) {
    const p = state.audio.play();
    if (p && p.catch) p.catch(()=>{});
  } else {
    state.audio.pause();
    clearAdvance();
  }
  updateChrome();
}

async function init() {
  state.slides = await loadSlides();
  state.audio = makeAudio();
  const deck = document.querySelector(".deck");
  state.slides.forEach((s, i) => deck.appendChild(renderSlide(s, i, state.slides.length)));

  // start gate
  const gate = document.querySelector(".gate");
  const startBtn = document.querySelector("#start-btn");
  startBtn.addEventListener("click", () => { unlockAudio(); start(0); });
  gate.addEventListener("click", (e) => {
    if (e.target.tagName === "BUTTON") return;
    unlockAudio(); start(0);
  });

  // navbar controls
  document.querySelector("#prev-btn").addEventListener("click", () => { unlockAudio(); prev(); });
  document.querySelector("#next-btn").addEventListener("click", () => { unlockAudio(); next(); });
  document.querySelector("#restart-btn").addEventListener("click", () => {
    unlockAudio();
    state.audio.currentTime = 0;
    if (state.autoplay) state.audio.play().catch(()=>{});
  });
  document.querySelector("#autoplay-btn").addEventListener("click", () => {
    unlockAudio(); toggleAutoplay();
  });

  // click-to-advance zones
  document.querySelector("#zone-prev").addEventListener("click", () => { unlockAudio(); prev(); });
  document.querySelector("#zone-next").addEventListener("click", () => { unlockAudio(); next(); });

  // keyboard
  document.addEventListener("keydown", (e) => {
    if (!state.started) return;
    if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
      e.preventDefault(); unlockAudio(); next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault(); unlockAudio(); prev();
    } else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      unlockAudio(); toggleAutoplay();
    } else if (e.key === "Home") { unlockAudio(); state.current = -1; showSlide(0); }
      else if (e.key === "End") { unlockAudio(); state.current = -1; showSlide(state.slides.length - 1); }
  });

  // navbar stays visible; subtle dim only after long idle
  let dimTimer;
  const navbar = document.querySelector("#navbar");
  function bump() {
    navbar.classList.remove("dim");
    clearTimeout(dimTimer);
    dimTimer = setTimeout(() => navbar.classList.add("dim"), 8000);
  }
  document.addEventListener("mousemove", bump);
  document.addEventListener("keydown", bump);
  document.addEventListener("click", bump);
  bump();

  // ─── TOUCH SWIPE NAVIGATION ────────────────────────────────
  // Swipe left = next, swipe right = prev. Threshold 60px horizontal,
  // and horizontal motion must exceed vertical by 1.5× to avoid
  // triggering on accidental vertical scrolls.
  const stage = document.querySelector(".stage");
  let tStartX = 0, tStartY = 0, tStartT = 0, swiping = false;
  stage.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    tStartX = t.clientX;
    tStartY = t.clientY;
    tStartT = Date.now();
    swiping = true;
  }, { passive: true });

  stage.addEventListener("touchend", (e) => {
    if (!swiping) return;
    swiping = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - tStartX;
    const dy = t.clientY - tStartY;
    const dt = Date.now() - tStartT;
    if (Math.abs(dx) < 60) return;            // too short
    if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // too vertical
    if (dt > 800) return;                     // too slow (probably not a swipe)
    unlockAudio();
    if (dx < 0) next();
    else        prev();
  }, { passive: true });

  updateChrome();
}

function start(startIdx = 0) {
  if (state.started) return;
  state.started = true;
  document.querySelector(".gate").classList.add("hidden");
  state.current = -1;  // force showSlide to run for index 0
  showSlide(startIdx);
}

window.addEventListener("DOMContentLoaded", async () => {
  await init();
  // Honor ?slide=N&autostart=1 (1-indexed) for headless capture / direct links
  const params = new URLSearchParams(location.search);
  const slideParam = parseInt(params.get("slide") || "0", 10);
  if (params.get("autostart") === "1" || slideParam > 0) {
    state.autoplay = params.get("autoplay") !== "0";
    start(Math.max(0, slideParam - 1));
  }
});
