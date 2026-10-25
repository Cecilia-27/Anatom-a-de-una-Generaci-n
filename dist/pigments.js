import * as THREE from './vendor/three.module.js';
import { pigmentFactors } from './experience.js';

function randomGenerator(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function hash(value){return [...value].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);}
function seeds(name,count){const random=randomGenerator(hash(name));return Array.from({length:count},()=>({x:(random()+random()+random()-1.5),y:(random()+random()+random()-1.5),z:random()-.5,size:.45+random()*.7,alpha:.55+random()*.45,phase:random()*Math.PI*2,trail:random()}));}
export function makePigmentTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d'),r=randomGenerator(714);
  const gradient=c.createRadialGradient(128,128,2,128,128,122);gradient.addColorStop(0,'rgba(255,255,255,.38)');gradient.addColorStop(.45,'rgba(255,255,255,.19)');gradient.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=gradient;c.fillRect(0,0,256,256);
  for(let i=0;i<1700;i++){const x=r()*256,y=r()*256,d=Math.hypot(x-128,y-128)/128;if(d>1)continue;c.fillStyle=`rgba(255,255,255,${(1-d)**1.8*(.09+r()*.3)})`;c.beginPath();c.arc(x,y,.4+r()*3.6,0,Math.PI*2);c.fill();}
  const texture=new THREE.CanvasTexture(canvas);texture.generateMipmaps=false;texture.minFilter=texture.magFilter=THREE.LinearFilter;return texture;
}

export class PigmentSystem{
  constructor({scene,box,getAnchor}){
    this.box=box.clone();this.height=box.getSize(new THREE.Vector3()).y;this.getAnchor=getAnchor;this.active=[];this.memories=new Map();this.texture=makePigmentTexture();this.max=1400;
    this.positions=new Float32Array(this.max*3);this.colors=new Float32Array(this.max*3);this.alpha=new Float32Array(this.max);this.sizes=new Float32Array(this.max);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aColor',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aAlpha',new THREE.BufferAttribute(this.alpha,1).setUsage(THREE.DynamicDrawUsage));g.setAttribute('aSize',new THREE.BufferAttribute(this.sizes,1).setUsage(THREE.DynamicDrawUsage));g.setDrawRange(0,0);
    this.material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,toneMapped:false,uniforms:{uMap:{value:this.texture},uSizeFactor:{value:1000}},vertexShader:`attribute vec3 aColor;attribute float aAlpha;attribute float aSize;uniform float uSizeFactor;varying vec3 vColor;varying float vAlpha;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(aSize*uSizeFactor/max(.1,-mv.z),1.,180.);vColor=aColor;vAlpha=aAlpha;}`,fragmentShader:`uniform sampler2D uMap;varying vec3 vColor;varying float vAlpha;void main(){float alpha=texture2D(uMap,gl_PointCoord).a*vAlpha;if(alpha<.003)discard;gl_FragColor=vec4(vColor,alpha);}`});
    this.points=new THREE.Points(g,this.material);this.points.frustumCulled=false;this.points.renderOrder=5;scene.add(this.points);
    this.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,transparent:true,opacity:0,depthWrite:false,depthTest:false,toneMapped:false}));this.halo.renderOrder=4;scene.add(this.halo);
    this.point=new THREE.Vector3();this.offset=new THREE.Vector3();this.count=0;
  }
  sourcePoint(label){const f=pigmentFactors[label],center=this.box.getCenter(new THREE.Vector3());return new THREE.Vector3(center.x+f.side*(this.box.getSize(new THREE.Vector3()).x/2+this.height*.16),this.box.min.y+this.height*f.height,center.z+this.height*.025);}
  activate(labels,time,reduced=false){
    this.active=[];
    for(const [index,label] of labels.slice(0,2).entries()){
      const f=pigmentFactors[label];if(!f)continue;
      if(reduced){for(const zone of f.route)this.remember(label,zone);continue;}
      this.active.push({label,started:time+index*.22,seeds:seeds(label,90),visited:new Set()});
    }
  }
  remember(label,zone){const key=`${label}:${zone}`;if(!this.memories.has(key))this.memories.set(key,{label,zone,seeds:seeds(key,20)});}
  color(label){return new THREE.Color(pigmentFactors[label].color).convertLinearToSRGB();}
  emit(p,color,alpha,size){if(this.count>=this.max)return;const i=this.count++;this.positions.set([p.x,p.y,p.z],i*3);this.colors.set([color.r,color.g,color.b],i*3);this.alpha[i]=alpha;this.sizes[i]=size;}
  highlight(zone,color,strength,time,reduced=false){
    const anchor=zone?this.getAnchor(zone):null;this.halo.visible=!!anchor&&strength>.001;
    if(!anchor)return;anchor.getWorldPosition(this.halo.position);this.halo.material.color.set(color);this.halo.material.opacity=strength*.38;
    const size=this.height*(zone==='manos'?.12:zone==='piernas'?.24:.19)*(reduced?1:1+Math.sin(time*.8)*.025);this.halo.scale.set(size,size,1);
  }
  update(time,camera,renderer,{visible=true,reduced=false}={}){
    this.points.visible=visible;if(!visible){this.halo.visible=false;return;}this.count=0;if(reduced&&this.active.length){for(const track of this.active)for(const zone of pigmentFactors[track.label].route)this.remember(track.label,zone);this.active=[];}
    this.material.uniforms.uSizeFactor.value=renderer.domElement.height/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
    for(const memory of this.memories.values()){
      const anchor=this.getAnchor(memory.zone);if(!anchor)continue;const color=this.color(memory.label);
      for(const seed of memory.seeds){this.offset.set(seed.x*this.height*.028,seed.y*this.height*.027,seed.z*this.height*.008);this.point.copy(this.offset);anchor.localToWorld(this.point);this.emit(this.point,color,.095*seed.alpha,this.height*.067*seed.size);}
    }
    this.active=this.active.filter(track=>time-track.started<3.3);
    for(const track of this.active){
      const age=time-track.started;if(age<0)continue;const f=pigmentFactors[track.label],progress=THREE.MathUtils.clamp(age/2.8,0,1),color=this.color(track.label);
      const points=[this.sourcePoint(track.label),...f.route.map(zone=>this.getAnchor(zone)?.getWorldPosition(new THREE.Vector3())).filter(Boolean)];if(points.length<2)continue;
      const curve=new THREE.CatmullRomCurve3(points,false,'centripetal');
      for(let i=0;i<f.route.length;i++)if(progress>=(i+1)/f.route.length&&!track.visited.has(i)){track.visited.add(i);this.remember(track.label,f.route[i]);}
      const fade=Math.min(1,age/.28)*(1-THREE.MathUtils.clamp((age-2.65)/.65,0,1));
      for(const seed of track.seeds){
        const t=THREE.MathUtils.clamp(progress-seed.trail*.13,0,1);curve.getPoint(t,this.point);
        const spread=this.height*(.026+.012*Math.sin(progress*Math.PI));
        this.point.x+=seed.x*spread+(reduced?0:Math.sin(time*.9+seed.phase)*spread*.13);this.point.y+=seed.y*spread;this.point.z+=seed.z*spread;
        this.emit(this.point,color,fade*.27*seed.alpha,this.height*.07*seed.size);
      }
    }
    this.points.geometry.setDrawRange(0,this.count);for(const attribute of Object.values(this.points.geometry.attributes))attribute.needsUpdate=true;
  }
}
