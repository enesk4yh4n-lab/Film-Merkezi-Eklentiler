/* Canonical P005 provider body; helper and context are package-local. */
var D = createP005Data(root), BASE = D.base;
function fold(v) { return String(v || '').replace(/\u0130/g, 'i').toLowerCase().replace(/\u0131/g, 'i').replace(/\u00e7/g, 'c').replace(/\u011f/g, 'g').replace(/\u00f6/g, 'o').replace(/\u015f/g, 's').replace(/\u00fc/g, 'u').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
function names(data, list) { list = data.value(list); return Array.isArray(list) ? list.map(function (v) { return data.text(data.field(v, 'name') || data.field(v, 'title')); }).filter(Boolean) : []; }
function poster(data, item) { var u = data.image(item); return u ? u + '?width=340&height=470&format=webp&quality=85' : ''; }
function seriesCard(data, item) {
  var f = data.field, address = D.page(f(item, 'url')), title = data.text(f(item, 'name')), id = f(item, '_id');
  if (f(item, 'resourceType') !== 'TvSeries' || !/^[a-f0-9]{24}$/i.test(id || '') || !/^https:\/\/www\.startv\.com\.tr\/dizi\/[^/]+$/.test(address) || !title) return null;
  return { contentId: 'p005:series:' + id, providerId: 'p005', type: 'series', title: title, pageUrl: address, poster: poster(data, f(item, 'poster')), description: data.text(f(item, 'plain_summary') || f(item, 'summary')), genres: names(data, f(item, 'genres')), archive: f(item, 'isArchive') === true };
}
function catalog(body) {
  var data = D.parse(body), groups = data.find(function (v) { var items = data.field(v, 'items'); return Array.isArray(items) && items.length && data.field(items[0], 'resourceType') === 'TvSeries'; }, true), best = [], seen = {};
  groups.forEach(function (v) { var a = data.field(v, 'items'); if (a.length > best.length) best = a; });
  var cards = best.map(function (v) { return seriesCard(data, v); }).filter(function (v) { if (!v || seen[v.contentId]) return false; seen[v.contentId] = true; return true; });
  if (!cards.length) throw D.fail('Dizi kataloğu bulunamadı.');
  return cards;
}
function Provider() { this.client = context.createClient(); this.generation = 0; this.pending = 0; this.cards = null; this.loading = null; }
Provider.prototype.cancel = function () { this.generation++; this.client.cancel(); this.loading = null; };
Provider.prototype.isIdle = function () { return this.pending === 0; };
Provider.prototype.request = function (address, deadline, token) {
  var self = this;
  function check() { if (token !== self.generation) { var e = D.fail('İşlem iptal edildi.'); e.cancelled = true; throw e; } if (Date.now() >= deadline) throw D.fail('Katalog süresi doldu.'); }
  check(); if (!D.page(address)) return Promise.reject(D.fail('Geçersiz katalog adresi.'));
  self.pending++;
  return Promise.resolve().then(function () { check(); return self.client.get(address, BASE + '/', {}, { deadline: deadline, timeoutMs: Math.min(30000, Math.max(1, deadline - Date.now())), byteLimit: 2097152 }); }).then(function (r) { self.pending--; check(); return r.body; }, function (e) { self.pending--; check(); throw e; });
};
Provider.prototype.load = function (force) {
  var self = this, token = self.generation;
  if (!force && self.cards) return Promise.resolve(self.cards);
  if (self.loading) return self.loading;
  var job = self.request(BASE + '/dizi', Date.now() + 30000, token).then(function (body) { var cards = catalog(body); if (token !== self.generation) { var e = D.fail('İptal edildi.'); e.cancelled = true; throw e; } self.cards = cards; return cards; });
  self.loading = job; return job.then(function (v) { if (self.loading === job) self.loading = null; return v; }, function (e) { if (self.loading === job) self.loading = null; throw e; });
};
function slice(cards, next) { var offset = next && Number(next.offset) || 0; if (offset < 0 || offset % 1 || offset > cards.length) throw D.fail('Sayfa devam bilgisi geçersiz.'); return { cards: cards.slice(offset, offset + 24), next: offset + 24 < cards.length ? { offset: offset + 24 } : null }; }
Provider.prototype.home = function (force) { return this.load(force).then(function (cards) { return { hero: cards[0] || null, movies: [], series: cards.slice(0, 24), genres: [], links: {} }; }); };
Provider.prototype.list = function (query, next, force) { query = query || {}; if (query.type === 'movie') return Promise.resolve({ cards: [], next: null }); return this.load(force && !next).then(function (cards) { var genre = query.filters && query.filters.genre; if (genre) cards = cards.filter(function (c) { return c.genres.some(function (g) { return fold(g) === fold(genre); }); }); return slice(cards, next); }); };
Provider.prototype.search = function (query, force, next) { if (force && typeof force === 'object' && !next) next = force; var term = fold(query); if (!term) return Promise.resolve({ cards: [], next: null }); if (term.length > 100) return Promise.reject(D.fail('Arama en fazla 100 karakter olabilir.')); return this.load(force && !next).then(function (cards) { return slice(cards.filter(function (c) { var title = fold(c.title); return term.split(' ').every(function (v) { return title.indexOf(v) >= 0; }); }), next); }); };
Provider.prototype.options = function () { return this.load().then(function (cards) { var found = {}, genres = []; cards.forEach(function (c) { c.genres.forEach(function (g) { if (!found[fold(g)]) { found[fold(g)] = true; genres.push({ value: g, label: g }); } }); }); return { genres: genres, order: [{ value: 'site', label: 'Site sırası' }] }; }); };
Provider.prototype.detail = function (card) {
  var self = this, token = self.generation, deadline = Date.now() + 30000, address = D.page(card.pageUrl), match = /^https:\/\/www\.startv\.com\.tr(\/dizi\/[^/]+)(?:\/bolumler\/[^/]+)?$/.exec(address), selected = card.type === 'episode' ? address : null;
  if (!match) return Promise.reject(D.fail('Dizi bağlantısı geçersiz.'));
  var parentUrl = BASE + match[1];
  return self.request(parentUrl, deadline, token).then(function (body) {
    var data = D.parse(body), item = data.selected('TvSeries', parentUrl), result = seriesCard(data, item), parentId = data.field(item, '_id'), seen = {}, page = 0;
    result.genres = names(data, data.field(item, 'genres')); result.cast = names(data, data.field(item, 'cast')); result.description = data.text(data.field(item, 'description') || data.field(item, 'summary')); result.originalTitle = ''; result.episodes = []; result.seasons = []; result.fetchedAt = Date.now(); result.selectedEpisodePageUrl = selected;
    function more() {
      if (page >= 64 || Date.now() >= deadline - 500) { result.episodePagesIncomplete = true; return Promise.resolve(); }
      var offset = page++ * 48, api = BASE + '/api/tv-series/' + parentId + '/episodes?sort=episodeNo%20asc&skip=' + offset + '&limit=48';
      return self.request(api, deadline, token).then(function (body) {
        var j; try { j = JSON.parse(body); } catch (e) { throw D.fail('Bölüm yanıtı okunamadı.'); }
        if (!j || !Array.isArray(j.items) || j.items.length > 48) throw D.fail('Bölüm yanıtı geçersiz.');
        var added = 0;
        j.items.forEach(function (v) {
          var u = D.page(v.url), n = Number(v.episodeNo), season = Number(v.seasonNo);
          if (v.resourceType !== 'Episode' || v.tvSeriesId !== parentId || !/^[a-f0-9]{24}$/i.test(v._id || '') || u.indexOf(parentUrl + '/bolumler/') !== 0 || n < 1 || n % 1 || season < 1 || season % 1 || seen[v._id]) return;
          seen[v._id] = true; added++;
          result.episodes.push({ contentId: 'p005:episode:' + v._id, providerId: 'p005', type: 'episode', pageUrl: u, title: result.title + ' · ' + (v.title || n + '. Bölüm'), poster: poster(data, v.image) || result.poster, seriesTitle: result.title, seriesPageUrl: parentUrl, episode: { seriesId: result.contentId, seriesTitle: result.title, season: season, number: n }, sources: [] });
          if (result.seasons.indexOf(season) < 0) result.seasons.push(season);
        });
        if (j.items.length === 48) { if (!added) { result.episodePagesIncomplete = true; return; } return more(); }
      });
    }
    return more().then(function () { result.seasons.sort(function (a, b) { return a - b; }); result.episodes.sort(function (a, b) { return a.episode.season - b.episode.season || a.episode.number - b.episode.number; }); return result; });
  });
};
Provider.prototype.identity = Provider.prototype.detail;
function Resolver(log, now) { this.delegate = context.createResolver('r005', log, now); }
Resolver.prototype.cancel = function () { this.delegate.cancel(); };
Resolver.prototype.resolve = function (c, d, n, h) { return this.delegate.resolve(c, d, n, h); };
root.SiteRegistry.register({ id: 'p005', name: 'P005', base: BASE, prefix: 'p005:', storagePrefix: 'site.p005.', mark: 'P005', subtitle: 'P005', Provider: Provider, Resolver: Resolver, Parser: { catalog: catalog, data: D }, contentTypes: ['series'], ui: { seriesRail: 'Diziler', defaultOrder: 'site' }, filterFields: function () { return ['genres', 'order']; }, collectionQuery: function () { return { type: 'series', order: 'site' }; } });
