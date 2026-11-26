(function (root) {
  'use strict';
  var context=root.FilmPlugins.context(), base=context.site.base, U=root.CatalogUtils, I=root.InertPlayerData, param=root.CatalogSiteKit.param;
  var seriesPath=/^\/dizi\/([a-z0-9-]+)$/, episodePath=/^\/dizi\/([a-z0-9-]+)\/sezon-([1-9]\d*)\/bolum-([1-9]\d*)$/;
  var filters=[['aksiyon','genre:action','Aksiyon'],['bilim-kurgu','genre:science-fiction','Bilim Kurgu'],
    ['komedi','genre:comedy','Komedi'],['romantik','genre:romance','Romantik']];

  function safe(value,page) {
    var url=I.publicUrl(value,page||base+'/');
    if(!url)return '';
    var p=new root.URL(url);
    return p.origin===base&&!p.hash&&!p.port?url:'';
  }
  function text(node,sel) {var n=sel?node.querySelector(sel):node;return U.clean(n&&n.textContent);}
  function image(node,page) {
    var source=node&&(node.getAttribute('data-catalog-src')||node.getAttribute('data-src'));
    return I.publicUrl(source,page)||'';
  }
  function id(kind,path) {return 'p018:'+kind+':'+path.replace(/^\/(?:dizi\/)?/,'');}
  function poster(imageData,page) {
    var picture=Array.isArray(imageData)?imageData[0]:imageData;
    if(picture&&typeof picture==='object')picture=picture.url;
    return I.publicUrl(picture,page)||'';
  }
  function kind(path) {
    if(episodePath.test(path))return 'episode';
    if(seriesPath.test(path))return 'series';
    return /^\/[a-z0-9-]+$/.test(path)&&!/^\/(?:diziler|film|filmler|iletisim|giris|kayit|yillar|arama|ara)$/.test(path)?'movie':'';
  }
  function catalog(body,page,type,animation) {
    return U.withEnvelope(body,function(){
      var doc=U.envelope(body).doc,rows=[],known={};
      Array.prototype.forEach.call(doc.querySelectorAll('.movie-grid.reveal a.movie-card, .series-grid a.series-card'),function(a){
        var url=safe(a.getAttribute('href'),page),u=url&&new root.URL(url),k=u&&!u.search&&kind(u.pathname);
        if((k!=='movie'&&k!=='series')||type&&type!==k||known[url])return;
        var title=text(a,'.movie-title,.series-title'),year=/\b(19\d{2}|20\d{2})\b/.exec(text(a,'.movie-year,.year')),img=image(a.querySelector('img'),page);
        if(!title)return;
        var card={contentId:id(k,u.pathname),providerId:'p018',type:k,pageUrl:url,title:title,rawTitle:title,
          originalTitle:text(a,'.movie-original-title'),poster:img,year:year?Number(year[1]):null};
        if(animation)card.catalogSection='animation';
        rows.push(card);known[url]=true;
      });
      var current=new root.URL(page),path=current.pathname,query=param(page,'search');
      var n=Number(param(page,'page'))||Number((/\/sayfa\/(\d+)$/.exec(path)||[])[1])||1,next=null;
      Array.prototype.some.call(doc.querySelectorAll('.pagination a[href], .pagination-wrap a[href]'),function(a){
        var url=safe(a.getAttribute('href'),page),target=url&&new root.URL(url);
        if(!target||url===page)return false;
        var candidate=Number(param(url,'page'))||Number((/\/sayfa\/(\d+)$/.exec(target.pathname)||[])[1])||1;
        if(candidate!==n+1||query!==param(url,'search'))return false;
        if(type==='series'&&target.pathname!=='/diziler'||type!=='series'&&target.pathname.replace(/\/sayfa\/\d+$/,'')!==path.replace(/\/sayfa\/\d+$/,'').replace(/^\/$/,''))return false;
        next={url:url,from:page};return true;
      });
      return {cards:rows,next:next};
    });
  }
  function episode(series,season,number,title,picture) {
    var page=series.pageUrl+'/sezon-'+season+'/bolum-'+number;
    return {contentId:id('episode',new root.URL(page).pathname),providerId:'p018',type:'episode',pageUrl:page,seriesPageUrl:series.pageUrl,
      title:series.title+' · '+season+'. Sezon '+number+'. Bölüm',episodeTitle:title,poster:picture||series.poster,
      episode:{season:season,number:number,seriesId:series.contentId,seriesTitle:series.title},sources:[],subtitles:[]};
  }
  function details(body,card) {
    return U.withEnvelope(body,function(){
      var env=U.envelope(body),d=env.doc,page=card.pageUrl,p=new root.URL(page),type=kind(p.pathname);
      var meta=d.querySelector('meta[property="og:url"]');
      if(!meta||safe(meta.getAttribute('content'),page)!==page)throw Error('P018: İçerik sayfası eşleşmedi.');
      var schema=env.schema.filter(function(s){return s['@type']===(type==='series'?'TVSeries':'Movie')&&safe(s.url,page)===page;})[0];
      if(!schema||!U.clean(schema.name))throw Error('P018: İçerik bilgisi bulunamadı.');
      var year=/^(19\d{2}|20\d{2})/.exec(schema.datePublished||schema.startDate||'');
      var out={contentId:id(type,p.pathname),providerId:'p018',type:type,pageUrl:page,title:U.clean(schema.name),rawTitle:U.clean(schema.name),
        originalTitle:U.clean(schema.alternateName),poster:poster(schema.image,page)||card.poster||'',description:U.clean(schema.description),
        year:year?Number(year[1]):card.year||null,genres:Array.isArray(schema.genre)?schema.genre:schema.genre?[schema.genre]:[],
        episodes:[],seasons:[],sources:[],subtitles:[]};
      if(type!=='series')return {out:out,seasons:[],seriesId:''};
      var available=[],found={};
      Array.prototype.forEach.call(d.querySelectorAll('.season-selector [data-season]'),function(n){
        var season=Number(n.getAttribute('data-season'));
        if(season>0&&season<=100&&available.indexOf(season)<0)available.push(season);
      });
      Array.prototype.forEach.call(d.querySelectorAll('.episode-grid .episode-card a.episode-info[href]'),function(a){
        var url=safe(a.getAttribute('href'),page),u=url&&new root.URL(url),m=u&&!u.search&&episodePath.exec(u.pathname);
        if(!m||'/dizi/'+m[1]!==p.pathname||found[url])return;
        found[url]=true;
        var host=a.parentNode;
        out.episodes.push(episode(out,Number(m[2]),Number(m[3]),text(a,'.episode-title'),image(host.querySelector('img'),page)));
      });
      var seriesId=/\b(?:const|var|let)\s+seriesId\s*=\s*(\d{1,12})\s*;/.exec(body);
      return {out:out,seasons:available.filter(function(n){return !out.episodes.some(function(e){return e.episode.season===n;});}),
        seriesId:seriesId?seriesId[1]:''};
    });
  }

  function Provider(cache) {root.CatalogClient.call(this,cache,context.createClient(),{base:base});}
  Provider.prototype=Object.create(root.CatalogClient.prototype);
  Provider.prototype.constructor=Provider;
  Provider.prototype.fetch=function(url,parse,force,key){
    url=safe(url);return url?this.request(url,null,parse,force,'p018-'+key):Promise.reject(Error('P018: Site dışı adres.'));
  };
  Provider.prototype.home=function(force){
    var self=this;
    return self.list({type:'movie'},null,force).then(function (m){
      return self.list({type:'series'},null,force).then(function(s){return {hero:m.cards[0]||s.cards[0]||null,movies:m.cards,series:s.cards};});
    });
  };
  Provider.prototype.list=function(query,next,force){
    query=query||{};
    if(query.section==='drama-short')return Promise.resolve({cards:[],next:null});
    var type=query.type==='series'?'series':'movie',animation=query.section==='animation';
    var url=safe(next&&next.url||query.url||(animation?base+'/tur/animasyon':type==='series'?base+'/diziler':base+'/'));
    var path=url&&new root.URL(url).pathname;
    if(!path||type==='series'&&path!=='/diziler'||type==='movie'&&!/^\/(?:tur\/[a-z0-9-]+)?(?:\/?sayfa\/\d+)?\/?$/.test(path))
      return Promise.reject(Error('P018: Geçersiz katalog sayfası.'));
    return this.fetch(url,function(b){return catalog(b,url,type,animation);},force,'list');
  };
  Provider.prototype.search=function(query,force,next){
    query=U.clean(query);if(!query)return Promise.resolve({cards:[],next:null});
    if(query.length>100)return Promise.reject(Error('P018: Arama çok uzun.'));
    var url=safe(next&&next.url||base+'/?search='+encodeURIComponent(query));
    if(!url||param(url,'search')!==query)return Promise.reject(Error('P018: Arama sayfası eşleşmedi.'));
    return this.fetch(url,function(b){return catalog(b,url,null,false);},force,'search');
  };
  Provider.prototype.detail=function(card,force){
    var self=this,selected=safe(card.pageUrl),p=selected&&new root.URL(selected),ep=p&&episodePath.exec(p.pathname),target=ep?base+'/dizi/'+ep[1]:selected;
    if(!target||p.search||!kind(p.pathname))return Promise.reject(Error('P018: Geçersiz içerik adresi.'));
    var generation=self.generation,end=Date.now()+23000;
    return self.fetch(target,function(b){return details(b,{pageUrl:target,poster:card.poster,year:card.year});},force,'detail').then(function(d){
      var out=d.out,remaining=d.seasons.slice(0,20);
      function season(){
        if(generation!==self.generation)throw Error('P018: İptal edildi.');
        var n=remaining.shift();
        if(!n)return Promise.resolve();
        if(!d.seriesId||Date.now()>=end){out.episodePagesIncomplete=true;return Promise.resolve();}
        var endpoint=base+'/api/get_season_episodes.php?series_id='+d.seriesId+'&season='+n;
        return self.fetch(endpoint,function(body){
          var data=JSON.parse(body);
          if(data.success!==true||Number(data.season_number)!==n||!Array.isArray(data.episodes))throw Error('Sezon yanıtı eşleşmedi.');
          return data.episodes.filter(function(x){return x&&x.status==='published'&&/^[1-9]\d*$/.test(String(x.episode_number));});
        },force,'season').then(function(rows){
          rows.forEach(function(x){out.episodes.push(episode(out,n,Number(x.episode_number),U.clean(x.title),I.publicUrl(x.still_image,target)));});
        },function(){out.episodePagesIncomplete=true;}).then(season);
      }
      return season().then(function(){
        var distinct={};
        out.episodes=out.episodes.filter(function(e){if(distinct[e.contentId])return false;distinct[e.contentId]=true;return true;})
          .sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});
        out.episodes.forEach(function(e){if(out.seasons.indexOf(e.episode.season)<0)out.seasons.push(e.episode.season);});
        if(ep&&out.episodes.some(function(e){return e.pageUrl===selected;}))out.selectedEpisodePageUrl=selected;
        return out;
      });
    });
  };
  Provider.prototype.options=function(){
    var quick=[{id:'new',label:'Yeni Eklenenler',types:['movie'],query:{type:'movie'}}];
    filters.forEach(function(f){quick.push({id:f[1],label:f[2],types:['movie'],query:{type:'movie',url:base+'/tur/'+f[0]}});});
    return Promise.resolve({genres:[],years:[],lang:[],imdb:[],quickFilters:quick});
  };

  function Resolver(log,now){this.delegate=context.createResolver('r018',log,now);}
  Resolver.prototype.cancel=function(){this.delegate.cancel();};
  Resolver.prototype.resolve=function(content,deadline,notify,hints){return this.delegate.resolve(content,deadline,notify,hints);};
  root.SiteRegistry.register({id:'p018',name:'P018',base:base,prefix:'p018:',storagePrefix:'site.p018.',mark:'P018',subtitle:'P018',
    Provider:Provider,Resolver:Resolver,contentTypes:['movie','series'],catalogSections:['animation'],supportsQuickFilters:true,
    textTransport:'native',ui:{movieRail:'Filmler',seriesRail:'Diziler',defaultOrder:'site'},filterFields:function(){return [];}});
})(window);

