// El dibujo puede respirar fuera de la columna sin alterar el encuadre ni la selección.
export function viewportMetrics(width,height,left=0,right=0,top=0,bottom=0){
 return {width,height,left,right,top,bottom,renderWidth:width+left+right,renderHeight:height+top+bottom};
}
export function stageFromNdc(point,frame){return {x:(point.x*.5+.5)*frame.renderWidth-frame.left,y:(-.5*point.y+.5)*frame.renderHeight-frame.top};}
export function ndcFromStage(point,frame){return {x:(point.x+frame.left)/frame.renderWidth*2-1,y:1-(point.y+frame.top)/frame.renderHeight*2};}
