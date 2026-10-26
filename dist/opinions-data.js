// Textos de entrevista y adaptaciones proporcionados por la autora para esta iteración.
export const voices = [
 {id:'damian',name:'Damian',age:22,stance:'Decidir no tener',short:'No tener',color:'#9f42b2',adapted:false,text:'Hoy tengo claro que no quiero tener hijos.',topics:[
 ['Proyecto de vida','Me gusta construir una vida alrededor del arte, mis amistades y mis proyectos.'],
 ['Expectativas','No creo que deba hacerlo solamente porque se supone que es la siguiente etapa de la vida.'],
 ['Cuidados','Reconocí que yo no quería esa rutina.'],['Emoción','Siento tranquilidad al imaginar una vida sin hijos.'],
 ['Presión familiar','A veces también siento culpa porque sé que algunas personas de mi familia esperan otra cosa.'],
 ['Cuerpo','La tensión aparece en el pecho y en la mandíbula.'],['Autonomía','Necesito que se respete mi autonomía.'],
 ['Reflexión final','No tener hijos no significa no saber cuidar ni querer a nadie.']]},
 {id:'rodrigo',name:'Rodrigo',age:22,stance:'Querer, pero no ahora',short:'No ahora',color:'#ffcb32',adapted:false,text:'Sí me gustaría tener hijos en el futuro, aunque no ahora.',topics:[
 ['Tiempo','No lo veo como algo que deba ocurrir a una edad exacta.'],['Crianza','No quisiera reducir mi papel a pagar gastos.'],
 ['Experiencia','Entendí que implica rutinas, límites y reorganizar prioridades.'],['Emoción','Siento ilusión y ternura, y también nervios.'],
 ['Duda','Querer hijos no me quita esas dudas.'],['Preocupación','Me preocupan la estabilidad económica, el tiempo y el tipo de mundo en el que crecerían.'],
 ['Cuerpo','Los nervios se sienten como un nudo en el estómago.'],['Condiciones','Antes querría contar con vivienda estable, un presupuesto y tiempo disponible para criar.'],
 ['Reflexión final','Querer hijos en el futuro no significa quererlos ahora.']]},
 {id:'fabiola',name:'Fabiola',age:27,stance:'Querer, pero sentirse preparada',short:'Prepararse',color:'#f50046',adapted:true,text:'Quiero tener hijos, pero también me da miedo todo lo que implica.',topics:[
 ['Preparación','Necesito sentirme preparada económica y emocionalmente.'],['Pareja','Para mí sería importante tener una pareja que también quiera compartir la crianza.'],
 ['Emoción','Siento emoción, miedo y felicidad al pensar en tener hijos.'],['Futuro','Me preocupa el medio ambiente y el contexto político y social en el que crecerían.'],
 ['Cuerpo','Cuando hablo del tema más profundamente, siento tensión en el estómago.'],['Familia','Hablar con mi mamá me hizo entender mejor los retos que implica tener un bebé.'],
 ['Tiempo','Preferiría esperar un poco más y sentirme preparada.'],['Trabajo y crianza','Me gustaría que el trabajo facilitara más tiempo para estar presente en la crianza.']]},
 {id:'gabriel',name:'Gabriel',age:21,stance:'Postergar para construir primero',short:'Construir',color:'#3ab4ed',adapted:true,text:'Sí lo imagino, pero todavía lo veo lejos.',topics:[
 ['Preparación','Antes necesito recursos, madurez y un equilibrio entre mi vida laboral y familiar.'],['Carrera','Mi carrera ha aplazado la posibilidad de alcanzar estabilidad e independencia.'],
 ['Emoción','Siento incertidumbre, nervios y también emoción.'],['Responsabilidad','Me preocupa no tener tiempo para estar presente en etapas importantes.'],
 ['Cuerpo','Cuando hablo del tema siento un escalofrío en el estómago, manos sudorosas y tensión en la mandíbula.'],['Familia','Mi familia lo da por hecho y lo menciona constantemente.'],
 ['Proyecto de vida','Mi carrera, mis ingresos y mi vida de pareja todavía no serían compatibles con esa decisión.'],
 ['Reflexión final','No siento que tener hijos tenga que ocurrir inmediatamente después de terminar la carrera o casarse.']]}
];
export function opinionSource(voice){return `${voice.name}, ${voice.age} años · ${voice.adapted?'frase adaptada de entrevista':'fragmento de entrevista'} · texto proporcionado`;}
