/* Session-owned failover for explicitly declared OK.ru media peers. ES5. */
(function (root) {
  'use strict';
  var context = root.FilmPlugins.context();
  context.registerLoader('okru-failover', function (session) {
    var hosts = [], jobs = [], closed = false, preferred = 0;
    (session.config.hosts || []).slice(0, 3).forEach(function (host) {
      if (typeof host === 'string' && /^(?:vd[1-9][0-9]{0,3}\.okcdn\.ru|ok[0-9]{1,2}-[0-9]{1,3}\.vkuser\.net)$/.test(host) && hosts.indexOf(host) < 0) hosts.push(host);
    });
    if (!hosts.length) throw new Error('OK.ru media peer list is invalid');
    function cancelled() { var error = new Error('Cancelled'); error.cancelled = true; error.stage = 'cancel'; return error; }
    function timeout() { var error = new Error('OK.ru media request timed out'); error.stage = 'timeout'; return error; }
    return {
      load: function (url, options) {
        if (closed) throw cancelled();
        var parsed = new root.URL(url), end = typeof options.deadline === 'function' ? options.deadline() : options.deadline;
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.port && parsed.port !== '443') throw new Error('Invalid OK.ru media URL');
        var job = { cancelled: false, done: false, task: null, end: Math.min(end || Infinity, Date.now() + (options.timeoutMs || 30000)) }, attempts = 0;
        var eligible = hosts.indexOf(parsed.hostname) >= 0, first = preferred, resolveJob, rejectJob;
        var promise = new Promise(function (resolve, reject) { resolveJob = resolve; rejectJob = reject; });
        function finish(error, response) { if (job.done) return; job.done = true; var index = jobs.indexOf(job); if (index >= 0) jobs.splice(index, 1); if (error) rejectJob(error); else resolveJob(response); }
        function next() {
          if (closed || job.cancelled) { finish(cancelled()); return; }
          var remaining = job.end - Date.now(); if (remaining <= 0) { finish(timeout()); return; }
          var target = new root.URL(url), peer = (first + attempts) % hosts.length, copy = {};
          if (eligible) target.hostname = hosts[peer];
          attempts++;
          Object.keys(options).forEach(function (name) { copy[name] = options[name]; });
          copy.deadline = job.end; copy.timeoutMs = Math.min(options.timeoutMs || 30000, remaining);
          if (eligible) copy.firstByteTimeoutMs = Math.max(1, Math.min(options.firstByteTimeoutMs || 8000, 4000, remaining));
          try { job.task = session.request(target.href, copy); } catch (error) { finish(error); return; }
          job.task.promise.then(function (response) {
            if (closed || job.cancelled) { finish(cancelled()); return; }
            if (eligible) preferred = peer;
            finish(null, response);
          }, function (error) {
            if (job.done) return;
            if (eligible) preferred = (peer + 1) % hosts.length;
            if (closed || job.cancelled || error.cancelled) { finish(cancelled()); return; }
            if (!eligible || error.byteLimitExceeded || error.stage === 'policy' || error.code === 400 || error.code === 401 || attempts >= Math.min(2, hosts.length) || Date.now() >= job.end) { finish(error); return; }
            next();
          });
        }
        job.cancel = function () { if (job.done) return; job.cancelled = true; try { if (job.task) job.task.cancel(); } catch (ignore) {} finish(cancelled()); };
        jobs.push(job); next(); return { promise: promise, cancel: job.cancel };
      },
      destroy: function () { if (closed) return; closed = true; jobs.slice().forEach(function (job) { job.cancel(); }); jobs = []; }
    };
  });
})(window);
