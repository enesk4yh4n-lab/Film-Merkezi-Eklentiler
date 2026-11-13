(function (root) {
  'use strict';
  var P = root.P007Parser, BASE = P.base;
  function Provider(cache) { root.CatalogClient.call(this,cache,context.createClient(),{base:BASE,headers:{Accept:'text/html','User-Agent':'Mozilla/5.0'}}); }
  Provider.prototype = Object.create(root.CatalogClient.prototype); Provider.prototype.constructor = Provider;
  Provider.prototype.fetch = function (url,parse,force,scope) { if (!P.safe(url)) return Promise.reject(new Error('P007: Site dışı katalog adresi.')); return this.request(url,null,parse,force,'p007-v2-'+scope); };
  Provider.prototype.home = function (force) { return this.fetch(BASE+'/',P.home,force,'home'); };
  Provider.prototype.options = function () { return Promise.resolve({}); };
  Provider.prototype.list = function (query,cursor,force) {
    query=query||{}; if(query.type==='movie')return Promise.resolve({cards:[],next:null});
    var url=P.safe(cursor&&cursor.url||query.url||BASE+'/diziler/'),u=url&&new root.URL(url);
    if(!u||!/^\/(?:diziler|dizi-arsivi|asya-dizileri)\/?$/.test(u.pathname))return Promise.reject(new Error('P007: Desteklenmeyen katalog adresi.'));
    if(Object.keys(query.filters||{}).some(function(k){return !!query.filters[k];}))return Promise.reject(new Error('P007: Bu katalog filtresi sunulmuyor.'));
    return this.fetch(url,function(body){return P.list(body,url,false);},force,'list');
  };
  Provider.prototype.search = function (q,force,cursor) { q=root.CatalogUtils.clean(q);if(!q)return Promise.resolve({cards:[],next:null});var url=cursor&&cursor.url||BASE+'/?s='+encodeURIComponent(q);return this.fetch(url,function(body){return P.list(body,url,true);},force,'search'); };
  Provider.prototype.detail = function (input,force) {
    var self=this,page=P.safe(input.pageUrl),token=this.generation;
    if(P.episodeUrl(page))return self.fetch(page,function(body){return P.parent(body,page);},force,'parent').then(function(parent){if(token!==self.generation)throw new Error('İptal edildi');return self.detail(parent,force);});
    if(!P.seriesUrl(page))return Promise.reject(new Error('P007: Geçersiz dizi bağlantısı.'));
    return self.fetch(page,function(body){return P.detail(body,input);},force,'detail');
  };
  Provider.prototype.identity = function (input, force) {
    var page = P.seriesUrl(input.pageUrl);
    if (!page) return Promise.reject(new Error('P007: Geçersiz dizi kimliği bağlantısı.'));
    return this.fetch(page, function (body) { return P.detail(body, input, true); }, force, 'identity');
  };
  root.P007Provider=Provider;
})(window);
