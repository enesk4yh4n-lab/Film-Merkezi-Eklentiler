/* Package-owned literal adapters. Remote scripts are never executed. */
(function(root){
 'use strict';var I=root.InertPlayerData;
 function fail(stage,message){var e=new Error('R013: '+message);e.stage=stage;return e;}
 function media(value,referer){var u=I.publicUrl(value,referer);if(!u)throw fail('decode','Geçersiz medya adresi.');return {url:u,type:'hls',referer:referer,subtitles:[]};}
 function dzen(body,frame){
  var id=/^\/embed\/([A-Za-z0-9_-]{8,80})$/.exec(new root.URL(frame).pathname),meta=I.doc(body).querySelector('meta[property="og:vh-uuid"]'),re=/\bvar\s+_params\s*=\s*\(\s*/g,m,data=null;
  if(!id||!meta||meta.content!==id[1])throw fail('identity','Dzen video kimliği uyuşmuyor.');
  while((m=re.exec(body))){var v=I.object(body.slice(m.index),/^var\s+_params\s*=\s*\(\s*/);v=v.ssrData&&v.ssrData.exportResponse&&v.ssrData.exportResponse.content;if(v&&v.content_id===id[1]){data=v;break;}}
  var stream=data&&Array.isArray(data.streams)&&data.streams.filter(function(s){return s.type==='hls'&&I.publicUrl(s.url);})[0];
  if(!stream)throw fail('unavailable','Dzen bu video için HLS kaynağı vermedi.');return media(stream.url,frame);
 }
 function ok(body,frame){
  var id=/^\/videoembed\/(\d+)\/?$/.exec(new root.URL(frame).pathname),nodes=I.doc(body).querySelectorAll('[data-options]'),data=null;
  if(!id)throw fail('identity','Geçersiz OK.ru video kimliği.');
  if(/\byandexError\(\s*['"](?:userNotFound|copyrightsRestricted|notFound|videoNotFound)['"]/.test(body)||/["']copyrightsRestricted["']\s*:\s*true/.test(body))throw fail('unavailable','OK.ru videosu kaldırılmış veya erişime kapalı.');
  for(var i=0;i<nodes.length;i++){try{var o=JSON.parse(nodes[i].getAttribute('data-options')),v=o.flashvars&&o.flashvars.metadata;v=typeof v==='string'?JSON.parse(v):v;if(v&&v.movie&&String(v.movie.movieId||v.movie.id)===id[1]){data=v;break;}}catch(ignore){}}
  if(!data)throw fail('decode','Aktif OK.ru video bilgisi okunamadı.');
  if(data.movie.notPublished||/blocked|deleted|copyright|restricted/i.test(String(data.movie.status||'')))throw fail('unavailable','OK.ru videosu bu yanıtta kullanılamıyor.');
  var result=media(data.hlsManifestUrl||data.ondemandHls||data.liveHlsManifestUrl,frame),p=new root.URL(result.url);
  if(!/(^|\.)(?:vkuser\.net|okcdn\.ru)$/.test(p.hostname))throw fail('identity','OK.ru medya kökeni uyuşmuyor.');return result;
 }
 function vidmoly(body,frame){
  var id=/^\/embed-([a-z0-9]{8,32})\.html$/.exec(new root.URL(frame).pathname),doc=I.doc(body),values=[body].concat(I.unpack(body)),result=null;
  if(!id||!doc.querySelector('#vplayer'))throw fail('identity','Vidmoly aktif oynatıcısı tanınamadı.');
  values.some(function(s){var m=/\bjwplayer\(\s*['"]vplayer['"]\s*\)\s*\.setup\(\s*\{/.exec(s),alias=/\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*jwplayer\(\s*['"]vplayer['"]\s*\)/.exec(s);if(!m&&alias)m=new RegExp('\\b'+alias[1].replace(/\$/g,'\\$')+'\\s*\\.setup\\(\\s*\\{').exec(s);if(!m)return false;var active=s.slice(m.index+m[0].length,m.index+m[0].length+100000),file=/\bsources\s*:\s*\[\s*\{\s*file\s*:\s*/.exec(active);if(!file)return false;var u=I.publicUrl(I.literal(active,file.index+file[0].length).value,frame),p=u&&new root.URL(u);if(!p||!new RegExp('/'+id[1]+'(?:_|/)').test(p.pathname))throw fail('identity','Vidmoly medya kimliği uyuşmuyor.');result=media(u,frame);return true;});
  if(!result)throw fail('decode','Vidmoly aktif HLS ayarı bulunamadı.');
  var marker=/\bvar\s+baseTracks\s*=\s*\[/.exec(body),start=marker&&marker.index+marker[0].length,end=start,seen={};
  if(marker){for(;end<body.length&&end<start+65536;end++){var ch=body.charAt(end);if(ch==='"'||ch==="'")end=I.literal(body,end).end-1;else if(ch===']')break;}if(body.charAt(end)!==']')throw fail('decode','Vidmoly altyazı verisi eksik.');var re=/\{([^{}]{0,8192})\}/g,m;while((m=re.exec(body.slice(start,end)))&&result.subtitles.length<32){var item=m[1];function field(name){var match=new RegExp('(?:^|[,\\s])(?:'+name+'|["\u0027]'+name+'["\u0027])\\s*:\\s*').exec(item);return match?I.literal(item,match.index+match[0].length).value:'';}if(field('kind')!=='captions')continue;var track=I.publicUrl(field('file'),frame),p=track&&new root.URL(track),label=root.CatalogUtils.clean(field('label'));if(!p||p.hostname!=='srt.vidmoly.me'||!new RegExp('^/srt/[0-9]+/'+id[1]+'_[A-Za-z0-9_-]+\\.vtt$').test(p.pathname)||seen[track])continue;seen[track]=true;result.subtitles.push({id:'r013-vm-sub-'+result.subtitles.length,url:track,label:label||'Altyazı',language:/turkish|türkçe/i.test(label)?'tr':/english/i.test(label)?'en':'',format:'vtt',packageKey:context.key});}}
  return result;
 }
 function youtubeMetadata(body,id){
  var data;try{data=JSON.parse(body);}catch(ignore){throw fail('decode','YouTube video bilgisi okunamadı.');}
  if(!data||data.type!=='video'||data.provider_name!=='YouTube'||typeof data.html!=='string'||typeof data.title!=='string')throw fail('decode','YouTube video bilgisi eksik.');
  var frame=I.doc(data.html).querySelector('iframe'),u=frame&&I.publicUrl(frame.getAttribute('data-frame-src')),p=u&&new root.URL(u);
  if(!p||p.hostname!=='www.youtube.com'||p.pathname!=='/embed/'+id)throw fail('identity','YouTube video kimliği uyuşmuyor.');
  var title=root.CatalogUtils.clean(data.title);
  if(/\bofficial[\s:-]+(?:(?:teaser|final)[\s:-]+)?(?:trailer|teaser)\b|resm[iî][\s:-]+fragman/i.test(title))throw fail('unavailable','Bu sayfadaki YouTube videosu fragmandır; tam film veya bölüm kaynağı değildir.');
  throw fail('unsupported','Bu YouTube videosunun tam içerik oynatılması henüz doğrulanamadı.');
 }
 root.PackageMediaExtra={dzen:dzen,ok:ok,vidmoly:vidmoly,youtubeMetadata:youtubeMetadata};
})(window);
