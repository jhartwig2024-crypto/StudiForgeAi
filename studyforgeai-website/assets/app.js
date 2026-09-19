/* ==========================================================================
   StudyForgeAI — shared application layer
   auth · local persistence · study-plan engine · quiz engine · app shell
   Note: all client-side. Swap SF.ai.* for real API calls to run a live model.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ util */
  var mem = {};
  // Storage tiers: localStorage -> sessionStorage -> in-memory.
  // Keeps the demo usable even in sandboxed iframes / file:// with storage blocked.
  function probe(store) {
    try { var k = '__sf_t'; store.setItem(k, '1'); store.removeItem(k); return true; } catch (e) { return false; }
  }
  var backing = null;
  try { if (global.localStorage && probe(global.localStorage)) backing = global.localStorage; } catch (e) {}
  if (!backing) { try { if (global.sessionStorage && probe(global.sessionStorage)) backing = global.sessionStorage; } catch (e) {} }

  function store(key, val) {
    if (typeof val === 'undefined') {
      if (backing) { try { var v = backing.getItem(key); if (v !== null) return v; } catch (e) {} }
      return mem[key] || null;
    }
    if (backing) { try { backing.setItem(key, val); return; } catch (e) { /* quota */ } }
    mem[key] = val;
  }
  function storeDel(key) {
    if (backing) { try { backing.removeItem(key); } catch (e) {} }
    delete mem[key];
  }

  function uid(p) { return (p || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function round5(n) { return Math.max(5, Math.round(n / 5) * 5); }
  function shuffle(a) { var x = a.slice(); for (var i = x.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = x[i]; x[i] = x[j]; x[j] = t; } return x; }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function addDays(iso, n) { var d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function daysBetween(fromIso, toIso) {
    var a = new Date(fromIso + 'T00:00:00'), b = new Date(toIso + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }
  function fmtDate(iso, opts) {
    if (!iso) return '—';
    var d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, opts || { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function fmtDay(iso) {
    var d = new Date(iso + 'T00:00:00');
    var t = new Date(); t.setHours(0, 0, 0, 0);
    var diff = Math.round((d - t) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function minutesLabel(m) {
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + 'h' + (r ? ' ' + r + 'm' : '');
  }
  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  /* ------------------------------------------------------------------ icons */
  var I = {
    dashboard: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
    plus: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    calendar: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>',
    quiz: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9a3 3 0 1 1 4.2 2.8c-.9.5-1.2 1-1.2 2.2"/><circle cx="12" cy="17.2" r=".6" fill="currentColor"/><rect x="2.5" y="2.5" width="19" height="19" rx="5"/></svg>',
    cards: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6.5" width="15" height="13" rx="2.5"/><path d="M7 3.5h11.5A2.5 2.5 0 0 1 21 6v11"/></svg>',
    exam: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h9l4 4V21a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 21V4A1.5 1.5 0 0 1 6.5 2.5z"/><path d="M14.5 2.5V7H19M8.5 12h7M8.5 16h4"/></svg>',
    tutor: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 1 1-3.1-6.3"/><path d="M8.6 11.2a3.4 3.4 0 0 1 6.8 0"/><path d="M12 3v1.6M4.6 6.6l1.2 1.1M19.4 6.6l-1.2 1.1"/></svg>',
    upload: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M4 16v2.5A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5V16"/></svg>',
    chart: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    user: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/></svg>',
    logout: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/><path d="M15 8l4 4-4 4M19 12H9"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5 9.5 17.5 19.5 6.5"/></svg>',
    bolt: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 2 5 13.5h5L9.5 22 19 10h-5.5z"/></svg>',
    brain: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 3.5A3 3 0 0 0 6.5 6.5 3 3 0 0 0 4 9.5c0 1 .5 2 1.2 2.6A3 3 0 0 0 4.5 14c0 1.7 1.4 3 3 3 .3 1.6 1.6 2.5 3 2.5V3.5a2 2 0 0 0-1-.4z"/><path d="M14.5 3.5a3 3 0 0 1 3 3 3 3 0 0 1 2.5 3c0 1-.5 2-1.2 2.6A3 3 0 0 1 19.5 14c0 1.7-1.4 3-3 3-.3 1.6-1.6 2.5-3 2.5V3.5z"/></svg>',
    plan: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3.5" width="18" height="17" rx="3"/><path d="M7.5 9h6M7.5 13h9M7.5 17h4"/><path d="M16.5 3.5v3M7.5 3.5v3"/></svg>',
    shield: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.5 7.5 10 4.4-1.5 7.5-5.4 7.5-10v-6z"/><path d="M9 12l2 2 4-4"/></svg>',
    sparkle: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 5.6L19.5 9l-5.6 1.9L12 16.5 10.1 10.9 4.5 9l5.6-1.4z"/></svg>',
    arrow: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    menu: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    target: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
    flame: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5s5 4.2 5 9.2a5 5 0 0 1-10 0c0-1.6.6-2.9.6-2.9S9 11 10 11c0-2 2-4.5 2-8.5z"/></svg>',
    clock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
    close: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/></svg>',
    settings: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 12H2.1M21.9 12h-2.4M6.2 6.2 4.5 4.5M19.5 19.5l-1.7-1.7M17.8 6.2l1.7-1.7M4.5 19.5l1.7-1.7"/></svg>',
    card: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19"/></svg>',
    lock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>',
    send: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z"/></svg>',
    refresh: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.4 6.3"/><path d="M20 4.5V11h-6.2"/></svg>'
  };

  var SUBJECT_COLORS = ['#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#22d3ee', '#f472b6', '#818cf8', '#2dd4bf', '#f97316'];
  function subjectColor(name) {
    var s = String(name || ''), h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return SUBJECT_COLORS[h % SUBJECT_COLORS.length];
  }

  /* ------------------------------------------------------------------ auth */
  var U_KEY = 'sf_users', S_KEY = 'sf_session', D_PREFIX = 'sf_data_';

  function hash(pw) {
    // Demo-only obfuscation. Real auth belongs on a server.
    var h = 5381, i;
    for (i = 0; i < pw.length; i++) h = ((h << 5) + h + pw.charCodeAt(i)) | 0;
    return 'h' + (h >>> 0).toString(36) + '_' + pw.length;
  }
  function users() { try { return JSON.parse(store(U_KEY) || '{}'); } catch (e) { return {}; } }
  function saveUsers(u) { store(U_KEY, JSON.stringify(u)); }

  var auth = {
    signup: function (name, email, password) {
      email = String(email || '').trim().toLowerCase();
      var us = users();
      if (us[email]) return { ok: false, error: 'An account with that email already exists. Try logging in.' };
      us[email] = { name: name, email: email, pw: hash(password), createdAt: new Date().toISOString(), provider: 'email' };
      saveUsers(us);
      store(S_KEY, email);
      return { ok: true, email: email };
    },
    login: function (email, password) {
      email = String(email || '').trim().toLowerCase();
      var us = users(), u = us[email];
      if (!u) return { ok: false, error: 'No account found for that email. Create one first.' };
      if (u.provider === 'google') return { ok: false, error: 'That account uses Google sign-in. Use the Google button below.' };
      if (u.pw !== hash(password)) return { ok: false, error: 'Incorrect password. Try again or reset it.' };
      store(S_KEY, email);
      return { ok: true, email: email };
    },
    google: function (email, name) {
      email = String(email || '').trim().toLowerCase();
      var us = users();
      if (!us[email]) {
        us[email] = { name: name || email.split('@')[0], email: email, pw: null, provider: 'google', createdAt: new Date().toISOString() };
        saveUsers(us);
      }
      store(S_KEY, email);
      return { ok: true, email: email, isNew: !us[email].profileDone };
    },
    session: function () {
      var e = store(S_KEY);
      if (!e) return null;
      var u = users()[e];
      return u ? u : null;
    },
    logout: function () { storeDel(S_KEY); },
    updateProfile: function (patch) {
      var s = auth.session(); if (!s) return;
      var us = users();
      us[s.email] = Object.assign({}, us[s.email], patch);
      saveUsers(us);
    },
    changePassword: function (current, next) {
      var s = auth.session(); if (!s) return { ok: false, error: 'Not signed in.' };
      var us = users();
      if (us[s.email].provider !== 'google' && us[s.email].pw !== hash(current)) return { ok: false, error: 'Current password is incorrect.' };
      us[s.email].pw = hash(next);
      saveUsers(us);
      return { ok: true };
    },
    demoEmailInUse: function (email) { return !!users()[String(email || '').toLowerCase()]; }
  };

  /* ------------------------------------------------------------------ data */
  function blankData() {
    return {
      profile: { yearLevel: '', subjects: [], targetExams: [], dailyMinutes: 60, onboarded: false },
      planKey: 'free',
      exams: [],
      activeExamId: null,
      streak: { count: 1, last: todayISO() },
      aiQuestionsUsed: 0
    };
  }
  function data() {
    var s = auth.session();
    if (!s) return blankData();
    var raw = store(D_PREFIX + s.email);
    if (!raw) return blankData();
    try {
      var d = JSON.parse(raw);
      return Object.assign(blankData(), d, { profile: Object.assign(blankData().profile, d.profile || {}) });
    } catch (e) { return blankData(); }
  }
  function saveData(d) {
    var s = auth.session();
    if (!s) return;
    store(D_PREFIX + s.email, JSON.stringify(d));
  }
  function activeExam(d) {
    d = d || data();
    if (!d.exams.length) return null;
    return d.exams.find(function (e) { return e.id === d.activeExamId; }) || d.exams[0];
  }
  function examById(id) { return data().exams.find(function (e) { return e.id === id; }) || null; }

  var PLAN_LIMITS = { free: { activeExams: 1, aiQuestions: 40, uploads: 3, quizzes: 3 }, pro: { activeExams: Infinity, aiQuestions: Infinity, uploads: Infinity, quizzes: Infinity } };
  function limits() { return PLAN_LIMITS[data().planKey] || PLAN_LIMITS.free; }
  function isPro() { return data().planKey === 'pro'; }

  /* --------------------------------------------------------------- AI brain */
  var STOP = ('the a an and or but if then than that this these those of to in on at by for with from as is are was were be been being it its into such can could may might will would should must not no nor do does did done have has had their there here when where which who whom what how why also more most other some any each both few many own same so very s t just about above after again against all am because before below between during few further he her him his i me my myself our ours she them they you your yours one two three then once only than too s we us').split(/\s+/);
  function keyTerms(text, n) {
    var words = String(text || '').toLowerCase().match(/[a-z][a-z\-']{3,}/g) || [];
    var freq = {}, display = {};
    words.forEach(function (w) {
      if (STOP.indexOf(w) !== -1) return;
      freq[w] = (freq[w] || 0) + 1;
      if (!display[w]) display[w] = w;
    });
    // prefer plausible terminology: longer, repeated, not overly common
    var scored = Object.keys(freq).map(function (w) {
      return { w: w, score: freq[w] * Math.log(2 + w.length) + (w.length > 6 ? 1.2 : 0) };
    }).sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, n || 40).map(function (o) { return display[o.w]; });
  }
  function sentences(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .split(/[.!?]+\s+|\n+/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 45 && s.length < 300; });
  }

  function titleCase(s) { return String(s || '').replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  /* -------- quiz generation (from real uploaded text when available) ----- */
  function buildQuestions(exam, topics, count) {
    var material = (exam.materials || []).filter(function (m) { return m.text && m.text.length > 200; });
    var corpus = material.map(function (m) { return m.text; }).join('\n');
    var allTerms = corpus ? keyTerms(corpus, 60) : [];
    var out = [];

    topics.forEach(function (t) {
      var tname = t.name;
      var tTerms = [];
      if (corpus) {
        // terms near the topic name, else globally salient terms
        var idx = corpus.toLowerCase().indexOf(tname.toLowerCase());
        var slice = idx >= 0 ? corpus.slice(Math.max(0, idx - 1400), idx + 2600) : corpus;
        tTerms = keyTerms(slice + ' ' + tname, 12);
      }
      var sents = corpus ? sentences(corpus).filter(function (s) {
        return s.toLowerCase().indexOf(tname.toLowerCase()) !== -1;
      }) : [];
      if (sents.length < 3) sents = corpus ? shuffle(sentences(corpus)).slice(0, 4) : [];

      sents.slice(0, 4).forEach(function (sn) {
        var terms = tTerms.filter(function (w) { return sn.toLowerCase().indexOf(w) !== -1 && w.length > 4; });
        if (!terms.length) return;
        var answer = terms.sort(function (a, b) { return b.length - a.length; })[0];
        var re = new RegExp('\\b' + answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (!re.test(sn)) return;
        var stemText = sn.replace(re, '________');
        var distract = shuffle(allTerms.filter(function (w) {
          return w !== answer && w.length > 4 && Math.abs(w.length - answer.length) < 7;
        })).slice(0, 3);
        while (distract.length < 3) {
          var pad = shuffle(['process', 'structure', 'reaction', 'theory', 'function', 'variable', 'membrane', 'equation']).pop();
          if (distract.indexOf(pad) === -1 && pad !== answer) distract.push(pad);
        }
        out.push({
          topic: tname, kind: 'cloze', fromMaterial: true,
          q: 'Fill the gap: ' + stemText,
          options: shuffle([answer, ...distract]),
          answer: answer,
          why: 'Taken from your uploaded material.'
        });
      });

      // true/false comprehension check derived from material
      if (sents.length) {
        var s2 = sents[sents.length - 1];
        var negated = false;
        var wrongSentence = s2.replace(/\b(is|are|increases|decreases|causes|produces)\b/i, function (m) {
          negated = true;
          var flip = { is: 'is not', are: 'are not', increases: 'decreases', decreases: 'increases', causes: 'prevents', produces: 'blocks' };
          return flip[m.toLowerCase()] || m;
        });
        var useWrong = negated && Math.random() < 0.5;
        out.push({
          topic: tname, kind: 'tf', fromMaterial: true,
          q: 'True or false — from your notes: "' + (useWrong ? wrongSentence : s2) + '"',
          options: ['True', 'False'],
          answer: useWrong ? 'False' : 'True',
          why: useWrong ? 'Your notes state the opposite.' : 'This matches your uploaded notes.'
        });
      }

      // definition prompt using a keyword
      var kw = (tTerms[0] || tname);
      if (corpus && kw && kw.toLowerCase() !== tname.toLowerCase()) {
        var fillers = shuffle(['hypothesis', 'structure', 'variable', 'function', 'reaction', 'process']);
        var others = shuffle(allTerms.filter(function (w) { return w !== kw; })).slice(0, 3);
        while (others.length < 3) { var pad = fillers.pop(); if (pad && pad !== kw && others.indexOf(pad) === -1) others.push(pad); else break; }
        out.push({
          topic: tname, kind: 'term', fromMaterial: true,
          q: 'Which term is most central to “' + tname + '” in your material?',
          options: shuffle([kw, ...others]), answer: kw,
          why: 'Highest-frequency term in your notes for this topic.'
        });
      }

      // confidence self-check (always available, feeds mastery for new topics)
      out.push({
        topic: tname, kind: 'confidence', fromMaterial: false,
        q: 'Honestly — how confident are you explaining “' + tname + '” without notes?',
        options: ['Not confident yet', 'Partly', 'Mostly confident', 'I could teach it'],
        answer: 'Not confident yet', // any option is "correct"; low confidence flags the topic
        confidence: true,
        why: 'Self-rating helps the AI weight this topic in your plan.'
      });
    });

    var ordered = [];
    // interleave topics so a quiz never repeats one topic back to back
    var byTopic = {};
    out.forEach(function (q) { (byTopic[q.topic] = byTopic[q.topic] || []).push(q); });
    var keys = Object.keys(byTopic), i = 0;
    while (ordered.length < out.length) {
      var k = keys[i % keys.length];
      if (byTopic[k] && byTopic[k].length) ordered.push(byTopic[k].shift());
      i++;
      if (i > 5000) break;
    }
    return ordered.slice(0, count || ordered.length);
  }

  function confidenceToMastery(option) {
    return { 'not confident yet': 32, 'partly': 55, 'mostly confident': 78, 'i could teach it': 92 }[String(option).toLowerCase()] || 50;
  }

  /* -------- study-plan generation -------------------------------------- */
  /* keep a day's sessions inside the student's stated daily budget */
  function balance(items, per) {
    var target = round5(per);
    items.forEach(function (it) { it.minutes = Math.max(5, it.minutes); });
    var total = items.reduce(function (a, i) { return a + i.minutes; }, 0);
    var guard = 0;
    while (total !== target && guard++ < 60) {
      if (total > target) {
        var big = items.slice().sort(function (a, b) { return b.minutes - a.minutes; })[0];
        if (big.minutes <= 5) break;
        var cut = Math.min(5, big.minutes - 5, total - target);
        big.minutes -= cut; total -= cut;
      } else {
        var small = items.slice().sort(function (a, b) { return a.minutes - b.minutes; })[0];
        var add = Math.min(5, target - total);
        small.minutes += add; total += add;
      }
    }
    return items;
  }

  function generatePlan(exam) {
    var days = clamp(daysBetween(todayISO(), exam.date), 1, 60);
    var per = exam.dailyMinutes || 60;
    var plan = [];
    var topics = exam.topics.slice();
    var weakFirst = topics.slice().sort(function (a, b) { return a.mastery - b.mastery; });

    for (var d = 0; d < days; d++) {
      var date = addDays(todayISO(), d);
      var left = days - d;
      var items = [];
      var focus = weakFirst[d % weakFirst.length];
      var second = weakFirst[(d + 1) % weakFirst.length];

      if (left <= 2) {
        // final run-in: mocks + weak spot repair
        items.push({ title: 'Full mock exam — ' + exam.subject, type: 'mock', topic: 'All topics', minutes: round5(per * 0.6) });
        items.push({ title: 'Mark & review mock mistakes', type: 'review', topic: focus.name, minutes: round5(per * 0.25) });
        items.push({ title: 'Light flashcard pass — ' + focus.name, type: 'flashcards', topic: focus.name, minutes: round5(per * 0.15) });
      } else if (left <= 5) {
        items.push({ title: 'Practice exam — timed', type: 'mock', topic: 'All topics', minutes: round5(per * 0.55) });
        items.push({ title: 'Fix weak spots: ' + focus.name, type: 'study', topic: focus.name, minutes: round5(per * 0.3) });
        items.push({ title: 'Review mistakes', type: 'review', topic: focus.name, minutes: round5(per * 0.15) });
      } else {
        items.push({ title: 'Study ' + focus.name, type: 'study', topic: focus.name, minutes: round5(per * 0.5) });
        if (per >= 45 && second && second.name !== focus.name) {
          items.push({ title: 'Cover ' + second.name, type: 'study', topic: second.name, minutes: round5(per * 0.2) });
        }
        items.push({ title: 'Practice quiz — ' + focus.name, type: 'quiz', topic: focus.name, minutes: round5(per * 0.18) });
        items.push({ title: 'Flashcards — ' + focus.name, type: 'flashcards', topic: focus.name, minutes: round5(per * 0.12) });
      }
      balance(items, per);
      items.forEach(function (it) { it.id = uid('item'); it.done = false; it.day = d + 1; it.date = date; });
      plan.push({ day: d + 1, date: date, items: items });
    }
    exam.plan = plan;
    exam.planGeneratedAt = new Date().toISOString();
    return plan;
  }

  function regenerateRestOfPlan(exam) {
    // keep completed history, rebuild from tomorrow onward
    var done = (exam.plan || []).filter(function (p) { return p.date < todayISO(); });
    var rebuilt = generatePlan(exam);
    var future = rebuilt.filter(function (p) { return p.date >= todayISO(); });
    exam.plan = done.concat(future);
    return exam.plan;
  }

  /* -------- readiness --------------------------------------------------- */
  function readiness(exam) {
    if (!exam || !exam.topics.length) return 0;
    var mastery = exam.topics.reduce(function (a, t) { return a + t.mastery; }, 0) / exam.topics.length;
    var attempted = exam.topics.filter(function (t) { return t.attempts > 0; }).length / exam.topics.length;
    var items = [].concat.apply([], (exam.plan || []).map(function (p) { return p.items; }));
    var completion = items.length ? items.filter(function (i) { return i.done; }).length / items.length : 0;
    return Math.round(clamp(mastery * 0.62 + attempted * 100 * 0.18 + completion * 100 * 0.2, 0, 99));
  }
  function weakestTopic(exam) {
    if (!exam || !exam.topics.length) return null;
    var tried = exam.topics.filter(function (t) { return t.attempts > 0; });
    var pool = tried.length ? tried : exam.topics;
    return pool.slice().sort(function (a, b) { return a.mastery - b.mastery; })[0];
  }
  function todayPlan(exam) {
    if (!exam || !exam.plan) return null;
    var t = todayISO();
    return exam.plan.find(function (p) { return p.date === t; }) || exam.plan.filter(function (p) { return !p.items.every(function (i) { return i.done; }); })[0] || exam.plan[0] || null;
  }
  function applyResults(exam, results, mode) {
    results.forEach(function (r) {
      var t = exam.topics.find(function (x) { return x.name === r.topic; });
      if (!t) return;
      var score = r.confidence ? confidenceToMastery(r.chosen) : (r.correct ? 100 : 15);
      var w = mode === 'mock' ? 0.25 : r.confidence ? 0.5 : 0.35;
      t.mastery = Math.round(clamp(t.mastery * (1 - w) + score * w, 5, 99));
      t.attempts += 1;
      if (!r.confidence) t.correct += r.correct ? 1 : 0;
    });
    exam.quizzes = exam.quizzes || [];
    var graded = results.filter(function (r) { return !r.confidence; });
    exam.quizzes.push({
      id: uid('quiz'), at: new Date().toISOString(), mode: mode || 'quiz',
      score: graded.filter(function (r) { return r.correct; }).length,
      total: graded.length,
      topics: Array.from(new Set(results.map(function (r) { return r.topic; })))
    });
    exam.readiness = readiness(exam);
    return exam;
  }

  function studyStreak() {
    var d = data();
    var s = d.streak || { count: 1, last: todayISO() };
    if (s.last === todayISO()) return s.count;
    var y = addDays(todayISO(), -1);
    s.count = s.last === y ? s.count + 1 : 1;
    s.last = todayISO();
    d.streak = s;
    saveData(d);
    return s.count;
  }

  /* ----------------------------------------------------------------- UI kit */
  function toast(msg, ms) {
    var wrap = document.querySelector('.toast-wrap');
    if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    wrap.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .3s'; setTimeout(function () { t.remove(); }, 320); }, ms || 2600);
  }
  function modal(title, bodyHtml, actionsHtml) {
    var m = document.getElementById('modal');
    if (!m) return;
    m.innerHTML = '<div class="modal-box"><div class="row between mb16"><h3>' + title +
      '</h3><button class="btn btn-quiet btn-sm" data-close>' + I.close + '</button></div><div id="modalBody">' + bodyHtml +
      '</div>' + (actionsHtml === false ? '' : '<div class="row gap10 mt20" id="modalActions">' + (actionsHtml || '<button class="btn btn-ghost btn-block" data-close>Close</button>') + '</div>') + '</div>';
    m.classList.add('open');
    m.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = closeModal; });
    m.onclick = function (e) { if (e.target === m) closeModal(); };
  }
  function closeModal() { var m = document.getElementById('modal'); if (m) m.classList.remove('open'); }
  function upsell(feature) {
    modal('Unlock ' + (feature || 'this feature'), '' +
      '<p class="muted" style="font-size:.93rem">' + esc(feature || 'This feature') + ' is part of <b style="color:var(--text)">StudyForgeAI Pro</b>. Pro removes every limit for $3.99/month — unlimited AI questions, quizzes, flashcards, practice exams and uploads, plus weak-topic detection and your exam readiness score.</p>' +
      '<div class="card card-flat mt16 small">' +
      '<div class="row between"><span class="dim">Unlimited AI questions</span><span class="badge badge-blue">Pro</span></div>' +
      '<div class="row between mt8"><span class="dim">Adaptive quizzes &amp; mock exams</span><span class="badge badge-blue">Pro</span></div>' +
      '<div class="row between mt8"><span class="dim">Weak-topic detection</span><span class="badge badge-blue">Pro</span></div>' +
      '</div>',
      '<button class="btn btn-ghost" data-close>Not now</button><button class="btn btn-primary grow" onclick="SF.upgrade()">Upgrade to Pro — $3.99/mo</button>');
  }
  function upgrade() {
    var d = data(); d.planKey = 'pro'; saveData(d); closeModal();
    toast('🎉 Pro unlocked — every limit removed.');
    setTimeout(function () { location.reload(); }, 900);
  }
  function downgrade() {
    var d = data(); d.planKey = 'free'; saveData(d); closeModal();
    toast('Switched back to the Free plan.');
    setTimeout(function () { location.reload(); }, 900);
  }

  function chipGroup(el, opts) {
    opts = opts || {};
    function toggle(c) {
      if (opts.multi) c.classList.toggle('on');
      else el.querySelectorAll('.chip').forEach(function (o) { o.classList.toggle('on', o === c); });
    }
    el.querySelectorAll('.chip').forEach(function (c) {
      c.setAttribute('aria-pressed', c.classList.contains('on') ? 'true' : 'false');
      c.onclick = function () { toggle(c); el.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x.classList.contains('on') ? 'true' : 'false'); }); if (opts.onChange) opts.onChange(values(el)); };
    });
    function values(scope) { return Array.from(scope.querySelectorAll('.chip.on')).map(function (c) { return c.dataset.value || c.textContent.trim(); }); }
    return { values: function () { return values(el); } };
  }
  function reveal() {
    var els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    els.forEach(function (e, i) { e.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(e); });
  }
  function countUp() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count), suffix = el.dataset.suffix || '', dec = (el.dataset.dec | 0);
      var start = performance.now(), dur = 1100;
      function step(now) {
        var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * e).toFixed(dec) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* ------------------------------------------------------------- app shell */
  var NAV = [
    { label: 'Study', items: [
      { id: 'dashboard', title: 'Dashboard', href: 'dashboard.html', icon: 'dashboard' },
      { id: 'plan', title: 'Study Plan', href: 'exam.html', icon: 'plan' },
      { id: 'quiz', title: 'Quizzes', href: 'quiz.html', icon: 'quiz' },
      { id: 'cards', title: 'Flashcards', href: 'flashcards.html', icon: 'cards' },
      { id: 'practice', title: 'Practice Exams', href: 'quiz.html?mode=practice', icon: 'exam' },
      { id: 'tutor', title: 'AI Tutor', href: 'tutor.html', icon: 'tutor' }
    ] },
    { label: 'Manage', items: [
      { id: 'exams', title: 'My Exams', href: 'exams.html', icon: 'calendar' },
      { id: 'create', title: 'New Exam', href: 'create-exam.html', icon: 'plus' },
      { id: 'materials', title: 'Materials', href: 'materials.html', icon: 'upload' },
      { id: 'progress', title: 'Exam Readiness', href: 'progress.html', icon: 'chart' },
      { id: 'account', title: 'Account', href: 'account.html', icon: 'user' }
    ] }
  ];

  function mountApp(opt) {
    opt = opt || {};
    var user = auth.session();
    if (!user) { location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search)); return null; }
    var d = data();

    if (!d.profile.onboarded && opt.active !== 'onboarding') {
      location.replace('onboarding.html'); return null;
    }

    var sb = document.getElementById('sidebar');
    var tb = document.getElementById('topbar');
    var initials = (user.name || user.email).trim().slice(0, 1).toUpperCase();

    if (sb) {
      sb.innerHTML =
        '<div class="side-brand"><a class="brand" href="index.html"><span class="brand-mark">S</span><span>AI Exam Prep<small>StudyForgeAI</small></span></a></div>' +
        '<nav class="side-nav">' +
        NAV.map(function (g) {
          return '<div class="side-label">' + g.label + '</div>' + g.items.map(function (it) {
            var href = it.id === 'plan' ? (activeExam(d) ? 'exam.html?id=' + activeExam(d).id : 'create-exam.html') : it.href;
            return '<a class="side-link' + (opt.active === it.id ? ' active' : '') + '" href="' + href + '">' + I[it.icon] +
              '<span class="grow">' + it.title + '</span>' +
              (it.id === 'create' && !isPro() && d.exams.length >= 1 ? I.lock : '') + '</a>';
          }).join('');
        }).join('') +
        '</nav>' +
        '<div class="side-foot">' +
        (isPro() ? '<div class="badge badge-blue mb12" style="width:100%;justify-content:center">' + I.sparkle + ' Pro plan active</div>'
          : '<a href="account.html#subscription" class="card card-flat card-pad-sm mb12" style="display:block"><div class="row between"><span class="small bold">Free plan</span>' + I.sparkle + '</div><div class="tiny muted mt4">Unlock unlimited AI study — $3.99/mo</div></a>') +
        '<a class="side-user" href="account.html"><span class="avatar">' + esc(initials) + '</span><span class="grow" style="min-width:0"><b class="small" style="display:block;overflow:hidden;text-overflow:ellipsis">' + esc(user.name || 'Student') + '</b><span class="tiny muted" style="display:block;overflow:hidden;text-overflow:ellipsis">' + esc(user.email) + '</span></span></a>' +
        '<button class="side-link" style="width:100%" onclick="SF.logout()">' + I.logout + '<span class="grow" style="text-align:left">Log out</span></button>' +
        '</div>';
    }
    if (tb) {
      tb.innerHTML =
        '<div class="mobile-bar"><button class="btn btn-quiet btn-sm" id="sbToggle">' + I.menu + '</button></div>' +
        '<div style="min-width:0"><div class="crumb">' + (opt.crumb || 'StudyForgeAI') + '</div><h3 style="margin-top:2px">' + (opt.title || '') + '</h3></div>' +
        '<div class="row gap10">' +
        (opt.actions || '') +
        '<a class="btn btn-primary btn-sm" href="' + (activeExam(d) ? 'quiz.html' : 'create-exam.html') + '">' + I.bolt + (activeExam(d) ? 'Quick quiz' : 'Create exam') + '</a>' +
        '</div>';
      var tg = document.getElementById('sbToggle');
      var scrim = document.getElementById('scrim');
      if (tg) tg.onclick = function () { sb.classList.add('open'); scrim.classList.add('open'); };
      if (scrim) scrim.onclick = function () { sb.classList.remove('open'); scrim.classList.remove('open'); };
    }
    reveal();
    return { user: user, data: d, exam: activeExam(d) };
  }

  function logout() { auth.logout(); location.replace('index.html'); }

  /* ------------------------------------------------------------ marketing */
  function navToggleSetup() {
    var t = document.getElementById('navToggle'), l = document.getElementById('navLinks');
    if (t && l) t.onclick = function () { l.classList.toggle('open'); };
    var nav = document.querySelector('.nav');
    function onScroll() { if (nav) nav.classList.toggle('scrolled', window.scrollY > 12); }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  global.SF = {
    uid: uid, esc: esc, clamp: clamp, round5: round5, shuffle: shuffle,
    todayISO: todayISO, addDays: addDays, daysBetween: daysBetween,
    fmtDate: fmtDate, fmtDay: fmtDay, minutesLabel: minutesLabel, greeting: greeting, titleCase: titleCase,
    subjectColor: subjectColor, navToggleSetup: navToggleSetup,
    icons: I, auth: auth, data: data, saveData: saveData, blankData: blankData,
    activeExam: activeExam, examById: examById, limits: limits, isPro: isPro, mountApp: mountApp, logout: logout,
    ai: {
      keyTerms: keyTerms, buildQuestions: buildQuestions, generatePlan: generatePlan,
      regenerateRestOfPlan: regenerateRestOfPlan, readiness: readiness, weakestTopic: weakestTopic,
      todayPlan: todayPlan, applyResults: applyResults, confidenceToMastery: confidenceToMastery
    },
    progressNote: function (p) {
      if (p < 40) return { label: 'Needs work', cls: 'badge-rose' };
      if (p < 70) return { label: 'On track', cls: 'badge-amber' };
      if (p < 85) return { label: 'Strong', cls: 'badge-blue' };
      return { label: 'Exam ready', cls: 'badge-green' };
    },
    studyStreak: studyStreak, toast: toast, modal: modal, closeModal: closeModal,
    upsell: upsell, upgrade: upgrade, downgrade: downgrade, chipGroup: chipGroup,
    reveal: reveal, countUp: countUp
  };

  document.addEventListener('DOMContentLoaded', function () { reveal(); });
})(window);
