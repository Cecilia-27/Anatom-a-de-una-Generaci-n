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

Encuesta n = 27. Los datos son los proporcionados en el encargo: no se añadieron resultados, recuentos ni asociaciones estadísticas. Las líneas son conexiones narrativas, no relaciones causales. «Vacío» se conserva sin reinterpretar. Los pies no constituyen una zona independiente. Los cuatro fragmentos de voces se identifican como ejemplos conceptuales, pendientes de reemplazar por transcripciones verificadas si están disponibles.

## Interacción

Arrastrar horizontalmente, botones ↶/↷ o flechas al enfocar el canvas. Seis hotspots accesibles con Tab/Enter/espacio. Tras descubrir tres zonas se habilita el cierre, sin impedir continuar. `prefers-reduced-motion` elimina la intro, idle, partículas de recorrido y animaciones CSS. No hay audio, analítica ni almacenamiento de datos personales.

## Mover el cuerpo

El selector sobre el modelo cambia entre explorar datos y articular. Hay ocho grupos: cabeza, torso, ambos brazos, ambas manos y ambas piernas. Se puede arrastrar una pieza directamente (selección por Raycaster), arrastrar su marcador o seleccionar el grupo y usar sliders accesibles con teclado. Codos, dedos, rodillas y tobillos tienen controles propios dentro del grupo correspondiente. Los ángulos son relativos a la postura original, con límites moderados.

Los movimientos manuales detienen la introducción y el idle para evitar que sobrescriban la postura. Los hilos, hotspots y recorridos siguen las articulaciones. La postura se conserva al cambiar de modo; «Restablecer postura» vuelve a la original. No se alteran vértices ni geometría del GLB. Los pies solo tienen articulación visual dentro de las piernas, sin datos adicionales. `dist/pose.js` contiene los límites y la correspondencia con los nodos reales.
