/* P003: broadcaster series only. ES5. No remote scripts are executed. */
(function (root) {
  'use strict';
  var ctx = root.FilmPlugins.context(), BASE = ctx.site.base;
  function clean(v) { return String(v || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, ''); }
  function fold(v) { return clean(v).replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase(); }
  function searchFold(v) { return fold(v).replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ö/g,'o').replace(/ü/g,'u').replace(/ç/g,'c'); }
  function url(v) { try { var u = new root.URL(v,BASE+'/'); return u.origin === BASE && !u.username && !u.password ? u.origin+u.pathname : ''; } catch(e) { return ''; } }
  function doc(body) { if (typeof body !== 'string' || body.length > 2097152) throw new Error('P003: katalog yanıtı geçersiz.'); return root.CatalogUtils.envelope(body).doc; }
  function image(box) { var n=box.querySelector('img'),v=n&&(n.getAttribute('data-src')||n.getAttribute('data-catalog-src')); try { return v ? new root.URL(v,BASE).href : ''; } catch(e) { return ''; } }
  function series(body) { var d=doc(body),seen={},out=[]; Array.prototype.forEach.call(d.querySelectorAll('section.videos .list-item'),function(b){var a=b.querySelector('a[href]'),u=url(a&&a.getAttribute('href')),n=b.querySelector('.program-name'); if(!u||!/^\/[^/]+\/izle\/?$/.test(new root.URL(u).pathname)||!n||seen[u])return;seen[u]=true;out.push({contentId:'p003:series:'+new root.URL(u).pathname.split('/')[1],providerId:'p003',type:'series',pageUrl:u,title:clean(n.textContent),poster:image(b),description:clean((b.querySelector('.program-desc')||{}).textContent)});});return out; }
  function episodes(body,parent,season) { var seen={},out=[]; Array.prototype.forEach.call(doc(body).querySelectorAll('a[href]'),function(a){var u=url(a.getAttribute('href')),m=u&&/^\/([^/]+)\/bolum\/(\d+)\/?$/.exec(new root.URL(u).pathname);if(!m||m[1]!==new root.URL(parent.pageUrl).pathname.split('/')[1]||seen[u])return;seen[u]=true;out.push({contentId:'p003:episode:'+m[1]+':'+m[2],providerId:'p003',type:'episode',pageUrl:u,title:parent.title+' · '+m[2]+'. Bölüm',poster:parent.poster,episode:{seriesId:parent.contentId,seriesTitle:parent.title,season:season,number:Number(m[2])}});});return out; }
  function cancelled() { var e=new Error('P003: işlem iptal edildi.');e.cancelled=true;return e; }
  function Provider(){this.client=ctx.createClient();this.generation=0;this.pending=0;}
  Provider.prototype.cancel=function(){this.generation++;this.client.cancel();};
  Provider.prototype.isIdle=function(){return this.pending===0;};
  Provider.prototype.request=function(address,body,token,deadline){var self=this;if(token!==self.generation)return Promise.reject(cancelled());if(Date.now()>=deadline)return Promise.reject(new Error('P003: katalog süresi doldu.'));self.pending++;var options={deadline:deadline,timeoutMs:15000},p=body===null?self.client.get(address,BASE+'/',{},options):self.client.post(address,body,{'Content-Type':'application/x-www-form-urlencoded','X-Requested-With':'XMLHttpRequest'},options);return p.then(function(r){self.pending--;if(token!==self.generation)throw cancelled();if(Date.now()>=deadline)throw new Error('P003: katalog süresi doldu.');return r.body;},function(e){self.pending--;if(token!==self.generation)throw cancelled();throw e;});};
  Provider.prototype.home=function(){return this.request(BASE+'/dizi-izle',null,this.generation,Date.now()+30000).then(function(b){var a=series(b);return {hero:a[0]||null,movies:[],series:a,genres:[],links:{}};});};
  Provider.prototype.archive=function(next,deadline){var page=next&&Number(next.page)||0,self=this;deadline=deadline||Date.now()+30000;if(page<0||page%1||page>200)return Promise.reject(new Error('P003: sayfa geçersiz.'));var count=next&&Number(next.count)||10;if(count!==10)return Promise.reject(new Error('P003: sayfa boyutu geçersiz.'));return self.request(page?BASE+'/ajax/archive':BASE+'/dizi-arsivi',page?'page='+page+'&type=series&count=10&orderBy=id&sorting=desc':null,self.generation,deadline).then(function(body){if(page){var j=JSON.parse(body);if(typeof j.data!=='string'||!isFinite(Number(j.count)))throw new Error('P003: arşiv yanıtı geçersiz.');return {cards:series('<section class="videos">'+j.data+'</section>'),next:(page+1)*10<Number(j.count)?{page:page+1,count:10}:null};}var d=doc(body),n=d.querySelector('.ajax-load-more-archive[data-type="series"]'),cards=series(body);return {cards:cards,next:n&&Number(n.getAttribute('data-rows'))>cards.length?{page:Number(n.getAttribute('data-page')),count:10}:null};});};
  Provider.prototype.list=function(query,next){if(query&&query.type==='movie')return Promise.resolve({cards:[],next:null});return this.archive(next);};
  Provider.prototype.search=function(query){
    var term=searchFold(query),token=this.generation,end=Math.min(this.deadline||Infinity,Date.now()+27000);
    if(!term)return Promise.resolve({cards:[],next:null});
    if(term.length>100)return Promise.reject(new Error('P003: arama en fazla 100 karakter olabilir.'));
    return this.request(BASE+'/arama','query='+encodeURIComponent(term),token,end).then(function(body){
      var d=doc(body),out=[],seen={};
      if(!d.querySelector('.scrollable'))throw new Error('P003: arama alanı bulunamadı.');
      Array.prototype.forEach.call(d.querySelectorAll('.scrollable .container'),function(section){
        var title=section.querySelector('h2'),grid=section.nextElementSibling;
        if(!title||searchFold(title.textContent)!=='diziler'||!grid||!/(?:^|\s)posters(?:\s|$)/.test(grid.className))return;
        Array.prototype.forEach.call(grid.querySelectorAll('.poster a[href]'),function(a){
          var u=url(a.getAttribute('href')),m=u&&/^\/([^/]+)\/izle\/?$/.exec(new root.URL(u).pathname);
          if(!m||seen[u])return;seen[u]=true;
          var img=a.querySelector('img'),name=clean(img&&img.getAttribute('alt'))||m[1].replace(/-/g,' ');
          if(searchFold(name).indexOf(term)<0)return;
          out.push({contentId:'p003:series:'+m[1],providerId:'p003',type:'series',pageUrl:u,title:name,poster:image(a),sources:[]});
        });
      });
      return {cards:out,next:null};
    });
  };
  Provider.prototype.detail=function(card){var self=this,token=self.generation,end=Date.now()+30000,u=url(card.pageUrl),m=u&&/^\/([^/]+)\/(?:izle|bolum\/\d+)\/?$/.exec(new root.URL(u).pathname);if(!m)return Promise.reject(new Error('P003: dizi bağlantısı geçersiz.'));var selected=card.type==='episode'?u:null,parent={contentId:'p003:series:'+m[1],providerId:'p003',type:'series',pageUrl:BASE+'/'+m[1]+'/izle',title:card.title,poster:card.poster,genres:[],cast:[],description:card.description||'',originalTitle:'',fetchedAt:Date.now(),episodes:[],seasons:[],selectedEpisodePageUrl:selected};return self.request(BASE+'/'+m[1]+'/bolumler',null,token,end).then(function(body){var d=doc(body),h=d.querySelector('h1'),og=d.querySelector('meta[property="og:image"]'),btn=d.querySelector('.ajax-load-more-video[data-program-id][data-type="2"]');parent.title=clean(h&&h.textContent||parent.title).replace(/\s*[-–]\s*BÖLÜMLER$/i,'');parent.poster=og&&og.content||parent.poster;var seasons=[];Array.prototype.forEach.call(d.querySelectorAll('#video-filter-changer option'),function(n){var v=Number(n.value);if(v>0&&v%1===0&&seasons.indexOf(v)<0)seasons.push(v);});if(!btn||!seasons.length)throw new Error('P003: sezon/bölüm listesi bulunamadı.');var id=btn.getAttribute('data-program-id'),count=Number(btn.getAttribute('data-count')),seen={},requests=0;if(!/^\d+$/.test(id)||count<1||count>100)throw new Error('P003: bölüm listesi bilgisi geçersiz.');parent.seasons=seasons.slice().sort(function(a,b){return a-b;});function load(season,page){if(Date.now()>=end-500||requests++>=40){parent.episodePagesIncomplete=true;return Promise.resolve();}return self.request(BASE+'/ajax/videos','filter=season&program_id='+id+'&season='+season+'&page='+page+'&type=2&count='+count+'&orderBy=id&sorting=DESC',token,end).then(function(b){var j=JSON.parse(b);if(j.code!==200||typeof j.data!=='string'||!isFinite(Number(j.count)))throw new Error('P003: bölüm yanıtı geçersiz.');episodes(j.data,parent,season).forEach(function(ep){if(!seen[ep.pageUrl]){seen[ep.pageUrl]=true;parent.episodes.push(ep);}});return (page+1)*count<Number(j.count)?load(season,page+1):null;});}function next(){var s=seasons.shift();return s?load(s,0).then(next):null;}return Promise.resolve(next()).then(function(){parent.episodes.sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});return parent;});});};
  function firstSeasonYear(body,title) {
    var blocks=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,match,years={};
    while((match=blocks.exec(body))){
      var input=match[1],stack=[],nodes=[],i=0;
      if(input.length>262144)continue;
      try{
        while(i<input.length){
          var ch=input.charAt(i),node=stack[stack.length-1];
          if(ch==='"'){
            var key=root.InertPlayerData.literal(input,i);i=key.end;
            while(/\s/.test(input.charAt(i))&&i<input.length)i++;
            if(input.charAt(i)===':'&&node){i++;while(/\s/.test(input.charAt(i))&&i<input.length)i++;if(input.charAt(i)==='"'){var value=root.InertPlayerData.literal(input,i);if(/^(?:@type|name|datePublished|episodeNumber)$/.test(key.value)){if(node[key.value]!==undefined&&node[key.value]!==value.value)throw new Error('Conflicting identity field');node[key.value]=value.value;}i=value.end;}}
            continue;
          }
          if(ch==='{'){if(nodes.length>=1024)throw new Error('Identity size');node={parent:node};stack.push(node);nodes.push(node);}
          if(ch==='}')stack.pop();i++;
        }
        if(stack.length)continue;
        nodes.forEach(function(n){
          var season=n.parent,series=season&&season.parent,date=/^((?:19|20)\d{2})-\d{2}-\d{2}/.exec(n.datePublished||'');
          if(n['@type']==='TVEpisode'&&n.episodeNumber==='1'&&season&&season['@type']==='TVSeason'&&/^1\.\s*Sezon$/i.test(season.name||'')&&series&&series['@type']==='TVSeries'&&searchFold(series.name)===searchFold(title)&&date&&(season.datePublished||'').slice(0,10)===(n.datePublished||'').slice(0,10))years[date[1]]=true;
        });
      }catch(ignore){}
    }
    return Object.keys(years).length===1?Number(Object.keys(years)[0]):null;
  }
  Provider.prototype.identity=function(input){
    var token=this.generation,end=Math.min(this.deadline||Infinity,Date.now()+30000),u=url(input.pageUrl),m=u&&/^\/([^/]+)\/izle\/?$/.exec(new root.URL(u).pathname);
    if(!m)return Promise.reject(new Error('P003: dizi kimliği bağlantısı geçersiz.'));
    return this.request(u,null,token,end).then(function(body){
      var d=doc(body),heading=d.querySelector('h1'),canonical=d.querySelector('meta[property="og:url"]'),name=clean(heading&&heading.textContent),episodesLink=d.querySelector('a[href="'+BASE+'/'+m[1]+'/bolumler"]');
      if(!canonical||url(canonical.getAttribute('content'))!==u||!episodesLink||!name)throw new Error('P003: dizi kimliği doğrulanamadı.');
      var result={contentId:input.contentId,providerId:'p003',pageUrl:u,type:'series',title:name,poster:input.poster,year:firstSeasonYear(body,name)};
      result.identityEvidence={version:2,pageUrl:u,title:name,type:'series',typeVerified:true,detailChecked:true};
      if(result.year){result.identityEvidence.year=result.year;result.identityEvidence.yearVerified=true;result.identityEvidence.verificationReason='first-season-first-episode-airdate';}
      return result;
    });
  };
  Provider.prototype.options=function(){return Promise.resolve({genres:[],years:[],languages:[],order:[{value:'site',label:'Site sırası'}]});};
  function Resolver(log,now){this.delegate=ctx.createResolver('r003',log,now);}
  Resolver.prototype.cancel=function(){this.delegate.cancel();};Resolver.prototype.resolve=function(c,d,n,h){return this.delegate.resolve(c,d,n,h);};
  root.SiteRegistry.register({id:'p003',name:'P003',base:BASE,prefix:'p003:',storagePrefix:'site.p003.',mark:'N',subtitle:'P003',Provider:Provider,Resolver:Resolver,Parser:{series:series,episodes:episodes},contentTypes:['series'],ui:{seriesRail:'Diziler',defaultOrder:'site'},filterFields:function(){return ['order'];},collectionQuery:function(){return {type:'series',order:'site'};}});
})(window);
