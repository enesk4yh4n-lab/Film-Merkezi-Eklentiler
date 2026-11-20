/* R006: package-owned ES5 media decoder; no remote script execution. */
(function(shared){'use strict';var context=shared.FilmPlugins.context(),window={URL:shared.URL,CatalogUtils:shared.CatalogUtils,PlayerCore:shared.PlayerCore,InertPlayerData:shared.InertPlayerData,SourceProgress:shared.SourceProgress,ChainNetwork:{createClient:function(o){return context.createClient(o);}}};window.DdiziParser={base:'https://www.ddizi.tel',episodeUrl:function(value){try{var u=new shared.URL(value);return u.origin==='https://www.ddizi.tel'&&!u.search&&!u.hash&&/^\/izle\/\d+\/[a-z0-9.-]+\.htm(?:\/[1-9]\d*)?$/.test(u.pathname)?u.href:'';}catch(e){return '';}}};
var useYandexRange = !!shared.MediaSource && /\bTizen (?:4\.0|[56]\.[05])(?:[; )]|$)/i.test(shared.navigator && shared.navigator.userAgent || '');
/* BEGIN generated MP4 range loader */
/* Bounded progressive MP4 -> fragmented MP4. No decoding or transcoding. */
(function (root) {
  'use strict';
  var LIMIT = 8 * 1024 * 1024, META_LIMIT = 8 * 1024 * 1024;
  var PREFIX = 'https://r006-media.invalid/mp4/';
  function fail(message) { var e = new Error('R006 MP4: ' + message); e.stage = 'media'; return e; }
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
  root.YandexMp4Range = { parse: parse, segment: segment, fragment: fragment, playlist: playlist, createLoader: createLoader, prepare: prepare, prefix: PREFIX };
  if (typeof context !== 'undefined' && context.registerLoader) context.registerLoader('mp4-range', createLoader);
})(window);
/* END generated MP4 range loader */
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
    if (/<title[^>]*>\s*(?:Just a moment|Attention Required|Access Denied)|cf[-]mitigated/i.test(body)) throw fail('Oynatıcı erişim engeli.', 'access');
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
    function complete() {
      if (token !== self.generation || !sources.length) check();
      if (self.now() >= deadline) options.forEach(function (option) {
        if (option.status === 'pending') { option.status = 'error'; option.stage = 'timeout'; option.detail = 'Kaynak hazırlama süresi doldu.'; }
      });
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
    function get(url, ref, stage, retried, timeout) {
      check();
      var client = (root.DdiziNetwork || root.ChainNetwork).createClient({
        destination: 'downloads',
        deadline: deadline,
        platformText: !!(shared.PackageFetchTransport && shared.PackageFetchTransport.supported()),
      });
      if (progress && progress.client) client = progress.client(client, check, deadline);
      self.clients.push(client);
      function release() {
        var i = self.clients.indexOf(client);
        if (i >= 0) self.clients.splice(i, 1);
      }
      return client.get(url, ref, { 'User-Agent': 'Mozilla/5.0' }, {deadline:deadline,timeoutMs:Math.min(timeout||30000,Math.max(1,deadline-self.now()))}).then(
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
            !timeout && !retried &&
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
                        var host = new root.URL(candidate.url).hostname;
                        var google = /(^|\.)googlevideo\.com$/.test(host);
                        var sourceId = option.sourceId + (quality ? '-q' + quality : ''), label = a.label + ' · ' + (candidate.label || (google ? 'MP4 360p' : 'MP4'));
                        var source = {
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
                          languagePriority: 1
                        };
                        if (useYandexRange && /^downloader\.disk\.yandex\.(?:ru|com\.tr)$/.test(host)) {
                          source.engineSupport = { html5: 'candidate', avplay: 'unsupported' };
                          root.YandexMp4Range.prepare(source);
                        }
                        sources.push(source);
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
                        var platform = shared.navigator && shared.navigator.userAgent || '';
                        if (!/\bTizen 7\.0(?:[; )]|$)/i.test(platform) || new root.URL(data.url).origin !== 'https://puhu-p3.mncdn.com' ||
                            deadline - self.now() < 6000 || /^#EXT-X-SESSION-KEY:/m.test(manifest.body)) return manifest;
                        var match = /^#EXT-X-STREAM-INF:[^\r\n]*\bRESOLUTION=\d+x480\b[^\r\n]*\r?\n([^#\s][^\r\n]*)/m.exec(manifest.body);
                        if (!match) return manifest;
                        var direct = root.CatalogUtils.url(match[1].trim(), manifest.url || data.url);
                        if (!shared.PackageNetwork.allows(context.key, direct)) return manifest;
                        return get(direct, data.referer, 'variant', false, 5000).then(function (r) {
                          if (/^\s*#EXTM3U/.test(r.body) && /^#EXTINF:/m.test(r.body) && !/^#EXT-X-KEY:(?!METHOD=NONE(?:,|\s|$))/m.test(r.body)) data.avplayUrl = direct;
                          return manifest;
                        }, function () { check(); return manifest; });
                      })
                      .then(function (manifest) {
                        // Keep adaptive HLS below the rendition that stalls on these Tizen versions.
                        var mediaOrigin = new root.URL(data.url).origin,
                          platform = shared.navigator && shared.navigator.userAgent || '',
                          hasSeparateAudio = /#EXT-X-MEDIA:[^\r\n]*\bTYPE=AUDIO\b/.test(manifest.body),
                          isTwitterVideo = mediaOrigin === 'https://video.twimg.com',
                          prefersAvPlay = (/\bTizen 7\.0(?:[; )]|$)/i.test(platform) &&
                            (mediaOrigin === 'https://eu1.tabii.com' || isTwitterVideo)) ||
                            (/\bTizen 8\.0(?:[; )]|$)/i.test(platform) && isTwitterVideo && hasSeparateAudio),
                          needsAutoCap = /\bTizen (?:8|9)(?:\.|\b)/i.test(platform) &&
                            isTwitterVideo && hasSeparateAudio;
                        sources.push({
                          id: option.sourceId,
                          packageKey: context.key,
                          label: a.label,
                          url: data.url,
                          referer: data.referer,
                          destination: 'downloads',
                          userAgent: 'Mozilla/5.0',
                          type: 'hls',
                          hlsWebAudio: mediaOrigin === 'https://streambox.xyz' &&
                            /^#EXTINF:/m.test(manifest.body) && !hasSeparateAudio,
                          transport: /^XHR/.test(manifest.method) ? 'xhr' : 'native',
                          avplayUrl: data.avplayUrl,
                          preferredEngine: prefersAvPlay || data.avplayUrl ? 'avplay' : undefined,
                          stability: needsAutoCap ? { autoMaxHeight: 720 } : undefined,
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
      .then(complete, function (e) {
        if (token === self.generation && e.stage === 'timeout' && sources.length) return complete();
        throw e;
      });
  };
  root.DdiziSourceResolver = Resolver;
})(window);

context.registerResolver({create:function(ctx,log,now){return new window.DdiziSourceResolver(log,now);}});
})(window);
