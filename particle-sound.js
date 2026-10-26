// Archivos reales de las referencias: fondo continuo y dos capas de partículas.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const audioTracks=[
  {id:'ambient',file:'cuencos-ambiente.m4a',rate:1},
  {id:'body',file:'particulas-cuerpo.m4a',rate:.72},
  {id:'opinion',file:'particulas-opiniones.m4a',rate:.85}
];
export function soundLevels({bodyActive=false,bodyPhase=0,opinionActive=false,accent=0,bodyAccent=0,paused=false,visible=true}={}){
  if(paused||!visible)return {ambient:0,body:0,opinion:0};
  return {ambient:bodyActive||opinionActive?.4:0,body:bodyActive&&!opinionActive?.13+.01*Math.sin(bodyPhase*Math.PI*2)+bodyAccent*.055:0,opinion:opinionActive?.18+accent*.045:0};
}
export class ParticleSound{
  constructor({enabled=true,createContext,loadBuffer,onState=()=>{}}={}){
    this.enabled=enabled;this.onState=onState;this.visible=true;this.context=null;this.supported=true;this.ready=false;this.loading=false;this.error=false;this.lastUpdate=-Infinity;this.accentAt=-Infinity;this.bodyAccentAt=-Infinity;this.loadPromise=null;this.assetLoads=new Map();this.sources=new Map();
    this.createContext=createContext||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio():null;});
    this.loadBuffer=loadBuffer||async function(track,context){const url=new URL('./assets/audio/'+track.file,import.meta.url),response=await fetch(url);if(!response.ok)throw Error('Audio no disponible: '+track.id);return context.decodeAudioData(await response.arrayBuffer());};
  }
  notify(){this.onState({enabled:this.enabled,supported:this.supported,ready:this.ready&&this.context?.state==='running',loading:this.loading,error:this.error});}
  build(){
    const c=this.context;this.master=c.createGain();this.master.gain.value=0;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=18;limiter.ratio.value=3;this.master.connect(limiter);limiter.connect(c.destination);
    this.ambientGain=c.createGain();this.ambientGain.gain.value=0;this.ambientGain.connect(this.master);
    this.bodyGain=c.createGain();this.bodyGain.gain.value=0;this.bodyPan=c.createStereoPanner();this.bodyGain.connect(this.bodyPan);this.bodyPan.connect(this.master);
    this.opinionGain=c.createGain();this.opinionGain.gain.value=0;this.opinionPan=c.createStereoPanner();this.opinionGain.connect(this.opinionPan);this.opinionPan.connect(this.master);
  }
  async unlock(){
    if(!this.enabled||!this.supported)return false;
    try{
      if(!this.context){this.context=this.createContext();if(!this.context){this.supported=false;this.notify();return false;}this.build();}
      if(this.context.state!=='running'&&this.context.state!=='closed')await this.context.resume();
    }catch{this.supported=false;this.notify();return false;}
    if(this.ready){this.notify();return true;}
    if(this.loadPromise)return this.loadPromise;
    this.loading=true;this.error=false;this.notify();
    this.loadPromise=this.loadTracks().then(()=>{this.ready=true;this.loading=false;this.notify();return true;}).catch(()=>{this.loading=false;this.error=true;this.loadPromise=null;this.notify();return false;});
    return this.loadPromise;
  }
  async loadTracks(){
    const buffers=await Promise.all(audioTracks.map(track=>{
      if(!this.assetLoads.has(track.id))this.assetLoads.set(track.id,Promise.resolve().then(()=>this.loadBuffer(track,this.context)).catch(error=>{this.assetLoads.delete(track.id);throw error;}));
      return this.assetLoads.get(track.id);
    }));
    const when=this.context.currentTime+.04;
    audioTracks.forEach((track,index)=>{if(this.sources.has(track.id))return;const source=this.context.createBufferSource();source.buffer=buffers[index];source.loop=true;source.playbackRate.value=track.rate;source.connect(this[track.id+'Gain']);source.start(when);this.sources.set(track.id,source);});
  }
  setEnabled(enabled){this.enabled=enabled;if(this.master)this.master.gain.setTargetAtTime(enabled&&this.visible&&this.ready?.5:0,this.context.currentTime,.15);this.notify();if(enabled)return this.unlock();return Promise.resolve(false);}
  setVisible(visible){this.visible=visible;if(this.master)this.master.gain.setTargetAtTime(visible&&this.enabled&&this.ready?.5:0,this.context.currentTime,.08);}
  body(){const unlocked=this.unlock();if(this.context)this.bodyAccentAt=this.context.currentTime;return unlocked;}
  opinion(){const unlocked=this.unlock();if(this.context)this.accentAt=this.context.currentTime;return unlocked;}
  update({body=null,bodyActive=false,opinions=null,paused=false,visible=true}={}){
    const c=this.context;if(!this.supported||!this.ready||!c||c.state!=='running')return;
    const now=c.currentTime;if(now-this.lastUpdate<.035)return;this.lastUpdate=now;
    const age=now-this.accentAt,accent=age>=0&&age<2.4?Math.sin(Math.PI*age/2.4)**2:0,bodyAge=now-this.bodyAccentAt,bodyAccent=bodyAge>=0&&bodyAge<2.4?Math.sin(Math.PI*bodyAge/2.4)**2:0;
    const levels=soundLevels({bodyActive,bodyPhase:body?.phase||0,opinionActive:!!opinions?.active,accent,bodyAccent,paused,visible:visible&&this.visible});
    this.master.gain.setTargetAtTime(this.enabled&&visible&&this.visible&&!paused&&(bodyActive||opinions?.active)?.5:0,now,.5);
    this.ambientGain.gain.setTargetAtTime(levels.ambient,now,1.2);this.bodyGain.gain.setTargetAtTime(levels.body,now,.8);this.opinionGain.gain.setTargetAtTime(levels.opinion,now,.8);
    this.bodyPan.pan.setTargetAtTime(clamp(body?.pan||0,-.65,.65),now,.7);this.opinionPan.pan.setTargetAtTime(clamp(opinions?.pan||0,-.65,.65),now,.7);
  }
}
