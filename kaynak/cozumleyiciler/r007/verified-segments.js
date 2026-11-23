/* Reuse one full MPEG-TS segment from the same authorized playback session. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  var minBytes = 4 * 1024 * 1024;
  var maxBytes = 18 * 1024 * 1024;

  function interrupted() {
    var error = new Error('Segment request cancelled');
    error.cancelled = true;
    return error;
  }

  function isFullSegment(reply, limit) {
    if (reply.status !== 200 || reply.partial || reply.contentRange ||
        !(reply.data instanceof ArrayBuffer) || reply.data.byteLength < minBytes ||
        reply.data.byteLength > limit) return false;
    var head = new Uint8Array(reply.data, 0, 377);
    return head[0] === 0x47 && head[188] === 0x47 && head[376] === 0x47;
  }

  function copyResponse(reply) {
    var copy = {};
    Object.keys(reply).forEach(function (key) { copy[key] = reply[key]; });
    // The HLS worker may transfer and detach response data.
    copy.data = reply.data.slice(0);
    return copy;
  }

  context.registerLoader('verified-segments', function (session) {
    var closed = false, retained = null;

    function load(url, options) {
      if (closed) throw interrupted();
      if (!options.binary || options.kind !== 'media-fragment' ||
          options.rangeStart !== undefined || options.rangeEnd !== undefined) {
        return session.request(url, options);
      }

      var limit = Math.min(maxBytes, options.byteLimit || 8388608);
      var cancelled = false;
      if (retained && retained.url === url && retained.referer === options.referer &&
          retained.reply.data.byteLength <= limit) {
        var deadline = typeof options.deadline === 'function' ? options.deadline() : options.deadline;
        return {
          promise: Promise.resolve().then(function () {
            if (closed || cancelled) throw interrupted();
            if (deadline && Date.now() >= deadline) throw new Error('Media loader timeout');
            return copyResponse(retained.reply);
          }),
          cancel: function () { cancelled = true; }
        };
      }

      var task = session.request(url, options);
      return {
        promise: task.promise.then(function (reply) {
          if (closed || cancelled) throw interrupted();
          if (!retained && isFullSegment(reply, limit)) {
            retained = { url: url, referer: options.referer, reply: copyResponse(reply) };
          }
          return reply;
        }),
        cancel: function () { cancelled = true; task.cancel(); }
      };
    }

    return {
      load: load,
      destroy: function () { closed = true; retained = null; }
    };
  });
})(window);
