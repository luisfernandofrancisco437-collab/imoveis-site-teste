/* Optional GA4, basic consent mode: no Google script/request before explicit opt-in.
 * Enable only after enhanced measurement (outbound clicks/forms) is disabled in GA4.
 * Public IDs/codes only. Never send form values, WhatsApp URLs, query strings or hashes.
 */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root && root.document) {
    var boot = function () {
      if (root.LF_SITE_ANALYTICS) return;
      var config;
      try { config = JSON.parse(root.document.getElementById('site-analytics-config').textContent); } catch (_) { return; }
      root.LF_SITE_ANALYTICS = api.createController({ window: root, document: root.document, config: config });
      root.LF_SITE_ANALYTICS.start();
    };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot, { once: true });
    else boot();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  var ORIGIN = 'https://corretorluisfernando.com.br';
  var CONSENT_KEY = 'lf_site_analytics_consent_v1';
  var CONSENT_MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  var CODE = /^[A-Z0-9][A-Z0-9_-]{0,79}$/;
  function code(value) { return typeof value === 'string' && CODE.test(value.trim()) ? value.trim() : ''; }
  function safePath(value) {
    if (typeof value !== 'string' || value.length > 600 || !/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(value)) return '/';
    return value;
  }
  function safeReferrer(value) {
    try { var url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.origin + '/' : ''; } catch (_) { return ''; }
  }
  function configFor(raw, location) {
    raw = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var measurementId = typeof raw.measurementId === 'string' ? raw.measurementId.trim() : '';
    return {
      enabled: raw.enabled !== false && raw.privacyReviewed === true && /^G-[A-Z0-9]{4,20}$/.test(measurementId) && location && location.origin === ORIGIN,
      measurementId: measurementId,
      pagePath: safePath(raw.pagePath),
      detailCode: code(raw.detailCode)
    };
  }
  function createController(options) {
    options = options || {};
    var win = options.window, doc = options.document, cfg = configFor(options.config, win && win.location);
    var started = false, consent = null, tagRequested = false, configured = false, initialSent = false, tagLoadFailed = false;
    var panel, preferences, closeButton, notices, choiceButtons = [], lastClicks = new Map();
    function now() { return typeof options.now === 'function' ? options.now() : Date.now(); }
    function savedChoice() {
      try {
        var saved = JSON.parse(win.localStorage.getItem(CONSENT_KEY));
        if (saved && saved.version === 1 && ['granted', 'denied'].includes(saved.value) &&
            Number.isFinite(saved.at) && saved.at <= now() && now() - saved.at < CONSENT_MAX_AGE) return saved.value;
      } catch (_) {}
      return null;
    }
    function storeChoice(value) {
      try { win.localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: 1, value: value, at: now() })); } catch (_) { /* An explicit choice still works in this page without persistent storage. */ }
    }
    function gtag() {
      if (typeof win.gtag === 'function') win.gtag.apply(win, arguments);
    }
    function denied() {
      return { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
    }
    function consentParameters(value) {
      var parameters = denied(); parameters.analytics_storage = value; return parameters;
    }
    function clearCookies() {
      var cookieText = ''; try { cookieText = String(doc.cookie || ''); } catch (_) {}
      var names = cookieText.split(';').map(function (part) { return part.trim().split('=')[0]; })
        .filter(function (name) { return /^_ga(?:_[A-Z0-9]+)?$/i.test(name); });
      var host = String(win.location.hostname || ''), domains = ['', host, '.' + host];
      if (host.startsWith('www.')) domains.push(host.slice(4), '.' + host.slice(4));
      names.forEach(function (name) {
        domains.forEach(function (domain) {
          try { doc.cookie = name + '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure' + (domain ? '; domain=' + domain : ''); } catch (_) {}
        });
      });
    }
    function requestTag() {
      if (tagRequested || consent !== 'granted') return;
      tagRequested = true;
      if (!Array.isArray(win.dataLayer)) win.dataLayer = [];
      if (typeof win.gtag !== 'function') win.gtag = function () { win.dataLayer.push(arguments); };
      win['ga-disable-' + cfg.measurementId] = false;
      gtag('consent', 'default', denied());
      gtag('consent', 'update', consentParameters('granted'));
      gtag('set', 'ads_data_redaction', true);
      gtag('set', 'url_passthrough', false);
      gtag('js', new Date(now()));
      var parameters = {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_expires: 15552000, cookie_path: '/', cookie_flags: 'SameSite=Lax;Secure',
        page_location: ORIGIN + cfg.pagePath, page_referrer: safeReferrer(doc.referrer),
        page_title: cfg.detailCode ? 'Imóvel ' + cfg.detailCode + ' | Luis Fernando' : 'Imóveis | Luis Fernando'
      };
      // The same safe defaults apply to GA's session metadata; never inherit the current query/hash.
      gtag('set', { page_location: parameters.page_location, page_referrer: parameters.page_referrer, page_title: parameters.page_title });
      gtag('config', cfg.measurementId, parameters);
      configured = true;
      var script = doc.createElement('script');
      script.id = 'lf-ga4-loader'; script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.measurementId);
      script.referrerPolicy = 'origin';
      script.onerror = function () { tagLoadFailed = true; if (notices) notices.textContent = 'A medição não pôde ser carregada. A navegação no site continua disponível.'; };
      doc.head.appendChild(script);
    }
    function event(name, parameters) {
      if (!cfg.enabled || consent !== 'granted' || !configured || win['ga-disable-' + cfg.measurementId]) return false;
      gtag('event', name, Object.assign({ send_to: cfg.measurementId, page_location: ORIGIN + cfg.pagePath,
        page_referrer: safeReferrer(doc.referrer), page_title: cfg.detailCode ? 'Imóvel ' + cfg.detailCode + ' | Luis Fernando' : 'Imóveis | Luis Fernando' }, parameters));
      return true;
    }
    function initialEvents() {
      if (initialSent || consent !== 'granted') return;
      initialSent = true;
      event('page_view', {});
      if (cfg.detailCode) event('view_item', { items: [{ item_id: cfg.detailCode, item_name: cfg.detailCode, item_category: 'Imóvel' }] });
    }
    function hidePanel() {
      if (panel) panel.hidden = true;
      if (preferences && typeof preferences.focus === 'function') preferences.focus();
    }
    function setChoice(value, persist) {
      if (!cfg.enabled || !['granted', 'denied'].includes(value)) return false;
      consent = value;
      if (persist !== false) storeChoice(value);
      if (value === 'granted') {
        if (!tagRequested) requestTag();
        else { win['ga-disable-' + cfg.measurementId] = false; gtag('consent', 'update', consentParameters('granted')); }
        initialEvents();
      } else {
        // ga-disable is set before updating consent: revocation must not produce analytics hits.
        win['ga-disable-' + cfg.measurementId] = true;
        if (tagRequested) gtag('consent', 'update', denied());
        clearCookies();
      }
      if (notices) notices.textContent = value === 'granted' ? 'Medição de audiência autorizada.' : 'Medição de audiência recusada.';
      if (closeButton) closeButton.hidden = false;
      hidePanel(); return true;
    }
    function element(tag, text) { var node = doc.createElement(tag); if (text) node.textContent = text; return node; }
    function showPreferences() {
      if (!cfg.enabled || !panel) return;
      panel.hidden = false;
      if (closeButton) closeButton.hidden = consent === null;
      if (choiceButtons[0] && typeof choiceButtons[0].focus === 'function') choiceButtons[0].focus();
    }
    function mount() {
      var style = element('style'); style.id = 'lf-analytics-consent-style';
      style.textContent = '#lf-analytics-consent[hidden]{display:none}#lf-analytics-consent{position:fixed;z-index:10000;bottom:66px;left:16px;right:16px;max-width:660px;padding:18px;background:#fff;color:#142f44;border:1px solid #b7c5d4;border-radius:12px;box-shadow:0 8px 30px #00172833;font:15px/1.5 system-ui,sans-serif}#lf-analytics-consent h2{font-size:18px;margin:0 0 8px}#lf-analytics-consent p{margin:0 0 12px}#lf-analytics-consent .lf-analytics-actions{display:flex;gap:10px;flex-wrap:wrap}#lf-analytics-consent button,#lf-analytics-preferences{font:inherit;min-height:44px;border-radius:8px;padding:10px 14px;cursor:pointer}#lf-analytics-consent button{background:#eef3f8;border:1px solid #9aafc4;color:#142f44}#lf-analytics-preferences{position:fixed;z-index:9999;bottom:12px;left:16px;background:#fff;color:#142f44;border:1px solid #9aafc4;font:13px/1.2 system-ui,sans-serif}#lf-analytics-consent button:focus-visible,#lf-analytics-preferences:focus-visible{outline:3px solid #005c9f;outline-offset:3px}#lf-analytics-consent a{color:#005c9f;text-decoration:underline}';
      doc.head.appendChild(style);
      panel = element('section'); panel.id = 'lf-analytics-consent'; panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', 'Preferências de medição de audiência');
      panel.appendChild(element('h2', 'Sua privacidade'));
      panel.appendChild(element('p', 'Com sua autorização, usamos o Google Analytics para medir visitas aos imóveis e cliques de contato. Você pode recusar e continuar navegando normalmente ou alterar sua escolha a qualquer momento.'));
      var policy = element('a', 'Política de privacidade'); policy.href = '/privacidade/'; panel.appendChild(policy);
      var actions = element('div'); actions.className = 'lf-analytics-actions';
      ['Aceitar medição', 'Recusar medição'].forEach(function (label, index) {
        var button = element('button', label); button.type = 'button'; button.addEventListener('click', function () { setChoice(index ? 'denied' : 'granted'); });
        choiceButtons.push(button); actions.appendChild(button);
      });
      closeButton = element('button', 'Fechar preferências'); closeButton.type = 'button'; closeButton.hidden = true;
      closeButton.addEventListener('click', hidePanel); actions.appendChild(closeButton); panel.appendChild(actions);
      notices = element('p'); notices.setAttribute('role', 'status'); notices.setAttribute('aria-live', 'polite'); panel.appendChild(notices);
      preferences = element('button', 'Preferências de privacidade'); preferences.id = 'lf-analytics-preferences'; preferences.type = 'button';
      preferences.setAttribute('aria-controls', panel.id); preferences.addEventListener('click', showPreferences);
      doc.body.appendChild(panel); doc.body.appendChild(preferences);
    }
    function closest(target, selector) { try { return target && typeof target.closest === 'function' ? target.closest(selector) : null; } catch (_) { return null; } }
    function propertyCode(anchor, url) {
      var owner = closest(anchor, '[data-property-code]'), candidate = code(owner && owner.getAttribute('data-property-code'));
      if (candidate) return candidate;
      var article = closest(anchor, '.propertyCard'), marker = article && article.querySelector('.code');
      candidate = code(marker && marker.textContent && marker.textContent.trim()); if (candidate) return candidate;
      if (url && url.origin === ORIGIN) {
        var match = url.pathname.match(/^\/imovel\/([A-Z0-9][A-Z0-9_-]{0,79})\/?$/) || url.pathname.match(/^\/imoveis\/[a-z0-9-]+\/([A-Z0-9][A-Z0-9_-]{0,79})\/?$/);
        if (match) return match[1];
      }
      return cfg.detailCode;
    }
    function click(target) {
      if (consent !== 'granted') return false;
      var anchor = closest(target, 'a[href]'); if (!anchor) return false;
      var url; try { url = new URL(anchor.getAttribute('href') || '', ORIGIN); } catch (_) { return false; }
      if (url.protocol !== 'https:' || url.username || url.password) return false;
      var id = propertyCode(anchor, url), name, parameters;
      if (url.hostname === 'wa.me' || url.hostname === 'api.whatsapp.com') {
        name = 'contact_click'; parameters = { contact_channel: 'whatsapp', contact_context: id ? 'property' : 'general' };
        if (id) parameters.item_id = id;
      } else if (url.origin === ORIGIN && id && (/^\/imovel\//.test(url.pathname) || /^\/imoveis\/[a-z0-9-]+\/[A-Z0-9_-]+\/?$/.test(url.pathname))) {
        name = 'select_item'; parameters = { items: [{ item_id: id, item_name: id, item_category: 'Imóvel' }] };
      } else return false;
      var key = name + ':' + id, previous = lastClicks.get(key), at = now();
      if (previous !== undefined && at - previous < 750) return false;
      lastClicks.set(key, at); return event(name, parameters);
    }
    function start() {
      if (started || !cfg.enabled) return false;
      started = true; mount();
      doc.addEventListener('click', function (e) { click(e.target); });
      var saved = savedChoice();
      // Honour the browser privacy signal unless the visitor explicitly changes it here.
      if (win.navigator && (win.navigator.globalPrivacyControl === true || win.navigator.doNotTrack === '1')) saved = 'denied';
      if (saved) setChoice(saved, false);
      else panel.hidden = false;
      return true;
    }
    return { start: start, choose: setChoice, showPreferences: showPreferences,
      state: function () { return { enabled: !!cfg.enabled, consent: consent, tagRequested: tagRequested, configured: configured, tagLoadFailed: tagLoadFailed, started: started }; } };
  }
  return { createController: createController, normalizeConfig: configFor, safePath: safePath, safeReferrer: safeReferrer };
});
