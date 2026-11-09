// 📗 A tiny .xlsx reader (1.94.0): enough to read the Excel files Streamlabs Chatbot makes (Data.xlsx) without any extra packages.
// An .xlsx is a zip of XML files. sheets(buffer) → [{ name, rows: [[cell, …], …] }] with every cell as text.
import zlib from 'zlib';

function unzip(buf) {
  const files = {}; let e = buf.length - 22;
  while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  if (e < 0) throw new Error("That file isn't an Excel (.xlsx) file.");
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  for (let i = 0; i < n && p + 46 <= buf.length; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nl); p += 46 + nl + el + cl;
    if (buf.readUInt32LE(off) !== 0x04034b50) continue;
    const start = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), raw = buf.subarray(start, start + csize);
    files[name] = () => (method === 0 ? raw : zlib.inflateRawSync(raw)).toString('utf8');
  }
  return files;
}
const unxml = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');
const texts = xml => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m => unxml(m[1])).join('');
const colNo = ref => { let n = 0; for (const c of ref.replace(/\d+/g, '')) n = n * 26 + (c.charCodeAt(0) - 64); return n - 1; };

export function sheets(buffer) {
  const z = unzip(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)), get = n => (z[n] ? z[n]() : '');
  const wb = get('xl/workbook.xml'); if (!wb) throw new Error("That file isn't an Excel (.xlsx) file.");
  const shared = [...get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => texts(m[1]));
  const rels = Object.fromEntries([...get('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map(m => [(m[0].match(/\bId="([^"]+)"/) || [])[1], (m[0].match(/\bTarget="([^"]+)"/) || [])[1]]));
  const out = [];
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unxml((m[0].match(/\bname="([^"]*)"/) || [])[1] || ''), rid = (m[0].match(/\br:id="([^"]+)"/) || [])[1];
    let target = rels[rid] || ''; target = target.startsWith('/') ? target.slice(1) : 'xl/' + target.replace(/^\.\//, '');
    const xml = get(target), rows = [];
    for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const ref = (c[1].match(/\br="([A-Z]+\d+)"/) || [])[1], type = (c[1].match(/\bt="([^"]+)"/) || [])[1], body = c[2] || '';
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        const val = type === 's' ? (shared[Number(v)] ?? '') : type === 'inlineStr' ? texts(body) : type === 'b' ? (v === '1' ? 'True' : 'False') : v != null ? unxml(v) : '';
        row[ref ? colNo(ref) : row.length] = val;
      }
      rows.push(Array.from(row, x => x ?? ''));
    }
    out.push({ name, rows: rows.filter(r => r.some(x => String(x).trim())) });
  }
  return out;
}
/** rows → CSV text (so the same reader as for .csv files can take it) */
export const toCsv = rows => rows.map(r => r.map(x => /[",\n\r]/.test(String(x)) ? '"' + String(x).replace(/"/g, '""') + '"' : String(x)).join(',')).join('\n');
