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
/* saglayicilar/p011/decoder.js */
/* Vixolity's literal encoding is decoded as text, never as JavaScript. */
(function(root){
 'use strict';
 function literal(s){return s.replace(/\\(x[0-9a-f]{2}|u[0-9a-f]{4}|[\\/'"])/gi,function(all,v){return v.charAt(0)==='x'||v.charAt(0)==='u'?String.fromCharCode(parseInt(v.slice(1),16)):v;});}
 function media(html){
  var re=/\(function\([^)]*\)\{([\s\S]*?)\}\)\('([0-9a-f]+)',\s*(\d{1,3})\);/gi,m,call,text,hex,shift,ascii,i,decoded,match;
  while((m=re.exec(html))){
   text=m[1];if(m[0].length>1024*1024||!text.match(/charCodeAt/)||!text.match(/reverse\(/)||!text.match(/atob\(/))continue;
   call=[m[0],m[2],m[3]];if(call[1].length%2)continue;
   hex=call[1];shift=Number(call[2]);if(shift>255)continue;ascii='';for(i=0;i<hex.length;i+=2)ascii+=String.fromCharCode(parseInt(hex.substr(i,2),16));ascii=ascii.split('').reverse().join('');
   if(!/^[A-Za-z0-9+/]+={0,2}$/.test(ascii)||ascii.length%4)continue;
   try{decoded=root.atob(ascii);}catch(ignore){continue;}
   text='';for(i=0;i<decoded.length;i++)text+=String.fromCharCode((decoded.charCodeAt(i)-shift+256)%256);
   match=/^\s*setupJWPlayer\(\s*['"]playerArea['"]\s*,\s*\{\s*file\s*:\s*'((?:\\(?:x[0-9a-f]{2}|u[0-9a-f]{4}|[\\/'"])|[^'\\\r\n])*)'\s*,/i.exec(text);
   if(!match)continue;var url=literal(match[1]);if(/^https:\/\/ha\.vixolity\.com\/vs\/[A-Za-z0-9_-]+(?:\/s[1-9]\d*\/e0*[1-9]\d*)?$/.test(url))return url;
  }throw new Error('Vixolity kaynak verisi çözümlenemedi.');
 }
 root.HdfilmDelisiDecoder={media:media};
})(window);


/* Updated Vixolity data encoding. Decoded text is never executed. */
(function(root){
 'use strict';var old=root.HdfilmDelisiDecoder.media;
 root.HdfilmDelisiDecoder.media=function(html){try{return old(html);}catch(legacyError){var m=/\}\)\('([0-9a-f]{2,1048576})',\s*(\d{1,3})\);/i.exec(html),hex,bytes='',encoded,shift,inner='',i,decoded,settings;if(!m||m[1].length%2||!documentOrPlayer(html))throw legacyError;hex=m[1];shift=Number(m[2]);if(shift>255)throw legacyError;for(i=0;i<hex.length;i+=2)bytes+=String.fromCharCode(parseInt(hex.slice(i,i+2),16));encoded=root.atob(bytes.split('').reverse().join(''));for(i=0;i<encoded.length;i++)inner+=String.fromCharCode(encoded.charCodeAt(i)-shift);decoded=root.atob(inner);settings=root.InertPlayerData.object(decoded,/\bvar\s+AYAR\s*=\s*/);if(!settings||!/^https:\/\/ha\.vixolity\.com\/vs\/[A-Za-z0-9_-]+(?:\/s[1-9]\d*\/e0*[1-9]\d*)?$/.test(settings.kaynak||''))throw new Error('R009: doğrulanmış medya alanı bulunamadı.');return settings.kaynak;}};
 function documentOrPlayer(html){return /<div\s+id=["']oynatici["']/.test(html)&&/charCodeAt/.test(html)&&/reverse\(/.test(html);}
})(window);
/* saglayicilar/p011/resolver.js */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var e = new Error('HDFilmDelisi · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.network = root.ChainNetwork.createClient({ destination: 'downloads' });
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.network.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      P = {base:'https://hdfilmdelisi1.com',contentUrl:function(value){try{var u=new root.URL(value);return u.origin==='https://hdfilmdelisi1.com'&&!u.search&&!u.hash&&/^\/(?:film|dizi)\/[a-z0-9-]+(?:\/sezon-[1-9]\d*\/bolum-[1-9]\d*)?$/.test(u.pathname)?u.href:'';}catch(e){return '';}}},
      embed,
      media;
    if (!P.contentUrl(content.pageUrl))
      return Promise.reject(fail('scope', 'Geçersiz film/bölüm adresi.'));
    if (this.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    var progress = root.SourceProgress && new root.SourceProgress(onProgress, hints),
      network =
        progress && progress.client ? progress.client(self.network, check, deadline) : self.network;
    function get(url, ref, stage, parse) {
      check();
      self.log('HDFilmDelisi: ' + stage);
      return network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }).then(
        function (r) {
          check();
          try {
            return parse(r);
          } catch (e) {
            e.stage = stage;
            throw e;
          }
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    return get(content.pageUrl, P.base + '/', 'page', function (r) {
      embed = root.HdfilmDelisiData.player(r.body).url;
      return embed;
    })
      .then(function () {
        return get(embed, content.pageUrl, 'embed', function (r) {
          media = root.HdfilmDelisiDecoder.media(r.body);
          return media;
        });
      })
      .then(function () {
        return get(media, embed, 'manifest', function (r) {
          if (!/^\s*#EXTM3U/.test(r.body))
            throw fail('manifest', 'Geçerli HLS manifesti alınamadı.');
          var nativeBackward = /\bTizen 7\.0(?:[; )]|$)/i.test(shared.navigator && shared.navigator.userAgent || '');
          return [
            {
              id: 'hdfilmdelisi-vixolity',
              label: 'Vixolity',
              url: media,
              referer: embed,
              userAgent: 'Mozilla/5.0',
              destination: 'downloads',
              type: 'hls',
              status: 'ready',
              transport: 'native',
              packageKey: context.key,
              preferredEngine: nativeBackward ? 'avplay' : 'html5',
              avplayBackwardSeek: nativeBackward ? 'relative' : undefined,
              seekMode: 'media-event',
              subtitles: [],
            },
          ];
        });
      });
  };
  root.HdfilmDelisiSourceResolver = Resolver;
})(window);



context.registerResolver({create:function(ctx,log,now){return new window.HdfilmDelisiSourceResolver(log,now);}});
})(window);
