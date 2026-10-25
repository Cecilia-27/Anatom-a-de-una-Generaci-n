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
  'Familia':{color:'#e83e75',route:['boca','pecho','cabeza'],side:-1,height:.76},
  'Economía':{color:'#eab34b',route:['cabeza','estomago','manos'],side:1,height:.70},
  'Tiempo':{color:'#9a71cc',route:['cabeza','manos','piernas'],side:1,height:.27},
  'Bienestar emocional':{color:'#559bd3',route:['cabeza','pecho','estomago'],side:1,height:.51},
  'Proyecto personal':{color:'#70a693',route:['cabeza','manos','piernas'],side:-1,height:.48},
  'Pareja':{color:'#c97eae',route:['pecho','boca','manos'],side:-1,height:.32},
  'Estudios / trabajo':{color:'#8885cf',route:['cabeza','manos','piernas'],side:-1,height:.61},
  'Futuro':{color:'#6d9fc7',route:['cabeza','estomago'],side:1,height:.83},
  'Cuidados':{color:'#7ca885',route:['manos','pecho','piernas'],side:-1,height:.39},
  'Presiones sociales':{color:'#dc6d88',route:['boca','cabeza','pecho'],side:1,height:.63}
};
