'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const {expandOrigins}=require('./cdn-origins.cjs');
const root=path.resolve(__dirname,'..'),work=fs.mkdtempSync(path.join(os.tmpdir(),'film-sdk200-')),out=work;
function cli(args){return JSON.parse(execFileSync(process.execPath,[path.join(__dirname,'cli.cjs'),...args],{env:{...process.env,FILM_MERKEZI_SDK_HOME:path.join(work,'identity')},encoding:'utf8',stdio:'pipe'}));}
const checks=[];try{
 const keyOut=path.join(work,'identity'),repo=path.join(work,'repo'),r=path.join(work,'r101'),p=path.join(work,'p101');
 cli(['init','--project',r,'--id','r101','--name','R101','--type','resolver']);cli(['init','--project',p,'--id','p101','--name','P101']);
 const first=cli(['pack','--project',r,'--out',repo,'--publisher','Independent SDK Test']);
 const keyFile=path.join(keyOut,fs.readdirSync(keyOut)[0]),keyBefore=crypto.createHash('sha256').update(fs.readFileSync(keyFile)).digest('hex');
 const second=cli(['pack','--project',p,'--out',repo,'--publisher','Independent SDK Test']);assert.equal(first.fingerprint,second.fingerprint);
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(keyFile)).digest('hex'),keyBefore);checks.push('independent publisher key generated outside project and reused');
 const index=JSON.parse(fs.readFileSync(path.join(repo,'filmmerkezi-repository.json')));assert.equal(index.schemaVersion,2);assert.equal(index.plugins.length,2);
 const m=JSON.parse(fs.readFileSync(path.join(repo,index.plugins.find(x=>x.id==='p101').manifest)));assert.equal(m.dependencies[0].publisher,first.fingerprint);assert.equal(m.type,'site');checks.push('SDK generates separate site/resolver projects and publisher-qualified dependency');
 const pub=crypto.createPublicKey({key:Buffer.from(index.publicKey,'base64'),type:'spki',format:'der'}),raw=fs.readFileSync(path.join(repo,'filmmerkezi-repository.json')),sig=Buffer.from(fs.readFileSync(path.join(repo,'filmmerkezi-repository.sig'),'utf8'),'base64');assert(crypto.verify('sha256',raw,pub,sig));assert(!crypto.verify('sha256',Buffer.concat([raw,Buffer.from('x')]),pub,sig));checks.push('repository signature accepted and tampered bytes rejected');
 assert(!fs.readdirSync(repo,{recursive:true}).some(n=>/\.pem$/.test(n)));checks.push('private key excluded from generated repository');
 const oldManifest=fs.readFileSync(path.join(repo,index.plugins.find(x=>x.id==='p101').manifest));
 const meta=JSON.parse(fs.readFileSync(path.join(p,'addon.json')));meta.version='1.1.0';meta.minAppVersion='2.0.3';fs.writeFileSync(path.join(p,'addon.json'),JSON.stringify(meta));
 cli(['pack','--project',p,'--out',repo,'--publisher','Independent SDK Test']);
 const next=JSON.parse(fs.readFileSync(path.join(repo,'filmmerkezi-repository.json')));
 assert.equal(next.alternatives[0].version,'1.0.0');assert.equal(next.plugins.find(x=>x.id==='p101').minAppVersion,'2.0.3');
 assert.deepEqual(fs.readFileSync(path.join(repo,next.alternatives[0].manifest)),oldManifest);
 assert(!fs.existsSync(path.join(repo,'filmmerkezi201-repository.json')));
 assert(fs.readFileSync(path.join(repo,'README.md'),'utf8').includes('<!-- film-merkezi-repository:'));
 checks.push('Single signed index retains older immutable packages with compatibility metadata');
 const registry=path.join(work,'cdn-izinleri.json');
 const oldMedia='https://media.example.org',newMedia='https://new-media.example.org';
 const readJson=file=>JSON.parse(fs.readFileSync(file,'utf8'));
 const saveJson=(file,data)=>fs.writeFileSync(file,JSON.stringify(data));
 const projects=['r102','r103'].map(id=>{
  const project=path.join(work,id),file=path.join(project,'addon.json'),origin='https://'+id+'.example.org';
  cli(['init','--project',project,'--id',id,'--name',id,'--type','resolver']);
  const metadata=readJson(file);
  Object.assign(metadata,{cdnRegistry:'../cdn-izinleri.json',origins:[origin,'@cdn/shared-video',origin]});
  saveJson(file,metadata);
  return {project,file,id,origin,metadata,args:['pack','--project',project,'--out',repo,'--publisher','Independent SDK Test']};
 });
 function checkPolicy(project,version,expected){
  const runtime=path.join(repo,'packages',project.id,version,'runtime'),file=path.join(runtime,'network-policy.txt');
  const bytes=fs.readFileSync(file);
  assert.equal(bytes.toString(),['FILM-MERKEZI-ORIGINS-1',...expected,''].join('\n'));
  assert(crypto.verify('sha256',bytes,pub,Buffer.from(fs.readFileSync(path.join(runtime,'network-policy.signature.txt'),'utf8'),'base64')));
 }
 saveJson(registry,{'shared-video':[oldMedia],'unrelated-video':['https://unrelated.example.org']});
 for(const project of projects){
  cli(project.args);checkPolicy(project,'1.0.0',[project.origin,oldMedia]);
 }
 saveJson(registry,{'shared-video':[newMedia]});
 for(const project of projects){
  assert.deepEqual(expandOrigins(project.metadata,project.project),[project.origin,newMedia]);
  assert.throws(()=>cli(project.args),/versions are immutable/);
  saveJson(project.file,{...project.metadata,version:'1.0.1'});
  cli(project.args);
  checkPolicy(project,'1.0.0',[project.origin,oldMedia]);
  checkPolicy(project,'1.0.1',[project.origin,newMedia]);
 }
 assert.throws(()=>expandOrigins({...projects[0].metadata,origins:['@cdn/missing']},projects[0].project),/Unknown or invalid CDN group/);
 assert.throws(()=>expandOrigins({...projects[0].metadata,type:'site'},projects[0].project),/Invalid origin or resolver CDN reference/);
 checks.push('Shared CDN changes reach only subscribing resolver policies, verified with signatures and preserved prior versions');
 fs.writeFileSync(path.join(out,'sdk.json'),JSON.stringify({passed:true,checks},null,2));console.log(JSON.stringify({passed:true,checks}));
}finally{fs.rmSync(work,{recursive:true,force:true});}
