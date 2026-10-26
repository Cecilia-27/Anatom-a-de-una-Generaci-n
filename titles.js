// Títulos trazados desde Dunbar Low Bold; el texto permanece accesible.
const keys=new Set(['explore','continue','portrait','invitation','cabeza','pecho','estomago','boca','manos','piernas','move','zones','connections']);
export function renderTitle(key,label){
 const text=String(label).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 return keys.has(key)?`<span class="sr-only">${text}</span><img class="dunbar-title" src="./assets/headings/${key}.svg" alt="" aria-hidden="true">`:text;
}
