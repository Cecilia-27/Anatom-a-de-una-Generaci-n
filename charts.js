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
export function sensationsChart(zoneId){
  const zone=zones[zoneId];
  return `<figure class="sensations-chart" aria-labelledby="sensations-title">
    <figcaption class="chart-heading"><div><span class="chart-eyebrow">SENSACIONES REPORTADAS</span><h3 id="sensations-title">Lo que se siente en esta zona</h3></div><span class="sample-badge">n = 27</span></figcaption>
    <table class="bar-chart"><caption class="sr-only">Sensaciones reportadas en ${escape(zone.name)}. Porcentaje de las 27 personas de la encuesta. Escala de 0 a 100 por ciento.</caption>
      <thead><tr><th scope="col">Sensación</th><th scope="col">Porcentaje reportado</th></tr></thead>
      <tbody>${zone.sensations.map(([label,value],index)=>`<tr class="${index===0?'leading-row':''}"><th scope="row">${escape(label)}</th><td><div class="bar-cell"><span class="chart-track" aria-hidden="true"><span class="chart-fill" style="--bar-value:${value}%"></span></span><strong class="bar-value">${value}<small> %</small></strong></div></td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">Escala</th><td><div class="chart-scale" aria-hidden="true"><span>0</span><span>25</span><span>50</span><span>75</span><span>100 %</span></div></td></tr></tfoot>
    </table>
    <p class="chart-coverage">Se muestran las categorías proporcionadas; no se completa el 100 % con valores supuestos.</p>
  </figure>`;
}
export function contextCharts(zoneId){
  const groups=contextGroups(zoneId);
  return `<div class="context-intro"><span class="chart-eyebrow">OTRAS PREGUNTAS DE LA ENCUESTA</span><h3>La decisión en contexto</h3><p>Lee cada grupo por separado: factores, preocupaciones y emociones son preguntas distintas.</p></div>
    ${groups.length?groups.map((group,index)=>`<section class="context-chart-group" aria-labelledby="context-group-${index}"><h4 id="context-group-${index}">${group.title}</h4>${group.rows.map(({value,label})=>`<div class="context-chart-row"><p>${escape(label)}</p><strong>${value}<small> %</small></strong><span class="chart-track" aria-hidden="true"><span class="chart-fill" style="--bar-value:${value}%"></span></span></div>`).join('')}</section>`).join(''):'<p class="chart-empty">No se proporcionaron porcentajes adicionales para este tema. Puedes explorar las sensaciones reportadas en la otra pestaña.</p>'}
    <p class="context-method">Encuesta, n = 27${groups.length?' · Escala de las barras: 0–100 %. Los porcentajes se leen por separado y no se suman.':''}</p>`;
}
