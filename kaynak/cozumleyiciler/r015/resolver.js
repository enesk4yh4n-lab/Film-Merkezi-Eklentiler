(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  var base = 'https://www.filmifullizle.news';
  var I = root.InertPlayerData;
  var moviePath = /^\/film\/[a-z0-9-]+\.html$/;
  var wrappers = /^\/smplayer\/(?:vid\/[a-f0-9]{32}|embed2\.php|vidmo\/vid\.php)$/;
  var families = { moly: 'Moly', okru: 'OK.ru', mailru: 'Mail.ru' };

 function fail(stage,message){var e=new Error('R015: '+message);e.stage=stage;return e;}
 function media(value,referer){var u=I.publicUrl(value,referer);if(!u)throw fail('decode','Geçersiz medya adresi.');return {url:u,type:'hls',referer:referer,subtitles:[]};}
 function ok(body,frame){
  var id=/^\/videoembed\/(\d+)\/?$/.exec(new root.URL(frame).pathname),nodes=I.doc(body).querySelectorAll('[data-options]'),data=null;
  if(!id)throw fail('identity','Geçersiz OK.ru video kimliği.');
  if(/\byandexError\(\s*['"](?:userNotFound|copyrightsRestricted|notFound|videoNotFound)['"]/.test(body)||/["']copyrightsRestricted["']\s*:\s*true/.test(body))throw fail('unavailable','OK.ru videosu kaldırılmış veya erişime kapalı.');
  for(var i=0;i<nodes.length;i++){try{var o=JSON.parse(nodes[i].getAttribute('data-options')),v=o.flashvars&&o.flashvars.metadata;v=typeof v==='string'?JSON.parse(v):v;if(v&&v.movie&&String(v.movie.movieId||v.movie.id)===id[1]){data=v;break;}}catch(ignore){}}
  if(!data)throw fail('decode','Aktif OK.ru video bilgisi okunamadı.');
  if(data.movie.notPublished||/blocked|deleted|copyright|restricted/i.test(String(data.movie.status||'')))throw fail('unavailable','OK.ru videosu bu yanıtta kullanılamıyor.');
  var result=media(data.hlsManifestUrl||data.ondemandHls||data.liveHlsManifestUrl,frame),p=new root.URL(result.url);
  if(!/(^|\.)(?:vkuser\.net|okcdn\.ru)$/.test(p.hostname))throw fail('identity','OK.ru medya kökeni uyuşmuyor.');
  var urls=[],seen={};(Array.isArray(data.failoverHosts)?data.failoverHosts:[]).slice(0,8).forEach(function(host){if(typeof host!=='string'||!/^vd[1-9][0-9]{0,3}\.okcdn\.ru$/.test(host)||urls.length>=2)return;var candidate=new root.URL(result.url);candidate.hostname=host;if(!seen[candidate.href]){seen[candidate.href]=true;urls.push(candidate.href);}});
  if(!seen[result.url])urls.push(result.url);result.fallbackUrls=urls;return result;
 }
 function vidmoly(body,frame){
  var id=/^\/embed-([a-z0-9]{8,32})\.html$/.exec(new root.URL(frame).pathname),doc=I.doc(body),values=[body].concat(I.unpack(body)),result=null;
  if(!id||!doc.querySelector('#vplayer'))throw fail('identity','Vidmoly aktif oynatıcısı tanınamadı.');
  values.some(function(s){var m=/\bjwplayer\(\s*['"]vplayer['"]\s*\)\s*\.setup\(\s*\{/.exec(s),alias=/\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*jwplayer\(\s*['"]vplayer['"]\s*\)/.exec(s);if(!m&&alias)m=new RegExp('\\b'+alias[1].replace(/\$/g,'\\$')+'\\s*\\.setup\\(\\s*\\{').exec(s);if(!m)return false;var active=s.slice(m.index+m[0].length,m.index+m[0].length+100000),file=/\bsources\s*:\s*\[\s*\{\s*file\s*:\s*/.exec(active);if(!file)return false;var u=I.publicUrl(I.literal(active,file.index+file[0].length).value,frame),p=u&&new root.URL(u);if(!p||!new RegExp('/'+id[1]+'(?:_|/)').test(p.pathname))throw fail('identity','Vidmoly medya kimliği uyuşmuyor.');result=media(u,frame);return true;});
  if(!result)throw fail('decode','Vidmoly aktif HLS ayarı bulunamadı.');
  var marker=/\bvar\s+baseTracks\s*=\s*\[/.exec(body),start=marker&&marker.index+marker[0].length,end=start,seen={};
  if(marker){for(;end<body.length&&end<start+65536;end++){var ch=body.charAt(end);if(ch==='"'||ch==="'")end=I.literal(body,end).end-1;else if(ch===']')break;}if(body.charAt(end)!==']')throw fail('decode','Vidmoly altyazı verisi eksik.');var re=/\{([^{}]{0,8192})\}/g,m;while((m=re.exec(body.slice(start,end)))&&result.subtitles.length<32){var item=m[1];function field(name){var match=new RegExp('(?:^|[,\\s])(?:'+name+'|["\u0027]'+name+'["\u0027])\\s*:\\s*').exec(item);return match?I.literal(item,match.index+match[0].length).value:'';}if(field('kind')!=='captions')continue;var track=I.publicUrl(field('file'),frame),p=track&&new root.URL(track),label=root.CatalogUtils.clean(field('label'));if(!p||p.hostname!=='srt.vidmoly.me'||!new RegExp('^/srt/[0-9]+/'+id[1]+'_[A-Za-z0-9_-]+\\.vtt$').test(p.pathname)||seen[track])continue;seen[track]=true;result.subtitles.push({id:'r015-vm-sub-'+result.subtitles.length,url:track,label:label||'Altyazı',language:/turkish|türkçe/i.test(label)?'tr':/english/i.test(label)?'en':'',format:'vtt',packageKey:context.key});}}
  return result;
 }

  function embed(value, page) {
    var u = I.publicUrl(value, page);
    if (!u) return '';
    var p = new root.URL(u);
    if (p.port || p.hash) return '';
    if (p.origin === base && wrappers.test(p.pathname)) return u;
    if (/^vidmoly\.(?:biz|me|org|to|net)$/.test(p.hostname) && /^\/embed-[a-z0-9]{8,32}\.html$/.test(p.pathname)) return u;
    if (p.hostname === 'ok.ru' && /^\/videoembed\/\d+\/?$/.test(p.pathname)) return u;
    if (p.hostname === 'my.mail.ru' && /^\/video\/embed\/\d+\/?$/.test(p.pathname)) return u;
    return '';
  }

  function options(body, page) {
    var doc = I.doc(body);
    var out = [];
    Array.prototype.forEach.call(doc.querySelectorAll('.filmplus_sources .sources span[id^=source][dil]'), function (node) {
      var key = node.getAttribute('id');
      var family = root.CatalogUtils.clean(node.textContent).toLowerCase();
      var label = Object.prototype.hasOwnProperty.call(families, family) && families[family];
      var language = node.getAttribute('dil');
      if (!label || !/^source\d{1,3}$/.test(key) || !/^(trd|tra)$/.test(language)) return;
      var click = new RegExp('\\$\\(\\s*["\']#' + key + '["\']\\s*\\)\\s*\\.click\\(').exec(body);
      var script = click && body.slice(click.index, click.index + 4096).split(/<\/script\s*>/i)[0];
      // Also accepts the theme's unescaped single quotes in iframe attributes.
      var match = script && /\$\(['"]\.video-container['"]\)\.html\(\s*['"](?:<!--[^>]*-->\s*)?<iframe\b[^>]*\bsrc\s*=\s*['"]([^'"]+)/i.exec(script);
      var url = match && embed(match[1].replace(/&amp;/g, '&'), page);
      if (!url && /(?:^|\s)current_dil(?:\s|$)/.test(node.className)) {
        var frame = doc.querySelector('.inepisode .video-container iframe[data-frame-src]');
        url = frame && embed(frame.getAttribute('data-frame-src'), page);
      }
      out.push({ sourceId: 'r015-' + key, family: family, url: url, label: label + (language === 'trd' ? ' · Türkçe Dublaj' : ' · Türkçe Altyazılı') });
    });
    return out;
  }

  function Resolver() {
    this.text = context.createClient();
    this.media = context.createClient({ media: true });
    this.generation = 0;
  }

  Resolver.prototype.cancel = function () {
    this.generation++;
    this.text.cancel();
    this.media.cancel();
    if (this.probe) { this.probe.destroy(); this.probe = null; }
  };

  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    this.cancel();
    var self = this;
    var generation = this.generation;
    var progress = root.SourceProgress ? new root.SourceProgress(notify, hints) : null;
    var page = I.publicUrl(content.pageUrl);
    var parsed = page && new root.URL(page);
    var output = [], rows = [], last;
    if (!parsed || parsed.origin !== base || parsed.search || !moviePath.test(parsed.pathname))
      return Promise.reject(fail('page', 'Geçersiz film bağlantısı.'));
    parsed.hash = '';
    page = parsed.href;
    deadline = Math.min(deadline || Infinity, Date.now() + 30000);

    function check() {
      if (generation !== self.generation) {
        var error = fail('cancel', 'İptal edildi.');
        error.cancelled = true;
        throw error;
      }
      if (Date.now() >= deadline) throw fail('timeout', 'Kaynak zaman aşımı.');
    }

    function get(client, url, referer) {
      var request = progress ? progress.client(client, check, deadline) : client;
      check();
      return request.get(url, referer, {}, {
        deadline: deadline, timeoutMs: Math.min(6000, Math.max(1, deadline - Date.now())),
        byteLimit: 2097152
      }).then(function (response) { check(); return response; });
    }

    function mail(body, frame) {
      var p = new root.URL(frame);
      var id = /^\/video\/embed\/(\d+)\/?$/.exec(p.pathname)[1];
      var token = /"metadataUrl"\s*:\s*/.exec(body);
      if (!token) throw fail('unavailable', 'Mail.ru bu video için oynatma bilgisi sunmuyor.');
      var meta = I.publicUrl(I.literal(body, token.index + token[0].length).value, frame);
      var u = meta && new root.URL(meta);
      if (!u || u.origin !== p.origin || u.pathname !== '/+/video/meta/' + id) throw fail('identity', 'Mail.ru video kimliği uyuşmuyor.');
      return get(self.text, meta, frame).then(function (r) {
        var data;
        try { data = JSON.parse(r.body); } catch (ignore) { throw fail('decode', 'Mail.ru video bilgisi okunamadı.'); }
        var videos = Array.isArray(data.videos) ? data.videos : [];
        var available = videos.map(function (v) { return { url: I.publicUrl(v.url, frame), height: parseInt(v.key, 10) || 0 }; })
          .filter(function (v) { return v.url && /^cdn[0-9]+\.my\.mail\.ru$/.test(new root.URL(v.url).hostname); })
          .sort(function (a, b) { return (b.height <= 720 ? b.height : -b.height) - (a.height <= 720 ? a.height : -a.height); });
        if (!available.length) throw fail('unavailable', 'Mail.ru yanıtında kullanılabilir video yok.');
        return { type: 'mp4', url: available[0].url, referer: frame, subtitles: [] };
      });
    }

    function follow(row, url, ref, depth) {
      if (!url || depth > 4) return Promise.reject(fail('embed', 'Oynatıcı bağlantısı eksik.'));
      return get(self.text, url, ref).then(function (response) {
        var body = response.body;
        var host = new root.URL(url).hostname;
        if (host === 'ok.ru' && row.family === 'okru') return ok(body, url);
        if (host === 'my.mail.ru' && row.family === 'mailru') return mail(body, url);
        if (/^vidmoly\./.test(host) && row.family === 'moly') return vidmoly(body, url);
        if (host !== new root.URL(base).hostname) throw fail('identity', 'Oynatıcı kaynak kimliği uyuşmuyor.');
        var doc = I.doc(body);
        var frame = doc.querySelector('#player_area #player iframe[data-frame-src], #player iframe[data-frame-src], iframe[data-frame-src]');
        var next = frame && embed(frame.getAttribute('data-frame-src'), url);
        if (next) return follow(row, next, url, depth + 1);
        throw fail('decode', 'Oynatıcı yalnızca desteklenmeyen bir yanıt döndürdü.');
      });
    }

    function validate(data) {
      if (data.type === 'mp4') {
        var session = self.probe || (self.probe = root.PackageMediaLoader.open({ packageKey: context.key }));
        return session.request(data.url, {
          kind: 'frag', binary: true, referer: data.referer,
          rangeStart: 0, rangeEnd: 512, byteLimit: 4096,
          timeoutMs: Math.min(6000, Math.max(1, deadline - Date.now())), deadline: deadline
        }).promise.then(function (r) {
          check();
          var bytes = r.data && new Uint8Array(r.data);
          if (r.status !== 206 || !bytes || bytes.length < 8 ||
              String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) !== 'ftyp')
            throw fail('media', 'Video sunucusu MP4 aralığını doğrulamadı.');
          return data;
        });
      }
      return get(self.media, data.url, data.referer).then(function (r) {
        if (!/^\s*#EXTM3U/.test(r.body)) throw fail('manifest', 'HLS oynatma listesi açılmadı.');
        if (/SAMPLE-AES|KEYFORMAT="[^"]*(?:widevine|playready)/i.test(r.body))
          throw fail('unsupported', 'Bu kaynak DRM gerektiriyor.');
        return data;
      });
    }

    function finish() {
      output.options = rows;
      if (self.probe) { self.probe.destroy(); self.probe = null; }
      if (output.length) return output;
      var error = last || fail('unavailable', 'Oynatılabilir film kaynağı bulunamadı.');
      error.sourceOptions = rows;
      throw error;
    }

    return get(self.text, page, base + '/').then(function (response) {
      var list = options(response.body, page);
      rows = list.map(function (r) { return { sourceId: r.sourceId, label: r.label, status: 'pending', stage: 'embed' }; });
      var cursor = 0;
      function next() {
        if (cursor >= list.length) return finish();
        if (Date.now() >= deadline) {
          rows.slice(cursor).forEach(function (row) {
            row.status = 'error';
            row.stage = 'timeout';
            row.detail = 'Kaynak tarama süresi doldu.';
          });
          if (progress) progress.publish(output, rows);
          return finish();
        }
        check();
        var entry = list[cursor], row = rows[cursor++];
        return follow(entry, entry.url, page, 0).then(validate).then(function (data) {
          var stream = { id: entry.sourceId, label: entry.label, url: data.url, type: data.type,
            referer: data.referer, packageKey: context.key, preferredEngine: 'html5', subtitles: data.subtitles || [] };
          if (entry.family === 'okru' && data.fallbackUrls.length > 1) {
            stream.loaderId = 'okru-failover';
            stream.loaderConfig = { hosts: data.fallbackUrls.map(function (u) { return new root.URL(u).hostname; }) };
            stream.playbackRequirements = { customLoader: true, requiredHeaders: [] };
          }
          output.push(stream);
          row.status = 'ready';
          row.stage = '';
        }, function (error) {
          if (generation !== self.generation) check();
          last = error;
          row.status = 'error';
          row.stage = error.stage || 'network';
          row.detail = root.PlayerCore.safeMessage(error.message);
        }).then(function () {
          if (progress) progress.publish(output, rows);
          else if (notify) { output.options = rows; notify(output); }
          return next();
        });
      }
      return next();
    });
  };

  context.registerResolver({ create: function () { return new Resolver(); } });
})(window);

