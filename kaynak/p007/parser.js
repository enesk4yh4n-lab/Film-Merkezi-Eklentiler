/* Catalog markup is inert; episode/recommendation links never become series cards. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils, BASE = context.site.base;
  function text(n, selector) { n = n && (selector ? n.querySelector(selector) : n); return U.clean(n && n.textContent); }
  function safe(value, page) { var s = U.url(value, page || BASE + '/'); try { var u = new root.URL(s); return u.origin === BASE && !u.username && !u.password ? u.href : ''; } catch (ignore) { return ''; } }
  function seriesUrl(value, page) { var s = safe(value, page), u = s && new root.URL(s); return u && !u.search && /^\/dizi\/[a-z0-9-]+\/$/.test(u.pathname) ? s : ''; }
  function episodeUrl(value, page) { var s = safe(value, page), u = s && new root.URL(s); return u && !u.search && /^\/[a-z0-9-]+-\d+-sezon-\d+-bolum(?:-[a-z0-9-]+)?\/$/.test(u.pathname) ? s : ''; }
  function id(value) { var s = seriesUrl(value), slug = s && new root.URL(s).pathname.split('/')[2]; return slug ? 'p007:series:' + slug : ''; }
  function image(n, page) { var img = n && n.querySelector('img'); return U.url(img && (img.getAttribute('data-src') || img.getAttribute('data-catalog-src')), page || BASE + '/'); }
  function flags(n) { var dub = n && !!n.querySelector('.r-lang-dub'), sub = n && !!n.querySelector('.r-lang-sub'); return dub && sub ? 'Dublaj & Altyazılı' : dub ? 'Türkçe Dublaj' : sub ? 'Türkçe Altyazılı' : ''; }
  function unique(a) { var seen = {}; return a.filter(function (x) { if (!x.contentId || seen[x.contentId]) return false; seen[x.contentId] = true; return true; }); }
  function card(a, page, wrapper) {
    var url = a && seriesUrl(a.getAttribute('href'), page); if (!url) return null;
    var box = wrapper || a, name = text(box, '.r-cap-t') || text(box, '.cat-title a') || text(a).replace(/\s+izle$/i, ''), year = /\b(19\d\d|20\d\d)\b/.exec(text(box, '.r-cap-s') || text(box, '.year') || (/(?:Yapım Yılı|Yapim Yili)\s*:\s*((?:19|20)\d\d)/i.exec(text(box))||[])[1] || '');
    if (!name) return null;
    var rating = /(?:IMDb\s*:?\s*)?(10(?:[.,]0)?|\d(?:[.,]\d)?)/i.exec(text(box, '.r-imdb') || text(box, '.imdbp'));
    return { contentId: id(url), providerId: 'p007', type: 'series', pageUrl: url, title: name, poster: image(box, page), year: year ? Number(year[1]) : 0, imdb: rating ? Number(rating[1].replace(',', '.')) : 0, language: flags(box), sources: [], subtitles: [] };
  }
  function cards(doc, page, search) {
    var out = [];
    if (search) Array.prototype.forEach.call(doc.querySelectorAll('#content .single-item'), function (box) { var c = card(box.querySelector('.cat-title a[href],.cat-img a[href]'), page, box); if (c) out.push(c); });
    else Array.prototype.forEach.call(doc.querySelectorAll('main a.r-card[href],.r-arsiv-izgara a.r-card[href],.homepage a.r-card[href]'), function (a) { var c = card(a, page); if (c) out.push(c); });
    return unique(out);
  }
  function next(doc, page) { var link = doc.querySelector('a.next.page-numbers[href],a.page-numbers[rel="next"]'), result = link && safe(link.getAttribute('href'), page); return result && result !== page ? { kind: 'url', url: result } : null; }
  function list(body, page, search) {
    var d = U.envelope(body).doc, out = cards(d, page, search);
    if (!search && !out.length && !d.querySelector('.r-arsiv,.r-liste,.r-arsiv-bas')) throw new Error('P007: Katalog alanı bulunamadı.');
    if (search && !d.querySelector('#content h1')) throw new Error('P007: Arama yanıtı tanınmadı.');
    return { cards: out, next: next(d, page) };
  }
  function home(body) { var d = U.envelope(body).doc, c = cards(d, BASE + '/'); if (!c.length) throw new Error('P007: Ana sayfa katalog alanı bulunamadı.'); return { hero: c[0], series: c, movies: [], links: { 'new': BASE + '/diziler/', recommended: BASE + '/asya-dizileri/' } }; }
  function episodeNumbers(value) { var m = /-(\d+)-sezon-(\d+)-bolum/.exec(new root.URL(value).pathname); return m ? { season: Number(m[1]), number: Number(m[2]) } : null; }
  function parent(body, page) {
    var e = U.envelope(body), d = e.doc, a = d.querySelector('.r-ep-bolumler a.r-dizi-btn[href]'), url = a && seriesUrl(a.getAttribute('href'), page);
    if (!url) throw new Error('P007: Bölümün gerçek dizi bağlantısı bulunamadı.');
    return { pageUrl: url, selectedEpisodePageUrl: episodeUrl(page), title: text(d, '.r-ep-bas h1') };
  }
  function detail(body, input, metadataOnly) {
    var e = U.envelope(body), d = e.doc, page = seriesUrl(input.pageUrl), schema = e.schema.filter(function (s) { return s['@type'] === 'TVSeries' && seriesUrl(s.url) === page; })[0], title = schema && U.clean(schema.name) || text(d, '.r-dinfo h1').replace(/\s+izle$/i, '');
    if (!page || !title || !d.querySelector('.r-bolum-grid')) throw new Error('P007: Dizi ayrıntısı tanınmadı.');
    var r = { contentId: id(page), providerId: 'p007', type: 'series', pageUrl: page, title: title, poster: schema && U.url(schema.image, page) || image(d.querySelector('.r-dposter'), page), description: U.clean(schema && schema.description), genres: schema && Array.isArray(schema.genre) ? schema.genre.slice(0,32) : [], cast: schema && Array.isArray(schema.actor) ? schema.actor.map(function (a) { return U.clean(a.name); }).filter(Boolean).slice(0,60) : [], sources: [], subtitles: [], seasons: [], episodes: [], next: null };
    var year = /^(19\d\d|20\d\d)/.exec(schema && schema.startDate || ''), score = /(?:IMDb\s*)?(\d(?:[.,]\d)?)/.exec(text(d, '.r-dinfo .r-imdb'));
    r.year = year ? Number(year[1]) : 0; r.imdb = score ? Number(score[1].replace(',', '.')) : 0;
    var imdbLink = d.querySelector('.r-dinfo a[href*="imdb.com/title/tt"]'), imdb = imdbLink && /\/title\/(tt\d+)/.exec(imdbLink.getAttribute('href')); if (imdb) r.imdbId = imdb[1];
    if (metadataOnly) { delete r.episodes; delete r.seasons; return r; }
    Array.prototype.forEach.call(d.querySelectorAll('.r-bolum-grid .r-bolum > a[href]'), function (a) {
      var url = episodeUrl(a.getAttribute('href'), page), n = url && episodeNumbers(url); if (!n || !n.season || !n.number) return;
      r.episodes.push({ contentId: r.contentId + ':s' + n.season + ':e' + n.number, providerId: 'p007', type: 'episode', pageUrl: url, title: title + ' · ' + n.season + '×' + n.number, episodeTitle: text(a,'.r-sr') || title + ' ' + n.season + '. Sezon ' + n.number + '. Bölüm', seriesTitle: title, seriesPageUrl: page, poster: r.poster, episode: { seriesId: r.contentId, season: n.season, number: n.number }, language: flags(a), sources: [], subtitles: [] });
    });
    r.episodes = unique(r.episodes).sort(function (a,b) { return a.episode.season-b.episode.season || a.episode.number-b.episode.number; });
    r.episodes.forEach(function (x) { if (r.seasons.indexOf(x.episode.season)<0) r.seasons.push(x.episode.season); });
    if (!r.episodes.length) throw new Error('P007: Bölüm listesi boş.');
    if (input.selectedEpisodePageUrl) r.selectedEpisodePageUrl = episodeUrl(input.selectedEpisodePageUrl);
    return r;
  }
  root.P007Parser = { base: BASE, safe: safe, id: id, seriesUrl: seriesUrl, episodeUrl: episodeUrl, home: home, list: list, parent: parent, detail: detail, unique: unique };
})(window);
