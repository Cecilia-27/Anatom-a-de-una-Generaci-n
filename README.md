# Anatomía de una Generación

Experiencia web editorial con Three.js r169, sin instalación de dependencias ni solicitudes a CDN. Todos los recursos están en `dist/`.

## Abrir

Desde esta carpeta: `npm run dev`. Visita http://127.0.0.1:4173. Se necesita un servidor HTTP (no abrir `index.html` con file://) para cargar módulos y el GLB.

## Verificar

`npm run check` valida sintaxis, fidelidad de los datos, rutas, articulaciones y que el GLB servido es idéntico al original.

## Contenido y edición

- `dist/index.html`: estructura, introducción y cierre.
- `dist/styles.css`: composición editorial, responsive y movimiento reducido.
- `dist/data.js`: las seis zonas, datos proporcionados y voces conceptuales.
- `dist/app.js`: escena, animación, hotspots, recorridos, paneles y navegación accesible.
- `dist/assets/titere-articulado.glb`: copia binaria exacta del archivo original. El original en `../titere-3d/` permanece intacto.
- `dist/vendor/`: Three.js r169 y módulos oficiales, incluidos localmente, con su licencia MIT.

## Inspección del GLB

glTF 2.0 · 283040 bytes · 107 nodos · 19 mallas · sin skins, Skeleton ni bones. Contiene `Saludo_demostracion` (4 s), que anima `Cabeza` y `Hombro_D`. El saludo del brazo es demasiado amplio para la intención del proyecto: la introducción reutiliza el canal real de la cabeza atenuado y ralentizado; agrega una secuencia de 10 s en pivotes rígidos reales. No altera geometrías ni estira piezas.

Pivotes utilizados: `Cabeza`, `Torso`, `Cintura`, `Hombro_I/D`, `Codo_I/D`, `Muneca_I/D`, `Dedo_I/D_0..3`, `Pierna_I`, `Rodilla_I`. Los hilos `Hilo_0..4` se recalculan para seguir manos, rodillas y cabeza. Se vuelve a la pose original antes del idle sutil.

## Datos

Encuesta n = 27. Los datos son los proporcionados en el encargo: no se añadieron resultados, recuentos ni asociaciones estadísticas. Las manchas y los hilos son conexiones narrativas, no relaciones causales. «Vacío» se conserva sin reinterpretar. Los pies no constituyen una zona independiente. Los cuatro fragmentos de voces se identifican como ejemplos conceptuales, pendientes de reemplazar por transcripciones verificadas si están disponibles.

## Interacción

Arrastrar horizontalmente, botones ↶/↷ o flechas al enfocar el canvas. Seis hotspots accesibles con Tab/Enter/espacio. Tras descubrir tres zonas se habilita el cierre, sin impedir continuar. `prefers-reduced-motion` elimina la intro, idle, el desplazamiento de las manchas y las animaciones CSS. No hay audio, analítica ni almacenamiento de datos personales.

## Mover el cuerpo

El selector sobre el modelo cambia entre explorar datos y articular. Hay ocho grupos: cabeza, torso, ambos brazos, ambas manos y ambas piernas. Se puede arrastrar una pieza directamente (selección por Raycaster), arrastrar su marcador o seleccionar el grupo y usar sliders accesibles con teclado. Codos, dedos, rodillas y tobillos tienen controles propios dentro del grupo correspondiente. Los ángulos son relativos a la postura original, con límites moderados.

Los movimientos manuales detienen la introducción y el idle para evitar que sobrescriban la postura. Los hilos, hotspots y recorridos siguen las articulaciones. La postura se conserva al cambiar de modo; «Restablecer postura» vuelve a la original. No se alteran vértices ni geometría del GLB. Los pies solo tienen articulación visual dentro de las piernas, sin datos adicionales. `dist/pose.js` contiene los límites y la correspondencia con los nodos reales.

## Portada visual

`dist/cover.css` aplica únicamente a la pantalla inicial mediante `cover-view`: tipografía fucsia, fondo blanco, manchas e indicadores proporcionados en `assets-interaccion`. Los tres SVG originales se incluyen en `dist/assets/portada-*.svg`. Su aplicación se limita a la portada; el estilo de la exploración se define en `dist/explore.css`. Al comenzar o entrar en el modo de movimiento, se restaura el encuadre original de la escena.

## Estilo de la exploración

`dist/explore.css` aplica la identidad blanca y rosa de la portada a la exploración, sus paneles y el modo de movimiento. El título reutiliza los SVG originales a una escala más compacta; las manchas quedan difuminadas detrás del cuerpo. Los colores de zonas, datos y recorridos se conservan. La escena se mantiene visible durante la lectura de paneles largos en desktop. No cambia la lógica ni el contenido de la investigación.

## Visualización de datos por zona

Al elegir una zona, la cámara encuadra su geometría real y después muestra una ventana de cristal. Las sensaciones se presentan en páginas de tres filas con barras horizontales; las flechas permiten consultar todos los valores sin saturar la pantalla. Las barras conservan una escala fija de 0 a 100 %, con etiquetas y valores visibles; no se normalizan a la categoría mayor ni se completan porcentajes faltantes. La tabla ofrece una lectura equivalente para lectores de pantalla.

Las pestañas «Sensaciones» y «Decisión y emociones» separan la pregunta corporal de los demás resultados. Estos últimos se agrupan según su pregunta original: factores de decisión, preocupaciones o emociones. Se navega entre pestañas con flechas, Inicio y Fin. El contenido sigue procediendo de `dist/data.js`; `dist/charts.js` solo añade su presentación y clasificación, y `dist/charts.css` define la gráfica y su adaptación responsive.

No se incorpora la frase de la imagen de referencia como testimonio verificado. Se conservan las voces conceptuales identificadas en la interfaz y las notas que distinguen sensaciones reportadas de causalidad médica.

## Acercamiento y memoria corporal

`dist/focus.js` calcula los encuadres con los bounding boxes de las mallas reales del GLB, siguiendo la postura y el ángulo actuales. Guarda posición y target; mantiene el encuadre durante la lectura y permite articular las piezas, interpola ambos en un segundo con easeInOutCubic y regresa a la vista guardada en 850 ms al cerrar. Mantiene el FOV. En manos se puede elegir cualquiera de los dos lados; comparten los mismos datos. El panel aparece después del acercamiento y cambia de lado cuando hace falta. En móvil se sitúa debajo de la zona visible.

`dist/immersive.css` define el cristal blanco al 74 %, blur de 20 px y transición de 400 ms. Los seis accesos del panel y los hotspots permiten pasar directamente a otra zona, incluso durante un acercamiento, conservando la vista general original. Cerrar, Volver al cuerpo o Escape restablecen la exploración. El teclado recorre el cuerpo y el panel durante la lectura; el foco vuelve al hotspot al cerrar. El movimiento reducido omite la interpolación, los pulsos y el desplazamiento de las manchas.

`dist/pigments.js` genera una textura granular ligera en Canvas y la usa en WebGL. Un máximo de dos factores recorre continuamente sus rutas desde fuera del cuerpo, en ciclos de 5,6 segundos. Un rastro granular más intenso mantiene legible todo el camino durante el acercamiento; las nubes y pequeños granos se desplazan sobre él, dejan huellas junto a los anclajes y conservan los hilos descubiertos con menor intensidad. El botón Pausar manchas congela el flujo y permite reanudarlo sin saltos. El movimiento reducido muestra rutas estáticas. Los diez factores y sus rutas están en `dist/experience.js`, junto con hallazgos limitados a los datos proporcionados. Los residuos siguen las articulaciones y la cámara. No se agregan imágenes pesadas.

El panel solo presenta un testimonio cuando tiene texto, fuente y la marca explícita `verified: true`; actualmente no hay transcripciones verificadas, por lo que no muestra frases ilustrativas como entrevistas reales. Las voces conceptuales siguen identificadas en su sección.

`node scripts/check-focus.mjs` reconstruye la jerarquía y los límites reales del archivo GLB para verificar los encuadres en 360°, escritorio/móvil, ambas manos, paneles laterales, cierre durante el zoom, retorno exacto, movimiento reducido, paginación y rutas.

## Articular y cambiar de zona durante el zoom

En una vista de detalle se pueden arrastrar las piezas del GLB o sus puntos de luz para articularlas; arrastrar el fondo gira la vista alrededor de la zona, con límites de distancia proporcionales al acercamiento. El giro actual se conserva al cambiar de zona y los límites originales se recuperan al cerrar. Un clic sin arrastre sobre otra pieza o hotspot abre su zona correspondiente. El apartado «Mover el cuerpo aquí» conserva los ocho grupos y los mismos límites de articulación de la vista general. Sus controles comparten la postura; no se usan transformaciones de geometría ni estados separados. Tras un movimiento, el encuadre se ajusta suavemente a los nuevos límites reales de la zona sin cerrar ni reiniciar los datos.

Los botones de las seis zonas están visibles en el panel de escritorio; en móvil se presenta un selector compacto. Cambiar de zona interpola desde la cámara actual y mantiene la cámara original para el regreso final, aunque se encadenen varios cambios. Los hotspots fuera del encuadre no interceptan el teclado. El panel no es modal: el cuerpo sigue accesible.
