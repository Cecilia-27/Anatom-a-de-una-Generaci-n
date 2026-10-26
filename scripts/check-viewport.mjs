import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {viewportMetrics,stageFromNdc,ndcFromStage} from '../dist/viewport.js';
for(const [w,h,left,right] of [[460,620,400,540],[700,710,650,50],[314,490,48,48]]){
 const original=new THREE.PerspectiveCamera(29,w/h,.1,80);original.position.set(.65,2.93,12.1);original.lookAt(0,2.65,0);original.updateMatrixWorld();
 const extended=original.clone(),frame=viewportMetrics(w,h,left,right,54,70);extended.setViewOffset(w,h,-left,-54,frame.renderWidth,frame.renderHeight);extended.updateMatrixWorld();
 const ray=new THREE.Raycaster(),otherRay=new THREE.Raycaster();
 for(const point of [new THREE.Vector3(0,2.6,0),new THREE.Vector3(-.8,.1,.4),new THREE.Vector3(.7,4.6,.3)]){
  const before=point.clone().project(original),after=point.clone().project(extended),position=stageFromNdc(after,frame);
  assert.ok(Math.abs(position.x-(before.x*.5+.5)*w)<1e-8);assert.ok(Math.abs(position.y-(-before.y*.5+.5)*h)<1e-8);
  const ndc=ndcFromStage(position,frame);assert.ok(Math.abs(ndc.x-after.x)<1e-10);assert.ok(Math.abs(ndc.y-after.y)<1e-10);
  ray.setFromCamera(new THREE.Vector2(before.x,before.y),original);otherRay.setFromCamera(new THREE.Vector2(ndc.x,ndc.y),extended);assert.ok(ray.ray.direction.distanceTo(otherRay.ray.direction)<1e-10);
 }
}
console.log('Verificado: el área de dibujo ampliada mantiene el encuadre, hotspots y selección de piezas exactos en escritorio y móvil.');
