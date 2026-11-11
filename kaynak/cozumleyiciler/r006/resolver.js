/* R006: package-owned ES5 media decoder; no remote script execution. */
(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,PlayerCore:shared.PlayerCore,InertPlayerData:shared.InertPlayerData,SourceProgress:shared.SourceProgress,ChainNetwork:{createClient:function(o){return context.createClient(o);}}};window.DdiziParser={base:'https://www.ddizi.tel',episodeUrl:function(value){try{var u=new shared.URL(value);return u.origin==='https://www.ddizi.tel'&&!u.search&&!u.hash&&/^\/izle\/\d+\/[a-z0-9.-]+\.htm(?:\/[1-9]\d*)?$/.test(u.pathname)?u.href:'';}catch(e){return '';}}};
/* Active player data only. Page scripts and advertising are never executed. */
(function (root) {
  'use strict';
  var U = root.CatalogUtils, I = root.InertPlayerData;
  function fail(message, stage) { var e = new Error('P006: ' + message); e.stage = stage || 'decode'; return e; }
  function parameter(u, key) {
    var parts = u.search.slice(1).split('&'), i, at;
    for (i = 0; i < parts.length; i++) { at = parts[i].indexOf('='); if (decodeURIComponent((at < 0 ? parts[i] : parts[i].slice(0, at)).replace(/\+/g, ' ')) === key) return decodeURIComponent((at < 0 ? '' : parts[i].slice(at + 1)).replace(/\+/g, ' ')); }
    return '';
  }
  function youtube(value, page) {
    try { var u = new root.URL(value, page), id;
      if (u.protocol !== 'https:' || u.username || u.password || !/^(?:www\.)?youtube(?:-nocookie)?\.com$/.test(u.hostname)) return null;
      id = u.pathname === '/watch' ? parameter(u, 'v') : (/^\/embed\/([A-Za-z0-9_-]{11})(?:\/|$)/.exec(u.pathname) || [])[1];
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? { type: 'youtube', videoId: id, url: 'https://www.youtube.com/watch?v=' + id, referer: page, subtitles: [] } : null;
    } catch (ignore) { return null; }
  }
  function allowed(value) {
    try { var u = new root.URL(value); return u.protocol === 'https:' && !u.username && !u.password && /^www\.ddizi\.(?:tel|re)$/.test(u.hostname) && (/^\/player\/oynat\/[a-f0-9]{32}\/?$/.test(u.pathname) || u.pathname === '/player/youtube.php' && /^[A-Za-z0-9_-]{11}$/.test(parameter(u, 'id')) || u.pathname === '/player/telif/index.php' && !!youtube(parameter(u, 'id'), u.href)); }
    catch (ignore) { return false; }
  }
  function frame(body, page) {
    var node = I.doc(body).querySelector('.video-g iframe'), url = U.url(node && node.getAttribute('data-frame-src'), page);
    if (!allowed(url) && !youtube(url, page)) throw fail('Desteklenen aktif oynatıcı bulunamadı.');
    return url;
  }
  function episodeNumber(url) { return (/^https:\/\/www\.ddizi\.tel\/izle\/(\d+)\//.exec(url) || [])[1] || ''; }
  function alternatives(body, page) {
    var out = [], id = episodeNumber(page);
    Array.prototype.forEach.call(I.doc(body).querySelectorAll('.parts a'), function (a) {
      var url = a.getAttribute('href') ? root.DdiziParser.episodeUrl(U.url(a.getAttribute('href'), page)) : /(?:^|\s)active(?:\s|$)/.test(a.className) ? page : '', label = U.clean(a.textContent);
      if (!url || !label || !id || episodeNumber(url) !== id || out.some(function (v) { return v.url === url; })) return;
      out.push({ url: url, label: label });
    });
    return out.length ? out : [{ url: page, label: 'Kaynak 1' }];
  }
  function sourceObjects(input, start) {
    var out = [], depth = 0, begin = -1, i, c;
    for (i = start; i < input.length && i < start + 65536; i++) {
      c = input.charAt(i);
      if (c === "'" || c === '"') { i = I.literal(input, i).end - 1; continue; }
      if (c === '{') { if (!depth) begin = i; depth++; }
      else if (c === '}' && --depth === 0) { out.push(input.slice(begin, i + 1)); if (out.length > 16) throw fail('JW kaynak sayısı sınırı.'); }
      else if (c === ']' && !depth) return out;
      else if (!depth && !/[\s,]/.test(c)) throw fail('JW kaynak dizisi literal değil.');
      if (depth < 0) break;
    }
    throw fail('JW kaynak dizisi tamamlanmadı.');
  }
  function source(item, page, referer) {
    var file = /\bfile\s*:\s*(['"])/.exec(item), raw, value, u, type, label, size;
    if (!file || file.index > 1024) throw fail('Aktif medya adresi bulunamadı.');
    raw = I.literal(item, file.index + file[0].length - 1); value = I.publicUrl(raw.value, page);
    if (!value) throw fail('Geçersiz medya adresi.');
    u = new root.URL(value);
    if (!(/^(?:video\.twimg\.com|streambox\.xyz|eu1\.tabii\.com|puhu-p3\.mncdn\.com|vmcdn\.ciner\.com\.tr|downloader\.disk\.yandex\.(?:ru|com\.tr))$/.test(u.hostname) || /(^|\.)googlevideo\.com$/.test(u.hostname))) throw fail('Bilinmeyen medya sunucusu: ' + u.hostname, 'unsupported');
    type = /\btype\s*:\s*['"](hls|mp4)['"]/.exec(item.slice(raw.end));
    if (!type || /\b(?:drm|keySystem)\s*:/i.test(item)) throw fail('Medya biçimi doğrulanamadı.');
    label = /\blabel\s*:\s*(['"])/.exec(item); label = label ? I.literal(item, label.index + label[0].length - 1).value : '';
    size = /_(\d{3,4})x(\d{3,4})\.mp4$/.exec(u.pathname);
    return { url: value, type: type[1], referer: referer, subtitles: [], label: size ? size[2] + 'p' : label === 'Auto' ? '' : label, height: size ? Number(size[2]) : 0 };
  }
  function stream(body, page) {
    var d = I.doc(body), frame = d.querySelector('iframe[data-frame-src*="youtube.com/embed/"],iframe[data-frame-src*="youtube-nocookie.com/embed/"]'), link = d.querySelector('a.div[href]'), yt;
    if (frame) { yt = youtube(U.url(frame.getAttribute('data-frame-src'), page), page); if (yt) return yt; throw fail('Geçersiz YouTube bağlantısı.'); }
    if (link && /Diziyi izlemek i\S*in t\S*klay\S*n/i.test(U.clean(link.textContent))) { yt = youtube(U.url(link.getAttribute('href'), page), page); if (yt) return yt; throw fail('Desteklenmeyen dış oynatıcı.', 'unsupported'); }
    if (/<title[^>]*>\s*(?:Just a moment|Attention Required|Access Denied)|cf-mitigated/i.test(body)) throw fail('Oynatıcı erişim engeli.', 'access');
    if (/<title[^>]*>\s*404\s+Not Found|<h1[^>]*>\s*404\s*<\/h1>/i.test(body)) throw fail('Oynatıcı sayfası bulunamadı.', 'http');
    var setup = /\bjwplayer\(\s*['"]player['"]\s*\)[\s\S]{0,100}?\.setup\(\s*\{|\bplayer\.setup\(\s*\{/.exec(body);
    if (!setup) throw fail('Aktif JW medya ayarları bulunamadı.');
    var tail = body.slice(setup.index + setup[0].length), sources = /\bsources\s*:\s*\[/.exec(tail);
    if (!sources) throw fail('JW kaynak listesi bulunamadı.');
    var referer = d.querySelector('meta[name="referrer"][content="no-referrer"]') ? '' : page;
    var variants = sourceObjects(tail, sources.index + sources[0].length).map(function (item) { return source(item, page, referer); });
    variants = variants.filter(function (entry, index) { return !variants.slice(0, index).some(function (other) { return other.url === entry.url && other.type === entry.type; }); });
    if (!variants.length) throw fail('Aktif JW kaynak dizisi boş.', 'empty');
    var result = {}; Object.keys(variants[0]).forEach(function (key) { result[key] = variants[0][key]; }); result.variants = variants; return result;
  }
  root.DdiziDecoder = { allowed: allowed, frame: frame, alternatives: alternatives, stream: stream, youtube: youtube };
})(window);

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
      if (source.type !== 'hls' || !root.P006YoutubeHls) return source;
      return client.get(source.url, '', {}, policy()).then(function (master) { check(); return root.P006YoutubeHls.prepare(source, master.body); });
    }), cancel: function () { cancelled = true; client.cancel(); } };
  } };
  root.P006YoutubeData = { choose: choose, visitor: visitor, closeConnection: closeConnection };
})(window);

/* Session-owned HLS adapter. Long remote URIs are compacted without persisting tokens. */
(function (root) {
  'use strict';
  var prefix = 'https://www.youtube.com/film-merkezi-r006/hls/', start = prefix + 'master.m3u8';
  function fail(message) { var e = new Error('YouTube HLS: ' + message); e.stage = 'manifest'; return e; }
  function url(value, base) {
    var result = root.InertPlayerData.publicUrl(value, base);
    if (!result || !/(^|\.)googlevideo\.com$/.test(new root.URL(result).hostname)) throw fail('İzinli medya adresi bulunamadı.');
    return root.P006YoutubeData.closeConnection(result);
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
  root.P006YoutubeHls = {
    prepare: function (source, master) {
      filter(master, source.url, function (v) { return v; });
      // The tested legacy AVPlay path stalls on these separate-audio masters.
      if (!/#EXT-X-MEDIA:[^\r\n]*TYPE=AUDIO/.test(master)) return source;
      source.loaderId = 'youtube-hls'; source.loaderConfig = { master: source.url }; source.url = start; source.preferredEngine = 'html5'; source.playbackRequirements = { customLoader: true, requiredHeaders: [] }; return source;
    }, filter: filter
  };
})(window);

(function (root) {
  'use strict';
  var P = root.DdiziParser,
    D = root.DdiziDecoder;
  function fail(stage, message) {
    var e = new Error('DDizi · ' + message);
    e.stage = stage;
    return e;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.clients = [];
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.clients.forEach(function (c) {
      try { c.cancel(); } catch (ignore) {}
    });
    this.clients = [];
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      options = [],
      sources = [],
      last,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints);
    function publish() {
      if (progress) progress.publish(sources, options);
    }
    if (!P.episodeUrl(content.pageUrl))
      return Promise.reject(fail('page', 'Geçersiz DDizi bölüm sayfası.'));
    if (self.now() >= deadline)
      return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    function get(url, ref, stage, retried) {
      check();
      var client = (root.DdiziNetwork || root.ChainNetwork).createClient({
        destination: 'downloads',
        deadline: deadline,
      });
      if (progress && progress.client) client = progress.client(client, check, deadline);
      self.clients.push(client);
      function release() {
        var i = self.clients.indexOf(client);
        if (i >= 0) self.clients.splice(i, 1);
      }
      return client.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }, {deadline:deadline,timeoutMs:Math.min(30000,Math.max(1,deadline-self.now()))}).then(
        function (r) {
          release();
          check();
          self.log('DDizi: ' + stage + ' / ' + r.method);
          return r;
        },
        function (e) {
          release();
          check();
          if (
            !retried &&
            !e.cancelled && !/HTTP\s*4\d\d|engeli|Dogrulama|origin denied|permission|unavailable/i.test(e.message) &&
            (e.stage === 'timeout' || /Native|XHR|zaman|HTTP 5\d\d/.test(e.message)) &&
            deadline - self.now() > 12000
          )
            return get(url, ref, stage, true);
          e.requestStage = stage;
          e.stage = e.stage || stage;
          throw e;
        }
      );
    }
    return get(content.pageUrl, P.base + '/', 'page')
      .then(function (first) {
        var list = D.alternatives(first.body, content.pageUrl),
          index = 0;
        list.forEach(function (a, i) {
          options.push({
            sourceId: 'ddizi-' + i,
            label: a.label,
            pageUrl: a.url,
            status: 'pending',
            stage: '',
            detail: '',
          });
        });
        var queue = list.map(function (a, i) {
          return { alternative: a, index: i };
        });
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return {
              id: options[entry.index].sourceId,
              label: entry.alternative.label,
              type: 'hls',
              stability: { autoPriority: /Dublaj/i.test(entry.alternative.label) ? 0 : 1 },
            };
          });
        function worker() {
          check();
          if (!queue.length) return Promise.resolve();
          return (progress ? progress.wait(check) : Promise.resolve().then(check))
            .then(function () {
              var entry = queue.shift();
              if (!entry) return;
              var i = entry.index,
                a = entry.alternative,
                option = options[i];
              return (
                a.url === content.pageUrl
                  ? Promise.resolve(first)
                  : get(a.url, content.pageUrl, 'page')
              )
                .then(function (page) {
                  var embed = D.frame(page.body, a.url), direct = D.youtube ? D.youtube(embed, a.url) : null;
                  return (direct ? Promise.resolve(page) : get(embed, a.url, 'embed')).then(function (response) {
                    var data = direct || D.stream(response.body, embed);
                    if (data.type === 'youtube') {
                      if (!root.YoutubeSource)
                        throw fail('unsupported', 'Bu kaynak YouTube kullanıyor; doğrudan anonim medya erişimi doğrulanamadı.');
                      var youtubeTask = root.YoutubeSource.createTask(
                        data.videoId,
                        deadline,
                        self.log,
                        hints
                      );
                      self.clients.push(youtubeTask);
                      function releaseYoutube() {
                        var at = self.clients.indexOf(youtubeTask);
                        if (at >= 0) self.clients.splice(at, 1);
                      }
                      return youtubeTask.promise.then(
                        function (source) {
                          releaseYoutube();
                          check();
                          source.id = option.sourceId;
                          source.label = a.label + ' · YouTube';
                          source.order = i;
                          source.languagePriority = /Dublaj/i.test(a.label) ? 0 : 1;
                          sources.push(source);
                          option.status = 'ready';
                          option.label = source.label;
                          option.detail = source.preferredEngine === 'avplay' ? 'YouTube doğrudan medya adresi alındı; AVPlay ile açılacak' : 'YouTube medya bilgisi alındı; özel yükleyici erişimi oynatılırken sınanır';
                        },
                        function (e) {
                          releaseYoutube();
                          throw e;
                        }
                      );
                    }
                    if (data.type === 'mp4') {
                      var candidates = data.variants || [data];
                      candidates.forEach(function (candidate) {
                        var parsed = new root.URL(candidate.url), google = /(^|\.)googlevideo\.com$/.test(parsed.hostname);
                        if (candidate.type !== 'mp4' || !(google && /[?&]itag=18(?:&|$)/.test(candidate.url) && /[?&]mime=video(?:\/|%2F)mp4(?:&|$)/i.test(candidate.url) || parsed.hostname === 'vmcdn.ciner.com.tr' && /\.mp4$/.test(parsed.pathname) || /^downloader\.disk\.yandex\.(?:ru|com\.tr)$/.test(parsed.hostname) && /^\/disk\//.test(parsed.pathname) && /[?&]content_type=video(?:\/|%2F)mp4(?:&|$)/i.test(candidate.url))) throw fail('unsupported', 'Bu MP4 kaynağı doğrulanmış adres biçimini kullanmıyor.');
                      });
                      candidates.forEach(function (candidate, quality) {
                        var google = /(^|\.)googlevideo\.com$/.test(new root.URL(candidate.url).hostname);
                        var sourceId = option.sourceId + (quality ? '-q' + quality : ''), label = a.label + ' · ' + (candidate.label || (google ? 'MP4 360p' : 'MP4'));
                        sources.push({
                        id: sourceId,
                          packageKey: context.key,
                        label: label,
                        url: candidate.url,
                        referer: candidate.referer,
                        type: 'mp4',
                        mp4Verified: false,
                        preferredEngine: 'avplay',
                        engineSupport: { html5: 'unverified', avplay: 'candidate' },
                        seekMode: 'media-event',
                        subtitles: [],
                        height: candidate.height || 0,
                        order: i + quality / 100,
                        languagePriority: 1,
                      });
                        if (quality) options.push({ sourceId: sourceId, label: label, pageUrl: a.url, status: 'ready', stage: '', detail: 'MP4 adresi alındı; erişim oynatılırken sınanır' });
                        else option.label = label;
                      });
                      option.status = 'ready';
                      option.label = a.label + ' · MP4 360p';
                      option.detail =
                        'Kaynak sayfasından taze MP4 adresi alındı; erişim oynatılırken sınanır';
                      return;
                    }
                    return get(data.url, data.referer, 'manifest')
                      .then(function (manifest) {
                        if (!/^\s*#EXTM3U/.test(manifest.body))
                          throw fail('manifest', 'HLS yerine farklı bir yanıt alındı.');
                        /* Streambox reports a placeholder 1920x1333 for its sole stream; use the actual media playlist. */
                        var entries =
                          manifest.body.match(/#EXT-X-STREAM-INF:[^\r\n]+\r?\n([^\r\n#]+)/g) || [];
                        if (
                          new root.URL(data.url).hostname === 'streambox.xyz' &&
                          entries.length === 1 &&
                          !/#EXT-X-MEDIA:/.test(manifest.body)
                        ) {
                          var child = root.CatalogUtils.url(entries[0].split(/\r?\n/)[1], data.url),
                            parsed;
                          try {
                            parsed = new root.URL(child);
                          } catch (ignore) {
                            throw fail('manifest', 'Alt yayın adresi okunamadı.');
                          }
                          if (
                            parsed.origin !== 'https://streambox.xyz' ||
                            !/^\/m3\//.test(parsed.pathname)
                          )
                            throw fail('manifest', 'Alt yayın adresi desteklenmiyor.');
                          return get(child, data.referer, 'variant').then(function (r) {
                            if (!/^\s*#EXTM3U/.test(r.body) || !/#EXTINF:/.test(r.body))
                              throw fail('manifest', 'Alt HLS yayını alınamadı.');
                            data.url = child;
                            return r;
                          });
                        }
                        return manifest;
                      })
                      .then(function (manifest) {
                        sources.push({
                          id: option.sourceId,
                          packageKey: context.key,
                          label: a.label,
                          url: data.url,
                          referer: data.referer,
                          destination: 'downloads',
                          userAgent: 'Mozilla/5.0',
                          type: 'hls',
                          transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                          seekMode: 'media-event',
                          subtitles: [],
                          order: i,
                          languagePriority: /Dublaj/i.test(a.label) ? 0 : 1,
                        });
                        option.status = 'ready';
                        option.detail = 'HLS erişimi doğrulandı';
                      });
                  });
                })
                .catch(function (e) {
                  check();
                  last = e;
                  option.status = e.stage === 'unsupported' ? 'unsupported' : 'error';
                  option.stage = e.stage || 'decode';
                  option.detail = root.PlayerCore.safeMessage(e.message);
                  self.log('DDizi: ' + a.label + ' / ' + option.stage + ' · ' + option.detail);
                })
                .then(function () {
                  check();
                  publish();
                });
            })
            .then(worker);
        }
        return worker();
      })
      .then(function () {
        check();
        sources.sort(function (a, b) {
          return a.languagePriority - b.languagePriority || a.order - b.order;
        });
        sources.options = options;
        if (!sources.length) {
          var e = last || fail('decode', 'Oynatılabilir DDizi kaynağı bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.DdiziSourceResolver = Resolver;
})(window);

context.registerResolver({create:function(ctx,log,now){return new window.DdiziSourceResolver(log,now);}});
})(window);
