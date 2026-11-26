(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  var base = 'https://www.nadirfilm.com';
  var ownPlayer = 'https://player.nadirfilm.com';
  var I = root.InertPlayerData;
  var param = root.CatalogSiteKit.param;
  var moviePath = /^\/[a-z0-9-]+-izle\/?$/;

 function fail(stage,message){var e=new Error('R016: '+message);e.stage=stage;return e;}
 function media(value,referer){var u=I.publicUrl(value,referer);if(!u)throw fail('decode','Geçersiz medya adresi.');return {url:u,type:'hls',referer:referer,subtitles:[]};}
 function dzen(body,frame){
  var id=/^\/embed\/([A-Za-z0-9_-]{8,80})$/.exec(new root.URL(frame).pathname),meta=I.doc(body).querySelector('meta[property="og:vh-uuid"]'),re=/\bvar\s+_params\s*=\s*\(\s*/g,m,data=null;
  if(!id||!meta||meta.content!==id[1])throw fail('identity','Dzen video kimliği uyuşmuyor.');
  while((m=re.exec(body))){var v=I.object(body.slice(m.index),/^var\s+_params\s*=\s*\(\s*/);v=v.ssrData&&v.ssrData.exportResponse&&v.ssrData.exportResponse.content;if(v&&v.content_id===id[1]){data=v;break;}}
  var stream=data&&Array.isArray(data.streams)&&data.streams.filter(function(s){return s.type==='hls'&&I.publicUrl(s.url);})[0];
  if(!stream)throw fail('unavailable','Dzen bu video için HLS kaynağı vermedi.');return media(stream.url,frame);
 }
 function ok(body,frame){
  var id=/^\/videoembed\/(\d+)\/?$/.exec(new root.URL(frame).pathname),nodes=I.doc(body).querySelectorAll('[data-options]'),data=null;
  if(!id)throw fail('identity','Geçersiz OK.ru video kimliği.');
  if(/\byandexError\(\s*['"](?:userNotFound|copyrightsRestricted|notFound|videoNotFound)['"]/.test(body)||/["']copyrightsRestricted["']\s*:\s*true/.test(body))throw fail('unavailable','OK.ru videosu kaldırılmış veya erişime kapalı.');
  for(var i=0;i<nodes.length;i++){try{var o=JSON.parse(nodes[i].getAttribute('data-options')),v=o.flashvars&&o.flashvars.metadata;v=typeof v==='string'?JSON.parse(v):v;if(v&&v.movie&&String(v.movie.movieId||v.movie.id)===id[1]){data=v;break;}}catch(ignore){}}
  if(!data)throw fail('decode','Aktif OK.ru video bilgisi okunamadı.');
  if(data.movie.notPublished||/blocked|deleted|copyright|restricted/i.test(String(data.movie.status||'')))throw fail('unavailable','OK.ru videosu bu yanıtta kullanılamıyor.');
  var result=media(data.hlsManifestUrl||data.ondemandHls||data.liveHlsManifestUrl,frame),p=new root.URL(result.url);
  if(!/(^|\.)(?:vkuser\.net|okcdn\.ru)$/.test(p.hostname))throw fail('identity','OK.ru medya kökeni uyuşmuyor.');
  var urls=[],seen={};(Array.isArray(data.failoverHosts)?data.failoverHosts:[]).slice(0,8).forEach(function(host){if(typeof host!=='string'||!/^vd[1-9][0-9]{0,3}\.okcdn\.ru$/.test(host)||urls.length>=2)return;var candidate=new root.URL(result.url);candidate.hostname=host;if(!seen[candidate.href]){seen[candidate.href]=true;urls.push(candidate.href);}});
  if(!seen[result.url])urls.push(result.url);result.fallbackUrls=urls;return result;
 }
 function vidmoly(body,frame){
  var id=/^\/embed-([a-z0-9]{8,32})\.html$/.exec(new root.URL(frame).pathname),doc=I.doc(body),values=[body].concat(I.unpack(body)),result=null;
  if(!id||!doc.querySelector('#vplayer'))throw fail('identity','Vidmoly aktif oynatıcısı tanınamadı.');
  values.some(function(s){var m=/\bjwplayer\(\s*['"]vplayer['"]\s*\)\s*\.setup\(\s*\{/.exec(s),alias=/\bvar\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*jwplayer\(\s*['"]vplayer['"]\s*\)/.exec(s);if(!m&&alias)m=new RegExp('\\b'+alias[1].replace(/\$/g,'\\$')+'\\s*\\.setup\\(\\s*\\{').exec(s);if(!m)return false;var active=s.slice(m.index+m[0].length,m.index+m[0].length+100000),file=/\bsources\s*:\s*\[\s*\{\s*file\s*:\s*/.exec(active);if(!file)return false;var u=I.publicUrl(I.literal(active,file.index+file[0].length).value,frame),p=u&&new root.URL(u);if(!p||!new RegExp('/'+id[1]+'(?:_|/)').test(p.pathname))throw fail('identity','Vidmoly medya kimliği uyuşmuyor.');result=media(u,frame);return true;});
  if(!result)throw fail('decode','Vidmoly aktif HLS ayarı bulunamadı.');
  var marker=/\bvar\s+baseTracks\s*=\s*\[/.exec(body),start=marker&&marker.index+marker[0].length,end=start,seen={};
  if(marker){for(;end<body.length&&end<start+65536;end++){var ch=body.charAt(end);if(ch==='"'||ch==="'")end=I.literal(body,end).end-1;else if(ch===']')break;}if(body.charAt(end)!==']')throw fail('decode','Vidmoly altyazı verisi eksik.');var re=/\{([^{}]{0,8192})\}/g,m;while((m=re.exec(body.slice(start,end)))&&result.subtitles.length<32){var item=m[1];function field(name){var match=new RegExp('(?:^|[,\\s])(?:'+name+'|["\u0027]'+name+'["\u0027])\\s*:\\s*').exec(item);return match?I.literal(item,match.index+match[0].length).value:'';}if(field('kind')!=='captions')continue;var track=I.publicUrl(field('file'),frame),p=track&&new root.URL(track),label=root.CatalogUtils.clean(field('label'));if(!p||p.hostname!=='srt.vidmoly.me'||!new RegExp('^/srt/[0-9]+/'+id[1]+'_[A-Za-z0-9_-]+\\.vtt$').test(p.pathname)||seen[track])continue;seen[track]=true;result.subtitles.push({id:'r016-vm-sub-'+result.subtitles.length,url:track,label:label||'Altyazı',language:/turkish|türkçe/i.test(label)?'tr':/english/i.test(label)?'en':'',format:'vtt',packageKey:context.key});}}
  return result;
 }

﻿  function embed(value, page) {
    var url = I.publicUrl(value, page);
    var p = url && new root.URL(url);
    if (!p || p.port || p.hash) return null;
    if (p.origin === ownPlayer && p.pathname === '/embed/movie' && /^\d{1,12}$/.test(param(p.href, 'tmdb') || '')) return { url:url, family:'nadir' };
    if (p.hostname === 'ok.ru' && /^\/videoembed\/\d+\/?$/.test(p.pathname)) return { url:url, family:'okru' };
    if (p.hostname === 'dzen.ru' && /^\/embed\/[A-Za-z0-9_-]{8,80}$/.test(p.pathname)) return { url:url, family:'dzen' };
    if (/^vidmoly\.(biz|me)$/.test(p.hostname) && /^\/embed-[a-z0-9]{8,32}\.html$/.test(p.pathname)) return { url:url, family:'moly' };
    return null;
  }

  function options(body, page) {
    var doc = I.doc(body), result = [], seen = {};
    var labels = {nadir:'NadirFilm',okru:'OK.ru',dzen:'Dzen',moly:'Vidmoly'};
    function add(pane, key, label) {
      if (!pane || !/^[a-z0-9-]{1,32}$/.test(key || '') || /fragman|trailer/i.test(label)) return;
      var shell = pane.querySelector('[data-nfp-player]');
      var element = shell && shell.querySelector('[data-nfp-embed] iframe[data-nfp-src]');
      var option = element && embed(element.getAttribute('data-nfp-src'), page);
      if (!option || seen[option.url]) return;
      option.sourceId = 'r016-' + key;
      option.label = label || labels[option.family];
      var caption = I.publicUrl(shell.getAttribute('data-nfp-subtitle'), page);
      var address = caption && new root.URL(caption);
      if (address && address.origin === base && address.pathname === '/' &&
          /^\?nadirfilm_subtitle=\d{1,12}$/.test(address.search) && !address.hash) {
        option.subtitle = {id:option.sourceId+'-tr',url:caption,label:'Türkçe',language:'tr',format:'srt',packageKey:context.key,referer:page};
      }
      seen[option.url] = true;
      result.push(option);
    }
    var switcher = doc.querySelector('.nf3-watch-card .nf3-player-switcher');
    if (switcher) {
      Array.prototype.forEach.call(switcher.querySelectorAll('[role=tab][aria-controls]'), function (tab) {
        add(doc.getElementById(tab.getAttribute('aria-controls')),tab.getAttribute('data-nf3-player-option'),root.CatalogUtils.clean(tab.textContent));
      });
    } else {
      Array.prototype.forEach.call(doc.querySelectorAll('.nf3-watch-card .nf3-player [data-nf3-player-pane]'), function (pane) {
        add(pane,pane.getAttribute('data-nf3-player-pane'),'');
      });
    }
    return result.slice(0, 12);
  }

  function Resolver() {
    this.text = context.createClient();
    this.media = context.createClient({ media: true });
    this.generation = 0;
  }

  Resolver.prototype.cancel = function () {
    this.generation++;
    this.text.cancel();
    this.media.cancel();
  };

  Resolver.prototype.resolve = function (content, deadline, notify, hints) {
    this.cancel();
    var self = this;
    var generation = this.generation;
    var progress = root.SourceProgress ? new root.SourceProgress(notify, hints) : null;
    var page = I.publicUrl(content.pageUrl);
    var parsed = page && new root.URL(page);
    var output = [], rows = [], last;
    if (!parsed || parsed.origin !== base || parsed.search || !moviePath.test(parsed.pathname))
      return Promise.reject(fail('page', 'Geçersiz film bağlantısı.'));
    parsed.hash = '';
    page = parsed.href;
    deadline = Math.min(deadline || Infinity, Date.now() + 30000);

    function check() {
      if (generation !== self.generation) {
        var error = fail('cancel', 'İptal edildi.');
        error.cancelled = true;
        throw error;
      }
      if (Date.now() >= deadline) throw fail('timeout', 'Kaynak zaman aşımı.');
    }

    function get(client, url, referer) {
      var request = progress ? progress.client(client, check, deadline) : client;
      check();
      return request.get(url, referer, {}, {
        deadline: deadline, timeoutMs: Math.min(6000, Math.max(1, deadline - Date.now())),
        byteLimit: 2097152
      }).then(function (response) { check(); return response; });
    }

    function house(body, frame) {
      var doc = I.doc(body), node = doc.querySelector('#player_iframe[data-api]');
      var api = node && I.publicUrl(node.getAttribute('data-api'), frame);
      var p = api && new root.URL(api), key = param(frame, 'tmdb');
      if (!p || p.origin !== ownPlayer || p.pathname !== '/vs_src.php' ||
          param(p.href, 'type') !== 'movie' || param(p.href, 'id') !== key)
        throw fail('identity', 'Site oynatma API kaydı filmle eşleşmiyor.');
      return get(self.text, api, frame).then(function (response) {
        var value;
        try { value = JSON.parse(response.body); } catch (ignore) { throw fail('decode', 'Site oynatma yanıtı okunamadı.'); }
        var next = value && embed(value.src, frame);
        if (next && next.family !== 'nadir') return follow(next);
        var external = value && I.publicUrl(value.src, frame);
        if (external && new root.URL(external).hostname === 'stellarconductornexus.com')
          throw fail('access', 'Site oynatıcısı tarayıcı doğrulaması gerektiriyor.');
        throw fail('unavailable', 'Site bu film için desteklenen açık bir medya kaynağı vermedi.');
      });
    }

    function follow(row) {
      return get(self.text, row.url, page).then(function (response) {
        var body = response.body;
        if (row.family === 'nadir') return house(body, row.url);
        if (row.family === 'okru') return ok(body, row.url);
        if (row.family === 'dzen') return dzen(body, row.url);
        return vidmoly(body, row.url);
      });
    }


    function validate(data) {
      var urls = [data.url], cursor = 0;
      (data.fallbackUrls || []).forEach(function (url) {
        if (urls.indexOf(url) < 0 && urls.length < 3) urls.push(url);
      });
      function next() {
        var target = urls[cursor++];
        return get(self.media, target, data.referer).then(function (r) {
        if (!/^\s*#EXTM3U/.test(r.body)) throw fail('manifest', 'HLS oynatma listesi açılmadı.');
        if (/SAMPLE-AES|KEYFORMAT="[^"]*(?:widevine|playready)/i.test(r.body))
          throw fail('unsupported', 'Bu kaynak DRM gerektiriyor.');
          data.url = target;
          return data;
        }).catch(function (error) {
          check();
          if (cursor >= urls.length || error.cancelled || error.byteLimitExceeded || error.stage === 'unsupported') throw error;
          return next();
        });
      }
      return next();
    }

    function finish() {
      output.options = rows;
      if (output.length) return output;
      var error = last || fail('unavailable', 'Oynatılabilir film kaynağı bulunamadı.');
      error.sourceOptions = rows;
      throw error;
    }

    return get(self.text, page, base + '/').then(function (response) {
      var list = options(response.body, page);
      rows = list.map(function (r) { return { sourceId: r.sourceId, label: r.label, status: 'pending', stage: 'embed' }; });
      var cursor = 0;
      function next() {
        if (cursor >= list.length) return finish();
        if (Date.now() >= deadline) {
          rows.slice(cursor).forEach(function (row) {
            row.status = 'error';
            row.stage = 'timeout';
            row.detail = 'Kaynak tarama süresi doldu.';
          });
          if (progress) progress.publish(output, rows);
          return finish();
        }
        check();
        var entry = list[cursor], row = rows[cursor++];
        return follow(entry).then(validate).then(function (data) {
          var stream = { id: entry.sourceId, label: entry.label, url: data.url, type: data.type,
            referer: data.referer, packageKey: context.key, preferredEngine: 'html5', subtitles: data.subtitles || [] };
          if (entry.subtitle) stream.subtitles = [entry.subtitle].concat(stream.subtitles);
          if (data.fallbackUrls && data.fallbackUrls.length > 1) {
            stream.loaderId = 'okru-failover';
            stream.loaderConfig = { hosts: data.fallbackUrls.map(function (u) { return new root.URL(u).hostname; }) };
            stream.playbackRequirements = { customLoader: true, requiredHeaders: [] };
          }
          output.push(stream);
          row.status = 'ready';
          row.stage = '';
        }, function (error) {
          if (generation !== self.generation) check();
          last = error;
          row.status = 'error';
          row.stage = error.stage || 'network';
          row.detail = root.PlayerCore.safeMessage(error.message);
        }).then(function () {
          if (progress) progress.publish(output, rows);
          else if (notify) { output.options = rows; notify(output); }
          return next();
        });
      }
      return next();
    });
  };

  context.registerResolver({ create: function () { return new Resolver(); } });
})(window);

