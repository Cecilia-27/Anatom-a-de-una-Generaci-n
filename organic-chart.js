import {zones} from './data.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function randomFor(text){let seed=[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const round=n=>Math.round(n*1000)/1000;
export function organicColumns(zoneInput,{plotHeight=240,offset=0,limit=Infinity}={}){
  const zone=typeof zoneInput==='string'?zones[zoneInput]:zoneInput;
  if(!zone)throw Error('Zona de datos desconocida');
  return zone.sensations.slice(offset,offset+limit).map(([label,value],index)=>{
    const random=randomFor(`${zone.name}:${label}`),height=value/100*plotHeight,color=zone.palette[(offset+index)%zone.palette.length];
    const marks=Array.from({length:Math.max(1,Math.round(value/3))},(_,i)=>{
      const radius=Math.min(1.2+random()*2.4,height/4),y=radius+random()*Math.max(0,height-2*radius);
      return {x:16+random()*8,y:round(y),radius:round(radius),opacity:round(.3+random()*.6),dash:i%4===3};
    });
    const grains=Array.from({length:Math.max(5,Math.round(value*.7))},()=>({x:10+random()*20,y:random()*height,radius:.3+random()*.8,opacity:.18+random()*.4}));
    const wash=Array.from({length:4},()=>({x:17+random()*6,y:height*(.15+random()*.7),rx:3+random()*4,ry:Math.min(height*.28,4+random()*12)}));
    return {label,value,height:round(height),color,marks,grains,wash};
  });
}
export function renderZoneChart(zoneInput,options={}){
  const zone=typeof zoneInput==='string'?zones[zoneInput]:zoneInput,plotHeight=options.plotHeight||240,columns=organicColumns(zone,options);
  const key=zone.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z]/g,'').toLowerCase();
  return `<figure class="organic-chart" aria-labelledby="sensations-title" style="--plot-height:${plotHeight}px;--column-count:${columns.length}">
    <figcaption class="organic-caption"><h3 id="sensations-title">SENSACIONES REPORTADAS</h3><span class="organic-sample">n = ${zone.sample}</span></figcaption>
    <div class="organic-plot" aria-hidden="true"><div class="organic-axis"><span>100%</span><span>50%</span><span>0%</span></div><div class="organic-columns">${columns.map((c,i)=>`<div class="organic-column" data-value="${c.value}" data-height="${c.height}" style="--ink-color:${c.color};--ink-value:${c.value};--ink-delay:${i*28}ms">
      <div class="ink-space"><strong class="ink-percent">${c.value}%</strong><div class="ink-shape"><svg viewBox="0 0 40 ${c.height}" preserveAspectRatio="none" overflow="hidden"><defs><clipPath id="ink-${key}-${i}"><rect width="40" height="${c.height}"/></clipPath></defs><g clip-path="url(#ink-${key}-${i})"><path class="ink-spine" d="M20 0 Q18 ${c.height*.34} 20 ${c.height*.63} T20 ${c.height}"/>${c.wash.map(w=>`<ellipse class="ink-water" cx="${round(w.x)}" cy="${round(w.y)}" rx="${round(w.rx)}" ry="${round(w.ry)}"/>`).join('')}${c.grains.map(m=>`<circle cx="${round(m.x)}" cy="${round(m.y)}" r="${round(m.radius)}" opacity="${round(m.opacity)}"/>`).join('')}${c.marks.map(m=>m.dash?`<path d="M${round(m.x-2)} ${m.y}l4 -.4" stroke="currentColor" stroke-width="1.2" opacity="${m.opacity}"/>`:`<circle cx="${round(m.x)}" cy="${m.y}" r="${m.radius}" opacity="${m.opacity}"/>`).join('')}<path d="M23 0 Q25 ${c.height*.5} 22 ${c.height}" fill="none" stroke="currentColor" stroke-width=".35" opacity=".5"/></g></svg></div></div>
      <span class="ink-label">${escape(c.label.replace('Mareo / náusea','Mareo o náusea'))}</span></div>`).join('')}</div></div>
    <p class="organic-key">Altura = porcentaje · marcas = textura. Escala lineal de 0 a 100 %.</p>
    <details class="organic-data"><summary>Leer los valores en texto</summary><table><caption>Sensaciones reportadas en ${escape(zone.name)} · n = ${zone.sample}</caption><thead><tr><th scope="col">Sensación</th><th scope="col">Porcentaje</th></tr></thead><tbody>${columns.map(c=>`<tr><th scope="row">${escape(c.label)}</th><td>${c.value}%</td></tr>`).join('')}</tbody></table></details>
  </figure>`;
}
