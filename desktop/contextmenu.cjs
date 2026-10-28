// 🖱️ the normal right-click menu (Electron windows don't have one by themselves):
// cut / copy / paste / select all in text boxes, spelling fixes, copy or open links, copy pictures, reload.
const { app, Menu, clipboard, shell } = require('electron');

function menuFor(wc, p) {
  const t = [], f = p.editFlags || {}, sep = () => t.length && t[t.length - 1].type !== 'separator' && t.push({ type: 'separator' });
  if (p.misspelledWord) {
    for (const w of (p.dictionarySuggestions || []).slice(0, 5)) t.push({ label: w, click: () => wc.replaceMisspelling(w) });
    if (!(p.dictionarySuggestions || []).length) t.push({ label: 'No spelling suggestions', enabled: false });
    t.push({ label: 'Add to dictionary', click: () => wc.session.addWordToSpellCheckerDictionary(p.misspelledWord) });
    sep();
  }
  if (p.isEditable) {
    t.push({ label: 'Undo', role: 'undo', enabled: f.canUndo }, { label: 'Redo', role: 'redo', enabled: f.canRedo }); sep();
    t.push({ label: 'Cut', role: 'cut', enabled: f.canCut }, { label: 'Copy', role: 'copy', enabled: f.canCopy }, { label: 'Paste', role: 'paste', enabled: f.canPaste },
      { label: 'Paste as plain text', role: 'pasteAndMatchStyle', enabled: f.canPaste }, { label: 'Delete', role: 'delete', enabled: f.canDelete }); sep();
    t.push({ label: 'Select all', role: 'selectAll' });
  } else if (p.selectionText?.trim()) {
    t.push({ label: 'Copy', role: 'copy' });
    const q = p.selectionText.trim().slice(0, 200);
    t.push({ label: `Search the web for “${q.length > 30 ? q.slice(0, 30) + '…' : q}”`, click: () => shell.openExternal('https://www.google.com/search?q=' + encodeURIComponent(q)) });
  }
  if (p.linkURL && /^https?:/i.test(p.linkURL)) {
    sep();
    if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/i.test(p.linkURL)) t.push({ label: 'Open link in your browser', click: () => shell.openExternal(p.linkURL) });
    t.push({ label: 'Copy link', click: () => clipboard.writeText(p.linkURL) });
  }
  if (p.mediaType === 'image' && p.srcURL) { sep(); t.push({ label: 'Copy picture', click: () => wc.copyImageAt(p.x, p.y) }, { label: 'Copy picture address', click: () => clipboard.writeText(p.srcURL) }); }
  if (!p.isEditable) { sep(); t.push({ label: 'Select all', role: 'selectAll' }); }
  sep();
  t.push({ label: 'Reload this page', click: () => wc.reload() });
  return Menu.buildFromTemplate(t);
}

/** Give every window (and every page inside it) the right-click menu. */
function attachContextMenu() {
  app.on('web-contents-created', (e, wc) => {
    wc.on('context-menu', (ev, p) => {
      menuFor(wc, p).popup();
    });
  });
}
module.exports = { attachContextMenu };
