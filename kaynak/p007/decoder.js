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
