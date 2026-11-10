/* 직관메이트 홈페이지 공통 스크립트: 예약 팝업 · 복셀 3D · 주자 스크롤 */
(function () {
  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 설정: 값이 정해지면 여기만 바꾸세요 ---------- */
  var PRICE = 69000;
  var MAX_PEOPLE = 4;        /* 한 번에 예약할 수 있는 인원 */
  var OPEN_DAYS_BEFORE = 28; /* 경기 며칠 전부터 예약이 열리는지 (가정: 일반 28일 전, 알림 신청자 30일 전) */
  /* 1차 운영 구장과 경기 요일 (가정: 2026 시즌 요일 패턴, 0=일 5=금 6=토) */
  var STADIUMS = {
    daejeon: { name: "대전 한화생명 볼파크", days: [5, 6, 0] },
    changwon: { name: "창원NC파크", days: [6, 0] }
  };
  var GAME_DAYS = [];        /* 실제 일정이 나오면 "YYYY-MM-DD" 목록을 넣으세요. 비어 있으면 월요일만 빼고 경기일로 보여줘요. */
  var KAKAO_URL = "";        /* 카카오톡 채널 주소가 생기면 넣으세요 */
  var TEAMS = [
    { name: "KIA 타이거즈", c: "#EA0029", c2: "#EA0029" },
    { name: "KT 위즈", c: "#231F20", c2: "#EB1C24" },
    { name: "LG 트윈스", c: "#C30452", c2: "#C30452" },
    { name: "NC 다이노스", c: "#315288", c2: "#AF917B" },
    { name: "SSG 랜더스", c: "#CE0E2D", c2: "#FFB81C" },
    { name: "두산 베어스", c: "#1A1748", c2: "#ED1C24" },
    { name: "롯데 자이언츠", c: "#041E42", c2: "#D00F31" },
    { name: "삼성 라이온즈", c: "#074CA1", c2: "#6BA3E0" },
    { name: "키움 히어로즈", c: "#820024", c2: "#C69C6D" },
    { name: "한화 이글스", c: "#FF6600", c2: "#FF6600" }
  ];
  var STORE = "jm-booking";

  /* ---------- 측정(GA4/GTM): 이벤트를 dataLayer로 보내요. 전화번호 같은 개인정보는 보내지 않아요. ---------- */
  window.dataLayer = window.dataLayer || [];
  function track(name, params) { window.dataLayer.push(Object.assign({ event: name }, params || {})); }
  var TEAM_ID = { "KIA 타이거즈": "kia", "KT 위즈": "kt", "LG 트윈스": "lg", "NC 다이노스": "nc", "SSG 랜더스": "ssg", "두산 베어스": "doosan", "롯데 자이언츠": "lotte", "삼성 라이온즈": "samsung", "키움 히어로즈": "kiwoom", "한화 이글스": "hanwha" };
  function item(teamName, qty) {
    return { item_id: "jm-day-pack", item_name: "직관메이트 당일 원정 패키지", item_category: teamName ? (TEAM_ID[teamName] || teamName) : "unknown", price: PRICE, quantity: qty || 1 };
  }
  function ecom(name, teamName, qty, extra, top) {
    window.dataLayer.push({ ecommerce: null });
    track(name, Object.assign({ team: teamName ? (TEAM_ID[teamName] || teamName) : undefined }, top || {}, { ecommerce: Object.assign({ currency: "KRW", value: PRICE * (qty || 1), items: [item(teamName, qty)] }, extra || {}) }));
  }
  var PAGE = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
  /* 예약하기로 가는 버튼 클릭 */
  document.querySelectorAll('a[href="reserve.html"]').forEach(function (a) {
    a.addEventListener("click", function () {
      track("click_cta", { cta_location: PAGE + "_" + (a.closest(".menu") ? "nav" : "body"), cta_text: a.textContent.trim() });
    });
  });
  /* FAQ 열기 (Q&A 페이지는 qna_q1~, 예약 페이지는 reserve_q1~) */
  document.querySelectorAll(".acc details").forEach(function (d, i) {
    var s = d.querySelector("summary");
    if (s) s.addEventListener("click", function () { if (!d.open) track("faq_open", { question_id: PAGE + "_q" + (i + 1) }); });
  });

  /* 예약 신청 내용이 이 함수로 들어와요. 지금은 시연용이라 저장되지 않아요. */
  function sendBooking(entry) { try { console.log("[직관메이트] 예약 신청", entry); } catch (e) {} }

  function $(id) { return document.getElementById(id); }
  function won(n) { return n.toLocaleString("ko-KR") + "원"; }
  function teamByName(name) { return TEAMS.filter(function (t) { return t.name === name; })[0] || null; }
  /* 팀 대표색은 CSS에서 흰색과 섞어 은은하게 써요 */
  function applyTeam(t) {
    if (!t) return;
    document.body.style.setProperty("--team", t.c);
    document.body.style.setProperty("--team2", t.c2);
  }

  /* 클릭하면 목록이 펼쳐지는 팀 선택 상자 */
  var ARROW = '<svg viewBox="0 0 7 4" aria-hidden="true"><path fill="currentColor" d="M0 0h7v1H0zM1 1h5v1H1zM2 2h3v1H2zM3 3h1v1H3z"/></svg>';
  function Picker(root, labelId, onPick) {
    var id = root.id, btn = document.createElement("button"), list = document.createElement("ul"), active = -1, value = "";
    btn.type = "button";
    btn.className = "picker-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    btn.setAttribute("aria-controls", id + "-list");
    btn.setAttribute("aria-labelledby", labelId + " " + id + "-value");
    btn.innerHTML = '<span id="' + id + '-value">팀을 골라 주세요</span>' + ARROW;
    list.id = id + "-list";
    list.className = "picker-list";
    list.tabIndex = -1;
    list.hidden = true;
    list.setAttribute("role", "listbox");
    list.setAttribute("aria-labelledby", labelId);
    TEAMS.forEach(function (t, i) {
      var li = document.createElement("li");
      li.id = id + "-" + i;
      li.textContent = t.name;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      li.addEventListener("click", function () { choose(i); });
      list.appendChild(li);
    });
    root.appendChild(btn);
    root.appendChild(list);

    function index() { return TEAMS.map(function (t) { return t.name; }).indexOf(value); }
    function setActive(i) {
      if (active >= 0) list.children[active].classList.remove("active");
      active = i;
      if (i < 0) { list.removeAttribute("aria-activedescendant"); return; }
      list.children[i].classList.add("active");
      list.setAttribute("aria-activedescendant", id + "-" + i);
      list.children[i].scrollIntoView({ block: "nearest" });
    }
    function open() { list.hidden = false; btn.setAttribute("aria-expanded", "true"); setActive(Math.max(index(), 0)); list.focus(); }
    function close(refocus) {
      if (list.hidden) return;
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      setActive(-1);
      if (refocus) btn.focus();
    }
    function set(name) {
      value = name;
      $(id + "-value").textContent = name || "팀을 골라 주세요";
      var at = index();
      Array.prototype.forEach.call(list.children, function (li, n) { li.setAttribute("aria-selected", n === at ? "true" : "false"); });
    }
    function choose(i) { set(TEAMS[i].name); close(true); onPick(TEAMS[i]); }
    btn.addEventListener("click", function () { if (list.hidden) open(); else close(true); });
    list.addEventListener("keydown", function (e) {
      var n = TEAMS.length;
      if (e.key === "ArrowDown") { e.preventDefault(); setActive((active + 1) % n); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive((active - 1 + n) % n); }
      else if (e.key === "Home") { e.preventDefault(); setActive(0); }
      else if (e.key === "End") { e.preventDefault(); setActive(n - 1); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
      else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === "Tab") { close(false); }
    });
    document.addEventListener("click", function (e) { if (!root.contains(e.target)) close(false); });
    return { btn: btn, set: set, isOpen: function () { return !list.hidden; }, close: close };
  }

  /* ---------- 예약 페이지 ---------- */
  function initReserve() {
    var WEEK = "일월화수목금토";
    var team = null, date = null;
    var view = today();
    view.setDate(1);

    function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
    function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
    function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
    function fmt(d) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일(" + WEEK[d.getDay()] + ")"; }

    function setErr(id, msg, input) {
      $(id).textContent = msg || "";
      if (input) { if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid"); }
      return !msg;
    }

    function pick(t) {
      team = t;
      applyTeam(t);
      panelPicker.set(t.name);
      popupPicker.set(t.name);
      setErr("team-err", "", panelPicker.btn);
      if (dlg.open) dlg.close();
    }
    var dlg = $("team-dlg");
    var panelPicker = Picker($("team-picker"), "team-label", pick);
    var popupPicker = Picker($("popup-picker"), "popup-label", pick);
    $("team-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("cancel", function (e) { if (popupPicker.isOpen()) { e.preventDefault(); popupPicker.close(true); } });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

    /* 구장을 바꾸면 그 구장 경기 요일로 달력을 다시 그려요 */
    var stadiumEl = $("stadium");
    stadiumEl.addEventListener("change", function () {
      if (date && STADIUMS[stadiumEl.value].days.indexOf(date.getDay()) < 0) {
        date = null;
        $("cal-status").textContent = STADIUMS[stadiumEl.value].name + " 경기 날짜를 다시 골라 주세요.";
      }
      renderCal();
    });
    function stadium() { return STADIUMS[stadiumEl.value]; }

    /* 달력: 예약이 열린 날(경기 28일 전부터)만 고를 수 있어요 */
    function stateOf(d) {
      var t = today();
      if (d < t) return "past";
      var game = GAME_DAYS.length ? GAME_DAYS.indexOf(iso(d)) >= 0 : STADIUMS[stadiumEl.value].days.indexOf(d.getDay()) >= 0;
      if (!game) return "nogame";
      return d <= addDays(t, OPEN_DAYS_BEFORE) ? "open" : "wait";
    }
    function renderCal() {
      var cal = $("cal"), first = today();
      first.setDate(1);
      cal.innerHTML = "";
      $("cal-month").textContent = view.getFullYear() + "년 " + (view.getMonth() + 1) + "월";
      $("cal-prev").disabled = view <= first;
      $("cal-next").disabled = (view.getFullYear() - first.getFullYear()) * 12 + view.getMonth() - first.getMonth() >= 5;
      for (var w = 0; w < 7; w++) { var h = document.createElement("div"); h.className = "dow"; h.textContent = WEEK[w]; cal.appendChild(h); }
      for (var b = 0; b < view.getDay(); b++) cal.appendChild(document.createElement("div"));
      var last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var n = 1; n <= last; n++) cal.appendChild(dayButton(new Date(view.getFullYear(), view.getMonth(), n)));
    }
    function dayButton(d) {
      var st = stateOf(d), b = document.createElement("button");
      b.type = "button";
      b.className = "day " + st;
      b.textContent = d.getDate();
      b.setAttribute("aria-label", fmt(d) + " " + { open: "예약 가능", wait: "오픈 전", nogame: "경기 없음", past: "지난 날짜" }[st]);
      b.setAttribute("aria-pressed", date && iso(date) === iso(d) ? "true" : "false");
      b.disabled = st !== "open";
      b.addEventListener("click", function () {
        date = d;
        setErr("date-err", "");
        renderCal();
        $("cal-status").textContent = fmt(d) + " 경기를 골랐어요.";
        ecom("add_to_cart", team && team.name, people() || 1, { game_date: iso(d) }, { stadium: stadiumEl.value });
        var again = $("cal").querySelector('.day[aria-pressed="true"]');
        if (again) again.focus();
      });
      return b;
    }
    $("cal-prev").addEventListener("click", function () { view.setMonth(view.getMonth() - 1); renderCal(); });
    $("cal-next").addEventListener("click", function () { view.setMonth(view.getMonth() + 1); renderCal(); });
    renderCal();

    /* 인원수: 직접 입력하거나 -, + 버튼으로 바꿔요 */
    var peopleEl = $("people"), phoneEl = $("phone"), agreeEl = $("agree");
    function people() {
      var n = Number(peopleEl.value);
      return Number.isInteger(n) && n >= 1 && n <= MAX_PEOPLE ? n : 0;
    }
    function updatePeople() {
      var n = people();
      $("total").textContent = n ? won(PRICE * n) : "-";
      $("minus").disabled = n <= 1;
      $("plus").disabled = n >= MAX_PEOPLE;
      if (n) setErr("people-err", "", peopleEl);
    }
    peopleEl.max = MAX_PEOPLE;
    peopleEl.addEventListener("input", updatePeople);
    $("minus").addEventListener("click", function () { peopleEl.value = Math.max(people() - 1, 1); updatePeople(); });
    $("plus").addEventListener("click", function () { peopleEl.value = Math.min(people() + 1, MAX_PEOPLE); updatePeople(); });
    updatePeople();

    phoneEl.addEventListener("input", function () {
      var d = phoneEl.value.replace(/\D/g, "").slice(0, 11);
      phoneEl.value = d.length < 4 ? d : d.length < 8 ? d.slice(0, 3) + "-" + d.slice(3) : d.slice(0, 3) + "-" + d.slice(3, d.length - 4) + "-" + d.slice(-4);
      if (/^01[016789]\d{7,8}$/.test(d)) setErr("phone-err", "", phoneEl);
    });
    agreeEl.addEventListener("change", function () { if (agreeEl.checked) setErr("agree-err", ""); });

    $("book-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var n = people(), place = $("place").value.trim();
      ecom("begin_checkout", team && team.name, n || 1, null, { stadium: stadiumEl.value });
      var teamOk = setErr("team-err", team ? "" : "응원하는 팀을 골라 주세요.", panelPicker.btn);
      var dateOk = setErr("date-err", date ? "" : "경기 날짜를 골라 주세요.");
      var peopleOk = setErr("people-err", n ? "" : "인원수는 1명에서 " + MAX_PEOPLE + "명까지 입력해 주세요.", peopleEl);
      var phoneOk = setErr("phone-err", /^01[016789]\d{7,8}$/.test(phoneEl.value.replace(/\D/g, "")) ? "" : "전화번호를 확인해 주세요. 예: 010-1234-5678", phoneEl);
      var agreeOk = setErr("agree-err", agreeEl.checked ? "" : "개인정보 수집·이용에 동의해 주세요.");
      if (!teamOk) { panelPicker.btn.focus(); return; }
      if (!dateOk) { $("cal-month").scrollIntoView({ block: "center" }); return; }
      if (!peopleOk) { peopleEl.focus(); return; }
      if (!phoneOk) { phoneEl.focus(); return; }
      if (!agreeOk) { agreeEl.focus(); return; }

      var entry = { team: team.name, stadium: stadium().name, stadiumId: stadiumEl.value, gameDate: iso(date), dateLabel: fmt(date), people: n, total: won(PRICE * n), place: place, phone: phoneEl.value };
      sendBooking(entry);
      entry.tracked = false;
      try { sessionStorage.setItem(STORE, JSON.stringify(entry)); } catch (err) {}
      location.href = "done.html";
    });

    /* 좁은 화면: 예약칸으로 바로 가는 버튼 */
    var jump = $("jump");
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { jump.classList.toggle("off", es[0].isIntersecting); }).observe($("book"));
    }

    ecom("view_item", null, 1);
    /* 들어오면 먼저 응원팀을 물어봐요 */
    dlg.showModal();
    popupPicker.btn.focus();
  }

  /* ---------- 예약 완료 페이지 ---------- */
  function initDone() {
    var data = null;
    try { data = JSON.parse(sessionStorage.getItem(STORE)); } catch (e) {}
    if (data) {
      applyTeam(teamByName(data.team));
      $("d-team").textContent = data.team;
      if ($("d-stadium")) $("d-stadium").textContent = data.stadium || "";
      $("d-date").textContent = data.dateLabel;
      $("d-people").textContent = data.people + "명";
      $("d-total").textContent = data.total;
      $("d-phone").textContent = data.phone;
      if (data.place) $("d-place").textContent = data.place; else { $("d-place").previousElementSibling.hidden = true; $("d-place").hidden = true; }
      $("d-summary").hidden = false;
      /* 새로고침해도 한 번만 기록돼요 */
      if (data.tracked === false) {
        ecom("purchase", data.team, data.people, { transaction_id: "JM-" + Date.now(), game_date: data.gameDate }, { stadium: data.stadiumId });
        data.tracked = true;
        try { sessionStorage.setItem(STORE, JSON.stringify(data)); } catch (e) {}
      }
    }
    var kakao = $("kakao");
    if (KAKAO_URL) { kakao.href = KAKAO_URL; kakao.target = "_blank"; kakao.rel = "noopener"; }
    else kakao.addEventListener("click", function (e) { e.preventDefault(); $("kakao-msg").textContent = "카카오톡 채널은 곧 열려요."; });
  }

  /* ---------- Q&A: 직접 질문하기 (서버가 없어 이 브라우저에만 저장돼요) ---------- */
  function initAsk() {
    var KEY = "jm-questions", memory = [];
    var form = $("ask-form"), list = $("ask-list"), nameEl = $("ask-name"), titleEl = $("ask-title-input"), bodyEl = $("ask-body");

    function load() {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return memory; }
    }
    function save(items) {
      memory = items;
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    }
    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function render(openId) {
      var items = load();
      list.innerHTML = "";
      $("ask-empty").hidden = items.length > 0;
      items.forEach(function (q) {
        var d = el("details", "block"), s = el("summary"), tail = el("span", "q-tail"), plus = el("span", "plus"), ans = el("div", "ans");
        d.open = q.id === openId;
        plus.setAttribute("aria-hidden", "true");
        tail.append(el("span", "badge", "답변 대기"), plus);
        s.append(el("span", null, q.title), tail);
        ans.append(el("p", "q-body", q.body), el("p", "small", q.name + " · " + q.date));
        var del = el("button", "q-del", "삭제");
        del.type = "button";
        del.addEventListener("click", function () {
          save(load().filter(function (x) { return x.id !== q.id; }));
          render();
          $("ask-status").textContent = "질문을 삭제했어요.";
        });
        ans.append(del);
        d.append(s, ans);
        list.appendChild(d);
      });
    }
    function setErr(id, msg, input) {
      $(id).textContent = msg;
      if (msg) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
      return !msg;
    }
    [[nameEl, "ask-name-err"], [titleEl, "ask-title-err"], [bodyEl, "ask-body-err"]].forEach(function (f) {
      f[0].addEventListener("input", function () { setErr(f[1], "", f[0]); });
    });
    bodyEl.addEventListener("input", function () { $("ask-count").textContent = bodyEl.value.length + " / 500"; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = nameEl.value.trim(), title = titleEl.value.trim(), body = bodyEl.value.trim();
      var ok = setErr("ask-name-err", name ? "" : "이름을 적어 주세요.", nameEl);
      ok = setErr("ask-title-err", title.length >= 2 ? "" : "제목을 2글자 이상 적어 주세요.", titleEl) && ok;
      ok = setErr("ask-body-err", body.length >= 5 ? "" : "내용을 5글자 이상 적어 주세요.", bodyEl) && ok;
      if (!ok) { form.querySelector('[aria-invalid="true"]').focus(); return; }

      var now = new Date(), id = "q" + now.getTime();
      var date = now.getFullYear() + "." + String(now.getMonth() + 1).padStart(2, "0") + "." + String(now.getDate()).padStart(2, "0");
      save([{ id: id, name: name, title: title, body: body, date: date }].concat(load()));
      form.reset();
      $("ask-count").textContent = "0 / 500";
      render(id);
      $("ask-status").textContent = "질문이 등록됐어요!";
      $("ask-list-title").focus();
      $("ask-list-title").scrollIntoView({ block: "center" });
    });
    render();
  }

  if ($("ask-form")) initAsk();
  if ($("book-form")) initReserve();
  if ($("done-card")) initDone();

  /* ---------- 복셀 렌더러 (landing-pixel.html과 같은 방식) ---------- */
  var INK = [42, 16, 112];
  var COL = { ink: "#2a1070", violet: "#7c4dff", deep: "#4a1fc7", lilac: "#c9b6ff", pale: "#f1ecff", mint: "#4ff0c4", lime: "#ccff4d", white: "#ffffff", glass: "#b8fff0", skin: "#ffe0cc", hair: "#4a2a9c", stitch: "#e8302a" };
  var NORMALS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  var SHADE = [.82, .66, 1, .5, .93, .62];
  var shadeCache = {};
  function shade(hex, f, edge) {
    var key = hex + f + (edge ? "e" : "");
    if (shadeCache[key]) return shadeCache[key];
    var k = SHADE[f] * (edge ? .9 : 1);
    var rgb = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16); });
    return shadeCache[key] = "rgb(" + rgb.map(function (v, i) { return Math.round(INK[i] + (v - INK[i]) * k); }).join(",") + ")";
  }
  function Model() {
    var m = new Map();
    return {
      m: m,
      set: function (x, y, z, c) { m.set(x + "," + y + "," + z, c); },
      del: function (x, y, z) { m.delete(x + "," + y + "," + z); },
      box: function (x, y, z, w, h, d, c) {
        for (var i = 0; i < w; i++) for (var j = 0; j < h; j++) for (var k = 0; k < d; k++) this.set(x + i, y + j, z + k, c);
        return this;
      }
    };
  }
  function bake(model, center) {
    var out = [], lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    model.m.forEach(function (c, key) {
      var p = key.split(",").map(Number), mask = 0;
      for (var a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p[a]); hi[a] = Math.max(hi[a], p[a]); }
      NORMALS.forEach(function (n, i) {
        if (!model.m.has((p[0] + n[0]) + "," + (p[1] + n[1]) + "," + (p[2] + n[2]))) mask |= 1 << i;
      });
      if (mask) out.push({ x: p[0], y: p[1], z: p[2], c: c, mask: mask });
    });
    if (center) out.forEach(function (v) { v.x -= (lo[0] + hi[0]) / 2; v.y -= (lo[1] + hi[1]) / 2; v.z -= (lo[2] + hi[2]) / 2; });
    return out;
  }
  function Scene(canvas, groups, opt) {
    this.canvas = canvas; this.ctx = canvas.getContext("2d"); this.groups = groups;
    this.o = Object.assign({ yaw: .6, swing: .4, speed: .9, pitch: .5, cy: .5, pad: 1, reach: 0 }, opt);
    this.visible = false; this.last = 0;
    var r = 0;
    groups.forEach(function (g) { g.v.forEach(function (v) { r = Math.max(r, Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)); }); });
    this.radius = this.o.reach || r;
    this.resize();
  }
  Scene.prototype.resize = function () {
    var box = this.canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    if (!box.width) return;
    this.canvas.width = Math.round(box.width * dpr);
    this.canvas.height = Math.round(box.height * dpr);
    this.S = (this.o.fit === "width" ? this.canvas.width : Math.min(this.canvas.width, this.canvas.height)) / (2 * (this.radius + this.o.pad));
    this.draw(this.last || 0);
  };
  Scene.prototype.draw = function (t) {
    var o = this.o, ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, S = this.S;
    if (!S) return;
    this.last = t;
    var yaw = o.yaw + Math.sin(t * o.speed) * o.swing;
    var c = Math.cos(yaw), s = Math.sin(yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch);
    var B = [[c, s * sp, s * cp], [0, -cp, sp], [-s, c * sp, c * cp]];
    var facing = [], f;
    for (f = 0; f < 6; f++) facing[f] = (f & 1 ? -1 : 1) * B[f >> 1][2] > 0;
    var items = [];
    this.groups.forEach(function (g) {
      var off = g.at ? g.at(t) : [0, 0, 0];
      g.v.forEach(function (v) {
        var x = v.x + off[0], y = v.y + off[1], z = v.z + off[2];
        items.push({ d: x * B[0][2] + y * B[1][2] + z * B[2][2], sx: x * B[0][0] + y * B[1][0] + z * B[2][0], sy: x * B[0][1] + y * B[1][1] + z * B[2][1], v: v });
      });
    });
    items.sort(function (a, b) { return a.d - b.d; });
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = Math.max(.6, S * .05);
    ctx.lineJoin = "round";
    var ox = W / 2, oy = H * o.cy;
    items.forEach(function (it) {
      for (f = 0; f < 6; f++) {
        if (!facing[f] || !(it.v.mask >> f & 1)) continue;
        var axis = f >> 1, sign = f & 1 ? -.5 : .5, a = B[axis], u = B[(axis + 1) % 3], w = B[(axis + 2) % 3];
        var cx = ox + it.sx * S + a[0] * sign * S, cy = oy + it.sy * S + a[1] * sign * S;
        var ux = u[0] * S / 2, uy = u[1] * S / 2, wx = w[0] * S / 2, wy = w[1] * S / 2;
        ctx.beginPath();
        ctx.moveTo(cx - ux - wx, cy - uy - wy);
        ctx.lineTo(cx + ux - wx, cy + uy - wy);
        ctx.lineTo(cx + ux + wx, cy + uy + wy);
        ctx.lineTo(cx - ux + wx, cy - uy + wy);
        ctx.closePath();
        ctx.fillStyle = shade(it.v.c, f);
        ctx.strokeStyle = shade(it.v.c, f, true);
        ctx.fill();
        ctx.stroke();
      }
    });
  };

  /* 입체 좌표가 캔버스의 어디에 그려지는지(CSS 픽셀) 알려줘요 */
  Scene.prototype.project = function (x, y, z) {
    var o = this.o, c = Math.cos(o.yaw), s = Math.sin(o.yaw), cp = Math.cos(o.pitch), sp = Math.sin(o.pitch);
    var k = this.canvas.clientWidth / this.canvas.width;
    return {
      x: (this.canvas.width / 2 + (x * c - z * s) * this.S) * k,
      y: (this.canvas.height * o.cy + (x * s * sp - y * cp + z * c * sp) * this.S) * k
    };
  };

  /* ---------- 모델 ---------- */
  function buildBall(r) {
    var m = Model(), R = r + .5;
    for (var x = -r; x <= r; x++) for (var y = -r; y <= r; y++) for (var z = -r; z <= r; z++) {
      if (x * x + y * y + z * z > R * R) continue;
      var outer = (Math.abs(z) + 1) * (Math.abs(z) + 1) + x * x + y * y > R * R;
      var line = Math.round(r * .3 + y * y * (r * .7) / (r * r));
      var seam = outer && z !== 0 && Math.abs(y) < r && (Math.abs(x) === line || (y % 2 === 0 && Math.abs(x) === line + 1));
      m.set(x, y, z, seam ? COL.stitch : COL.white);
    }
    return m;
  }
  function buildBus() {
    var m = Model();
    m.box(-8, 2, -3, 17, 7, 7, COL.white);
    m.box(-8, 2, -3, 17, 1, 7, COL.lilac);
    m.box(-8, 4, -3, 17, 1, 7, COL.lime);
    m.box(-7, 9, -2, 15, 1, 5, COL.lime);
    m.box(-3, 10, -1, 6, 1, 3, COL.lilac);
    [3, -3].forEach(function (z) {
      for (var i = 0; i < 5; i++) {
        var x = -7 + i * 3;
        m.box(x, 5, z, 2, 3, 1, COL.glass);
        if (i % 2 === 0 || z < 0) { m.box(x, 5, z, 2, 2, 1, COL.skin); m.box(x, 7, z, 2, 1, 1, COL.hair); m.set(x, 6, z, COL.ink); }
      }
    });
    m.box(8, 5, -2, 1, 3, 5, COL.glass);
    m.box(-8, 5, -2, 1, 3, 5, COL.glass);
    m.set(8, 3, -2, COL.lime); m.set(8, 3, 2, COL.lime);
    [-5, 5].forEach(function (cx) {
      [-4, 4].forEach(function (z) {
        m.box(cx - 2, 0, z, 4, 4, 1, COL.ink);
        m.box(cx - 1, 1, z, 2, 2, 1, COL.lilac);
        [[-2, 0], [1, 0], [-2, 3], [1, 3]].forEach(function (p) { m.del(cx + p[0], p[1], z); });
      });
    });
    return m;
  }
  function buildPin() {
    var m = Model(), cy = 12, r = 6, x, y, z;
    for (x = -r; x <= r; x++) for (y = -r; y <= r; y++) for (z = -2; z <= 2; z++) {
      if (x * x + y * y > (r + .3) * (r + .3)) continue;
      m.set(x, cy + y, z, (x * x + y * y <= 5) ? COL.white : COL.violet);
    }
    for (y = 0; y < 8; y++) {
      var w = Math.floor(y * .68);
      for (x = -w; x <= w; x++) for (z = -Math.min(w, 2); z <= Math.min(w, 2); z++) m.set(x, y, z, COL.violet);
    }
    return m;
  }
  function buildTicket() {
    var m = Model();
    m.box(0, 0, 0, 20, 11, 2, COL.lime);
    m.box(14, 0, 0, 6, 11, 2, COL.mint);
    for (var y = 0; y < 11; y += 2) { m.del(13, y, 0); m.del(13, y, 1); }
    [[0, 5], [0, 6], [19, 5], [19, 6]].forEach(function (p) { m.del(p[0], p[1], 0); m.del(p[0], p[1], 1); });
    m.box(3, 7, 2, 8, 1, 1, COL.violet);
    m.box(3, 5, 2, 6, 1, 1, COL.ink);
    m.box(3, 3, 2, 8, 1, 1, COL.ink);
    m.box(15, 3, 2, 4, 5, 1, COL.white);
    m.box(16, 5, 2, 2, 1, 1, COL.violet);
    return m;
  }
  function buildCamera() {
    var m = Model();
    m.box(-7, 0, -3, 15, 10, 6, COL.white);
    m.box(-7, 7, -3, 15, 1, 6, COL.lilac);
    m.box(-5, 10, -2, 4, 2, 4, COL.ink);
    m.box(3, 10, -2, 4, 1, 4, COL.violet);
    m.box(5, 8, 3, 2, 1, 1, COL.lime);
    for (var x = -4; x <= 4; x++) for (var y = -4; y <= 4; y++) {
      var d = x * x + y * y;
      if (d > 17) continue;
      for (var z = 3; z <= 5; z++) m.set(x, 4 + y, z, d <= 5 ? COL.mint : COL.ink);
      if (d <= 1) m.set(x, 4 + y, 5, COL.white);
    }
    return m;
  }
  function buildTrain() {
    var m = Model();
    m.box(-12, 0, -4, 25, 1, 1, COL.lilac);
    m.box(-12, 0, 3, 25, 1, 1, COL.lilac);
    m.box(-10, 2, -3, 18, 8, 7, COL.white);
    m.box(-10, 4, -3, 18, 1, 7, COL.lime);
    m.box(8, 2, -3, 2, 7, 7, COL.violet);
    m.box(10, 2, -2, 2, 5, 5, COL.violet);
    m.box(8, 6, -2, 3, 2, 5, COL.glass);
    m.box(-10, 10, -2, 18, 1, 5, COL.lilac);
    [3, -3].forEach(function (z) {
      for (var i = 0; i < 4; i++) m.box(-8 + i * 4, 6, z, 3, 3, 1, COL.glass);
    });
    [-7, 5].forEach(function (x) { [-4, 3].forEach(function (z) { m.box(x, 1, z, 3, 2, 1, COL.ink); }); });
    return m;
  }

  /* 주자: +x 방향을 보고 달려요. pose 0~3은 달리기, "slide"는 슬라이딩 */
  function runnerCommon(m) {
    m.box(-2, 5, -2, 4, 5, 4, COL.white);
    m.box(-2, 5, -2, 4, 1, 4, COL.ink);
    m.box(-2, 8, -2, 4, 1, 4, COL.lime);
    m.box(-3, 10, -3, 6, 5, 6, COL.skin);
    m.box(-3, 10, -3, 1, 4, 6, COL.hair);
    m.box(-3, 14, -3, 6, 2, 6, COL.violet);
    m.box(3, 14, -2, 3, 1, 4, COL.deep);
    m.set(2, 12, -2, COL.ink); m.set(2, 12, 1, COL.ink);
    m.box(-5, 10, -1, 2, 3, 2, COL.hair);
    m.box(-4, 13, -1, 1, 1, 2, COL.lime);
  }
  function runnerLeg(m, z, pose) {
    if (pose === "F") {
      m.box(-1, 4, z, 3, 1, 2, COL.white); m.box(1, 3, z, 2, 1, 2, COL.white); m.box(2, 2, z, 2, 1, 2, COL.white);
      m.box(3, 1, z, 2, 1, 2, COL.violet); m.box(3, 0, z, 4, 1, 2, COL.ink);
    } else if (pose === "B") {
      m.box(-1, 4, z, 3, 1, 2, COL.white); m.box(-2, 3, z, 2, 1, 2, COL.white);
      m.box(-4, 3, z, 2, 1, 2, COL.violet); m.box(-6, 4, z, 2, 2, 2, COL.ink);
    } else {
      m.box(0, 2, z, 2, 3, 2, COL.white); m.box(0, 1, z, 2, 1, 2, COL.violet); m.box(0, 0, z, 3, 1, 2, COL.ink);
    }
  }
  function runnerArm(m, z, pose) {
    if (pose === "F") { m.box(1, 8, z, 3, 2, 1, COL.white); m.box(4, 9, z, 2, 2, 1, COL.skin); }
    else if (pose === "B") { m.box(-4, 8, z, 3, 2, 1, COL.white); m.box(-6, 6, z, 2, 2, 1, COL.skin); }
    else { m.box(-1, 7, z, 2, 3, 1, COL.white); m.box(-1, 6, z, 2, 1, 1, COL.skin); }
  }
  function buildRunner(p) {
    var m = Model(), near = ["F", "M", "B", "M"][p], far = ["B", "M", "F", "M"][p];
    runnerCommon(m);
    runnerLeg(m, 0, near);
    runnerLeg(m, -2, far);
    runnerArm(m, 2, far);
    runnerArm(m, -3, near);
    return m;
  }
  function buildSlide() {
    var m = Model();
    m.box(1, 1, 0, 7, 2, 2, COL.white); m.box(8, 1, 0, 3, 2, 2, COL.violet); m.box(11, 0, 0, 2, 4, 2, COL.ink);
    m.box(1, 1, -2, 4, 2, 2, COL.white); m.box(5, 0, -2, 2, 2, 2, COL.violet); m.box(7, 0, -2, 3, 2, 2, COL.ink);
    m.box(-4, 2, -2, 5, 4, 4, COL.white);
    m.box(0, 2, -2, 1, 4, 4, COL.ink);
    m.box(-7, 3, -2, 4, 4, 4, COL.white);
    m.box(-5, 3, -2, 1, 4, 4, COL.lime);
    m.box(-12, 6, -3, 6, 5, 6, COL.skin);
    m.box(-12, 6, -3, 1, 4, 6, COL.hair);
    m.box(-12, 10, -3, 6, 2, 6, COL.violet);
    m.box(-6, 10, -2, 3, 1, 4, COL.deep);
    m.set(-7, 8, -2, COL.ink); m.set(-7, 8, 1, COL.ink);
    m.box(-14, 7, -1, 2, 3, 2, COL.hair);
    m.box(-6, 7, 2, 2, 5, 1, COL.white); m.box(-6, 12, 2, 2, 2, 1, COL.skin);
    m.box(-8, 1, -3, 5, 2, 1, COL.white); m.box(-10, 0, -3, 2, 2, 1, COL.skin);
    return m;
  }

  function buildIsland(R) {
    var m = Model();
    for (var x = -R; x <= R; x++) for (var z = -R; z <= R; z++) {
      var d = Math.hypot(x, z);
      if (d > R + .3) continue;
      var road = Math.abs(z) <= 5, dash = z === 0 && ((x % 6) + 6) % 6 < 3;
      var top = dash ? COL.white : road ? COL.lilac : (((Math.floor(x / 3) + 99) % 2) ? COL.mint : "#2fd9ad");
      m.set(x, -1, z, top);
      if (d <= R - .4) m.set(x, -2, z, COL.pale);
      if (d <= R - 2) m.set(x, -3, z, COL.lilac);
      if (d <= R - 5) m.set(x, -4, z, COL.deep);
      if (d <= R - 9) m.set(x, -5, z, COL.ink);
    }
    return m;
  }
  function buildLight() {
    var m = Model();
    m.box(0, 0, 0, 1, 13, 1, COL.pale);
    m.box(-2, 13, 0, 5, 3, 1, COL.ink);
    for (var i = -2; i <= 2; i++) for (var j = 13; j <= 15; j++) if ((i + j) % 2 === 0) m.set(i, j, 1, COL.lime);
    return m;
  }
  function buildMate(shirt, cap) {
    var m = Model();
    m.set(-1, 0, 0, COL.ink); m.set(1, 0, 0, COL.ink);
    m.box(-1, 1, 0, 3, 2, 1, shirt);
    m.box(-1, 3, -1, 3, 3, 3, COL.skin);
    m.box(-1, 5, -1, 3, 1, 3, cap || COL.hair);
    m.box(-1, 2, -1, 3, 3, 1, COL.hair);
    if (cap) m.box(-1, 5, 2, 3, 1, 1, cap);
    m.set(-1, 4, 1, COL.ink); m.set(1, 4, 1, COL.ink);
    m.box(2, 3, 0, 1, 3, 1, COL.skin);
    return m;
  }
  function buildGuide() {
    var m = Model();
    m.box(-2, 0, 0, 2, 3, 2, COL.ink); m.box(1, 0, 0, 2, 3, 2, COL.ink);
    m.box(-2, 3, -1, 5, 5, 4, COL.white);
    m.box(-2, 4, -1, 5, 3, 4, COL.lime);
    m.box(0, 4, 2, 1, 3, 1, COL.white);
    m.box(-3, 8, -3, 7, 6, 7, COL.skin);
    m.box(-3, 8, -3, 7, 6, 1, COL.hair);
    m.box(-3, 9, -2, 1, 5, 4, COL.hair); m.box(3, 9, -2, 1, 5, 4, COL.hair);
    m.box(-3, 5, -3, 7, 3, 1, COL.hair);
    m.box(-3, 13, -3, 7, 2, 7, COL.violet);
    m.box(-3, 13, 4, 7, 1, 2, COL.violet);
    m.box(-2, 10, 3, 1, 2, 1, COL.ink); m.box(2, 10, 3, 1, 2, 1, COL.ink);
    m.set(0, 9, 3, COL.ink);
    m.box(-4, 4, 0, 1, 4, 2, COL.white); m.box(-4, 3, 0, 1, 1, 2, COL.skin);
    m.box(3, 6, 0, 3, 2, 2, COL.white);
    m.box(6, 5, 0, 2, 4, 2, COL.skin);
    m.box(7, 0, 0, 1, 25, 1, COL.ink);
    for (var k = 0; k < 11; k++) {
      var cut = Math.ceil(k / 2);
      for (var y = 14 + cut; y <= 24 - cut; y++) m.set(8 + k, y, 0, COL.lime);
    }
    return m;
  }
  function buildBackpack() {
    var m = Model();
    m.box(-6, 0, -3, 13, 16, 7, COL.violet);
    m.box(-5, 16, -2, 11, 2, 5, COL.violet);
    m.box(-5, 13, 4, 11, 1, 1, COL.lime);
    m.box(-4, 2, 4, 9, 8, 2, COL.lilac);
    m.box(-4, 10, 4, 9, 1, 2, COL.lime);
    m.box(0, 7, 6, 1, 3, 1, COL.ink);
    m.box(-2, 18, 0, 5, 1, 1, COL.ink);
    m.box(-2, 19, 0, 1, 1, 1, COL.ink); m.box(2, 19, 0, 1, 1, 1, COL.ink);
    m.box(-2, 20, 0, 5, 1, 1, COL.ink);
    [-7, 7].forEach(function (x) { m.box(x, 2, -1, 1, 7, 4, COL.lilac); });
    [[-6, 0], [6, 0], [-6, 15], [6, 15]].forEach(function (p) { m.box(p[0], p[1], -3, 1, 1, 7, COL.pale); m.del(p[0], p[1], 0); });
    return m;
  }

  /* ---------- 장면 ---------- */
  var scenes = [];
  function bobbing(amount) { return reduce ? null : function (t) { return [0, Math.abs(Math.sin(t * 3.2)) * amount, 0]; }; }
  var builders = { ball: function () { return buildBall(7); }, bus: buildBus, pin: buildPin, ticket: buildTicket, camera: buildCamera, train: buildTrain, guide: buildGuide, backpack: buildBackpack };
  document.querySelectorAll("[data-vox]").forEach(function (cv) {
    var name = cv.dataset.vox, logo = cv.hasAttribute("data-logo");
    scenes.push(new Scene(cv, [{ v: bake(builders[name](), true), at: logo ? null : bobbing(1.6) }], { pad: logo ? .4 : 2.4, pitch: logo ? .2 : .42, yaw: logo ? 0 : .4, swing: logo ? .5 : .34 }));
  });
  /* 예약 페이지 첫 화면: 랜딩페이지의 버스 섬 */
  if ($("hero-vox")) {
    var hopAt = function (x, z, phase, height, speed) {
      return reduce ? function () { return [x, 0, z]; } : function (t) { return [x, Math.abs(Math.sin(t * speed + phase)) * height, z]; };
    };
    var R = 14;
    scenes.push(new Scene($("hero-vox"), [
      { v: bake(buildIsland(R)) },
      { v: bake(buildLight()), at: function () { return [-9, 0, -9]; } },
      { v: bake(buildBus()), at: reduce ? function () { return [0, 0, -1]; } : function (t) { return [0, Math.abs(Math.sin(t * 5)) * .7, -1]; } },
      { v: bake(buildMate(COL.lime, null)), at: hopAt(-6, 9, 0, 2, 3.6) },
      { v: bake(buildMate(COL.white, COL.lime)), at: hopAt(0, 10, 1, 2, 3.6) },
      { v: bake(buildMate(COL.violet, null)), at: hopAt(6, 9, 2, 2, 3.6) }
    ], { reach: R, pad: 2.2, cy: .63, pitch: .52, yaw: .5, swing: .3, speed: .55 }));
  }

  if ("IntersectionObserver" in window) {
    var vis = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        scenes.forEach(function (s) { if (s.canvas === e.target) { s.visible = e.isIntersecting; if (e.isIntersecting && !s.S) s.resize(); } });
      });
    });
    scenes.forEach(function (s) { vis.observe(s.canvas); });
    var rv = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); rv.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".rv").forEach(function (el) { rv.observe(el); });
  } else {
    scenes.forEach(function (s) { s.visible = true; });
    document.querySelectorAll(".rv").forEach(function (el) { el.classList.add("in"); });
  }
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function (es) {
      es.forEach(function (e) { scenes.forEach(function (s) { if (s.canvas === e.target) s.resize(); }); });
    });
    scenes.forEach(function (s) { ro.observe(s.canvas); });
  }
  if (!reduce) {
    var prev = 0;
    (function loop(now) {
      requestAnimationFrame(loop);
      if (now - prev < 33) return;
      prev = now;
      var t = now / 1000;
      scenes.forEach(function (s) { if (s.visible) s.draw(t); });
    })(0);
  }

  /* ---------- 상품 소개: 화면은 고정되고, 스크롤하면 주자가 베이스를 돌아요 ---------- */
  var pin = $("pin");
  if (!pin) return;

  /* 한 바퀴 시간표(단위: 칸). 출발 전 대기 → 달리기 1칸 → 베이스에서 문구 읽는 시간 */
  var HOLD = .3, RUN = 1, STAY = [.7, .7, .7, .9];
  var TOTAL = HOLD + RUN * 4 + STAY.reduce(function (a, b) { return a + b; }, 0);
  var HALF = 28, BASE = 19;
  var CORNERS = [[BASE, BASE], [BASE, -BASE], [-BASE, -BASE], [-BASE, BASE], [BASE, BASE]];
  var VIEW = { yaw: Math.PI / 4, pitch: .75, swing: 0, reach: Math.hypot(HALF, HALF), pad: 1.5, cy: .5, fit: "width" };
  var GRASS = ["#8fd22e", "#a3e03a"], DIRT = "#f2cf94";

  function buildGround() {
    var m = Model(), x, z, y;
    for (x = -HALF; x <= HALF; x++) for (z = -HALF; z <= HALF; z++) {
      var ring = Math.max(Math.abs(x), Math.abs(z)), mound = x * x + z * z;
      var c = GRASS[((Math.floor((x + z) / 6) % 2) + 2) % 2];
      if (ring >= BASE - 3 && ring <= BASE + 3) c = DIRT;
      if (mound <= 22) c = DIRT;
      m.set(x, -1, z, c);
      m.set(x, -2, z, COL.pale);
      m.set(x, -3, z, COL.lilac);
      if (mound <= 7) m.set(x, 0, z, mound <= 1 ? COL.white : DIRT);
    }
    /* 뒤쪽 펜스 */
    for (var i = -HALF; i <= HALF; i++) {
      var col = Math.floor((i + HALF) / 8) % 2 ? COL.mint : COL.violet;
      for (y = 0; y < 3; y++) { m.set(-HALF, y, i, y === 2 ? COL.white : col); m.set(i, y, -HALF, y === 2 ? COL.white : col); }
    }
    /* 조명탑 */
    [[-HALF + 2, HALF - 2], [HALF - 2, -HALF + 2]].forEach(function (t) {
      m.box(t[0], 0, t[1], 1, 15, 1, COL.pale);
      m.box(t[0] - 2, 15, t[1], 5, 3, 1, COL.ink);
      for (var a = -2; a <= 2; a++) for (var b = 15; b <= 17; b++) if ((a + b) % 2 === 0) m.set(t[0] + a, b, t[1] + 1, COL.lime);
    });
    return m;
  }
  function buildBase(color, plate) {
    var m = Model();
    m.box(-1, 0, -1, 3, 1, 3, color);
    if (plate) m.set(2, 0, 2, color);
    return m;
  }
  /* 앞을 +x로 만든 모델을 k번 90도 돌려요: +x → -z → -x → +z */
  function turned(model, k) {
    var out = Model();
    model.m.forEach(function (c, key) {
      var p = key.split(",").map(Number), x = p[0], z = p[2];
      for (var n = 0; n < k; n++) { var t = x; x = z; z = -t; }
      out.set(x, p[1], z, c);
    });
    return bake(out);
  }

  var runFrames = [0, 1, 2, 3].map(function (k) { return [0, 1, 2, 3].map(function (f) { return turned(buildRunner(f), k); }); });
  var slideFrame = turned(buildSlide(), 0);
  var baseOff = bake(buildBase(COL.white)), baseOn = bake(buildBase(COL.lime)), plateOff = bake(buildBase(COL.white, true)), plateOn = bake(buildBase(COL.lime, true));

  /* 주자가 지나간 자리: 두 칸 폭의 보라색 길 */
  var trailCells = [];
  for (var leg = 0; leg < 4; leg++) {
    var from = CORNERS[leg], to = CORNERS[leg + 1], dx = Math.sign(to[0] - from[0]), dz = Math.sign(to[1] - from[1]);
    for (var n = 0; n < BASE * 2; n++) {
      var cx = from[0] + dx * n, cz = from[1] + dz * n;
      trailCells.push({ x: cx, y: -1, z: cz, c: COL.violet, mask: 4 });
      trailCells.push({ x: cx - (dz ? Math.sign(from[0]) : 0), y: -1, z: cz - (dx ? Math.sign(from[1]) : 0), c: COL.violet, mask: 4 });
    }
  }

  var pos = [BASE, BASE], bounce = 0;
  var trailGroup = { v: [] };
  var baseGroups = [1, 2, 3, 0].map(function (n) { var c = CORNERS[n]; return { v: n ? baseOff : plateOff, at: function () { return [c[0], 0, c[1]]; } }; });
  var runnerGroup = { v: runFrames[1][1], at: function () { return [pos[0], bounce, pos[1]]; } };
  var ground = new Scene($("ground-cv"), [{ v: bake(buildGround()) }], VIEW);
  var field = new Scene($("field-cv"), [trailGroup].concat(baseGroups, [runnerGroup]), VIEW);

  var cards = [].slice.call(document.querySelectorAll("#cards > li"));
  var groundBox = $("ground"), labels = $("labels"), dust = $("dust"), stamp = $("safe");
  var cur = 0, ticking = false, shown = -1;

  function uAt(v) {
    var s = v * TOTAL - HOLD;
    if (s <= 0) return 0;
    for (var i = 0; i < 4; i++) {
      if (s < RUN) return i + s / RUN;
      s -= RUN;
      if (s < STAY[i]) return i + 1;
      s -= STAY[i];
    }
    return 4;
  }
  function progress() {
    var room = pin.offsetHeight - innerHeight;
    return room > 0 ? Math.min(Math.max(-pin.getBoundingClientRect().top / room, 0), 1) : 0;
  }
  function placeHtml() {
    var names = ["1루", "2루", "3루", "홈"], order = [1, 2, 3, 0];
    labels.innerHTML = "";
    order.forEach(function (c, i) {
      var p = field.project(CORNERS[c][0], 0, CORNERS[c][1]), b = document.createElement("b");
      b.textContent = names[i];
      b.style.left = p.x + "px";
      b.style.top = p.y + "px";
      labels.appendChild(b);
    });
    var home = field.project(BASE, 0, BASE);
    stamp.style.left = home.x + groundBox.clientWidth * .06 + "px";
    stamp.style.top = home.y - groundBox.clientWidth * .19 + "px";
  }
  function paint() {
    var u = uAt(cur), i = Math.min(Math.floor(u), 3), t = u - i, a = CORNERS[i], b = CORNERS[i + 1];
    var sliding = i === 3 && t >= .55, arrived = u >= 4;
    pos = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    if (sliding) pos[0] -= 9;
    var running = t > 0 && t < 1;
    bounce = running && !sliding ? Math.abs(Math.sin(t * Math.PI * 7)) * 1.6 : 0;
    runnerGroup.v = sliding ? slideFrame : runFrames[(i + 1) % 4][running ? Math.floor(t * 16) % 4 : 1];
    trailGroup.v = trailCells.slice(0, Math.floor(u * BASE * 2) * 2);
    baseGroups.forEach(function (g, n) {
      var hit = u >= n + 1;
      g.v = n === 3 ? (hit ? plateOn : plateOff) : (hit ? baseOn : baseOff);
    });
    field.draw(0);

    var now = Math.min(Math.floor(u + 1e-6), 4);
    if (now !== shown) {
      cards.forEach(function (c, n) { c.classList.toggle("on", n === now); });
      shown = now;
    }
    groundBox.classList.toggle("sliding", sliding && !arrived);
    groundBox.classList.toggle("safe", arrived);
    if (sliding) {
      var q = field.project(pos[0], 0, pos[1]);
      dust.style.left = q.x + "px";
      dust.style.top = q.y + "px";
    }
  }
  function tick() {
    var goal = progress();
    cur = reduce ? goal : cur + (goal - cur) * .2;
    if (Math.abs(goal - cur) < .0004) cur = goal;
    paint();
    if (cur !== goal) requestAnimationFrame(tick); else ticking = false;
  }
  function queue() { if (!ticking) { ticking = true; requestAnimationFrame(tick); } }
  function layout() { ground.resize(); field.resize(); placeHtml(); paint(); queue(); }

  addEventListener("scroll", queue, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(groundBox);
  else addEventListener("resize", layout);
  cur = progress();
  layout();
})();
