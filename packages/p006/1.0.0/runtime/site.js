/* P006: package-local ES5 catalog adapter. */
(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,PlayerCore:shared.PlayerCore,InertPlayerData:shared.InertPlayerData,CatalogClient:shared.CatalogClient,ContentIdentity:shared.ContentIdentity,ChainNetwork:{createClient:function(o){return context.createClient(o);}}};
/* DDizi catalog data only. Remote markup is never inserted into the application. */
(function(root){
 'use strict';var U=root.CatalogUtils,BASE=context.site.base;
 function text(node,selector){var n=node&&(selector?node.querySelector(selector):node);return U.clean(n&&n.textContent);}
 function safe(value,page){var url=U.url(value,page||BASE+'/');try{var u=new root.URL(url);return u.origin===BASE&&!u.username&&!u.password?url:'';}catch(ignore){return '';}}
 function seriesUrl(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/diziler\/\d+\/[a-z0-9.-]+(?:\/sayfa-\d+)?$/.test(p.pathname)?u:'';}
 function episodeUrl(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/izle\/\d+\/[a-z0-9.-]+\.htm(?:\/[1-9]\d*)?$/.test(p.pathname)?u:'';}
 function canonical(value){return value.replace(/\/sayfa-\d+$/,'').replace(/(\.htm)\/\d+$/,'$1');}
 function id(value){var m=/\/(diziler|izle)\/(\d+)\//.exec(value);return m?'p006:'+(m[1]==='diziler'?'series:':'entry:')+m[2]:'';}
 function img(node,page){var n=node&&node.querySelector('img');return U.url(n&&(n.getAttribute('data-src')||n.getAttribute('data-catalog-src')),page||BASE+'/');}
 function unique(values,key){var seen={};return values.filter(function(v){var k=v[key||'contentId'];if(!k||seen[k])return false;seen[k]=true;return true;});}
 function card(a,page){var u=safe(a.getAttribute('href'),page),title=text(a).replace(/\s+izle$/i,'');if(!seriesUrl(u)&&!episodeUrl(u)||!title)return null;return {contentId:id(u),providerId:'p006',type:'series',pageUrl:canonical(u),title:title,poster:img(a,page),language:''};}
 var knownSeries = [];
 function nameKey(value) { return U.clean(value).replace(/İ/g,'i').toLowerCase().replace(/ı/g,'i').replace(/[^a-z0-9çğıöşü]+/g,' ').replace(/^\s+|\s+$/g,''); }
 function cards(doc,page){var out=[],nav=navCards(doc);nav.forEach(function(c){if(!knownSeries.some(function(n){return n.contentId===c.contentId;}))knownSeries.push(c);});if(knownSeries.length>512)knownSeries=knownSeries.slice(-512);
  Array.prototype.forEach.call(doc.querySelectorAll('.content_ .dizi-boxpost > a,.content_ .dizi-boxpost-cat > a,#ortaicerik .dizi-boxpost > a'),function(a){var c=card(a,page);if(!c)return;if(episodeUrl(c.pageUrl)){var title=c.title.replace(/\s+(?:\d+\s*\.\s*Sezon\s*)?\d+\s*\.\s*Bölüm[\s\S]*$/i,'').replace(/\s+son bölüm$/i,''),matches=knownSeries.filter(function(n){return nameKey(n.title)===nameKey(title);});if(matches.length===1){var parent=root.PlayerCore.copy(matches[0]);parent.poster=c.poster||parent.poster;parent.selectedEpisodePageUrl=c.pageUrl;parent.latestEpisodeTitle=c.title;c=parent;}}
   out.push(c);});return unique(out);}
 function navCards(doc){var out=[];Array.prototype.forEach.call(doc.querySelectorAll('a[href*="/diziler/"]'),function(a){var c=card(a,BASE+'/');if(c)out.push(c);});return unique(out);}
 function home(body){var d=U.envelope(body).doc,latest=cards(d,BASE+'/'),nav=navCards(d);if(!latest.length&&!nav.length)throw new Error('DDizi katalog biçimi tanınamadı.');return {hero:latest[0]||nav[0],movies:[],series:latest,links:{new:BASE+'/',recommended:BASE+'/yabanci-dizi-izle',liked:BASE+'/eski.diziler'},index:nav};}
 function nextPage(doc,page){
  var u=new root.URL(page),current=/\/sayfa-(\d+)$/.exec(u.pathname),isSeries=!!seriesUrl(page),rootPath=isSeries?canonical(page):u.pathname.replace(/\/\d+$/,''),n=current?Number(current[1]):/\/\d+$/.test(u.pathname)?Number(u.pathname.split('/').pop())-1:0,next=null,best=Infinity;
  Array.prototype.forEach.call(doc.querySelectorAll('.pagination a[href]'),function(a){var link=safe(a.getAttribute('href'),page),m=link&&(isSeries?/\/sayfa-(\d+)$/.exec(link):/\/(\d+)$/.exec(link));if(!m)return;var number=Number(m[1])-(isSeries?0:1),path=isSeries?canonical(link):new root.URL(link).pathname.replace(/\/\d+$/,'');if(path===rootPath&&number>n&&number<best){best=number;next={kind:'url',url:link};}});return next;
 }
 function list(body,page,cursor){if(root.SiteAddresses)page=root.SiteAddresses.resolve(page);var d=U.envelope(body).doc,out={cards:cards(d,page),next:nextPage(d,page)};
  if(page===BASE+'/'||page.indexOf(BASE+'/')===0&&/^\/l\.php\?sayfa=\d+$/.test(page.slice(BASE.length))){
   var max=cursor&&cursor.max||0;Array.prototype.forEach.call(d.querySelectorAll('#listele a[rel]'),function(a){var n=Number(a.getAttribute('rel'));if(n>max&&n<=1000)max=n;});var m=/[?&]sayfa=(\d+)/.exec(page),number=m?Number(m[1]):1;out.next=out.cards.length&&number<max?{kind:'ddizi-recent',url:BASE+'/l.php?sayfa='+(number+1),max:max}:null;
  }return out;
 }
 function search(body){var d=U.envelope(body).doc,heading=text(d,'.content_ .breadcrumbX');if(!/arama/i.test(heading))throw new Error('DDizi arama yanıtı okunamadı.');return {cards:cards(d,BASE+'/arama/'),next:nextPage(d,BASE+'/arama/')};}
 function meta(body,page){var env=U.envelope(body),d=env.doc,schema=env.schema.filter(function(s){return s['@type']==='TVEpisode';})[0],a=d.querySelector('.breadcrumbX a[href*="/diziler/"]'),series=a&&seriesUrl(a.getAttribute('href')),h=d.querySelector('.dizi_content h1');if(!h||!series)throw new Error('DDizi bölüm biçimi tanınamadı.');var language='',dub=false,sub=false;Array.prototype.forEach.call(d.querySelectorAll('.parts a'),function(n){var f=U.languageBadges(text(n));dub=dub||f.dubbed;sub=sub||f.subtitled;});language=dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':sub?'Türkçe Altyazılı':'';
  return {title:text(a),seriesPageUrl:canonical(series),episodePageUrl:canonical(page),episodeTitle:text(h).replace(/\s+izle$/i,''),poster:U.url(schema&&schema.image,BASE+'/'),description:U.clean(schema&&schema.description),language:language};
 }
 function episodeLinks(doc,detail){var out=[];Array.prototype.forEach.call(doc.querySelectorAll('.content_ .dizi-boxpost-cat > a'),function(a){var page=episodeUrl(a.getAttribute('href')),title=text(a),m=/(?:([1-9]\d*)\s*\.\s*Sezon\s*)?([1-9]\d*)\s*\.\s*Bölüm/i.exec(title);if(!page||!m)return;var s=Number(m[1])||1,n=Number(m[2]);out.push({contentId:detail.contentId+':s'+s+':e'+n,providerId:'p006',type:'episode',pageUrl:canonical(page),title:detail.title+' · '+s+'×'+n,episodeTitle:title,poster:detail.poster||img(a),seriesTitle:detail.title,seriesPageUrl:detail.pageUrl,episode:{seriesId:detail.contentId,season:s,number:n},sources:[],subtitles:[]});});return unique(out);}
 function detail(body,card){var d=U.envelope(body).doc,crumb=d.querySelector('.content_ .breadcrumbX li:last-child'),title=text(crumb).replace(/\s+son bölüm izle$/i,''),r=root.PlayerCore.copy(card);if(!seriesUrl(card.pageUrl)||!title||!d.querySelector('.content_ .dizi-boxpost-cat'))throw new Error('DDizi dizi biçimi tanınamadı.');r.type='series';r.pageUrl=canonical(card.pageUrl);r.contentId=id(r.pageUrl);r.title=title;r.description='';r.poster=img(d.querySelector('.content_ .dizi-boxpost-cat'))||card.poster||'';r.genres=[];r.cast=[];r.sources=[];r.subtitles=[];r.seasons=[];r.episodes=episodeLinks(d,r);r.next=nextPage(d,card.pageUrl);return r;}
 function episodes(body,detail,page){var d=U.envelope(body).doc;return {episodes:episodeLinks(d,detail),next:nextPage(d,page)};}
 function firstAirYear(body,page,parent){var env=U.envelope(body,true),m=null;env.schema.forEach(function(s){if(s['@type']!=='TVEpisode'||canonical(U.url(s.url,page))!==canonical(page)||!(Number(s.episodeNumber)===1||/(?:^|\s)1\.?\s*B[öo]l[üu]m(?:\s|$)/i.test(U.clean(s.episodeNumber))))return;var found=/(?:^|\s)\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)\s+((?:19|20)\d{2})\s+tarihli\b/i.exec(U.clean(s.description));if(found)m=Number(found[1]);});if(!m||meta(body,page).seriesPageUrl!==parent)return null;return m;}
 function oldestPage(body,page){var d=U.envelope(body).doc,last='',number=-1;Array.prototype.forEach.call(d.querySelectorAll('.pagination a[href]'),function(a){var link=safe(a.getAttribute('href'),page),m=link&&/\/sayfa-(\d+)$/.exec(link);if(m&&canonical(link)===canonical(page)&&Number(m[1])>number){number=Number(m[1]);last=link;}});return last&&last!==page?last:'';}
 root.DdiziParser={base:BASE,safe:safe,seriesUrl:seriesUrl,episodeUrl:episodeUrl,canonical:canonical,id:id,unique:unique,home:home,list:list,search:search,detail:detail,meta:meta,episodes:episodes,firstAirYear:firstAirYear,oldestPage:oldestPage};
})(window);

(function (root) {
  'use strict';
  var P = root.DdiziParser,
    BASE = P.base;
  function Provider(cache, network) {
    root.CatalogClient.call(
      this,
      cache,
      network || root.ChainNetwork.createClient({ destination: 'downloads' }),
      {
        base: BASE,
        headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
        postHeaders: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
      }
    );
    this.links = {};
  }
  Provider.prototype = Object.create(root.CatalogClient.prototype);
  Provider.prototype.constructor = Provider;
  Provider.prototype.fetch = function (url, parse, force, scope, body) {
    if (!P.safe(url)) return Promise.reject(new Error('DDizi dışı katalog bağlantısı reddedildi.'));
    var self = this,
      token = this.generation;
    return this.request(url, body || null, parse, force, 'ddizi0100-' + scope).catch(function (e) {
      if (
        body ||
        token !== self.generation ||
        /403|429|ptal|engeli|Dogrulama/.test(e.message) ||
        !/Native|XHR|HTTP 5\d\d|zaman|TLS/.test(e.message) ||
        (self.deadline && self.deadline - Date.now() < 11000)
      )
        throw e;
      return self.request(url, null, parse, true, 'ddizi0100-' + scope);
    });
  };
  Provider.prototype.prepareCards = function (cards) {
    var self = this, token = self.generation;
    return Promise.all(cards.map(function (card) {
      if (!P.episodeUrl(card.pageUrl)) return Promise.resolve(card);
      return self.fetch(card.pageUrl,function(body){return P.meta(body,card.pageUrl);},false,'catalog-parent').then(function(meta){
        if(token!==self.generation)throw new Error('İptal edildi');
        return {contentId:P.id(meta.seriesPageUrl),providerId:'p006',type:'series',pageUrl:meta.seriesPageUrl,title:meta.title,poster:meta.poster||card.poster,selectedEpisodePageUrl:meta.episodePageUrl,latestEpisodeTitle:card.title,language:meta.language};
      });
    })).then(function(values){if(token!==self.generation)throw new Error('İptal edildi');return P.unique(values);});
  };
  Provider.prototype.home = function (force) {
    var self = this;
    return this.fetch(BASE + '/', P.home, force, 'home').then(function (data) {
      self.links = data.links;
      return self.prepareCards(data.series).then(function(cards){data.series=cards;data.hero=cards[0]||data.hero;return data;});
    });
  };
  Provider.prototype.options = function () {
    return Promise.resolve({});
  };
  Provider.prototype.list = function (query, next, force) {
    var self = this;
    query = query || {};
    var f = query.filters || {},
      url = (next && next.url) || query.url || BASE + '/';
    url = P.safe(url);
    if (query.type === 'movie') return Promise.resolve({ cards: [], next: null });
    if (
      Object.keys(f).some(function (k) {
        return !!f[k];
      }) ||
      (query.order && query.order !== 'date')
    )
      return Promise.reject(new Error('DDizi bu filtreyi desteklemiyor.'));
    if (
      !url || !/^\/(?:|yabanci-dizi-izle|eski\.diziler(?:\/\d+)?|l\.php\?sayfa=[1-9]\d*)$/.test(
        url.slice(BASE.length)
      )
    )
      return Promise.reject(new Error('Geçersiz DDizi liste bağlantısı.'));
    if (next && next.kind === 'ddizi-recent' && (!(next.max >= 2) || next.max > 1000))
      return Promise.reject(new Error('Geçersiz DDizi devam sayfası.'));
    return this.fetch(
      url,
      function (body) {
        return P.list(body, url, next);
      },
      force,
      'list'
    ).then(function(data){return self.prepareCards(data.cards).then(function(cards){data.cards=cards;return data;});});
  };
  Provider.prototype.search = function (query, force) {
    query = root.CatalogUtils.clean(query);
    if (!query || query.length > 100)
      return Promise.reject(new Error('Arama 1–100 karakter olmalı.'));
    var self = this,
      token = this.generation;
    return this.fetch(
      BASE + '/arama/',
      P.search,
      force,
      'search-v2',
      'arama=' + encodeURIComponent(query)
    ).catch(function (e) {
      if (token !== self.generation || /ptal/.test(e.message)) throw e;
      return self.fetch(BASE + '/', P.home, false, 'home').then(function (home) {
        if (token !== self.generation) throw new Error('İptal edildi');
        var values = home.index.concat(home.series),
          items = (self.cache.data && self.cache.data.items) || {};
        Object.keys(items).forEach(function (k) {
          if (k.indexOf('ddizi0100-') !== 0) return;
          var v = items[k].value || {};
          values = values.concat(v.cards || [], v.index || [], v.series || []);
        });
        function key(s) {
          return root.CatalogUtils.clean(s)
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/İ/g, 'i')
            .replace(/\u0307/g, '')
            .replace(/[çğıöşü]/g, function (c) {
              return { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c];
            });
        }
        var q = key(query);
        return {
          cards: P.unique(values).filter(function (c) {
            return key(c.title).indexOf(q) >= 0;
          }),
          next: null,
          searchNotice:
            'Sitenin aramasına ulaşılamadı. Site menüsünde ve bu TV’de yüklenen katalogda arandı; diğer eski diziler için arşiv sekmesini kullanabilirsiniz.'
        };
      });
    });
  };
  Provider.prototype.seriesDetail = function (card, force) {
    var self = this,
      token = this.generation;
    return this.fetch(
      card.pageUrl,
      function (body) {
        return P.detail(body, card);
      },
      force,
      'series'
    ).then(function (detail) {
      var seen = {},
        pages = 0;
      seen[card.pageUrl] = true;
      function more(next) {
        if (token !== self.generation) throw new Error('İptal edildi');
        if (!next) return Promise.resolve();
        if (++pages > 50 || seen[next.url] || P.canonical(next.url) !== detail.pageUrl)
          throw new Error('Dizi sayfalaması doğrulanamadı.');
        seen[next.url] = true;
        return self
          .fetch(
            next.url,
            function (body) {
              return P.episodes(body, detail, next.url);
            },
            force,
            'episodes'
          )
          .then(function (data) {
            if (token !== self.generation) throw new Error('İptal edildi');
            detail.episodes = detail.episodes.concat(data.episodes);
            return more(data.next);
          });
      }
      return more(detail.next).then(function () {
        delete detail.next;
        detail.episodes = P.unique(detail.episodes).sort(function (a, b) {
          return a.episode.season - b.episode.season || a.episode.number - b.episode.number;
        });
        detail.seasons = detail.episodes
          .map(function (e) {
            return e.episode.season;
          })
          .filter(function (n, i, a) {
            return a.indexOf(n) === i;
          });
        if (!detail.episodes.length) throw new Error('Dizi bölüm bağlantıları alınamadı.');
        return detail;
      });
    });
  };
  /* Resolve a recent-episode card to its real parent without enumerating every archive page. */
  Provider.prototype.identity = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
    var self = this,
      token = this.generation,
      start = P.seriesUrl(card.pageUrl)
        ? Promise.resolve(card)
        : this.fetch(
            card.pageUrl,
            function (body) {
              var m = P.meta(body, card.pageUrl);
              return {
                contentId: P.id(m.seriesPageUrl),
                providerId: 'p006',
                type: 'series',
                pageUrl: m.seriesPageUrl,
                title: m.title,
                poster: m.poster,
                selectedEpisodePageUrl: m.episodePageUrl,
                legacyContentIds: [card.contentId]
              };
            },
            force,
            'identity0172-parent'
          );
    return start
      .then(function (parent) {
        if (token !== self.generation) throw new Error('İptal edildi');
        return self
          .fetch(
            parent.pageUrl,
            function (body) {
              var detail = P.detail(body, parent);
              detail.identityOldestPage = P.oldestPage(body, parent.pageUrl);
              return detail;
            },
            force,
            'identity0172-series'
          )
          .then(function (value) {
            var d = root.PlayerCore.copy(value);
            if (parent.legacyContentIds) d.legacyContentIds = parent.legacyContentIds.slice();
            if (parent.selectedEpisodePageUrl)
              d.selectedEpisodePageUrl = parent.selectedEpisodePageUrl;
            return d;
          });
      })
      .then(function (d) {
        if (token !== self.generation) throw new Error('İptal edildi');
        if (d.episodes.some(function (e) { return e.episode.season === 1 && e.episode.number === 1; }) || !d.identityOldestPage) return d;
        return self.fetch(d.identityOldestPage,function (body) { return P.episodes(body,d,d.identityOldestPage); },force,'identity-first-page').then(function (value) {
          if (token !== self.generation) throw new Error('İptal edildi');
          d.episodes = d.episodes.concat(value.episodes);
          return d;
        },function (e) { if(token !== self.generation) throw e; return d; });
      })
      .then(function (d) {
        if (token !== self.generation) throw new Error('İptal edildi');
        var first = d.episodes.filter(function (e) {
          return e.episode.season === 1 && e.episode.number === 1;
        })[0];
        d.episodes = [];
        delete d.next;
        delete d.identityOldestPage;
        d.identityEvidence = {version:2,pageUrl:d.pageUrl,title:d.title,type:'series',typeVerified:true,detailChecked:true};
        if (!first) return d;
        return self
          .fetch(
            first.pageUrl,
            function (body) {
              return { yearHint: P.firstAirYear(body, first.pageUrl, d.pageUrl) };
            },
            force,
            'identity0172-airdate'
          )
          .then(
            function (value) {
              if (token !== self.generation) throw new Error('İptal edildi');
              if (value.yearHint) {
                d.yearHint = value.yearHint;
                d.identityEvidence = {
                  version: 2,
                  pageUrl: d.pageUrl,
                  type: 'series',
                  typeVerified: true,
                  year: value.yearHint,
                  yearVerified: true,
                  detailChecked: true,
                  referencePageUrl: first.pageUrl,
                  verificationReason: 'first-episode-airdate'
                };
              }
              return d;
            },
            function (e) {
              if (token !== self.generation) throw e;
              return d;
            }
          );
      });
  };
  Provider.prototype.detail = function (card, force) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
    var self = this,
      token = this.generation;
    if (P.seriesUrl(card.pageUrl))
      return this.seriesDetail(card, force).then(function (value) {
        var d = root.PlayerCore.copy(value);
        if (card.selectedEpisodePageUrl) {
          var e = d.episodes.filter(function (v) {
            return v.pageUrl === card.selectedEpisodePageUrl;
          })[0];
          if (e) d.selectedEpisodeId = e.contentId;
        }
        return d;
      });
    if (!P.episodeUrl(card.pageUrl))
      return Promise.reject(new Error('Geçersiz dizi/bölüm bağlantısı.'));
    return this.fetch(
      card.pageUrl,
      function (body) {
        return P.meta(body, card.pageUrl);
      },
      force,
      'episode-detail'
    ).then(function (meta) {
      if (token !== self.generation) throw new Error('İptal edildi');
      return self
        .seriesDetail(
          {
            contentId: P.id(meta.seriesPageUrl),
            providerId: 'p006',
            type: 'series',
            title: meta.title,
            pageUrl: meta.seriesPageUrl,
            poster: meta.poster
          },
          force
        )
        .then(function (detail) {
          if (token !== self.generation) throw new Error('İptal edildi');
          detail.description = meta.description;
          detail.poster = meta.poster || detail.poster;
          detail.language = meta.language;
          var selected = detail.episodes.filter(function (e) {
            return e.pageUrl === meta.episodePageUrl;
          })[0];
          if (!selected) throw new Error('Seçilen bölüm dizi listesinde bulunamadı.');
          detail.selectedEpisodeId = selected.contentId;
          detail.episodes.forEach(function (e) {
            e.poster = detail.poster;
          });
          return detail;
        });
    });
  };
  Provider.prototype.seriesLanguage = function (card) {if(root.SiteAddresses)card=root.SiteAddresses.content(card);
    var self = this;
    if (card.language) return Promise.resolve({ language: card.language, languageReference: card.languageReference });
    if (!P.episodeUrl(card.pageUrl)) {
      var token = this.generation;
      return this.detail(card).then(function (detail) {
        if (token !== self.generation) throw new Error('İptal edildi');
        var first = detail.episodes && detail.episodes[0];
        return first && P.episodeUrl(first.pageUrl) ? self.seriesLanguage(first) : { language: '' };
      });
    }
    return this.fetch(
      card.pageUrl,
      function (body) {
        var m = P.meta(body, card.pageUrl);
        return {
          language: m.language,
          languageReference: { pageUrl: card.pageUrl, checkedAt: Date.now() }
        };
      },
      false,
      'language'
    );
  };
  root.DdiziProvider = Provider;
})(window);


var Parser=window.DdiziParser;
function Provider(cache){window.DdiziProvider.call(this,cache,context.createClient());}
Provider.prototype=Object.create(window.DdiziProvider.prototype);Provider.prototype.constructor=Provider;
function Resolver(log,now){this.delegate=context.createResolver('r006',log,now);}
Resolver.prototype.cancel=function(){this.delegate.cancel();};Resolver.prototype.resolve=function(c,d,n,h){return this.delegate.resolve(c,d,n,h);};
shared.SiteRegistry.register({id:'p006',name:'P006',base:context.site.base,mark:'P006',subtitle:'P006',prefix:'p006:',storagePrefix:'site.p006.',contentTypes:['series'],supportsSeriesLanguage:true,collectionKeys:['new','recommended','liked'],Provider:Provider,Resolver:Resolver,Parser:Parser,ui:{seriesRail:'Diziler',recommended:'Yabancı diziler',liked:'Eski dizi arşivi',filterHint:'Site tür, yıl ve IMDb filtresi sunmuyor.',defaultOrder:'date'},collectionQuery:function(type,key,links){return {type:'series',url:links&&links[key]||{new:context.site.base+'/',recommended:context.site.base+'/yabanci-dizi-izle',liked:context.site.base+'/eski.diziler'}[key]};},filterFields:function(){return [];}});
})(window);
