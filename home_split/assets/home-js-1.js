
var SEARCH_INDEX = window.SAILIB_SEARCH_INDEX || null;

var DATA = SEARCH_INDEX || { meta: { video_count: 0, generated_at: "", channel: "Sri Babuji", channel_url: "" }, videos: [] };
/* the index covers two channels: "Sri Babuji" (meta.channel_url above)
   and SaiSEEkers, whose channel link is not in the meta block */
var SAISEEKERS_URL = "https://www.youtube.com/c/Saiseekers";

/* ---------- related reading: Rose Petals / Sarathchandrikalu + books ----------
   RELATED_READING maps a YouTube video ID to up to two related readings:
   a themed Rose Petals (English) / Sarathchandrikalu (Telugu) article or
   one of the published books (GuruPurnima Satsang Booklet, Guru Booklet,
   Sai Bhakti Sadhana Rahasyam, Smriti Sumalu, ...) that covers the same
   subject the video discusses, so a result card can offer a highlighted
   "Related reading" link (green book pill) to its public page.

   Each entry: { kind: "rose-petals" | "book", label, edition, title,
                 en_url, te_url, score }

   GENERATED DATA BLOCK -- reviewed mapping shipped 2026-10-02
   (77 videos, 81 links). To refresh it, re-run the matching and replace
   this whole block; no rendering code changes are needed. Do not
   hand-edit individual entries here. */
var RELATED_READING = {
  "JosGzlg_6tM": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "ZG3y0XnofAg": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "jZ4GrJDKih4": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "lDMFQ7ehbC0": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "lZO1pnY06-0": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "qlCvNUm7USo": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "tArTj3NcBv0": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "6sU8KL-HlLk": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "vOZA7XTXxxc": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "0XrlxWTg7N8": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "uJbwwO4sDNg": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "WjKXgsY_BtI": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "oTUflN_4XO4": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "WhiszFkayoc": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "jAUaR66WP4s": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "xxjdA6tuaeE": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "MRKz86OSU5U": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}, {"kind": "rose-petals", "label": "Rose Petals", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.5, "points": 4}],
  "FVkbIZ6zbtw": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "VxWHJR37wCU": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "1g5t2Q-GBk4": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "ShJgcI5Gt_I": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "5bFITnjh4y8": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "dUoQqvy3Cis": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "1DsFe13e4NQ": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "rbc6hNit2z0": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "May 2015", "title": "Work - A Concrete Sense of Connection", "en_url": "https://saipatham.saibaba.com/rose-petals/may2015web.html", "te_url": "https://newsletter.saibaba.com/may2015/pdfs/sarathchandrikalu_May_2015.zip", "score": 0.625, "points": 5}, {"kind": "rose-petals", "label": "Rose Petals", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "0mMk-adf9OE": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "519J0o1orLY": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "DD14tntCOBw": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "Kgd-h0ka_k4": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "XESfOHJSea0": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "wizPP2QXUSw": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "t5l2_XfOx3Q": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "January 2012", "title": "Arati", "en_url": "https://saipatham.saibaba.com/rose-petals/jan2012.html", "te_url": "https://newsletter.saibaba.com/jan2012/sarathchandrikalu_jan2012.pdf", "score": 0.5, "points": 4}],
  "neCnG6kZAE8": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "gmvUDaawsLY": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "yDjz9F6U4Nc": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "CF9xhxva4zU": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "afeHX8Eyu8o": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "7rB1W5RwchA": [{"kind": "book", "label": "Guru Booklet", "edition": "", "title": "Guru Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/Guru_booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "Ie3-Db3K4-M": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "SZuD9QvU44k": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "YLX6abASNZA": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "ZYHFV4Ll6Qk": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "in3zhk6nKWw": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "zZZhmwS1Z08": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "w7fAi7Oflm4": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "May 2013", "title": "Udi - Symbol of Baba's Grace", "en_url": "https://saipatham.saibaba.com/rose-petals/may2013web.html", "te_url": "https://newsletter.saibaba.com/may2013/pdfs/RP-Telugu-May-2013.pdf.zip", "score": 1.0, "points": 99, "verified": true}],
  "byBYPP6fIHQ": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "0exDTOF7XwQ": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "AW7na6QLG4Q": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.625, "points": 5}],
  "QSFaTQSNOPI": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet", "en_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_English.pdf", "te_url": null, "score": 0.5, "points": 4}],
  "C_y0NBqU9bs": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "December 2012", "title": "Memory and Awareness", "en_url": "https://saipatham.saibaba.com/rose-petals/dec2012web.html", "te_url": "https://newsletter.saibaba.com/dec2012/pdfs/sarathchandrikalu_dec2012.pdf.zip", "score": 0.5, "points": 4}],
  "kZ8X7cT4SXw": [{"kind": "rose-petals", "label": "Rose Petals", "edition": "June 2012", "title": "Light on Anger", "en_url": "https://saipatham.saibaba.com/rose-petals/june2012web.html", "te_url": "https://newsletter.saibaba.com/jun2012/pdfs/sarathchandrikalu_june2012.pdf.zip", "score": 1.0, "points": 99, "verified": true}, {"kind": "rose-petals", "label": "Rose Petals", "edition": "December 2012", "title": "Memory and Awareness", "en_url": "https://saipatham.saibaba.com/rose-petals/dec2012web.html", "te_url": "https://newsletter.saibaba.com/dec2012/pdfs/sarathchandrikalu_dec2012.pdf.zip", "score": 0.5, "points": 4}],
  "ujZUpCOcKIM": [{"kind": "book", "label": "Sai Bhakti Sadhana Rahasyam", "edition": "", "title": "Sai Bhakti Sadhana Rahasyam", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/sbsr.pdf", "score": 1.0, "points": 8}, {"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2012", "title": "Niyama", "en_url": "https://saipatham.saibaba.com/rose-petals/may2012web.html", "te_url": "https://newsletter.saibaba.com/may2012/pdfs/sarathchandrikalu_may2012.pdf.zip", "score": 0.75, "points": 6}],
  "8_9zLHUTKAc": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.5, "points": 4}],
  "ph6vtreUg8g": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.5, "points": 4}],
  "0dWt2I6kBzQ": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.5, "points": 4}],
  "wJb9ejopWj8": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.5, "points": 4}],
  "BZRHz3K5AqE": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "zO3P9Xuzvqw": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.5, "points": 4}],
  "sIC1jxoxJJ4": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.5, "points": 4}],
  "c26SrVjEpHM": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}],
  "2B3N4clsSZ8": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.5, "points": 4}],
  "H5sOfLAp-bY": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.5, "points": 4}],
  "NppOocSE1TA": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "R6DlKIpbgW8": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2015", "title": "Work - A Concrete Sense of Connection", "en_url": "https://saipatham.saibaba.com/rose-petals/may2015web.html", "te_url": "https://newsletter.saibaba.com/may2015/pdfs/sarathchandrikalu_May_2015.zip", "score": 0.5, "points": 4}],
  "NOZkSCv5C40": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}],
  "aJaSFGiyjuU": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}],
  "kOYe3kvuwYg": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.5, "points": 4}],
  "t6Ajoy4S1mY": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}],
  "pzjkv7MFkBE": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}],
  "2CRJgMBNScA": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "December 2012", "title": "Memory and Awareness", "en_url": "https://saipatham.saibaba.com/rose-petals/dec2012web.html", "te_url": "https://newsletter.saibaba.com/dec2012/pdfs/sarathchandrikalu_dec2012.pdf.zip", "score": 0.5, "points": 4}],
  "vF7SL_KEd2c": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "February 2014", "title": "The Familiar Stranger", "en_url": "https://saipatham.saibaba.com/rose-petals/feb2014web.html", "te_url": "https://newsletter.saibaba.com/feb2014/pdfs/sarathchandrikalu_feb_2014.zip", "score": 0.5, "points": 4}],
  "s9jcHQVgAxQ": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "August 2011", "title": "NISHTHA & SABURI", "en_url": "https://saipatham.saibaba.com/rose-petals/aug2011.html", "te_url": "https://newsletter.saibaba.com/aug2011/pdfs/saratchandrikalu_aug2011.pdf", "score": 0.5, "points": 4}],
  "LEHcG-BVM_0": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.5, "points": 4}],
  "pRSM3vD0HUQ": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2015", "title": "Work - A Concrete Sense of Connection", "en_url": "https://saipatham.saibaba.com/rose-petals/may2015web.html", "te_url": "https://newsletter.saibaba.com/may2015/pdfs/sarathchandrikalu_May_2015.zip", "score": 0.5, "points": 4}],
  "-bZrKvE4BFM": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}],
  "1AB_V7lqTAc": [{"kind": "rose-petals", "label": "Sarathchandrikalu", "edition": "May 2011", "title": "MEDITATION", "en_url": "https://saipatham.saibaba.com/rose-petals/may2011.html", "te_url": "https://newsletter.saibaba.com/may2011/pdfs/saratchandrikalu_may2011.pdf", "score": 0.75, "points": 6}],
  "2x-rEQYtoew": [{"kind": "book", "label": "GuruPurnima Satsang Booklet", "edition": "", "title": "GuruPurnima Satsang Booklet (Telugu)", "en_url": null, "te_url": "https://downloads.saibaba.com/publications/pdfs/2020/2020_GuruPurnima_Satsang_Booklet_Telugu.pdf", "score": 0.625, "points": 5}]
};var videos = DATA.videos || [];

/* ---------- on-demand data assets ---------- */
var assetPromises = {};
function loadAssetScript(src){
  if(assetPromises[src]) return assetPromises[src];
  assetPromises[src] = new Promise(function(resolve, reject){
    var script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = function(){ resolve(); };
    script.onerror = function(){
      delete assetPromises[src];
      script.remove();
      reject(new Error("Could not load " + src));
    };
    document.head.appendChild(script);
  });
  return assetPromises[src];
}

/* ---------- book passages: SaiBooks snapshot loaded on demand ---------- */
var BOOK_INDEX = null;
var BOOKS = [], RAW_BOOK_PASSAGES = [];
var BOOK_PAGES = [];
var BOOK_BY_ID = {}, BOOK_EXACT_INDEX = {}, BOOK_PASSAGES = [];
var bookIndexPrepared = false;
function prepareBookIndex(){
  if(bookIndexPrepared) return;
  BOOK_INDEX = window.SAILIB_BOOK_INDEX || BOOK_INDEX;
  BOOK_PAGES = window.BOOK_PAGE_NUMBERS || BOOK_PAGES;
  BOOKS = BOOK_INDEX.books || [];
  RAW_BOOK_PASSAGES = BOOK_INDEX.passages || [];
  BOOK_BY_ID = {};
  BOOK_EXACT_INDEX = {};
  BOOKS.forEach(function(book){ BOOK_BY_ID[book.id] = book; });
  BOOK_PASSAGES = RAW_BOOK_PASSAGES.map(function(row, index){
    var book = BOOK_BY_ID[row.b] || { id: row.b || "", title: "", lang: "en", kind: "", read_url: "" };
    var ref = row.ref || "", text = row.t || "";
    /* Normalise once after load so toggling Books stays responsive even
       across the complete passage snapshot. */
    var titleWords = wordSplit((book.title || "") + " " + ref);
    var textWords = wordSplit(text);
    var seen = {};
    titleWords.concat(textWords).forEach(function(word){
      if(seen[word]) return;
      seen[word] = 1;
      (BOOK_EXACT_INDEX[word] || (BOOK_EXACT_INDEX[word] = [])).push(index);
    });
    var page = Number.isInteger(BOOK_PAGES[index]) && BOOK_PAGES[index] > 0 ? BOOK_PAGES[index] : null;
    return {
      index: index, book: book, ref: ref, text: text, page: page,
      titleWords: titleWords, textWords: textWords,
      titleSearch: " " + titleWords.join(" ") + " ",
      textSearch: " " + textWords.join(" ") + " "
    };
  });
  bookIndexPrepared = true;
}
function ensureBookIndex(){
  if(bookIndexPrepared) return Promise.resolve(BOOK_INDEX);
  return Promise.all([
    loadAssetScript("assets/sailib-book-index.js"),
    loadAssetScript("assets/book-pages.js")
  ]).then(function(){
    BOOK_INDEX = window.SAILIB_BOOK_INDEX || null;
    if(!BOOK_INDEX || !Array.isArray(BOOK_INDEX.books) || !Array.isArray(BOOK_INDEX.passages))
      throw new Error("book index is incomplete");
    prepareBookIndex();
    return BOOK_INDEX;
  });
}

/* ---------- photo titles: Sri Babuji's public Flickr photostream, loaded on demand ---------- */
var PHOTO_INDEX = null;
var PHOTOS = [];
var photoIndexPrepared = false;
function preparePhotoIndex(){
  if(photoIndexPrepared) return;
  PHOTO_INDEX = window.SAILIB_PHOTO_INDEX || null;
  if(!PHOTO_INDEX || !Array.isArray(PHOTO_INDEX.photos)) throw new Error("photo index is incomplete");
  PHOTOS = PHOTO_INDEX.photos.map(function(photo, index){
    return {
      id: String(photo.id || index),
      title: String(photo.title || "Untitled photo"),
      url: String(photo.url || PHOTO_INDEX.source || ""),
      thumb: "assets/photos/" + String(photo.id || index) + ".jpg",
      words: wordSplit(photo.title || "")
    };
  });
  photoIndexPrepared = true;
}
function ensurePhotoIndex(){
  if(photoIndexPrepared) return Promise.resolve(PHOTO_INDEX);
  return loadAssetScript("assets/sailib-photo-index.js").then(function(){
    preparePhotoIndex();
    return PHOTO_INDEX;
  });
}

function searchPhotos(rawQuery){
  if(!sourcePhotos.checked || /^\s*event\s*:/i.test(rawQuery)) return [];
  var pq = parseQuery(rawQuery), tokens = sigTokensOf(pq.rest), phrases = pq.phrases;
  if(!tokens.length && !phrases.length){
    tokens = wordSplit(pq.rest).filter(function(token){ return token.length > 1; });
  }
  if(!tokens.length && !phrases.length) return [];
  var hits = [];
  PHOTOS.forEach(function(photo, index){
    var titleWords = photo.words, padded = " " + titleWords.join(" ") + " ", score = 0, matched = 0;
    phrases.forEach(function(phrase){
      if(padded.indexOf(phrase.str) !== -1){ score += 40; matched++; }
    });
    tokens.forEach(function(token){
      if(titleWords.indexOf(token) !== -1){ score += 12; matched++; }
    });
    var needed = tokens.length + phrases.length;
    if(matched && matched === needed){
      var normalizedQuery = wordSplit(rawQuery).join(" ");
      if(normalizedQuery && padded.indexOf(" " + normalizedQuery + " ") !== -1) score += 60;
      hits.push({ photo: photo, score: score, index: index });
    }
  });
  hits.sort(function(a, b){ return b.score - a.score || a.index - b.index; });
  return hits;
}

function photoCardHTML(hit, tokens, phrases){
  var photo = hit.photo;
  return '<article class="card photo-card">' +
    '<a class="photo-thumb-link" href="' + esc(photo.url) + '" target="_blank" rel="noopener">' +
    '<img class="photo-thumb" src="' + esc(photo.thumb) + '" alt="' + esc(photo.title) + '" loading="lazy"></a>' +
    '<div class="photo-copy"><h3><a class="photo-title" href="' + esc(photo.url) +
    '" target="_blank" rel="noopener">' + highlight(photo.title, tokens, phrases) + '</a></h3>' +
    '<p class="photo-source">Photo from Sri Babuji\'s Flickr photostream</p>' +
    '<a class="photo-open" href="' + esc(photo.url) + '" target="_blank" rel="noopener">View photo on Flickr &#8250;</a></div></article>';
}


/* ---------- Sai Satcharitra story references ----------
   SATCHARITRA_REFS maps a YouTube video ID to the Sai Satcharitra
   stories Guruji narrates in that video, or that are read aloud in
   that satsang. Entry fields:
     n     story name shown on the collapsed line
     ch    SaiBooks chapter label ("20", "16 & 17", "43 & 44", ...)
     sec   where in the video the telling / reading occurs
     kind  "narrate" (Guruji narrates) | "reading" (read aloud)
     sum   2-3 line summary taken from the SaiBooks Satcharitra text
     q     a SaiBooks search that surfaces that chapter's card
   Chapters were verified against the actual SaiBooks Satcharitra
   text (47 chapter-sections). Stories Guruji tells that do NOT
   appear in that text (e.g. Das Ganu's sakshatkara bargain,
   Upasani's leelas) are deliberately absent: no chapter, no link.
   A card shows a reference only when its Watch-at anchor is within
   10 minutes (600s) of sec, at most three references per card. */
var SAIBOOKS_URL = "https://muse.ai/s/saibooks-fh6xj6x0xwxsonv";
var SATCHARITRA_REFS = {
  "pRSM3vD0HUQ": [{ n: "Kaka Saheb Dixit and the saree", ch: "20", sec: 823, kind: "narrate", q: "maidservant",
    sum: "Das Ganu could not grasp the Isavasya Upanishad, so Baba sent him to Kakasaheb Dixit's house at Vile Parle. There he saw a poor maidservant sing with joy over a crimson sari she did not own, dance on receiving one, and stay just as merry the next day in her old rags — and he understood: our joy and sorrow depend on the attitude of the mind, not on what we have." }],
  "xIUnpgziU54": [{ n: "The Bombay merchant who asked for Brahma-Jnana", ch: "16 & 17", sec: 3966, kind: "narrate", q: "Nandu Marwari",
    sum: "A rich Bombay merchant came to Baba asking for quick Brahma-Jnana. Baba kept sending a boy out to borrow five rupees, promising the knowledge the moment He had them; but the man sat still, with a roll of currency notes in his pocket. When he finally offered the money himself, Baba refused it: \"Why do you seek God? Your God is in your pocket.\"" }],
  "s9jcHQVgAxQ": [
    { n: "Mohiddin Tambuli and the wrestling bout", ch: "5", sec: 1117, kind: "narrate", q: "Mohdin",
      sum: "In Shirdi there was a wrestler, Mohdin Tamboli. He and Baba disagreed on some point and fought, and Baba was defeated. From that day Baba changed His way of life — kafni, waist-cloth and head-covering, sackcloth for seat and bed — saying, \"Poverty is better than Kingship; the Lord is always the brother of the poor.\"" },
    { n: "The two lizards", ch: "15", sec: 2831, kind: "narrate", q: "lizards",
      sum: "At the Masjid, Baba asked a devotee to keep his eyes on a lizard on the wall. Soon a traveller from Aurangabad shook the dirt from his gram bag, and a second lizard slipped out and ran up to the first; the two sisters, meeting after long separation, kissed and embraced each other and whirled about with love — just as Baba had foretold." }],
  "UwYOXb9uADI": [{ n: "Chinna Basappa — the snake and the frog", ch: "47", sec: 1980, kind: "narrate", q: "Chenbassappa",
    sum: "Baba Himself tells it: resting by a river, He heard a frog croaking in the jaws of a great black snake. \"Oh Veerbhadrappa,\" He called to the serpent, \"has not your enemy Bassappa repented though he has been born as a frog? Be ashamed, give up your hatred and rest in peace.\" At His word the snake let the frog go — the two were still reaping an old money-quarrel from a past birth." }],
  "tL7VgCl7sUI": [{ n: "Bayajabai's service", ch: "8", sec: 480, kind: "narrate", q: "Bayajabai",
    sum: "Every noon, Bayajabai, Tatya Kote's mother, took a basket of bread and vegetables on her head and roamed miles through the jungle until she found the young Fakir meditating. She spread the food on a leaf before Him and fed Him as if by force, day after day for years. Baba never forgot her service, and blessed her son magnificently." }],
  "7yEUp2QZLAM": [{ n: "Baba's Mahasamadhi", ch: "43 & 44", sec: 60, kind: "narrate", q: "Murlidhar",
    sum: "On Vijayadashami, 15 October 1918, Baba gave Laxmibai nine rupees, asked to be taken to Booty's stone Wada, leaned on Bayaji's body and breathed His last. Then arose the question of the body, which Hindus and Muslims both claimed; it was laid to rest in the Wada's central hall reserved for the idol Murlidhar — and Baba Himself became the Murlidhar there." }],
  "GbTfN3-_OXQ": [
    { n: "Shama's sister-in-law — Udi against the plague", ch: "34", sec: 2340, kind: "reading", q: "sister-in-law",
      sum: "One night word came that Bapaji's wife lay burning with plague, two buboes in her groins. Baba would not let Shama travel at night: \"Send her Udi. Why care for the fever and bubos? God is our father and master; she will be all right.\" When Shama reached the village next morning, the fever and buboes had vanished and she was at the hearth making tea — cured in one night." },
    { n: "Anantrao Patankar and the nine balls", ch: "21", sec: 2460, kind: "reading", q: "Patankar",
      sum: "Anantrao Patankar of Pune, learned in Vedanta yet restless, begged Baba for peace of mind. Baba told him of a trader who tied nine balls of horse-dung into his cloth and carried them away. Sent to Dada Kelkar, he learnt the nine balls stand for the nine-fold bhakti — without devotion, all his learning was worth no more than dung." }],
  "oP84tHdeq5I": [
    { n: "Anantrao Patankar and the nine balls", ch: "21", sec: 2400, kind: "reading", q: "Patankar",
      sum: "Anantrao Patankar of Pune, learned in Vedanta yet restless, begged Baba for peace of mind. Baba told him of a trader who tied nine balls of horse-dung into his cloth and carried them away. Sent to Dada Kelkar, he learnt the nine balls stand for the nine-fold bhakti — without devotion, all his learning was worth no more than dung." },
    { n: "The pleader from Pandharpur", ch: "21", sec: 2760, kind: "reading", q: "Pandharapur",
      sum: "A pleader from Pandharpur came to Shirdi and sat before Baba. Baba turned towards him and spoke of what had passed in the bar room at Pandharpur, a hundred kos away, as if He had been sitting there Himself: \"How cunning the people are!\" The pleader took the rebuke as a favour, and gave up speaking ill of others." }],
  "yzpCFrhYt8g": [{ n: "Bhimaji Patil's cure", ch: "13", sec: 2700, kind: "reading", q: "Bhimaji",
    sum: "Bhimaji Patil of Narayanagaon was worn down by a severe chest disease — tuberculosis — and every remedy had failed. In 1909 he was brought to Shirdi and placed before Baba, crying out for refuge. Baba at first named his past karma, but at his cry His heart melted: \"Stay, cast off your anxiety; your sufferings have come to an end.\" And so it was." }],
  "pzjkv7MFkBE": [{ n: "Bhimaji Patil's cure", ch: "13", sec: 2340, kind: "reading", q: "Bhimaji",
    sum: "Bhimaji Patil of Narayanagaon was worn down by a severe chest disease — tuberculosis — and every remedy had failed. In 1909 he was brought to Shirdi and placed before Baba, crying out for refuge. Baba at first named his past karma, but at his cry His heart melted: \"Stay, cast off your anxiety; your sufferings have come to an end.\" And so it was." }],
  "nqElfZcKwlQ": [{ n: "Das Ganu's Namasaptaha and the Prayag bath", ch: "4", sec: 1800, kind: "reading", q: "Namasaptaha",
    sum: "Baba asked Das Ganu to perform the seven-day Namasaptaha, promising that Vithal would appear at the end — \"but the devotee must be earnest and devout.\" Vithal did appear, to Kakasaheb Dixit. And when Das Ganu longed to bathe at distant Prayag, Baba said, \"It is not necessary to go so long; our Prayag is here\" — and streams of Ganga-Yamuna water flowed from His toes." }],
  "NppOocSE1TA": [{ n: "Kakaji Vaidya and Shama's vow to the Goddess", ch: "30", sec: 2220, kind: "reading", q: "Kakaji",
    sum: "Kakaji Vaidya, priest of the Goddess Sapta-Shringi at Vani, was so beset by troubles that he lost his peace of mind. The Goddess appeared to him in a dream: \"You go to Baba, Shri Sai Samarth of Shirdi, and your mind will become calm.\" Shama, who had come to Vani to fulfil his mother's old vows to the same Goddess, brought him — and no sooner did Kakaji see Baba than his restlessness left him." }],
  "R6DlKIpbgW8": [{ n: "Lakshmichand's dream of Baba", ch: "28", sec: 2160, kind: "reading", q: "Lakhamichand",
    sum: "Lakhamichand, a Bombay clerk, dreamt of an aged saint ringed by devotees, and knew Him for Sai Baba when he saw the same face in Baba's picture at Das Ganu's kirtan. He travelled to Shirdi, and Baba showed that He knew even his unspoken thoughts — his borrowed fare for the journey, and his fear that the cough Baba suffered one night came from devotees' evil eye." }],
  "C1mPjo_MJP8": [{ n: "Dixit's journey to Shirdi", ch: "50", sec: 2400, kind: "reading", q: "Lonavla",
    sum: "Kakasaheb Dixit, a Bombay solicitor lamed by a fall from a London train, was told by Nanasaheb Chandorkar at Lonavla to go to Sai Baba. At Ahmednagar he first bowed to Baba's portrait in a devotee's house — \"He whom I was going to meet was already there to greet me.\" Then he travelled on with Shama to Shirdi, asking Baba to straighten not his leg but his fickle mind." }]
};
/* ---------- event recordings ----------
   EVENT_VIDEO_IDS is the owner-supplied ground-truth list of the
   annual festival and recurring-series recordings (300 YouTube IDs): Guru Purnima,
   Vijayadasami, Aradhana / Festival of Grace, New Year, Marriage
   Anniversary, Dhyana Mandiram anniversaries, Birthday celebrations.
   A video NOT on the list is still flagged as an event recording when
   its title starts with "Saibaba Central School" (case-insensitive),
   or carries an event name together with a 4-digit year >= 2012,
   or with a Day N / Celebrations / Session N / date-prefix shape.
   Titles with years before 2012 are never events (pre-2010 darshan
   glimpses and dated satsangs keep normal scoring). Titles containing
   "Saipatham Doctors" are always excluded because they are doctors'
   health talks, not Sri Babuji talks. In default search a flagged video
   scores ONLY on its timestamped topics (what was actually said); the
   event: operator in search() searches them by title instead. */
var EVENT_VIDEO_IDS = (function(){
  var o = {};
  "-8yjlRGnMpg,-C5rSJgfPoU,-Gu1Xx7ZGjI,-bZrKvE4BFM,-jqX23X3cVo,-x8K4qcMxjA,0Cf_m0J7W8E,0QGgz-uqExM,0XrlxWTg7N8,0dWt2I6kBzQ,0exDTOF7XwQ,0mMk-adf9OE,1AB_V7lqTAc,1AnIykuqkXw,1DsFe13e4NQ,1g5t2Q-GBk4,1oSoJjAGypk,1zIy7x3qS-g,29x4-goCe74,2Am3b2gmpGU,2B3N4clsSZ8,2dL1KnXPGPY,2tsADU5btzc,2x-rEQYtoew,3-9OxTl6aFg,3-S1qSPIXW0,313EAdbAQRs,39Qa0Thud04,3BuO62O3WGs,3IGl08Hr6pM,3eL-OlOw7FU,3wQxPzPaoqI,4AgCelfvcdU,4FKTptg4NtA,4J936pXeGgk,4ytigBtpj98,519J0o1orLY,5_gS8PeS8eQ,5bFITnjh4y8,5xdZo3raQBA,61rTyvNBzGk,6UYAZ7aXf9A,6b9fxsaZ8Xg,6i-PZVw_nbQ,7-R4eKUOPJI,75veHqI8zmM,8HX0FENh0mU,8PeP-ZLCD8A,8SXmRG3K13A,8_9zLHUTKAc,8t6gVCOR-us,8xc5-t_ZaB4,95_XYQLPnBw,9YgdxQRQcoU,AMVa1t-AVw4,AW7na6QLG4Q,AlVfOVCyyT4,Apoy7IP3yBs,BA9heWXkuUI,BIxHl1nqIZ4,BfZg8pzelD8,C-rDfOGlOTs,C1mPjo_MJP8,COGoxJGg4qU,D727_N_5B98,DCmbqbh3Yz0,DD14tntCOBw,Dnu8pW70ElA,EAdC8_AZmDA,EMw3r1Aqicw,EQvESZA0FD0,EkRw4GDa_po,EttxAatMk5M,F1o8DC6NK1I,FVkbIZ6zbtw,G2Hq3bL6nro,GyzlrLVRALQ,H5sOfLAp-bY,HRlg49a2bLc,HSjJryZeMHs,H_u73PyYWd4,HjuOPPGUlOU,IFW8cR94hBQ,IGfHHwTLu9g,II1-o6lorms,ISFv40vb1Zk,Ie3-Db3K4-M,IjSRNc3h0e8,IzMGBYrpteA,JM9yhkhZab8,JdfKen3qP-I,JosGzlg_6tM,K2V9PcwnSm8,KZRHleWPi14,KeeFHr4QgnA,KfLfHu0n1GQ,Kgd-h0ka_k4,L8sZjJkm_8g,LCYveSIUSI4,LNgvUvY-d94,LRIVfaCu060,M0X6yk0L78E,M10R2aEtDko,MdodvZzfJuY,MzNGzy6tDp0,NOZkSCv5C40,NimgJVh6jx4,NppOocSE1TA,O3DivzXwYIQ,OIuGJPwMye8,PrdBE-DUoiw,PwpyppBKtEk,QSFaTQSNOPI,QsCsgtx60GM,QuVYTr4L-VY,R6DlKIpbgW8,R9eKO6ywyrI,RQHfBMqNI_w,RqTijug8lNY,S7f6MhocR4M,SY3NZI2dk6U,SZuD9QvU44k,ShJgcI5Gt_I,SjZBFeORk30,TKyzRtuSDhA,TLhHDchfE6Q,TY3mpW9Hxcw,Tb_edlY3oFE,Ti81NJdvjZs,Tvw88TPYya8,Tx_C3mb4YDc,UXMpV7k52c0,UXYYvQEPBmw,VC6RND-C6Hg,VJ9WNEmvFFg,VWNyLp4e4Ik,VxWHJR37wCU,WHvgtCMXRlk,WhiUEHqSF0k,WhiszFkayoc,WjKXgsY_BtI,Wqw40qlTgl8,WtxR0hoSw0M,WyWinTL56Ys,WztIAUd0SA0,XDtvMwZ4TH8,XESfOHJSea0,XjM5WH3HXJ8,Xld3yZA4xJk,Xqm-qHkcEuw,YBb3R_mjrNk,YLX6abASNZA,YNYQ3efS0D0,YYMczgbQ9aw,YzLM8VkMiK0,ZG3y0XnofAg,ZLnOs-x2UVQ,ZYHFV4Ll6Qk,ZfB5tsbwHUA,ZjrDgBx1HW0,Zp1uolG0YMg,_8sjUncxRPI,_DVtSwxV4Z0,aFl6uAtEI9Y,aJaSFGiyjuU,aY-GSL3vnTs,afCoySc6LXA,b_HVnUjCvbQ,b_g0IqA-ozk,bgnKr3mUmQ8,btzRGqHIzkA,byBYPP6fIHQ,byb2vzpGTdA,c26SrVjEpHM,ckjirZ_fI-0,cpZALidPhJg,cu-1P6WfC8I,d368m3vcY7Q,d7_CEtKUU5I,dHbspF7jt88,dO9dklxbsOk,dUoQqvy3Cis,dYDflrwOW9k,doWvGKTbOVg,dsbgiIe9Pvs,e3iB6cmnv4M,eLwy4NSOb0k,eZaRU6SO8Uw,esDL38D72Uw,fdf59Wg_UpI,fu8YzUW_528,gGuZzEc3tVc,gXcAS9D_XjY,g_V4IMePzSk,gk6taa_QXco,gmvUDaawsLY,hIxpHTaUGTU,h_eMjYOxN4g,heX6L3xmUA8,i-dl5xbZ7ek,iHInbWADgLg,iLEGLy5S9lo,iX2dzRurFmE,iYCk1DpDt3c,ik765CDUZwE,imOPwaGpGdk,imuOic-UeNw,in3zhk6nKWw,j-jC9bJl8y8,j8X6b4lBu8c,jAUaR66WP4s,jZ4GrJDKih4,jgHzXvnSKz0,jpwAznpF_5s,kRodL8CotOk,kXU6ScoZ9RU,kbwfwsm0iuc,ksHMUT2Ifaw,l3dq1KmfWbc,lDMFQ7ehbC0,lRxd3OItInA,lZO1pnY06-0,liwQG2DREto,m9r5iCBMhx8,mEKEZghSxZM,mQXjxefmGVo,mzF5mr2KWv4,n7WHbygZtSI,nM8wbJN7BiA,nOs6ikBmiYU,nY8_-Fi99go,neCnG6kZAE8,nj9ksbYe7ZQ,nunrHVygqMI,nzcv8kjKn3s,o0plXLcXGng,o6sCATRJozI,oTUflN_4XO4,oaMYBKnLYqw,orZeVfcVyu8,osEsPjqw3L0,otLj_aU9rJc,p2oEn57lwts,pAsEzTE8icg,pRSM3vD0HUQ,pygMoMpQLLE,pzjkv7MFkBE,q64fBIituDk,q6_ZWhV-2M0,qFpAjuyQHSQ,qIazXiHiRg8,qRGkw1aNrRg,qa5WihA0XH4,qlCvNUm7USo,ratmpPP6vO8,rbc6hNit2z0,ri90uIIWmY0,s2hC7WFkM0o,s3nhbf93R_E,sMIb0qlG4yE,sb26R_sYeMY,sxxGXk_QMAg,t-pKOEjN60w,t6Ajoy4S1mY,tArTj3NcBv0,tiPejdNYZlY,u5reHXjxYOY,uJbwwO4sDNg,uWxauFpBOPg,vBX-AFINeOE,vF7SL_KEd2c,vJj__gy5HFg,vypAJiWiRL0,wDk1WB-p1BE,wM1MbTUKJ7Q,wR4CTuig-hI,wizPP2QXUSw,x0wi9UMzD2g,x7BhlIQ10vM,xAUY6I-QJA4,xgUvBOCz9_c,xiGBmhPvCiU,xxjdA6tuaeE,y8lsik8o6G0,yDjz9F6U4Nc,yG2KG8yHM-U,yali1lodZgU,yzpCFrhYt8g,z3wde3LTFIM,zXeNdSI7Xio,zZZhmwS1Z08,zsaZ6BEtJDU,7ZpYbVMtUr8,CU24k_RPFvU,ZAaTnbOBA1Y,huBhIbh,YPNHGTvdXiI,GqczOOBEDtE,N3_yC1uo3b4,lnAsh7Te3vI".split(",").forEach(function(id){ o[id] = 1; });
  return o;
})();

var EVENT_NAME_RE = /guru\s*purnima|vijaya\s*das\w*|dasara|dussehra|aradhana|new\s*year|marriage\s*anniversary|festival\s*of\s*grace|dhyana\s*mandiram|birthday/;
function isEventTitle(title){
  var t = String(title || "").toLowerCase();
  /* Silent retreats and Saibaba Central School titles are recurring events
     even without a year, day number, or festival name. */
  if(/^\s*saibaba\s+central\s+school/.test(t) || /silent\s+retreat/.test(t)) return true;
  if(!EVENT_NAME_RE.test(t)) return false;
  var years = t.match(/\b(?:19|20)\d{2}\b/g) || [], hasNew = false, hasOld = false, i;
  for(i = 0; i < years.length; i++){
    if(parseInt(years[i], 10) >= 2012) hasNew = true; else hasOld = true;
  }
  if(hasNew) return true;
  if(hasOld) return false;   /* years before 2012 are never events */
  return /\bday\s*\d+\b/.test(t) || /\bcelebrations?\b/.test(t) ||
         /\bsession\s*\d+\b/.test(t) ||
         /\b\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/.test(t) ||
         /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+\d{1,2}\b/.test(t);
}
var meta = DATA.meta || {};
var searchIndexPrepared = false;
function prepareSearchIndex(){
  if(searchIndexPrepared) return;
  DATA = SEARCH_INDEX || { meta: { video_count: 0, generated_at: "", channel: "Sri Babuji", channel_url: "" }, videos: [] };
  videos = DATA.videos || [];
  meta = DATA.meta || {};
  videos.forEach(function(v){
    v._event = !/saipatham doctors/i.test(String(v.title || "")) &&
      (!!EVENT_VIDEO_IDS[v.id] || isEventTitle(v.title));
  });
  buildCorpus();
  renderIndexMeta();
  searchIndexPrepared = true;
}
function ensureSearchIndex(){
  SEARCH_INDEX = window.SAILIB_SEARCH_INDEX || SEARCH_INDEX;
  if(!SEARCH_INDEX || !SEARCH_INDEX.meta || !Array.isArray(SEARCH_INDEX.videos))
    return Promise.reject(new Error('search index is incomplete'));
  prepareSearchIndex();
  return Promise.resolve(SEARCH_INDEX);
}

/* ---------- helpers ---------- */
function esc(s){
  return String(s == null ? "" : s)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function isPlaceholder(text){
  return /^\[/.test(String(text || "").trim());
}
function fmtDate(d){
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ""));
  if(!m) return "";
  var dt = new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10));
  return dt.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function fmtMetaDate(s){
  var m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/.exec(String(s || ""));
  if(!m) return esc(s);
  var dt = new Date(parseInt(m[1],10), parseInt(m[2],10)-1, parseInt(m[3],10),
                    parseInt(m[4],10), parseInt(m[5],10));
  return dt.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
}
function watchUrl(id, sec){
  var u = "https://www.youtube.com/watch?v=" + encodeURIComponent(id);
  return sec ? u + "&t=" + sec : u;
}

/* ---------- dom ---------- */
var q = document.getElementById("q"),
    clearSearch = document.getElementById("clearSearch"),
    homeTitle = document.getElementById("homeTitle"),
    feedbackBubble = document.getElementById("feedbackBubble"),
    feedbackPanel = document.getElementById("feedbackPanel"),
    form = document.getElementById("searchForm"),
    resultsEl = document.getElementById("results"),
    countEl = document.getElementById("count"),
    emptyEl = document.getElementById("empty"),
    emptyText = document.getElementById("emptyText"),
    langChips = document.getElementById("langChips"),
    suggestEl = document.getElementById("suggest"),
    emptyTry = document.getElementById("emptyTry"),
    metaLine = document.getElementById("metaLine"),
    fnoteEl = document.getElementById("fnote"),
    referenceEl = document.getElementById("referenceCard"),
    topicChips = document.getElementById("topicChips"),
    surpriseBtn = document.getElementById("surpriseBtn"),
    quizBtn = document.getElementById("quizBtn"),
    quizPanel = document.getElementById("quizPanel"),
    quizList = document.getElementById("quizList"),
    quizClose = document.getElementById("quizClose"),
    quizEndClose = document.getElementById("quizEndClose"),
    quizNew = document.getElementById("quizNew"),
    quizLangToggle = document.getElementById("quizLangToggle"),
    tipsBtn = document.getElementById("tipsBtn"),
    tipsPanel = document.getElementById("tipsPanel"),
    eventNoteEl = document.getElementById("eventNote"),
    sourceFilters = document.getElementById("sourceFilters"),
    sourceVideos = document.getElementById("sourceVideos"),
    sourceDigests = document.getElementById("sourceDigests"),
    sourceBooks = document.getElementById("sourceBooks"),
    sourcePhotos = document.getElementById("sourcePhotos"),
    sourceMusic = document.getElementById("sourceMusic"),
    sourceLoadStatus = document.getElementById("sourceLoadStatus"),
    copySearch = document.getElementById("copySearch"),
    copyStatus = document.getElementById("copyStatus"),
    relatedSearches = document.getElementById("relatedSearches");

var langFilter = "all", RESULT_LIMIT = 60;