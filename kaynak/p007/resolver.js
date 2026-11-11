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
