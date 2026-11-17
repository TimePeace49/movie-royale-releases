// ⏱️ (1.175.0, Derek: "a way to keep track of total live time when I need to update while live or if the app crashes")
// The rules that keep db.liveLog [{s, e}] (e = null while live) right when the app wasn't running the whole time.
// Pure: they change the list they are given and say what they did. `seen` = the last time the app KNEW you were live
// (saved every 30 s), `start` = when Twitch says the stream that is live now started.
export const SLACK = 2 * 60000; // (Twitch's start time and the moment the app noticed can be a little apart)

/** Twitch says you're live with a stream that started at `start`: line the list up with it. */
export function fixLive(L, { now, start, seen }) {
  const notes = [];
  if (!start || start > now + SLACK) return notes;
  start = Math.min(start, now);
  const last = L[L.length - 1];
  if (last && !last.e) {
    if (start > last.s + SLACK) { // a NEWER stream than the one being counted: the old one ended while the app was closed
      const e = Math.min(Math.max(seen || 0, last.s), start);
      last.e = e; L.push({ s: start, e: null });
      notes.push({ k: 'newer', ended: e, start });
    } else if (start < last.s - SLACK) { // you went live before the app noticed (it was closed / crashed / signed out)
      const prev = L[L.length - 2], s = Math.max(start, prev?.e || 0);
      if (s < last.s) { notes.push({ k: 'earlier', ms: last.s - s }); last.s = s; }
    }
  } else {
    const s = Math.max(start, last?.e || 0);
    L.push({ s, e: null });
    notes.push({ k: 'opened', ms: now - s });
  }
  return notes;
}

/** The stream is over. When did it end? While the app was running the whole time: now. If this is the first thing the
 *  app hears since it opened (the stream ended while it was closed): the last time it knew you were live. */
export function endAt(last, { now, seen, sure }) {
  if (sure || !seen) return now; // (nothing known about when it was last seen: the old way)
  return Math.min(now, Math.max(last.s, seen || last.s));
}

export const total = (L, now) => L.reduce((n, x) => n + Math.max(0, Math.min(x.e || now, now) - x.s), 0);

/** Pretend cases (nothing is saved): what the counter does when the app closes, updates or crashes. */
export function demo() {
  const H = 3600000, M = 60000, t0 = 1e12, rows = [];
  const row = (name, want, got) => rows.push({ name, want: Math.round(want / M), got: Math.round(got / M), ok: Math.abs(want - got) < M });
  { // update while live: closed 3 min, same stream still running
    const L = [{ s: t0, e: null }], now = t0 + 2 * H;
    fixLive(L, { now, start: t0 - 20000, seen: now - 3 * M });
    row('Update while live (app closed 3 min, stream kept going): nothing lost', 2 * H, total(L, now));
  }
  { // crash, app reopened 40 min later, stream still running
    const L = [{ s: t0, e: null }], now = t0 + 5 * H;
    fixLive(L, { now, start: t0, seen: now - 40 * M });
    row('App crashed, reopened 40 min later, still live: the 40 min count', 5 * H, total(L, now));
  }
  { // stream ended while the app was closed, reopened 3 h later, offline
    const L = [{ s: t0, e: null }], now = t0 + 7 * H, last = L[0];
    last.e = endAt(last, { now, seen: t0 + 4 * H, sure: false });
    row('Stream ended while the app was closed (opened 3 hours later): stops at the last time it saw you live', 4 * H, total(L, now));
  }
  { // PC crashed (stream died too), new stream started 10 min later, app opened 5 min after that
    const L = [{ s: t0, e: null }], now = t0 + 3 * H + 15 * M;
    fixLive(L, { now, start: t0 + 3 * H + 10 * M, seen: t0 + 3 * H });
    row('PC crashed, new stream 10 min later, app opened 5 min into it: the 10 min offline is left out', 3 * H + 5 * M, total(L, now));
  }
  { // went live with the app closed, opened it 25 min in
    const L = [{ s: t0 - 9 * H, e: t0 - 8 * H }, { s: t0 + 25 * M, e: null }], now = t0 + 30 * M;
    fixLive(L, { now, start: t0, seen: 0 });
    row('Went live with the app closed, opened it 25 min in: counts from when the stream really started', H + 30 * M, total(L, now));
  }
  { // Twitch blip: marked offline then live again while the same stream ran
    const L = [{ s: t0, e: t0 + H }, { s: t0 + H + 4 * M, e: null }], now = t0 + 2 * H;
    fixLive(L, { now, start: t0, seen: now });
    row('Twitch hiccup said offline for 4 min during one stream: no gap', 2 * H, total(L, now));
  }
  { // normal end while the app runs
    const L = [{ s: t0, e: null }], now = t0 + H; L[0].e = endAt(L[0], { now, seen: now - 20000, sure: true });
    row('Normal stream end with the app open: ends right then', H, total(L, now));
  }
  return { ok: rows.every(r => r.ok), rows };
}
