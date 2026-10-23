// Ángulos relativos a la postura original. Solo usan pivotes comprobados en el GLB.
const field = (id, label, min, max, bindings, unit='°') => ({id,label,min,max,bindings,unit});
export const bodyParts = {
  cabeza:{name:'Cabeza',symbol:'✧',anchor:['Cabeza',[0,.43,.29]],drag:['giro','inclinacion'],fields:[
    field('giro','Girar',-55,55,[['Cabeza','y',1]]),
    field('inclinacion','Inclinar',-20,20,[['Cabeza','x',1]])]},
  torso:{name:'Torso',symbol:'◇',anchor:['Torso',[0,.48,.30]],drag:['giro','inclinacion'],fields:[
    field('giro','Girar el torso',-20,20,[['Cintura','y',1]]),
    field('inclinacion','Inclinar el torso',-12,12,[['Torso','x',1]])]},
};
for (const [side,label,sign] of [['I','izquierdo',1],['D','derecho',-1]]) {
  bodyParts[`brazo_${side}`]={name:`Brazo ${label}`,symbol:'↗',anchor:[`Codo_${side}`,[0,.05,.12]],drag:['adelante','levantar'],fields:[
    field('levantar','Levantar el brazo',0,70,[[`Hombro_${side}`,'z',sign]]),
    field('adelante','Llevar hacia delante',-15,65,[[`Hombro_${side}`,'x',-1]]),
    field('codo','Flexionar el codo',0,95,[[`Codo_${side}`,'x',-1]])]};
  bodyParts[`mano_${side}`]={name:`Mano ${side==='I'?'izquierda':'derecha'}`,symbol:'⌘',anchor:[`Muneca_${side}`,[0,-.14,.12]],drag:['giro','muneca'],fields:[
    field('muneca','Flexionar la muñeca',-30,40,[[`Muneca_${side}`,'x',1]]),
    field('giro','Girar la mano',-30,30,[[`Muneca_${side}`,'z',sign]]),
    field('dedos','Cerrar los dedos',0,100,Array.from({length:4},(_,f)=>[[`Dedo_${side}_${f}`,'x',.65],[`Punta_${side}_${f}`,'x',.35]]).flat(),'%')]};
  bodyParts[`pierna_${side}`]={name:`Pierna ${side==='I'?'izquierda':'derecha'}`,symbol:'↟',anchor:[`Rodilla_${side}`,[0,-.03,.16]],drag:['abrir','adelante'],fields:[
    field('adelante','Llevar hacia delante',-15,30,[[`Pierna_${side}`,'x',-1]]),
    field('abrir','Abrir la pierna',0,18,[[`Pierna_${side}`,'z',sign]]),
    field('rodilla','Flexionar la rodilla',0,55,[[`Rodilla_${side}`,'x',1]]),
    field('tobillo','Mover el tobillo',-15,20,[[`Tobillo_${side}`,'x',1]])]};
}
export const partOrder=['cabeza','torso','brazo_I','brazo_D','mano_I','mano_D','pierna_I','pierna_D'];
export function createPose(){return Object.fromEntries(Object.entries(bodyParts).map(([id,p])=>[id,Object.fromEntries(p.fields.map(f=>[f.id,0]))]));}
export function setPoseValue(pose,part,fieldId,value){
  const f=bodyParts[part]?.fields.find(f=>f.id===fieldId);
  if(!f||!Number.isFinite(value))return false;
  pose[part][fieldId]=Math.min(f.max,Math.max(f.min,value));return true;
}
export function jointAngles(pose){
  const angles={};
  for(const [id,p] of Object.entries(bodyParts))for(const f of p.fields)for(const [name,axis,multiplier] of f.bindings){
    angles[name]??={x:0,y:0,z:0};angles[name][axis]+=pose[id][f.id]*multiplier*Math.PI/180;
  }
  return angles;
}
export function partForMesh(name){
  if(/^(Cabeza|Oreja|Union_cuello)/.test(name))return 'cabeza';
  if(/^(Torso|Pelvis|Union_cintura)/.test(name))return 'torso';
  const side=name.match(/_([ID])(?:_|$)/)?.[1];if(!side)return null;
  if(/^(Palma|Falange|Pulgar|Union_muneca)/.test(name))return `mano_${side}`;
  if(/^(Brazo|Antebrazo|Union_hombro|Union_codo)/.test(name))return `brazo_${side}`;
  if(/^(Muslo|Pantorrilla|Pie|Union_cadera|Union_rodilla|Union_tobillo)/.test(name))return `pierna_${side}`;
  return null;
}
