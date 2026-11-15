(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,InertPlayerData:shared.InertPlayerData,atob:function(value){return shared.atob(value);},CatalogUtils:shared.CatalogUtils,CatalogClient:shared.CatalogClient,PlayerCore:shared.PlayerCore,SourceProgress:shared.SourceProgress,ChainNetwork:{createClient:function(){return context.createClient();}}};
/* saglayicilar/p011/data.js */
/* Reads literal Next Flight data. No component or page script is executed. */
(function(root){
 'use strict';
 function walk(value,visit){var count=0;function next(v,depth){if(!v||typeof v!=='object'||depth>80||++count>60000)return;visit(v);Object.keys(v).forEach(function(k){next(v[k],depth+1);});}next(value,0);}
 function records(html){
  if(typeof html!=='string'||html.length>4*1024*1024)throw new Error('Site verisi çok büyük.');
  var wire='',re=/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi,m,match;
  while((m=re.exec(html))){match=/^\s*self\.__next_f\.push\((\[[\s\S]*\])\);?\s*$/.exec(m[1]);if(!match)continue;try{var chunk=JSON.parse(match[1]);if(chunk[0]===1&&typeof chunk[1]==='string')wire+=chunk[1];}catch(ignore){}}
  if(wire.length>3*1024*1024)throw new Error('Site verisi çok büyük.');
  var values=[],i=0,end,head,size,used,c,width;
  while(i<wire.length){
   if(wire.charAt(i)==='\n'){i++;continue;}
   head=/^([0-9a-f]+):/.exec(wire.slice(i,i+20));if(!head){end=wire.indexOf('\n',i);if(end<0)break;i=end+1;continue;}i+=head[0].length;
   head=/^T([0-9a-f]+),/.exec(wire.slice(i,i+20));
   if(head){size=parseInt(head[1],16);i+=head[0].length;used=0;while(i<wire.length&&used<size){c=wire.charCodeAt(i);width=c<128?1:c<2048?2:c>=55296&&c<=56319?4:3;used+=width;i+=width===4?2:1;}if(used!==size)throw new Error('Site metin çerçevesi bozuk.');continue;}
   end=wire.indexOf('\n',i);if(end<0)end=wire.length;
   if(/^[\[{\"]/.test(wire.charAt(i))){try{values.push(JSON.parse(wire.slice(i,end)));}catch(ignore2){}}
   i=end+1;
  }return values;
 }
 function find(values,predicate){var found=null;walk(values,function(v){if(!found&&!Array.isArray(v)&&predicate(v))found=v;});return found;}
 function player(html){
  var guard=find(records(html),function(v){return Object.prototype.hasOwnProperty.call(v,'accessLevel')&&Object.prototype.hasOwnProperty.call(v,'requireAuthForWatch');});
  if(!guard)throw new Error('HDFilmDelisi oynatıcı verisi bulunamadı.');
  if(guard.accessLevel!=='public'||guard.requireAuthForWatch!==false)throw new Error('Bu içerik üye girişi gerektiriyor.');
  var data=find(guard.children,function(v){return typeof v.videoUrl==='string'&&Object.prototype.hasOwnProperty.call(v,'isCopyrighted');});
  if(!data||data.isCopyrighted)throw new Error('Bu içerik için herkese açık oynatıcı bulunmuyor.');
  if(!/^https:\/\/pl\.vixolity\.com\/[A-Za-z0-9_=-]+$/.test(data.videoUrl))throw new Error('Oynatıcı biçimi desteklenmiyor.');
  return {url:data.videoUrl,poster:data.posterUrl||''};
 }
 root.HdfilmDelisiData={records:records,find:find,player:player};
})(window);


/* Next Flight JSON frames; parsed as inert text, never evaluated. */
(function(root){
 'use strict';var D=root.HdfilmDelisiData;
 function records(html){if(typeof html!=='string'||html.length>2097152)throw new Error('P009: sayfa boyutu geçersiz.');var re=/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi,m,args,wire='',out=[],i=0,head,start,stack,quote,escape,c,used,width,size,end;
 while((m=re.exec(html))){var call=/^\s*self\.__next_f\.push\((\[[\s\S]*\])\);?\s*$/.exec(m[1]);if(!call)continue;try{args=JSON.parse(call[1]);if(args[0]===1&&typeof args[1]==='string')wire+=args[1];}catch(ignore){}}
 while(i<wire.length){if(/\s/.test(wire.charAt(i))){i++;continue;}head=/^([0-9a-f]{1,12}):/i.exec(wire.slice(i,i+30));if(!head){end=wire.indexOf('\n',i);if(end<0)break;i=end+1;continue;}i+=head[0].length;head=/^T([0-9a-f]{1,8}),/i.exec(wire.slice(i,i+30));if(head){size=parseInt(head[1],16);i+=head[0].length;used=0;while(i<wire.length&&used<size){c=wire.charCodeAt(i);width=c<128?1:c<2048?2:c>=55296&&c<=56319?4:3;used+=width;i+=width===4?2:1;}if(used!==size)throw new Error('P009: metin çerçevesi eksik.');continue;}
 if(!/^[\[{]/.test(wire.charAt(i))){end=wire.indexOf('\n',i);if(end<0)break;i=end+1;continue;}start=i;stack=[];quote=false;escape=false;while(i<wire.length){c=wire.charAt(i++);if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quote=false;continue;}if(c==='"')quote=true;else if(c==='{'||c==='[')stack.push(c);else if(c==='}'||c===']'){if(stack.pop()!==(c==='}'?'{':'['))throw new Error('P009: veri çerçevesi bozuk.');if(!stack.length)break;}}if(stack.length||quote)throw new Error('P009: veri çerçevesi eksik.');out.push(JSON.parse(wire.slice(start,i)));if(out.length>20000)throw new Error('P009: veri kayıt sınırı.');}
 return out;
 }
 function player(html){var all=records(html),guard=D.find(all,function(v){return Object.prototype.hasOwnProperty.call(v,'accessLevel')&&Object.prototype.hasOwnProperty.call(v,'requireAuthForWatch');});if(!guard)throw new Error('P009: aktif oynatıcı verisi bulunamadı.');if(guard.accessLevel!=='public'||guard.requireAuthForWatch!==false)throw new Error('P009: içerik giriş gerektiriyor.');var data=D.find(guard.children,function(v){return Array.isArray(v.sources)||typeof v.videoUrl==='string';});if(!data||data.isCopyrighted||data.telif&&data.telif!=='$undefined')throw new Error('P009: içerik oynatma için kullanılamıyor.');var choices=(data.sources||[{url:data.videoUrl,title:'Kaynak'}]).filter(function(v){return v&&/^https:\/\/pl\.vixolity\.com\/[A-Za-z0-9_=-]+$/.test(v.url||'');});if(!choices.length)throw new Error('P009: desteklenen aktif kaynak yok.');return {url:choices[0].url,poster:data.posterUrl||'',options:choices};}
 D.records=records;D.player=player;
})(window);
/* saglayicilar/p011/parser.js */
(function(root){
 'use strict';var U=root.CatalogUtils,D=root.HdfilmDelisiData,BASE=(root.SiteAddresses ? root.SiteAddresses.base('p009', 'https://hdfilmdelisi1.com') : 'https://hdfilmdelisi1.com');
 function text(node,selector){var n=node&&(selector?node.querySelector(selector):node);if(n&&n.nodeType===9)n=n.body;return U.clean(n&&n.textContent);}
 function safe(value){var url=U.url(value,BASE+'/');try{var u=new root.URL(url);return u.origin===BASE&&!u.username&&!u.password?url:'';}catch(ignore){return '';}}
 function contentUrl(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/(film|dizi)\/[a-z0-9-]+(?:\/sezon-[1-9]\d*\/bolum-[1-9]\d*)?$/.test(p.pathname)?u:'';}
 function genre(value){var u=safe(value),p=u&&new root.URL(u);return p&&!p.search&&/^\/tur\/[a-z0-9-]+$/.test(p.pathname)?u:'';}
 function param(url,key){var m=new RegExp('[?&]'+key+'=([^&#]*)').exec(url);try{return m?decodeURIComponent(m[1]):null;}catch(ignore){return null;}}
 function pageUrl(url,number){var u=new root.URL(url),parts=u.search.slice(1).split('&').filter(function(s){return s&&!/^page=/.test(s);});parts.push('page='+number);return u.origin+u.pathname+'?'+parts.join('&');}
 function id(page,type){return 'p009:'+type+':'+new root.URL(page).pathname.split('/')[2];}
 function language(value){return {'dublaj':'Türkçe Dublaj','altyazi':'Türkçe Altyazılı','dublaj-altyazi':'Dublaj & Altyazılı'}[value]||'';}
 function unique(cards){var seen={};return cards.filter(function(c){if(!c||seen[c.contentId])return false;seen[c.contentId]=true;return true;});}
 function dto(v,type){
  if(!v||!v.baslik||!/^[a-z0-9-]+$/.test(v.slug)||v.accessLevel&&v.accessLevel!=='public')return null;
  var page=BASE+(type==='series'?'/dizi/':'/film/')+v.slug;
  return {contentId:id(page,type),providerId:'p009',type:type,pageUrl:page,title:U.clean(v.baslik),originalTitle:U.clean(v.orijinalBaslik),imdbId:/^tt\d{7,10}$/.test(v.imdbId||'')?v.imdbId:'',poster:U.url(v.afis,BASE+'/'),year:Number(v.yayinYili)||null,imdb:Number(v.imdbPuani)||null,language:language(v.dublajDurumu)};
 }
 function cards(doc){var result=[];Array.prototype.forEach.call(doc.querySelectorAll('a.poster[href]'),function(a){var page=contentUrl(a.getAttribute('href'));if(!page||/\/sezon-/.test(page))return;var type=/\/dizi\//.test(page)?'series':'movie',title=text(a,'h2,h3'),img=a.querySelector('img'),meta=text(a),year=/\b((?:19|20)\d{2})\b/.exec(meta),rating=/★\s*(\d+(?:\.\d+)?)/.exec(meta),dub=false,sub=false;
   Array.prototype.forEach.call(a.querySelectorAll('svg'),function(svg){if(svg.querySelector('rect[fill="#E30A17"]'))dub=true;if(/lucide-captions|lucide-subtitles/.test(svg.getAttribute('class')||''))sub=true;});
   if(title)result.push({contentId:id(page,type),providerId:'p009',type:type,pageUrl:page,title:title,poster:U.url(img&&img.getAttribute('data-catalog-src')||img.getAttribute('data-src')||img.getAttribute('src'),BASE+'/'),year:year?Number(year[1]):null,imdb:rating?Number(rating[1]):null,language:dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':sub?'Türkçe Altyazılı':''});
  });return unique(result);}
 function options(body){var d=U.envelope(body).doc,seen={},genres=[];Array.prototype.forEach.call(d.querySelectorAll('a[href]'),function(a){var u=genre(a.getAttribute('href')),label=text(a);if(u&&label&&!seen[u]){seen[u]=true;genres.push({value:u,label:label});}});return genres;}
 function home(body){var all=cards(U.envelope(body).doc);if(!all.length)throw new Error('HDFilmDelisi katalog biçimi tanınamadı.');return {hero:all[0],movies:all.filter(function(c){return c.type==='movie';}),series:all.filter(function(c){return c.type==='series';}),next:null};}
 function list(body,page,type){
  var json,films,parsed,pages,number=param(page,'page')||1,next=null;
  if(/^\s*\{/.test(body)){json=JSON.parse(body);if(json.error)throw new Error('Katalog: '+U.clean(json.error));films=type==='series'?json.series:json.films;if(!Array.isArray(films))throw new Error('Katalog liste biçimi değişti.');pages=Number(json.totalPages);if(type==='series'?json.hasMore===true:Number(number)<pages)next={kind:'url',url:pageUrl(page,Number(number)+1)};return {cards:unique(films.map(function(v){return dto(v,type);})),next:next};}
  parsed=D.find(D.records(body),function(v){return Array.isArray(v.initialFilms)&&v.category;});
  if(parsed)return {cards:unique(parsed.initialFilms.map(function(v){return dto(v,'movie');})),next:null};
  return {cards:cards(U.envelope(body).doc).filter(function(c){return c.type===type;}),next:null};
 }
 function search(body){var data=JSON.parse(body);if(!Array.isArray(data.results)||!Array.isArray(data.series))throw new Error('Arama yanıtı biçimi değişti.');return {cards:unique(data.results.map(function(v){return dto(v,'movie');}).concat(data.series.map(function(v){return dto(v,'series');}))),next:null};}
 function detail(body,card){
  if(!contentUrl(card.pageUrl))throw new Error('Geçersiz içerik bağlantısı.');
  var env=U.envelope(body),d=env.doc,type=/\/dizi\//.test(card.pageUrl)?'series':'movie',schema=env.schema.filter(function(s){return s['@type']===(type==='series'?'TVSeries':'Movie');})[0],result=root.PlayerCore.copy(card),titleNode=null;
  Array.prototype.some.call(d.querySelectorAll('h1'),function(h){if(text(h)&&text(h)!=='Film izle'){titleNode=h;return true;}return false;});
  if(!titleNode||!schema)throw new Error('HDFilmDelisi detay biçimi tanınamadı.');
  result.type=type;result.contentId=id(card.pageUrl,type);result.title=text(titleNode);result.originalTitle=schema.alternateName||text(titleNode.parentNode,'p');result.poster=U.url(typeof schema.image==='string'?schema.image:schema.image&&schema.image.url,BASE+'/')||card.poster;
  result.description=text(U.envelope(schema.description||'').doc).replace(/\\[rn]/g,' ');result.year=Number(String(schema.datePublished||'').slice(0,4))||card.year;result.imdb=Number(schema.aggregateRating&&schema.aggregateRating.ratingValue)||card.imdb;
  result.duration=schema.duration?String(schema.duration).replace(/^PT/,'').replace(/H/,' sa ').replace(/M/,' dk'):'';
  result.genres=Array.isArray(schema.genre)?schema.genre.slice():schema.genre?[schema.genre]:[];result.cast=(schema.actor||[]).map(function(v){return U.clean(v.name);}).filter(Boolean);result.seasons=[];result.episodes=[];result.sources=[];result.subtitles=[];
  var header=titleNode.parentNode.parentNode.parentNode,meta=text(header,'.meta-x-scroll'),dub=/Türkçe Dublaj/.test(meta),sub=/Türkçe Altyazı/.test(meta);
  if(dub||sub)result.language=dub&&sub?'Dublaj & Altyazılı':dub?'Türkçe Dublaj':'Türkçe Altyazılı';
  if(!result.genres.length)Array.prototype.forEach.call(header.querySelectorAll('a[href]'),function(a){if(genre(a.getAttribute('href'))&&result.genres.indexOf(text(a))<0)result.genres.push(text(a));});
  if(type==='movie'){try{D.player(body);}catch(e){result.playbackUnavailableReason=e.message;}}
  else{
   var data=D.find(D.records(body),function(v){return Array.isArray(v.sezonlar)&&typeof v.slug==='string';});
   if(!data||!(/^[a-z0-9-]+$/).test(data.slug)||BASE+'/dizi/'+data.slug!==card.pageUrl)throw new Error('Dizi sezon verisi bulunamadı.');
   data.sezonlar.forEach(function(s){if(!Array.isArray(s.bolumler))return;s.bolumler.forEach(function(e){var sn=Number(s.sezonNo),en=Number(e.bolumNo);if(sn<1||en<1||Math.floor(sn)!==sn||Math.floor(en)!==en)return;var page=card.pageUrl+'/sezon-'+sn+'/bolum-'+en;result.episodes.push({contentId:result.contentId+':s'+sn+':e'+en,providerId:'p009',type:'episode',pageUrl:page,title:result.title+' · '+sn+'×'+en,episodeTitle:U.clean(e.ad)||en+'. Bölüm',description:U.clean(e.aciklama),poster:result.poster,seriesTitle:result.title,seriesPageUrl:card.pageUrl,language:language(e.dublajDurumu),episode:{seriesId:result.contentId,season:sn,number:en},sources:[],subtitles:[]});});});
   result.episodes=unique(result.episodes).sort(function(a,b){return a.episode.season-b.episode.season||a.episode.number-b.episode.number;});result.seasons=result.episodes.map(function(e){return e.episode.season;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  }return result;
 }
 root.HdfilmDelisiParser={base:BASE,safe:safe,contentUrl:contentUrl,genre:genre,param:param,id:id,home:home,list:list,search:search,detail:detail,options:options};
})(window);


/* saglayicilar/p011/provider.js */
(function(root){
 'use strict';var P=root.HdfilmDelisiParser,BASE=P.base;
 function Provider(cache,network){root.CatalogClient.call(this,cache,network||root.ChainNetwork.createClient({destination:'downloads'}),{base:BASE,headers:{Accept:'text/html,application/json','User-Agent':'Mozilla/5.0'}});}
 Provider.prototype=Object.create(root.CatalogClient.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.fetch=function(url,parse,force,scope){if(!P.safe(url))return Promise.reject(new Error('HDFilmDelisi dışı katalog bağlantısı reddedildi.'));return this.request(url,null,parse,force,'hdfilmdelisi0160-'+scope);};
 Provider.prototype.home=function(force){var self=this;return this.fetch(BASE+'/',function(body){self.genres=P.options(body);return P.home(body);},force,'home');};
 Provider.prototype.options=function(){var self=this;return (this.genres?Promise.resolve():this.fetch(BASE+'/',function(body){self.genres=P.options(body);return {};},false,'options')).then(function(){return {genres:self.genres,order:[{value:'date',label:'Yeni eklenenler'},{value:'views',label:'Çok izlenenler'},{value:'imdb',label:'IMDb puanı'},{value:'year_desc',label:'Yayın yılı'}]};});};
 Provider.prototype.list=function(query,next,force){
  query=query||{};var f=query.filters||{},type=query.type==='series'?'series':'movie',url,sort={date:'newest',views:'views',imdb:'imdb',year_desc:'year_desc'}[query.order||'date'];
  if(f.year||f.language||f.imdb||type==='series'&&f.genre||f.genre&&!P.genre(f.genre)||!sort)return Promise.reject(new Error('Bu katalog filtresi desteklenmiyor.'));
  if(type==='series')url=BASE+'/api/series/new?page=1';
  else if(f.genre)url=BASE+'/api/films/category/'+new root.URL(f.genre).pathname.split('/')[2]+'?page=1&sort='+sort+'&limit=20';
  else{if(query.order&&query.order!=='date')return Promise.reject(new Error('Sıralama için önce bir film türü seçin.'));url=BASE+'/';}
  if(next){var expected=new root.URL(url),actual;try{actual=new root.URL(next.url);}catch(ignore){return Promise.reject(new Error('Geçersiz devam bağlantısı.'));}if(!P.safe(next.url)||actual.pathname!==expected.pathname||!/^\d+$/.test(P.param(next.url,'page')||'')||Number(P.param(next.url,'page'))<2||P.param(next.url,'sort')!==P.param(url,'sort')||P.param(next.url,'limit')!==P.param(url,'limit'))return Promise.reject(new Error('Geçersiz devam bağlantısı.'));url=actual.href;}
  return this.fetch(url,function(body){return P.list(body,url,type);},force,'list');
 };
 Provider.prototype.search=function(query,force){query=root.CatalogUtils.clean(query);if(query.length<2||query.length>100)return Promise.reject(new Error('Arama en az 2, en fazla 100 karakter olmalı.'));return this.fetch(BASE+'/api/search?q='+encodeURIComponent(query),P.search,force,'search');};
 Provider.prototype.detail=function(card,force){if(root.SiteAddresses)card=root.SiteAddresses.content(card);if(!P.contentUrl(card.pageUrl)||/\/sezon-/.test(card.pageUrl))return Promise.reject(new Error('Geçersiz detay bağlantısı.'));return this.fetch(card.pageUrl,function(body){return P.detail(body,card);},force,'detail');};
 Provider.prototype.seriesLanguage=function(card){if(root.SiteAddresses)card=root.SiteAddresses.content(card);return Promise.resolve({language:card.language||''});};root.HdfilmDelisiProvider=Provider;
})(window);



/* Only verified site categories; no title-based classification. */
(function(root){
 'use strict';var P=root.HdfilmDelisiParser,Parent=root.HdfilmDelisiProvider,base=P.base;
 function Provider(cache){Parent.call(this,cache,context.createClient());}
 Provider.prototype=Object.create(Parent.prototype);Provider.prototype.constructor=Provider;
 Provider.prototype.list=function(query,next,force){if(!query||query.section!=='animation')return Parent.prototype.list.call(this,query,next,force);var self=this,pages=next&&next.pages||[{url:base+'/api/films/category/animasyon?page=1&sort=newest&limit=20',genre:'animasyon'},{url:base+'/api/films/category/cizgi?page=1&sort=newest&limit=20',genre:'cizgi'},{url:base+'/tur/animasyon/dizi',genre:'animasyon',type:'series'},{url:base+'/tur/cizgi/dizi',genre:'cizgi',type:'series'}],rows=[],more=[],chain=Promise.resolve();if(!Array.isArray(pages)||pages.length>4)return Promise.reject(new Error('P009: devam listesi geçersiz.'));pages.forEach(function(p){chain=chain.then(function(){var u;try{u=new root.URL(p.url);}catch(e){throw new Error('P009: devam adresi geçersiz.');}if(['animasyon','cizgi'].indexOf(p.genre)<0||u.origin!==base||(p.type==='series'?u.pathname!=='/tur/'+p.genre+'/dizi'||u.search: u.pathname!=='/api/films/category/'+p.genre||!/^\d+$/.test(P.param(p.url,'page')||'')||P.param(p.url,'sort')!=='newest'||P.param(p.url,'limit')!=='20'))throw new Error('P009: devam adresi izinli değil.');return self.fetch(p.url,function(body){return P.list(body,p.url,p.type==='series'?'series':'movie');},force,'animation').then(function(r){r.cards.forEach(function(c){c.catalogSection='animation';rows.push(c);});if(r.next)more.push({url:r.next.url,genre:p.genre,type:p.type||'movie'});});});});return chain.then(function(){var seen={};return {cards:rows.filter(function(c){if(seen[c.contentId])return false;seen[c.contentId]=true;return true;}),next:more.length?{pages:more}:null};});};
 root.HdfilmDelisiProvider=Provider;
})(window);

function Resolver(log,now){this.delegate=context.createResolver('r009',log,now);}Resolver.prototype.cancel=function(){this.delegate.cancel();};Resolver.prototype.resolve=function(c,d,n,h){return this.delegate.resolve(c,d,n,h);};shared.SiteRegistry.register({id:'p009',name:'P009',base:context.site.base,prefix:'p009:',storagePrefix:'site.p009.',mark:'P009',subtitle:'P009',Provider:window.HdfilmDelisiProvider,Resolver:Resolver,Parser:window.HdfilmDelisiParser,contentTypes:['movie','series'],catalogSections:['animation'],ui:{movieRail:'Filmler',seriesRail:'Diziler',defaultOrder:'date'},filterFields:function(type){return type==='series'?[]:['genres','order'];}});
})(window);
