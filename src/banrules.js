// 🚫 Automatic ban rules for movie picks (Derek, 1.50.0): no movies that aren't in English at all, no really religious
// movies (like The Passion of the Christ or The Ten Commandments), no pure documentaries. Uses TMDB's details: spoken
// languages, genres and keywords. Movies Derek unbans (pre-approves) skip the rules.
// ⚠️ src/cloud-worker.js has a copy of ruleBan() (the 24/7 bot is one file): change both, and bump WORKER_V there.
const STORY = /^(action|adventure|animation|comedy|drama|fantasy|horror|mystery|romance|science fiction|thriller|western)$/;
const HARD = /^(christian film|christian movie|christian drama|faith[- ]based( film| movie)?|religious film|biblical epic|bible epic)$/;
const STRONG = /^(bible|biblical|jesus christ|jesus|moses|old testament|new testament|ten commandments|crucifixion|passion of christ|gospel|apostle|virgin mary|noah's ark|life of jesus|resurrection of jesus|christian faith)$/;
const WEAK = /^(christianity|christian|religion|faith|god|prayer|church|pastor|catholic|catholicism|judaism|islam|prophet|miracle|heaven|angel|salvation|baptism|missionary|saint|evangelism|evangelical)$/;
const NOT_PREACHY = /^(comedy|horror|action|science fiction|thriller)$/; // satire, exorcism horror, action movies with a bible in them…
export function ruleBan(m, rules = {}) {
  if (!m || !Array.isArray(m.spoken)) return null; // needs the full TMDB details
  const g = (m.allGenres || m.genres || []).map(x => String(x).toLowerCase()), kw = (m.keywords || []).map(x => String(x).toLowerCase().trim());
  if (rules.english !== false) {
    const sp = m.spoken.filter(x => x && x !== 'xx'), orig = m.lang || '';
    if (sp.length ? !sp.includes('en') : (orig && orig !== 'en' && orig !== 'xx')) return { key: 'english', short: 'not in English', reason: 'not in English' };
  }
  if (rules.documentary !== false && g.includes('documentary') && !g.some(x => STORY.test(x))) return { key: 'documentary', short: 'documentary', reason: 'documentary' };
  if (rules.religious !== false) {
    const hard = kw.some(k => HARD.test(k)), strong = kw.filter(k => STRONG.test(k)).length, weak = kw.filter(k => WEAK.test(k)).length;
    if (hard || (!g.some(x => NOT_PREACHY.test(x)) && (strong >= 1 || weak >= 3))) return { key: 'religious', short: 'religious', reason: 'religious movie' };
  }
  return null;
}
export const RULE_NAMES = { english: '🌍 Not in English', religious: '⛪ Religious', documentary: '🎥 Documentary' };
