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
