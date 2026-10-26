import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {bodyBounds,regionBounds,boxCorners,calculateFocusFrame,FocusController} from '../dist/focus.js';
import {pigmentFactors,zoneStories} from '../dist/experience.js';
import {zones} from '../dist/data.js';
import {PigmentSystem} from '../dist/pigments.js';
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
 const paginated=[];for(let offset=0;offset<zones[zone].sensations.length;offset+=3){const html=sensationsChart(zone,{offset,limit:3});const values=[...html.matchAll(/data-value="([0-9.]+)"/g)].map(m=>Number(m[1]));assert.ok(values.length<=3);paginated.push(...values);}
 assert.deepEqual(paginated,zones[zone].sensations.map(([,v])=>v));
}
for(const f of Object.values(pigmentFactors))for(const zone of f.route)assert.ok(zones[zone]);
assert.deepEqual(pigmentFactors.Familia.route,['boca','pecho','cabeza']);
assert.deepEqual(pigmentFactors.Economía.route,['cabeza','estomago','manos']);
assert.deepEqual(pigmentFactors.Tiempo.route,['cabeza','manos','piernas']);
assert.deepEqual(pigmentFactors['Bienestar emocional'].route,['cabeza','pecho','estomago']);

const camera=new THREE.PerspectiveCamera(32,.9,.1,80);camera.position.set(5,2.9,11);
const controls={target:new THREE.Vector3(0,2.65,0),enabled:true,enableDamping:true,minDistance:11.65,maxDistance:13.1,update(){}};
const originalPosition=camera.position.clone(),originalTarget=controls.target.clone(),phases=[];let reduced=false;
const focus=new FocusController({camera,controls,bodyHeight:height,getBox:zone=>regionBounds(zone,meshes),getReduced:()=>reduced,getMobile:()=>false,onPhase:p=>phases.push(p),onVisual(){}});
assert.equal(focus.select('cabeza'),true);assert.equal(controls.enabled,false);
focus.update(0);focus.update(.016);focus.update(.916);assert.equal(focus.phase,'zooming-in');focus.update(1.017);assert.equal(focus.phase,'open');assert.equal(camera.fov,32);assert.equal(controls.enabled,true);assert.ok(controls.maxDistance>=13.1);assert.ok(controls.minDistance>height*.3);
// Ir de una zona a otra no guarda la vista de detalle como nueva vista general.
const firstDetail=camera.position.clone(),detailDirection=camera.position.clone().sub(controls.target).normalize();
assert.equal(focus.select('manos','left'),true);assert.ok(camera.position.distanceTo(firstDetail)<1e-9);
focus.update(1.03);focus.update(1.046);focus.update(1.5);
assert.equal(focus.phase,'zooming-in');assert.ok(camera.position.distanceTo(firstDetail)>.01);
assert.equal(focus.select('estomago'),true);focus.update(1.6);focus.update(1.616);focus.update(2.617);assert.equal(focus.phase,'open');
assert.ok(focus.viewDirection.dot(detailDirection)>.999);assert.ok(focus.saved.position.distanceTo(originalPosition)<1e-9);assert.ok(focus.saved.target.distanceTo(originalTarget)<1e-9);
// Reencuadrar una articulación conserva la lectura y no vuelve a abrir el panel.
const phaseCount=phases.length;nodes.find(n=>n.name==='Torso').rotation.x=.15;root.updateMatrixWorld(true);
focus.reframe();focus.update(3);focus.update(3.56);assert.equal(focus.phase,'open');assert.equal(phases.length,phaseCount);
focus.close();focus.update(4);assert.equal(focus.select('cabeza'),false);focus.update(4.84);assert.equal(focus.phase,'zooming-out');focus.update(4.86);
assert.equal(focus.phase,'free');assert.equal(controls.minDistance,11.65);assert.equal(controls.maxDistance,13.1);assert.equal(controls.enabled,true);assert.ok(camera.position.distanceTo(originalPosition)<1e-9);assert.ok(controls.target.distanceTo(originalTarget)<1e-9);
reduced=true;focus.select('piernas');focus.update(5);focus.update(5.016);assert.equal(focus.phase,'open');focus.select('cabeza');focus.update(5.02);focus.update(5.036);assert.equal(focus.phase,'open');focus.close();focus.update(5.04);assert.equal(focus.phase,'free');
assert.ok(camera.position.distanceTo(originalPosition)<1e-9);
// Cambio de mano en la misma zona y cierre durante un acercamiento.
reduced=false;focus.select('manos');focus.update(6);focus.update(6.016);assert.equal(focus.select('manos','left',{force:true}),true);focus.update(6.1);focus.update(6.116);focus.update(6.4);focus.close();focus.update(6.5);focus.update(7.36);assert.equal(focus.phase,'free');assert.ok(camera.position.distanceTo(originalPosition)<1e-9);

// Volver al cuerpo puede pedir el encuadre completo, aun si se entró desde un zoom manual.
const overviewPosition=new THREE.Vector3(.65,2.93,12.1),overviewTarget=new THREE.Vector3(0,2.65,0);
focus.getOverview=()=>({position:overviewPosition,target:overviewTarget});focus.select('cabeza');focus.update(8);focus.update(8.016);focus.update(9.02);focus.close(undefined,{overview:true});focus.update(10);focus.update(10.86);
assert.ok(camera.position.distanceTo(overviewPosition)<1e-9);assert.ok(controls.target.distanceTo(overviewTarget)<1e-9);

// La animación conserva dos flujos vivos, memoria acotada y pausa real.
const scene=new THREE.Scene(),anchorNames={cabeza:'Cabeza',boca:'Cabeza',pecho:'Torso',estomago:'Torso',manos:'Muneca_I',piernas:'Rodilla_D'};
const anchors=Object.fromEntries(Object.entries(anchorNames).map(([id,name])=>[id,nodes.find(n=>n.name===name)]));
const pigment=new PigmentSystem({scene,box:bounds,getAnchor:id=>anchors[id],texture:new THREE.Texture()});
const renderer={domElement:{height:960}};
pigment.activate(['Familia','Economía'],0);
for(let tick=0;tick<=180;tick++)pigment.update(tick*.05,camera,renderer);
assert.equal(pigment.active.length,2);assert.ok(pigment.count>400);assert.ok(pigment.count<=pigment.max);assert.ok(pigment.memories.size>=5);
assert.ok([...pigment.positions.subarray(0,pigment.count*3)].every(Number.isFinite));
const positions=Array.from(pigment.positions.subarray(0,pigment.count*3));
for(let tick=181;tick<240;tick++)pigment.update(tick*.05,camera,renderer,{paused:true});
assert.deepEqual(Array.from(pigment.positions.subarray(0,pigment.count*3)),positions);
pigment.update(12,camera,renderer);assert.notDeepEqual(Array.from(pigment.positions.subarray(0,pigment.count*3)),positions);
pigment.update(13,camera,renderer,{reduced:true});const staticPositions=Array.from(pigment.positions.subarray(0,pigment.count*3));
pigment.update(14,camera,renderer,{reduced:true});assert.deepEqual(Array.from(pigment.positions.subarray(0,pigment.count*3)),staticPositions);
anchors.cabeza.rotation.y+=.3;root.updateMatrixWorld(true);pigment.update(15,camera,renderer,{reduced:true});
assert.ok(pigment.count<=pigment.max);assert.equal(pigment.active.length,2);
console.log('Verificado: encuadres reales en 360°, cambio directo y durante el zoom, postura y reencuadre sin cerrar panel, regreso original, movimiento reducido, paginación, flujo continuo con pausa y partículas acotadas.');
