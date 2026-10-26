import {bodyParts} from './pose.js';

// Capa ambiental sobre las articulaciones reales; conserva la postura del usuario.
const rhythms=[['Torso','x',.024,.38,0],['Cintura','y',.035,.30,.4],['Cabeza','y',.09,.32,0],['Hombro_I','z',.07,.40,.5],['Hombro_D','z',-.06,.40,.9],['Codo_I','x',-.08,.36,.2],['Codo_D','x',-.06,.36,.7],['Muneca_I','z',.065,.32,.8],['Muneca_D','z',-.055,.32,1.3],['Pierna_I','x',-.022,.30,0],['Rodilla_I','x',.03,.30,0]];
const limits=new Map();
for(const part of Object.values(bodyParts))for(const field of part.fields)for(const [name,axis,multiplier] of field.bindings){
  const a=field.min*multiplier*Math.PI/180,b=field.max*multiplier*Math.PI/180;
  limits.set(`${name}:${axis}`,[Math.min(a,b),Math.max(a,b)]);
}
export function addAmbientMotion(base,time,strength=1){
  const result=Object.fromEntries(Object.entries(base).map(([name,angles])=>[name,{...angles}]));
  const weight=Number.isFinite(strength)?Math.min(1,Math.max(0,strength)):0;
  if(!Number.isFinite(time)||!weight)return result;
  for(const [name,axis,amplitude,speed,phase] of rhythms){
    if(!result[name])continue;
    const [min,max]=limits.get(`${name}:${axis}`);
    result[name][axis]=Math.min(max,Math.max(min,result[name][axis]+Math.sin(time*speed+phase)*amplitude*weight));
  }
  return result;
}
