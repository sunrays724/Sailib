  /* lowercase of all searchable fields, for exact-presence checks */
function buildCorpus(){
  NUM_VIDEOS = videos.length;
  videoWords = [];
  CORPUS_STOP = {};
  SEARCHABLE_ALL = "";
  var df = {};
  var chunks = [];
  for(var i = 0; i < videos.length; i++){
    var v = videos[i], seen = {}, arr = [];
    var parts = [v.title, v.summary];
    if(v.keywords) parts.push(v.keywords.join(" "));
    (v.topics || []).forEach(function(t){ if(!isPlaceholder(t.text)) parts.push(t.text); });
    if(v.spoken) parts.push(Object.keys(v.spoken).join(" "));
    var words = wordSplit(parts.join(" "));
    for(var j = 0; j < words.length; j++){
      if(!seen[words[j]]){ seen[words[j]] = 1; arr.push(words[j]); }
    }
    for(var k = 0; k < arr.length; k++) df[arr[k]] = (df[arr[k]] || 0) + 1;
    videoWords.push(arr);
    chunks.push(parts.join("\n").toLowerCase());
  }
  SEARCHABLE_ALL = chunks.join("\n");
  for(var w in df){
    if(df[w] / NUM_VIDEOS > 0.35) CORPUS_STOP[w] = 1;
  }
  /* seed the ubiquitous name the 35% rule can miss on small samples */
  CORPUS_STOP["guruji"] = 1;
}

function isCorpusStop(token){
  for(var w in CORPUS_STOP){
    if(w === token || matchesWord(w, token)) return true;
  }
  return false;
}
function dedupe(arr){
  var seen = {}, out = [];
  arr.forEach(function(t){ if(!seen[t]){ seen[t] = 1; out.push(t); } });
  return out;
}
/* significant (scored) tokens for a raw query string */
function sigTokensOf(raw){
  var filtered = wordSplit(raw).filter(function(t){ return t.length > 1 && !STOPWORDS[t]; });
  var kept = [];
  for(var i = 0; i < filtered.length; i++){
    if(!isCorpusStop(filtered[i])) kept.push(filtered[i]);
  }
  return dedupe(kept.length ? kept : filtered); /* fall back to unfiltered when all dropped */
}

/* fuzzy document frequency for one token */
function tokenDF(token){
  var n = 0;
  for(var i = 0; i < videoWords.length; i++){
    var arr = videoWords[i];
    for(var j = 0; j < arr.length; j++){
      if(tokenMatch(arr[j], token)){ n++; break; }
    }
  }
  return n || 1;
}

/* QUOTED PHRASES: words in double quotes (e.g. "light on anger") must
   match with the words adjacent, in that order -- quoted words leave
   the loose word list and score only where the exact sequence occurs.
   Words inside quotes are kept exactly as typed (no stopword removal:
   the "on" is part of the phrase). Unquoted words keep the usual loose
   matching, and a query can mix the two. Straight and curly quotes
   both work. */
function parseQuery(raw){
  var s = String(raw || ""), phrases = [], rest = [], m, last = 0;
  var re = /["\u201C]([^"\u201D]+)["\u201D]/g;
  while((m = re.exec(s))){
    rest.push(s.slice(last, m.index));
    var pw = wordSplit(m[1]);
    if(pw.length) phrases.push({ words: pw, str: " " + pw.join(" ") + " ", idf: 0, hit: false });
    last = m.index + m[0].length;
  }
  rest.push(s.slice(last));
  var seen = {}, out = [];
  phrases.forEach(function(p){ if(!seen[p.str]){ seen[p.str] = 1; out.push(p); } });
  return { phrases: out, rest: rest.join(" ") };
}

/* (The old term-based festival patches are retired: the
   video-based event rule in search() subsumes both the title
   strip and the strict quoted-festival-phrase rule.) */

/* a topic line for a video with no captions: copied from the event
   title, so it cannot prove a festival phrase was spoken there */
function isCaptionStub(text){
  return /no captions/i.test(String(text || ""));
}

/* field match quality: { s: score, any: matched >=1 significant token } */
function fieldScore(text, sig, idf, w, phrase, phraseIdf, qphrases){
  var s = 0, any = false, i, j;
  var words = wordSplit(text);
  var padded = words.length ? " " + words.join(" ") + " " : "";
  if(phrase && padded && padded.indexOf(phrase) !== -1){
    s += w * 4 * phraseIdf;                                   /* exact phrase bonus */
  }
  if(qphrases && qphrases.length && padded){
    for(i = 0; i < qphrases.length; i++){
      /* a quoted phrase scores only on the exact adjacent sequence */
      if(padded.indexOf(qphrases[i].str) !== -1){
        s += w * 4 * qphrases[i].idf; any = true; qphrases[i].hit = true;
      }
    }
  }
  for(i = 0; i < sig.length; i++){
    var tok = sig[i], found = false;
    for(j = 0; j < words.length; j++){
      if(tokenMatch(words[j], tok)){ found = true; break; }
    }
    if(found){ s += w * idf[i]; any = true; }
  }
  return { s: s, any: any };
}

/* Distinctive caption words are searchable even when the video is an event
   recording. One exact or typo-tolerant match per query token contributes to
   ranking, and the earliest matching caption line becomes the card's
   verifiable watch point. */
function spokenScore(v, sig, idf){
  var spoken = v.spoken || {}, words = Object.keys(spoken);
  var score = 0, any = false, best = null;
  for(var i = 0; i < sig.length; i++){
    var tok = sig[i], hit = null, entry;
    for(var j = 0; j < words.length; j++){
      if(tokenMatch(words[j], tok)){
        entry = spoken[words[j]];
        if(entry && (!hit || entry[0] < hit.sec))
          hit = { word: words[j], sec: entry[0], excerpt: entry[1], query: tok };
      }
    }
    if(hit){
      score += 1.5 * idf[i];
      any = true;
      if(!best || hit.sec < best.sec) best = hit;
    }
  }
  return { s: score, any: any, best: best };
}

function search(rawQuery){
  if(!String(rawQuery || "").trim()) return null;
  /* These excluded event-title families are deliberately outside SaiLib's
     Guruji-talk corpus. Keep title-style lookups from falling through to
     incidental spoken-word matches in the remaining videos. */
  var excludedTitleLookup = wordSplit(String(rawQuery || "")).join(" ");
  if(excludedTitleLookup === "talk by saipatham" ||
     excludedTitleLookup.indexOf("talk by saipatham doctors") === 0){
    var excludedResults = [];
    excludedResults.strongThreshold = 0;
    excludedResults.missedPhrases = [];
    return excludedResults;
  }
  /* "event:" prefix (any case): search only the event recordings,
     matching the remaining words against their titles and their
     spoken content where captioned. The prefix is stripped before
     tokenizing, and it composes with quoted phrases. */
  var rawText = String(rawQuery || "");
  var eventMode = /^\s*event\s*:/i.test(rawText);
  var pq = parseQuery(eventMode
    ? rawText.replace(/^\s*event\s*:\s*/i, "") : rawText);
  var sig = sigTokensOf(pq.rest);
  var qphrases = pq.phrases;
  if(!sig.length && !qphrases.length) return [];
  var idf = sig.map(function(t){ return Math.log(1 + NUM_VIDEOS / tokenDF(t)); });
  qphrases.forEach(function(p){
    /* a quoted phrase is worth the average of its words' weights */
    var sum = 0, i;
    for(i = 0; i < p.words.length; i++)
      sum += Math.log(1 + NUM_VIDEOS / tokenDF(p.words[i]));
    p.idf = p.words.length ? sum / p.words.length : 0;
    p.hit = false;
  });
  var phrase = null, phraseIdf = 0;
  if(sig.length > 1){
    phrase = " " + sig.join(" ") + " ";
    var sum = 0, i;
    for(i = 0; i < idf.length; i++) sum += idf[i];
    phraseIdf = sum / idf.length;
  }
  /* EVENT RECORDINGS (see the flagging block above): in default
     search an event recording scores only on its timestamped
     topics -- what was actually said in it -- never on its
     title, keywords, or summary. In event: mode only event
     recordings are searched, on all of their fields. */
  var out = [];
  for(var vi = 0; vi < videos.length; vi++){
    var v = videos[vi];
    var isMusic = v.lang === "music";
    if(isMusic ? !sourceMusic.checked : !sourceVideos.checked) continue;
    if(langFilter !== "all" && v.lang !== langFilter) continue;
    var isEvent = !!v._event;
    if(eventMode && !isEvent) continue;   /* event: looks only through event recordings */
    /* default search: an event recording's title, keywords, and
       summary never score -- only its spoken content (topics) does */
    var skipMeta = !eventMode && isEvent;
    var score = 0, any = false, r, titleAny = false, kwAny = false, sumAny = false;

    if(!skipMeta){
      /* in event mode the publish date joins the title text, so
         "event: 2025" also finds recordings dated 2025 whose titles
         do not carry the year */
      var titleText = eventMode
        ? String(v.title || "") + " " + (v.date || "")
        : String(v.title || "");
      /* Treat the compound event name "SaiQuiz" as the ordinary word
         "quiz" when event titles are searched. This leaves default search
         untouched because event metadata is skipped there. */
      if(eventMode) titleText = titleText.replace(/sai\s*quiz/ig, " quiz ");
      r = fieldScore(titleText, sig, idf, 10, phrase, phraseIdf, qphrases);   /* title > */
      score += r.s; any = any || r.any; titleAny = r.any;
      /* Music entries are intentionally title-only: pure song videos
         carry little or no searchable transcript metadata. */
      if(isMusic){
        if(any) out.push({ v: v, score: score, topic: null, tIdx: -1,
                           titleAny: titleAny, kwAny: false, sumAny: false,
                           spokenMatch: null });
        continue;
      }
      if(v.keywords){
        r = fieldScore(v.keywords.join(" "), sig, idf, 5, phrase, phraseIdf, qphrases); /* keyword > */
        score += r.s; any = any || r.any; kwAny = r.any;
      }
      r = fieldScore(v.summary, sig, idf, 2, phrase, phraseIdf, qphrases);            /* summary */
      score += r.s; any = any || r.any; sumAny = r.any;
    }
    /* Event-shaped music entries keep the event rules above and do not
       fall through to topic or spoken matching in ordinary searches. */
    if(isMusic) continue;

    var bestTopic = null, bestTopicScore = 0, bestIdx = -1;
    var topics = v.topics || [];
    for(var k = 0; k < topics.length; k++){
      if(isPlaceholder(topics[k].text)) continue;
      /* a caption-less stub line is the event title copied into the
         topics; it is not spoken content, so an event recording
         never scores on it */
      if(isEvent && isCaptionStub(topics[k].text)) continue;
      r = fieldScore(topics[k].text, sig, idf, 6, phrase, phraseIdf, qphrases);  /* topic > keyword */
      if(r.any && r.s > bestTopicScore){  /* snippet must contain a significant token */
        bestTopicScore = r.s; bestTopic = topics[k]; bestIdx = k;
      }
    }
    score += bestTopicScore;

    var spokenHit = spokenScore(v, sig, idf);
    score += spokenHit.s;
    any = any || spokenHit.any;

    /* candidate rule: only videos matching >=1 significant token appear */
    if(any || bestTopic) out.push({ v: v, score: score, topic: bestTopic, tIdx: bestIdx,
                                    titleAny: titleAny, kwAny: kwAny, sumAny: sumAny,
                                    spokenMatch: spokenHit.best });
  }
  out.sort(function(a, b){ return b.score - a.score; });
  /* A title-level match across the significant query terms is the
     search's strong-match bar. Reference reading is offered only when
     a mapped topic's best video result falls below this same IDF-aware
     level (or when there are no video results). */
  var strongThreshold = 0;
  for(var si = 0; si < idf.length; si++) strongThreshold += 10 * idf[si];
  out.strongThreshold = strongThreshold;
  /* quoted phrases that matched no video at all, so the UI can say so */
  out.missedPhrases = qphrases.filter(function(p){ return !p.hit; });
  return out;
}

/* ---------- optional book search ---------- */
function bookLanguageMatches(book){
  if(langFilter === "english") return book.lang === "en";
  if(langFilter === "telugu") return book.lang === "te";
  if(langFilter === "music") return false;
  return true;
}
function bookWordCount(passage, token, titleField){
  var searchText = titleField ? passage.titleSearch : passage.textSearch;
  var words = titleField ? passage.titleWords : passage.textWords;
  var group = synGroup(token), candidates = group || [token], total = 0;
  for(var ci = 0; ci < candidates.length; ci++){
    var needle = " " + candidates[ci] + " ", from = 0, at;
    while((at = searchText.indexOf(needle, from)) !== -1){
      total++; from = at + needle.length - 1;
      if(titleField || total >= 8) break;
    }
    if(titleField && total) return total;
  }
  /* Typo fallback stays available, but only when no exact form exists. */
  if(!total && !hasPresence(token)){
    for(var wi = 0; wi < words.length; wi++){
      if(matchesWord(words[wi], token)){
        total++;
        if(titleField || total >= 8) break;
      }
    }
  }
  return total;
}
function searchBooks(rawQuery){
  if(!sourceBooks.checked || /^\s*event\s*:/i.test(rawQuery))
    return { hits: [], groups: [], passages: 0 };
  var pq = parseQuery(rawQuery);
  var tokens = sigTokensOf(pq.rest);
  var phrases = pq.phrases;
  if(!tokens.length && !phrases.length) return { hits: [], groups: [], passages: 0 };
  var candidateMap = {}, candidates = [], i, j, count, score;
  function addExactCandidates(term){
    var group = synGroup(term) || [term];
    for(var gi = 0; gi < group.length; gi++){
      var ids = BOOK_EXACT_INDEX[group[gi]] || [];
      for(var ai = 0; ai < ids.length; ai++) candidateMap[ids[ai]] = 1;
    }
  }
  tokens.forEach(addExactCandidates);
  phrases.forEach(function(ph){ if(ph.words.length) addExactCandidates(ph.words[0]); });
  for(var candidateId in candidateMap) candidates.push(parseInt(candidateId, 10));
  /* A typo with no exact book token still gets the existing fuzzy fallback. */
  if(!candidates.length && tokens.some(function(token){ return !hasPresence(token); })){
    for(i = 0; i < BOOK_PASSAGES.length; i++) candidates.push(i);
  }
  var hits = [];
  for(var ci = 0; ci < candidates.length; ci++){
    var passage = BOOK_PASSAGES[candidates[ci]];
    if(!bookLanguageMatches(passage.book)) continue;
    score = 0;
    if(phrases.length){
      phrases.forEach(function(ph){
        if(passage.titleSearch.indexOf(ph.str) !== -1) score += 28;
        if(passage.textSearch.indexOf(ph.str) !== -1) score += 12;
      });
    }
    for(j = 0; j < tokens.length; j++){
      if(bookWordCount(passage, tokens[j], true)) score += 10;
      count = bookWordCount(passage, tokens[j], false);
      if(count) score += 2 + Math.min(count, 8) * .3;
    }
    if(score > 0) hits.push({ passage: passage, score: score });
  }
  hits.sort(function(a, b){ return b.score - a.score || a.passage.index - b.passage.index; });
  var map = {}, groups = [];
  hits.forEach(function(hit){
    var passage = hit.passage;
    var key = passage.book.id + (passage.book.kind === "satcharitra" ? "|" + passage.ref : "");
    var group = map[key];
    if(!group){
      group = map[key] = { book: passage.book, ref: passage.ref, hits: [], best: hit };
      groups.push(group);
    }
    group.hits.push(hit);
    if(hit.score > group.best.score) group.best = hit;
  });
  groups.sort(function(a, b){
    return b.best.score - a.best.score || b.hits.length - a.hits.length;
  });
  return { hits: hits, groups: groups, passages: hits.length };
}
function bookHeading(group){
  if(group.book.kind === "satcharitra"){
    var chapter = group.ref.replace(/^Satcharitra\s*/i, "");
    return "Satcharitra" + (chapter ? " · " + chapter : "");
  }
  return group.book.title;
}
function bookExcerpt(text, tokens, phrases){
  var raw = String(text || ""), lower = raw.toLowerCase(), at = -1;
  var allTerms = (tokens || []).slice();
  (phrases || []).forEach(function(ph){ allTerms.push(ph.words.join(" ")); });
  for(var i = 0; i < allTerms.length; i++){
    var pos = lower.indexOf(String(allTerms[i]).toLowerCase());
    if(pos >= 0 && (at < 0 || pos < at)) at = pos;
  }
  if(at < 0) at = 0;
  var start = Math.max(0, at - 145), end = Math.min(raw.length, at + 330);
  if(start > 0){
    var nextSpace = raw.indexOf(" ", start);
    if(nextSpace > 0 && nextSpace < at) start = nextSpace + 1;
  }
  if(end < raw.length){
    var prevSpace = raw.lastIndexOf(" ", end);
    if(prevSpace > at) end = prevSpace;
  }
  return {
    before: start > 0,
    after: end < raw.length,
    text: raw.slice(start, end)
  };
}
function pageSuffixHTML(page){
  return Number.isInteger(page) && page > 0
    ? ' <span class="page-number">· p. ' + page + '</span>'
    : '';
}
function saiBooksPassageUrl(passage, rawQuery){
  /* SaiBooks reads book + passage to open and focus this exact indexed
     passage; q stays in the hash so the same matched words are highlighted. */
  return SAIBOOKS_URL + "#/q=" + encodeURIComponent(rawQuery.trim()) +
    "&book=" + encodeURIComponent(passage.book.id) +
    "&passage=" + encodeURIComponent(passage.index);
}
function bookCardHTML(group, tokens, phrases, rawQuery){
  var passage = group.best.passage, book = group.book;
  var excerpt = bookExcerpt(passage.text, tokens, phrases);
  var deepLink = saiBooksPassageUrl(passage, rawQuery);
  var pageSuffix = pageSuffixHTML(passage.page);
  var lang = book.lang === "te" ? "Telugu" : "English";
  var html = '<article class="card book-card"><h3>' + esc(bookHeading(group)) + '</h3>' +
    '<div class="meta"><span class="badge ' + (book.lang === "te" ? "te" : "en") + '">' + lang + '</span>' +
    '<span class="book-source">Book passage</span>' +
    (passage.ref && book.kind !== "satcharitra" ? '<span>' + esc(passage.ref) + '</span>' : '') + '</div>' +
    '<p class="book-context">' + (excerpt.before ? '<span class="ellipsis">…</span>' : '') +
    highlight(excerpt.text, tokens, phrases) + (excerpt.after ? '<span class="ellipsis">…</span>' : '') + '</p>' +
    '<p class="book-count">' + group.hits.length + (group.hits.length === 1 ? ' matching passage' : ' matching passages') +
    ' in this ' + (book.kind === "satcharitra" ? 'chapter' : 'book') + '</p>' +
    '<div class="book-actions"><a class="book-open" href="' + esc(deepLink) +
    '" target="_blank" rel="noopener">' + bookSvg + '<span>See all context in SaiBooks' + pageSuffix + '</span></a>';
  if(book.read_url){
    html += '<a class="startlink" href="' + esc(book.read_url) + '" target="_blank" rel="noopener">Read the book' + pageSuffix + '</a>';
  }
  html += blessedOnesBookHTML(passage);
  return html + '</div></article>';
}

/* ---------- digest-first topic answers ---------- */
var DIGEST_BASE = "https://muse.ai/s/sri-babuji-digests-ox06xhhxrxkdxji6";
var DIGEST_DEEP_LINKS = {
  "Who is Sai Baba?": "#who-is-sai-baba",
  "Who is Sri Babuji?": "#who-is-sri-babuji",
  "What is Saipatham (Sai Padham)?": "#what-is-saipatham",
  "Guruji's Wordplay": "#gurujis-wordplay",
  "Guruji's Laughter & Humor": "#gurujis-laughter-humor",
  "Sai Satcharitra Leelas": "#sai-satcharitra-leelas",
  "Everything about Sai Baba": "#everything-about-sai-baba"
};
var TOPIC_DIGESTS = [
  {
    id: "saipatham",
    aliases: [
      "saipatham", "saipaatham", "sai patham", "sai paatham",
      "saipadam", "sai padam", "saipadham", "sai padham",
      "saipadalu", "sai padalu"
    ],
    title: "What is Saipatham (Sai Padham)?",
    slug: "primer-what-is-saipatham-sai-padham",
    blurb: `Saipatham, Saipadam and Sai Padham are names for the path Sri Sai Baba showed and lived — the universal Sadguru path of love, grace and remembrance. Baba is both the path and the goal: a life with Baba at its center, relying on the Sadguru's unconditional love and grace, and living His principles rather than merely carrying the name.`,
    relatedVideos: [
      { url: "https://www.youtube.com/watch?v=sIC1jxoxJJ4&t=32s", time: "0:32", label: "Anything that keeps us in Baba’s remembrance is Sai-padam" },
      { url: "https://www.youtube.com/watch?v=vneYH0yGJsg&t=1979s", time: "32:59", label: "Sai Padam is not for forming separate parties" },
      { url: "https://www.youtube.com/watch?v=lU1UU3766sQ&t=38s", time: "0:38", label: "Are we really living in Sai Padam?" }
    ]
  },
  {
    id: "sai-baba",
    aliases: ["saibaba", "who is saibaba", "shirdi saibaba", "sai baba", "who is sai baba", "shirdi sai baba"],
    title: "Who is Sai Baba?",
    slug: "primer-who-is-sai-baba",
    blurb: `Sai Baba of Shirdi (Maharashtra, India; Mahasamadhi 1918) was a saint-fakir revered by Hindus and Muslims alike — of unknown birth, boundless love, and miraculous help. He spent his life in Shirdi's Dwarkamai mosque and Chavadi, living with utter simplicity while treating all with an equal eye and teaching faith (Shraddha) and patience (Saburi). Worshipped as a God-incarnate sadguru, he promised to remain active in answering his devotees' prayers from his tomb — and millions experience it to this day.`,
    relatedVideos: [
      { url: "https://www.youtube.com/watch?v=hafU1vfUBY0&t=0s", time: "0:00", label: "If God Himself came to earth — that is Baba" }
    ]
  },
  {
    id: "sri-babuji",
    aliases: ["sarat babuji", "sarath babuji", "babuji", "sri babuji", "who is babuji", "who is sri babuji", "guruji", "who is guruji"],
    title: "Who is Sri Babuji?",
    slug: "primer-who-is-sri-babuji",
    blurb: `Sri Sainathuni Sarath Babuji (1954–2010), affectionately called 'Guruji,' was a South Indian devotee of Shirdi Sai Baba who said of himself: 'I am not your guru, you are not my disciples. I am a simple Sai devotee.' Settling in Shirdi in 1989, he guided seekers through intimate question-and-answer satsangs, the Telugu monthly magazine Saipatham, and his teachings preserved in the monthly Rose Petals (Sarathchandrikalu) editions — all pointing, as he put it, to one thing: 'Baba is both the path and the goal.'`,
    relatedVideos: [
      { url: "https://www.youtube.com/watch?v=oshNMzmPojQ&t=120s", time: "2:00", label: "I am not a guru, I am a Sai devotee" }
    ]
  },
  {
    id: "ramana-maharshi",
    aliases: ["ramana", "ramana maharshi", "bhagavan ramana", "bhagavan ramana maharshi"],
    title: "Ramana Maharshi",
    slug: "saint-ramana-maharshi",
    blurb: `The sage of Arunachala, whom Guruji returns to again and again — not for his “Who am I?” formula, but for his life: what it means to love the formless through a form, and why teachings must be read through the teacher's heart, not his sentences.`,
    relatedVideos: [
      { url: "https://www.youtube.com/watch?v=KKfuaLeeugs&t=47s", time: "0:47", label: "How to understand “Know thyself!”" }
    ]
  },
  {
    id: "wordplay",
    aliases: ["wordplay", "word play", "guruji wordplay", "guruji's wordplay", "g factor", "race to grace", "discover cover"],
    title: "Guruji's Wordplay",
    blurb: `A collection of Sri Babuji's playful turns of phrase — including racing toward grace, the “G-factor,” and dis-covering by removing the cover — with the context that gives each wordplay its depth.`
  },
  {
    id: "laughter-humor",
    aliases: ["laughter", "humor", "humour", "guruji laughter", "guruji's laughter", "guruji humor", "guruji's humor"],
    title: "Guruji's Laughter & Humor",
    blurb: `Stories and satsang moments that preserve Sri Babuji's laughter, timing and sense of humor, gathered with enough surrounding context to keep each moment meaningful.`
  },
  {
    id: "everything-sai-baba",
    aliases: ["everything about sai baba", "everything about saibaba", "all about sai baba", "all about saibaba"],
    title: "Everything about Sai Baba",
    blurb: `A wide-ranging guide to Sai Baba across the searchable archive, bringing together Guruji's explanations, stories and recurring themes in one place.`
  },
  {
    id: "satcharitra-leelas",
    aliases: ["satcharitra", "sai satcharitra", "satcharitra leela", "satcharitra leelas", "satcharitra stories", "sai satcharitra leelas"],
    title: "Sai Satcharitra Leelas",
    slug: "leela-sai-satcharitra-leelas",
    blurb: `Fourteen leelas Guruji returns to again and again — the story as the Satcharitra tells it, and Guruji's clarification of what it really means. Plus his master key: how to read the Charitra itself.`
  }
];
function normalizedTopicQuery(raw){
  return wordSplit(String(raw || "").replace(/^\s*event\s*:\s*/i, "")).join(" ");
}
function topicHasKey(query, aliases){
  var padded = " " + query + " ";
  for(var i = 0; i < aliases.length; i++){
    var alias = normalizedTopicQuery(aliases[i]);
    if(query === alias || padded.indexOf(" " + alias + " ") !== -1) return true;
  }
  return false;
}
function digestById(id){
  for(var i = 0; i < TOPIC_DIGESTS.length; i++){
    if(TOPIC_DIGESTS[i].id === id) return TOPIC_DIGESTS[i];
  }
  return null;
}
function mappedDigestsFor(rawQuery){
  /* Event-only searches are deliberately kept separate: an event title
     never becomes a recommended video inside a digest answer. */
  if(/^\s*event\s*:/i.test(rawQuery)) return [];
  var query = normalizedTopicQuery(rawQuery);
  if(!query) return [];
  var out = [], seen = {};
  for(var i = 0; i < TOPIC_DIGESTS.length; i++){
    var topic = TOPIC_DIGESTS[i];
    if(!seen[topic.id] && topicHasKey(query, topic.aliases)){
      out.push(topic); seen[topic.id] = 1;
    }
  }
  return out;
}
function digestItemsFor(rawQuery){
  if(/^\s*event\s*:/i.test(rawQuery)) return [];
  var queryTokens = wordSplit(rawQuery);
  if(!queryTokens.length) return [];
  var items = window.SAILIB_DIGEST_ITEMS || [], scored = [];
  for(var i = 0; i < items.length; i++){
    var item = items[i];
    if(!item || !item.t) continue;
    var titleWords = {}, words = wordSplit(item.t), score = 0;
    for(var wi = 0; wi < words.length; wi++) titleWords[words[wi]] = 1;
    for(var qi = 0; qi < queryTokens.length; qi++){
      if(titleWords[queryTokens[qi]]) score++;
    }
    if(score > 0) scored.push({ t: item.t, d: item.d, h: item.h, score: score });
  }
  scored.sort(function(a, b){
    return b.score - a.score || String(a.t).localeCompare(String(b.t));
  });
  return scored.slice(0, 12);
}
function digestItemCardHTML(item){
  var url = DIGEST_BASE + "#" + item.h;
  return '<article class="card digest-item-card"><h3><a href="' + esc(url) +
    '" target="_blank" rel="noopener">' + esc(item.t) + '</a></h3>' +
    '<p class="digest-parent">' + esc(item.d) + '</p></article>';
}
function referenceCardHTML(topic, index, hits, bookGroups, rawQuery){
  var digestUrl = DIGEST_BASE + (DIGEST_DEEP_LINKS[topic.title] || "#/" + topic.slug);
  var related = (topic.relatedVideos || []).slice();
  /* Older mapped digests did not carry a curated video list. Give those
     cards the strongest ordinary search matches, but never an event
     recording; event videos remain only in the regular results below. */
  if(!related.length){
    for(var hi = 0; hi < hits.length && related.length < 3; hi++){
      var hit = hits[hi], v = hit.v;
      if(v._event || v.status === "unavailable") continue;
      var t = hit.topic && !isPlaceholder(hit.topic.text) ? hit.topic : null;
      related.push({
        url: watchUrl(v.id, t ? t.sec : 0),
        time: fmtTime(t ? t.sec : 0),
        label: v.title
      });
    }
  }
  var videos = related.map(function(v){
    return '<a class="digest-video" href="' + esc(v.url) +
      '" target="_blank" rel="noopener">' +
      '<span class="digest-video-time">Watch at ' + esc(v.time) + '</span>' +
      '<span class="digest-video-label">' + esc(v.label) + '</span></a>';
  }).join("");
  var videoLinks = videos ? '<div class="digest-related"><h3>Related videos</h3>' +
    '<div class="digest-video-row">' + videos + '</div></div>' : '';
  var books = (bookGroups || []).slice(0, 3).map(function(group){
    var passage = group.best.passage;
    var url = saiBooksPassageUrl(passage, rawQuery);
    return '<a class="digest-book" href="' + esc(url) +
      '" target="_blank" rel="noopener">' + bookSvg + '<span>' +
      esc(bookHeading(group)) + pageSuffixHTML(passage.page) + '</span></a>';
  }).join("");
  var bookLinks = books ? '<div class="digest-books"><h3>Related book references</h3>' +
    '<div class="digest-book-row">' + books + '</div></div>' : '';
  return '<aside class="reference-card hero" data-digest="' + esc(topic.id) + '">' +
    '<p class="ref-intro">' + (index ? 'Also compare this article' : 'Start with the article') + '</p>' +
    '<a class="ref-title" href="' + esc(digestUrl) +
    '" target="_blank" rel="noopener">' + esc(topic.title) + '</a>' +
    '<p class="ref-blurb">' + esc(topic.blurb) + '</p>' +
    '<div class="ref-links"><a class="ref-link" href="' + esc(digestUrl) +
    '" target="_blank" rel="noopener">Read the full article &#8250;</a></div>' +
    videoLinks + bookLinks + '</aside>';
}

/* ---------- render ---------- */
/* highlight only significant matched terms (fuzzy), escaping safely.
   Quoted phrases light up only where their words sit side by side. */
function highlight(text, tokens, phrases){
  var toks = (tokens || []).filter(function(t){ return t && t.length > 1; });
  var phr = (phrases || []).filter(function(p){ return p.words && p.words.length; });
  if(!toks.length && !phr.length) return esc(text);
  /* walk word / non-word runs so <mark> never lands inside an entity */
  var chunks = String(text).match(/[\p{L}\p{M}\p{N}]+|[^\p{L}\p{M}\p{N}]+/gu);
  if(!chunks) return esc(text);
  var i, j, k, wordAt = [], marked = {};
  for(i = 0; i < chunks.length; i++){
    if(/^[\p{L}\p{M}\p{N}]+$/u.test(chunks[i])) wordAt.push(i);
  }
  for(i = 0; i < wordAt.length; i++){
    var lw = chunks[wordAt[i]].toLowerCase();
    for(j = 0; j < toks.length; j++){
      if(tokenMatch(lw, toks[j])){ marked[wordAt[i]] = 1; break; }
    }
  }
  for(i = 0; i < phr.length; i++){
    var pw = phr[i].words, n = pw.length;
    for(j = 0; j + n <= wordAt.length; j++){
      var ok = true;
      for(k = 0; k < n; k++){
        if(chunks[wordAt[j + k]].toLowerCase() !== pw[k]){ ok = false; break; }
      }
      if(ok) for(k = 0; k < n; k++) marked[wordAt[j + k]] = 1;
    }
  }
  var out = "";
  for(i = 0; i < chunks.length; i++){
    out += marked[i] ? "<mark>" + esc(chunks[i]) + "</mark>" : esc(chunks[i]);
  }
  return out;
}
function langLabel(l){ return l === "english" ? "English" : l === "telugu" ? "Telugu" : "Music"; }
function langCls(l){ return l === "english" ? "en" : l === "telugu" ? "te" : "mu"; }

var playSvg = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 1.8v12.4c0 .9 1 1.5 1.8 1L13 8.9c.8-.5.8-1.6 0-2L4.8.9C4 0.4 3 1 3 1.8z"/></svg>';
var copySvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>';
var unavailSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><line x1="12" y1="7.5" x2="12" y2="13"/><line x1="12" y1="16.4" x2="12" y2="16.5"/></svg>';
var bookSvg = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
var RP_MONTH_SHORT = { january:"Jan", february:"Feb", march:"Mar", april:"Apr",
  may:"May", june:"Jun", july:"Jul", august:"Aug", september:"Sep",
  october:"Oct", november:"Nov", december:"Dec" };
function rpEditionShort(edition){
  var m = /^([A-Za-z]+)\s+(\d{4})$/.exec(String(edition || "").trim());
  if(!m) return String(edition || "");
  return (RP_MONTH_SHORT[m[1].toLowerCase()] || m[1]) + " " + m[2];
}
/* highlighted "Related reading" pill(s) for cards whose video has mapped
   related reading (a Rose Petals / Sarathchandrikalu edition or a book) —
   green book styling, distinct from the orange watch links. English
   videos link the English edition, Telugu videos the Telugu edition
   (falling back to the English link when there is no Telugu one), at
   most two pills per card. Returns "" when the video has no mapping. */
/* ---------- Blessed Ones devotee profiles (GENERATED DATA BLOCK) ----------
   The Blessed Ones (blessedones.saibaba.com) is part of the saibaba.com family.
   BLESSED_PROFILES: the 24 devotee entries from ~/workspace/blessed-ones/index.json
   (profile_url copied verbatim from the site's own index HTML; never invented).
   BLESSED_ONES maps a YouTube video ID to profile indexes whose devotee the
   video is genuinely about or prominently features (conservative mapping,
   reviewed 2026-10-04 from topics/keywords/summaries; passing name-drops excluded).
   BLESSED_BOOK maps a book-passage index (see BOOK_PASSAGES) to profile indexes
   the passage meaningfully mentions.
   To refresh: re-run the matching and replace this whole block; the rendering
   code below needs no changes. Do not hand-edit individual entries here. */
var BLESSED_PROFILES = [{"d": "Rege", "u": "https://blessedones.saibaba.com/rege/rege-1.html"}, {"d": "G. G. Narke", "u": "https://blessedones.saibaba.com/narke/narke-1.html"}, {"d": "Bhausaheb Dhumal", "u": "https://blessedones.saibaba.com/dhumal/dhumal-1.html"}, {"d": "S. B. Nachne", "u": "https://blessedones.saibaba.com/dahanukar/dahanukar-1.html"}, {"d": "Narayan Asram", "u": "https://blessedones.saibaba.com/nasram/nasram-1.html"}, {"d": "R. B. Purandhare", "u": "https://blessedones.saibaba.com/purandhare/purandhare-1.html"}, {"d": "Abdulla Jan", "u": "https://blessedones.saibaba.com/abdullajan/abdullajan-1.html"}, {"d": "W. Pradhan", "u": "https://blessedones.saibaba.com/pradhan/pradhan-1.html"}, {"d": "H. V. Sathe", "u": "https://blessedones.saibaba.com/sathe/sathe-1.html"}, {"d": "Das Ganu", "u": "https://blessedones.saibaba.com/dasganu/dasganu-1.html"}, {"d": "Damodar Rasane", "u": "https://blessedones.saibaba.com/ddrasane/ddrasane-1.html"}, {"d": "Savalram Rasane", "u": "https://blessedones.saibaba.com/dsrasane/dsrasane-1.html"}, {"d": "Nandaram Marwadi", "u": "https://blessedones.saibaba.com/nandaram/nandaram-1.html"}, {"d": "Tatya Patil", "u": "https://blessedones.saibaba.com/bayyaji/bayyaji-1.html"}, {"d": "Kasibai Hansraj", "u": "https://blessedones.saibaba.com/kasibai/kasibai-1.html"}, {"d": "Somanath Deshpande", "u": "https://blessedones.saibaba.com/somanath/somanath-1.html"}, {"d": "S. N. Kharkar", "u": "https://blessedones.saibaba.com/kharkar/kharkar-1.html"}, {"d": "B. V. Dev", "u": "https://blessedones.saibaba.com/dev/dev-1.html"}, {"d": "Sagun Meru Naik", "u": "https://blessedones.saibaba.com/smnaik/smnaik-1.html"}, {"d": "Shama", "u": "https://blessedones.saibaba.com/shama/shama-1.html"}, {"d": "Abdul", "u": "https://blessedones.saibaba.com/abdul/abdul-1.html"}, {"d": "Jayker", "u": "https://blessedones.saibaba.com/jayker/jayker-1.html"}, {"d": "Chandra Bai Borkar", "u": "https://blessedones.saibaba.com/borkar/borkar-1.html"}, {"d": "Kushabhav", "u": "https://blessedones.saibaba.com/kushabhav/kushabhav-1.html"}];
var BLESSED_ONES = {"0FcSI2XuwmA": [9], "tL7VgCl7sUI": [13], "s9jcHQVgAxQ": [13], "GbTfN3-_OXQ": [19]};
var BLESSED_BOOK = {"475": [9], "518": [1, 19], "694": [9], "695": [9], "710": [9], "711": [9], "719": [9], "720": [9], "859": [19], "954": [5], "955": [5], "957": [3], "1098": [19], "1251": [2], "1477": [13], "1520": [9], "1522": [19], "1534": [19], "1545": [9], "1553": [9], "1555": [9], "1556": [9], "1559": [8], "1568": [18], "1570": [18], "1577": [13], "1582": [13, 19], "1583": [13], "1585": [13], "1591": [9], "1594": [13], "1595": [13], "1602": [13], "1606": [19], "1607": [19], "1613": [13], "1620": [13], "1622": [13], "1626": [13, 19], "1664": [19], "1665": [19], "1670": [2], "1673": [2], "1682": [19], "1687": [19], "1694": [9], "1695": [9], "1697": [9], "1698": [9], "1699": [8], "1703": [1], "1707": [9], "1708": [9], "1709": [9], "1727": [8], "1729": [8], "1730": [8], "1731": [8], "1733": [8, 19], "1734": [19], "1735": [19], "1736": [19], "1737": [8, 19], "1742": [19], "1743": [19], "1758": [9], "1759": [9], "1761": [9], "1762": [9], "1763": [9], "1764": [9], "1765": [9], "1766": [9], "1784": [19], "1785": [19], "1788": [20], "1794": [19], "1795": [19], "1796": [19], "1797": [13, 19], "1800": [19], "1805": [19], "1821": [19], "1822": [19], "1823": [19], "1826": [19], "1835": [9], "1841": [18], "1842": [18], "1847": [19], "1848": [19], "1849": [19], "1850": [19], "1851": [19], "1852": [19], "1853": [1, 19], "1856": [19], "1857": [19], "1860": [9], "1864": [19], "1868": [8], "1891": [19], "1898": [19], "1899": [19], "1900": [19], "1935": [19], "1946": [19], "1947": [19], "1955": [20], "1956": [19], "1967": [19], "1974": [19], "1978": [19], "1983": [19], "1984": [19], "1985": [19], "1986": [19], "1990": [13], "1991": [13], "1993": [13], "1995": [13], "1996": [13, 19], "1997": [13], "2003": [13], "2006": [9], "2009": [19], "2011": [9], "2022": [19], "2023": [19], "2024": [19], "2036": [13], "2037": [1], "2039": [13], "2040": [13], "2041": [9], "2042": [13], "2047": [19], "2049": [19], "2063": [19], "2067": [19], "2072": [19], "2075": [19], "2076": [19], "2077": [19], "2078": [19], "2080": [13, 19], "2117": [19], "2122": [19], "2123": [19], "2124": [19]};
/* "More about this devotee" pill(s) for cards whose video is genuinely about
   or prominently features a Blessed Ones devotee. Rendered in the same
   .relrow green-pill style as the Related-reading pills, linking out to the
   devotee's profile on blessedones.saibaba.com. Returns "" when the video
   has no mapping. */
function blessedOnesHTML(v){
  var dis = BLESSED_ONES[v.id];
  if(!dis || !dis.length) return "";
  var pills = "";
  dis.forEach(function(di){
    var p = BLESSED_PROFILES[di];
    if(!p || !p.u) return;
    pills += '<a class="related" href="' + esc(p.u) +
             '" target="_blank" rel="noopener" title="More about this devotee on the Blessed Ones (saibaba.com)">' + bookSvg +
             "<span>More about this devotee: " + esc(p.d) + " \u00B7 Blessed Ones</span></a>";
  });
  return pills ? '<div class="relrow">' + pills + "</div>" : "";
}
/* Blessed Ones link(s) for a book result card, appended to the card's
   .book-actions row when the displayed passage meaningfully mentions a
   devotee. Same text-link style as the other book-action links. */
function blessedOnesBookHTML(passage){
  var dis = BLESSED_BOOK[String(passage.index)];
  if(!dis || !dis.length) return "";
  return dis.map(function(di){
    var p = BLESSED_PROFILES[di];
    if(!p || !p.u) return "";
    return '<a class="book-open" href="' + esc(p.u) +
      '" target="_blank" rel="noopener" title="More about this devotee on the Blessed Ones (saibaba.com)">' + bookSvg +
      "<span>Blessed Ones: more about " + esc(p.d) + "</span></a>";
  }).join("");
}
function relatedReadingHTML(v){
  var entries = RELATED_READING[v.id];
  if(!entries || !entries.length) return "";
  var te = v.lang === "telugu";
  var pills = "";
  entries.slice(0, 2).forEach(function(e){
    var url = te
      ? (langFilter === "telugu" ? e.te_url : (e.te_url || e.en_url))
      : e.en_url;
    if(!url) return;
    var label = e.label || "";
    if(e.kind === "rose-petals"){
      if(te && label === "Rose Petals") label = "Sarathchandrikalu";
      if(!te && label === "Sarathchandrikalu") label = "Rose Petals";
    }
    var text = label;
    if(e.edition) text += " · " + rpEditionShort(e.edition);
    if(e.title && e.title !== e.label && e.title.indexOf(e.label) !== 0)
      text += " — '" + e.title + "'";
    pills += '<a class="related" href="' + esc(url) +
             '" target="_blank" rel="noopener">' + bookSvg +
             "<span>Related reading: " + esc(text) + "</span></a>";
  });
  return pills ? '<div class="relrow">' + pills + "</div>" : "";
}

/* quiet collapsed Sai Satcharitra story reference line(s) for a card.
   Deliberately plainer than the green Related-reading pill: a muted
   text line that only appears when the card's Watch-at anchor
   (linkSec) falls within 10 minutes of a mapped story's timestamp.
   Tapping it expands inline: a 2-3 line summary of the Satcharitra
   episode plus a "Read Ch. N in SaiBooks" deep link that runs a
   search surfacing that chapter's card. At most three per card. */
var SATCH_PAGE_CACHE = {};
function satcharitraPage(r){
  var cacheKey = r.ch + "|" + r.q;
  if(Object.prototype.hasOwnProperty.call(SATCH_PAGE_CACHE, cacheKey)) return SATCH_PAGE_CACHE[cacheKey];
  var chapterRef = "Satcharitra Ch. " + r.ch;
  var queryTokens = sigTokensOf(r.q);
  var summaryTokens = sigTokensOf(r.sum);
  var openingPage = null, bestPage = null, bestScore = -1;
  BOOK_PASSAGES.forEach(function(passage){
    if(passage.book.id !== "satcharitra" || passage.ref !== chapterRef || !passage.page) return;
    if(openingPage === null) openingPage = passage.page;
    var score = 0;
    queryTokens.forEach(function(token){ if(bookWordCount(passage, token, false)) score += 12; });
    summaryTokens.forEach(function(token){ if(bookWordCount(passage, token, false)) score += 1; });
    if(score > bestScore){ bestScore = score; bestPage = passage.page; }
  });
  SATCH_PAGE_CACHE[cacheKey] = bestPage || openingPage;
  return SATCH_PAGE_CACHE[cacheKey];
}
function satcharitraHTML(v, linkSec){
  if(langFilter === "telugu") return "";
  var refs = SATCHARITRA_REFS[v.id];
  if(!refs || !refs.length) return "";
  var near = refs.filter(function(r){ return Math.abs(linkSec - r.sec) <= 600; });
  near.sort(function(a, b){ return Math.abs(linkSec - a.sec) - Math.abs(linkSec - b.sec); });
  near = near.slice(0, 3);
  if(!near.length) return "";
  return near.map(function(r){
    var kindLabel = r.kind === "reading"
      ? "Satcharitra reading in this satsang"
      : "Guruji narrates this story";
    var url = SAIBOOKS_URL + "#/q=" + encodeURIComponent(r.q);
    var pageSuffix = pageSuffixHTML(satcharitraPage(r));
    return '<div class="satch">' +
      '<button type="button" class="satchline" aria-expanded="false">' + bookSvg +
        '<span>Sai Satcharitra — ' + esc(r.n) + '</span>' +
        '<span class="chev" aria-hidden="true">&#8250;</span></button>' +
      '<div class="satchbody" hidden>' +
        '<p class="satchkind">' + kindLabel + '</p>' +
        '<p>' + esc(r.sum) + '</p>' +
        '<a class="satchread" href="' + esc(url) +
          '" target="_blank" rel="noopener">Read Ch. ' + esc(r.ch) +
          ' in SaiBooks' + pageSuffix + ' &#8250;</a>' +
      '</div></div>';
  }).join("");
}

function topicRowHTML(v, t, tokens, phrases){
  /* unavailable videos keep the timestamp as plain text -- the content
     (topic + summary) stays readable without a dead watch link */
  var tsHtml = v.status === "unavailable"
    ? '<span class="ts">' + esc(t.ts) + "</span>"
    : '<a class="ts" href="' + esc(watchUrl(v.id, t.sec)) +
      '" target="_blank" rel="noopener">' + esc(t.ts) + "</a>";
  return '<div class="hit">' + tsHtml + "<p>" +
         highlight(t.text, tokens, phrases) + "</p></div>";
}
/* KEYWORD-ONLY TRANSPARENCY: when a result matched via keywords alone
   (no significant token in the title, any topic text, or the summary),
   show the matched keywords as labeled chips so the user sees exactly
   why the video matched when no snippet shows their search term. */
function matchedKeywords(v, tokens, phrases){
  var out = [];
  (v.keywords || []).forEach(function(kw){
    var words = wordSplit(kw), hit = false;
    for(var i = 0; i < tokens.length && !hit; i++){
      for(var j = 0; j < words.length; j++){
        if(tokenMatch(words[j], tokens[i])){ hit = true; break; }
      }
    }
    if(!hit && phrases && phrases.length && words.length){
      var padded = " " + words.join(" ") + " ";
      for(var p = 0; p < phrases.length; p++){
        if(padded.indexOf(phrases[p].str) !== -1){ hit = true; break; }
      }
    }
    if(hit) out.push(kw);
  });
  return out;
}
function taggedHTML(v, tokens, phrases){
  var kws = matchedKeywords(v, tokens, phrases);
  if(!kws.length) return "";
  var lis = kws.map(function(kw){
    return '<span class="tchip">' + highlight(kw, tokens, phrases) + "</span>";
  }).join("");
  return '<div class="tagged"><span class="tlbl">Tagged:</span>' + lis + "</div>";
}
function ctxHTML(v, tIdx){
  var topics = v.topics || [];
  if(topics.length < 2) return "";
  var items = [];
  for(var i = tIdx + 1; i < topics.length && items.length < 2; i++){
    if(!isPlaceholder(topics[i].text)) items.push(topics[i]);
  }
  if(!items.length){
    for(var j = tIdx - 1; j >= 0 && items.length < 2; j--){
      if(!isPlaceholder(topics[j].text)) items.push(topics[j]);
    }
    items.reverse();
  }
  if(!items.length) return "";
  var unavail = v.status === "unavailable";
  var lis = items.map(function(t){
    var tsHtml = unavail
      ? '<span class="ts">' + esc(t.ts) + "</span>"
      : '<a class="ts" href="' + esc(watchUrl(v.id, t.sec)) +
        '" target="_blank" rel="noopener">' + esc(t.ts) + "</a>";
    return "<li>" + tsHtml + "<span>" + esc(t.text) + "</span></li>";
  });
  return '<ul class="ctx"><li><span class="lbl">Also in this video</span></li>' + lis.join("") + "</ul>";
}
function cardHTML(hit, tokens, phrases){
  var v = hit.v, t = hit.topic;
  /* status:"unavailable" = video taken down from YouTube. It stays in
     the results (fully searchable) with a callout, its summary/topics/
     timestamps shown as plain text, and no watch links at all. */
  var unavail = v.status === "unavailable";
  var hasRealTopic = t && !isPlaceholder(t.text);
  var link = hit.spokenMatch
    ? { sec: hit.spokenMatch.sec, excerpt: hit.spokenMatch.excerpt, fromAnchor: true }
    : anchorLink(v, hasRealTopic ? t : null, tokens);
  var mainUrl = watchUrl(v.id, link.sec);
  /* no spoken anchor and no exact topic snippet: a matching topic line
     may still give an honest topic-start landing (see fallbackTopic) */
  var fallback = null;
  if(!hasRealTopic && !unavail && !(link.fromAnchor && link.sec)){
    fallback = fallbackTopic(v, tokens, phrases);
    if(fallback) mainUrl = watchUrl(v.id, fallback.sec);
  }
  var shareUrl = mainUrl.indexOf("&t=") === -1
    ? mainUrl + "&t=0s"
    : mainUrl.replace(/&t=(\d+)(?!s)/, "&t=$1s");
  var shareButton = '<button type="button" class="copy-link" data-copy-link="' + esc(shareUrl) +
    '" data-copy-kind="video">' + copySvg + '<span>Copy link</span></button>';
  var badge = '<span class="badge ' + langCls(v.lang) + '">' + langLabel(v.lang) + "</span>";
  var metaBits = [badge, '<span class="chan">' + esc(v.channel || "Sri Babuji") + "</span>"];
  if(v.duration && v.duration !== "Unknown") metaBits.push("<span>" + esc(v.duration) + "</span>");
  var d = fmtDate(v.date);
  if(d) metaBits.push("<span>" + esc(d) + "</span>");

  var html = '<article class="card"><h3>';
  if(unavail){
    html += highlight(v.title, tokens, phrases);
  } else {
    html += '<a href="' + esc(mainUrl) +
            '" target="_blank" rel="noopener">' + highlight(v.title, tokens, phrases) + "</a>";
  }
  html += '</h3><div class="meta">' + metaBits.join("") + "</div>";

  if(unavail){
    html += '<p class="unavail">' + unavailSvg +
            "This video is no longer available on YouTube</p>";
    if(v.summary) html += '<p class="summaryline">' + highlight(v.summary, tokens, phrases) + "</p>";
  }

  if(hasRealTopic){
    html += topicRowHTML(v, t, tokens, phrases);
    if(link.fromAnchor && link.sec !== t.sec){
      html += '<p class="anchornote">';
      html += '&quot;' + esc(link.excerpt) + '&quot; — ' + esc(fmtTime(link.sec)) + '</p>';
    }
    html += ctxHTML(v, hit.tIdx);
    html += relatedReadingHTML(v) + blessedOnesHTML(v);
    if(!unavail){
      html += '<div class="actions"><a class="btn-watch" href="' + esc(mainUrl) +
              '" target="_blank" rel="noopener">' + playSvg + " Watch at " + esc(fmtTime(link.sec)) + "</a>" + shareButton;
      if(link.sec > 30)
        html += '<a class="startlink" href="' + esc(watchUrl(v.id, 0)) +
                '" target="_blank" rel="noopener">Play from the beginning</a>';
      html += "</div>";
    }
  } else {
    /* no topic snippet: keyword-only matches get the "Tagged:" chips.
       The watch button prefers, in order: the exact spoken-word anchor
       (quoted caption line), then a matching topic line's start time
       (topic title shown as the line, so it reads as a topic start,
       not a spoken second), then plain "Watch video". */
    var kwOnly = hit.kwAny && !hit.titleAny && !hit.sumAny && !hasRealTopic;
    if(kwOnly) html += taggedHTML(v, tokens, phrases);
    if(v.summary && !unavail) html += '<p class="summaryline">' + highlight(v.summary, tokens, phrases) + "</p>";
    var anchorWatch = link.fromAnchor && link.sec;
    if(anchorWatch){
      html += '<p class="anchornote">';
      html += '&quot;' + esc(link.excerpt) + '&quot; — ' + esc(fmtTime(link.sec)) + '</p>';
    }
    else if(fallback)
      html += '<p class="anchornote">' + highlight(fallback.text, tokens, phrases) + " — " +
              esc(fmtTime(fallback.sec)) + "</p>";
    html += relatedReadingHTML(v) + blessedOnesHTML(v);
    if(!unavail){
      var watchSec = anchorWatch ? link.sec : (fallback ? fallback.sec : 0);
      html += '<div class="actions"><a class="btn-watch" href="' + esc(mainUrl) +
              '" target="_blank" rel="noopener">' + playSvg +
              (watchSec ? " Watch at " + esc(fmtTime(watchSec)) : " Watch video") + "</a>" + shareButton;
      if(watchSec > 30)
        html += '<a class="startlink" href="' + esc(watchUrl(v.id, 0)) +
                '" target="_blank" rel="noopener">Play from the beginning</a>';
      html += "</div>";
    }
  }
  html += satcharitraHTML(v, link.sec);
  return html + "</article>";
}

/* ---------- shareable search links ----------
   The current search lives in URL query parameters (?q=grace&lang=telugu)
   so the share shell carries it through on a fresh load. The query is
   written with history.replaceState (no extra history entries) and read
   once on page load. */
var BASE_TITLE = "SaiLib \u2013 Drench in Sri Babuji's Uchhishta";
var PUBLIC_SEARCH_BASE = "https://muse.ai/s/sri-babuji-video-search-xan6xhe61u7wm";
var LANG_VALUES = { all: 1, english: 1, telugu: 1, music: 1 };
function selectedSourceNames(){
  var out = [];
  if(sourceVideos.checked) out.push("videos");
  if(sourceDigests.checked) out.push("digests");
  if(sourceBooks.checked) out.push("books");
  if(sourcePhotos.checked) out.push("photos");
  if(sourceMusic.checked) out.push("music");
  return out;
}
function queryForSearch(){
  var raw = q.value.trim();
  if(!raw) return "";
  var query = "?q=" + encodeURIComponent(raw);
  if(langFilter !== "all") query += "&lang=" + encodeURIComponent(langFilter);
  var selected = selectedSourceNames();
  if(selected.join(",") !== "videos,digests") query += "&src=" + encodeURIComponent(selected.join(","));
  return query;
}
function writeQuery(){
  var query = queryForSearch();
  copySearch.disabled = !query;
  try {
    if(query){
      if(location.search !== query) history.replaceState(null, "", location.pathname + query);
    } else if(location.search){
      history.replaceState(null, "", location.pathname);
    }
  } catch(e) { /* the URL is a convenience; never break the search over it */ }
}
function searchShareUrl(){
  var query = queryForSearch();
  return query ? PUBLIC_SEARCH_BASE + query : "";
}
function parseSearchParams(){
  var params;
  try { params = new URLSearchParams(location.search || ""); }
  catch(e) { return null; }
  var qValue = params.get("q");
  if(!qValue || !String(qValue).trim()) return null;
  return {
    q: qValue,
    lang: params.get("lang"),
    src: params.has("src") ? params.get("src") : undefined
  };
}
function setLangFilter(val){
  langFilter = LANG_VALUES[val] ? val : "all";
  document.querySelectorAll("[data-language-toggle] button[data-lang]").forEach(function(button){
    button.setAttribute("aria-pressed",
      button.getAttribute("data-lang") === langFilter ? "true" : "false");
  });
}
function updateSearchLanguageCounts(videoHits){
  var counts = { all: 0, telugu: 0, english: 0 };
  (videoHits || []).forEach(function(hit){
    counts.all++;
    if(hit.v.lang === "telugu") counts.telugu++;
    if(hit.v.lang === "english") counts.english++;
  });
  langChips.querySelectorAll("button[data-lang]").forEach(function(button){
    var key = button.getAttribute("data-lang");
    var count = counts[key] || 0;
    var number = button.querySelector("[data-lang-count]");
    if(number) number.textContent = count;
    var label = key === "all" ? "Mixed" : (key === "telugu" ? "Telugu" : "English");
    button.setAttribute("aria-label", label + ", " + count + " search " + (count === 1 ? "result" : "results"));
  });
}
function applySearchParams(){
  var p = parseSearchParams();
  if(!p) return false;
  q.value = p.q;
  if(p.lang) setLangFilter(p.lang);
  if(p.src !== undefined){
    var chosen = String(p.src).split(",");
    sourceVideos.checked = chosen.indexOf("videos") !== -1;
    sourceDigests.checked = chosen.indexOf("digests") !== -1;
    sourceBooks.checked = chosen.indexOf("books") !== -1;
    sourcePhotos.checked = chosen.indexOf("photos") !== -1;
    sourceMusic.checked = chosen.indexOf("music") !== -1;
  }
  runSearch();
  return true;
}

/* RELATED_MAP is loaded from assets/related-map.js (374 curated terms). */
function normalizeRelatedQuery(raw){
  return String(raw || "").trim().toLowerCase().replace(/\s+/g, " ");
}
function relatedTermHasResults(term){
  if((sourceVideos.checked || sourceMusic.checked) && (search(term) || []).length) return true;
  if(sourceDigests.checked && langFilter !== "telugu" && mappedDigestsFor(term).length) return true;
  if(sourceBooks.checked && searchBooks(term).groups.length) return true;
  if(sourcePhotos.checked && searchPhotos(term).length) return true;
  return false;
}
function renderRelatedSearches(raw){
  var terms = RELATED_MAP[normalizeRelatedQuery(raw)] || [];
  var visible = [];
  for(var i = 0; i < terms.length && visible.length < 5; i++){
    if(relatedTermHasResults(terms[i])) visible.push(terms[i]);
  }
  if(!visible.length){
    relatedSearches.innerHTML = "";
    relatedSearches.classList.add("hidden");
    return;
  }
  relatedSearches.innerHTML = '<span class="related-label">Related:</span>' +
    visible.map(function(term){
      return '<button type="button" data-related-term="' + esc(term) + '">' + esc(term) + '</button>';
    }).join("");
  relatedSearches.classList.remove("hidden");
}

function setSourceLoadStatus(labels, isError){
  if(!labels || !labels.length){
    sourceLoadStatus.textContent = "";
    sourceLoadStatus.classList.add("hidden");
    return;
  }
  var names = labels.map(function(label){ return label.charAt(0).toUpperCase() + label.slice(1); });
  sourceLoadStatus.textContent = isError
    ? names.join(" and ") + " couldn’t load."
    : "Loading " + names.join(" and ").toLowerCase() + "…";
  sourceLoadStatus.classList.remove("hidden");
}
function showIndexLoadState(message, isError){
  resultsEl.innerHTML = '<div class="quiz-load-state" role="' + (isError ? 'alert' : 'status') + '" aria-live="polite"><p>' + esc(message) + '</p>' +
    (isError ? '<button type="button" class="quiz-check" data-index-retry>Retry</button>' : '') + '</div>';
  countEl.textContent = isError ? "Search index unavailable" : "Loading selected sources…";
  copySearch.classList.add("hidden");
  langChips.classList.add("hidden");
  fnoteEl.classList.add("hidden");
  referenceEl.innerHTML = "";
  referenceEl.classList.add("hidden");
  relatedSearches.innerHTML = "";
  relatedSearches.classList.add("hidden");
  eventNoteEl.classList.add("hidden");
  emptyEl.classList.add("hidden");
}
function updateClearSearch(){
  clearSearch.classList.toggle("hidden", !q.value.length);
}
function runSearch(){
  updateClearSearch();
  var raw = q.value;
  var hasQuery = !!String(raw || "").trim();
  if(hasQuery){
    var loads = [], labels = [];
    var wantVideos = sourceVideos.checked, wantMusic = sourceMusic.checked,
        wantBooks = sourceBooks.checked, wantPhotos = sourcePhotos.checked;
    if((wantVideos || wantMusic) && !searchIndexPrepared){ loads.push(ensureSearchIndex()); labels.push(wantMusic && !wantVideos ? "music" : "videos"); }
    if(wantBooks && !bookIndexPrepared){ loads.push(ensureBookIndex()); labels.push("books"); }
    if(wantPhotos && !photoIndexPrepared){ loads.push(ensurePhotoIndex()); labels.push("photos"); }
    if(loads.length){
      setSourceLoadStatus(labels, false);
      showIndexLoadState("Loading " + labels.join(" and ") + "…", false);
      Promise.all(loads).then(function(){
        setSourceLoadStatus([], false);
        if(q.value === raw && sourceVideos.checked === wantVideos && sourceMusic.checked === wantMusic && sourceBooks.checked === wantBooks && sourcePhotos.checked === wantPhotos) runSearch();
      }).catch(function(){
        setSourceLoadStatus(labels, true);
        if(q.value === raw) showIndexLoadState("Couldn't load the selected sources — check your connection and try again.", true);
      });
      return;
    }
  }
  setSourceLoadStatus([], false);
  var videoHits = (sourceVideos.checked || sourceMusic.checked) ? search(raw) : (hasQuery ? [] : null);
  if(!hasQuery){
    resultsEl.innerHTML = "";
    countEl.textContent = "";
    copySearch.classList.add("hidden");
    langChips.classList.add("hidden");
    fnoteEl.classList.add("hidden");
    referenceEl.innerHTML = "";
    referenceEl.classList.add("hidden");
    relatedSearches.innerHTML = "";
    relatedSearches.classList.add("hidden");
    eventNoteEl.classList.add("hidden");
    emptyEl.classList.add("hidden");
    document.title = BASE_TITLE;
    writeQuery();
    return;
  }
  var allLanguageVideoHits = videoHits;
  if((sourceVideos.checked || sourceMusic.checked) && langFilter !== "all"){
    var activeLanguage = langFilter;
    langFilter = "all";
    try {
      allLanguageVideoHits = search(raw) || [];
    }
    finally { langFilter = activeLanguage; }
  }
  updateSearchLanguageCounts(allLanguageVideoHits || []);
  var books = searchBooks(raw);
  var photos = searchPhotos(raw);
  var digestItems = sourceDigests.checked ? digestItemsFor(raw) : [];
  writeQuery();
  document.title = "Results for '" + raw.trim() + "' \u00b7 SaiLib";
  var isEventQ = /^\s*event\s*:/i.test(raw);
  eventNoteEl.classList.toggle("hidden", !(isEventQ && (sourceVideos.checked || sourceMusic.checked)));
  var pq = parseQuery(isEventQ ? raw.replace(/^\s*event\s*:\s*/i, "") : raw);
  var tokens = sigTokensOf(pq.rest);
  var phrases = pq.phrases;

  var noteParts = [];
  if(sourceVideos.checked || sourceMusic.checked){
    var fallbacks = tokens.filter(function(t){
      return !hasPresence(t);
    });
    noteParts = fallbacks.map(function(t){ return "&quot;" + esc(t) + "&quot;"; });
    (videoHits.missedPhrases || []).forEach(function(ph){
      noteParts.push("the phrase &quot;" + esc(ph.words.join(" ")) + "&quot;");
    });
  }
  if(noteParts.length && videoHits.length){
    fnoteEl.innerHTML = "No exact video matches for " + noteParts.join(", ") +
      " — showing closest video matches";
    fnoteEl.classList.remove("hidden");
  } else {
    fnoteEl.classList.add("hidden");
  }

  /* Digest cards are also contextual references for video searches.
     They remain attached when Videos is selected even if Digests is not;
     the Digests checkbox controls digest-only, first-party searching. */
  var topicRefs = (langFilter === "telugu")
    ? []
    : ((sourceVideos.checked || sourceDigests.checked) ? mappedDigestsFor(raw) : []);
  if(topicRefs.length){
    referenceEl.innerHTML = '<h2 class="result-source exact">Exact matches</h2>' +
      topicRefs.map(function(topic, index){
        return referenceCardHTML(topic, index, videoHits || [], books.groups, raw);
      }).join("");
    referenceEl.classList.remove("hidden");
  } else {
    referenceEl.innerHTML = "";
    referenceEl.classList.add("hidden");
  }

  renderRelatedSearches(raw);

  var parts = [];
  if(topicRefs.length) parts.push(topicRefs.length + (topicRefs.length === 1 ? " digest" : " digests"));
  if(digestItems.length)
    parts.push(digestItems.length + (digestItems.length === 1 ? " digest article" : " digest articles"));
  if((sourceVideos.checked || sourceMusic.checked) && videoHits.length)
    parts.push(videoHits.length + (videoHits.length === 1 ? " video" : " videos"));
  if(sourceBooks.checked && books.passages)
    parts.push(books.passages + (books.passages === 1 ? " book passage" : " book passages") +
      " in " + books.groups.length + (books.groups.length === 1 ? " book" : " books"));
  if(sourcePhotos.checked && photos.length)
    parts.push(photos.length + (photos.length === 1 ? " photo" : " photos"));

  var rendered = [];
  if(digestItems.length){
    rendered.push('<h2 class="result-source">Digest articles</h2>');
    rendered.push(digestItems.map(digestItemCardHTML).join(""));
  }
  if((sourceVideos.checked || sourceMusic.checked) && videoHits.length){
    rendered.push('<h2 class="result-source">Video results</h2>');
    var shown = videoHits.slice(0, RESULT_LIMIT);
    rendered.push(shown.map(function(hit){ return cardHTML(hit, tokens, phrases); }).join(""));
    if(videoHits.length > RESULT_LIMIT){
      rendered.push('<p class="more">Showing the top ' + RESULT_LIMIT + " of " + videoHits.length +
        " video results — refine your search to narrow it down.</p>");
    }
  }
  if(sourceBooks.checked && books.groups.length){
    if(!topicRefs.length && !((sourceVideos.checked || sourceMusic.checked) && videoHits.length)){
      rendered.push('<p class="books-only-note">No videos found, but here are some references to books</p>');
    }
    rendered.push('<h2 class="book-results-heading">Book results</h2>');
    rendered.push(books.groups.slice(0, 8).map(function(group){
      return bookCardHTML(group, tokens, phrases, raw);
    }).join(""));
    if(books.groups.length > 8){
      var allBooksUrl = SAIBOOKS_URL + "#/q=" + encodeURIComponent(raw.trim());
      rendered.push('<p class="more">Showing 8 of ' + books.groups.length +
        ' matching books — <a class="book-open" href="' + esc(allBooksUrl) +
        '" target="_blank" rel="noopener">see all in SaiBooks</a>.</p>');
    }
  }
  if(sourcePhotos.checked && photos.length){
    rendered.push('<h2 class="photo-results-heading">Photos</h2>');
    rendered.push(photos.slice(0, 12).map(function(hit){
      return photoCardHTML(hit, tokens, phrases);
    }).join(""));
    if(photos.length > 12){
      rendered.push('<p class="more">Showing 12 of ' + photos.length + ' matching photos.</p>');
    }
  }
  resultsEl.innerHTML = rendered.join("");

  var anyResult = topicRefs.length || digestItems.length || ((sourceVideos.checked || sourceMusic.checked) && videoHits.length) ||
    (sourceBooks.checked && books.groups.length) || (sourcePhotos.checked && photos.length);
  if(anyResult){
    countEl.textContent = parts.join(" · ") +
      (langFilter === "all" ? "" : " in " + langLabel(langFilter)) +
      " for \u201c" + raw.trim() + "\u201d";
    copySearch.classList.remove("hidden");
    langChips.classList.remove("hidden");
    emptyEl.classList.add("hidden");
    return;
  }

  countEl.textContent = "";
  copySearch.classList.add("hidden");
  /* Keep the language escape hatch available even when the active language
     has no matches, so readers can switch back without starting over. */
  langChips.classList.remove("hidden");
  if(!sourceVideos.checked && !sourceDigests.checked && !sourceBooks.checked && !sourcePhotos.checked && !sourceMusic.checked){
    emptyText.textContent = "Choose at least one source above to search.";
  } else if(!sourceBooks.checked && !sourcePhotos.checked && !sourceMusic.checked){
    emptyText.textContent = "No video or digest matches for \u201c" + raw.trim() +
      "\u201d. Check Books, Photos, or Music above to search those collections too.";
  } else {
    emptyText.textContent = "No matches found for \u201c" + raw.trim() +
      "\u201d in the selected sources. Try a different word or phrase.";
  }
  emptyEl.classList.remove("hidden");
}

/* ---------- events ---------- */
var deb = null;
function resetHome(){
  clearTimeout(deb);
  q.value = "";
  sourceVideos.checked = true;
  sourceDigests.checked = true;
  sourceBooks.checked = false;
  sourcePhotos.checked = false;
  sourceMusic.checked = false;
  setLangFilter("all");
  setTips(false);
  quizPanel.classList.add("hidden");
  quizBtn.setAttribute("aria-expanded", "false");
  feedbackPanel.classList.add("hidden");
  feedbackBubble.setAttribute("aria-expanded", "false");
  copyStatus.textContent = "";
  runSearch();
  q.focus();
}
homeTitle.addEventListener("click", function(event){
  event.preventDefault();
  resetHome();
});
feedbackBubble.addEventListener("click", function(){
  var willOpen = feedbackPanel.classList.contains("hidden");
  feedbackPanel.classList.toggle("hidden", !willOpen);
  feedbackBubble.setAttribute("aria-expanded", willOpen ? "true" : "false");
});
document.addEventListener("click", function(event){
  if(event.target.closest(".feedback-float")) return;
  feedbackPanel.classList.add("hidden");
  feedbackBubble.setAttribute("aria-expanded", "false");
});
document.addEventListener("keydown", function(event){
  if(event.key !== "Escape") return;
  feedbackPanel.classList.add("hidden");
  feedbackBubble.setAttribute("aria-expanded", "false");
});

/* After an intentional search, dismiss the input (and its mobile keyboard),
   then bring the result count or empty state into view at every viewport size. */
function scrollToResults(){
  if(!countEl.textContent && emptyEl.classList.contains("hidden")) return;
  var target = countEl.textContent ? countEl : emptyEl;
  requestAnimationFrame(function(){
    requestAnimationFrame(function(){
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({behavior: reduce ? "auto" : "smooth", block: "start"});
    });
  });
}
function finishSearch(){
  q.blur();
  scrollToResults();
}
q.addEventListener("input", function(){
  updateClearSearch();
  clearTimeout(deb);
  deb = setTimeout(runSearch, 220);
});
clearSearch.addEventListener("click", function(){
  clearTimeout(deb);
  q.value = "";
  copyStatus.textContent = "";
  runSearch();
  q.focus();
});
form.addEventListener("submit", function(e){
  e.preventDefault();
  clearTimeout(deb);
  runSearch();
  finishSearch();
});
langChips.addEventListener("click", function(e){
  var btn = e.target.closest("button[data-lang]");
  if(!btn) return;
  setLangFilter(btn.getAttribute("data-lang"));
  runSearch();
  if(!quizPanel.classList.contains("hidden")) openQuiz(false);
});
quizLangToggle.addEventListener("click", function(e){
  var btn = e.target.closest("button[data-lang]");
  if(!btn) return;
  setLangFilter(btn.getAttribute("data-lang"));
  runSearch();
  openQuiz(false);
});
sourceFilters.addEventListener("click", function(e){
  var link = e.target.closest("a.source-link");
  if(!link) return;
  var input = link.closest("label").querySelector('input[type="checkbox"]');
  input.checked = !input.checked;
  input.dispatchEvent(new Event("change", { bubbles:true }));
});
sourceFilters.addEventListener("change", function(e){
  if(!e.target.matches('input[type="checkbox"]')) return;
  clearTimeout(deb);
  runSearch();
  if(!q.value.trim() && e.target.checked && e.target === sourceBooks && !bookIndexPrepared){
    setSourceLoadStatus(["books"], false);
    ensureBookIndex().then(function(){ setSourceLoadStatus([], false); }, function(){ setSourceLoadStatus(["books"], true); });
  } else if(!q.value.trim() && e.target.checked && e.target === sourcePhotos && !photoIndexPrepared){
    setSourceLoadStatus(["photos"], false);
    ensurePhotoIndex().then(function(){ setSourceLoadStatus([], false); }, function(){ setSourceLoadStatus(["photos"], true); });
  }
});
function wireTry(container){
  container.addEventListener("click", function(e){
    var btn = e.target.closest("button");
    if(!btn || btn.hasAttribute("data-surprise")) return;
    if(btn.hasAttribute("data-digest-topic")) sourceDigests.checked = true;
    q.value = btn.textContent;
    clearTimeout(deb);
    runSearch();
    finishSearch();
  });
}
wireTry(suggestEl);
wireTry(emptyTry);
wireTry(topicChips);
relatedSearches.addEventListener("click", function(e){
  var button = e.target.closest("button[data-related-term]");
  if(!button) return;
  q.value = button.getAttribute("data-related-term");
  clearTimeout(deb);
  runSearch();
  finishSearch();
});

/* A varied, deliberately curated doorway into the archive. Keep only the
   previous pick in memory so repeat taps always explore a different topic. */
var SURPRISE_TOPICS = [
  "Who is Sai Baba?", "Who is Sri Babuji?", "Saipatham",
  "Jesus", "Ramana Maharshi", "Poondi Swami", "Guruji's analogies",
  "Sai Satcharitra leelas", "udi", "dakshina", "dreams", "miracles",
  "namam", "parayana", "grace", "surrender", "faith", "patience",
  "remembrance", "longing", "meditation", "doubt", "desire and need"
];
var lastSurpriseTopic = "";
surpriseBtn.addEventListener("click", function(){
  /* Surprise is also an exploration entry point, so warm the quiz bank on its
     first use without holding up the search it opens. */
  loadQuizBank().catch(function(){ /* Quiz me will show a retry state if needed. */ });
  var choices = SURPRISE_TOPICS.filter(function(topic){
    return topic !== lastSurpriseTopic;
  });
  var topic = choices[Math.floor(Math.random() * choices.length)];
  lastSurpriseTopic = topic;
  q.value = topic;
  clearTimeout(deb);
  runSearch();
  finishSearch();
});

/* Copy buttons use the clipboard when available and a selection-based
   fallback otherwise. Success is announced in-page; failure is reported
   honestly instead of showing a fake confirmation. */
function legacyCopy(text){
  var area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  var ok = false;
  try { ok = document.execCommand("copy"); } catch(e) { ok = false; }
  document.body.removeChild(area);
  return ok;
}
function copyText(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text).catch(function(){
      if(!legacyCopy(text)) throw new Error("copy failed");
    });
  }
  return legacyCopy(text) ? Promise.resolve() : Promise.reject(new Error("copy failed"));
}
function showCopyResult(button, ok, kind){
  var label = button.querySelector("span");
  var original = button.getAttribute("data-original-label") || label.textContent;
  button.setAttribute("data-original-label", original);
  label.textContent = ok ? "Copied" : "Copy failed";
  copyStatus.textContent = ok
    ? (kind === "search" ? "Search link copied." : "Timestamped video link copied.")
    : "Could not copy automatically. Please try again.";
  setTimeout(function(){ label.textContent = original; }, 1800);
}
copySearch.addEventListener("click", function(){
  clearTimeout(deb);
  runSearch();
  var url = searchShareUrl();
  if(!url) return;
  copyText(url).then(function(){ showCopyResult(copySearch, true, "search"); },
    function(){ showCopyResult(copySearch, false, "search"); });
});
resultsEl.addEventListener("click", function(e){
  var button = e.target.closest("button[data-copy-link]");
  if(!button) return;
  copyText(button.getAttribute("data-copy-link")).then(function(){
    showCopyResult(button, true, "video");
  }, function(){ showCopyResult(button, false, "video"); });
});

/* ---------- five-question quiz ----------
   Curated, grounded bank: 475 questions from books and video captions. Each five-card hand includes all
   three interaction kinds, avoids every question from the previous hand,
   and reveals its learning source with the answer. */
var QUIZ_BANK = window.SAILIB_QUIZ_BANK || null;
var previousQuizIds = [];
function shuffled(items){
  var out = items.slice();
  for(var i = out.length - 1; i > 0; i--){
    var j = Math.floor(Math.random() * (i + 1));
    var t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}
function dealQuiz(){
  var blocked = {};
  previousQuizIds.forEach(function(id){ blocked[id] = 1; });
  var available = QUIZ_BANK.filter(function(item){
    var languageMatches = langFilter === "all" ||
      (langFilter === "telugu" && item.language === "te") ||
      (langFilter === "english" && item.language === "en");
    return !blocked[item.id] && languageMatches;
  });
  var hand = [];
  var kinds = shuffled(["true_false","single_select","multi_select","flashcard","quote_completion","matching"]);
  kinds.forEach(function(kind){
    if(hand.length >= 5) return;
    var choices = shuffled(available.filter(function(item){ return item.kind === kind; }));
    if(!choices.length) return;
    hand.push(choices[0]);
    available = available.filter(function(item){ return item.id !== choices[0].id; });
  });
  if(hand.length < 5) hand = hand.concat(shuffled(available).slice(0, 5 - hand.length));
  hand = shuffled(hand).slice(0, 5);
  previousQuizIds = hand.map(function(item){ return item.id; });
  return hand;
}
function quizKindLabel(kind){
  var labels = {
    true_false:"True or false", single_select:"Single select",
    multi_select:"Choose all that apply", flashcard:"Flashcard",
    quote_completion:"Complete the quote", matching:"Matching"
  };
  return labels[kind] || "Question";
}
function matchingModel(item){
  var labels = [], choices = [], answers = [], i, match;
  function choiceIndex(value){
    var index = choices.indexOf(value);
    if(index === -1){ choices.push(value); index = choices.length - 1; }
    return index;
  }
  if(Array.isArray(item.pairs) && item.pairs.length){
    item.pairs.forEach(function(pair){ labels.push(pair[0]); answers.push(choiceIndex(pair[1])); });
    return {labels:labels, choices:choices, answers:answers};
  }
  if(item.answer && !Array.isArray(item.answer) && typeof item.answer === "object"){
    Object.keys(item.answer).forEach(function(label){
      labels.push(label); answers.push(choiceIndex(item.answer[label]));
    });
    return {labels:labels, choices:choices, answers:answers};
  }
  if(Array.isArray(item.answer) && item.answer.every(function(value){ return typeof value === "number"; })){
    var numbered = [], re = /(?:^|\s)(\d+)\.\s*([\s\S]*?)(?=\s+\d+\.\s|$)/g;
    while((match = re.exec(item.question || ""))) numbered.push(match[2].trim());
    labels = numbered.length === item.answer.length ? numbered : item.answer.map(function(_, index){ return "Item " + (index + 1); });
    choices = (item.options || []).slice();
    answers = item.answer.slice();
    return {labels:labels, choices:choices, answers:answers};
  }
  labels = (item.options || []).slice();
  var answerValues = Array.isArray(item.answer)
    ? item.answer.slice()
    : String(item.answer || "").split(/\s*;\s*/).filter(Boolean);
  if(!labels.length) labels = answerValues.map(function(_, index){ return "Item " + (index + 1); });
  while(answerValues.length < labels.length) answerValues.push(String(item.answer || ""));
  for(i = 0; i < labels.length; i++) answers.push(choiceIndex(answerValues[i]));
  return {labels:labels, choices:choices, answers:answers};
}
function answerText(item){
  if(item.kind === "true_false") return item.answer ? "True" : "False";
  if(item.kind === "single_select") return (item.options || [])[item.answer] || "";
  if(item.kind === "multi_select") return (item.answer || []).map(function(index){ return item.options[index]; }).join("; ");
  if(item.kind === "matching"){
    var model = matchingModel(item);
    return model.labels.map(function(label, index){
      return label + " → " + (model.choices[model.answers[index]] || "");
    }).join("; ");
  }
  return String(item.answer == null ? "" : item.answer);
}
function quizAnswerHTML(item, lead){
  return '<div class="quiz-answer"><strong>' + esc(lead) + '</strong> ' + esc(answerText(item)) +
    '<br><strong>Explanation:</strong> ' + esc(item.explanation || "") +
    '<a class="quiz-source" href="' + esc(item.source_link) +
    '" target="_blank" rel="noopener">Explore the source: ' + esc(item.source_label) + ' &#8250;</a></div>';
}
function renderMatching(item){
  var model = matchingModel(item);
  var order = shuffled(model.choices.map(function(_, index){ return index; }));
  var rows = model.labels.map(function(label, row){
    var opts = '<option value="">Choose a match…</option>' + order.map(function(choiceIndex){
      return '<option value="' + choiceIndex + '">' + esc(model.choices[choiceIndex]) + '</option>';
    }).join('');
    return '<label class="quiz-match-row"><span class="quiz-match-label">' + esc(label) +
      '</span><select class="quiz-match-select" data-match-row="' + row + '">' + opts + '</select></label>';
  }).join('');
  return '<div class="quiz-matching">' + rows +
    '<div><button type="button" class="quiz-check" data-quiz-action="check-matching">Check matches</button></div></div>';
}
function renderQuizCard(item, index){
  var controls = '';
  if(item.kind === "flashcard"){
    controls = '<button type="button" class="quiz-reveal" data-quiz-action="reveal">Reveal answer</button>';
  } else if(item.kind === "quote_completion"){
    controls = '<div class="quiz-input-row"><input class="quiz-input" type="text" autocomplete="off" aria-label="Your completion">' +
      '<button type="button" class="quiz-check" data-quiz-action="check-quote">Check</button>' +
      '<button type="button" class="quiz-reveal" data-quiz-action="reveal">Reveal</button></div>';
  } else if(item.kind === "multi_select"){
    controls = '<div class="quiz-multi">' + (item.options || []).map(function(option, oi){
      return '<label class="quiz-multi-option"><input type="checkbox" data-option="' + oi + '"><span>' + esc(option) + '</span></label>';
    }).join('') + '<div><button type="button" class="quiz-check" data-quiz-action="check-multi">Check answers</button></div></div>';
  } else if(item.kind === "matching"){
    controls = renderMatching(item);
  } else if(item.kind === "true_false"){
    controls = '<div class="quiz-options"><button type="button" class="quiz-option" data-value="true">True</button>' +
      '<button type="button" class="quiz-option" data-value="false">False</button></div>';
  } else {
    controls = '<div class="quiz-options">' + (item.options || []).map(function(option, oi){
      return '<button type="button" class="quiz-option" data-option="' + oi + '">' + esc(option) + '</button>';
    }).join('') + '</div>';
  }
  return '<article class="quiz-card" data-quiz-id="' + esc(item.id) + '" lang="' + (item.language === "te" ? "te" : "en") + '">' +
    '<p class="quiz-kicker">' + (index + 1) + ' of 5 · ' + quizKindLabel(item.kind) + '</p>' +
    '<p class="quiz-question">' + esc(item.question) + '</p>' + controls + '</article>';
}
function loadQuizBank(){
  if(Array.isArray(QUIZ_BANK) && QUIZ_BANK.length >= 100) return Promise.resolve(QUIZ_BANK);
  return loadAssetScript("assets/sailib-quiz-bank.js").then(function(){
    QUIZ_BANK = window.SAILIB_QUIZ_BANK || null;
    if(!Array.isArray(QUIZ_BANK) || QUIZ_BANK.length < 100)
      throw new Error("quiz bank is incomplete");
    return QUIZ_BANK;
  });
}
function showQuizPanel(shouldScroll){
  quizPanel.classList.remove('hidden');
  quizBtn.setAttribute('aria-expanded','true');
  try { document.getElementById('quizTitle').focus({preventScroll:true}); } catch(e) { document.getElementById('quizTitle').focus(); }
  if(shouldScroll !== false){
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    quizPanel.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
  }
}
function renderQuizQuestions(){
  var hand = dealQuiz();
  quizList.innerHTML = hand.map(renderQuizCard).join('');
}
function openQuiz(shouldScroll){
  showQuizPanel(shouldScroll);
  if(QUIZ_BANK){
    renderQuizQuestions();
    return;
  }
  quizList.innerHTML = '<div class="quiz-load-state" role="status" aria-live="polite"><p>Loading questions…</p></div>';
  loadQuizBank().then(function(){
    renderQuizQuestions();
  }).catch(function(){
    quizList.innerHTML = '<div class="quiz-load-state" role="alert"><p>Couldn\'t load questions — check your connection and try again</p><button type="button" class="quiz-check" data-quiz-retry>Retry</button></div>';
  });
}
function appendQuizAnswer(card, item, lead){
  if(card.querySelector('.quiz-answer')) return;
  card.insertAdjacentHTML('beforeend', quizAnswerHTML(item, lead));
}
function sameNumberSet(a, b){
  if(a.length !== b.length) return false;
  var left = a.slice().sort(function(x,y){ return x-y; });
  var right = b.slice().sort(function(x,y){ return x-y; });
  return left.every(function(value, index){ return value === right[index]; });
}
function closeQuiz(){
  quizPanel.classList.add('hidden');
  quizBtn.setAttribute('aria-expanded','false');
  quizBtn.focus();
}
quizBtn.addEventListener('click', function(){ openQuiz(true); });
quizClose.addEventListener('click', closeQuiz);
quizEndClose.addEventListener('click', closeQuiz);
quizNew.addEventListener('click', function(){ openQuiz(true); });
resultsEl.addEventListener("click", function(e){
  if(e.target.closest("[data-index-retry]")) runSearch();
});

quizList.addEventListener('click', function(e){
  var retry = e.target.closest('[data-quiz-retry]');
  if(retry){ openQuiz(false); return; }
  var card = e.target.closest('.quiz-card');
  if(!card || card.querySelector('.quiz-answer')) return;
  var id = card.getAttribute('data-quiz-id');
  var item = QUIZ_BANK.find(function(candidate){ return candidate.id === id; });
  if(!item) return;
  var action = e.target.closest('[data-quiz-action]');
  if(action && action.getAttribute('data-quiz-action') === 'reveal'){
    card.querySelectorAll('button,input,select').forEach(function(control){ control.disabled = true; });
    appendQuizAnswer(card, item, 'Answer:');
    return;
  }
  if(action && action.getAttribute('data-quiz-action') === 'check-quote'){
    var input = card.querySelector('.quiz-input');
    function normalizedAnswer(value){
      return String(value || '').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim();
    }
    var given = normalizedAnswer(input.value);
    var expected = normalizedAnswer(item.answer);
    if(!given){ input.focus(); return; }
    card.querySelectorAll('button,input').forEach(function(control){ control.disabled = true; });
    appendQuizAnswer(card, item, given === expected ? 'Correct.' : 'Not quite.');
    return;
  }
  if(action && action.getAttribute('data-quiz-action') === 'check-multi'){
    var expectedMulti = (item.answer || []).slice();
    var chosenMulti = [];
    card.querySelectorAll('.quiz-multi-option input').forEach(function(input){
      var oi = parseInt(input.getAttribute('data-option'),10);
      if(input.checked) chosenMulti.push(oi);
      input.disabled = true;
      var label = input.closest('.quiz-multi-option');
      if(expectedMulti.indexOf(oi) !== -1) label.classList.add('is-correct');
      else if(input.checked) label.classList.add('is-wrong');
    });
    action.disabled = true;
    appendQuizAnswer(card, item, sameNumberSet(chosenMulti, expectedMulti) ? 'Correct.' : 'Not quite.');
    return;
  }
  if(action && action.getAttribute('data-quiz-action') === 'check-matching'){
    var model = matchingModel(item), chosenMatches = [], complete = true;
    card.querySelectorAll('.quiz-match-select').forEach(function(select, row){
      if(select.value === '') complete = false;
      var chosen = parseInt(select.value,10);
      chosenMatches.push(chosen);
      select.disabled = true;
      select.closest('.quiz-match-row').classList.add(chosen === model.answers[row] ? 'is-correct' : 'is-wrong');
    });
    if(!complete){
      card.querySelectorAll('.quiz-match-select').forEach(function(select){ select.disabled = false; });
      return;
    }
    action.disabled = true;
    appendQuizAnswer(card, item, sameNumberSet(chosenMatches.map(function(v,i){ return v === model.answers[i] ? i : -1; }).filter(function(v){ return v >= 0; }), model.answers.map(function(_,i){ return i; })) ? 'Correct.' : 'Not quite.');
    return;
  }
  var option = e.target.closest('.quiz-option');
  if(!option) return;
  var correct, chosen;
  if(item.kind === 'true_false'){
    chosen = option.getAttribute('data-value') === 'true';
    correct = chosen === item.answer;
    card.querySelectorAll('.quiz-option').forEach(function(btn){
      btn.disabled = true;
      var value = btn.getAttribute('data-value') === 'true';
      if(value === item.answer) btn.classList.add('is-correct');
      else if(btn === option) btn.classList.add('is-wrong');
    });
  } else {
    chosen = parseInt(option.getAttribute('data-option'), 10);
    correct = chosen === item.answer;
    card.querySelectorAll('.quiz-option').forEach(function(btn, oi){
      btn.disabled = true;
      if(oi === item.answer) btn.classList.add('is-correct');
      else if(oi === chosen) btn.classList.add('is-wrong');
    });
  }
  appendQuizAnswer(card, item, correct ? 'Correct.' : 'Not quite.');
});


/* ---------- Today in history ---------- */
(function(){
  var data = window.SAILIB_TODAY_HISTORY || {baba:{},guruji:{}};
  var now = new Date();
  var key = String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  var dateLabel = now.toLocaleDateString("en-US", {month:"short",day:"numeric"});
  var calendars = {
    baba:"https://muse.ai/s/today-in-sai-baba-s-history-x0xe6xmvxqxsqxg6v",
    guruji:"https://muse.ai/s/today-in-sri-babuji-s-history-xvxa6xmvxexi4pcf"
  };
  var names = {baba:"Baba",guruji:"Sri Babuji"};
  var dateEl = document.getElementById("historyTodayDate");
  var detail = document.getElementById("historyDetail");
  var openKind = "";
  dateEl.textContent = dateLabel;
  dateEl.setAttribute("datetime", String(now.getFullYear()) + "-" + key);

  function itemsFor(kind){ return (data[kind] && data[kind][key]) || []; }
  function deepLink(kind){ return calendars[kind] + "#date=" + key; }
  function teaser(kind){
    var items = itemsFor(kind);
    if(!items.length) return "No events recorded for today";
    return (items.length > 1 ? items.length + " events · " : "") + items[0].title;
  }
  document.getElementById("historyBabaTeaser").textContent = teaser("baba");
  document.getElementById("historyGurujiTeaser").textContent = teaser("guruji");

  function setOpenState(kind){
    document.querySelectorAll("[data-history-kind]").forEach(function(button){
      var active = button.getAttribute("data-history-kind") === kind;
      button.setAttribute("aria-expanded", active ? "true" : "false");
      button.closest(".history-bubble").classList.toggle("is-open", active);
    });
  }
  function closeDetail(restoreFocus){
    var previous = openKind;
    openKind = "";
    setOpenState("");
    detail.classList.add("hidden");
    detail.innerHTML = "";
    if(restoreFocus && previous){
      var button = document.querySelector('[data-history-kind="' + previous + '"]');
      if(button) button.focus();
    }
  }
  function renderDetail(kind){
    if(openKind === kind){ closeDetail(false); return; }
    openKind = kind;
    setOpenState(kind);
    var items = itemsFor(kind);
    var html = '<div class="history-detail-head"><h3>' + esc(names[kind]) + ' · ' + esc(dateLabel) + '</h3>' +
      '<button class="history-detail-close" type="button" data-history-close>Collapse</button></div>';
    if(!items.length){
      html += '<p class="history-detail-empty">No events recorded for today.</p>';
    } else {
      items.forEach(function(item){
        html += '<article class="history-event"><span class="history-event-year">' + esc(item.year) + '</span>' +
          '<h4>' + esc(item.title) + '</h4>';
        if(item.summary) html += '<p>' + esc(item.summary) + '</p>';
        else html += '<p>Open the original PDF to read the complete illustrated entry.</p>';
        if(item.links && item.links.length){
          html += '<div class="history-event-links">' + item.links.map(function(link){
            return '<a href="' + esc(link.url) + '" target="_blank" rel="noopener">' + esc(link.label) + ' ↗</a>';
          }).join("") + '</div>';
        }
        html += '</article>';
      });
    }
    html += '<a class="history-detail-calendar" href="' + esc(deepLink(kind)) + '" target="_blank" rel="noopener">Open ' + esc(dateLabel) + ' on the full timeline →</a>';
    detail.innerHTML = html;
    detail.classList.remove("hidden");
  }
  document.querySelectorAll("[data-history-kind]").forEach(function(button){
    button.addEventListener("click", function(){ renderDetail(button.getAttribute("data-history-kind")); });
  });
  detail.addEventListener("click", function(e){
    if(e.target.closest("[data-history-close]")) closeDetail(true);
  });
})();

/* Sai Satcharitra reference lines expand/collapse inline */
resultsEl.addEventListener("click", function(e){
  var btn = e.target.closest(".satchline");
  if(!btn) return;
  var body = btn.nextElementSibling;
  var open = btn.getAttribute("aria-expanded") === "true";
  btn.setAttribute("aria-expanded", open ? "false" : "true");
  if(body) body.hidden = open;
});

/* ---------- search tips panel + event indicator ---------- */
function setTips(open){
  tipsPanel.classList.toggle("hidden", !open);
  tipsBtn.setAttribute("aria-expanded", open ? "true" : "false");
}
/* tap/click only (never hover): the button toggles the panel, and a
   tap anywhere outside it closes it */
tipsBtn.addEventListener("click", function(e){
  e.stopPropagation();
  setTips(tipsPanel.classList.contains("hidden"));
});
tipsPanel.addEventListener("click", function(e){ e.stopPropagation(); });
document.addEventListener("click", function(){ setTips(false); });
document.addEventListener("keydown", function(e){
  if(e.key === "Escape") setTips(false);
});
document.getElementById("tipsExample").addEventListener("click", function(){
  q.value = "event: guru purnima 2025";
  clearTimeout(deb);
  setTips(false);
  runSearch();
  q.focus();
});
/* clearing the indicator drops the event: prefix and re-runs the
   same words as an ordinary search */
document.getElementById("eventClear").addEventListener("click", function(){
  if(/^\s*talk\s+by\s+sai\s*(?:patham|padam)\s*$/i.test(q.value)) q.value = "";
  else q.value = q.value.replace(/^\s*event\s*:\s*/i, "");
  clearTimeout(deb);
  runSearch();
  q.focus();
});
window.addEventListener("popstate", function(){
  if(parseSearchParams()) applySearchParams();
});
var restoredSearch = applySearchParams();
ensureSearchIndex().catch(function(){
  if(!restoredSearch) metaLine.innerHTML = 'Couldn\'t load the video index. <button type="button" class="chip" data-meta-index-retry>Retry</button>';
});
metaLine.addEventListener("click", function(e){
  if(!e.target.closest("[data-meta-index-retry]")) return;
  metaLine.textContent = "Loading video index…";
  ensureSearchIndex().catch(function(){
    metaLine.innerHTML = 'Couldn\'t load the video index. <button type="button" class="chip" data-meta-index-retry>Retry</button>';
  });
});
document.addEventListener("keydown", function(e){
  var tag = (document.activeElement && document.activeElement.tagName) || "";
  if(e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA"){
    e.preventDefault();
    q.focus();
  } else if(e.key === "Escape" && tag === "INPUT"){
    q.blur();
  }
});
try{fetch('https://abacus.jasoncameron.dev/hit/sailib-stats/sailib',{mode:'no-cors',keepalive:true});}catch(e){}
(function(){document.documentElement.setAttribute('data-theme','temple-stone');var e=document.getElementById('weekly-theme-name');if(e)e.textContent='Temple Stone';})();
