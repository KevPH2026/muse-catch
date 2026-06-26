/* ============================================================
 * Muse · Catch — lightweight i18n (~80 lines, no dependencies)
 * ------------------------------------------------------------
 * Usage:
 *   1. Load this script (and the locale JSONs) on every page.
 *   2. Mark static text in HTML with  data-i18n="dotted.key"
 *      (textContent) or data-i18n-ph="key" (placeholder) or
 *      data-i18n-title="key" (title attribute).
 *   3. In JS, never write a literal string — call t('key') or
 *      t('key', {n: 3}) for interpolation.
 *   4. i18n.init() runs on DOMContentLoaded and re-applies on
 *      i18n.setLang('en'). The chosen lang persists in
 *      localStorage('muse.lang') and updates <html lang>.
 * ============================================================ */
(function (global) {
  "use strict";

  const STORAGE_KEY = "muse.lang";
  const SUPPORTED = ["zh-CN", "en", "zh-TW", "ja"];
  const DEFAULT_LANG = "zh-CN";

  const dicts = {};        // lang -> { key: string }
  let current = DEFAULT_LANG;

  function detectLang() {
    // 1. explicit saved choice
    let saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved && SUPPORTED.indexOf(saved) >= 0) return saved;
    // 2. browser preference (match zh-TW / ja / en, else zh-CN)
    const nav = (navigator.language || navigator.userLanguage || "").toLowerCase();
    if (nav.indexOf("zh-tw") === 0 || nav.indexOf("zh-hant") === 0) return "zh-TW";
    if (nav.indexOf("ja") === 0) return "ja";
    if (nav.indexOf("en") === 0) return "en";
    return DEFAULT_LANG;
  }

  /** Resolve a dotted key against the current dict; supports {var} interpolation. */
  function t(key, vars) {
    const dict = dicts[current] || {};
    let s = dict[key];
    if (s === undefined) {
      // fall back to the default (zh-CN) so a missing translation never blanks the UI
      s = (dicts[DEFAULT_LANG] || {})[key];
    }
    if (s === undefined) return key; // last resort: show the key itself
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (_, name) {
        return vars[name] !== undefined ? String(vars[name]) : "{" + name + "}";
      });
    }
    return s;
  }

  /** Scan the DOM and apply translations to all [data-i18n*] nodes. */
  function applyTranslations(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-ph]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph")));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
  }

  /** Switch language at runtime, persist, re-render, and notify listeners. */
  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) < 0) lang = DEFAULT_LANG;
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.documentElement.setAttribute("lang", lang);
    applyTranslations();
    global.dispatchEvent(new CustomEvent("muse:langchange", { detail: { lang: lang } }));
  }

  function getLang() { return current; }
  function supported() { return SUPPORTED.slice(); }

  function init(initial) {
    const lang = initial && SUPPORTED.indexOf(initial) >= 0 ? initial : detectLang();
    current = lang;
    document.documentElement.setAttribute("lang", lang);
    applyTranslations();
  }

  // internal: register a loaded dictionary (used by the inline JSON blobs)
  function _register(lang, obj) { dicts[lang] = obj || {}; }
  function _loaded(lang) { return !!dicts[lang]; }

  global.i18n = {
    t: t, init: init, setLang: setLang, getLang: getLang,
    supported: supported, applyTranslations: applyTranslations,
    _register: _register, _loaded: _loaded,
    STORAGE_KEY: STORAGE_KEY, SUPPORTED: SUPPORTED, DEFAULT_LANG: DEFAULT_LANG
  };
  // Convenience global alias so call sites can write t('key') instead of
  // i18n.t('key'). A function-local `const t` (e.g. inside showToast) will
  // shadow this alias per normal JS scoping rules, which is the desired
  // behaviour — those locals refer to a toast element, not a translation.
  global.t = t;
})(window);
