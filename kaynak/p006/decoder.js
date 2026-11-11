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
