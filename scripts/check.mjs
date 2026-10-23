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
