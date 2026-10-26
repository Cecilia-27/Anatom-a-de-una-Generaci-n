# Anatomía de una Generación

Experiencia editorial con Three.js r169 y recursos locales en `dist/`, sin CDN ni instalación de dependencias.

## Abrir y verificar

`npm run dev` sirve http://127.0.0.1:4173. Abrir mediante HTTP, no con file://. `npm run check` valida la sintaxis, el GLB original, los datos, los encuadres, las articulaciones, la gráfica y los gestos del módulo OrbitControls.

## Escena existente

El archivo servido `dist/assets/titere-articulado.glb` es una copia binaria exacta de `../titere-3d/titere-articulado.glb`. glTF 2.0, 283040 bytes, 107 nodos y 19 mallas, sin skins ni bones. Contiene `Saludo_demostracion` de 4 segundos. La introducción reutiliza su canal real de cabeza y añade movimientos suaves de pivotes rígidos. No se modifican vértices ni geometrías.

`dist/app.js` carga el modelo con GLTFLoader, configura OrbitControls y mantiene los hotspots, la memoria, la navegación y las articulaciones. `dist/pose.js` conserva los ocho grupos articulables y sus límites. Los hilos se actualizan con la postura; manos y rodillas siguen sus anclajes reales.

## Presentación y navegación

La portada conserva sus SVG originales y `cover.css`. `editorial.css` adapta la exploración: navegación izquierda, escena central y lectura derecha. El modelo permanece visible al leer en escritorio. En tablet y móvil aparece antes del panel, sin desbordamiento horizontal de página.

Los cinco botones inferiores llaman a la misma función `selectZone` de los hotspots: Cabeza, Pecho, Estómago, Manos y Piernas. Boca sigue disponible como recorrido complementario. Se conservan las seis zonas visitadas y el progreso; tras tres se habilita la vista de conexiones.

El panel presenta título editorial, subtítulo, descripción, voz identificada, gráfica y acceso a las articulaciones. La frase del boceto y las voces conceptuales se identifican explícitamente; no se presentan como entrevistas verificadas. Una transcripción requiere texto, fuente y `verified: true`.

## Datos y visualización

`dist/data.js` es la fuente de porcentajes, muestra, contenidos y paletas. Encuesta n = 27. No se completan las distribuciones ni se agregan datos. «Vacío» se conserva como categoría original. Las sensaciones son reportes subjetivos, sin afirmar relaciones médicas. Los pies no tienen un resultado independiente.

`dist/organic-chart.js` ofrece `renderZoneChart(zone)`: todas las sensaciones de una zona se muestran como columnas de pigmento, puntos y trazos, con una escala lineal de 0 a 100 %. La altura es exactamente porcentaje/100 × 240 px. Un clip limita las marcas a esa altura. La semilla depende de la zona y de la sensación, por lo que la textura no cambia entre renderizados. Las marcas son textura, no recuentos de personas; una tabla desplegable ofrece todos los valores en texto.

Los porcentajes aparecen encima y los nombres se leen verticalmente debajo de cada columna. Cada zona usa una familia cromática. Las columnas bajan al cambiar de capítulo y crecen desde la base al abrir el siguiente, con transición de 700 ms. `prefers-reduced-motion` omite el movimiento.

`dist/charts.js` mantiene los resultados de otras preguntas en «Decisión y emociones», separados según su pregunta original. `dist/zone-icons.js` dibuja los iconos locales de las zonas.

## Cámara y controles

Arrastrar horizontalmente gira la vista 360°, con damping y límite vertical. Los botones y las flechas del teclado son equivalentes. El scroll y trackpad controlan el zoom; el pinch usa los eventos originales de OrbitControls. Los límites se calculan a partir de la altura real del GLB.

`dist/focus.js` calcula cada encuadre desde los bounding boxes reales de las mallas y la dirección actual. Interpola posición y target en un segundo, sin cambiar FOV. Se puede cambiar directamente entre zonas y continuar girando o haciendo zoom tras el acercamiento. Las articulaciones se controlan mediante el mouse o los controles accesibles; en touch el canvas reserva los gestos a OrbitControls.

«Volver al cuerpo» devuelve suavemente el encuadre completo y la postura neutral, conservando el progreso. El cierre × conserva la pose como en la interacción anterior. Escape permite cerrar; el panel es una región no modal y la navegación de la página sigue disponible.

## Pigmentos y conexiones

`dist/pigments.js` genera su textura granular en Canvas y la dibuja en WebGL. Un máximo de dos factores viaja por rutas narrativas en ciclos de 5,6 segundos, deja huellas y conserva conexiones suaves. Las nubes se sitúan detrás del cuerpo y los hotspots no interceptan las interacciones. «Pausar manchas» congela el flujo decorativo, sin detener cámara, zoom, articulaciones ni navegación. El movimiento reducido muestra recorridos estáticos.

`dist/experience.js` contiene las asociaciones narrativas de los diez factores y hallazgos limitados a los porcentajes proporcionados. No son asociaciones estadísticas ni mecanismos fisiológicos.

## Verificación

Los scripts comprueban identidad binaria del GLB, articulaciones reales, límites, datos exactos, encuadres en 360°, cambio directo durante el zoom, retorno completo, movimiento reducido, alturas verticales, marcas contenidas, semillas estables y memoria acotada. Se ejecuta el módulo OrbitControls original con eventos de scroll, trackpad y dos dedos para verificar pinch in/out y giro táctil. Esa prueba por eventos no sustituye una comprobación física en una pantalla táctil.

No hay audio automático, analítica ni almacenamiento de datos personales. Three.js se distribuye localmente con su licencia MIT en `dist/vendor/`.
