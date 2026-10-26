import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../dist/vendor/three.module.js';
// Prueba de eventos sobre OrbitControls real, sin navegador ni dependencias extra.
const source=(await readFile(new URL('../dist/vendor/OrbitControls.js',import.meta.url),'utf8')).replace("from 'three'",`from '${new URL('../dist/vendor/three.module.js',import.meta.url).href}'`);
const {OrbitControls}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
class Surface extends EventTarget{
 style={};clientWidth=600;clientHeight=760;root=new EventTarget();
 getRootNode(){return this.root;}setPointerCapture(){}releasePointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
}
const canvas=new Surface(),camera=new THREE.PerspectiveCamera(32,600/760,.1,80);camera.position.set(.65,2.93,12.1);
const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,2.65,0);orbit.enablePan=false;orbit.enableZoom=true;orbit.minDistance=2.6;orbit.maxDistance=14;orbit.minPolarAngle=orbit.maxPolarAngle=Math.PI/2-.025;orbit.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};orbit.update();
const distance=()=>camera.position.distanceTo(orbit.target);
function event(type,properties){const e=new Event(type,{cancelable:true});Object.assign(e,properties);canvas.dispatchEvent(e);}
const touch=(type,id,x,y)=>event(type,{pointerType:'touch',pointerId:id,pageX:x,pageY:y,clientX:x,clientY:y,button:0});
const initial=distance();touch('pointerdown',1,200,300);touch('pointerdown',2,400,300);touch('pointermove',1,100,300);touch('pointermove',2,500,300);
assert.ok(distance()<initial,'Separar dos dedos acerca la cámara');
const close=distance();touch('pointermove',1,240,300);touch('pointermove',2,360,300);assert.ok(distance()>close,'Juntar dos dedos aleja la cámara');
touch('pointerup',1,240,300);touch('pointerup',2,360,300);
const before=camera.position.clone();touch('pointerdown',3,250,300);touch('pointermove',3,400,100);touch('pointerup',3,400,100);
assert.ok(camera.position.distanceTo(before)>.1,'Un dedo gira la vista');assert.ok(Math.abs(orbit.getPolarAngle()-(Math.PI/2-.025))<1e-7,'El giro no invierte el cuerpo');
const wheel=deltaY=>event('wheel',{deltaY,deltaMode:0,clientX:300,clientY:380,ctrlKey:false});
const previous=distance();wheel(-200);assert.ok(distance()<previous);wheel(300);assert.ok(distance()>0);
for(let i=0;i<100;i++)wheel(-300);assert.ok(distance()>=orbit.minDistance-1e-8);
for(let i=0;i<100;i++)wheel(300);assert.ok(distance()<=orbit.maxDistance+1e-8);
// El gesto de zoom de trackpad llega como wheel + ctrlKey.
const trackpadDistance=distance();event('wheel',{deltaY:-30,deltaMode:0,clientX:300,clientY:380,ctrlKey:true});assert.ok(distance()<trackpadDistance);
orbit.dispose();console.log('Verificado: pinch in/out por eventos de dos dedos, giro táctil, scroll, trackpad y límites del OrbitControls original.');
