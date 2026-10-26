import {zones} from './data.js';
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const round=n=>Math.round(n*1000)/1000;
function randomFor(text){let seed=[...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,17);return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
// El área del círculo representa el porcentaje. Las gotas son textura, no personas.
const positions=[[105,94],[300,94],[67,235],[210,235],[353,235],[128,365],[300,365]];
export function organicBubbles(zoneInput,{offset=0,limit=Infinity}={}){
 const zone=typeof zoneInput==='string'?zones[zoneInput]:zoneInput;
 if(!zone)throw Error('Zona de datos desconocida');
 return zone.sensations.slice(offset,offset+limit).map(([label,value],i)=>{
  const random=randomFor(`${zone.name}:${label}`),radius=95*Math.sqrt(value/100);
  const grains=Array.from({length:12},()=>{const a=random()*Math.PI*2,r=radius*(1.12+random()*.3);return {x:round(Math.cos(a)*r),y:round(Math.sin(a)*r),radius:round(.6+random()*1.8),opacity:round(.2+random()*.35)};});
  return {label,value,radius,x:positions[i][0],y:positions[i][1],color:zone.palette[(offset+i)%zone.palette.length],grains};
 });
}
export function renderZoneChart(zoneInput,options={}){
 const zone=typeof zoneInput==='string'?zones[zoneInput]:zoneInput,bubbles=organicBubbles(zone,options);
 const key=zone.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z]/g,'').toLowerCase();
 const labels=bubbles.map(b=>`${b.label}: ${b.value}%`).join('; ');
 return `<figure class="organic-chart sensation-map" style="--map-color:${zone.color}" aria-labelledby="sensations-title">
  <figcaption class="map-caption"><div><span class="map-eyebrow">SENSACIONES REPORTADAS · ${escape(zone.name)}</span><h3 id="sensations-title"><span class="sr-only">Lo que se siente</span><img src="./assets/headings/sensations.svg" alt="" aria-hidden="true"></h3></div><span class="map-sample">n = ${zone.sample}</span></figcaption>
  <p class="map-intro">Distintas sensaciones, una misma pregunta.<br>Así lo reportaron quienes participaron.</p>
  <svg class="sensation-landscape" viewBox="0 0 420 ${bubbles.length<=5?320:450}" role="img" aria-labelledby="map-title-${key} map-desc-${key}">
   <title id="map-title-${key}">Sensaciones reportadas en ${escape(zone.name)}</title><desc id="map-desc-${key}">${escape(labels)}. El área de cada círculo es proporcional al porcentaje, en una escala común de 0 a 100%.</desc>
   <defs><radialGradient id="paper-${key}"><stop stop-color="${zone.color}" stop-opacity=".13"/><stop offset="1" stop-color="${zone.color}" stop-opacity="0"/></radialGradient><filter id="wash-${key}" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="17" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale="7"/></filter></defs>
   <ellipse cx="190" cy="207" rx="210" ry="230" fill="url(#paper-${key})"/><ellipse cx="240" cy="260" rx="180" ry="150" fill="#f50046" opacity=".025" filter="url(#wash-${key})"/>
   ${bubbles.map((b,i)=>{const lines=b.label==='Mareo / náusea'?['Mareo o','náusea']:[b.label];return `<g class="sensation-node" tabindex="0" role="img" aria-label="${escape(b.label)}: ${b.value}%" data-value="${b.value}" data-radius="${b.radius}" transform="translate(${b.x} ${b.y})" style="--node-color:${b.color};--node-delay:${i*55}ms">
    <g class="sensation-ink"><circle class="sensation-wash" r="${round(b.radius*1.14)}" fill="${b.color}" opacity=".13" filter="url(#wash-${key})"/>
    <circle class="sensation-area" r="${b.radius}" fill="${b.color}" fill-opacity=".22" stroke="${b.color}" stroke-opacity=".38" stroke-width=".7"/>
    <ellipse cx="${round(-b.radius*.24)}" cy="${round(b.radius*.15)}" rx="${round(b.radius*.53)}" ry="${round(b.radius*.67)}" fill="${b.color}" opacity=".12" filter="url(#wash-${key})"/>
    ${b.grains.map(g=>`<circle cx="${g.x}" cy="${g.y}" r="${g.radius}" fill="${b.color}" opacity="${g.opacity}"/>`).join('')}</g>
    <text class="sensation-value" text-anchor="middle" dy=".35em" font-size="${i===0?32:b.radius<22?17:22}" style="font-size:calc(${i===0?32:b.radius<22?17:22}px + var(--zone-type-step,0px))">${b.value}<tspan class="sensation-unit">%</tspan></text>
    <text class="sensation-name" text-anchor="middle" y="${round(b.radius+24)}">${lines.map((line,j)=>`<tspan x="0" dy="${j?19:0}">${escape(line)}</tspan>`).join('')}</text>
   </g>`;}).join('')}
  </svg>
  <p class="map-reading"><span aria-hidden="true">◯</span> Área del círculo = porcentaje.<br><span class="map-reading-note">Las manchas acompañan la lectura. Los valores no se suman.</span></p>
  <details class="organic-data"><summary>Ver todos los valores en texto</summary><table><caption>Sensaciones reportadas en ${escape(zone.name)} · n = ${zone.sample}</caption><thead><tr><th scope="col">Sensación</th><th scope="col">Porcentaje</th></tr></thead><tbody>${bubbles.map(b=>`<tr><th scope="row">${escape(b.label)}</th><td>${b.value}%</td></tr>`).join('')}</tbody></table></details>
 </figure>`;
}
