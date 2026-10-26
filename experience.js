// Asociaciones narrativas propuestas por la investigación; no son relaciones médicas.
export const zoneStories={
  cabeza:{concepts:['Pensamientos','Incertidumbre','Futuro','Dudas'],insight:'La agitación es la segunda categoría con mayor porcentaje reportado en la cabeza.'},
  pecho:{concepts:['Presión familiar','Expectativas','Ilusión','Deseo','Vínculos'],insight:'Vacío y agitación son las dos categorías con mayor porcentaje reportado en el pecho.'},
  estomago:{concepts:['Miedo','Nervios','Ansiedad','Incertidumbre'],insight:'Hormigueo, dolor y agitación comparten el mismo porcentaje en los resultados del estómago.'},
  manos:{concepts:['Responsabilidad','Cuidados','Control','Acciones'],insight:'El sudor es la segunda categoría con mayor porcentaje reportado en las manos.'},
  piernas:{concepts:['Cansancio','Carga','Avanzar','Postergación'],insight:'Después de vacío, la debilidad es la categoría más reportada en las piernas.'},
  boca:{concepts:['Conversaciones','Presión externa','Justificar la decisión','Comentarios sociales'],insight:'El hormigueo es la segunda categoría con mayor porcentaje reportado en la boca.'}
};
export const pigmentFactors={
  'Familia':{color:'#f50046',route:['boca','pecho','cabeza'],side:-1,height:.76},
  'Economía':{color:'#ffcb32',route:['cabeza','estomago','manos'],side:1,height:.70},
  'Tiempo':{color:'#a044b5',route:['cabeza','manos','piernas'],side:1,height:.27},
  'Bienestar emocional':{color:'#3ab4ed',route:['cabeza','pecho','estomago'],side:1,height:.51},
  'Proyecto personal':{color:'#9f42b2',route:['cabeza','manos','piernas'],side:-1,height:.48},
  'Pareja':{color:'#e72574',route:['pecho','boca','manos'],side:-1,height:.32},
  'Estudios / trabajo':{color:'#9651bd',route:['cabeza','manos','piernas'],side:-1,height:.61},
  'Futuro':{color:'#9f42b2',route:['cabeza','estomago'],side:1,height:.83},
  'Cuidados':{color:'#3ab4ed',route:['manos','pecho','piernas'],side:-1,height:.39},
  'Presiones sociales':{color:'#f50046',route:['boca','cabeza','pecho'],side:1,height:.63}
};
