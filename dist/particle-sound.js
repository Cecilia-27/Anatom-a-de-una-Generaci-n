// Dos texturas sonoras ligeras; se sintetizan localmente tras un gesto del usuario.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const bodyNotes={cabeza:196,boca:220,pecho:174.61,estomago:164.81,manos:185,piernas:146.83};
export function pigmentNoise(length){
  const samples=new Float32Array(length);let seed=731,previous=0;
  for(let i=0;i<length;i++){seed=(seed*1664525+1013904223)>>>0;previous=.83*previous+.17*(seed/4294967296*2-1);samples[i]=previous*Math.min(1,i/256,(length-1-i)/256);}
  return samples;
}
export function soundLevels({bodyActive=false,bodyPhase=0,opinionActive=false,opinionMoving=false,opinionPhase=0,accent=0,bodyAccent=0,paused=false,visible=true}={}){
  if(paused||!visible)return {body:0,opinion:0};
  const wave=.5-.5*Math.cos(bodyPhase*Math.PI*2);
  return {body:!opinionActive?Math.max(bodyActive?.16+.25*wave:0,bodyAccent*.32):0,opinion:opinionActive?Math.max(opinionMoving?.025+.07*(.5+.5*Math.sin(opinionPhase*12))**4:0,accent*.13):0};
}
export class ParticleSound{
  constructor({enabled=true,createContext,onState=()=>{}}={}){
    this.enabled=enabled;this.onState=onState;this.visible=true;this.context=null;this.supported=true;this.lastUpdate=-Infinity;this.note=196;this.opinionNote=523.25;this.accentAt=-Infinity;this.bodyAccentAt=-Infinity;
    this.createContext=createContext||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio():null;});
  }
  notify(){this.onState({enabled:this.enabled,supported:this.supported,ready:this.context?.state==='running'});}
  async unlock(){
    if(!this.enabled||!this.supported)return false;
    try{
      if(!this.context){const c=this.createContext();if(!c){this.supported=false;this.notify();return false;}this.context=c;this.build();}
      if(this.context.state!=='running'&&this.context.state!=='closed')await this.context.resume();
      this.notify();return this.context.state==='running';
    }catch{this.supported=false;this.notify();return false;}
  }
  build(){
    const c=this.context;this.master=c.createGain();this.master.gain.value=0;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-16;limiter.knee.value=18;limiter.ratio.value=3;this.master.connect(limiter);limiter.connect(c.destination);
    this.bodyGain=c.createGain();this.bodyGain.gain.value=0;this.bodyPan=c.createStereoPanner();this.bodyGain.connect(this.bodyPan);this.bodyPan.connect(this.master);
    const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);buffer.copyToChannel(pigmentNoise(buffer.length),0);
    const noise=c.createBufferSource();noise.buffer=buffer;noise.loop=true;this.bodyFilter=c.createBiquadFilter();this.bodyFilter.type='bandpass';this.bodyFilter.Q.value=.65;noise.connect(this.bodyFilter);this.bodyFilter.connect(this.bodyGain);noise.start();
    this.bodyTone=c.createOscillator();this.bodyTone.type='sine';const toneLevel=c.createGain();toneLevel.gain.value=.065;this.bodyTone.connect(toneLevel);toneLevel.connect(this.bodyGain);this.bodyTone.start();
    this.opinionGain=c.createGain();this.opinionGain.gain.value=0;this.opinionPan=c.createStereoPanner();this.opinionGain.connect(this.opinionPan);this.opinionPan.connect(this.master);
    this.chime=c.createOscillator();this.chime.type='sine';this.chime.connect(this.opinionGain);this.chime.start();
    this.harmonic=c.createOscillator();this.harmonic.type='sine';const harmonicLevel=c.createGain();harmonicLevel.gain.value=.26;this.harmonic.connect(harmonicLevel);harmonicLevel.connect(this.opinionGain);this.harmonic.start();
  }
  setEnabled(enabled){this.enabled=enabled;if(this.master)this.master.gain.setTargetAtTime(enabled&&this.visible?.24:0,this.context.currentTime,.08);this.notify();if(enabled)return this.unlock();return Promise.resolve(false);}
  setVisible(visible){this.visible=visible;if(this.master)this.master.gain.setTargetAtTime(visible&&this.enabled?.24:0,this.context.currentTime,.06);}
  body(zone){this.note=bodyNotes[zone]||196;const unlocked=this.unlock();if(this.context)this.bodyAccentAt=this.context.currentTime;return unlocked;}
  opinion(index){this.opinionNote=[523.25,587.33,659.25,783.99][index%4];const unlocked=this.unlock();if(this.context)this.accentAt=this.context.currentTime;return unlocked;}
  update({body=null,bodyActive=false,opinions=null,paused=false,visible=true}={}){
    const c=this.context;if(!this.supported||!this.master||!c||c.state!=='running')return;
    const now=c.currentTime;if(now-this.lastUpdate<.035)return;this.lastUpdate=now;
    const age=now-this.accentAt,accent=age>=0&&age<1.1?Math.sin(Math.PI*age/1.1)**2:0;
    const bodyAge=now-this.bodyAccentAt,bodyAccent=bodyAge>=0&&bodyAge<1.1?Math.sin(Math.PI*bodyAge/1.1)**2:0;
    const levels=soundLevels({bodyAccent,bodyActive:bodyActive&&!!body,bodyPhase:body?.phase||0,opinionActive:!!opinions?.active,opinionMoving:!!opinions?.moving,opinionPhase:opinions?.phase||0,accent,paused,visible:visible&&this.visible});
    this.master.gain.setTargetAtTime(this.enabled&&visible&&this.visible?.24:0,now,.1);
    this.bodyGain.gain.setTargetAtTime(levels.body,now,.16);this.opinionGain.gain.setTargetAtTime(levels.opinion,now,.09);
    this.bodyPan.pan.setTargetAtTime(clamp(body?.pan||0,-.75,.75),now,.18);this.opinionPan.pan.setTargetAtTime(clamp(opinions?.pan||0,-.75,.75),now,.22);
    this.bodyFilter.frequency.setTargetAtTime(480+(body?.phase||0)*1050,now,.2);this.bodyTone.frequency.setTargetAtTime(this.note,now,.2);
    const shimmer=1+Math.sin((opinions?.phase||0)*3)*.004;
    this.chime.frequency.setTargetAtTime(this.opinionNote*shimmer,now,.15);this.harmonic.frequency.setTargetAtTime(this.opinionNote*1.5*shimmer,now,.15);
  }
}
