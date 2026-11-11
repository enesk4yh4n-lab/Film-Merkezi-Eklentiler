(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,PlayerCore:shared.PlayerCore,InertPlayerData:shared.InertPlayerData,CatalogClient:shared.CatalogClient,SourceProgress:shared.SourceProgress};
(function (root) {
  'use strict';
  var I = root.InertPlayerData, U = root.CatalogUtils, uuid = '[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}';
  function fail(stage, message) { var e = new Error('P007: ' + message); e.stage = stage; throw e; }
  function frameId(value) {
    var s = I.publicUrl(value), u = s && new root.URL(s), m;
    if (!u || u.port && u.port !== '443') return null;
    if (u.hostname === 'ksdpictures.site' && u.pathname === '/dzembed.php' && new RegExp('^\\?id=('+uuid+')$','i').test(u.search)) return { id: u.search.slice(4), prefix: 'embed-', kind: 'KSD', url: s };
    if (u.hostname === 'yabancidizim.com' && !u.search) { m = new RegExp('^/psource/('+uuid+')/?$','i').exec(u.pathname); if (m) return { id: m[1], prefix: 'psource-', kind: 'Psource', url: s }; m = /^\/vplayer\/(\d+)\/?$/.exec(u.pathname); if (m) return { id: m[1], prefix: 'vplayer-', kind: 'Vplayer', url: s }; }
    return null;
  }
  function frames(body, page) {
    var out = [];
    Array.prototype.forEach.call(I.doc(body).querySelectorAll('.video-container iframe'),function(n){var value=I.publicUrl(n.getAttribute('data-frame-src')||n.getAttribute('data-src'),page),f=frameId(value);if(f&&!out.some(function(x){return x.url===f.url;}))out.push(f);});
    if (!out.length) fail('embed','Desteklenen aktif oynatıcı bulunamadı.'); return out;
  }
  function mediaUrl(value, page) {
    var s=I.publicUrl(value,page),u=s&&new root.URL(s);
    if(!u||!/^(?:ksdpictures\.site|yabancidizim\.com|video\.twimg\.com|pictures\.(?:spordunyasi|izmirgezisi)\.site)$/.test(u.hostname))fail('policy','Kaynak adresi izinli medya ailesinde değil.');return s;
  }
  function config(body, frame) {
    var d=I.doc(body);if(!d.querySelector('#np'))fail('embed','Aktif oynatıcı alanı bulunamadı.');var v=I.object(body,/\bwindow\.NP_CONFIG\s*=\s*/);
    if(v.id!==frame.prefix+frame.id)fail('decode','Oynatıcı video kimliği uyuşmuyor.');
    var ref=d.querySelector('meta[name="referrer"][content="no-referrer"]')?'':frame.url, entries=[];
    if(v.deferSource){var p=I.object(body,/\bwindow\.PSOURCE_CONFIG\s*=\s*/);if(p.id!==v.id||p.parentOrigin!=='https://diziboxum.com')fail('decode','Psource video kimliği veya site kökeni uyuşmuyor.');(Array.isArray(p.parts)?p.parts:[]).forEach(function(x){if(x&&x.id!=null&&String(x.label).toLowerCase()!=='message'&&x.url)entries.push({id:String(x.id),url:mediaUrl(x.url,frame.url),label:U.clean(x.label)||'Psource',referer:ref,subtitles:[]});});}
    else{
      var prefix=frame.kind==='KSD'?new RegExp('^/dserv/uploads/'+uuid+'/'+frame.id+'/','i'):null;
      (Array.isArray(v.sources)?v.sources:[]).forEach(function(x,i){if(!x||!x.master)return;var url=mediaUrl(x.master,frame.url),u=new root.URL(url);if(prefix&&(u.hostname!=='ksdpictures.site'||!prefix.test(u.pathname)))fail('decode','KSD medya adresi başka bir videoya ait.');var subs=[];(Array.isArray(v.subtitles)?v.subtitles:[]).slice(0,32).forEach(function(t,n){if(!t||!t.url)return;var sub=mediaUrl(t.url,frame.url),su=new root.URL(sub);if(prefix&&(su.hostname!=='ksdpictures.site'||!prefix.test(su.pathname)))fail('decode','Altyazı başka bir videoya ait.');if(!/\.vtt$/i.test(su.pathname))return;subs.push({id:'p007-sub-'+n,url:sub,label:U.clean(t.label||t.lang),language:t.lang||'',format:'vtt',forced:t.forced===true,packageKey:context.key});});entries.push({id:String(i),url:url,label:frame.kind+' · '+(U.clean(x.title)||'Kaynak'),referer:ref,subtitles:subs});});
    }
    if(!entries.length)fail('empty','Aktif oynatıcı kaynak listesi boş.');if(entries.length>16)fail('decode','Kaynak sayısı sınırı aşıldı.');return entries;
  }
  root.P007Decoder={frames:frames,frameId:frameId,config:config,mediaUrl:mediaUrl};
})(window);

(function (root) {
  'use strict';
  var D=root.P007Decoder;
  function error(stage,message){var e=new Error('P007: '+message);e.stage=stage;return e;}
  function Resolver(log,now){this.log=log||function(){};this.now=now||Date.now;this.generation=0;this.clients=[];}
  Resolver.prototype.cancel=function(){this.generation++;this.clients.splice(0).forEach(function(c){try{c.cancel();}catch(ignore){}});};
  Resolver.prototype.resolve=function(content,deadline,notify,hints){
    this.cancel();var self=this,token=self.generation,sources=[],options=[],last=null,progress=root.SourceProgress&&new root.SourceProgress(notify,hints);
    if(!/^https:\/\/diziboxum\.com\/[a-z0-9-]+-\d+-sezon-\d+-bolum(?:-[a-z0-9-]+)?\/$/.test(content.pageUrl||''))return Promise.reject(error('page','Geçersiz bölüm adresi.'));
    if(self.now()>=deadline)return Promise.reject(error('timeout','Kaynak hazırlama süresi doldu.'));
    function check(){if(token!==self.generation){var e=error('cancel','İptal edildi');e.cancelled=true;throw e;}if(self.now()>=deadline)throw error('timeout','Kaynak hazırlama süresi doldu.');}
    function get(url,ref,stage){check();var client=context.createClient();if(progress&&progress.client)client=progress.client(client,check,deadline);self.clients.push(client);function release(){var i=self.clients.indexOf(client);if(i>=0)self.clients.splice(i,1);}return client.get(url,ref,{'User-Agent':'Mozilla/5.0'},{deadline:deadline,timeoutMs:Math.min(30000,Math.max(1,deadline-self.now()))}).then(function(r){release();check();return r;},function(e){release();check();e.requestStage=stage;throw e;});}
    function publish(){if(progress)progress.publish(sources,options);else if(notify)notify(sources);}
    function wait(){return progress?progress.wait(check):Promise.resolve().then(check);}
    return get(content.pageUrl,'https://diziboxum.com/','page').then(function(page){var frames=D.frames(page.body,content.pageUrl),i=0;
      function next(){check();if(i>=frames.length)return Promise.resolve();var frame=frames[i++],option={sourceId:'p007-'+frame.id,label:frame.kind,pageUrl:content.pageUrl,status:'pending',stage:'',detail:''};options.push(option);publish();return wait().then(function(){return get(frame.url,content.pageUrl,'embed');}).then(function(embed){var entries=D.config(embed.body,frame),n=0;
        function source(){check();if(n>=entries.length)return Promise.resolve();var entry=entries[n++],o=n===1?option:{sourceId:'p007-'+frame.id+'-'+entry.id,label:entry.label,pageUrl:content.pageUrl,status:'pending',stage:'',detail:''};if(o!==option)options.push(o);o.label=entry.label;publish();return wait().then(function(){return get(entry.url,entry.referer,'manifest');}).then(function(r){if(!/^\s*#EXTM3U/.test(r.body))throw error('manifest','HLS yerine farklı yanıt alındı.');var dual=/#EXT-X-MEDIA:[^\r\n]*TYPE=AUDIO[^\r\n]*LANGUAGE="(?:tr|tur)"/.test(r.body);sources.push({id:o.sourceId,label:entry.label+(dual?' · Türkçe/özgün ses':''),url:entry.url,type:'hls',referer:entry.referer,packageKey:context.key,preferredEngine:'html5',subtitles:entry.subtitles,order:sources.length,languagePriority:dual?0:1});o.status='ready';o.detail='HLS erişimi doğrulandı';}).catch(function(e){check();last=e;o.status='error';o.stage=e.stage||'manifest';o.detail=root.PlayerCore.safeMessage(e.message);}).then(function(){check();publish();}).then(source);}
        return source();
      }).catch(function(e){check();last=e;option.status=e.stage==='unsupported'?'unsupported':'error';option.stage=e.stage||'embed';option.detail=root.PlayerCore.safeMessage(e.message);publish();}).then(next);}
      return next();
    }).then(function(){check();sources.options=options;if(!sources.length){var e=last||error('decode','Oynatılabilir kaynak bulunamadı.');e.sourceOptions=options;throw e;}return sources;});
  };
  root.P007Resolver=Resolver;
})(window);

context.registerResolver({create:function(ctx,log,now){return new window.P007Resolver(log,now);}});
})(window);
