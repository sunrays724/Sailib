

/* ---------- header / footer from the loaded search index ---------- */
function renderIndexMeta(){
  var counts = { all: videos.length, english: 0, telugu: 0, music: 0 };
  videos.forEach(function(v){ if(counts[v.lang] !== undefined) counts[v.lang]++; });
  var n = meta.video_count || videos.length;
  var parts = [n + " video" + (n === 1 ? "" : "s"), counts.telugu + " Telugu", counts.english + " English"];
  if(meta.generated_at) parts.push("Index updated " + fmtMetaDate(meta.generated_at));
  if(meta.channel_url)
    parts.push('<a href="' + esc(meta.channel_url) + '" target="_blank" rel="noopener">' +
               esc(meta.channel || "Sri Babuji") + '</a> and <a href="' +
               esc(SAISEEKERS_URL) + '" target="_blank" rel="noopener">SaiSEEkers</a> on YouTube');
  metaLine.innerHTML = parts.join("&ensp;·&ensp;");
}

/* ---------- search ---------- */
/*
 * Query pipeline:
 *  1) TOKENIZE + FILTER: lowercase the query, split into words, keep tokens
 *     longer than 1 char, and drop the English stopword list.
 *  2) CORPUS STOPWORDS: words appearing in more than 35% of the indexed
 *     videos (document frequency computed once at load over the embedded
 *     index) are dropped from scoring as well ("guruji" is also seeded here:
 *     a corpus-ubiquitous name the 35% rule can miss on small samples, while
 *     it is caught automatically at full corpus scale). The drop is fuzzy, so
 *     a query typo near a corpus stopword is dropped too. If dropping leaves
 *     zero tokens, fall back to the English-stopword-filtered tokens.
 *  3) CANDIDATE RULE: a video is shown only if it matches at least one
 *     significant token in a curated field or a distinctive caption word.
 *  4) FUZZY MATCH: Levenshtein distance <=1 against the words of each field.
 *     Fuzzy matching applies ONLY to query tokens of length >= 5; shorter
 *     tokens match exactly. Real words in KNOWN_WORDS never take this typo
 *     fallback when they have no exact video match.
 *  5) SCORING: curated fields stay ahead of extracted caption words:
 *     title(10) > topic(6) > keyword(5) > summary(2) > spoken(1.5).
 *     Each token's contribution is multiplied by an IDF weight.
 *  6) EVENT RECORDINGS: a video flagged as an event recording scores in
 *     default search only on its timestamped topics and spoken caption
 *     words -- never on title, keywords, or summary. A query starting with
 *     "event:" searches only those recordings, including spoken content.
 */
var STOPWORDS = (function(){
  var o = {};
  ("about the a an and or of in on at to for with is are was were be been " +
   "by from as it its this that these those he she they we you i my his her " +
   "their our what when where which who how why do does did has have had " +
   "will would can could should not no yes so if then than too very just " +
   "me him us them there here say said says saying tell tells telling told " +
   "talk talks talked talking speak speaks speaking spoke spoken discuss " +
   "discusses discussed discussing mention mentions mentioned mentioning " +
   "explain explains explained explaining describe describes described mean " +
   "means meant meaning").split(" ").forEach(function(w){ o[w] = 1; });
  return o;
})();

/* split into lowercase words; \p{M} keeps Telugu vowel marks attached */
function wordSplit(str){
  return String(str || "").toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) || [];
}

function levenshtein(a, b){
  if(a === b) return 0;
  var la = a.length, lb = b.length;
  if(!la) return lb;
  if(!lb) return la;
  var prev = new Array(lb + 1), cur = new Array(lb + 1), i, j;
  for(j = 0; j <= lb; j++) prev[j] = j;
  for(i = 1; i <= la; i++){
    cur[0] = i;
    var ca = a.charCodeAt(i - 1);
    for(j = 1; j <= lb; j++){
      var cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      var d = prev[j] + 1, ins = cur[j - 1] + 1, sub = prev[j - 1] + cost;
      cur[j] = d < ins ? (d < sub ? d : sub) : (ins < sub ? ins : sub);
    }
    var tmp = prev; prev = cur; cur = tmp;
  }
  return prev[lb];
}

function fuzzLimit(len){ return 1; }

function matchesWord(word, token){
  if(word === token) return true;
  if(token.length < 5) return false;            /* <5 char tokens: exact only */
  var lim = fuzzLimit(token.length);            /* at most one edit */
  if(Math.abs(word.length - token.length) > lim) return false;
  return levenshtein(word, token) <= lim;
}

/* EXACT-FIRST MATCHING: a token that appears anywhere in the corpus
   (case-insensitive substring over all searchable fields) matches only
   exact word occurrences -- never a fuzzy substitute. A token with no
   exact occurrence anywhere falls back to the fuzzy expansion above and
   is labeled "closest matches" in the UI, so a typo never silently
   replaces a person's name like "seenu" with "seen". */
var EXACT_CACHE = {};
function hasExact(token){
  if(EXACT_CACHE[token] === undefined){
    EXACT_CACHE[token] = SEARCHABLE_ALL.indexOf(token) !== -1;
  }
  return EXACT_CACHE[token];
}
/* SYNONYM GROUP: udi / ఊది / విభూతి / vibhuti are one and the same term --
   Baba's sacred ash, which the satsangs call "udi" (ఊది). The corpus
   mixes Latin and Telugu spellings, and a visitor may still type the
   book-word, so every member matches every other member, for ranking
   and for anchor lookup alike. */
var SYNONYMS = (function(){
  var groups = [["udi", "ఊది", "విభూతి", "vibhuti"]], map = {};
  for(var gi = 0; gi < groups.length; gi++)
    for(var wi = 0; wi < groups[gi].length; wi++)
      map[groups[gi][wi]] = groups[gi];
  return map;
})();
function synGroup(token){ return SYNONYMS[token] || null; }
/* a token "exists" in the corpus if it or any synonym does */
function hasPresence(token){
  var g = synGroup(token), i;
  if(!g) return hasExact(token);
  for(i = 0; i < g.length; i++) if(hasExact(g[i])) return true;
  return false;
}
function tokenMatch(word, token){
  var g = synGroup(token), i;
  if(g){
    if(hasPresence(token)) return g.indexOf(word) !== -1;
    if(KNOWN_WORDS[token]) return false;
    for(i = 0; i < g.length; i++) if(matchesWord(word, g[i])) return true;
    return false;
  }
  if(hasExact(token)) return word === token;
  if(KNOWN_WORDS[token]) return false;
  return matchesWord(word, token);
}
/* anchor word candidate match: substring (case-insensitive) plus fuzzy
   only for fallback tokens -- exact tokens get no fuzzy expansion */
function anchorMatch(word, token){
  var w = String(word).toLowerCase();
  if(w.indexOf(token) !== -1) return true;
  return tokenMatch(w, token);
}
function fmtTime(sec){
  sec = Math.max(0, Math.round(sec));
  var h = Math.floor(sec / 3600),
      m = Math.floor((sec % 3600) / 60),
      s = sec % 60;
  return h + ":" + (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}
/* WORD-LEVEL SPOKEN ANCHORS: choose the link target for a video. For
   each significant token, look at the keywords it matches; matched
   keyword words that carry a spoken anchor (first transcript timestamp
   where the word is actually spoken) supply candidates. The link goes
   to the earliest anchor at/after the topic start minus 60s; otherwise
   the topic start itself; without a best topic, the earliest anchor. */
function anchorLink(v, t, tokens){
  var cand = [], i, k, j;
  var anchorMap = v.anchors || null;
  if(anchorMap && tokens.length && v.keywords){
    for(i = 0; i < tokens.length; i++){
      var tok = tokens[i];
      for(k = 0; k < v.keywords.length; k++){
        var words = wordSplit(v.keywords[k]), kwHit = false;
        for(j = 0; j < words.length; j++){
          if(tokenMatch(words[j], tok)){ kwHit = true; break; }
        }
        if(!kwHit) continue;
        for(j = 0; j < words.length; j++){
          var w = words[j];
          if(!anchorMatch(w, tok)) continue;
          /* try the word itself, then every synonym spelling, as the
             anchor key (e.g. keyword "udi" vs anchor keyed "ఊది") */
          var keys = [w], grp = synGroup(tok), x, a2;
          if(grp) for(x = 0; x < grp.length; x++)
            if(keys.indexOf(grp[x]) === -1) keys.push(grp[x]);
          for(x = 0; x < keys.length; x++){
            a2 = anchorMap[keys[x]];
            if(a2) cand.push({ sec: a2[0], excerpt: a2[1] });
          }
        }
      }
    }
  }
  var best = null, c;
  if(t){
    var lo = t.sec - 60;
    for(c = 0; c < cand.length; c++){
      if(cand[c].sec >= lo && (!best || cand[c].sec < best.sec)) best = cand[c];
    }
    if(best) return { sec: best.sec, excerpt: best.excerpt, fromAnchor: true };
    return { sec: t.sec, excerpt: "", fromAnchor: false };
  }
  for(c = 0; c < cand.length; c++){
    if(!best || cand[c].sec < best.sec) best = cand[c];
  }
  if(best) return { sec: best.sec, excerpt: best.excerpt, fromAnchor: true };
  return { sec: 0, excerpt: "", fromAnchor: false };
}

/* TOPIC-START FALLBACK: when a card has no spoken-word anchor for the
   query (anchorLink found none) and no exactly-matching topic snippet,
   a topic-index line that still matches the query can supply an honest
   landing point: the topic's own start time, labeled with the topic
   title itself (never dressed up as a spoken quote). Matching here is
   deliberately narrow -- exact word, synonym group, the search's own
   token rule, or a plain plural/singular variant (dream <-> dreams) --
   so a merely keyword-matched card with no such topic line keeps the
   plain "Watch video" button. Among matching lines, prefer the one
   most echoed by the video's summary/keywords (that is what matched
   the card in the first place), then the earliest. */
function normWord(w){
  w = String(w || "").toLowerCase();
  if(w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + "y";
  if(w.length > 3 && /s$/.test(w) && !/ss$/.test(w)){
    if(/[^aeiou]es$/.test(w) && w.length > 4) return w.slice(0, -2);
    return w.slice(0, -1);
  }
  return w;
}
function fallbackWordMatch(word, token){
  if(!word || !token) return false;
  if(word === token) return true;
  var g = synGroup(token);
  if(g && g.indexOf(word) !== -1) return true;
  if(tokenMatch(word, token)) return true;
  return normWord(word) === normWord(token);
}
function fallbackTopic(v, tokens, phrases){
  var topics = v.topics || [];
  if(!topics.length) return null;
  if(!(tokens && tokens.length) && !(phrases && phrases.length)) return null;
  var context = {};
  function addContext(str){
    wordSplit(str).forEach(function(w){
      if(w.length > 2 && !STOPWORDS[w]) context[normWord(w)] = 1;
    });
  }
  addContext(v.summary || "");
  (v.keywords || []).forEach(addContext);
  var best = null, bestScore = -1, bestCtx = -1;
  topics.forEach(function(t){
    if(!t || isPlaceholder(t.text)) return;
    if(v._event && isCaptionStub(t.text)) return;
    var words = wordSplit(t.text);
    if(!words.length) return;
    var padded = " " + words.join(" ") + " ";
    var score = 0, i;
    if(phrases) for(i = 0; i < phrases.length; i++)
      if(padded.indexOf(phrases[i].str) !== -1) score += 5;
    if(tokens) for(i = 0; i < tokens.length; i++){
      var tok = tokens[i], hit = false;
      for(var j = 0; j < words.length; j++)
        if(fallbackWordMatch(words[j], tok)){ hit = true; break; }
      if(hit) score += 2;
    }
    if(!score) return;
    var ctx = 0;
    words.forEach(function(w){
      if(w.length > 2 && !STOPWORDS[w] && context[normWord(w)]) ctx++;
    });
    if(score > bestScore || (score === bestScore && ctx > bestCtx) ||
       (score === bestScore && ctx === bestCtx && best && t.sec < best.sec)){
      best = t; bestScore = score; bestCtx = ctx;
    }
  });
  return best;
}

/* --- corpus statistics, computed once after the search index loads --- */
var NUM_VIDEOS = 0;
var videoWords = [];   /* per video: deduped word array of the searchable fields */
var CORPUS_STOP = {};  /* words in >35% of videos -> dropped from scoring */
var SEARCHABLE_ALL = "";