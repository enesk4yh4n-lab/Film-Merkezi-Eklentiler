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
