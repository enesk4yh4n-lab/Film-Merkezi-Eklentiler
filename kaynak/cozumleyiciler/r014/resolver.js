(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,CatalogClient:shared.CatalogClient,CatalogSearchCursor:shared.CatalogSearchCursor,ContentIdentity:shared.ContentIdentity,PlayerCore:shared.PlayerCore,InertPlayerData:shared.InertPlayerData,SourceProgress:shared.SourceProgress,PackageMediaLoader:shared.PackageMediaLoader,atob:function(s){return shared.atob(s);}};
window.PackageMediaConfig={id:'r014',site:'p014',base:'https://filmizlehell.net'};
/* P014 active player selections; no remote scripts or tracking identifiers. */
(function(root){
 'use strict';var I=root.InertPlayerData,U=root.CatalogUtils,BASE=root.PackageMediaConfig.base,HOST='https://p.playturka.space';
 var preferAvPlay=/\bTizen 7\.0(?:[; )]|$)/i.test(shared.navigator&&shared.navigator.userAgent||'');
 function fail(stage,msg){var e=new Error('R014: '+msg);e.stage=stage;return e;}
 function alternatives(body){
  var d=I.doc(body),out=[],seen={};
  Array.prototype.forEach.call(d.querySelectorAll('main [x-data]'),function(owner){
   if(!/(?:\:src|x-bind:src)\s*=\s*['"][^'"]*\bactiveSource/.test(owner.innerHTML))return;
   var state=owner.getAttribute('x-data')||'',language=/activeLanguage\s*:\s*['"]([^'"]+)/.exec(state),label=language&&language[1]==='tr-dub'?'Türkçe Dublaj':language&&language[1]==='tr-sub'?'Türkçe Altyazılı':'PlayTurka';
   function scan(n,attr){var re=/\bactiveSource\s*(?::|=)\s*(['"])(https:\/\/p\.playturka\.space\/#([A-Za-z0-9_-]{3,100}))\1/g,m;while((m=re.exec(attr))){if(seen[m[3]]){if(n.tagName==='BUTTON')seen[m[3]].label=U.clean(n.textContent)||label;continue;}var entry={id:'r014-'+m[3],videoId:m[3],label:n.tagName==='BUTTON'?U.clean(n.textContent)||label:label,url:m[2]};seen[m[3]]=entry;out.push(entry);}}
   scan(owner,state);Array.prototype.forEach.call(owner.querySelectorAll('button'),function(n){scan(n,n.getAttribute('@click')||n.getAttribute('x-on:click')||'');});
  });
  if(!out.length)throw fail('unavailable','Aktif PlayTurka kaynağı bulunamadı.');return out;
 }

 function settings(body,id){var v;try{v=JSON.parse(body);}catch(ignore){var s=body.replace(/^\s+|\s+$/g,'').replace(/[A-Za-z0-9_-]/g,function(c){var n=c.charCodeAt(0);return n>=65&&n<=90?String.fromCharCode(155-n):n>=97&&n<=122?String.fromCharCode(219-n):/\d/.test(c)?String((Number(c)+5)%10):c==='-'?'+':'/';});while(s.length%4)s+='=';try{v=JSON.parse(root.atob(s));}catch(e){throw fail('decode','PlayTurka API yanıtı okunamadı.');}}
 if(!v||v.status!=='success'||v.videoId!==id||!v.files)throw fail('identity','PlayTurka video kimliği uyuşmuyor.');var u=I.publicUrl(v.files.masterUrl),p=u&&new root.URL(u);if(!p||p.origin!==HOST||p.pathname!=='/videos/'+id+'/master.m3u8')throw fail('identity','PlayTurka manifest kimliği uyuşmuyor.');var subs=[],tracks=v.files.subtitles||{};if(!Array.isArray(tracks))tracks=Object.keys(tracks).slice(0,32).map(function(lang){return {file:tracks[lang],lang:lang,label:lang==='tr'?'Türkçe':lang==='en'?'English':lang};});tracks.slice(0,32).forEach(function(s,i){var u=I.publicUrl(s.file||s.url||s.src,HOST+'/'),p=u&&new root.URL(u);if(p&&p.origin===HOST&&p.pathname.indexOf('/videos/'+id+'/subtitles/')===0)subs.push({id:'r014-sub-'+i,url:u,label:U.clean(s.label||s.lang)||'Altyazı',language:s.lang||'',format:/\.srt(?:\?|$)/i.test(u)?'srt':'vtt',packageKey:context.key});});return {url:u,type:'hls',subtitles:subs};}
 function Resolver(){this.text=context.createClient({platformText:true});this.media=context.createClient();this.generation=0;}
 Resolver.prototype.cancel=function(){this.generation++;this.text.cancel();this.media.cancel();};
 Resolver.prototype.resolve=function(content,deadline,notify,hints){this.cancel();var self=this,token=self.generation,output=[],options=[],last,progress=root.SourceProgress?new root.SourceProgress(notify,hints):null,page=I.publicUrl(content.pageUrl);
 function check(){if(token!==self.generation){var e=fail('cancel','İptal edildi.');e.cancelled=true;throw e;}if(Date.now()>=deadline)throw fail('timeout','Ortak kaynak süresi doldu.');}
 if(!page||new root.URL(page).origin!==BASE||!/^\/film\/\d+-[a-z0-9-]+\/?$/.test(new root.URL(page).pathname)||new root.URL(page).search||new root.URL(page).hash)return Promise.reject(fail('page','Geçersiz içerik sayfası.'));
 function get(client,u,ref){check();var q=progress?progress.client(client,check,deadline):client;return (progress?progress.wait(check):Promise.resolve()).then(function(){check();return q.get(u,ref,{},{deadline:deadline,timeoutMs:Math.min(30000,Math.max(1,deadline-Date.now()))});}).then(function(r){check();return r.body;});}
 return get(self.text,page,BASE+'/').then(function(body){var entries=alternatives(body),chain=Promise.resolve();entries.forEach(function(e){chain=chain.then(function(){check();var o={sourceId:e.id,label:e.label,status:'pending',stage:'api'},data;options.push(o);return get(self.media,HOST+'/api/video-url?id='+encodeURIComponent(e.videoId),BASE+'/').then(function(body){data=settings(body,e.videoId);o.stage='manifest';return get(self.media,data.url,HOST+'/');}).then(function(body){if(!/^\s*#EXTM3U/.test(body))throw fail('manifest','PlayTurka HLS yanıtı alınamadı.');if(/SAMPLE-AES|KEYFORMAT="[^\"]*(?:widevine|playready)/i.test(body))throw fail('unsupported','DRM desteklenmiyor.');o.status='ready';o.stage='';output.push({id:e.id,label:e.label,type:'hls',url:data.url,referer:HOST+'/',preferredEngine:preferAvPlay?'avplay':'html5',packageKey:context.key,subtitles:data.subtitles});if(progress)progress.publish(output,options);else if(notify){output.options=options;notify(output);}}).catch(function(err){check();last=err;o.status='error';o.stage=err.stage||'network';o.detail=root.PlayerCore.safeMessage(err.message);});});});return chain;}).then(function(){check();output.options=options;if(!output.length){var e=last||fail('unavailable','Oynatılabilir kaynak bulunamadı.');e.sourceOptions=options;throw e;}return output;});
 };
 root.PackageMedia={alternatives:alternatives,settings:settings};root.PackageResolver=Resolver;
})(window);

context.registerResolver({create:function(){return new window.PackageResolver();}});
})(window);
