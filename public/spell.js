// ✍️ spell check in every text box you type words in (red squiggles; right-click a word for fixes).
// Boxes for links, tokens, keys, passwords, numbers and Twitch / Discord names are left alone.
(() => {
  const SKIP = /url|link|token|secret|password|client.?id|\bkey\b|webhook|https?:|\bobs\b|login|twitch name|username|@|command|!\w/i;
  const fix = el => {
    if (el.hasAttribute('spellcheck') || el.dataset.spell) return;
    el.dataset.spell = '1';
    const t = (el.getAttribute('type') || 'text').toLowerCase();
    if (el.tagName === 'INPUT' && t !== 'text') return;
    const hint = `${el.id} ${el.name || ''} ${el.placeholder || ''} ${el.title || ''}`;
    el.spellcheck = !SKIP.test(hint);
  };
  const scan = root => root.querySelectorAll?.('input:not([data-spell]), textarea:not([data-spell])').forEach(fix);
  const go = () => { scan(document); new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches?.('input, textarea')) fix(n); scan(n); } }).observe(document.body, { childList: true, subtree: true }); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
})();
