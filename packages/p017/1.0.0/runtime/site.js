(function (root) {
  'use strict';
  var context = root.FilmPlugins.context(), base = context.site.base;
  var U = root.CatalogUtils, I = root.InertPlayerData, kit = root.CatalogSiteKit;
  var watch = /^\/watch\/([a-z0-9-]+)(?:\/s([1-9]\d*)e([1-9]\d*))?$/;

  function link(value, page) {
    var url = I.publicUrl(value, page || base + '/');
    if (!url) return '';
    var u = new root.URL(url);
    return u.origin === base && !u.hash ? u.href : '';
  }
  function text(node, selector) {
    var n = selector ? node.querySelector(selector) : node;
    return U.clean(n && n.textContent);
  }
  function image(n, url) {
    var p = n && (n.getAttribute('data-catalog-src') || n.getAttribute('data-src'));
    return I.publicUrl(p, url) || '';
  }
  function id(type, path) { return 'p017:' + type + ':' + path.replace(/^\/watch\//, ''); }
  function cards(body, page, type) {
    return U.withEnvelope(body, function () {
      var doc = U.envelope(body).doc, scope = doc.querySelector('main'), rows = [], seen = {};
      if (!scope) throw Error('P017: Katalog alanı bulunamadı.');
      Array.prototype.forEach.call(scope.querySelectorAll('.movie-item'), function (node) {
        var a = node.querySelector('.movie-title a[href], a.video-icon[href]'), img = node.querySelector('.movie-thumb img');
        var url = a && link(a.getAttribute('href'), page), u = url && new root.URL(url);
        var m = u && !u.search && watch.exec(u.pathname);
        if (!m || m[2] || seen[url]) return;
        var badge = text(node, '.movie-badge'), poster = image(img, url);
        var kind = badge === 'Film' ? 'movie' : badge === 'Dizi' ? 'series' :
          /\/(?:series)\//i.test(poster) ? 'series' : /\/movies\//i.test(poster) ? 'movie' : type;
        if (!kind || type && type !== kind) return;
        var title = text(a) || U.clean(a.getAttribute('aria-label') || img && img.getAttribute('alt'));
        if (!title) return;
        var year = parseInt(text(node, '.movie-year'), 10);
        var genre = text(node, '.movie-category-text');
        seen[url] = true;
        rows.push({ contentId:id(kind,u.pathname), providerId:'p017', type:kind, pageUrl:url, title:title, rawTitle:title,
          year:year >= 1900 && year <= 2100 ? year : null, poster:poster, genres:genre ? [genre] : [] });
      });
      var n = doc.querySelector('main a[rel=next]'), next = n && link(n.getAttribute('href'), page);
      return { cards:rows, next:next && next !== page ? { url:next, from:page } : null };
    });
  }
  function detail(body, card) {
    return U.withEnvelope(body, function () {
      var e = U.envelope(body), d = e.doc, page = link(card.pageUrl), u = page && new root.URL(page);
      var m = u && watch.exec(u.pathname), meta = d.querySelector('meta[property="og:url"]');
      if (!m || m[2] || !meta || link(meta.content, page) !== page) throw Error('P017: İçerik kimliği sayfayla eşleşmiyor.');
      var schema = e.schema.filter(function (item) { return /^(Movie|TVSeries)$/.test(item['@type']) && link(item.url,page) === page; })[0];
      if (!schema) throw Error('P017: İçerik türü bulunamadı.');
      var type = schema['@type'] === 'Movie' ? 'movie' : 'series', title = U.clean(schema.name);
      var year = /\b(19\d{2}|20\d{2})/.exec(String(schema.datePublished || ''));
      var key = id(type,u.pathname), episodes = [], seasons = [], seen = {};
      var poster = image(d.querySelector('.av-show__body img'), page) || I.publicUrl(typeof schema.image === 'string' ? schema.image : schema.image && schema.image[0],page) || card.poster || '';
      if (type === 'series') {
        Array.prototype.forEach.call(d.querySelectorAll('[data-season-panel] a.av-episode[href]'), function (a) {
          var url = link(a.getAttribute('href'),page), path = url && new root.URL(url), ep = path && watch.exec(path.pathname);
          if (!ep || path.search || ep[1] !== m[1] || !ep[2] || seen[url]) return;
          var season = Number(ep[2]), number = Number(ep[3]);
          if (season !== Number(a.parentNode.getAttribute('data-season-panel'))) return;
          seen[url] = true;
          if (seasons.indexOf(season) < 0) seasons.push(season);
          episodes.push({contentId:id('episode',path.pathname),type:'episode',providerId:'p017',
            title:title + ' · ' + season + '. Sezon ' + number + '. Bölüm', episodeTitle:text(a,'.av-episode__label'),
            pageUrl:url,seriesPageUrl:page,poster:image(a.querySelector('img'),page)||poster,
            episode:{season:season,number:number,seriesId:key,seriesTitle:title},sources:[],subtitles:[]});
        });
        episodes.sort(function (a,b) { return a.episode.season-b.episode.season || a.episode.number-b.episode.number; });
        seasons.sort(function (a,b) { return a-b; });
      }
      return {contentId:key,type:type,providerId:'p017',pageUrl:page,title:title,rawTitle:title,poster:poster,
        year:year?Number(year[1]):card.year||null, description:U.clean(schema.description),
        genres:Array.isArray(schema.genre)?schema.genre:schema.genre?[schema.genre]:[],
        episodes:episodes,seasons:seasons,sources:[],subtitles:[]};
    });
  }

  function Provider(cache) { root.CatalogClient.call(this,cache,context.createClient(),{base:base}); }
  Provider.prototype = Object.create(root.CatalogClient.prototype);
  Provider.prototype.constructor = Provider;
  Provider.prototype.fetch = function (url, parse, force, name) {
    url = link(url);
    return url ? this.request(url,null,parse,force,'p017-'+name) : Promise.reject(Error('P017: Site dışı adres.'));
  };
  Provider.prototype.home = function (force) {
    return this.fetch(base+'/',function (body) {
      var rows = cards(body,base+'/',null).cards;
      return {hero:rows[0]||null,movies:rows.filter(function (v) {return v.type==='movie';}),series:rows.filter(function (v) {return v.type==='series';})};
    },force,'home');
  };
  Provider.prototype.list = function (query,next,force) {
    query = query || {};
    if (query.section) return Promise.resolve({cards:[],next:null});
    var type = query.type === 'series' ? 'series' : 'movie', path = type === 'series' ? '/dizi' : '/film';
    var url = next && link(next.url) || base + path;
    if (new root.URL(url).pathname !== path) return Promise.reject(Error('P017: Geçersiz sayfalama adresi.'));
    return this.fetch(url,function (body) {return cards(body,url,type);},force,'list');
  };
  Provider.prototype.search = function (query,force,next) {
    query = U.clean(query);
    if (!query) return Promise.resolve({cards:[],next:null});
    if (query.length > 100) return Promise.reject(Error('P017: Arama çok uzun.'));
    var url = next && link(next.url) || base + '/ara?search='+encodeURIComponent(query);
    if (new root.URL(url).pathname !== '/ara' || kit.param(url,'search') !== query) return Promise.reject(Error('P017: Geçersiz arama adresi.'));
    return this.fetch(url,function (body) {return cards(body,url,null);},force,'search');
  };
  Provider.prototype.detail = function (card,force) {
    var url=link(card.pageUrl), m=url&&watch.exec(new root.URL(url).pathname);
    if (!m) return Promise.reject(Error('P017: İçerik adresi geçersiz.'));
    var selected=m[2]?url:'', target=selected?base+'/watch/'+m[1]:url;
    return this.fetch(target,function (body) {
      var out=detail(body,{pageUrl:target,poster:card.poster,year:card.year});
      if (selected && out.episodes.some(function (ep) {return ep.pageUrl===selected;})) out.selectedEpisodePageUrl=selected;
      return out;
    },force,'detail');
  };
  Provider.prototype.options = function () { return Promise.resolve({genres:[],years:[],lang:[],imdb:[]}); };

  function Resolver(log,now) { this.delegate=context.createResolver('r017',log,now); }
  Resolver.prototype.cancel=function () {this.delegate.cancel();};
  Resolver.prototype.resolve=function (content,deadline,notify,hints) {return this.delegate.resolve(content,deadline,notify,hints);};
  root.SiteRegistry.register({id:'p017',name:'P017',base:base,prefix:'p017:',storagePrefix:'site.p017.',
    mark:'P017',subtitle:'P017',Provider:Provider,Resolver:Resolver,contentTypes:['movie','series'],
    textTransport:'native',ui:{movieRail:'Filmler',seriesRail:'Diziler',defaultOrder:'site'},
    filterFields:function () {return [];}});
})(window);

