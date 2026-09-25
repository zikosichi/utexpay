// Controlled production comparison. Usage:
// node scripts/benchmark-hero.mjs <static-build-dir> <3d-build-dir> <output-dir> [runs=3] [profile=all]
// See the saved report for baseline build changes. Serves both builds with Brotli compression.
import {spawn} from 'node:child_process'
import {createServer} from 'node:http'
import {readFileSync, writeFileSync, mkdirSync, existsSync, statSync, mkdtempSync, rmSync} from 'node:fs'
import {join, extname, resolve} from 'node:path'
import {tmpdir} from 'node:os'
import {brotliCompressSync, constants} from 'node:zlib'

const [staticRoot, liveRoot, outputArg, repetitions='3', selected='all'] = process.argv.slice(2)
if (!staticRoot || !liveRoot || !outputArg) throw new Error('Pass static build, 3D build and output directories')
const out=resolve(outputArg); mkdirSync(out,{recursive:true})
const sleep=ms=>new Promise(r=>setTimeout(r,ms))
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'}
const servers=[]
for (const [root,port] of [[resolve(staticRoot),3190],[resolve(liveRoot),3191]]) {
  const cache=new Map()
  const server=createServer((req,res)=>{
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
    path=join(root,path.endsWith('/')?path+'index.html':path)
    if(!path.startsWith(root+'/') || !existsSync(path) || !statSync(path).isFile()){res.writeHead(404);res.end('Not found');return}
    if(!cache.has(path)){
      const plain=readFileSync(path), type=mime[extname(path)]||'application/octet-stream'
      const compress=/text|javascript|json|svg/.test(type)
      cache.set(path,{plain,type,compressed:compress?brotliCompressSync(plain,{params:{[constants.BROTLI_PARAM_QUALITY]:5}}):null})
    }
    const {plain,type,compressed}=cache.get(path)
    const br=compressed && /br/.test(req.headers['accept-encoding']||'')
    res.writeHead(200,{'Content-Type':type,'Content-Length':(br?compressed:plain).length,'Cache-Control':extname(path)==='.html'?'no-cache':'public, max-age=3600','Vary':'Accept-Encoding',...(br?{'Content-Encoding':'br'}:{})})
    res.end(br?compressed:plain)
  })
  await new Promise(r=>server.listen(port,'127.0.0.1',r));servers.push(server)
}

const instrument=`(() => {
  const b=window.__heroBench={posterVisible:null,sceneReady:null,sceneVisible:null,introComplete:null,frames:[],longTasks:[],shifts:[],lcp:[],gpu:null,contexts:0};
  for(const type of ['largest-contentful-paint','longtask','layout-shift']){
    new PerformanceObserver(list=>{for(const e of list.getEntries()){
      if(type==='largest-contentful-paint')b.lcp.push({time:e.startTime,size:e.size,tag:e.element?.tagName,cls:e.element?.className,url:e.url});
      if(type==='longtask')b.longTasks.push({start:e.startTime,duration:e.duration});
      if(type==='layout-shift'&&!e.hadRecentInput)b.shifts.push({time:e.startTime,value:e.value});
    }}).observe({type,buffered:true});
  }
  const get=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){
    const gl=get.call(this,type,...args);
    if(gl && /webgl/.test(type) && this.classList.contains('photo-canvas')){
      b.contexts++;const ext=gl.getExtension('WEBGL_debug_renderer_info');
      b.gpu=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    }
    return gl;
  };
  let posterPending=false,scenePending=false;
  const inspect=()=>{
    const img=document.querySelector('.accounts-hero .ah-scene-poster');
    if(!posterPending && b.posterVisible===null && img?.complete && img.naturalWidth && img.getBoundingClientRect().width){
      posterPending=true;requestAnimationFrame(()=>requestAnimationFrame(()=>b.posterVisible=performance.now()));
    }
    const canvas=document.querySelector('.accounts-hero canvas');
    if(canvas?.dataset.ready==='true' && b.sceneReady===null){b.sceneReady=performance.now();}
    if(canvas?.dataset.intro==='complete' && b.introComplete===null)b.introComplete=performance.now();
    if(canvas?.dataset.ready==='true' && !scenePending){
      scenePending=true;
      const visible=()=>{if(canvas.isConnected && getComputedStyle(canvas).opacity<.99){requestAnimationFrame(visible);return}b.sceneVisible=performance.now()};
      requestAnimationFrame(visible);
    }
  };
  new MutationObserver(records=>{
    for(const record of records)if(record.attributeName==='data-yaw' && record.target.classList.contains('photo-canvas'))b.frames.push(performance.now());
    inspect();
  }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-ready','data-intro','data-yaw','class']});
  document.addEventListener('load',inspect,true);
})()`

async function run(variant,profile,iteration){
  const directory=mkdtempSync(join(tmpdir(),'utex-bench-chrome-'))
  const port=9500+Math.floor(Math.random()*1000)
  const child=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
    '--headless=new','--no-first-run','--no-default-browser-check','--hide-scrollbars',
    '--disable-background-networking','--disable-extensions',`--remote-debugging-port=${port}`,`--user-data-dir=${directory}`,'about:blank'
  ],{stdio:'ignore'})
  let ws
  try{
    let target
    for(let i=0;i<80;i++){try{target=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(x=>x.type==='page');if(target)break}catch{}await sleep(100)}
    if(!target)throw new Error('Chrome failed to launch')
    ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r)
    let next=0;const pending=new Map(), requests=new Map(),errors=[]
    ws.onmessage=event=>{
      const message=JSON.parse(event.data)
      if(message.id){const p=pending.get(message.id);if(p){pending.delete(message.id);clearTimeout(p.timer);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result)}return}
      const p=message.params
      if(message.method==='Network.responseReceived')requests.set(p.requestId,{url:p.response.url,type:p.type,mime:p.response.mimeType,status:p.response.status,encoded:0,cached:!!(p.response.fromDiskCache||p.response.fromPrefetchCache)})
      if(message.method==='Network.loadingFinished'){const r=requests.get(p.requestId);if(r)r.encoded=p.encodedDataLength}
      if(message.method==='Runtime.exceptionThrown')errors.push(p.exceptionDetails.exception?.description||p.exceptionDetails.text)
      if(message.method==='Runtime.consoleAPICalled' && p.type==='error')errors.push(p.args.map(a=>a.value||a.description).join(' '))
    }
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout: ${method}`))},45000)
      pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))
    })
    const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value}
    await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Performance.enable')
    await send('Network.setCacheDisabled',{cacheDisabled:true})
    await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true})
    await send('Emulation.setTouchEmulationEnabled',{enabled:true})
    await send('Emulation.setCPUThrottlingRate',{rate:profile.cpu})
    await send('Network.emulateNetworkConditions',{offline:false,latency:profile.latency,downloadThroughput:profile.mbps*1000000/8,uploadThroughput:750000/8,connectionType:'cellular4g'})
    await send('Page.addScriptToEvaluateOnNewDocument',{source:instrument})
    const url=`http://127.0.0.1:${variant==='static'?3190:3191}/`
    await send('Page.navigate',{url})
    // Equal navigation-to-observation window, not "N seconds after each variant happens to load".
    await evaluate(`new Promise(resolve=>setTimeout(resolve,Math.max(0,${profile.windowMs}-performance.now())))`)
    const sample=await evaluate(`({...window.__heroBench, paints:performance.getEntriesByType('paint').map(e=>({name:e.name,time:e.startTime})),navigation:performance.getEntriesByType('navigation')[0]?.toJSON(), resources:performance.getEntriesByType('resource').map(e=>({name:e.name,encoded:e.encodedBodySize,decoded:e.decodedBodySize,duration:e.duration})),now:performance.now(),nodes:document.querySelectorAll('*').length,heroNodes:document.querySelector('.accounts-hero')?.querySelectorAll('*').length,canvas:document.querySelector('.accounts-hero canvas')?{width:document.querySelector('.accounts-hero canvas').width,height:document.querySelector('.accounts-hero canvas').height}:null})`)
    const metrics=Object.fromEntries((await send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]))
    await send('HeapProfiler.collectGarbage')
    const heap=await send('Runtime.getHeapUsage')
    const result={variant,profile,iteration,sample,metrics,heap,network:[...requests.values()],errors,date:new Date().toISOString()}
    // Screenshot only AFTER timed measurements.
    if(iteration===1){const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(out,`${profile.name}-${variant}.png`),Buffer.from(shot.data,'base64'))}
    writeFileSync(join(out,`${profile.name}-${variant}-${iteration}.json`),JSON.stringify(result,null,2))
    console.log(JSON.stringify({variant,profile:profile.name,iteration,poster:sample.posterVisible,scene:sample.sceneVisible,intro:sample.introComplete,jsHeapMB:heap.usedSize/1e6,taskMs:metrics.TaskDuration*1000,bytes:result.network.reduce((a,r)=>a+r.encoded,0),gpu:sample.gpu,errors:errors.length}))
    return result
  }finally{ws?.close();child.kill();await sleep(200);try{rmSync(directory,{recursive:true,force:true})}catch{}}
}
const profiles=[{name:'fast',cpu:1,mbps:20,latency:40,windowMs:15000},{name:'constrained',cpu:4,mbps:1.6,latency:150,windowMs:20000}].filter(p=>selected==='all'||p.name===selected)
const results=[]
try{
 for(const profile of profiles)for(let i=1;i<=Number(repetitions);i++)for(const variant of i%2?['static','3d']:['3d','static'])results.push(await run(variant,profile,i))
 writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2))
}finally{for(const server of servers)server.close()}
