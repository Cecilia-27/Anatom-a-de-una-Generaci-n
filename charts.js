import { zones } from './data.js';

// Cada posición corresponde a un resultado existente, sin duplicar ni cambiar valores.
const questionKinds={
  cabeza:['Preocupaciones','Factores de decisión','Emociones'],
  pecho:['Factores de decisión','Emociones'],
  estomago:['Emociones','Emociones','Factores de decisión'],
  boca:[],
  manos:['Factores de decisión','Preocupaciones','Preocupaciones'],
  piernas:['Factores de decisión','Factores de decisión','Preocupaciones']
};
export function contextGroups(zoneId){
  const zone=zones[zoneId];if(!zone)return [];
  const groups=new Map();
  zone.stats.forEach(([value,label],index)=>{
    const title=questionKinds[zoneId][index];
    if(!groups.has(title))groups.set(title,{title,rows:[]});
    groups.get(title).rows.push({value:Number(value),label});
  });
  return [...groups.values()];
}
function escape(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export {renderZoneChart} from './organic-chart.js';
export {renderZoneChart as sensationsChart} from './organic-chart.js';
export function contextCharts(zoneId){
  const groups=contextGroups(zoneId);
  return `<div class="context-intro"><span class="chart-eyebrow">OTRAS PREGUNTAS DE LA ENCUESTA</span><h3>La decisión en contexto</h3><p>Lee cada grupo por separado: factores, preocupaciones y emociones son preguntas distintas.</p></div>
    ${groups.length?groups.map((group,index)=>`<section class="context-chart-group" aria-labelledby="context-group-${index}"><h4 id="context-group-${index}">${group.title}</h4>${group.rows.map(({value,label})=>`<div class="context-chart-row"><p>${escape(label)}</p><strong>${value}<small> %</small></strong></div>`).join('')}</section>`).join(''):'<p class="chart-empty">No se proporcionaron porcentajes adicionales para este tema. Puedes explorar las sensaciones reportadas en la otra pestaña.</p>'}
    <p class="context-method">Encuesta, n = 27${groups.length?' · Los porcentajes se leen por separado y no se suman.':''}</p>`;
}
