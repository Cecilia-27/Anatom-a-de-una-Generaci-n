const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlap=(a,b,gap)=>Math.abs(a.x-b.x)<(a.width+b.width)/2+gap&&Math.abs(a.y-b.y)<(a.height+b.height)/2+gap;
// Espacio de pantalla: una órbita elíptica con separación real entre etiquetas.
export function opinionPositions({width,height,phase=0,count=4,obstacles=[]}){
 const bw=Math.min(126,width-24),bh=50,pad=12,gap=14;
 const points=Array.from({length:count},(_,i)=>{const angle=phase+i*Math.PI*2/count;return width<360?{x:width/2+Math.cos(angle)*Math.max(0,width/2-bw/2-pad),y:height*(i+.5)/count+Math.sin(angle)*6,width:bw,height:bh}:{x:width/2+Math.cos(angle)*Math.max(0,width/2-bw/2-pad),y:height/2+Math.sin(angle)*Math.max(0,height/2-bh/2-30),width:bw,height:bh};});
 const constrain=p=>{p.x=clamp(p.x,bw/2+pad,width-bw/2-pad);p.y=clamp(p.y,bh/2+pad,height-bh/2-pad);};
 for(let pass=0;pass<36;pass++){
  for(let i=0;i<count;i++){
   const a=points[i];
   for(let j=i+1;j<count;j++){const b=points[j];if(!overlap(a,b,gap))continue;const dy=(a.height+b.height)/2+gap-Math.abs(a.y-b.y),sign=a.y<=b.y?-1:1;a.y+=sign*dy/2;b.y-=sign*dy/2;}
   for(const b of obstacles){if(!overlap(a,b,9))continue;const dx=(a.width+b.width)/2+9-Math.abs(a.x-b.x),dy=(a.height+b.height)/2+9-Math.abs(a.y-b.y);if(dx<dy)a.x+=(a.x<=b.x?-1:1)*dx;else a.y+=(a.y<=b.y?-1:1)*dy;}
   constrain(a);
  }
 }
 // En anchos mínimos se priorizan etiquetas completas y separación, sin encoger la letra.
 if(points.some((a,i)=>points.slice(i+1).some(b=>overlap(a,b,gap-1)))){
  points.forEach((p,i)=>{p.y=pad+bh/2+(height-2*pad-bh)*i/(count-1);p.x=width/2+Math.cos(phase+i)*Math.max(0,width/2-bw/2-pad);constrain(p);});
 }
 return points;
}
export function opinionWindowPosition({viewportWidth,viewportHeight,panelWidth,panelHeight,preferredLeft=0,particleTop=180}){
 const width=Math.min(panelWidth,viewportWidth-32),height=Math.min(panelHeight,viewportHeight-40);
 return {left:clamp(preferredLeft,16,viewportWidth-width-16),top:clamp(particleTop-65,100,Math.max(100,viewportHeight-height-20)),width,height};
}
