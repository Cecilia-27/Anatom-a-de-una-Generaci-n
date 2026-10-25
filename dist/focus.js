import * as THREE from './vendor/three.module.js';

export const easeInOutCubic=t=>t<.5?4*t*t*t:1-((-2*t+2)**3)/2;
export function bodyBounds(meshes){
  const box=new THREE.Box3();
  for(const mesh of meshes)if(!/^(Hilo|Cruz)/.test(mesh.name))box.union(new THREE.Box3().setFromObject(mesh));
  return box;
}
export function regionBounds(zone,meshes,side='I'){
  const box=new THREE.Box3();
  for(const mesh of meshes){
    const n=mesh.name;let include=false;
    if(zone==='cabeza')include=/^(Cabeza_madera|Oreja|Union_cuello|Torso_madera)/.test(n);
    if(zone==='boca')include=/^(Cabeza_madera|Oreja|Union_cuello)/.test(n);
    if(zone==='pecho')include=/^(Torso_madera|Union_hombro|Union_cuello)/.test(n);
    if(zone==='estomago')include=/^(Torso_madera|Pelvis|Union_cintura)/.test(n);
    if(zone==='manos')include=/^(Palma|Falange|Pulgar_madera|Antebrazo|Union_muneca)/.test(n)&&new RegExp(`_${side}(?:_|$)`).test(n);
    if(zone==='piernas')include=/^(Muslo|Pantorrilla|Union_rodilla|Union_cadera)/.test(n);
    if(!include)continue;
    const part=new THREE.Box3().setFromObject(mesh);
    if(n==='Torso_madera'&&zone==='cabeza')part.min.y=THREE.MathUtils.lerp(part.min.y,part.max.y,.48);
    if(n==='Torso_madera'&&zone==='estomago')part.max.y=THREE.MathUtils.lerp(part.min.y,part.max.y,.63);
    box.union(part);
  }
  if(box.isEmpty())throw Error(`No hay geometría real para encuadrar ${zone}`);
  return box;
}
export function boxCorners(box){
  const points=[];
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new THREE.Vector3(x,y,z));
  return points;
}
export function calculateFocusFrame({box,bodyHeight,cameraPosition,cameraTarget,fov,aspect,panelSide='right',mobile=false}){
  const center=box.getCenter(new THREE.Vector3());
  const direction=cameraPosition.clone().sub(cameraTarget).normalize();
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize();
  const up=new THREE.Vector3().crossVectors(direction,right).normalize();
  let halfWidth=0,halfHeight=0,depth=0;
  for(const p of boxCorners(box)){const relative=p.sub(center);halfWidth=Math.max(halfWidth,Math.abs(relative.dot(right)));halfHeight=Math.max(halfHeight,Math.abs(relative.dot(up)));depth=Math.max(depth,Math.abs(relative.dot(direction)));}
  const tan=Math.tan(THREE.MathUtils.degToRad(fov/2));
  const usableWidth=!mobile&&panelSide==='left'?.54:.82;
  const usableHeight=mobile?.40:.78;
  const distance=Math.max(halfHeight/(tan*usableHeight),halfWidth/(tan*aspect*usableWidth),bodyHeight*.22)+depth;
  const target=center.clone();
  // Desplazamiento calculado en el plano de cámara: deja libre el lado del cristal.
  if(!mobile&&panelSide==='left')target.addScaledVector(right,-2*(distance-depth)*tan*aspect*.19);
  if(mobile)target.addScaledVector(up,-2*(distance-depth)*tan*.245);
  return {position:target.clone().addScaledVector(direction,distance),target,distance,center};
}

export class FocusController{
  constructor({camera,controls,bodyHeight,getBox,getReduced,getMobile,onPhase,onVisual}){
    Object.assign(this,{camera,controls,bodyHeight,getBox,getReduced,getMobile,onPhase,onVisual});
    this.phase='free';this.selected=null;this.strength=0;this.saved=null;this.animation=null;this.pending=0;this.afterClose=null;
  }
  get busy(){return this.phase!=='free';}
  select(zone,panelSide='right'){
    if(this.busy)return false;
    this.saved={position:this.camera.position.clone(),target:this.controls.target.clone(),damping:this.controls.enableDamping};
    this.controls.enabled=false;this.controls.enableDamping=false;
    this.controls.update(); // Consume la inercia pendiente sin modificar la vista guardada.
    this.camera.position.copy(this.saved.position);this.controls.target.copy(this.saved.target);this.camera.lookAt(this.saved.target);
    this.selected=zone;this.panelSide=panelSide;this.phase='zooming-in';this.pending=2;this.animation=null;this.strength=0;
    this.onPhase(this.phase,zone,panelSide);return true;
  }
  resize(){if(this.busy&&this.phase!=='zooming-out'){this.phase='zooming-in';this.pending=2;this.animation=null;this.onPhase(this.phase,this.selected,this.panelSide);}}
  close(afterClose){
    if(!this.busy){afterClose?.();return;}
    if(this.phase==='zooming-out')return;
    this.afterClose=afterClose;this.pending=0;this.phase='zooming-out';
    this.animation={start:null,duration:.85,fromPosition:this.camera.position.clone(),fromTarget:this.controls.target.clone(),toPosition:this.saved.position.clone(),toTarget:this.saved.target.clone(),fromStrength:this.strength};
    this.onPhase(this.phase,this.selected,this.panelSide);
  }
  update(time){
    if(!this.busy)return false;
    if(this.pending>0){this.pending--;if(this.pending>0)return true;
      const plan=calculateFocusFrame({box:this.getBox(this.selected),bodyHeight:this.bodyHeight,cameraPosition:this.saved.position,cameraTarget:this.saved.target,fov:this.camera.fov,aspect:this.camera.aspect,panelSide:this.panelSide,mobile:this.getMobile()});
      this.animation={start:null,duration:1,fromPosition:this.camera.position.clone(),fromTarget:this.controls.target.clone(),toPosition:plan.position,toTarget:plan.target,fromStrength:this.strength};
    }
    if(!this.animation)return true;
    const a=this.animation;if(a.start===null)a.start=time;
    const t=this.getReduced()?1:THREE.MathUtils.clamp((time-a.start)/a.duration,0,1),eased=easeInOutCubic(t);
    this.camera.position.lerpVectors(a.fromPosition,a.toPosition,eased);this.controls.target.lerpVectors(a.fromTarget,a.toTarget,eased);this.camera.lookAt(this.controls.target);
    this.strength=this.phase==='zooming-out'?a.fromStrength*(1-eased):THREE.MathUtils.lerp(a.fromStrength,1,eased);
    this.onVisual(this.selected,this.strength);
    if(t===1){
      this.animation=null;
      if(this.phase==='zooming-out'){
        const selected=this.selected;this.phase='free';this.selected=null;this.strength=0;
        this.controls.enableDamping=!this.getReduced();this.controls.enabled=true;this.controls.update();
        this.onPhase('free',selected,this.panelSide);const callback=this.afterClose;this.afterClose=null;callback?.();
      }else{this.phase='open';this.onPhase('open',this.selected,this.panelSide);}
    }
    return this.busy;
  }
}
