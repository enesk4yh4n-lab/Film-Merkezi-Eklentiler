(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  var kit = root.CatalogSiteKit;
  var base = context.site.base;
  var archive = base + '/filmler/';
  var groups = [
    ['aksiyon', 'genre:action', 'Aksiyon'],
    ['bilim-kurgu', 'genre:science-fiction', 'Bilim Kurgu'],
    ['komedi', 'genre:comedy', 'Komedi'],
    ['romantik', 'genre:romance', 'Romantik']
  ];
  var parser = kit.createParser({
    id: 'p016', name: 'P016', base: base,
    movie: /^\/(?!filmler\/)[a-z0-9-]+-izle\/?$/,
    cards: '.nf2-film-grid article.nf2-card',
    cardLink: 'a.nf2-poster',
    title: '.nf2-card-title',
    year: '.nf2-card-facts',
    imdb: '.nf2-rating-chip--imdb strong',
    language: '.nf-film-language-badge',
    heading: '.nf3-film-intro h1, .nf3-film-page h1',
    originalTitle: '.nf3-original-title',
    description: '.nf3-synopsis',
    detailImdb: '.nf3-poster-badge--imdb',
    genres: '.nf3-film-intro a[href*="/kategori/"]',
    listPath: '/filmler/', optionsPath: '/filmler/', searchPath: '/?s=',
    pageNumber: function (url) { return Number(kit.param(url.href, 'paged')) || 0; },
    enrich: function (result, env) {
      if (result.year) return;
      (env.schema || []).some(function (data) {
        var year = /^(19\d{2}|20\d{2})/.exec(String(data.dateCreated || ''));
        if (data['@type'] !== 'Movie' || !year) return false;
        result.year = Number(year[1]);
        return true;
      });
    }
  });
  var Catalog = kit.createProvider(parser);
  function Provider(cache) { Catalog.call(this, cache, context.createClient()); }
  Provider.prototype = Object.create(Catalog.prototype);
  Provider.prototype.constructor = Provider;
  Provider.prototype.list = function (query, next, force) {
    query = query || {};
    if (query.type === 'series' || query.section === 'drama-short') return Promise.resolve({ cards: [], next: null });
    if (query.section === 'animation') {
      return Catalog.prototype.list.call(this, { type: 'movie', url: base + '/kategori/animasyon/' }, next, force)
        .then(function (list) {
          list.cards.forEach(function (card) { card.catalogSection = 'animation'; });
          return list;
        });
    }
    return Catalog.prototype.list.call(this, query, next, force);
  };
  Provider.prototype.options = function () {
    var options = [{ id: 'new', label: 'Yeni Eklenenler', types: ['movie'], query: { type: 'movie', url: archive } }];
    groups.forEach(function (g) {
      options.push({id:g[1],label:g[2],types:['movie'],query:{type:'movie',url:base+'/kategori/'+g[0]+'/'}});
    });
    return Promise.resolve({genres:[],years:[],lang:[],imdb:[],quickFilters:options});
  };
  function Resolver(log, now) { this.delegate = context.createResolver('r016', log, now); }
  Resolver.prototype.cancel = function () { this.delegate.cancel(); };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    return this.delegate.resolve(content, deadline, notify, hints);
  };
  root.SiteRegistry.register({
    id:'p016',name:'P016',base:base,prefix:'p016:',storagePrefix:'site.p016.',mark:'P016',subtitle:'P016',
    Provider:Provider, Parser:parser, Resolver:Resolver, contentTypes:['movie'],
    catalogSections:['animation'],supportsQuickFilters:true, textTransport:'native',
    ui:{movieRail:'Filmler',defaultOrder:'site'},filterFields:function(){return [];}
  });
})(window);

