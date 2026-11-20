/* Package-owned playlist transport; binary requests retain the session policy. ES5. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  context.registerLoader('platform-playlist', function (session) {
    var clients = [], closed = false;
    function cancelled() { var e = new Error('Playlist request cancelled'); e.cancelled = true; return e; }
    return {
      load: function (url, options) {
        if (closed) throw cancelled();
        if (options.binary) return session.request(url, options);
        var client = context.createClient({ platformText: true }), limit = options.byteLimit || 2097152, aborted = false;
        clients.push(client);
        function release() { var at = clients.indexOf(client); if (at >= 0) clients.splice(at, 1); }
        var promise = client.get(url, options.referer || '', {}, {
          deadline: typeof options.deadline === 'function' ? options.deadline() : options.deadline,
          timeoutMs: options.timeoutMs || 10000, byteLimit: limit
        }).then(function (r) {
          if (closed || aborted) throw cancelled();
          var size = root.FilmUpdateVerify.bytes(r.body || '').length;
          if (size > limit) { var e = new Error('Playlist byte limit'); e.byteLimitExceeded = true; e.byteLimit = limit; throw e; }
          if (!/^\s*#EXTM3U/.test(r.body || '')) throw new Error('Playlist URL returned non-HLS content');
          if (options.onprogress) options.onprogress(size, size);
          return { data: r.body, url: r.url || url, status: r.code || 200, method: r.method };
        });
        return { promise: promise.then(function (r) { release(); return r; }, function (e) { release(); throw e; }), cancel: function () { aborted = true; client.cancel(); } };
      },
      destroy: function () { if (closed) return; closed = true; clients.slice().forEach(function (c) { c.cancel(); }); clients = []; }
    };
  });
})(window);
