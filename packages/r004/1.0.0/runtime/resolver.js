/* R004: package-local Hotstream data decoder. ES5; no remote script execution. */
(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,CryptoJS:shared.CryptoJS,SourceProgress:shared.SourceProgress,ChainNetwork:{createClient:function(){return context.createClient();}}};window.FilmizleParser={base:'https://filmizle.ink',safe:function(value){try{var u=new shared.URL(value);return u.origin==='https://filmizle.ink'&&!u.username&&!u.password?u.href:'';}catch(e){return '';}}};
(function(root){'use strict';function fail(stage,message){var e=new Error(message);e.stage=stage;return e;}
 function settings(body) {
  var m = /\bbePlayer\s*\(\s*'([^']{1,512})'\s*,\s*'([^']{1,1048576})'/.exec(body);
  var password, encrypted;
  if (m) { password = m[1]; encrypted = m[2]; }
  else {
   try {
    var node = documentData(body).getElementById('be-player-config'), config = node && JSON.parse(node.getAttribute('data-config'));
    if (!config || typeof config.videoId !== 'string' || !config.videoId || config.videoId.length > 512 || typeof config.settings !== 'string' || !config.settings || config.settings.length > 1048576) throw new Error();
    password = config.videoId; encrypted = config.settings;
   } catch (ignore) { throw fail('decode', 'Hotstream ayar biçimi tanınamadı.'); }
  }
  try {
   var C = root.CryptoJS, value = JSON.parse(encrypted);
   if (!/^[0-9a-f]{16}$/i.test(value.s) || !/^[0-9a-f]{32}$/i.test(value.iv) || typeof value.ct !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(value.ct)) throw new Error();
   var format = { parse: function () { return C.lib.CipherParams.create({ ciphertext: C.enc.Base64.parse(value.ct), iv: C.enc.Hex.parse(value.iv), salt: C.enc.Hex.parse(value.s) }); } };
   var data = JSON.parse(C.AES.decrypt(encrypted, password, { format: format }).toString(C.enc.Utf8));
   if (!data || typeof data.video_location !== 'string' || !/^https:\/\/hotstream\.club\/list\//.test(data.video_location)) throw new Error();
   return { url: data.video_location, title: typeof data.title === 'string' ? data.title : '' };
  } catch (e) { throw fail('decode', 'Hotstream ayar verisi çözülemedi.'); }
 }
 function documentData(body) {
  var html = body.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/\ssrc\s*=/gi, ' data-frame-src=').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return new DOMParser().parseFromString(html, 'text/html');
 }
 function frames(body, page) {
  var d = documentData(body), result = [];
  Array.prototype.forEach.call(d.querySelectorAll('iframe'), function (frame) { var url = root.CatalogUtils.url(frame.getAttribute('data-litespeed-src') || frame.getAttribute('data-frame-src'), page); if (/^https:\/\/hotstream\.club\/embed\/[A-Za-z0-9]+\/?$/.test(url) && result.indexOf(url) < 0) result.push(url); }); return result;
 }
 function moviePages(body, page) {
  if (root.SiteAddresses) page = root.SiteAddresses.resolve(page);
  var current = new root.URL(page), match = /^(\/[^/]+\/)(?:([1-9]\d*)\/)?$/.exec(current.pathname), number = match && Number(match[2]) || 1;
  var result = [{ url: page, number: number }], d = documentData(body), seen = {};
  if (!match || current.origin !== (root.SiteAddresses ? root.SiteAddresses.base('filmizle', 'https://filmizle.ink') : 'https://filmizle.ink') || d.querySelector('.p-v12-meta-info a[href*="/dizi-izle/"]') || /\b[1-9]\d*\s*\.?\s*Sezon\b/i.test((d.querySelector('.p-v12-main-title') || {}).textContent || '')) return result;
  seen[number] = true;
  Array.prototype.forEach.call(d.querySelectorAll('.p-v12-ep-list a.post-page-numbers'), function (a) {
   var value = root.CatalogUtils.url(a.getAttribute('href'), page), u, n = Number(root.CatalogUtils.clean(a.textContent));
   try { u = new root.URL(value); } catch (ignore) { return; }
   if (u.origin !== current.origin || u.username || u.password || u.search || u.hash || n < 1 || n > 12 || n % 1 || u.pathname !== match[1] + (n === 1 ? '' : n + '/') || seen[n]) return;
   seen[n] = true; result.push({ url: u.href, number: n });
  });
  return result;
 }
root.Hotstream={settings:settings,frames:frames,moviePages:moviePages};})(window);
/* Hotstream settings are decrypted as JSON data, never executed as page code. */
(function (root) {
  'use strict';
  function fail(stage, message) {
    var error = new Error('Filmizle · ' + message);
    error.stage = stage;
    return error;
  }
  function Resolver(log, now) {
    this.log = log || function () {};
    this.now = now || Date.now;
    this.generation = 0;
    this.filmizleNetwork = root.ChainNetwork.createClient();
  }
  Resolver.prototype.cancel = function () {
    this.generation++;
    this.filmizleNetwork.cancel();
  };
  Resolver.prototype.resolve = function (content, deadline, onProgress, hints) {
    this.cancel();
    var self = this,
      token = this.generation,
      sources = [],
      options = [],
      lastError,
      progress = root.SourceProgress && new root.SourceProgress(onProgress, hints),
      network = self.filmizleNetwork || (self.filmizleNetwork = root.ChainNetwork.createClient());
    function check() {
      if (token !== self.generation) {
        var e = fail('cancel', 'İptal edildi');
        e.cancelled = true;
        throw e;
      }
      if (self.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.');
    }
    if (progress && progress.client) network = progress.client(network, check, deadline);
    function get(url, ref, stage) {
      check();
      return network.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }, {deadline:deadline,timeoutMs:Math.min(30000,Math.max(1,deadline-self.now()))}).then(
        function (r) {
          check();
          return r;
        },
        function (e) {
          check();
          e.stage = stage;
          throw e;
        }
      );
    }
    if (!root.FilmizleParser.safe(content.pageUrl))
      return Promise.reject(fail('page', 'Geçersiz içerik sayfası.'));
    self.log('Filmizle: içerik sayfası alınıyor.');
    return get(content.pageUrl, root.FilmizleParser.base + '/', 'page')
      .then(function (page) {
        var pages = content.type === 'episode' || content.type === 'series' ? [{ url: content.pageUrl, number: 1 }] : root.Hotstream.moviePages(page.body, content.pageUrl);
        var queue = [], seen = {};
        function collect(body, sourcePage) {
          check();
          var links = root.Hotstream.frames(body, sourcePage.url);
          if (!links.length) {
            lastError = fail('embed', 'Desteklenen Hotstream oynatıcı bağlantısı bulunamadı.');
            options.push({ sourceId: 'hotstream-page-' + sourcePage.number, label: 'Hotstream ' + sourcePage.number, pageUrl: sourcePage.url, status: 'error', stage: 'embed', detail: lastError.message });
          }
          links.forEach(function (url, i) {
            if (seen[url]) return;
            seen[url] = true;
            var id = sourcePage.number === 1 ? 'hotstream-' + i : 'hotstream-page-' + sourcePage.number + '-' + i;
            var label = 'Hotstream' + (sourcePage.number === 1 ? (i ? ' ' + (i + 1) : '') : ' ' + sourcePage.number + (i ? ' / ' + (i + 1) : ''));
            var option = { sourceId: id, label: label, pageUrl: sourcePage.url, status: 'pending' };
            options.push(option); queue.push({ url: url, index: i, pageUrl: sourcePage.url, option: option });
          });
        }
        function publish() {
          if (progress) progress.publish(sources, options);
        }
        return pages.reduce(function (previous, sourcePage) {
          return previous.then(function () {
            check();
            if (sourcePage.url === content.pageUrl) { collect(page.body, sourcePage); return; }
            return get(sourcePage.url, content.pageUrl, 'page').then(function (response) { collect(response.body, sourcePage); }, function (e) {
              check(); lastError = e;
              options.push({ sourceId: 'hotstream-page-' + sourcePage.number, label: 'Hotstream ' + sourcePage.number, pageUrl: sourcePage.url, status: 'error', stage: e.stage || 'page', detail: e.message });
            });
          });
        }, Promise.resolve()).then(function () {
        publish();
        if (progress)
          queue = progress.order(queue, function (entry) {
            return { id: entry.option.sourceId, label: entry.option.label, type: 'hls' };
          });
        return queue.reduce(function (promise, entry) {
          var url = entry.url,
            i = entry.index,
            option = entry.option;
          return promise.then(function () {
            return (progress ? progress.wait(check) : Promise.resolve().then(check))
              .then(function () {
                return get(url, entry.pageUrl, 'embed');
              })
              .then(function (embed) {
                var data = root.Hotstream.settings(embed.body);
                return get(data.url, url, 'manifest').then(function (manifest) {
                  if (!/^\s*#EXTM3U/.test(manifest.body))
                    throw fail('manifest', 'HLS manifesti yerine farklı bir yanıt alındı.');
                  sources.push({
                    id: option.sourceId,
                    label: option.label,
                    sourcePageUrl: entry.pageUrl,
                    packageKey: context.key,
                    url: data.url,
                    referer: url,
                    userAgent: 'Mozilla/5.0',
                    type: 'hls',
                    status: 'ready',
                    transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                    seekMode: 'media-event',
                    subtitles: [],
                  });
                  option.status = 'ready';
                  option.detail = 'HLS erişimi doğrulandı';
                  publish();
                });
              })
              .catch(function (e) {
                check();
                lastError = e;
                option.status = 'error';
                option.stage = e.stage || 'embed';
                option.detail = e.message;
                publish();
                self.log('Filmizle: ' + (e.stage || 'embed') + ' aşaması başarısız.');
              });
          });
        }, Promise.resolve());
        });
      })
      .then(function () {
        check();
        if (progress && progress.enabled) sources.options = options;
        if (!sources.length) {
          var e = lastError || fail('decode', 'Oynatılabilir kaynak bulunamadı.');
          e.sourceOptions = options;
          throw e;
        }
        return sources;
      });
  };
  root.FilmizleSourceResolver = Resolver;
  root.FilmizleResolver = root.Hotstream;
})(window);
context.registerResolver({create:function(ctx,log,now){return new window.FilmizleSourceResolver(log,now);}});
})(window);
