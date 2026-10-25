import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {bodyBounds,regionBounds,boxCorners,calculateFocusFrame,FocusController} from '../dist/focus.js';
import {pigmentFactors,zoneStories} from '../dist/experience.js';
import {zones} from '../dist/data.js';
import {sensationsChart} from '../dist/charts.js';

// Fixture independiente: límites POSITION y transformaciones originales del GLB.
const bytes=await readFile(new URL('../dist/assets/titere-articulado.glb',import.meta.url));
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
const nodes=gltf.nodes.map(n=>{
 let object;
 if(n.mesh!==undefined){const geometry=new THREE.BufferGeometry();geometry.boundingBox=new THREE.Box3();for(const p of gltf.meshes[n.mesh].primitives){const a=gltf.accessors[p.attributes.POSITION];geometry.boundingBox.union(new THREE.Box3(new THREE.Vector3(...a.min),new THREE.Vector3(...a.max)));}object=new THREE.Mesh(geometry);}
 else object=new THREE.Object3D();
 object.name=n.name;if(n.translation)object.position.fromArray(n.translation);if(n.rotation)object.quaternion.fromArray(n.rotation);if(n.scale)object.scale.fromArray(n.scale);return object;
});
gltf.nodes.forEach((n,i)=>n.children?.forEach(child=>nodes[i].add(nodes[child])));
const root=nodes[gltf.scenes[0].nodes[0]];root.updateMatrixWorld(true);
const meshes=nodes.filter(n=>n.isMesh),bounds=bodyBounds(meshes),height=bounds.getSize(new THREE.Vector3()).y;
assert.ok(height>4&&height<6);
for(const zone of Object.keys(zones)){
 assert.ok(zoneStories[zone]);
 const box=regionBounds(zone,meshes);
 assert.ok(!box.isEmpty());
 for(const yaw of [0,.8,Math.PI/2,Math.PI,Math.PI*1.5])for(const aspect of [.5,.9,1.4])for(const mobile of [false,true])for(const panelSide of ['left','right']){
  const originalTarget=bounds.getCenter(new THREE.Vector3()),originalPosition=originalTarget.clone().add(new THREE.Vector3(Math.sin(yaw)*12,.3,Math.cos(yaw)*12));
  const plan=calculateFocusFrame({box,bodyHeight:height,cameraPosition:originalPosition,cameraTarget:originalTarget,fov:32,aspect,mobile,panelSide});
  const camera=new THREE.PerspectiveCamera(32,aspect,.1,80);camera.position.copy(plan.position);camera.lookAt(plan.target);camera.updateMatrixWorld();
  for(const corner of boxCorners(box)){const p=corner.project(camera);assert.ok(Math.abs(p.x)<.99&&Math.abs(p.y)<.99&&p.z<1,`Encuadre ${zone}, giro ${yaw}, aspecto ${aspect}, ${panelSide}`);if(mobile)assert.ok(p.y>-.02,`La región queda encima del cristal móvil: ${zone}`);}
 }
 // Tres datos por página, conservando exactamente el orden y los porcentajes.
 const paginated=[];for(let offset=0;offset<zones[zone].sensations.length;offset+=3){const html=sensationsChart(zone,{offset,limit:3});const values=[...html.matchAll(/--bar-value:([0-9.]+)%/g)].map(m=>Number(m[1]));assert.ok(values.length<=3);paginated.push(...values);}
 assert.deepEqual(paginated,zones[zone].sensations.map(([,v])=>v));
}
for(const f of Object.values(pigmentFactors))for(const zone of f.route)assert.ok(zones[zone]);
assert.deepEqual(pigmentFactors.Familia.route,['boca','pecho','cabeza']);
assert.deepEqual(pigmentFactors.Economía.route,['cabeza','estomago','manos']);
assert.deepEqual(pigmentFactors.Tiempo.route,['cabeza','manos','piernas']);
assert.deepEqual(pigmentFactors['Bienestar emocional'].route,['cabeza','pecho','estomago']);

const camera=new THREE.PerspectiveCamera(32,.9,.1,80);camera.position.set(5,2.9,11);
const controls={target:new THREE.Vector3(0,2.65,0),enabled:true,enableDamping:true,update(){}};
const originalPosition=camera.position.clone(),originalTarget=controls.target.clone(),phases=[];let reduced=false;
const focus=new FocusController({camera,controls,bodyHeight:height,getBox:zone=>regionBounds(zone,meshes),getReduced:()=>reduced,getMobile:()=>false,onPhase:p=>phases.push(p),onVisual(){}});
assert.equal(focus.select('cabeza'),true);assert.equal(controls.enabled,false);assert.equal(focus.select('manos'),false);
focus.update(0);focus.update(.016);focus.update(.916);assert.equal(focus.phase,'zooming-in');focus.update(1.017);assert.equal(focus.phase,'open');assert.equal(camera.fov,32);
focus.close();focus.update(2);focus.update(2.84);assert.equal(focus.phase,'zooming-out');focus.update(2.86);
assert.equal(focus.phase,'free');assert.equal(controls.enabled,true);assert.ok(camera.position.distanceTo(originalPosition)<1e-9);assert.ok(controls.target.distanceTo(originalTarget)<1e-9);
reduced=true;focus.select('piernas');focus.update(3);focus.update(3.016);assert.equal(focus.phase,'open');focus.close();focus.update(3.02);assert.equal(focus.phase,'free');
// Cerrar durante el acercamiento también devuelve la vista guardada.
reduced=false;focus.select('boca');focus.update(4);focus.update(4.016);focus.update(4.4);focus.close();focus.update(4.5);focus.update(5.36);assert.equal(focus.phase,'free');assert.ok(camera.position.distanceTo(originalPosition)<1e-9);
console.log('Verificado: encuadres del GLB en 360°, cristal móvil sin tapar la región, zoom gradual sin cambiar FOV, regreso exacto, cierre interrumpido, movimiento reducido, paginación y rutas narrativas.');
