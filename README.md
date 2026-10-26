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

`dist/organic-chart.js` ofrece `renderZoneChart(zone)` y `organicBubbles(zone)`: todas las sensaciones aparecen como círculos sobre un paisaje de manchas. El área representa el porcentaje con una escala común: radio = 95 × raíz(porcentaje/100). La semilla depende de la zona y de la sensación, por lo que la textura no cambia entre renderizados. Las gotas son textura, no recuentos de personas; una descripción accesible y una tabla desplegable ofrecen todos los valores en texto.

Los porcentajes permanecen dentro de los círculos y los nombres se leen en horizontal. Cada zona usa una familia cromática. `ink-map.css` integra el título Dunbar, el fondo de pigmento y el hallazgo, sin ejes ni tarjetas individuales. Los pigmentos aparecen progresivamente al cambiar de capítulo; `prefers-reduced-motion` omite el movimiento.

`dist/charts.js` mantiene los resultados de otras preguntas en «Decisión y emociones», separados según su pregunta original. `dist/zone-icons.js` dibuja los iconos locales de las zonas.

## Cámara y controles

Arrastrar horizontalmente gira la vista 360°, con damping y límite vertical. Los botones y las flechas del teclado son equivalentes. El scroll y trackpad controlan el zoom; el pinch usa los eventos originales de OrbitControls. Los límites se calculan a partir de la altura real del GLB.

`dist/focus.js` calcula cada encuadre desde los bounding boxes reales de las mallas y la dirección actual. Interpola posición y target en un segundo, sin cambiar FOV. Se puede cambiar directamente entre zonas y continuar girando o haciendo zoom tras el acercamiento. Las articulaciones se controlan mediante el mouse o los controles accesibles; en touch el canvas reserva los gestos a OrbitControls.

«Volver al cuerpo» devuelve suavemente el encuadre completo y la postura neutral, conservando el progreso. El cierre × conserva la pose como en la interacción anterior. Escape permite cerrar; el panel es una región no modal y la navegación de la página sigue disponible.

## Pigmentos y conexiones

`dist/pigments.js` genera su textura granular en Canvas y la dibuja en WebGL. Un máximo de dos factores viaja por rutas narrativas en ciclos de 5,6 segundos, deja huellas y conserva conexiones suaves. Las nubes se sitúan detrás del cuerpo y los hotspots no interceptan las interacciones. «Pausar manchas» congela el flujo decorativo, sin detener cámara, zoom, articulaciones ni navegación. El movimiento reducido muestra recorridos estáticos.

`dist/experience.js` contiene las asociaciones narrativas de los diez factores y hallazgos limitados a los porcentajes proporcionados. No son asociaciones estadísticas ni mecanismos fisiológicos.

## Verificación

Los scripts comprueban identidad binaria del GLB, articulaciones reales, límites, datos exactos, encuadres en 360°, cambio directo durante el zoom, retorno completo, movimiento reducido, áreas proporcionales, círculos sin recortes, semillas estables y memoria acotada. Se ejecuta el módulo OrbitControls original con eventos de scroll, trackpad y dos dedos para verificar pinch in/out y giro táctil. Esa prueba por eventos no sustituye una comprobación física en una pantalla táctil.

No hay audio automático, analítica ni almacenamiento de datos personales. Three.js se distribuye localmente con su licencia MIT en `dist/vendor/`.

### Portada y tipografía

La portada utiliza los trazados del título y subtítulo originales de `assets-interaccion`, con el título en dos líneas y “de una” junto a ANATOMÍA. No se simula Dunbar con otra fuente. Los párrafos usan League Spartan Regular, servida localmente; los controles disponen de los pesos SemiBold y Bold de la misma familia. Las manchas de la portada se animan mediante transformaciones lentas en capas detrás del modelo. El botón existente de pausa también las detiene y `prefers-reduced-motion` elimina esos movimientos.

La portada oculta el selector Explorar datos/Mover el cuerpo; ambos modos siguen disponibles después de comenzar. La introducción dura 14 segundos y amplía los movimientos de los pivotes rígidos, seguida de una oscilación lenta con entrada gradual. Las ventanas de opiniones y proyecto comparten la identidad rosa y League Spartan, con desplazamiento interior accesible, cierre fijo y el título original trazado en la ventana del proyecto.

### Continuidad en la exploración

`motion.js` combina una capa de movimiento ambiental con los ángulos manuales de `pose.js`, sin modificar los valores elegidos por la persona. Las articulaciones conservan sus límites, el movimiento se atenúa al arrastrar o viajar con la cámara y continúa suavemente dentro de una zona. Se elimina con movimiento reducido. `check-motion.mjs` comprueba continuidad temporal, postura intacta y límites.

`exploration.css` conserva el layout y las gráficas existentes, y continúa la identidad de la portada: blanco, rosa, League Spartan Regular para lectura y peso SemiBold para títulos y controles activos. Las fuentes, tamaños y contrastes se adaptan a la función de cada texto y al ancho disponible.

### Referencia de la segunda pantalla

`reference.css` adapta la pantalla al nuevo boceto: marcador 02, recorrido lateral de manchas, relato abajo a la izquierda, cuerpo central y lectura a la derecha. Los títulos fijos son trazados reales de Dunbar Low Bold, exportados por `scripts/export-titles.py` desde la fuente local, sin distribuir el archivo de fuente. `titles.js` conserva el texto accesible de cada encabezado. Los párrafos mantienen League Spartan Regular.

Los cuatro SVG originales de manchas (morado, amarillo, azul y rosa) se reutilizan alrededor de los hotspots existentes. Los colores de zonas, recorridos y gráficas se coordinan con esa paleta; las manchas pulsan suavemente, responden a la pausa y se detienen con movimiento reducido. Las cifras y rutas narrativas no cambian. Los porcentajes usan una variante oscura de su color para conservar legibilidad.

### Navegación y continuidad visual

Las tres manchas laterales son botones fijos para Portada, Exploración y Zonas del cuerpo. Comparten posición y tamaño entre vistas; volver a la portada no recarga la página ni borra visitas, conexiones o postura. La zona de dibujo (`scene-canvas`) tiene márgenes más amplios y un borde difuso; el área de interacción (`body-canvas`) conserva su encuadre. `viewport.js` transforma las coordenadas de puntos y selección, con pruebas de proyección y rayos en `check-viewport.mjs`. La sombra se calcula con un área proporcional al tamaño real del GLB.

Los controles están debajo del visor en flujo normal. El encabezado reserva espacio para su frase y el panel de datos mantiene desplazamiento normal. Los factores y etiquetas ajustan su posición y pueden envolver texto. Las manchas conservan sus tonos con menor intensidad; la pausa sigue afectando solo al ambiente.
