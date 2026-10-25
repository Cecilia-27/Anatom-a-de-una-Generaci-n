import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {zones,voices} from '../dist/data.js';
const original=await readFile(new URL('../../titere-3d/titere-articulado.glb',import.meta.url));
const served=await readFile(new URL('../dist/assets/titere-articulado.glb',import.meta.url));
const hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(hash(original),hash(served),'El GLB debe conservarse exactamente');
const len=served.readUInt32LE(12),gltf=JSON.parse(served.subarray(20,20+len).toString());
assert.equal(gltf.skins?.length||0,0);
assert.ok(gltf.animations.some(a=>a.name==='Saludo_demostracion'));
for(const name of ['Cabeza','Torso','Cintura','Muneca_I','Muneca_D','Pierna_I','Pierna_D','Rodilla_I','Hilo_0','Hilo_4'])assert.ok(gltf.nodes.some(n=>n.name===name),`Articulación real: ${name}`);
assert.equal(Object.keys(zones).length,6);assert.ok(!zones.pies);
const expected={cabeza:[44.4,14.8,7.4,7.4,7.4,7.4,3.7],pecho:[44.4,29.6,11.1,3.7,3.7,3.7],estomago:[48.1,11.1,11.1,11.1,7.4,7.4],manos:[48.1,18.5,11.1,7.4,7.4,3.7],piernas:[51.9,14.8,11.1,7.4,3.7],boca:[51.9,11.1,7.4,7.4,3.7]};
for(const [id,z] of Object.entries(zones)){assert.deepEqual(z.sensations.map(s=>s[1]),expected[id]);for(const linked of z.route)assert.ok(zones[linked]);assert.ok(voices[z.quote]);}
assert.equal(new Set(Object.values(zones).flatMap(z=>z.factors)).size,10);
console.log('Verificado: GLB original intacto; articulaciones y animación existentes; seis zonas y todos sus porcentajes; diez factores; recorridos válidos.');

// Verifica que cada control mueva articulaciones reales y respete sus límites.
const {bodyParts,partOrder,createPose,setPoseValue,jointAngles,partForMesh}=await import('../dist/pose.js');
const pose=createPose();assert.equal(partOrder.length,8);
for(const [id,part] of Object.entries(bodyParts)){
 assert.ok(gltf.nodes.some(n=>n.name===part.anchor[0]));
 for(const f of part.fields){
  for(const [name] of f.bindings)assert.ok(gltf.nodes.some(n=>n.name===name),`Pivote real: ${name}`);
  setPoseValue(pose,id,f.id,1e6);assert.equal(pose[id][f.id],f.max);
  setPoseValue(pose,id,f.id,-1e6);assert.equal(pose[id][f.id],f.min);
  assert.equal(setPoseValue(pose,id,f.id,NaN),false);
  setPoseValue(pose,id,f.id,0);
 }
}
assert.ok(Object.values(jointAngles(pose)).every(a=>a.x===0&&a.y===0&&a.z===0));
setPoseValue(pose,'brazo_I','codo',45);assert.ok(jointAngles(pose).Codo_I.x<0);assert.equal(jointAngles(pose).Codo_D.x,0);
setPoseValue(pose,'mano_D','dedos',80);assert.ok(jointAngles(pose).Dedo_D_0.x>0);assert.ok(jointAngles(pose).Punta_D_3.x>0);
assert.equal(partForMesh('Antebrazo_I'),'brazo_I');assert.equal(partForMesh('Falange_distal_D_0'),'mano_D');assert.equal(partForMesh('Hilo_0'),null);
console.log('Verificado: 8 partes articulables, límites de giro, selección de piezas, dedos y control independiente de ambos lados.');

// Fidelidad cuantitativa: cada longitud representa su porcentaje en escala 0–100.
const {sensationsChart,contextGroups}=await import('../dist/charts.js');
for(const [id,zone] of Object.entries(zones)){
 const html=sensationsChart(id);
 const widths=[...html.matchAll(/--bar-value:([0-9.]+)%/g)].map(m=>Number(m[1]));
 assert.deepEqual(widths,zone.sensations.map(([,value])=>value),`Escala real: ${id}`);
 assert.ok(widths.every(v=>v>=0&&v<=100));
 assert.deepEqual(contextGroups(id).flatMap(g=>g.rows.map(r=>[r.value,r.label])),zone.stats.map(([v,t])=>[Number(v),t]),`Sin omitir ni añadir resultados: ${id}`);
}
assert.deepEqual(contextGroups('estomago').find(g=>g.title==='Emociones').rows.map(r=>r.value),[59.3,40.7]);
assert.deepEqual(contextGroups('estomago').find(g=>g.title==='Factores de decisión').rows.map(r=>r.value),[40.7]);
assert.deepEqual(contextGroups('boca'),[]);
console.log('Verificado: barras con porcentajes exactos y escala común; preguntas de la encuesta separadas; sin completar distribuciones ni inventar cifras.');
