(function (root) {
  'use strict';
  var context = root.FilmPlugins.context(), base = context.site.base, U = root.CatalogUtils, I = root.InertPlayerData;
  var movie = /^\/(?:[a-z0-9]+-)*[a-z0-9]+-izle(?:-[a-z0-9]+)*\/?$/;
  var series = /^\/dizi\/([a-z0-9-]+)\/?$/;
  var episode = /^\/dizi\/([a-z0-9-]+)\/sezon-([1-9]\d*)\/bolum-([1-9]\d*)\/?$/;
  var genres = [['aksiyon-filmleri-izle','action','Aksiyon'],['bilim-kurgu-filmleri-izle','science-fiction','Bilim Kurgu'],['komedi-filmleri','comedy','Komedi'],['romantik-filmler','romance','Romantik']];
  function text(node, selector) { var n = selector ? node && node.querySelector(selector) : node; return U.clean(n && n.textContent); }
  function safe(value, page) {
    var url = I.publicUrl(value, page || base + '/'), parsed = url && new root.URL(url);
    return parsed && parsed.origin === base && !parsed.hash ? parsed.href : '';
  }
  function pageType(path) { return episode.test(path) ? 'episode' : series.test(path) ? 'series' : movie.test(path) ? 'movie' : ''; }
  function key(type, path) { return 'p019:' + type + ':' + path.replace(/^\//,'').replace(/\/$/,''); }
  function page(value, from) {
    var url = safe(value, from), p = url && new root.URL(url);
    if (!p || p.search || !pageType(p.pathname)) return '';
    return p.origin + p.pathname.replace(/\/$/,'') + (episode.test(p.pathname) ? '' : '/');
  }
  function image(value, from) {
    var url = I.publicUrl(value, from), p = url && new root.URL(url);
    return p && (p.origin === base || p.origin === 'https://image.tmdb.org') ? url : '';
  }
  function year(value) { var m = /\b(?:19|20)\d{2}\b/.exec(String(value || '')); return m ? Number(m[0]) : null; }
  function score(value) { var x = Number(value); return x > 0 && x <= 10 ? x : null; }
  function card(url, title, poster, release, rating) {
    var path = new root.URL(url).pathname, type = pageType(path);
    return {providerId:'p019',contentId:key(type,path),type:type,title:title,rawTitle:title,pageUrl:url,poster:poster,year:year(release),imdb:score(rating)};
  }
  function cards(body, from, type, animation) {
    return U.withEnvelope(body,function () {
      var doc = U.envelope(body).doc, main = doc.querySelector('main.hdf-site-main');
      if (!main) throw Error('P019: Catalog area not found.');
      var rows = [], seen = {};
      Array.prototype.forEach.call(main.querySelectorAll('article'),function (item) {
        var a = item.parentNode, url = a && a.tagName === 'A' && page(a.getAttribute('href'),from);
        var h = text(item,'h3'), img = item.querySelector('img'), y = year(text(item).slice(0,32));
        if (!url || !h || !img || seen[url] || pageType(new root.URL(url).pathname) !== type) return;
        seen[url] = true;
        var row = card(url,h,image(img.getAttribute('data-catalog-src') || img.getAttribute('data-src'),from),y,null);
        if (animation) row.catalogSection = 'animation';
        rows.push(row);
      });
      return {cards:rows,next:null};
    });
  }
  function searchRows(body) {
    var data = JSON.parse(body), seen = {};
    if (!Array.isArray(data.data)) throw Error('P019: Search response could not be read.');
    return {cards:data.data.slice(0,80).map(function (row) {
      if (!row || typeof row.slug !== 'string') return null;
      var url = page('/'+row.slug,base+'/'), title = U.clean(row.title);
      if (!url || !title || seen[url]) return null;
      var type = pageType(new root.URL(url).pathname);
      if (type === 'episode' || !/(?:^|\\)(?:Movie|TVSeries)$/.test(row.contentableType || '') ||
        (type === 'movie') !== /(?:^|\\)Movie$/.test(row.contentableType)) return null;
      seen[url]=true;
      return card(url,title,image(row.posterUrl,base+'/'),row.releaseYear,row.imdbRating);
    }).filter(Boolean),next:null};
  }
  function details(body, selected, input) {
    return U.withEnvelope(body,function () {
      var env = U.envelope(body), doc = env.doc, main = doc.querySelector('main.hdf-site-main');
      var canonical = doc.querySelector('meta[property="og:url"]'), path = new root.URL(selected).pathname, type = pageType(path);
      if (!main || !canonical || page(canonical.content,selected) !== selected) throw Error('P019: Content page mismatch.');
      var wanted = type === 'series' ? 'TVSeries' : type === 'episode' ? 'TVEpisode' : 'Movie';
      var schema = env.schema.filter(function (entry) { return entry && entry['@type'] === wanted; })[0] || {};
      var title = U.clean(schema.name) || text(main,'h1').replace(/ izle$/i,'');
      if (!title) throw Error('P019: Missing content title.');
      var out = card(selected,title,image(typeof schema.image === 'string' ? schema.image : '',selected) || input.poster || '',schema.datePublished || schema.dateCreated || input.year,schema.aggregateRating && schema.aggregateRating.ratingValue);
      out.episodes=[];out.seasons=[];out.sources=[];out.subtitles=[];
      out.description=U.clean(schema.description);
      out.genres=Array.isArray(schema.genre)?schema.genre:typeof schema.genre==='string'?[schema.genre]:[];
      if (schema.adult === true) out.contentSafety={adult:true};
      if (out.genres.some(function (genre) { return /^(?:animasyon|animation|anime)$/i.test(genre); })) out.catalogSection='animation';
      var identity=main.querySelector('a[href^="https://www.imdb.com/title/"]'), imdb=identity && /\/title\/(tt\d{5,12})(?:\/|$)/.exec(identity.getAttribute('href'));
      if (imdb && type !== 'episode') out.identityEvidence={version:2,pageUrl:selected,imdbId:imdb[1],imdbType:type,type:type,typeVerified:true};
      if (type !== 'series') return out;
      var seen = {}, seriesSlug = series.exec(path)[1].replace(/-izle$/,'');
      Array.prototype.forEach.call(main.querySelectorAll('a[href]'),function (a) {
        var url = page(a.getAttribute('href'),selected), epPath = url && new root.URL(url).pathname, m = epPath && episode.exec(epPath);
        if (!m || m[1].replace(/-izle$/,'') !== seriesSlug || seen[url]) return;
        seen[url]=true;
        var season=Number(m[2]), number=Number(m[3]), e=card(url,title+' '+season+'x'+number,out.poster,out.year,null);
        e.episodeTitle=text(a);e.seriesPageUrl=selected;
        e.episode={season:season,number:number,seriesId:out.contentId,seriesTitle:title};
        if (out.contentSafety) e.contentSafety=out.contentSafety;
        e.sources=[];e.subtitles=[];
        out.episodes.push(e);
        if (out.seasons.indexOf(season)<0) out.seasons.push(season);
      });
      out.episodes.sort(function(a,b){return a.episode.season-b.episode.season || a.episode.number-b.episode.number;});
      out.seasons.sort(function(a,b){return a-b;});
      return out;
    });
  }
  function Provider(cache) { root.CatalogClient.call(this,cache,context.createClient(),{base:base}); }
  Provider.prototype=Object.create(root.CatalogClient.prototype);
  Provider.prototype.constructor=Provider;
  Provider.prototype.home=function(force){
    var self=this;
    return self.list({type:'movie',url:base+'/'},null,force).then(function(f){
      return self.list({type:'series'},null,force).then(function(s){return {hero:f.cards[0]||s.cards[0]||null,movies:f.cards,series:s.cards};});
    });
  };
  Provider.prototype.list=function(query,next,force){
    query=query||{};
    if(next||query.section&&query.section!=='animation')return Promise.resolve({cards:[],next:null});
    var type=query.type==='series'&&!query.section?'series':'movie', animation=query.section==='animation';
    var url=safe(query.url || base+(type==='series'?'/dizi-izle/':animation?'/tur/animasyon-film-izle/':'/filmler/'));
    if (!url || !/^\/(?:filmler\/?|dizi-izle\/?|tur\/[a-z0-9-]+\/?|en-cok-izlenenler\/?)?$/.test(new root.URL(url).pathname)) return Promise.reject(Error('P019: Invalid catalog link.'));
    return this.request(url,null,function(b){return cards(b,url,type,animation);},force,'p019-list');
  };
  Provider.prototype.search=function(query,force){
    query=U.clean(query);
    if(query.length<2)return Promise.resolve({cards:[],next:null});
    if(query.length>100)return Promise.reject(Error('P019: Search term too long.'));
    return this.request(base+'/api/search?q='+encodeURIComponent(query),null,searchRows,force,'p019-search');
  };
  Provider.prototype.suggest=function(query){return this.search(query,false);};
  Provider.prototype.detail=function(input,force){
    var selected=page(input.pageUrl), parent=input.seriesPageUrl && page(input.seriesPageUrl), self=this;
    if(!selected)return Promise.reject(Error('P019: Invalid content link.'));
    if(parent && episode.test(new root.URL(selected).pathname)) {
      return self.detail({pageUrl:parent,poster:input.poster},force).then(function(result){
        if(result.episodes.some(function(e){return e.pageUrl===selected;}))result.selectedEpisodePageUrl=selected;
        return result;
      });
    }
    return self.request(selected,null,function(b){return details(b,selected,input);},force,'p019-detail');
  };
  Provider.prototype.options=function(){
    var quick=[{id:'new',label:'Yeni Eklenenler',types:['movie'],query:{type:'movie'}}];
    genres.forEach(function(g){quick.push({id:'genre:'+g[1],label:g[2],types:['movie'],query:{type:'movie',url:base+'/tur/'+g[0]+'/'}});});
    return Promise.resolve({genres:[],years:[],lang:[],imdb:[],quickFilters:quick});
  };
  function Resolver(log,now){this.delegate=context.createResolver('r019',log,now);}
  Resolver.prototype.cancel=function(){this.delegate.cancel();};
  Resolver.prototype.resolve=function(content,deadline,notify,hints){return this.delegate.resolve(content,deadline,notify,hints);};
  root.SiteRegistry.register({id:'p019',name:'P019',base:base,prefix:'p019:',storagePrefix:'site.p019.',mark:'P019',subtitle:'P019',
    Provider:Provider,Resolver:Resolver,contentTypes:['movie','series'],catalogSections:['animation'],supportsQuickFilters:true,textTransport:'native',
    ui:{movieRail:'Filmler',seriesRail:'Diziler',defaultOrder:'site'},filterFields:function(){return [];}});
})(window);
