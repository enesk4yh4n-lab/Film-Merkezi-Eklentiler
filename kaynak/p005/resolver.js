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
