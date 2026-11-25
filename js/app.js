/* ============================================================
   مشروع رسوخ — إطلالات على فقه التركات
   منطق التطبيق التفاعلي
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const nf = new Intl.NumberFormat("ar-DZ", { maximumFractionDigits: 2 });
  const fmt = (n) => nf.format(Number(n) || 0);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const KEYS = {
    progress: "rusukh_tarkat_progress",
    theme: "rusukh_tarkat_theme",
    calc: "rusukh_tarkat_calc",
    will: "rusukh_tarkat_will"
  };
  const MODULE_IDS = MODULES.map((m) => m.id);

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : clone(fallback);
    } catch (e) { return clone(fallback); }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* مساحة التخزين غير متاحة */ }
  }

  const state = {
    page: "home",
    progress: load(KEYS.progress, []),
    calc: load(KEYS.calc, CALC_DEFAULTS),
    will: load(KEYS.will, {}),
    kaffar: 0,
    step: 0,
    quiz: { active: false, index: 0, score: 0, answered: false },
    calcText: "",
    deferredPrompt: null
  };
  if (!Array.isArray(state.progress)) state.progress = [];
  state.progress = state.progress.filter((id) => MODULE_IDS.includes(id));

  /* ---------- إشعار صغير ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- التنقّل والتقدّم ---------- */
  function showPage(id) {
    if (!$("#" + id)) return;
    state.page = id;
    $$(".page").forEach((p) => p.classList.toggle("active", p.id === id));
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.page === id));
    closeDrawer();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  }

  function updateProgress() {
    const done = state.progress.length;
    const pct = Math.round((done / MODULES.length) * 100);
    $("#sidePct").textContent = pct + "%";
    $("#sideBar").style.width = pct + "%";
    $("#homeCounter").textContent = done + " / " + MODULES.length + " منجز";
    $("#sideHint").textContent = done === MODULES.length
      ? "أكملتَ المسار — تخرّجك جاهز ✦"
      : "أكمل المحاور الثمانية لتحصل على شهادة التخرّج";
    $$(".module-card").forEach((card) => {
      const isDone = state.progress.includes(card.dataset.page);
      card.classList.toggle("is-done", isDone);
      const foot = $(".module-foot span", card);
      if (foot) foot.textContent = isDone ? "✓ منجز" : "ابدأ ←";
      const complete = $(".complete-btn", card);
      if (complete) complete.textContent = isDone ? "✓ أُنجز" : "✓ أنهيتُ المحور";
    });
  }

  function markDone(id, quiet) {
    if (!MODULE_IDS.includes(id) || state.progress.includes(id)) return;
    state.progress.push(id);
    save(KEYS.progress, state.progress);
    updateProgress();
    if (!quiet) toast("أُنجز المحور — أحسنتَ ✦");
  }

  function openDrawer() { $("#sidebar").classList.add("open"); $("#drawerOverlay").classList.add("show"); document.body.classList.add("no-scroll"); }
  function closeDrawer() { $("#sidebar").classList.remove("open"); $("#drawerOverlay").classList.remove("show"); document.body.classList.remove("no-scroll"); }

  document.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]");
    if (go) { showPage(go.dataset.go); return; }
    const nav = e.target.closest(".nav-item");
    if (nav) { showPage(nav.dataset.page); return; }
  });
  $("#menuBtn").addEventListener("click", openDrawer);
  $("#drawerOverlay").addEventListener("click", closeDrawer);
  $("#printBtn").addEventListener("click", () => window.print());

  /* ---------- الوضع الليلي ---------- */
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    $("#themeBtn").textContent = theme === "dark" ? "☀️" : "🌙";
  }
  let savedTheme = "light";
  try { savedTheme = localStorage.getItem(KEYS.theme) || "light"; } catch (e) { /* تجاهل */ }
  applyTheme(savedTheme);
  $("#themeBtn").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem(KEYS.theme, next); } catch (e) { /* تجاهل */ }
  });

  /* ---------- حالة الاتصال والتثبيت ---------- */
  function updateNet() {
    const pill = $("#netPill");
    const online = navigator.onLine;
    pill.classList.toggle("off", !online);
    $("span", pill).textContent = online ? "متصل" : "دون إنترنت";
    pill.title = online ? "متصل — التطبيق يعمل أيضاً دون إنترنت" : "غير متصل — جميع المحاور متاحة محلياً";
  }
  window.addEventListener("online", updateNet);
  window.addEventListener("offline", updateNet);
  updateNet();

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.deferredPrompt = e;
    $("#installBtn").hidden = false;
  });
  $("#installBtn").addEventListener("click", async () => {
    if (!state.deferredPrompt) { toast("استخدم خيار «إضافة إلى الشاشة الرئيسية» من المتصفح"); return; }
    state.deferredPrompt.prompt();
    const choice = await state.deferredPrompt.userChoice;
    if (choice.outcome === "accepted") toast("تمّ تثبيت التطبيق ✦");
    state.deferredPrompt = null;
    $("#installBtn").hidden = true;
  });
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  /* ---------- عرض المحتوى من البيانات ---------- */
  function renderModules() {
    $("#moduleGrid").innerHTML = MODULES.map((m) => `
      <article class="module-card" data-page="${m.id}">
        <span class="m-num">${m.n}</span>
        <span class="m-ico">${m.icon}</span>
        <h3>${esc(m.title)}</h3>
        <p>${esc(m.desc)}</p>
        <div class="module-foot"><span>ابدأ ←</span><button class="btn btn-ghost btn-sm complete-btn" type="button">✓ أنهيتُ المحور</button></div>
      </article>`).join("");
    $("#moduleGrid").addEventListener("click", (e) => {
      const btn = e.target.closest(".complete-btn");
      if (btn) { e.stopPropagation(); markDone(btn.closest(".module-card").dataset.page); return; }
      const card = e.target.closest(".module-card");
      if (card) showPage(card.dataset.page);
    });
  }

  function renderSimpleLists() {
    $("#featuresGrid").innerHTML = FEATURES.map((f) => `<article class="feature-card"><span class="f-ico">${f.icon}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join("");
    $("#errorsGrid").innerHTML = ERRORS.map((f) => `<article class="error-card"><span class="e-ico">${f.icon}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join("");
    $("#agentGrid").innerHTML = AGENT_RULES.map((f) => `<article class="agent-card"><span class="a-ico">${f.icon}</span><h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></article>`).join("");
    $("#tipsList").innerHTML = WILL_TIPS.map((t) => `<li>${esc(t)}</li>`).join("");
    $("#structureGrid").innerHTML = WILL_STRUCTURE.map((s) => `<article class="struct"><b>${s.n}</b><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`).join("");
    $("#sourceList").innerHTML = SOURCES.map((s) => `<article class="source-card"><h3>${esc(s.title)}</h3><p>${esc(s.detail)}</p></article>`).join("");

    $("#rightsTimeline").innerHTML = RIGHTS.map((r) => `
      <div class="right-item">
        <div class="right-num">${r.n}</div>
        <div class="right-body"><h3>${r.icon} ${esc(r.title)} <em>${esc(r.badge)}</em></h3><p>${esc(r.text)}</p><p class="extra">${esc(r.extra)}</p></div>
      </div>`).join("");

    $("#correctionGrid").innerHTML = CORRECTIONS.map((c, i) => `
      <button class="flip" type="button" aria-pressed="false" data-flip="${i}">
        <span class="flip-inner">
          <span class="flip-face flip-front">${esc(c.front)}</span>
          <span class="flip-face flip-back">${esc(c.back)}</span>
        </span>
      </button>`).join("");
    $("#correctionGrid").addEventListener("click", (e) => {
      const b = e.target.closest("[data-flip]");
      if (!b) return;
      const flipped = b.classList.toggle("flipped");
      b.setAttribute("aria-pressed", String(flipped));
    });
  }

  function renderDebtTable() {
    const sum = DEBT_CASE.creditors.reduce((a, c) => a + c.amount, 0);
    const factor = DEBT_CASE.estate / sum;
    $("#debtTable tbody").innerHTML = DEBT_CASE.creditors.map((c) => `
      <tr><td>${esc(c.name)}</td><td>${fmt(c.amount)} دج</td><td><strong>${fmt(c.amount * factor)} دج</strong></td></tr>`).join("") +
      `<tr><td><strong>المجموع</strong></td><td><strong>${fmt(sum)} دج</strong></td><td><strong>${fmt(DEBT_CASE.estate)} دج</strong></td></tr>`;
  }

  /* ---------- الكفارات ---------- */
  function selectKaffar(i) {
    state.kaffar = i;
    const k = KAFFARAT[i];
    $$(".tab").forEach((t, idx) => {
      t.classList.toggle("active", idx === i);
      t.setAttribute("aria-selected", String(idx === i));
    });
    $("#kaffarPanel").innerHTML = `
      <div class="tab-panel-head"><span class="big-ico">${k.icon}</span><div><h3>${esc(k.title)}</h3><small>${esc(k.sub)} — ${esc(k.source)}</small></div></div>
      <div class="evidence">${esc(k.evidence)}</div>
      <ul class="step-pills">${k.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      <div class="mini-note">${esc(k.note)}</div>`;
  }
  function renderKaffarat() {
    $("#kaffarTabs").innerHTML = KAFFARAT.map((k, i) => `<button class="tab" type="button" role="tab" data-k="${i}">${k.icon} ${esc(k.title)}</button>`).join("");
    $("#kaffarTabs").addEventListener("click", (e) => {
      const t = e.target.closest("[data-k]");
      if (t) { selectKaffar(Number(t.dataset.k)); markDone("kaffarat", true); }
    });
    selectKaffar(0);
  }

  /* ---------- مسائل المواريث ---------- */
  function renderCases() {
    $("#casesGrid").innerHTML = INHERIT_CASES.map((c, i) => `
      <article class="case-card" data-case="${i}">
        <span class="case-ico">${c.icon}</span>
        <h3>${esc(c.title)}</h3>
        <p class="case-prompt">${esc(c.prompt)}</p>
        <div class="case-steps">
          <ol>${c.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
          <div class="case-result">${c.result.map((r) => `<div><span>${esc(r[0])}</span><span>${esc(r[1])} · ${esc(r[2])}</span></div>`).join("")}</div>
          <p class="case-note">${esc(c.note)}</p>
        </div>
        <button class="btn btn-ghost btn-sm case-toggle" type="button">اكشف الحل ✦</button>
      </article>`).join("");
    $("#casesGrid").addEventListener("click", (e) => {
      const b = e.target.closest(".case-toggle");
      if (!b) return;
      const card = b.closest(".case-card");
      const open = card.classList.toggle("open");
      b.textContent = open ? "إخفاء الحل" : "اكشف الحل ✦";
      if (open) markDone("mirath", true);
    });
  }

  /* ---------- المعجم ---------- */
  function renderGlossary(filter = "") {
    const q = filter.trim();
    const list = GLOSSARY.filter((g) => !q || g.t.includes(q) || g.d.includes(q));
    $("#glossaryList").innerHTML = list.length
      ? list.map((g) => `<article class="glossary-card"><h3>${esc(g.t)}</h3><p>${esc(g.d)}</p></article>`).join("")
      : `<div class="alert">لا يوجد مصطلح مطابق. جرّب كلمة أخرى.</div>`;
  }
  $("#glossarySearch").addEventListener("input", (e) => renderGlossary(e.target.value));

  /* ---------- الاختبار ---------- */
  const AR_KEYS = ["أ", "ب", "ج", "د"];
  function startQuiz() {
    state.quiz = { active: true, index: 0, score: 0, answered: false };
    $("#quizIntro").hidden = true;
    $("#quizBox").hidden = false;
    renderQuestion();
  }
  function renderQuestion() {
    const q = QUIZ[state.quiz.index];
    const pct = Math.round((state.quiz.index / QUIZ.length) * 100);
    $("#quizBox").innerHTML = `
      <div class="card quiz-card">
        <div class="quiz-top"><span>السؤال ${state.quiz.index + 1} من ${QUIZ.length}</span><span>النتيجة: ${state.quiz.score} ✓</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="quiz-q">${esc(q.q)}</div>
        <div class="quiz-options">${q.o.map((o, i) => `<button class="opt" type="button" data-opt="${i}"><span class="opt-key">${AR_KEYS[i]}</span><span>${esc(o)}</span></button>`).join("")}</div>
        <div id="quizFeedback"></div>
      </div>`;
  }
  function handleQuizClick(e) {
    const opt = e.target.closest("[data-opt]");
    if (opt && !state.quiz.answered) {
      const chosen = Number(opt.dataset.opt);
      const q = QUIZ[state.quiz.index];
      state.quiz.answered = true;
      if (chosen === q.c) state.quiz.score++;
      $$(".opt", $("#quizBox")).forEach((b, i) => {
        b.disabled = true;
        if (i === q.c) b.classList.add("correct");
        else if (i === chosen) b.classList.add("wrong");
      });
      $("#quizFeedback").innerHTML = `<div class="quiz-feedback"><strong>${chosen === q.c ? "إجابة صحيحة ✓" : "الإجابة الصحيحة هي: ${AR_KEYS[q.c]}"}</strong><br>${esc(q.e)}<div class="action-row"><button class="btn btn-primary btn-sm" id="quizNext" type="button">${state.quiz.index === QUIZ.length - 1 ? "عرض النتيجة ✦" : "السؤال التالي ←"}</button></div></div>`;
      $("#quizNext").addEventListener("click", (ev) => { ev.stopPropagation(); nextQuestion(); });
      return;
    }
  }
  function nextQuestion() {
    if (state.quiz.index + 1 < QUIZ.length) {
      state.quiz.index++;
      state.quiz.answered = false;
      renderQuestion();
    } else {
      const pct = Math.round((state.quiz.score / QUIZ.length) * 100);
      const ok = pct >= 70;
      if (ok) markDone("quiz", true);
      $("#quizBox").innerHTML = `
        <div class="card quiz-result">
          <div class="score">${pct}%</div>
          <h3>${ok ? "أحسنتَ! نجحتَ في الاختبار ✦" : "تحتاج إلى مراجعة المحاور"}</h3>
          <p class="muted">أجبتَ بشكل صحيح عن ${state.quiz.score} من ${QUIZ.length} سؤالاً.</p>
          <div class="action-row center">
            <button class="btn btn-primary" id="quizAgain" type="button">إعادة الاختبار</button>
            <button class="btn btn-ghost" id="quizBack" type="button">العودة إلى الاختبار</button>
          </div>
        </div>`;
      $("#quizAgain").addEventListener("click", startQuiz);
      $("#quizBack").addEventListener("click", () => { $("#quizIntro").hidden = false; $("#quizBox").hidden = true; $("#quizBox").innerHTML = ""; });
    }
  }
  $("#quizBox").addEventListener("click", handleQuizClick);
  $("#quizStart").addEventListener("click", startQuiz);

  /* ---------- حاسبة تصفية التركة ---------- */
  const CALC_LABELS = { assets: "صنف", debts: "الدائن / الحق", obligatory: "الوصية الواجبة", voluntary: "الوصية النافلة" };

  function sumAmounts(arr) { return arr.reduce((a, x) => a + (Number(x.amount) || 0), 0); }
  function updateCalcTotals() {
    $("#assetsTotal").textContent = fmt(sumAmounts(state.calc.assets)) + " دج";
    $("#debtsTotal").textContent = fmt(sumAmounts(state.calc.debts)) + " دج";
    const pct = state.calc.voluntary.reduce((a, x) => a + (Number(x.percent) || 0), 0);
    $("#volTotal").textContent = fmt(pct) + "٪";
  }
  function makeRow(type, index, item) {
    const row = document.createElement("div");
    row.className = "row";
    if (type === "debts") row.style.gridTemplateColumns = "1fr 96px 84px 28px";
    if (type === "voluntary") row.style.gridTemplateColumns = "1fr 76px 28px";

    const label = document.createElement("input");
    label.type = "text";
    label.value = item.label || "";
    label.placeholder = CALC_LABELS[type];
    label.setAttribute("aria-label", "بيان " + CALC_LABELS[type]);
    label.addEventListener("input", () => { state.calc[type][index].label = label.value; persistCalc(); });

    let amount;
    if (type === "debts") {
      amount = document.createElement("select");
      ["عباد", "خالق"].forEach((t) => {
        const o = document.createElement("option");
        o.value = t; o.textContent = t;
        if ((item.type || "عباد") === t) o.selected = true;
        amount.appendChild(o);
      });
      amount.setAttribute("aria-label", "نوع الدين");
      amount.addEventListener("change", () => { state.calc.debts[index].type = amount.value; persistCalc(); });
    } else {
      amount = document.createElement("input");
      amount.type = "number";
      amount.min = "0";
      amount.step = type === "voluntary" ? "0.5" : "1000";
      amount.value = item[type === "voluntary" ? "percent" : "amount"];
      amount.placeholder = type === "voluntary" ? "٪" : "دج";
      amount.setAttribute("aria-label", type === "voluntary" ? "النسبة المئوية" : "المبلغ بالدينار");
      amount.addEventListener("input", () => {
        state.calc[type][index][type === "voluntary" ? "percent" : "amount"] = Number(amount.value) || 0;
        updateCalcTotals(); persistCalc();
      });
    }
    if (type === "debts") {
      const num = document.createElement("input");
      num.type = "number"; num.min = "0"; num.step = "1000";
      num.value = item.amount || 0; num.placeholder = "دج";
      num.setAttribute("aria-label", "مبلغ الدين");
      num.addEventListener("input", () => { state.calc.debts[index].amount = Number(num.value) || 0; updateCalcTotals(); persistCalc(); });
      row.append(label, amount, num);
    } else {
      row.append(label, amount);
    }
    const del = document.createElement("button");
    del.className = "del"; del.type = "button"; del.textContent = "×"; del.title = "حذف";
    del.addEventListener("click", () => { state.calc[type].splice(index, 1); renderCalcRows(); persistCalc(); });
    row.appendChild(del);
    return row;
  }
  function persistCalc() { save(KEYS.calc, state.calc); }
  function renderCalcRows() {
    const targets = { assets: "#calcAssets", debts: "#calcDebts", obligatory: "#calcObligatory", voluntary: "#calcVoluntary" };
    Object.keys(targets).forEach((key) => {
      const box = $(targets[key]);
      box.innerHTML = "";
      state.calc[key].forEach((item, i) => box.appendChild(makeRow(key, i, item)));
    });
    $("#calcFuneral").value = state.calc.funeral || 0;
    updateCalcTotals();
  }
  $$("[data-add]").forEach((b) => b.addEventListener("click", () => {
    const type = b.dataset.add;
    const fresh = type === "debts" ? { label: "", amount: 0, type: "عباد" }
      : type === "voluntary" ? { label: "", percent: 0 }
        : { label: "", amount: 0 };
    state.calc[type].push(fresh);
    renderCalcRows(); persistCalc();
  }));
  $("#calcFuneral").addEventListener("input", (e) => { state.calc.funeral = Number(e.target.value) || 0; persistCalc(); });
  $("#calcReset").addEventListener("click", () => { state.calc = clone(CALC_DEFAULTS); persistCalc(); renderCalcRows(); $("#calcResult").classList.remove("show"); toast("تمّت إعادة الضبط"); });
  $("#calcExample").addEventListener("click", () => {
    state.calc = clone(CALC_DEFAULTS);
    state.calc.assets = [{ label: "التركة محل المثال", amount: DEBT_CASE.estate }];
    state.calc.funeral = 0;
    state.calc.debts = DEBT_CASE.creditors.map((c) => ({ label: c.name, amount: c.amount, type: "عباد" }));
    state.calc.obligatory = [];
    state.calc.voluntary = [];
    persistCalc(); renderCalcRows(); runCalc();
    toast("تمّ تحميل مثال المحاصصة من الكتاب");
  });

  function wfRow(label, value, estate) {
    const pct = estate > 0 ? Math.min(100, (value / estate) * 100) : 0;
    return `<div class="wf-row"><span>${label}</span><span class="wf-bar"><i style="width:${pct}%"></i></span><span class="wf-val">${fmt(value)} دج</span></div>`;
  }
  function runCalc() {
    const estate = sumAmounts(state.calc.assets);
    const funeral = Math.min(Math.max(0, Number(state.calc.funeral) || 0), estate);
    let rem = Math.max(0, estate - funeral);
    const people = state.calc.debts.filter((d) => (d.type || "عباد") === "عباد");
    const creator = state.calc.debts.filter((d) => d.type === "خالق");
    const sumPeople = sumAmounts(people);
    const sumCreator = sumAmounts(creator);
    const sumOblig = sumAmounts(state.calc.obligatory);
    const pctSum = state.calc.voluntary.reduce((a, x) => a + (Number(x.percent) || 0), 0);
    const alerts = [];
    let paidPeople = 0, paidCreator = 0, paidOblig = 0, paidVol = 0, heirs = 0;
    const details = [];
    let scale = 1;

    if (sumPeople > rem) {
      const factor = rem > 0 ? rem / sumPeople : 0;
      people.forEach((d) => details.push([d.label || "دين", d.amount, d.amount * factor]));
      paidPeople = rem; rem = 0;
      alerts.push(`<div class="alert bad"><strong>المحاصصة:</strong> الديون (${fmt(sumPeople)} دج) أكبر من التركة بعد التجهيز (${fmt(estate - funeral)} دج). قُسِمت التركة بنسبة ${factor.toFixed(5)} لكل دائن، ولا شيء للورثة إلا إن تبرّعوا.</div>`);
    } else {
      people.forEach((d) => details.push([d.label || "دين", d.amount, d.amount]));
      paidPeople = sumPeople; rem -= sumPeople;
      paidCreator = Math.min(rem, sumCreator); rem -= paidCreator;
      paidOblig = Math.min(rem, sumOblig); rem -= paidOblig;
      const third = rem / 3;
      if (pctSum > 100) {
        scale = 100 / pctSum;
        alerts.push(`<div class="alert"><strong>تنبيه:</strong> مجموع النسب (${fmt(pctSum)}٪) تجاوز ١٠٠٪ من الثلث، فتمّت النسبة إلى ١٠٠٪ تنبيهاً على السؤال الشرعي.</div>`);
      }
      paidVol = state.calc.voluntary.reduce((a, v) => {
        const amount = third * (Number(v.percent) || 0) / 100 * scale;
        details.push([v.label || "وصية نافلة", (Number(v.percent) || 0) + "٪ من الثلث", amount]);
        return a + amount;
      }, 0);
      heirs = Math.max(0, rem - paidVol);
      alerts.push(`<div class="alert good"><strong>الترتيب:</strong> تجهيز (${fmt(funeral)}) ← ديون العباد (${fmt(paidPeople)}) ← ديون الخالق (${fmt(paidCreator)}) ← واجبات (${fmt(paidOblig)}) ← نوافل من الثلث (${fmt(paidVol)}) ← ميراث (${fmt(heirs)}).</div>`);
      if (paidCreator < sumCreator) alerts.push(`<div class="alert"><strong>تنبيه:</strong> لم يبقَ ما يكفي لديون الخالق؛ ديون العباد مقدَّمة عند الضيق، والباقي منها لا يُلزم الورثة أداءه.</div>`);
      if (paidOblig < sumOblig) alerts.push(`<div class="alert"><strong>تنبيه:</strong> لم يبقَ ما يكفي للوصايا الواجبة بعد الديون؛ راجع أهل العلم قبل التنفيذ.</div>`);
    }

    const summary = `تصفية التركة\nالتركة: ${fmt(estate)} دج\nالتجهيز: ${fmt(funeral)} دج\nديون العباد: ${fmt(paidPeople)} دج\nديون الخالق: ${fmt(paidCreator)} دج\nالوصايا الواجبة: ${fmt(paidOblig)} دج\nالوصايا النافلة: ${fmt(paidVol)} دج\nالباقي للميراث: ${fmt(heirs)} دج`;
    state.calcText = summary;

    $("#calcResult").innerHTML = `
      ${alerts.join("")}
      <h3>توزيع التركة</h3>
      <div class="waterfall">
        ${wfRow("التركة", estate, estate)}
        ${wfRow("التجهيز", funeral, estate)}
        ${wfRow("ديون العباد", paidPeople, estate)}
        ${wfRow("ديون الخالق", paidCreator, estate)}
        ${wfRow("الواجبات", paidOblig, estate)}
        ${wfRow("النوافل (من الثلث)", paidVol, estate)}
        ${wfRow("الميراث", heirs, estate)}
      </div>
      <div class="result-grid">
        <div class="table-wrap"><table><thead><tr><th>الجهة</th><th>المستحق</th><th>المأخوذ</th></tr></thead><tbody>${details.map((d) => `<tr><td>${esc(d[0])}</td><td>${esc(d[1])}</td><td><strong>${fmt(d[2])} دج</strong></td></tr>`).join("") || "<tr><td colspan='3'>لا توجد بنود</td></tr>"}</tbody></table></div>
        <div><div class="alert good"><strong>الباقي للورثة:</strong> ${fmt(heirs)} دج</div><p class="muted">هذه الحسابات تعليمية تعينك على فهم مراتب الحقوق، ولا تُعدّ فتوى شرعية. راجع أهل العلم والجهات المختصة قبل التنفيذ.</p></div>
      </div>`;
    $("#calcResult").classList.add("show");
    markDone("tafdiya", true);
    $("#calcResult").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  $("#calcRun").addEventListener("click", runCalc);
  $("#calcCopy").addEventListener("click", async () => {
    if (!state.calcText) { toast("احسب التركة أولاً"); return; }
    try { await navigator.clipboard.writeText(state.calcText); toast("تمّ نسخ النتيجة"); }
    catch (e) { toast("تعذّر النسخ؛ حدّد النص وانسخه يدوياً"); }
  });

  /* ---------- صانع الوصية ---------- */
  const form = $("#willForm");
  function fillForm() {
    Object.keys(state.will).forEach((name) => {
      const el = form.elements[name];
      if (el && typeof el.value === "string") el.value = state.will[name];
    });
  }
  function saveForm() {
    Array.from(form.elements).forEach((el) => { if (el.name) state.will[el.name] = el.value; });
    save(KEYS.will, state.will);
  }
  function setStep(n) {
    state.step = Math.max(0, Math.min(4, n));
    $$(".form-step", form).forEach((s, i) => s.classList.toggle("active", i === state.step));
    $$(".step").forEach((s, i) => {
      s.classList.toggle("active", i === state.step);
      s.classList.toggle("done", i < state.step);
    });
    $("#prevStep").disabled = state.step === 0;
    $("#nextStep").textContent = state.step === 4 ? "راجع النص ✦" : "التالي ←";
    $("#stepLabel").textContent = "الخطوة " + (state.step + 1) + " من ٥";
  }
  $$(".step").forEach((s) => s.addEventListener("click", () => { saveForm(); setStep(Number(s.dataset.step)); }));
  $("#prevStep").addEventListener("click", () => { saveForm(); setStep(state.step - 1); });
  $("#nextStep").addEventListener("click", () => { saveForm(); setStep(state.step === 4 ? 4 : state.step + 1); if (state.step === 4) toast("راجع البيانات ثم اضغط «أنشئ وصيّتك»"); });
  form.addEventListener("input", () => {
    saveForm();
    const a = Number(form.elements.charityPercent.value) || 0;
    const b = Number(form.elements.sadaqaPercent.value) || 0;
    const warn = $("#percentWarning");
    if (a + b > 33.33) { warn.textContent = "⚠️ مجموع النوافل تجاوز ٣٣٫٣٣٪؛ قلّل النسب قبل الإنشاء."; warn.style.color = "var(--err)"; }
    else { warn.textContent = "مجموع النوافل يجب ألا يتجاوز ٣٣٫٣٣٪ من التركة بعد الواجبات. (الحالي: " + fmt(a + b) + "٪)"; warn.style.color = ""; }
  });
  fillForm();
  setStep(0);

  function buildWillText(v) {
    const lines = [];
    lines.push("بسم الله الرحمن الرحيم");
    lines.push("وصيّتي الشرعية");
    lines.push("الحمد لله ربّ العالمين، وصلى الله على سيدنا محمد وآله وسلم.");
    lines.push("أنا الموقّع أدناه: " + (v.fullName || "...................."), "المولود في: " + (v.birth || "............"), "حالتي الصحية والعقلية: " + (v.health || "صحيحة، والحمد لله"), "مكان الإقامة: " + (v.city || "............"));
    lines.push("", "أولاً: الوصية الروحية", v.spiritual || "أوصي أهلي عقبي بتقوى الله والاستقامة.");
    lines.push("", "ثانياً: الواجبات", "أقرّ بما تعلّق بذمتي من حقوق الله وحقوق العباد، وأوصي بأدائها من أصل مالي قبل أي تصرّف، من غير ذكر لسببها:", v.debts || "لا تبعات معلومة، والله أعلم.", "وأوصي لأقاربي الذين لا يرثونني بنسبة " + (v.kinPercent || 0) + "٪ من تركتي، وهم: " + (v.kinPeople || "أقاربي الذين لا يرثونني").replace(/\s+$/, "") + "، أداءً لحقّ الرحم.");
    lines.push("", "ثالثاً: النوافل والتطوعات", "أوصي بنسبة " + (v.charityPercent || 0) + "٪ من تركتي لخدمة مشروع خيري دائم: " + (v.charity || "يُحدَّد عند التنفيذ"), "وأوصي بنسبة " + (v.sadaqaPercent || 0) + "٪ للفقراء والمساكين وذوي الحاجة: " + (v.sadaqa || "يُوزَّع على المحتاجين"));
    if (v.custom) lines.push("وصايا متعارَفة أخرى: " + v.custom);
    lines.push("وما فضل من الثلث بعد هذه الوصايا يُردّ إلى ورثتي، والزيادة على الثلث موقوفة على إجازتهم بعد وفاتي.");
    lines.push("", "رابعاً: المتمّمات", "أستخلف على تنفيذ وصيتي الأستاذ/ة: " + (v.agentName || "............"), "ويتولّى ذلك " + (v.agentType || "تطوّعاً لله تعالى") + (v.agentFee ? "، والأجرة المحدّدة: " + v.agentFee : ""), "وشهد على هذه الوصية كلٌّ من: " + (v.witness1 || "............") + " و" + (v.witness2 || "............"), "حرّرتُ هذه الوصية في: " + (v.date || "............"));
    lines.push("", "أوصي عقبي وأهلي ألا يظلموا أحداً، وألا يؤخّروا تنفيذ ما أوصيتُ به، وأسأل الله أن يتوفّاني وإيّاهم على طاعته. والله تعالى أعلم.");
    return lines.join("\n");
  }
  function generateWill() {
    saveForm();
    const v = {};
    Array.from(form.elements).forEach((el) => { if (el.name) v[el.name] = el.value.trim(); });
    const a = Number(v.charityPercent) || 0, b = Number(v.sadaqaPercent) || 0;
    if (a + b > 33.33) { toast("قلّل مجموع النوافل إلى ٣٣٫٣٣٪ أو أقل"); setStep(3); return; }
    if (!v.fullName) { toast("اكتب اسم الموصي أولاً"); setStep(0); return; }
    const text = buildWillText(v);
    state.willText = text;
    const done = state.progress.filter((id) => MODULE_IDS.includes(id)).length;
    const certNote = done === MODULES.length
      ? "استوفى محاور الدورة الثمانية بنجاح، وأخرج وصيّته النموذجية وفق ما تعلّمه."
      : "أخرج وصيّته النموذجية، وتبقّى " + (8 - done) + " محوراً لاستكمال المسار (" + done + "/8).";
    $("#willOutput").innerHTML = `
      <div class="will-sheet printable">
        <div class="basmala">بسم الله الرحمن الرحيم</div>
        <h2>وصيّتي الشرعية</h2>
        <p style="text-align:center"><strong>${esc(v.fullName)}</strong></p>
        <h3>أولاً: الوصية الروحية</h3><p>${esc(v.spiritual)}</p>
        <h3>ثانياً: الواجبات</h3><p>أقرّ بما تعلّق بذمتي من حقوق الله وحقوق العباد وأوصي بأدائها من أصل مالي: ${esc(v.debts || "لا تبعات معلومة، والله أعلم")}</p>
        <p>وأوصي لأقاربي الذين لا يرثونني (${esc(v.kinPeople || "أقاربي الذين لا يرثونني")}) بنسبة <strong>${fmt(v.kinPercent || 0)}٪</strong> من تركتي، أداءً لحقّ الرحم.</p>
        <h3>ثالثاً: النوافل والتطوعات</h3>
        <p>صدقة جارية لمشروع: ${esc(v.charity || "يُحدَّد عند التنفيذ")} — <strong>${fmt(v.charityPercent || 0)}٪</strong>.</p>
        <p>للفقراء والمساكين: ${esc(v.sadaqa || "يُوزَّع على المحتاجين")} — <strong>${fmt(v.sadaqaPercent || 0)}٪</strong>.</p>
        ${v.custom ? `<p>وصايا متعارَفة أخرى: ${esc(v.custom)}</p>` : ""}
        <p class="muted">وما فضل من الثلث يُردّ إلى الورثة. والزيادة على الثلث موقوفة على إجازتهم.</p>
        <h3>رابعاً: المتمّمات</h3>
        <p>الوكيل: ${esc(v.agentName || "............")} — ${esc(v.agentType || "تطوّعاً لله تعالى")}${v.agentFee ? "، الأجرة: " + esc(v.agentFee) : ""}.</p>
        <p>الشهود: ${esc(v.witness1 || "............")} / ${esc(v.witness2 || "............")} — التاريخ: ${esc(v.date || "............")}</p>
        <div class="will-sign"><div>توقيع الموصي: ........................</div><div>توقيع الوكيل: ........................</div><div>توقيع الشاهد الأول: ........................</div><div>توقيع الشاهد الثاني: ........................</div></div>
      </div>
      <div class="certificate printable">
        <h3>شهادة تخرّج</h3>
        <p>مدرسة أبي سالم تجنيت — مشروع رسوخ</p>
        <div class="cert-name">${esc(v.fullName)}</div>
        <p>${esc(certNote)}</p>
        <p>في فقه الوصايا والمواريث وتصفية التركات — ${esc(v.date || new Date().toLocaleDateString("ar-DZ"))}</p>
        <p>إخراج الأستاذ: ح قاسم بن ح عمر حاج امحمد</p>
      </div>
      <div class="output-tools">
        <button class="btn btn-primary btn-sm" id="copyWill" type="button">📋 نسخ النص</button>
        <button class="btn btn-ghost btn-sm" id="printWill" type="button">🖨️ طباعة الوصية والشهادة</button>
        <button class="btn btn-ghost btn-sm" id="downloadWill" type="button">⬇️ تحميل النص</button>
      </div>`;
    $("#willOutput").hidden = false;
    markDone("builder", true);
    $("#copyWill").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(text); toast("تمّ نسخ الوصية"); }
      catch (e) { toast("تعذّر النسخ؛ يمكنك تحديد النص يدوياً"); }
    });
    $("#printWill").addEventListener("click", () => {
      document.body.classList.add("printing-document");
      window.print();
    });
    $("#downloadWill").addEventListener("click", () => {
      const blob = new Blob(["\uFEFF" + text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "وصيتي-الشرعية.txt"; a.click();
      URL.revokeObjectURL(url);
      toast("تمّ تنزيل النص");
    });
    $("#willOutput").scrollIntoView({ behavior: "smooth", block: "start" });
    toast("تمّ إنشاء وصيّتك وشهادة تخرّجك ✦");
  }
  window.addEventListener("afterprint", () => document.body.classList.remove("printing-document"));
  $("#genWill").addEventListener("click", generateWill);
  $("#clearWill").addEventListener("click", () => {
    if (!confirm("هل تريد مسح المسوّدة المحفوظة؟")) return;
    state.will = {}; save(KEYS.will, state.will);
    form.reset(); $("#willOutput").hidden = true; $("#willOutput").innerHTML = "";
    setStep(0); toast("تمّ مسح المسوّدة");
  });

  /* ---------- بدء التطبيق ---------- */
  renderModules();
  renderSimpleLists();
  renderDebtTable();
  renderKaffarat();
  renderCases();
  renderGlossary();
  renderCalcRows();
  updateProgress();

  const initial = location.hash.slice(1);
  showPage(MODULE_IDS.includes(initial) || ["home", "quiz", "glossary", "about"].includes(initial) ? initial : "home");
})();
