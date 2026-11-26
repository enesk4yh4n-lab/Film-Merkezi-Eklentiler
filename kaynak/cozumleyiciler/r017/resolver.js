(function (shared) {
'use strict';
var context=shared.FilmPlugins.context();
var window={URL:shared.URL,InertPlayerData:shared.InertPlayerData,PlayerCore:shared.PlayerCore};
/* Public guest player metadata; no remote scripts or account data. */
(function (root) {
  'use strict';
  var I = root.InertPlayerData;
  function fail(stage, message) { var e = new Error('YouTube: ' + message); e.stage = stage; return e; }
  function mediaUrl(value) {
    var url = I.publicUrl(value);
    return url && /(^|\.)googlevideo\.com$/.test(new root.URL(url).hostname) ? url : '';
  }
  function visitor(body) {
    var found = /"VISITOR_DATA"\s*:\s*("(?:\\.|[^"\\])*")/.exec(body) || /"visitorData"\s*:\s*("(?:\\.|[^"\\])*")/.exec(body), value;
    if (!found) throw fail('session', 'Anonim oynatıcı bilgisi bulunamadı.');
    try { value = JSON.parse(found[1]); } catch (ignore) { throw fail('session', 'Anonim oynatıcı bilgisi okunamadı.'); }
    if (typeof value !== 'string' || !/^[A-Za-z0-9_+/=%-]{1,2048}$/.test(value)) throw fail('session', 'Geçersiz anonim oynatıcı bilgisi.');
    return value;
  }
  function closeConnection(url) {
    var path = new root.URL(url).pathname, fields = /\/(?:sparams|lsparams)\/([^/]+)/g, found;
    while ((found = fields.exec(path))) {
      var names; try { names = decodeURIComponent(found[1]).split(','); } catch (ignore) { throw fail('decode', 'HLS aktarım bilgisi okunamadı.'); }
      if (names.indexOf('keepalive') >= 0) return url;
    }
    return url.replace(/\/keepalive\/yes(?=\/|$)/g, '/keepalive/no');
  }
  function choose(data, id) {
    if (!data) throw fail('decode', 'YouTube yanıtı yok.');
    var status = data.playabilityStatus || {};
    if (status.status !== 'OK') throw fail(status.status === 'LOGIN_REQUIRED' ? 'auth' : 'access', status.reason || 'Video bu istemcide kullanılamıyor.');
    if (!data.videoDetails || data.videoDetails.videoId !== id) throw fail('decode', 'YouTube video kimliği uyuşmuyor.');
    var streaming = data.streamingData || {};
    var direct = (streaming.formats || []).filter(function (f) {
      return mediaUrl(f.url) && !f.signatureCipher && !f.cipher && (!f.drmFamilies || !f.drmFamilies.length) &&
        /^video\/mp4; codecs="avc1\.[a-f0-9]+,\s*mp4a\.40\.2"$/i.test(f.mimeType) && f.height > 0 && f.height <= 1080;
    }).sort(function (a, b) { return Math.abs(a.height - 720) - Math.abs(b.height - 720); });
    if (direct.length) return { url: mediaUrl(direct[0].url), type: 'mp4', referer: '', youtubeId: id, packageKey: context.key, preferredEngine: 'avplay', mp4Verified: false, engineSupport: { html5: 'unverified', avplay: 'candidate' }, subtitles: [] };
    var hls = mediaUrl(streaming.hlsManifestUrl);
    if (hls) return { url: closeConnection(hls), type: 'hls', referer: '', youtubeId: id, packageKey: context.key, preferredEngine: 'avplay', subtitles: [] };
    throw fail('unsupported', 'Bu video doğrudan MP4/HLS sunmuyor. Ayrı ses/video akışının mevcut TV ağ bileşeninde oynatılması doğrulanamadı; varsa başka kaynak seçin.');
  }
  root.YoutubeSource = { createTask: function (id, deadline) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return { promise: Promise.reject(fail('decode', 'Geçersiz video kimliği.')), cancel: function () {} };
    var client = context.createClient(), cancelled = false;
    function check() { if (cancelled) throw fail('cancel', 'İptal edildi.'); if (Date.now() >= deadline) throw fail('timeout', 'Ortak kaynak süresi doldu.'); }
    function policy() { check(); return { deadline: deadline, timeoutMs: Math.min(30000, Math.max(1, deadline - Date.now())) }; }
    return { promise: client.get('https://www.youtube.com/embed/' + id + '?hl=tr', '', {}, policy()).then(function (page) {
      check();
      var data = { context: { client: { clientName: 'VISIONOS', clientVersion: '1.02', deviceMake: 'Apple', deviceModel: 'RealityDevice17,1', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15', osName: 'visionOS', osVersion: '26.5.23O471', hl: 'tr', gl: 'TR', timeZone: 'UTC', utcOffsetMinutes: 0, visitorData: visitor(page.body) } }, videoId: id, contentCheckOk: true, racyCheckOk: true };
      return client.post('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', JSON.stringify(data), { 'Content-Type': 'application/json' }, policy());
    }).then(function (r) { check(); var value; try { value = JSON.parse(r.body); } catch (ignore) { throw fail('decode', 'YouTube JSON yanıtı okunamadı.'); } return choose(value, id); }).then(function (source) {
      if (source.type !== 'hls' || !root.P017YoutubeHls) return source;
      return client.get(source.url, '', {}, policy()).then(function (master) { check(); return root.P017YoutubeHls.prepare(source, master.body); });
    }), cancel: function () { cancelled = true; client.cancel(); } };
  } };
  root.P017YoutubeData = { choose: choose, visitor: visitor, closeConnection: closeConnection };
})(window);

/* Session-owned HLS adapter. Long remote URIs are compacted without persisting tokens. */
(function (root) {
  'use strict';
  var prefix = 'https://www.youtube.com/film-merkezi-r017/hls/', start = prefix + 'master.m3u8';
  function fail(message) { var e = new Error('YouTube HLS: ' + message); e.stage = 'manifest'; return e; }
  function url(value, base) {
    var result = root.InertPlayerData.publicUrl(value, base);
    if (!result || !/(^|\.)googlevideo\.com$/.test(new root.URL(result).hostname)) throw fail('İzinli medya adresi bulunamadı.');
    return root.P017YoutubeData.closeConnection(result);
  }
  function attributes(line) { var out = {}, re = /(?:^|,)([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, m; while ((m = re.exec(line))) out[m[1]] = m[2].charAt(0) === '"' ? m[2].slice(1, -1) : m[2]; return out; }
  function filter(text, base, alias) {
    if (!/^\s*#EXTM3U/.test(text) || /#EXT-X-SESSION-KEY|SAMPLE-AES|KEYFORMAT=/i.test(text)) throw fail('Desteklenen açık HLS listesi bulunamadı.');
    var lines = text.split(/\r?\n/), audio = [], variants = [], groups = {}, out = ['#EXTM3U', '#EXT-X-VERSION:6'];
    lines.forEach(function (line, i) {
      if (line.indexOf('#EXT-X-MEDIA:') === 0) { var a = attributes(line.slice(13)); if (a.TYPE === 'AUDIO' && a.URI && a['GROUP-ID']) audio.push({ group: a['GROUP-ID'], line: line, uri: a.URI }); }
      if (line.indexOf('#EXT-X-STREAM-INF:') !== 0) return;
      var attrs = attributes(line.slice(18)), size = /^(\d+)x(\d+)$/.exec(attrs.RESOLUTION || ''), codec = attrs.CODECS || '';
      if (!/^avc1\.[a-f0-9]+,mp4a\.40\.2$/i.test(codec.replace(/\s/g, '')) || !size || Number(size[2]) > 720 || Number(attrs['FRAME-RATE'] || 0) > 30 || !lines[i + 1] || lines[i + 1].charAt(0) === '#') return;
      if (attrs.AUDIO) groups[attrs.AUDIO] = true;
      variants.push(line.replace(/,SUBTITLES="[^"]*"|,CLOSED-CAPTIONS="[^"]*"/g, ''), alias(url(lines[i + 1].trim(), base)));
    });
    if (!variants.length) throw fail('H.264/AAC yayın bulunamadı.');
    Object.keys(groups).forEach(function (group) { if (!audio.some(function (a) { return a.group === group; })) throw fail('Ses grubu bulunamadı.'); });
    audio.forEach(function (a) { if (groups[a.group]) out.push(a.line.replace(/URI="[^"]*"/, 'URI="' + alias(url(a.uri, base)) + '"')); });
    return out.concat(variants).join('\n') + '\n';
  }
  function textBytes(data) {
    if (!(data instanceof ArrayBuffer) || data.byteLength > 8388608) throw fail('Yayın listesi boyut sınırı.');
    var bytes = new Uint8Array(data), chunks = [], i;
    for (i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, bytes.length))));
    return chunks.join('');
  }
  context.registerLoader('youtube-hls', function (session) {
    var closed = false, heads = [], entries = [], lookup = {}, memory = 0, pending = [];
    function alias(real) {
      real = url(real); var at = real.length;
      ['/sq/', '/govp/', '/goap/', '/begin/'].forEach(function (marker) { var n = real.indexOf(marker); if (n >= 0 && n < at) at = n; });
      if (at === real.length) at = -1;
      var head = at >= 0 ? real.slice(0, at) : '', tail = at >= 0 ? real.slice(at) : real, h = head ? heads.indexOf(head) : -1;
      if (head && h < 0) { if (heads.length >= 64) throw fail('Yayın köken dizini sınırı.'); h = heads.length; heads.push(head); memory += head.length * 2; }
      var key = h + ':' + tail;
      if (Object.prototype.hasOwnProperty.call(lookup, key)) return prefix + 'u/' + lookup[key];
      memory += key.length * 4;
      if (entries.length >= 16000 || memory > 4194304) throw fail('Oturum yayın dizini sınırı.');
      var id = entries.length; entries.push({ head: h, tail: tail }); lookup[key] = id; return prefix + 'u/' + id;
    }
    function rewrite(text, base) {
      if (!/^\s*#EXTM3U/.test(text) || /SAMPLE-AES|KEYFORMAT=/i.test(text)) throw fail('Geçersiz medya listesi.');
      return text.split(/\r?\n/).map(function (line) {
        if (!line || line.charAt(0) === '#') return line.replace(/URI="([^"]+)"/g, function (match, value) { return 'URI="' + alias(url(value, base)) + '"'; });
        return alias(url(line.trim(), base));
      }).join('\n');
    }
    function track(task, transform) {
      pending.push(task);
      function remove() { var i = pending.indexOf(task); if (i >= 0) pending.splice(i, 1); }
      return { promise: task.promise.then(function (response) { remove(); if (closed) throw fail('Oturum kapalı.'); return transform ? transform(response) : response; }, function (e) { remove(); throw e; }), cancel: task.cancel };
    }
    return {
      load: function (requestUrl, options) {
        if (closed) throw fail('Oturum kapalı.');
        var master = requestUrl === start, real = master ? url(session.config.master) : requestUrl, m = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 'u/(\\d+)$').exec(requestUrl);
        if (m) { var entry = entries[Number(m[1])]; if (!entry) throw fail('Medya bağlantısı artık geçerli değil.'); real = (entry.head < 0 ? '' : heads[entry.head]) + entry.tail; }
        else if (!master && requestUrl.indexOf(prefix) === 0) throw fail('Bilinmeyen oturum bağlantısı.');
        real = url(real);
        if (options.binary) return track(session.request(real, options));
        var copy = {}; Object.keys(options).forEach(function (key) { copy[key] = options[key]; }); copy.binary = true; copy.byteLimit = 8388608; copy.kind = 'playlist'; copy.referer = '';
        return track(session.request(real, copy), function (r) { var text = textBytes(r.data); return { data: master ? filter(text, real, alias) : rewrite(text, real), status: r.status, code: r.code, url: requestUrl }; });
      },
      destroy: function () { if (closed) return; closed = true; pending.slice().forEach(function (t) { try { t.cancel(); } catch (ignore) {} }); pending = []; entries = []; heads = []; lookup = {}; memory = 0; }
    };
  });
  root.P017YoutubeHls = {
    prepare: function (source, master) {
      var filtered = filter(master, source.url, function (v) { return v; });
      // The tested legacy AVPlay path stalls on these separate-audio masters.
      if (!/#EXT-X-MEDIA:[^\r\n]*TYPE=AUDIO/.test(master)) return source;
      source.loaderId = 'youtube-hls'; source.loaderConfig = { master: source.url }; source.url = start; source.preferredEngine = 'html5'; source.playbackRequirements = { customLoader: true, requiredHeaders: [] };
      var platform = shared.navigator && shared.navigator.userAgent || '';
      if (/\bTizen 7\.0(?:[; )]|$)/i.test(platform) && /^#EXT-X-STREAM-INF:.*\bRESOLUTION=\d+x360(?:,|$)/m.test(filtered)) {
        source.browserSplitAudio = true;
        source.browserSplitAudioHeight = 360;
      }
      return source;
    }, filter: filter
  };
})(window);

(function (root, context) {
  'use strict';
  var base = 'https://www.avsarfilm.com.tr';
  var I = root.InertPlayerData;
  var pagePath = /^\/watch\/[a-z0-9-]+(?:\/s[1-9]\d*e[1-9]\d*)?$/;
  function fail(stage, message) { var e = Error('R017: '+message);e.stage=stage;return e; }
  function Resolver() { this.client=context.createClient();this.generation=0;this.media=null; }
  Resolver.prototype.cancel=function () {
    this.generation++;this.client.cancel();
    if (this.media) {this.media.cancel();this.media=null;}
  };
  Resolver.prototype.resolve=function (content,deadline,notify) {
    this.cancel();
    var self=this, generation=this.generation, url=I.publicUrl(content.pageUrl), page=url&&new root.URL(url);
    if (!page || page.origin!==base || page.search || page.hash || !pagePath.test(page.pathname))
      return Promise.reject(fail('page','Geçersiz içerik adresi.'));
    var episode=/\/s[1-9]\d*e[1-9]\d*$/.test(page.pathname);
    if (!episode && content.type==='series') return Promise.reject(fail('page','Önce bir bölüm seçin.'));
    var target=episode?url:url+'/izle', status={sourceId:'r017-youtube',label:'YouTube',status:'pending',stage:'embed'}, options=[status];
    deadline=Math.min(deadline||Infinity,Date.now()+30000);
    function check() {
      if (generation!==self.generation) {var e=fail('cancel','İptal edildi.');e.cancelled=true;throw e;}
      if (Date.now()>=deadline) throw fail('timeout','Kaynak zaman aşımı.');
    }
    function publish(sources) {sources.options=options;if(notify)notify(sources);return sources;}
    return this.client.get(target,url,{}, {deadline:deadline,timeoutMs:8000,byteLimit:1048576}).then(function (r) {
      check();
      var doc=I.doc(r.body), canonical=doc.querySelector('meta[property="og:url"]');
      var panel=doc.querySelector('main .av-player[data-kind="'+(episode?'dizi':'film')+'"]');
      var f=panel&&panel.querySelector('iframe[data-src], iframe[data-frame-src]');
      var link=f&&I.publicUrl(f.getAttribute('data-src')||f.getAttribute('data-frame-src'),target), parsed=link&&new root.URL(link);
      var id=parsed&&parsed.origin==='https://www.youtube.com'&&/^\/embed\/([A-Za-z0-9_-]{11})$/.exec(parsed.pathname);
      if (!canonical||I.publicUrl(canonical.content,target)!==target) throw fail('identity','Oynatma sayfası seçilen film veya bölümle eşleşmedi.');
      if (!id) throw fail('unavailable','Tam içerik için YouTube oynatıcısı bulunamadı.');
      status.stage='media';publish([]);
      self.media=root.YoutubeSource.createTask(id[1],deadline);
      return self.media.promise;
    }).then(function (source) {
      check();self.media=null;source.id=status.sourceId;source.label=status.label;status.status='ready';status.stage='';
      return publish([source]);
    },function (error) {
      if (generation!==self.generation) check();
      self.media=null;status.status='error';status.stage=error.stage||status.stage;
      status.detail=root.PlayerCore.safeMessage(error.message);publish([]);
      error.sourceOptions=options;throw error;
    });
  };
  context.registerResolver({create:function () {return new Resolver();}});
})(window, context);

})(window);
