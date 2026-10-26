import assert from 'node:assert/strict';
import {voices,opinionSource} from '../dist/opinions-data.js';
import {opinionPositions,opinionWindowPosition} from '../dist/opinion-layout.js';
assert.deepEqual(voices.map(v=>[v.name,v.age]),[['Damian',22],['Rodrigo',22],['Fabiola',27],['Gabriel',21]]);
assert.deepEqual(voices.map(v=>v.text),['Hoy tengo claro que no quiero tener hijos.','Sí me gustaría tener hijos en el futuro, aunque no ahora.','Quiero tener hijos, pero también me da miedo todo lo que implica.','Sí lo imagino, pero todavía lo veo lejos.']);
assert.deepEqual(voices.map(v=>v.topics.length),[8,9,8,8]);
assert.deepEqual(voices.filter(v=>v.adapted).map(v=>v.name),['Fabiola','Gabriel']);
for(const v of voices){assert.ok(v.topics.some(([label])=>label==='Cuerpo'));assert.match(opinionSource(v),new RegExp(v.name));assert.equal(new Set(v.topics.map(([label])=>label)).size,v.topics.length);}
for(const [width,height] of [[214,458],[244,458],[314,470],[450,643],[650,750]]){
 for(let step=0;step<180;step++){
  const points=opinionPositions({width,height,phase:step*Math.PI/90,obstacles:[{x:width*.5,y:height*.25,width:44,height:44},{x:width*.46,y:height*.56,width:44,height:44}]});
  for(const [i,a] of points.entries()){
   assert.ok(a.x-a.width/2>=11.9&&a.x+a.width/2<=width-11.9,'Partícula completa dentro del ancho');
   assert.ok(a.y-a.height/2>=11.9&&a.y+a.height/2<=height-11.9,'Partícula completa dentro del alto');
   for(const b of points.slice(i+1))assert.ok(Math.abs(a.x-b.x)>=(a.width+b.width)/2+12||Math.abs(a.y-b.y)>=(a.height+b.height)/2+12,'Etiquetas separadas durante toda la órbita');
  }
 }
}
for(const [width,height] of [[1280,800],[1440,900],[1920,1080]]){
 const p=opinionWindowPosition({viewportWidth:width,viewportHeight:height,panelWidth:360,panelHeight:600,preferredLeft:width*.65,particleTop:height*.9});
 assert.ok(p.left>=16&&p.left+p.width<=width-16);assert.ok(p.top>=100&&p.top+p.height<=height-20);
}
console.log('Verificado: 37 fragmentos proporcionados, cuatro posturas, adaptaciones identificadas, órbitas sin superposición y ventana dentro de pantalla.');
