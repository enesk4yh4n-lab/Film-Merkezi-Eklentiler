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
