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
