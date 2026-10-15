#!/usr/bin/env python3
"""Add cross-reference links to Today in History events.

For each event, finds related videos (from SaiLib search index) and book
passages (from SaiBooks index), and adds them as links.
"""
import json, re, pickle
from collections import Counter
from urllib.parse import quote

STOP = {'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from','as','is','was','were','are','be','been','has','had','have','it','its','this','that','these','those','he','she','they','them','his','her','their','him','who','which','what','when','where','how','all','also','after','before','during','into','over','under','between','through','out','up','down','about','against','said','says','one','two','new','day','year','years','time','first','second','will','would','could','should','may','might','must','shall','can','do','does','did','done','being','such','than','then','there','here','very','much','many','more','most','some','any','each','every','both','few','own','same','other','another','while','because','until','unless','though','although','even','just','only','not','no','yes','well','however','therefore','thus','hence','meanwhile','moreover','furthermore','nevertheless','nonetheless','accordingly','consequently','subsequently','previously','finally','eventually','gradually','slowly','quickly','suddenly','immediately','recently','lately','soon','now','today','yesterday','tomorrow','always','never','often','sometimes','usually','rarely','seldom','hardly','scarcely','barely','almost','nearly','quite','rather','fairly','pretty','too','so','like','unlike','among','amid','around','along','across','behind','below','beneath','beside','beyond','inside','outside','within','without','toward','upon','onto','above','below','between','among','through','during','before','after','since','until','by','for','from','of','off','on','at','in','to','with','without','about','against','along','among','around','as','at','before','behind','below','beneath','beside','between','beyond','but','by','concerning','considering','despite','down','during','except','for','from','in','inside','into','like','near','of','off','on','onto','out','outside','over','past','regarding','round','since','through','throughout','to','toward','under','underneath','until','unto','up','upon','with','within','without'}

def extract_terms(text, top_n=12):
    words = re.findall(r'\b[A-Za-z]{3,}\b', text)
    terms = []
    for w in words:
        lw = w.lower()
        if lw in STOP or len(lw) < 4:
            continue
        weight = 2 if w[0].isupper() else 1
        terms.extend([lw] * weight)
    c = Counter(terms)
    return [t for t, _ in c.most_common(top_n)]

def score_text(terms, text):
    score = 0
    for t in terms:
        if t in text:
            score += len(t) * (2 if len(t) > 6 else 1)
    return score

# Load corpora
vcorpus = pickle.load(open('/tmp/vcorpus.pkl','rb'))
vtitles = pickle.load(open('/tmp/vtitles.pkl','rb'))
bcorpus = pickle.load(open('/tmp/bcorpus.pkl','rb'))

# Book titles for labels
bjs = open('assets/sailib-book-index.js').read()
bm = re.search(r'"books"\s*:\s*(\[.*?\])', bjs, re.S)
books = {b['id']: b['title'] for b in json.loads(bm.group(1))}

# Load events
js = open('assets/today-history-data.js').read()
m = re.search(r'=\s*(\{.*\})\s*;?\s*$', js, re.S)
data = json.loads(m.group(1))

added = 0
for kind in ['baba', 'guruji']:
    for date, events in data[kind].items():
        for e in events:
            # Skip if already has cross-refs (more than just PDF)
            existing_labels = [l.get('label','') for l in e.get('links',[])]
            if any('Video' in lbl or 'Satcharitra' in lbl or 'book' in lbl.lower() for lbl in existing_labels):
                continue

            text = e['title'] + " " + e.get('summary','')
            terms = extract_terms(text)
            if not terms:
                continue

            new_links = []

            # Find top video matches
            vscores = []
            for vid, vtext in vcorpus.items():
                s = score_text(terms, vtext)
                if s >= 20:  # threshold
                    vscores.append((s, vid))
            vscores.sort(reverse=True)

            # Add top 2 videos (skip if already in links)
            existing_urls = {l.get('url','') for l in e.get('links',[])}
            for s, vid in vscores[:2]:
                url = f"https://www.youtube.com/watch?v={vid}"
                if url not in existing_urls:
                    title, vdate = vtitles.get(vid, ("Video", ""))
                    label = f"Video: {title[:50]}"
                    new_links.append({"url": url, "label": label})
                    existing_urls.add(url)

            # Find book matches - prioritize Satcharitra, Devotees' Experiences, Rose Petals
            priority_books = ['satcharitra', 'devotees-experiences']
            # Also check rose-petals books
            rp_books = [bid for bid in bcorpus.keys() if bid.startswith('rp-')]
            priority_books.extend(rp_books[:5])

            for bid in priority_books:
                if bid not in bcorpus:
                    continue
                best_score = 0
                best_ref = ""
                for ref, ptext in bcorpus[bid]:
                    s = score_text(terms, ptext)
                    if s > best_score:
                        best_score = s
                        best_ref = ref
                if best_score >= 30:
                    # Link to SaiLib search for the book + term
                    search_q = quote(terms[0] + " " + terms[1] if len(terms) > 1 else terms[0])
                    url = f"https://pathofsai.com/?q={search_q}"
                    if url not in existing_urls:
                        book_title = books.get(bid, bid)[:40]
                        label = f"Book: {book_title}"
                        # Use ref for more specific label if it's a chapter
                        if 'Ch.' in best_ref:
                            ch = re.search(r'Ch\.\s*[\d\s&]+', best_ref)
                            if ch:
                                label = f"Satcharitra {ch.group(0)}" if 'satcharitra' in bid else f"Book: {best_ref[:40]}"
                        new_links.append({"url": url, "label": label})
                        existing_urls.add(url)
                        break  # one book link per event

            # Add general search link if we found anything
            if new_links:
                # Add a general "More on this topic" search link
                search_q = quote(" ".join(terms[:3]))
                general_url = f"https://pathofsai.com/?q={search_q}"
                if general_url not in existing_urls:
                    new_links.append({"url": general_url, "label": "More videos & books on this topic"})

                e.setdefault('links', []).extend(new_links)
                added += 1

print(f"Added cross-refs to {added} events")

# Write back
new_js = js[:m.start(1)] + json.dumps(data, ensure_ascii=False) + js[m.end(1):]
open('assets/today-history-data.js', 'w', encoding='utf-8', errors='surrogatepass').write(new_js)
print("Written.")
