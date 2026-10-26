import assert from 'node:assert/strict';
import {bodyParts,createPose,jointAngles} from '../dist/pose.js';
import {addAmbientMotion} from '../dist/motion.js';
const neutral=jointAngles(createPose()),pose=createPose();
pose.cabeza.giro=24;pose.brazo_I.codo=45;pose.mano_D.dedos=65;
const manual=jointAngles(pose),snapshot=JSON.stringify(manual);
assert.deepEqual(addAmbientMotion(manual,8,0),manual,'Movimiento reducido/pausa de capa conserva exactamente los ángulos');
assert.notDeepEqual(addAmbientMotion(manual,2),addAmbientMotion(manual,7),'El movimiento sigue tras modificar una postura');
assert.notDeepEqual(addAmbientMotion(neutral,2,.4),addAmbientMotion(neutral,7,.4),'La zona enfocada conserva movimiento suave');
assert.equal(JSON.stringify(manual),snapshot,'La animación no cambia los valores manuales');
assert.equal(addAmbientMotion(manual,8).Dedo_D_0.x,manual.Dedo_D_0.x,'Los dedos conservan el cierre elegido');
for(const extremes of ['min','max']){
 const pose=createPose();for(const [id,part] of Object.entries(bodyParts))for(const f of part.fields)pose[id][f.id]=f[extremes];
 for(let time=0;time<100;time+=.7){const angles=addAmbientMotion(jointAngles(pose),time);
  for(const part of Object.values(bodyParts))for(const f of part.fields)for(const [name,axis,m] of f.bindings){const bounds=[f.min*m*Math.PI/180,f.max*m*Math.PI/180].sort((a,b)=>a-b);assert.ok(angles[name][axis]>=bounds[0]-1e-9&&angles[name][axis]<=bounds[1]+1e-9,`${name} conserva límites con animación`);}
 }
}
console.log('Verificado: movimiento ambiental sobre posturas manuales y en zoom, valores del usuario intactos y límites de todas las articulaciones.');
