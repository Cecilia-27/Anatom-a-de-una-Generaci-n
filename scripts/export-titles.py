"""Exporta los títulos fijos a trazados desde Dunbar Low Bold (no distribuye la fuente)."""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

font=TTFont(sys.argv[1]); glyphs=font.getGlyphSet(); cmap=font.getBestCmap(); metrics=font['hmtx'].metrics
assert font['name'].getDebugName(6)=='DunbarLow-Bold'
out=Path(__file__).resolve().parent.parent/'dist/assets/headings';out.mkdir(exist_ok=True)
titles={
 'explore':['Gira, descubre','y acércate'],
 'continue':['Tu recorrido','continúa.'],
 'portrait':['Cada parte cuenta','algo de una historia'],
 'invitation':['Explora lo que una generación siente,','incluso cuando no siempre puede decirlo.'],
 'cabeza':['Cabeza'],'pecho':['Pecho'],'estomago':['Estómago'],'boca':['Boca'],'manos':['Manos'],'piernas':['Piernas'],
 'move':['Dale tu propio','movimiento.'], 'zones':['Zonas del cuerpo'],
 'connections':['Distintas partes,','una misma decisión.'],
 'sensations':['Lo que se siente'],
 'mexico-context':['¿Qué está cambiando','en México?'],
 'opinion-guide':['Una decisión.','Cuatro formas de vivirla.'],
 'opinion-damian':['Decidir no tener'],
 'opinion-rodrigo':['Querer, pero','no ahora'],
 'opinion-fabiola':['Querer, pero','sentirse preparada'],
 'opinion-gabriel':['Postergar para','construir primero']
}
def kern(first,second):
 total=0
 for lookup in font['GPOS'].table.LookupList.Lookup:
  if lookup.LookupType!=2:continue
  for sub in lookup.SubTable:
   if first not in sub.Coverage.glyphs:continue
   if sub.Format==1:
    pair=next((p for p in sub.PairSet[sub.Coverage.glyphs.index(first)].PairValueRecord if p.SecondGlyph==second),None)
    if pair is None:continue
    total+=getattr(pair.Value1,'XAdvance',0) or 0
    break
   elif sub.Format==2:
    v=sub.Class1Record[sub.ClassDef1.classDefs.get(first,0)].Class2Record[sub.ClassDef2.classDefs.get(second,0)].Value1
    total+=getattr(v,'XAdvance',0) or 0
    break
 return total
for key,lines in titles.items():
 pen=SVGPathPen(glyphs); bounds=[]
 for lineNo,line in enumerate(lines):
  x=0;previous=None
  for char in line:
   name=cmap[ord(char)]
   if previous:x+=kern(previous,name)
   transform=(1,0,0,-1,x,lineNo*1210)
   glyphs[name].draw(TransformPen(pen,transform))
   bp=BoundsPen(glyphs);glyphs[name].draw(TransformPen(bp,transform))
   if bp.bounds:bounds.append(bp.bounds)
   x+=metrics[name][0];previous=name
 x0=min(b[0] for b in bounds)-4;y0=min(b[1] for b in bounds)-4;x1=max(b[2] for b in bounds)+4;y1=max(b[3] for b in bounds)+4
 (out/f'{key}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:g} {y0:g} {x1-x0:g} {y1-y0:g}"><path fill="#f50046" d="{pen.getCommands()}"/></svg>')
 print(key,round(x1-x0),round(y1-y0))
