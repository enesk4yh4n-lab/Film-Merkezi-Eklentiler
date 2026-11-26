(function (root) {
  'use strict';
  var context=root.FilmPlugins.context(), I=root.InertPlayerData;
  var base='https://www.hdfilmcehennemi2.biz', vipOrigin='https://vidload.top';
  var movie=/^\/(?:[a-z0-9]+-)*[a-z0-9]+-izle(?:-[a-z0-9]+)*\/?$/;
  var episode=/^\/dizi\/[a-z0-9-]+\/sezon-[1-9]\d*\/bolum-[1-9]\d*\/?$/;
  var vipHost=/(?:^|\.)(?:haccodavayup\.shop|pictureupfans\.site)$/i;
  var molyHost=/^vidmoly\.(?:net|biz|me)$/;
  var molyMedia=/(?:^|\.)(?:upvm\.online|vmpx\.online|vmnow\.online)$/i;
  function fail(stage,message){var e=Error('R019: '+message);e.stage=stage;return e;}
  function pathKey(path){return path.replace(/^\/|\/$/g,'');}
  function data(text, pattern) {
    var start=pattern.exec(text);
    if(!start)throw fail('decode','Player data unavailable.');
    return JSON.parse(I.literal(text,start.index+start[0].length).value);
  }
  function entries(body,url) {
    var doc=I.doc(body), node=doc.querySelector('main [data-video-player]'), canonical=doc.querySelector('meta[property="og:url"]');
    var current=new root.URL(url), own=I.publicUrl(canonical&&canonical.content,url), p=own&&new root.URL(own);
    if(!p||p.origin!==base||pathKey(p.pathname)!==pathKey(current.pathname))throw fail('identity','Content page mismatch.');
    if(!node)throw fail('unavailable','No full-content player on this page.');
    var options=data(node.getAttribute('x-data')||'',/^videoPlayerData\(\s*JSON\.parse\(\s*/), out=[], seen={};
    Object.keys(options).slice(0,8).forEach(function(language) {
      if(!/^(?:dual|tr|en|dublaj|altyazi|dub|sub|original)$/.test(language)||!Array.isArray(options[language]))return;
      options[language].slice(0,16).forEach(function(row) {
        if(!row||typeof row.slug!=='string'||pathKey(row.slug)!==pathKey(current.pathname)||typeof row.link!=='string'||
           !/^[a-z0-9]{8,64}$/i.test(row.link)||typeof row.template!=='string'||row.template.length>4096||
           !/^[A-Za-z0-9+/=]+$/.test(row.template))return;
        var template=I.doc(root.atob(row.template)), iframe=template.querySelector('iframe');
        var raw=iframe&&(iframe.getAttribute('data-frame-src')||iframe.getAttribute('data-src'));
        if(!raw||raw.indexOf('{url}')<0)return;
        var frame=I.publicUrl(raw.replace('{url}',row.link).replace('{slug}',row.slug),url), target=frame&&new root.URL(frame);
        var family=row.service_slug;
        if(!target||target.port||target.hash||target.search||
          !(family==='vip'&&target.origin===vipOrigin&&target.pathname==='/player/'+row.link||
            family==='moly'&&molyHost.test(target.hostname)&&target.pathname==='/embed-'+row.link+'.html'))return;
        var id='r019-'+family+'-'+language+'-'+row.link;
        if(seen[id])return;seen[id]=true;
        out.push({id:id,url:frame,link:row.link,family:family,label:(family==='vip'?'VIP':'Moly')+(language==='dual'?'': ' / '+language.toUpperCase())});
      });
    });
    if(!out.length)throw fail('unavailable','No supported source option.');
    return out;
  }
  function captions(raw,frame,allowed) {
    if(!Array.isArray(raw))return [];
    return raw.slice(0,32).map(function(track,index){
      var url=track&&track.kind==='captions'&&I.publicUrl(track.file,frame), p=url&&new root.URL(url);
      var ext=p&&/\.(vtt|srt)$/i.exec(p.pathname);
      if(!ext||!allowed.test(p.hostname)||p.port||p.hash)return null;
      var label=String(track.label||'Subtitle').slice(0,80);
      return {id:'r019-sub-'+index,url:url,label:label,language:/turkish|t\u00fcrk\u00e7e|^tr$/i.test(label)?'tr':/english|ingilizce|^en$/i.test(label)?'en':'',
        format:ext[1].toLowerCase(),referer:frame,packageKey:context.key};
    }).filter(Boolean);
  }
  function checkedMedia(file,frame,link,allowed) {
    var url=I.publicUrl(file,frame), p=url&&new root.URL(url);
    if(!p||p.port||p.hash||!allowed.test(p.hostname)||!new RegExp('/'+link+'(?:/|_)','i').test(p.pathname)||!/\.m3u8$/i.test(p.pathname))
      throw fail('policy','Media host or identity mismatch.');
    return url;
  }
  function vip(body,frame,link) {
    if(!I.doc(body).querySelector('#player'))throw fail('identity','VIP player not found.');
    var config=data(body,/\bjwplayer\(\s*['"]player['"]\s*\)\s*\.setup\(\s*JSON\.parse\(\s*/);
    return {url:checkedMedia(config.file,frame,link,vipHost),subtitles:captions(config.tracks,frame,vipHost)};
  }
  function moly(body,frame,link) {
    if(!I.doc(body).querySelector('#vplayer'))throw fail('identity','Moly player not found.');
    var snippets=[body].concat(I.unpack(body)), result;
    snippets.some(function (snippet) {
      var setup=/\bjwplayer\(\s*['"]vplayer['"]\s*\)\s*\.setup\(\s*\{/.exec(snippet);
      var alias=/\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*jwplayer\(\s*['"]vplayer['"]\s*\)/.exec(snippet);
      if(!setup&&alias)setup=new RegExp('\\b'+alias[1].replace(/\$/g,'\\$')+'\\s*\\.setup\\(\\s*\\{').exec(snippet);
      if(!setup)return false;
      var start=setup.index+setup[0].length, config=snippet.slice(start,start+80000);
      var file=/\bsources\s*:\s*\[\s*\{\s*file\s*:\s*/.exec(config);
      if(!file)return false;
      result=checkedMedia(I.literal(config,file.index+file[0].length).value,frame,link,molyMedia);
      return true;
    });
    if(!result)throw fail('unavailable','Moly returned no active HLS stream.');
    return {url:result,subtitles:[]};
  }
  function Resolver(){this.client=context.createClient();this.media=context.createClient({media:true});this.generation=0;}
  Resolver.prototype.cancel=function(){this.generation++;this.client.cancel();this.media.cancel();};
  Resolver.prototype.resolve=function(content,deadline,notify){
    this.cancel();
    var self=this, generation=this.generation, url=I.publicUrl(content.pageUrl), page=url&&new root.URL(url), out=[], options=[], last;
    if(!page||page.origin!==base||page.search||page.hash||(!movie.test(page.pathname)&&!episode.test(page.pathname)))return Promise.reject(fail('page','Invalid content page.'));
    deadline=Math.min(deadline||Infinity,Date.now()+30000);
    function check(){
      if(generation!==self.generation){var error=fail('cancel','Cancelled.');error.cancelled=true;throw error;}
      if(Date.now()>=deadline)throw fail('timeout','Source timed out.');
    }
    function get(client,address,referer) {
      check();
      return client.get(address,referer,{}, {deadline:deadline,timeoutMs:Math.min(7500,deadline-Date.now()),byteLimit:2097152}).then(function(response){check();return response;});
    }
    function publish(){out.options=options;if(notify)notify(out);}
    return get(self.client,url,base+'/').then(function(response){
      var sources=entries(response.body,url);
      options=sources.map(function(row){return {sourceId:row.id,label:row.label,status:'pending',stage:'embed'};});
      publish();
      return sources.reduce(function(chain,row,index){return chain.then(function(){
        return Promise.resolve().then(function(){return get(self.client,row.url,url);}).then(function(frame){
          var referer=I.publicUrl(frame.url||row.url), target=referer&&new root.URL(referer);
          if(!target||!(row.family==='vip'?target.origin===vipOrigin:molyHost.test(target.hostname))||
            target.pathname!==new root.URL(row.url).pathname)throw fail('identity','Player redirect mismatch.');
          var asset=row.family==='vip'?vip(frame.body,referer,row.link):moly(frame.body,referer,row.link);
          return get(self.media,asset.url,referer).then(function(playlist){
            if(!/^\s*#EXTM3U/.test(playlist.body))throw fail('manifest','Invalid HLS manifest.');
            if(/SAMPLE-AES|KEYFORMAT="[^"]*(?:widevine|playready)/i.test(playlist.body))throw fail('unsupported','Unsupported protected stream.');
            out.push({id:row.id,label:row.label,url:asset.url,type:'hls',referer:referer,packageKey:context.key,
              preferredEngine:'html5',subtitles:asset.subtitles});
            options[index].status='ready';options[index].stage='';
          });
        }).catch(function(error){
          if(generation!==self.generation)check();
          last=error;options[index].status='error';options[index].stage=error.stage||'network';
          options[index].detail=root.PlayerCore.safeMessage(error.message);
        }).then(publish);
      });},Promise.resolve());
    }).then(function(){
      if(generation!==self.generation)check();
      if(out.length)return out;
      var error=last||fail('unavailable','No playable source.');
      error.sourceOptions=options;throw error;
    });
  };
  context.registerResolver({create:function(){return new Resolver();}});
})(window);
