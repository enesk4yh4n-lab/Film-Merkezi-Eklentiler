(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,PlayerCore:shared.PlayerCore,SitePayload:shared.SitePayload,InertPlayerData:shared.InertPlayerData,SourceProgress:shared.SourceProgress,PackageMediaLoader:shared.PackageMediaLoader};
/* Bounded progressive MP4 -> fragmented MP4. No decoding or transcoding. */
(function (root) {
  'use strict';
  var LIMIT = 8 * 1024 * 1024, META_LIMIT = 8 * 1024 * 1024;
  var PREFIX = 'https://www.trdiziizle.tv/film-merkezi-r012/mp4/';
  function fail(message) { var e = new Error('R012 MP4: ' + message); e.stage = 'media'; return e; }
  function bounded(ok, message, n) { if (!ok) { var e = fail(message); e.byteLimitExceeded = true; e.byteLimit = n; throw e; } }
  function valid(ok, message) { if (!ok) throw fail(message); }
  function view(b) { return b.p012View || (b.p012View = new DataView(b.buffer, b.byteOffset, b.byteLength)); }
  function u32(b, at) { valid(at >= 0 && at + 4 <= b.length, 'Eksik MP4 tablosu.'); return view(b).getUint32(at); }
  function i32(b, at) { valid(at >= 0 && at + 4 <= b.length, 'Eksik MP4 zaman tablosu.'); return view(b).getInt32(at); }
  function u64(b, at) { var n = u32(b, at) * 4294967296 + u32(b, at + 4); valid(n <= 9007199254740991, 'MP4 adres sınırı.'); return n; }
  function str(b, at, n) { valid(at >= 0 && at + n <= b.length, 'Eksik MP4 alanı.'); var s = ''; for (var i = 0; i < n; i++) s += String.fromCharCode(b[at + i]); return s; }
  function join(parts) { var size = 0, at = 0; parts.forEach(function (p) { size += p.length; }); bounded(size <= LIMIT, 'Parça boyut sınırı.', LIMIT); var b = new Uint8Array(size); parts.forEach(function (p) { b.set(p, at); at += p.length; }); return b; }
  function words(values) { var b = new Uint8Array(values.length * 4), v = new DataView(b.buffer); values.forEach(function (n, i) { v.setUint32(i * 4, n); }); return b; }
  function box(type, parts) { var payload = join(parts), b = new Uint8Array(8 + payload.length); valid(b.length <= LIMIT, 'MP4 kutu sınırı.'); new DataView(b.buffer).setUint32(0, b.length); for (var i = 0; i < 4; i++) b[4 + i] = type.charCodeAt(i); b.set(payload, 8); return b; }
  function full(type, flags, parts) { return box(type, [words([flags])].concat(parts)); }
  function boxes(b, start, end) { var out = [], at = start; valid(end <= b.length, 'MP4 kutusu eksik.'); while (at < end) { valid(at + 8 <= end && out.length < 128, 'Geçersiz MP4 kutusu.'); var size = u32(b, at), head = 8; if (size === 1) { size = u64(b, at + 8); head = 16; } if (!size) size = end - at; valid(size >= head && at + size <= end, 'MP4 kutu uzunluğu geçersiz.'); out.push({ type: str(b, at + 4, 4), start: at, end: at + size, head: head }); at += size; } return out; }
  function children(b, p) { return boxes(b, p.start + p.head, p.end); }
  function find(b, p, type) { return children(b, p).filter(function (x) { return x.type === type; })[0]; }
  function required(b, p, type) { var x = find(b, p, type); valid(x, 'Eksik ' + type + ' tablosu.'); return x; }
  function bytes(b, p) { return b.subarray(p.start, p.end); }
  function entries(b, p, width) { var at = p.start + p.head + 4, n = u32(b, at); valid(n <= 1000000 && at + 4 + n * width <= p.end, 'MP4 kayıt sayısı sınırı.'); return { at: at + 4, count: n }; }
  function upper(array, n) { var lo = 0, hi = array.length; while (lo < hi) { var m = (lo + hi) >>> 1; if (array[m] <= n) lo = m + 1; else hi = m; } return lo - 1; }
  function runs(b, p, signed, expected) { var t = entries(b, p, 8), first = new Uint32Array(t.count), times = p.type === 'stts' ? new Float64Array(t.count) : null, sum = 0, ticks = 0, v = view(b); valid(t.count > 0 && t.count <= 1000000, 'MP4 zaman tablosu sınırı.'); for (var i = 0; i < t.count; i++) { first[i] = sum; if (times) times[i] = ticks; var count = v.getUint32(t.at + i * 8); valid(count > 0 && sum + count <= expected, 'MP4 örnek sayısı uyuşmuyor.'); sum += count; if (times) { var value = v.getUint32(t.at + i * 8 + 4); valid(value > 0, 'MP4 örnek süresi geçersiz.'); ticks += count * value; valid(ticks <= 9007199254740991, 'MP4 zaman sınırı.'); } } valid(sum === expected, 'MP4 örnek sayısı uyuşmuyor.'); return { at: t.at, first: first, times: times, ticks: ticks, signed: signed }; }
  function runValue(b, r, i) { var at = r.at + upper(r.first, i) * 8 + 4; return r.signed ? i32(b, at) : u32(b, at); }
  function dts(t, i) { if (i === t.count) return t.time.ticks; var r = upper(t.time.first, i); return t.time.times[r] + (i - t.time.first[r]) * u32(t.b, t.time.at + r * 8 + 4); }
  function atTime(t, seconds) { var tick = seconds * t.scale, lo = 0, hi = t.count; while (lo < hi) { var m = (lo + hi) >>> 1; if (dts(t, m) < tick - 0.0001) lo = m + 1; else hi = m; } return lo; }
  function sizeAt(t, i) { return t.fixed || u32(t.b, t.sizes + i * 4); }
  function sync(t, i) { if (!t.sync) return true; var lo = 0, hi = t.sync.count; while (lo < hi) { var m = (lo + hi) >>> 1, n = u32(t.b, t.sync.at + m * 4) - 1; if (n < i) lo = m + 1; else hi = m; } return lo < t.sync.count && u32(t.b, t.sync.at + lo * 4) === i + 1; }
  function sample(t, i) { valid(i >= 0 && i < t.count, 'MP4 örnek konumu geçersiz.'); var chunk = upper(t.chunkFirst, i), offset = t.wide ? u64(t.b, t.chunks.at + chunk * 8) : u32(t.b, t.chunks.at + chunk * 4); for (var n = t.chunkFirst[chunk]; n < i; n++) offset += sizeAt(t, n); return { offset: offset, size: sizeAt(t, i), duration: runValue(t.b, t.time, i), cts: t.cts ? runValue(t.b, t.cts, i) : 0, flags: t.kind === 'soun' || sync(t, i) ? 33554432 : 16842752 }; }
  function descriptor(b, start, end) { valid(start + 2 <= end, 'Eksik ses yapılandırması.'); var tag = b[start++], size = 0, n = 0, value; do { valid(start < end && n++ < 4, 'Ses yapılandırma uzunluğu geçersiz.'); value = b[start++]; size = size * 128 + (value & 127); } while (value & 128); valid(start + size <= end, 'Ses yapılandırması eksik.'); return { tag: tag, start: start, end: start + size }; }
  function audioCodec(b, entry) { valid(entry.end - entry.start >= 36 && view(b).getUint16(entry.start + 16) === 0, 'Bu MP4 ses başlığı desteklenmiyor.'); var esds = boxes(b, entry.start + 36, entry.end).filter(function (p) { valid(p.type !== 'sinf', 'Şifreli MP4 desteklenmiyor.'); return p.type === 'esds'; })[0]; valid(esds, 'AAC yapılandırması bulunamadı.'); var es = descriptor(b, esds.start + esds.head + 4, esds.end); valid(es.tag === 3 && es.start + 3 <= es.end, 'AAC kanal tanımı geçersiz.'); var flags = b[es.start + 2], at = es.start + 3; if (flags & 128) at += 2; if (flags & 64) { valid(at < es.end, 'AAC adres alanı eksik.'); at += b[at] + 1; } if (flags & 32) at += 2; var decoder = descriptor(b, at, es.end); valid(decoder.tag === 4 && decoder.start + 13 <= decoder.end && b[decoder.start] === 64, 'Bu MP4 ses biçimi desteklenmiyor.'); var specific = descriptor(b, decoder.start + 13, decoder.end); valid(specific.tag === 5 && specific.end - specific.start >= 2 && b[specific.start] >>> 3 === 2, 'Bu MP4 için yalnız AAC-LC sesi doğrulandı.'); return 'mp4a.40.2'; }
  function track(b, trak) {
    var tkhd = required(b, trak, 'tkhd'), mdia = required(b, trak, 'mdia'), mdhd = required(b, mdia, 'mdhd'), hdlr = required(b, mdia, 'hdlr'), minf = required(b, mdia, 'minf'), stbl = required(b, minf, 'stbl');
    var kind = str(b, hdlr.start + hdlr.head + 8, 4); if (kind !== 'vide' && kind !== 'soun') return null;
    var t = { b: b, trak: trak, mdia: mdia, minf: minf, stbl: stbl, kind: kind, id: u32(b, tkhd.start + tkhd.head + (b[tkhd.start + tkhd.head] ? 20 : 12)), scale: u32(b, mdhd.start + mdhd.head + (b[mdhd.start + mdhd.head] ? 20 : 12)) };
    valid(t.scale > 0, 'Geçersiz MP4 zaman ölçeği.');
    t.stsd = required(b, stbl, 'stsd'); var desc = entries(b, t.stsd, 0); valid(desc.count === 1, 'Çoklu MP4 örnek biçimi desteklenmiyor.');
    var descriptions = boxes(b, desc.at, t.stsd.end); valid(descriptions.length === 1, 'Geçersiz MP4 örnek biçimi.'); var code = descriptions[0].type;
    valid(kind === 'vide' ? code === 'avc1' || code === 'avc3' : code === 'mp4a', 'Bu MP4 için H.264/AAC dışındaki biçim desteklenmiyor.');
    if (kind === 'vide') { var conf = boxes(b, descriptions[0].start + 86, descriptions[0].end).filter(function (p) { return p.type === 'avcC'; })[0]; valid(conf && conf.end - conf.start >= 12, 'Eksik AVC yapılandırması.'); var hex = function (n) { return ('0' + n.toString(16)).slice(-2); }; t.codec = 'avc1.' + hex(b[conf.start + conf.head + 1]) + hex(b[conf.start + conf.head + 2]) + hex(b[conf.start + conf.head + 3]); }
    else t.codec = audioCodec(b, descriptions[0]);
    var stsz = required(b, stbl, 'stsz'); t.fixed = u32(b, stsz.start + stsz.head + 4); t.count = u32(b, stsz.start + stsz.head + 8); t.sizes = stsz.start + stsz.head + 12;
    valid(t.count > 0 && t.count <= 1000000 && (t.fixed || t.sizes + t.count * 4 <= stsz.end), 'MP4 örnek boyutları sınırı.');
    t.time = runs(b, required(b, stbl, 'stts'), false, t.count); var ctts = find(b, stbl, 'ctts'); if (ctts) t.cts = runs(b, ctts, b[ctts.start + ctts.head] === 1, t.count);
    var stss = find(b, stbl, 'stss'); if (stss) { t.sync = entries(b, stss, 4); valid(t.sync.count > 0, 'MP4 ana kare listesi boş.'); var previous = 0; for (var n = 0; n < t.sync.count; n++) { var value = u32(b, t.sync.at + n * 4); valid(value > previous && value <= t.count, 'MP4 ana kare sırası geçersiz.'); previous = value; } }
    var chunks = find(b, stbl, 'co64') || required(b, stbl, 'stco'); t.wide = chunks.type === 'co64'; t.chunks = entries(b, chunks, t.wide ? 8 : 4); valid(t.chunks.count > 0 && t.chunks.count <= 1000000, 'MP4 parça dizini sınırı.');
    var stsc = entries(b, required(b, stbl, 'stsc'), 12), count = 0; valid(stsc.count > 0 && u32(b, stsc.at) === 1, 'MP4 parça tablosu geçersiz.'); t.chunkFirst = new Uint32Array(t.chunks.count);
    for (var si = 0; si < stsc.count; si++) { var first = u32(b, stsc.at + si * 12) - 1, until = si + 1 < stsc.count ? u32(b, stsc.at + (si + 1) * 12) - 1 : t.chunks.count, per = u32(b, stsc.at + si * 12 + 4); valid(first < until && until <= t.chunks.count && per > 0 && per <= 65536 && u32(b, stsc.at + si * 12 + 8) === 1 && count + (until - first) * per <= t.count, 'MP4 parça örnekleri geçersiz.'); for (var c = first; c < until; c++) { t.chunkFirst[c] = count; count += per; } }
    valid(count === t.count, 'MP4 parça sayısı uyuşmuyor.'); return t;
  }
  function initTrack(t) { var b = t.b; function rebuild(p) { if (p.type === 'stbl') return box('stbl', [bytes(b, t.stsd), full('stts', 0, [words([0])]), full('stsc', 0, [words([0])]), full('stsz', 0, [words([0, 0])]), full('stco', 0, [words([0])])]); return box(p.type, children(b, p).map(function (x) { return /^(?:mdia|minf|stbl)$/.test(x.type) ? rebuild(x) : bytes(b, x); })); } return rebuild(t.trak); }
  function parse(data) {
    var b = new Uint8Array(data); bounded(b.length <= META_LIMIT, 'MP4 metadata boyut sınırı.', META_LIMIT); var roots = boxes(b, 0, b.length), moov = roots.filter(function (p) { return p.type === 'moov'; })[0]; valid(moov && !find(b, moov, 'pssh'), 'Açık MP4 metadata bulunamadı.');
    var ts = children(b, moov).filter(function (p) { return p.type === 'trak'; }); valid(ts.length <= 8, 'MP4 kanal sayısı sınırı.'); var tracks = ts.map(function (p) { return track(b, p); }).filter(Boolean), video = tracks.filter(function (t) { return t.kind === 'vide'; })[0], audio = tracks.filter(function (t) { return t.kind === 'soun'; })[0];
    valid(video && sync(video, 0), 'MP4 başlangıç ana karesi bulunamadı.'); tracks = [video].concat(audio ? [audio] : []);
    var segments = [], from = 0, candidates = video.sync ? video.sync.count : video.count;
    for (var i = 1; i < candidates; i++) { var at = video.sync ? u32(b, video.sync.at + i * 4) - 1 : i, seconds = (dts(video, at) - dts(video, from)) / video.scale; if (seconds >= 4) { valid(seconds <= 30 && segments.length < 10000, 'MP4 parça süresi sınırı.'); segments.push({ first: from, end: at, start: dts(video, from) / video.scale, duration: seconds }); from = at; } }
    var lastDuration = (dts(video, video.count) - dts(video, from)) / video.scale; valid(lastDuration > 0 && lastDuration <= 30 && segments.length < 10000, 'MP4 son parça süresi sınırı.'); segments.push({ first: from, end: video.count, start: dts(video, from) / video.scale, duration: lastDuration });
    var ftyp = box('ftyp', [new Uint8Array([105,115,111,54]), words([1]), new Uint8Array([105,115,111,54,109,112,52,49,97,118,99,49,100,97,115,104])]);
    var mvex = box('mvex', tracks.map(function (t) { return full('trex', 0, [words([t.id, 1, 0, 0, 0])]); }));
    var init = join([ftyp, box('moov', [bytes(b, required(b, moov, 'mvhd'))].concat(tracks.map(initTrack), [mvex]))]);
    return { tracks: tracks, video: video, audio: audio, segments: segments, init: init.buffer, duration: dts(video, video.count) / video.scale };
  }
  function segment(meta, index) {
    var part = meta.segments[index]; valid(part, 'MP4 parça numarası geçersiz.'); var min = Infinity, max = 0, total = 0;
    var tracks = meta.tracks.map(function (t) { var first = t === meta.video ? part.first : atTime(t, part.start), end = t === meta.video ? part.end : atTime(t, part.start + part.duration), list = []; valid(end - first <= 8192, 'MP4 parça örnek sayısı sınırı.'); for (var i = first; i < end; i++) { var s = sample(t, i); valid(s.size > 0 && s.offset >= 0 && s.offset + s.size <= 9007199254740991, 'MP4 örnek sınırı.'); list.push(s); min = Math.min(min, s.offset); max = Math.max(max, s.offset + s.size); total += s.size; } return { id: t.id, first: first, dts: dts(t, first), samples: list }; }).filter(function (t) { return t.samples.length; });
    valid(max > min, 'MP4 parça aralığı geçersiz.'); bounded(max - min <= LIMIT - 131072 && total <= LIMIT - 131072, 'MP4 parçası 8 MiB sınırını aşıyor.', LIMIT); return { index: index, tracks: tracks, start: min, end: max, total: total };
  }
  function fragment(part, response) {
    var input = new Uint8Array(response); valid(input.length === part.end - part.start, 'MP4 Range uzunluğu uyuşmuyor.');
    function moof(offset) { var used = 0; return box('moof', [full('mfhd', 0, [words([part.index + 1])])].concat(part.tracks.map(function (t) { var values = [t.samples.length, offset + used]; t.samples.forEach(function (s) { values.push(s.duration, s.size, s.flags, s.cts); used += s.size; }); return box('traf', [full('tfhd', 131072, [words([t.id])]), full('tfdt', 16777216, [words([Math.floor(t.dts / 4294967296), t.dts >>> 0])]), full('trun', 16781057, [words(values)])]); }))); }
    var header = moof(0), data = new Uint8Array(part.total), at = 0; part.tracks.forEach(function (t) { t.samples.forEach(function (s) { data.set(input.subarray(s.offset - part.start, s.offset - part.start + s.size), at); at += s.size; }); });
    return join([moof(header.length + 8), box('mdat', [data])]).buffer;
  }
  function playlist(meta, prefix) { prefix = prefix || PREFIX; var target = Math.ceil(Math.max.apply(Math, meta.segments.map(function (s) { return s.duration; }))), lines = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-TARGETDURATION:' + target, '#EXT-X-MEDIA-SEQUENCE:0', '#EXT-X-PLAYLIST-TYPE:VOD', '#EXT-X-MAP:URI="' + prefix + 'init.mp4"']; meta.segments.forEach(function (s, i) { lines.push('#EXTINF:' + s.duration.toFixed(6) + ',', prefix + 's/' + i + '.m4s'); }); return lines.concat(['#EXT-X-ENDLIST', '']).join('\n'); }
  function createLoader(session) {
    var closed = false, queue = [], active = null, meta = null;
    var real = root.InertPlayerData.publicUrl(session.config.url), referer = session.config.referer || '', prefix = PREFIX;
    if (session.config.id) { valid(/^[a-z0-9-]{1,80}$/i.test(session.config.id), 'MP4 oturum kimliği geçersiz.'); prefix += session.config.id + '/'; }
    valid(real && /^https:\/\//.test(real), 'Geçersiz MP4 adresi.');
    function check(job) { if (closed || job.cancelled) { var e = fail('İptal edildi.'); e.cancelled = true; throw e; } if (Date.now() >= job.deadline) { var timeout = fail('Medya isteği süresi doldu.'); timeout.stage = 'timeout'; throw timeout; } }
    function read(job, start, end) {
      check(job); valid(start >= 0 && end > start && end - start <= LIMIT && end <= 9007199254740991, 'MP4 Range sınırı.');
      var task = session.request(real, { binary: true, kind: 'mp4-range', rangeStart: start, rangeEnd: end, byteLimit: end - start, referer: referer, deadline: job.deadline, timeoutMs: Math.max(1, Math.min(12000, job.deadline - Date.now())) }); job.task = task;
      return task.promise.then(function (r) { job.task = null; check(job); valid(r.status === 206 && r.data instanceof ArrayBuffer && r.data.byteLength === end - start, 'MP4 HTTP Range yanıtı uyuşmuyor.'); return r.data; }, function (e) { job.task = null; throw e; });
    }
    function metadata(job) {
      if (meta) return Promise.resolve(meta);
      return read(job, 0, 4096).then(function (data) {
        var head = new Uint8Array(data); valid(str(head, 4, 4) === 'ftyp', 'MP4 başlangıcı doğrulanamadı.');
        function next(at, count) {
          check(job); valid(count < 32, 'MP4 kutu tarama sınırı.');
          var header = at + 16 <= head.length ? Promise.resolve(head.subarray(at, at + 16)) : read(job, at, at + 16).then(function (b) { return new Uint8Array(b); });
          return header.then(function (b) {
            var size = u32(b, 0); if (size === 1) size = u64(b, 8); valid(size >= 8 && at + size <= 9007199254740991, 'MP4 kutu adresi geçersiz.');
            if (str(b, 4, 4) === 'moov') { bounded(size <= META_LIMIT, 'MP4 metadata 8 MiB sınırını aşıyor.', META_LIMIT); return read(job, at, at + size).then(function (body) { check(job); var parsed = parse(body); check(job); meta = parsed; return parsed; }); }
            return next(at + size, count + 1);
          });
        }
        return next(0, 0);
      });
    }
    function work(job) {
      check(job); return metadata(job).then(function (m) {
        check(job); if (job.url === prefix + 'master.m3u8') return { data: playlist(m, prefix), status: 200, url: job.url };
        if (job.url === prefix + 'init.mp4') return { data: m.init.slice(0), status: 200, url: job.url };
        var match = /^s\/(\d{1,5})\.m4s$/.exec(job.url.slice(prefix.length)); valid(match, 'Bilinmeyen oturum medya adresi.');
        var part = segment(m, Number(match[1])); return read(job, part.start, part.end).then(function (body) { check(job); return { data: fragment(part, body), status: 200, url: job.url }; });
      });
    }
    function pump() {
      if (closed || active || !queue.length) return;
      var job = (active = queue.shift());
      Promise.resolve().then(function () { return work(job); }).then(function (r) { check(job); job.finish(null, r); }, function (e) { job.finish(e); }).then(function () { active = null; pump(); }, function (e) { job.finish(e); active = null; pump(); });
    }
    function cancel(job) { if (job.cancelled) return; job.cancelled = true; try { if (job.task) job.task.cancel(); } catch (ignore) { closed = true; queue.slice().forEach(cancel); queue = []; } var i = queue.indexOf(job); if (i >= 0) queue.splice(i, 1); var e = fail('İptal edildi.'); e.cancelled = true; job.finish(e); }
    return {
      load: function (url, options) {
        valid(!closed && url.indexOf(prefix) === 0 && /^(?:master\.m3u8|init\.mp4|s\/\d{1,5}\.m4s)$/.test(url.slice(prefix.length)) && queue.length < 8, 'Oturum medya isteği geçersiz.');
        var end = typeof options.deadline === 'function' ? options.deadline() : options.deadline, job = { url: url, deadline: Math.min(end || Infinity, Date.now() + (options.timeoutMs || 30000)), cancelled: false, task: null, done: false };
        var promise = new Promise(function (resolve, reject) { job.finish = function (error, response) { if (job.done) return; job.done = true; if (error) reject(error); else resolve(response); }; });
        queue.push(job); pump(); return { promise: promise, cancel: function () { cancel(job); } };
      },
      destroy: function () { if (closed) return; closed = true; if (active) cancel(active); queue.slice().forEach(cancel); queue = []; meta = null; }
    };
  }
  function prepare(source) { var id = String(source.id || 'stream'), hash = 2166136261, url = source.url; valid(/^[a-z0-9-]{1,60}$/i.test(id), 'MP4 kaynak kimliği geçersiz.'); for (var i = 0; i < url.length; i++) { hash ^= url.charCodeAt(i); hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24); } id += '-' + (hash >>> 0).toString(16); source.loaderConfig = { id: id, url: url, referer: source.referer || '' }; source.loaderId = 'mp4-range'; source.url = PREFIX + id + '/master.m3u8'; source.originalType = 'mp4'; source.type = 'hls'; source.preferredEngine = 'html5'; source.playbackRequirements = { customLoader: true, requiredHeaders: [] }; return source; }
  root.P012MP4 = { parse: parse, segment: segment, fragment: fragment, playlist: playlist, createLoader: createLoader, prepare: prepare, prefix: PREFIX };
  if (typeof context !== 'undefined' && context.registerLoader) context.registerLoader('mp4-range', createLoader);
})(window);
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
  function Resolver() { this.text = context.createClient({ platformText: false, userAgent: 'Mozilla/5.0 (SMART-TV; LINUX; Tizen 3.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/3.0 TV Safari/538.1' }); this.media = context.createClient(); this.sessions = []; this.generation = 0; }
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

context.registerResolver({create:function(){return new window.P012Resolver();}});
})(window);
