/* Literal, active JW media only. No downloaded website script is executed. */
(function (root) {
  'use strict';
  var I = root.InertPlayerData, BASE = 'https://www.trdiziizle.tv';
  function fail(stage, message) { var e = new Error('R012: ' + message); e.stage = stage; return e; }
  function own(value, page) { var url = I.publicUrl(value, page || BASE + '/'), u = url && new root.URL(url); return u && u.origin === BASE ? url : ''; }
  function frames(body, page) {
    var doc = I.doc(body), out = [], external = false, content = doc.querySelector('#content');
    Array.prototype.forEach.call(doc.querySelectorAll('#content iframe'), function (n) {
      var url = own(n.getAttribute('data-frame-src') || n.getAttribute('data-src') || n.getAttribute('data-litespeed-src'), page), u = url && new root.URL(url);
      if (!u) return;
      if (/^\/player\/telif\/index\.php$/.test(u.pathname)) external = true;
      if (/^\/player\/oynat\/[a-f0-9]{24,64}\/?$/.test(u.pathname) && !u.search && !u.hash && out.indexOf(url) < 0) out.push(url);
    });
    if (!out.length) {
      if (external) throw fail('external', 'Bu bölüm sitede yalnız dış izleme bağlantısı olarak sunuluyor; doğrudan video kaynağı yok.');
      if (content && /telif[\s\S]{0,100}kaldırılmış/i.test(content.textContent || '')) throw fail('unavailable', 'Site bu bölümü telif bildirimi nedeniyle kaldırmış.');
      throw fail('unavailable', 'Bu bölüm sayfasında etkin video kaynağı bulunmuyor.');
    }
    return out;
  }
  function skip(text, at) {
    while (at < text.length) {
      if (/\s/.test(text.charAt(at))) at++;
      else if (text.substr(at, 2) === '//') { var line = text.indexOf('\n', at + 2); at = line < 0 ? text.length : line + 1; }
      else if (text.substr(at, 2) === '/*') { var end = text.indexOf('*/', at + 2); if (end < 0) throw fail('decode', 'Eksik oynatıcı veri açıklaması.'); at = end + 2; }
      else break;
    }
    return at;
  }
  function value(text, at) {
    at = skip(text, at);
    var start = at, stack = [], quote = text.charAt(at), lit;
    if (quote === '"' || quote === "'") { lit = I.literal(text, at); return { value: lit.value, end: lit.end }; }
    for (; at < text.length; at++) {
      var ch = text.charAt(at), next = skip(text, at);
      if (next !== at) { at = next - 1; continue; }
      if (ch === '"' || ch === "'") { at = I.literal(text, at).end - 1; continue; }
      if (ch === '[' || ch === '{' || ch === '(') stack.push(ch);
      else if (ch === ']' || ch === '}' || ch === ')') {
        if (!stack.length) break;
        var opening = stack.pop();
        if (opening !== (ch === ']' ? '[' : ch === '}' ? '{' : '(')) throw fail('decode', 'Oynatıcı veri sınırları eşleşmiyor.');
        if (!stack.length && (quote === '[' || quote === '{' || quote === '(')) { at++; break; }
      } else if (ch === ',' && !stack.length) break;
    }
    if (stack.length) throw fail('decode', 'Eksik oynatıcı verisi.');
    var raw = text.slice(start, at), primitive = raw.replace(/^\s+|\s+$/g, '');
    return { value: primitive === 'true' ? true : primitive === 'false' ? false : /^\d+(?:\.\d+)?$/.test(primitive) ? Number(primitive) : undefined, raw: raw, end: at };
  }
  function fields(text) {
    var result = {}, at = skip(text, 1), key, part, match;
    while (at < text.length - 1) {
      at = skip(text, at); if (text.charAt(at) === ',') { at++; continue; }
      if (text.charAt(at) === '}') break;
      if (text.charAt(at) === '"' || text.charAt(at) === "'") { part = I.literal(text, at); key = part.value; at = part.end; }
      else { match = /^[A-Za-z_$][\w$]*/.exec(text.slice(at)); if (!match) throw fail('decode', 'Oynatıcı veri alanı okunamadı.'); key = match[0]; at += key.length; }
      at = skip(text, at); if (text.charAt(at++) !== ':') throw fail('decode', 'Oynatıcı veri alanı eksik.');
      part = value(text, at); if (part.end <= at) throw fail('decode', 'Boş oynatıcı veri alanı.');
      result['$' + key] = part; at = part.end;
    }
    return result;
  }
  function entries(raw) {
    var rows = [], at = 1;
    if (!raw || raw.charAt(0) !== '[') return rows;
    while (at < raw.length - 1) {
      at = skip(raw, at); if (raw.charAt(at) === ',') { at++; continue; }
      if (raw.charAt(at) === ']') break;
      var part = value(raw, at);
      if (part.raw && part.raw.charAt(0) === '{') rows.push(fields(part.raw));
      else if (typeof part.value === 'string') rows.push({ $file: part });
      else throw fail('unsupported', 'Dinamik kaynak ifadesi çalıştırılmadan çözümlenemiyor.');
      at = part.end;
    }
    if (rows.length > 24) throw fail('decode', 'Kaynak seçeneği sınırı aşıldı.');
    return rows;
  }
  function prop(row, name) { return row['$' + name] && row['$' + name].value; }
  function family(url) {
    var host = new root.URL(url).hostname;
    if (host === 'video.twimg.com') return 'Twitter';
    if (host === 'streambox.xyz') return 'Streambox';
    if (/(^|\.)googlevideo\.com$/.test(host)) return 'Google Video';
    if (/^downloader\.disk\.yandex\.(?:com\.tr|ru)$/.test(host) || host === 'mds.storage.yandex.net') return 'Yandex';
    if (/^puhu-p\d+\.mncdn\.com$/.test(host) || host === 'rtuk-p.mncdn.com') return 'Puhu CDN';
    if (/(^|\.)tabii\.com$/.test(host)) return 'Tabii';
    if (host === 'vmcdn.ciner.com.tr') return 'Ciner';
    return 'JW';
  }
  function decode(body, page) {
    var doc = I.doc(body), blocks = [body].concat(I.unpack(body)), result = null;
    if (!doc.querySelector('#player')) throw fail('embed', 'Etkin oynatıcı alanı bulunamadı.');
    blocks.some(function (s) {
      var m = /\b(?:jwplayer\(\s*['"][^'"]+['"]\s*\)|player|playerInstance)\s*\.setup\(\s*\{/.exec(s);
      if (!m) return false;
      var config = fields(value(s, m.index + m[0].length - 1).raw), rows = config.$sources ? entries(config.$sources.raw) : config.$file ? [config] : [], variants = [], seen = {}, tracks = [];
      if (!rows.length) throw fail('unavailable', 'Sitenin oynatıcısındaki kaynak listesi boş; bu bölüm için medya adresi verilmemiş.');
      rows.forEach(function (row) {
        var url = I.publicUrl(prop(row, 'file'), page), declared = String(prop(row, 'type') || '').toLowerCase(), type;
        if (!url || seen[url]) return;
        if (/^(?:hls|application\/(?:vnd\.apple\.mpegurl|x-mpegurl))$/.test(declared) || /\.m3u8(?:$|[?#])/i.test(url)) type = 'hls';
        else if (/^(?:mp4|video\/mp4)$/.test(declared) || /\.mp4(?:$|[?#])/i.test(url)) type = 'mp4';
        else throw fail('unsupported', 'Kaynak veri biçimi doğrulanamadı.');
        seen[url] = true;
        var label = root.PlayerCore.safeMessage(String(prop(row, 'label') || '')).slice(0, 40), height = /^(\d{3,4})p$/i.exec(label);
        variants.push({ url: url, type: type, label: label, height: height ? Number(height[1]) : 0, family: family(url), referer: doc.querySelector('meta[name="referrer"][content="no-referrer"]') ? '' : page });
      });
      if (!variants.length) throw fail('unavailable', 'Bu bölümün kaynak listesinde geçerli medya adresi yok.');
      if (config.$tracks) entries(config.$tracks.raw).forEach(function (track) {
        var kind = String(prop(track, 'kind') || '').toLowerCase(), url = I.publicUrl(prop(track, 'file'), page);
        if (url && /^(captions|subtitles)$/.test(kind)) tracks.push({ url: url, label: prop(track, 'label') || '', lang: prop(track, 'srclang') || '' });
      });
      result = {}; Object.keys(variants[0]).forEach(function (key) { result[key] = variants[0][key]; }); result.variants = variants; result.subtitles = tracks; return true;
    });
    if (!result) throw fail('decode', 'Aktif JW kaynak verisi bulunamadı.');
    return result;
  }
  function Resolver() { this.text = context.createClient({ platformText: true }); this.media = context.createClient(); this.sessions = []; this.generation = 0; }
  Resolver.prototype.cancel = function () { this.generation++; this.text.cancel(); this.media.cancel(); this.sessions.splice(0).forEach(function (s) { s.destroy(); }); };
  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    this.cancel();
    var self = this, token = self.generation, sources = [], options = [], last = null, progress = root.SourceProgress && new root.SourceProgress(notify, hints), page = own(content.pageUrl), u = page && new root.URL(page);
    if (!u || !/^\/[^/]+-\d+-bolum[^/]*\/$/.test(u.pathname) || u.search || u.hash) return Promise.reject(fail('page', 'Geçersiz bölüm adresi.'));
    function check() { if (token !== self.generation) { var e = fail('cancel', 'İptal edildi'); e.cancelled = true; throw e; } if (Date.now() >= deadline) throw fail('timeout', 'Kaynak hazırlama süresi doldu.'); }
    if (Date.now() >= deadline) return Promise.reject(fail('timeout', 'Kaynak hazırlama süresi doldu.'));
    function get(client, url, ref) {
      check(); var scoped = progress ? progress.client(client, check, deadline) : client;
      return (progress ? progress.wait(check) : Promise.resolve()).then(function () { check(); return scoped.get(url, ref, {}, { deadline: deadline, timeoutMs: Math.min(30000, Math.max(1, deadline - Date.now())) }); }).then(function (r) { check(); return r; });
    }
    function probe(data) {
      if (!root.PackageMediaLoader) return Promise.reject(fail('unsupported', 'Paket kapsamlı medya doğrulama hizmeti bulunamadı.'));
      var session = root.PackageMediaLoader.open({ packageKey: context.key }), task = null;
      self.sessions.push(session);
      var client = { get: function (url, ref, headers, policy) { task = session.request(url, { binary: true, kind: 'mp4-probe', rangeStart: 0, rangeEnd: 4096, byteLimit: 8192, referer: ref, deadline: Math.min(deadline, policy && policy.deadline || Infinity), timeoutMs: Math.min(12000, policy && policy.timeoutMs || 12000) }); return task.promise; }, cancel: function () { if (task) task.cancel(); session.destroy(); } };
      function release() { var at = self.sessions.indexOf(session); if (at >= 0) self.sessions.splice(at, 1); session.destroy(); }
      return get(client, data.url, data.referer).then(function (r) {
        check(); var bytes = r.data && new Uint8Array(r.data);
        if (r.status !== 206 || !bytes || bytes.length < 12 || String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]) !== 'ftyp') throw fail('media', 'MP4 başlangıcı veya HTTP Range yanıtı doğrulanamadı.');
        var finalUrl = I.publicUrl(r.url || data.url, data.url); if (!finalUrl) throw fail('media', 'MP4 yönlendirme adresi geçersiz.');
        data.url = finalUrl; release(); return data;
      }, function (e) { release(); throw e; }).then(function (v) { return v; }, function (e) { release(); throw e; });
    }
    function publish(data, option, subtitles) {
      check(); var source = { id: option.sourceId, label: option.label, url: data.url, type: data.type, referer: data.referer, packageKey: context.key, preferredEngine: data.type === 'mp4' ? 'avplay' : 'html5', subtitles: subtitles || [], height: data.height || 0 };
      if (data.type === 'mp4') { source.mp4Verified = false; source.mp4ContainerVerified = true; source.engineSupport = { html5: 'candidate', avplay: 'unsupported' }; source.seekMode = 'media-event'; if (!root.P012MP4) throw fail('unsupported', 'Paketin MP4 parça yükleyicisi bulunamadı.'); root.P012MP4.prepare(source); }
      sources.push(source); option.status = 'ready'; option.stage = ''; option.detail = data.type === 'mp4' ? 'MP4 Range ve başlangıç verisi doğrulandı' : 'HLS doğrulandı';
      if (progress) progress.publish(sources, options); else if (notify) { sources.options = options; notify(sources); }
    }
    return get(self.text, page, BASE + '/').then(function (response) {
      var list = frames(response.body, page), chain = Promise.resolve();
      list.forEach(function (frame, index) {
        chain = chain.then(function () {
          check(); return get(self.text, frame, page).then(function (response) {
            var decoded = decode(response.body, frame), jobs = Promise.resolve();
            decoded.variants.forEach(function (data, quality) {
              jobs = jobs.then(function () {
                check(); var option = { sourceId: 'r012-jw-' + index + (quality ? '-q' + quality : ''), label: (data.family === 'Twitter' ? 'JW' : data.family) + ' · ' + (data.label && data.label !== 'Auto' ? data.label : data.type.toUpperCase()), status: 'pending', stage: data.type === 'mp4' ? 'media' : 'manifest' };
                options.push(option);
                var work = data.type === 'mp4' ? probe(data) : get(self.media, data.url, data.referer).then(function (response) {
                  var body = response.body; if (!/^\s*#EXTM3U/.test(body)) throw fail('manifest', 'HLS yerine farklı yanıt alındı.');
                  if (/METHOD=SAMPLE-AES|KEYFORMAT="[^\"]*(?:widevine|playready)/i.test(body)) throw fail('unsupported', 'DRM korumalı kaynak desteklenmiyor.');
                  var variants = [], lines = body.split(/\r?\n/);
                  lines.forEach(function (line, i) { if (/^#EXT-X-STREAM-INF:/.test(line)) for (var n = i + 1; n < lines.length; n++) if (lines[n].trim() && lines[n].charAt(0) !== '#') { variants.push(I.publicUrl(lines[n].trim(), data.url)); break; } });
                  if (variants.length === 1 && !/^#EXT-X-MEDIA:/m.test(body)) { if (!variants[0]) throw fail('manifest', 'Alt playlist adresi geçersiz.'); data.url = variants[0]; }
                  return data;
                });
                return work.then(function (ready) { publish(ready, option, decoded.subtitles); }).catch(function (e) { check(); last = e; option.status = 'error'; option.stage = e.stage || 'network'; option.detail = root.PlayerCore.safeMessage(e.message); });
              });
            });
            return jobs;
          }).catch(function (e) {
            check(); last = e; options.push({ sourceId: 'r012-jw-' + index, label: 'JW', status: 'error', stage: e.stage || 'network', detail: root.PlayerCore.safeMessage(e.message) });
          });
        });
      });
      return chain;
    }).then(function () { check(); sources.options = options; if (!sources.length) { var e = last || fail('unavailable', 'Bu bölüm için oynatılabilir kaynak bulunamadı.'); e.sourceOptions = options; throw e; } return sources; });
  };
  root.P012Media = { frames: frames, decode: decode }; root.P012Resolver = Resolver;
})(window);
