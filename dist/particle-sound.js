// Cristales suaves y espaciados; un ambiente continuo tras comenzar la exploración.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const bodyNotes={cabeza:1046.5,boca:1174.66,pecho:880,estomago:987.77,manos:1108.73,piernas:783.99};
export const crystalVoices={
  body:[{ratio:1,level:.5,period:5.8,offset:0,decay:3.4},{ratio:1.505,level:.25,period:7.1,offset:2,decay:3},{ratio:2.71,level:.09,period:9.4,offset:4.9,decay:2.6}],
  opinion:[{ratio:1,level:.46,period:6.6,offset:.8,decay:3.8},{ratio:1.498,level:.18,period:8.4,offset:3.2,decay:3.4},{ratio:2.756,level:.065,period:10.2,offset:5.7,decay:3}]
};
export function crystalEnvelope(time,{period,offset,decay}){
  const age=((time+offset)%period+period)%period;
  // Ataque redondeado y caída larga: las resonancias se solapan sin golpes secos.
  return .1+.9*(1-Math.exp(-age/.085))*Math.exp(-age/decay);
}
export function soundLevels({bodyActive=false,bodyPhase=0,opinionActive=false,opinionPhase=0,accent=0,bodyAccent=0,paused=false,visible=true}={}){
  if(paused||!visible)return {body:0,opinion:0};
  const wave=.5-.5*Math.cos(bodyPhase*Math.PI*2);
  return {body:!opinionActive?Math.max(bodyActive?.17+.025*wave:0,bodyAccent*.24):0,opinion:opinionActive?Math.max(.125+.015*Math.sin(opinionPhase*2),accent*.19):0};
}
export class ParticleSound{
  constructor({enabled=true,createContext,onState=()=>{}}={}){
    this.enabled=enabled;this.onState=onState;this.visible=true;this.context=null;this.supported=true;this.lastUpdate=-Infinity;this.note=1046.5;this.opinionNote=1318.51;this.accentAt=-Infinity;this.bodyAccentAt=-Infinity;
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
    this.opinionGain=c.createGain();this.opinionGain.gain.value=0;this.opinionPan=c.createStereoPanner();this.opinionGain.connect(this.opinionPan);this.opinionPan.connect(this.master);
    this.banks={};
    for(const [kind,voices] of Object.entries(crystalVoices))this.banks[kind]=voices.map(config=>{
      const oscillator=c.createOscillator(),gain=c.createGain();oscillator.type='sine';oscillator.frequency.value=(kind==='body'?this.note:this.opinionNote)*config.ratio;gain.gain.value=0;
      oscillator.connect(gain);gain.connect(kind==='body'?this.bodyGain:this.opinionGain);oscillator.start();return {oscillator,gain,config};
    });
    // Un eco corto y tenue deja flotar los cristales; no hay ruido ni soplidos.
    const echo=c.createDelay(1),wet=c.createGain(),feedback=c.createGain();echo.delayTime.value=.32;wet.gain.value=.16;feedback.gain.value=.28;
    this.bodyPan.connect(echo);this.opinionPan.connect(echo);echo.connect(wet);wet.connect(this.master);echo.connect(feedback);feedback.connect(echo);
  }
  setEnabled(enabled){this.enabled=enabled;if(this.master)this.master.gain.setTargetAtTime(enabled&&this.visible?.24:0,this.context.currentTime,.1);this.notify();if(enabled)return this.unlock();return Promise.resolve(false);}
  setVisible(visible){this.visible=visible;if(this.master)this.master.gain.setTargetAtTime(visible&&this.enabled?.24:0,this.context.currentTime,.08);}
  body(zone){this.note=bodyNotes[zone]||1046.5;const unlocked=this.unlock();if(this.context)this.bodyAccentAt=this.context.currentTime;return unlocked;}
  opinion(index){this.opinionNote=[1318.51,1174.66,1567.98,1046.5][index%4];const unlocked=this.unlock();if(this.context)this.accentAt=this.context.currentTime;return unlocked;}
  update({body=null,bodyActive=false,opinions=null,paused=false,visible=true}={}){
    const c=this.context;if(!this.supported||!this.master||!c||c.state!=='running')return;
    const now=c.currentTime;if(now-this.lastUpdate<.035)return;this.lastUpdate=now;
    const age=now-this.accentAt,accent=age>=0&&age<1.6?Math.sin(Math.PI*age/1.6)**2:0;
    const bodyAge=now-this.bodyAccentAt,bodyAccent=bodyAge>=0&&bodyAge<1.6?Math.sin(Math.PI*bodyAge/1.6)**2:0;
    const levels=soundLevels({bodyAccent,bodyActive,bodyPhase:body?.phase??now/8.4,opinionActive:!!opinions?.active,opinionPhase:opinions?.phase||0,accent,paused,visible:visible&&this.visible});
    this.master.gain.setTargetAtTime(this.enabled&&visible&&this.visible&&!paused?.24:0,now,.35);
    this.bodyGain.gain.setTargetAtTime(levels.body,now,.45);this.opinionGain.gain.setTargetAtTime(levels.opinion,now,.45);
    this.bodyPan.pan.setTargetAtTime(clamp(body?.pan??Math.sin(now*.14)*.2,-.75,.75),now,.65);this.opinionPan.pan.setTargetAtTime(clamp(opinions?.pan||0,-.75,.75),now,.65);
    for(const [kind,voices] of Object.entries(this.banks))for(const {oscillator,gain,config} of voices){
      const drift=1+Math.sin(now*.19+config.offset)*.0008,note=kind==='body'?this.note:this.opinionNote;
      oscillator.frequency.setTargetAtTime(note*config.ratio*drift,now,.55);gain.gain.setTargetAtTime(config.level*crystalEnvelope(now,config),now,.065);
    }
  }
}
