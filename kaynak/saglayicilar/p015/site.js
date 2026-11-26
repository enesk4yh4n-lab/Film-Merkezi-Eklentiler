(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  var kit = root.CatalogSiteKit;
  var base = context.site.base;
  var parser = kit.createParser({
    id: 'p015',
    name: 'P015',
    base: base,
    movie: /^\/film\/[a-z0-9-]+\.html$/,
    cards: '.listmovie .movie-box',
    title: '.film-ismi',
    year: '.film-yil',
    imdb: '.imdb',
    language: '.film-dil',
    description: '#film-aciklama',
    detailYear: '#filmbilgileri a[href*="/yil/"]',
    detailImdb: '#listelements .elements:nth-child(2)',
    genres: '#listelements a[href*="/kategori/"]',
    listPath: '/',
    optionsPath: '/',
    filterPath: '/film',
    fields: { genres: 'tur', years: 'yil', lang: 'dil', imdb: 'imdb' },
    filterExtra: { filtrele: 'date', sirala: 'DESC' },
    searchPath: '/?s=',
    enrich: function (result, envelope) {
      result.poster = result.poster || kit.image(envelope.doc.querySelector('.film-afis'), result.pageUrl);
      result.language = kit.language(kit.text(envelope.doc, '.filmplus_sources .languages'));
    }
  });

  var Catalog = kit.createProvider(parser);
  function Provider(cache) {
    Catalog.call(this, cache, context.createClient());
  }
  Provider.prototype = Object.create(Catalog.prototype);
  Provider.prototype.constructor = Provider;
  Provider.prototype.list = function (query, next, force) {
    if (query && (query.type === 'series' || query.section === 'drama-short')) {
      return Promise.resolve({ cards: [], next: null });
    }
    if (query && query.section === 'animation') {
      return Catalog.prototype.list.call(this, { type: 'movie', url: base + '/kategori/animasyon' }, next, force)
        .then(function (list) {
          list.cards.forEach(function (card) { card.catalogSection = 'animation'; });
          return list;
        });
    }
    return Catalog.prototype.list.call(this, query, next, force);
  };
  Provider.prototype.options = function () {
    return Catalog.prototype.options.call(this).then(function (options) {
      var quick = {
        Aksiyon: ['genre:action', 'Aksiyon'],
        'Bilim Kurgu': ['genre:science-fiction', 'Bilim Kurgu'],
        Komedi: ['genre:comedy', 'Komedi'],
        Romantik: ['genre:romance', 'Romantik']
      };
      options.quickFilters = [
        { id: 'new', label: 'Yeni Eklenenler', types: ['movie'], query: { type: 'movie', url: base + '/' } },
        { id: 'most-viewed', label: 'En Çok İzlenenler', types: ['movie'], query: { type: 'movie', url: base + '/en-cok-izlenen-filmler-listesi-izle' } }
      ];
      (options.genres || []).forEach(function (genre) {
        var row = quick[genre.value];
        if (row) options.quickFilters.push({ id: row[0], label: row[1], types: ['movie'], query: { filters: { genre: genre.value } } });
      });
      return options;
    });
  };

  function Resolver(log, now) { this.delegate = context.createResolver('r015', log, now); }
  Resolver.prototype.cancel = function () { this.delegate.cancel(); };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    return this.delegate.resolve(content, deadline, notify, hints);
  };

  root.SiteRegistry.register({
    id: 'p015', name: 'P015', base: base, prefix: 'p015:', storagePrefix: 'site.p015.',
    mark: 'P015', subtitle: 'P015', Provider: Provider, Parser: parser, Resolver: Resolver,
    contentTypes: ['movie'], catalogSections: ['animation'], supportsQuickFilters: true,
    textTransport: 'native', ui: { movieRail: 'Filmler', defaultOrder: 'site' },
    filterFields: function () { return ['genres', 'years', 'lang', 'imdb']; }
  });
})(window);

