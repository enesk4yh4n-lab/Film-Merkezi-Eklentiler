(function (root) {
  'use strict';
  var context=root.FilmPlugins.context(), I=root.InertPlayerData, U=root.CatalogUtils, param=root.CatalogSiteKit.param;
  var base='https://liderfilmizle.vip', player='https://play.liderfilm.cc', embedded='https://x.ag2m5.cfd';
  var episodeMedia='https://qp21.uk-traffic-076.com';
  var film=/^\/[a-z0-9-]+$/, episode=/^\/dizi\/[a-z0-9-]+\/sezon-[1-9]\d*\/bolum-[1-9]\d*$/;
  var vod=/^\/vod\/([a-z0-9_-]{5,64})$/i, embed=/^\/embed-([a-z0-9]{8,32})\.html$/i;
  function fail(stage,message){var e=Error('R018: '+message);e.stage=stage;return e;}
  function getUrl(value,from,origin,pattern){
    var u=I.publicUrl(value,from),p=u&&new root.URL(u);
    return p&&p.origin===origin&&!p.hash&&!p.port&&pattern.test(p.pathname)?u:'';
  }
  function parsedJson(body){
    try{return JSON.parse(body);}catch(ignore){throw fail('decode','Oynatıcı verisi okunamadı.');}
  }
  function options(body,page){
    var m=/\bwindow\._vs\s*=\s*/.exec(body);
    if(!m)throw fail('unavailable','Sayfada oynatılabilir kaynak bulunamadı.');
    var raw=I.literal(body,m.index+m[0].length).value;
    if(raw.length>65536||!/^[A-Za-z0-9+/=]+$/.test(raw))throw fail('decode','Kaynak listesi biçimi geçersiz.');
    var list=parsedJson(root.atob(raw)),out=[],seen={};
    if(!Array.isArray(list)||list.length>20)throw fail('decode','Kaynak sayısı geçersiz.');
    list.forEach(function(v){
      if(!v||!(/^(?:default|custom_\d{1,2})$/.test(v.id)))return;
      var u=getUrl(v.url,page,player,vod)||getUrl(v.url,page,player,embed);
      if(!u||seen[u])return;seen[u]=true;
      out.push({id:'r018-'+v.id.replace('_','-'),label:vod.test(new root.URL(u).pathname)?'Lider HLS':'PlayerJS',url:u});
    });
    if(!out.length) throw fail('unavailable','Desteklenen tam içerik kaynağı yok.');
    return out;
  }
  function proxy(value,frame){
    var u=getUrl(value,frame,player,/^\/player\/stream\.php$/);
    var source=u&&I.publicUrl(param(u,'url'));
    return source?u:'';
  }
  function packedVod(body,frame){
    var match=/\bvar\s+CFG\s*=\s*\{\s*src\s*:\s*/.exec(body);
    if(!match)throw fail('decode','HLS oynatıcı ayarı bulunamadı.');
    var content=body.slice(match.index,match.index+90000), src=I.literal(body,match.index+match[0].length).value;
    var u=proxy(src,frame);
    if(!u)throw fail('policy','HLS aktarım adresi izinli oynatıcıdan gelmedi.');
    var subs=[], data=/\bsubs\s*:\s*(\[[^\r\n]*\])\s*\}/.exec(content);
    if(data&&data[1].length<65536){
      var actual=parsedJson(data[1]);
      if(Array.isArray(actual))actual.slice(0,16).forEach(function(c){
        if(!c)return;
        var path=proxy(c.url,frame);if(!path)return;
        var ext=/\.(vtt|srt)(?:[?#]|$)/i.exec(param(path,'url'));if(!ext)return;
        var label=U.clean(c.label);
        subs.push({id:'r018-caption-'+subs.length,url:path,label:label||'Altyazı',language:/türkçe|turkish/i.test(label)?'tr':/english|ingilizce/i.test(label)?'en':'',format:ext[1].toLowerCase(),referer:frame,packageKey:context.key});
      });
    }
    return {url:u,type:'hls',referer:frame,subtitles:subs};
  }

  function Resolver(){this.client=context.createClient();this.media=context.createClient({media:true});this.generation=0;}
  Resolver.prototype.cancel=function(){this.generation++;this.client.cancel();this.media.cancel();};
  Resolver.prototype.resolve=function(content,deadline,notify){
    this.cancel();
    var self=this,generation=this.generation,page=I.publicUrl(content.pageUrl),p=page&&new root.URL(page),out=[],rows=[],last;
    if(!p||p.origin!==base||p.search||p.hash||p.port||(!film.test(p.pathname)&&!episode.test(p.pathname))||content.type==='series')
      return Promise.reject(fail('page','Geçersiz film veya bölüm adresi.'));
    deadline=Math.min(deadline||Infinity,Date.now()+30000);
    function check(){
      if(generation!==self.generation){var e=fail('cancel','İptal edildi.');e.cancelled=true;throw e;}
      if(Date.now()>=deadline)throw fail('timeout','Kaynak zaman aşımı.');
    }
    function get(client,u,ref){
      check();
      return client.get(u,ref,{}, {deadline:deadline,timeoutMs:Math.min(7500,Math.max(1,deadline-Date.now())),byteLimit:2097152})
        .then(function(r){check();return r.body;});
    }
    function follow(entry){
      return get(self.client,entry.url,page).then(function(body){
        var m=embed.exec(new root.URL(entry.url).pathname);
        if(!m)return packedVod(body,entry.url);
        var n=I.doc(body).querySelector('iframe[data-frame-src]');
        var url=n&&getUrl(n.getAttribute('data-frame-src'),entry.url,embedded,embed);
        if(!url||embed.exec(new root.URL(url).pathname)[1]!==m[1])throw fail('identity','Bölüm oynatıcı kimliği eşleşmedi.');
        return get(self.client,url,entry.url).then(function(playerBody){
          if(!/\bnew\s+Playerjs\(\s*\{/.test(playerBody))throw fail('decode','Bölümün etkin oynatıcısı bulunamadı.');
          var call=/\bfetch\(\s*(?=['"]\/dl\?op=get_stream[&])/.exec(playerBody);
          if(!call)throw fail('decode','Bölüm oynatma isteği bulunamadı.');
          var address=getUrl(I.literal(playerBody,call.index+call[0].length).value,url,embedded,/^\/dl$/);
          if(!address||param(address,'op')!=='get_stream'||!/^\d{1,12}$/.test(param(address,'view_id'))||!param(address,'hash'))
            throw fail('identity','Bölüm oynatma isteğinin biçimi geçersiz.');
          return get(self.client,address,url).then(function(text){
            var data=parsedJson(text);
            if(!data||typeof data!=='object'||Array.isArray(data))
              throw fail('decode','Oynatma sunucusunun yanıtı geçersiz.');
            if(data.error==='unauthorized')throw fail('access','Kaynak sunucusu oynatma isteğini reddetti.');
            if(data.error||!data.url)throw fail('unavailable','Kaynak sunucusu medya adresi vermedi.');
            if(typeof data.url!=='string')throw fail('decode','Yayın adresinin biçimi geçersiz.');
            var external=getUrl(data.url,url,episodeMedia,/^\/hls2\/.+\.m3u8$/i);
            var media=external||getUrl(data.url,url,embedded,/\.m3u8$/i);
            if(!media)throw fail('unsupported','Bölümün medya kökeni veya biçimi doğrulanamadı.');
            return {url:media,type:'hls',referer:external?embedded+'/':url,subtitles:[]};
          });
        });
      });
    }
    function publish(){out.options=rows;if(notify)notify(out);}
    return get(self.client,page,base+'/').then(function(pageBody){
      var d=I.doc(pageBody),node=d.querySelector('meta[property="og:url"]');
      if(!node||I.publicUrl(node.getAttribute('content'),page)!==page)throw fail('identity','Yanıt seçilen içerikle eşleşmedi.');
      var found=options(pageBody,page);
      rows=found.map(function(x){return {sourceId:x.id,label:x.label,status:'pending',stage:'embed'};});
      publish();
      return found.reduce(function(chain,e,index){return chain.then(function(){
        if(Date.now()>=deadline){rows[index].status='error';rows[index].stage='timeout';return;}
        return follow(e).then(function(media){
          return get(self.media,media.url,media.referer).then(function(hls){
            if(!/^\s*#EXTM3U/.test(hls))throw fail('manifest','HLS listesi açılmadı.');
            if(/SAMPLE-AES|KEYFORMAT="[^"]*(?:widevine|playready)/i.test(hls))throw fail('unsupported','Kaynak DRM gerektiriyor.');
            out.push({id:e.id,label:e.label,url:media.url,type:media.type,referer:media.referer,
              preferredEngine:'html5',packageKey:context.key,subtitles:media.subtitles});
            rows[index].status='ready';rows[index].stage='';
          });
        }).catch(function(error){
          if(generation!==self.generation)check();
          last=error;rows[index].status='error';rows[index].stage=error.stage||'network';
          rows[index].detail=root.PlayerCore.safeMessage(error.message);
        }).then(publish);
      });},Promise.resolve());
    }).then(function(){
      if(generation!==self.generation)check();
      if(out.length)return out;
      var error=last||fail('unavailable','Oynatılabilir kaynak bulunamadı.');
      error.sourceOptions=rows;throw error;
    });
  };
  context.registerResolver({create:function(){return new Resolver();}});
})(window);

