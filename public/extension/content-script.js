(function signalMdCapture() {
  const REQUEST_TYPE = 'SIGNAL_MD_EXTRACT_PAGE';
  const DELIVER_TYPE = 'SIGNAL_MD_DELIVER_CAPTURE';
  const UPDATE_TYPE = 'SIGNAL_MD_PAGE_UPDATED';
  const MAX_TEXT_CHARS = 18000;

  const medicalPatterns = [
    [/\b(randomi[sz]ed|rct|trial|cohort|case[- ]control|systematic review|meta[- ]analysis)\b/i, 'study design'],
    [/\b(patient|patients|population|participants|inclusion|exclusion|diagnos(?:is|ed))\b/i, 'population'],
    [/\b(treatment|intervention|therapy|dose|drug|procedure|surgery|device)\b/i, 'intervention'],
    [/\b(placebo|standard care|usual care|control|comparator)\b/i, 'comparison'],
    [/\b(outcome|mortality|survival|adverse events?|safety|efficacy|endpoint)\b/i, 'outcomes'],
    [/\b(confidence interval|hazard ratio|odds ratio|relative risk|p\s*[<=>]|n\s*=)\b/i, 'statistics'],
    [/\b(guideline|recommendation|consensus|nice|who|cdc|esc|aha|acc)\b/i, 'guideline signal'],
  ];

  const stopWords = new Set([
    'about', 'after', 'again', 'against', 'because', 'before', 'between', 'clinical', 'could',
    'during', 'evidence', 'found', 'from', 'have', 'into', 'medical', 'more', 'most', 'other',
    'over', 'page', 'paper', 'patient', 'patients', 'research', 'should', 'study', 'than',
    'that', 'their', 'there', 'these', 'this', 'through', 'trial', 'using', 'were', 'what',
    'when', 'where', 'which', 'while', 'with', 'without',
  ]);

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function meta(name) {
    const selectors = [
      `meta[name="${name}"]`,
      `meta[property="${name}"]`,
      `meta[property="og:${name}"]`,
      `meta[name="twitter:${name}"]`,
    ];
    for (const selector of selectors) {
      const content = document.querySelector(selector)?.getAttribute('content');
      if (content) return clean(content);
    }
    return '';
  }

  function isVisibleElement(element) {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function shouldSkipElement(element) {
    return Boolean(element.closest('script,style,noscript,svg,canvas,nav,footer,aside,form,button,input,textarea,select,[aria-hidden="true"]'));
  }

  function visibleText() {
    const root = document.querySelector('main, article, [role="main"]') || document.body;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent || shouldSkipElement(parent) || !isVisibleElement(parent)) return NodeFilter.FILTER_REJECT;
        const text = clean(node.nodeValue || '');
        if (text.length < 2) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const parts = [];
    let next = walker.nextNode();
    while (next && parts.join(' ').length < MAX_TEXT_CHARS) {
      parts.push(clean(next.nodeValue || ''));
      next = walker.nextNode();
    }
    return clean(parts.join(' ')).slice(0, MAX_TEXT_CHARS);
  }

  function headings() {
    return Array.from(document.querySelectorAll('h1,h2,h3'))
      .map((node) => clean(node.textContent || ''))
      .filter(Boolean)
      .slice(0, 12);
  }

  function keywordList(text) {
    const counts = new Map();
    const tokens = clean(text).toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || [];
    for (const token of tokens) {
      if (stopWords.has(token)) continue;
      counts.set(token, (counts.get(token) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([token]) => token);
  }

  function medicalSignals(text) {
    return medicalPatterns.filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  }

  function externalLinkCount() {
    const origin = location.origin;
    return Array.from(document.links).filter((link) => {
      try {
        return new URL(link.href).origin !== origin;
      } catch {
        return false;
      }
    }).length;
  }

  function buildPayload() {
    const text = visibleText();
    const wordCount = text ? text.split(/\s+/).length : 0;
    const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';
    return {
      url: location.href,
      title: clean(document.title || document.querySelector('h1')?.textContent || location.hostname),
      canonicalUrl: canonical ? new URL(canonical, location.href).href : null,
      description: meta('description') || null,
      siteName: meta('site_name') || location.hostname,
      capturedAt: new Date().toISOString(),
      text,
      selectionText: clean(window.getSelection && window.getSelection().toString()) || null,
      headings: headings(),
      keywords: keywordList(text),
      medicalSignals: medicalSignals(text),
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 220)),
      safetySignals: {
        hasPasswordField: Boolean(document.querySelector('input[type="password"]')),
        hasPaymentField: Boolean(document.querySelector('input[autocomplete*="cc-"], input[name*="card" i], input[id*="card" i]')),
        hasForms: Boolean(document.querySelector('form')),
        externalLinkCount: externalLinkCount(),
      },
    };
  }

  function capture() {
    const payload = buildPayload();
    window.__signalMdLastExtraction = payload;
    return payload;
  }

  function notifyUpdated() {
    if (!chrome?.runtime?.sendMessage) return;
    try {
      chrome.runtime.sendMessage({ type: UPDATE_TYPE, payload: capture() }, () => {
        void chrome.runtime.lastError;
      });
    } catch {
      // The app may not be open; active capture still works through onMessage.
    }
  }

  let updateTimer = null;
  const observer = new MutationObserver(() => {
    window.clearTimeout(updateTimer);
    updateTimer = window.setTimeout(notifyUpdated, 1200);
  });

  try {
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.addEventListener('selectionchange', () => {
      window.clearTimeout(updateTimer);
      updateTimer = window.setTimeout(capture, 300);
    });
  } catch {
    // Some browser pages restrict DOM observation.
  }

  if (chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === DELIVER_TYPE && message.payload) {
        window.postMessage({ type: 'SIGNAL_MD_WEBPAGE_EXTRACTED', payload: message.payload }, window.location.origin);
        sendResponse({ ok: true });
        return true;
      }
      if (message?.type !== REQUEST_TYPE) return false;
      try {
        sendResponse({ ok: true, payload: capture() });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Capture failed' });
      }
      return true;
    });
  }

  capture();
})();
