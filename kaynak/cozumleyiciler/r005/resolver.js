/* R005: ES5 package-local data reader; remote scripts are never executed. */
(function(root){
'use strict';
var context=root.FilmPlugins.context();
/* Canonical ES5 data reader. Included inside both P005 and R005 closures. */
function createP005Data(root) {
  var BASE = 'https://www.startv.com.tr', MEDIA = 'https://media.startv.com.tr/star-tv';
  function fail(message) { return new Error('P005: ' + message); }
  function page(value) {
    try { var u = new root.URL(value, BASE); return u.origin === BASE && !u.username && !u.password ? BASE + u.pathname.replace(/\/$/, '') : ''; }
    catch (ignore) { return ''; }
  }
  function parse(body) {
    if (typeof body !== 'string' || body.length > 2097152) throw fail('Sayfa verisi geçersiz veya çok büyük.');
    var chunks = [], pattern = /self\.__next_f\.push\((\[[\s\S]*?\])\)\s*;?\s*<\/script>/g, match, args;
    while ((match = pattern.exec(body))) {
      try { args = JSON.parse(match[1]); } catch (ignore) { throw fail('Sayfa veri biçimi okunamadı.'); }
      if (args[0] === 1 && typeof args[1] === 'string') chunks.push(args[1]);
      if (chunks.length > 8192) throw fail('Sayfa veri sınırı aşıldı.');
    }
    if (!chunks.length) throw fail('İçerik verisi bulunamadı.');
    var stream = chunks.join(''), map = {}, i = 0, count = 0, header, id, length, start, bytes, code, end;
    while (i < stream.length) {
      if (stream.charAt(i) === '\n') { i++; continue; }
      header = /^([0-9a-f]{1,12}):/i.exec(stream.slice(i, i + 30));
      if (!header || ++count > 20000) throw fail('Sayfa veri kaydı bozuk.');
      id = header[1]; i += header[0].length;
      if (stream.charAt(i) === 'T') {
        header = /^T([0-9a-f]{1,8}),/i.exec(stream.slice(i, i + 30));
        if (!header) throw fail('Metin kaydı bozuk.');
        length = parseInt(header[1], 16); i += header[0].length; start = i; bytes = 0;
        if (length > 2097152) throw fail('Metin kaydı çok büyük.');
        while (i < stream.length && bytes < length) {
          code = stream.charCodeAt(i++);
          if (code >= 55296 && code <= 56319) {
            if (i >= stream.length || stream.charCodeAt(i) < 56320 || stream.charCodeAt(i) > 57343) throw fail('UTF-8 metni bozuk.');
            i++; bytes += 4;
          } else bytes += code < 128 ? 1 : code < 2048 ? 2 : 3;
        }
        if (bytes !== length) throw fail('Metin kaydı eksik.');
        map[id] = stream.slice(start, i);
      } else {
        end = stream.indexOf('\n', i); if (end < 0) end = stream.length;
        if (/^[\[{"]/.test(stream.charAt(i))) {
          try { map[id] = JSON.parse(stream.slice(i, end)); } catch (ignore2) { throw fail('JSON içerik kaydı bozuk.'); }
        }
        i = end + 1;
      }
    }
    function value(v) {
      var n = 0, m;
      while (typeof v === 'string' && (m = /^\$(?:L|@)?([0-9a-f]+)$/i.exec(v))) {
        if (++n > 12 || !Object.prototype.hasOwnProperty.call(map, m[1])) return null;
        v = map[m[1]];
      }
      return v === '$undefined' ? null : v;
    }
    function field(v, key) { v = value(v); return v && typeof v === 'object' ? value(v[key]) : null; }
    function text(v) { v = value(v); return typeof v === 'string' ? v.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '') : ''; }
    function find(test, stop) {
      var pending = Object.keys(map).map(function (k) { return map[k]; }), out = [], visits = 0, v, keys, j;
      while (pending.length) {
        v = pending.pop(); if (!v || typeof v !== 'object') continue;
        if (++visits > 100000) throw fail('İçerik işleme sınırı aşıldı.');
        if (test(v)) { out.push(v); if (stop) continue; }
        keys = Object.keys(v); for (j = 0; j < keys.length; j++) if (v[keys[j]] && typeof v[keys[j]] === 'object') pending.push(v[keys[j]]);
      }
      return out;
    }
    function image(v) { var path = field(v, 'fullPath'); return typeof path === 'string' && /^\/images\/[^\r\n]+$/.test(path) ? MEDIA + path : ''; }
    function selected(type, address) {
      var wanted = page(address), rows = find(function (v) { return field(v, 'resourceType') === type && page(field(v, 'url')) === wanted && /^[a-f0-9]{24}$/i.test(field(v, '_id') || ''); }, true);
      if (!rows.length) throw fail('İstenen içeriğin verisi bulunamadı.');
      return rows[0];
    }
    return { value: value, field: field, text: text, find: find, image: image, selected: selected };
  }
  return { base: BASE, page: page, parse: parse, fail: fail };
}

/* Canonical R005 resolver body; public player configuration is read as data. */
var D = createP005Data(root), BASE = D.base, publicParameter = '';
context.registerResolver({ create: function () {
  var client = context.createClient(), generation = 0;
  return {
    cancel: function () { generation++; client.cancel(); },
    resolve: function (input, deadline, notify) {
      var token = generation, address = D.page(input.pageUrl), episode, media;
      function check() { if (token !== generation) { var e = D.fail('İptal edildi.'); e.cancelled = true; throw e; } if (Date.now() >= deadline) throw D.fail('Kaynak hazırlama süresi doldu.'); }
      function get(url, limit) { check(); return client.get(url, address, { 'User-Agent': 'Mozilla/5.0' }, { deadline: deadline, timeoutMs: Math.min(30000, Math.max(1, deadline - Date.now())), byteLimit: limit || 2097152 }).then(function (r) { check(); return r.body; }); }
      if (!/^https:\/\/www\.startv\.com\.tr\/dizi\/[^/]+\/bolumler\/[^/]+$/.test(address)) return Promise.reject(D.fail('Yalnız tam bölüm bağlantısı oynatılabilir.'));
      return get(address).then(function (body) {
        var data = D.parse(body), item = data.selected('Episode', address), video = data.field(item, 'video'), ref = data.field(video, 'referenceId');
        if (!/^(?:[a-f0-9]{24}|[0-9]{1,12})$/i.test(ref || '') || Number(data.field(item, 'episodeNo')) < 1) throw D.fail('Tam bölümün video kimliği bulunamadı.');
        episode = { ref: ref, number: Number(data.field(item, 'episodeNo')) };
        if (publicParameter) return publicParameter;
        return get('https://player-assets.dygdigital.com/prod/js/bundle.js').then(function (text) {
          var m = /this\.secret\s*=\s*this\.options\.secretKey\s*\|\|\s*["']([A-Za-z0-9_*.-]{1,128})["']/.exec(text);
          if (!m) throw D.fail('Yayıncının herkese açık oynatıcı ayarı tanınamadı.');
          publicParameter = m[1]; return publicParameter;
        });
      }).then(function (parameter) {
        return get('https://dygvideo.dygdigital.com/api/video_info?akamai=true&PublisherId=1&ReferenceId=StarTv_' + encodeURIComponent(episode.ref) + '&SecretKey=' + encodeURIComponent(parameter), 524288);
      }).then(function (body) {
        var j; try { j = JSON.parse(body); } catch (ignore) { throw D.fail('Medya API yanıtı okunamadı.'); }
        var data = j && j.data, value = data && data.flavors && data.flavors.hls;
        if (!j || j.success !== true || !data || !/episode/i.test(data.content_type || '') || typeof value !== 'string') throw D.fail('Bölüm bu bağlantı veya bölgede erişime açık değil.');
        if (Number(data.episode_number) > 0 && Number(data.episode_number) !== episode.number) throw D.fail('Medya API yanıtı farklı bölüme ait.');
        try { media = new root.URL(value); } catch (ignore2) { throw D.fail('Medya adresi geçersiz.'); }
        if (media.protocol !== 'https:' || media.username || media.password) throw D.fail('Güvenli medya adresi verilmedi.');
        return get(media.href).then(function (body) {
          if (!/^\s*#EXTM3U/.test(body)) throw D.fail('Medya yanıtı HLS değil.');
          if (/METHOD=SAMPLE-AES|KEYFORMAT\s*=\s*"[^"]*(widevine|playready)/i.test(body)) throw D.fail('Bu bölüm DRM destekli oynatıcı gerektiriyor.');
          check(); var result = [{ id: 'r005-hls', label: 'P005 · Tam bölüm', type: 'hls', url: media.href, referer: address, packageKey: context.key, status: 'ready', playlist: true, transport: 'native', subtitles: [] }];
          if (notify) notify(result); return result;
        });
      });
    }
  };
} });

})(window);
