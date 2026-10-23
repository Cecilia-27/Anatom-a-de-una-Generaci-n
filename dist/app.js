import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { zones, voices, factorPositions } from './data.js';

const $ = (s) => document.querySelector(s);
const zoneIds = Object.keys(zones);
const state = {started:false, selected:null, visited:new Set(), edges:new Map(), closing:false, voice:0, quoteExpanded:false};
const media = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = media.matches;
const announce = (message) => { $('#announcement').textContent = message; };
const dialog = $('#info-dialog');
let lastFocus;
function openDialog(html){lastFocus=document.activeElement;$('#dialog-content').innerHTML=html;dialog.showModal();dialog.querySelector('.dialog-close').focus();}
function closeDialog(){dialog.close();lastFocus?.focus();}
$('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('click',(e)=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
dialog.addEventListener('cancel',()=>{requestAnimationFrame(()=>lastFocus?.focus());});

function showSources(){openDialog(`<p class="dialog-eyebrow">ACERCA DE LOS DATOS</p><h2>Escuchar lo que<br>el cuerpo cuenta.</h2><p>Esta experiencia presenta los resultados proporcionados de una encuesta de <strong>27 personas</strong> sobre la decisión de tener, postergar o no tener hijos.</p><h3>Cómo leer los porcentajes</h3><p>Los factores, preocupaciones y emociones corresponden a las opciones reportadas en la encuesta. Se presentan de forma independiente y no deben sumarse como una distribución de la población. La muestra describe a las personas participantes; no representa a toda la Generación Z.</p><h3>Sensaciones, sin interpretaciones médicas</h3><p>Los porcentajes corporales son <strong>sensaciones reportadas en la encuesta</strong>. No prueban que una emoción cause un síntoma en una parte del cuerpo. «Vacío» se conserva como categoría original, sin asignarle una interpretación adicional. Se muestran únicamente las categorías y porcentajes proporcionados, sin completar las distribuciones.</p><p>Las líneas que conectan zonas son recorridos narrativos de exploración, no relaciones estadísticas ni mecanismos fisiológicos. Los pies no tienen un dato independiente.</p><h3>Las voces</h3><p>Los cuatro comentarios están identificados como <strong>ejemplos conceptuales proporcionados</strong>. No se presentan como transcripciones verificadas de entrevistas.</p>`);}
$('#sources').addEventListener('click',showSources);
$('#nav-about').addEventListener('click',()=>openDialog(`<p class="dialog-eyebrow">SOBRE EL PROYECTO</p><h2>Anatomía de<br>una Generación.</h2><p>Una decisión que atraviesa el cuerpo.</p><p>Una exploración interactiva sobre cómo la Generación Z vive la decisión de tener, postergar o no tener hijos. Emociones, presiones sociales, economía y proyectos personales se encuentran alrededor de un mismo cuerpo.</p><div class="about-marks"><span>Visualización de datos</span><span>Narrativa generacional</span><span>Exploración 3D</span></div><h3>Cómo explorar</h3><p>Comienza el recorrido y elige una de las seis zonas. Arrastra el títere horizontalmente para girarlo, usa los botones ↶ / ↷ o las flechas del teclado al enfocar el modelo. Con Tab puedes recorrer los puntos; con Enter o espacio abrir sus datos.</p><p>Tras descubrir tres zonas podrás ver una vista conjunta y continuar explorando. El movimiento se reduce automáticamente si tu dispositivo así lo solicita.</p><p class="source-note">Modelo original: titere-articulado.glb · encuesta, n = 27.</p>`));
function voiceContent(){const v=voices[state.voice];return `<p class="dialog-eyebrow">LAS VOCES · ${v.stance.toUpperCase()}</p><h2>Hay muchas formas<br>de imaginarlo.</h2><blockquote class="voice-quote">“${v.text}”</blockquote><div class="voice-name" style="--voice-color:${v.color}">${v.name}</div><div class="voice-controls"><button class="round-button" data-voice-step="-1" aria-label="Voz anterior">←</button><span>${state.voice+1} / ${voices.length}</span><button class="round-button" data-voice-step="1" aria-label="Siguiente voz">→</button></div><p class="voice-disclaimer">Ejemplo conceptual proporcionado para el prototipo. No es una transcripción verificada de entrevista.</p>`;}
function showVoices(index=state.voice){state.voice=index;openDialog(voiceContent());}
$('#nav-voices').addEventListener('click',()=>showVoices());
$('#dialog-content').addEventListener('click',(e)=>{const b=e.target.closest('[data-voice-step]');if(!b)return;state.voice=(state.voice+Number(b.dataset.voiceStep)+voices.length)%voices.length;$('#dialog-content').innerHTML=voiceContent();$('#dialog-content').querySelector(`[data-voice-step="${b.dataset.voiceStep}"]`).focus();});

const stage = $('#stage'), canvas = $('#body-canvas');
let renderer, controls, model, mixer, introAction, introStart=0, startTime=0, lastTime=0, ready=false;
let rotating=0, dragged=false, pointerStart=null, failed=false;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32,1,.1,80);
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const baseRotations = new Map(), joints = new Map(), hotspotObjects = new Map();
const world = new THREE.Vector3(), projected = new THREE.Vector3();
const helperQ = new THREE.Quaternion(), helperE = new THREE.Euler();
const zAxis = new THREE.Vector3(0,1,0);
const target = new THREE.Vector3(0,2.65,0);
const anchorDefinitions = {
  cabeza:['Cabeza',[0,.45,.275]], boca:['Cabeza',[0,.12,.28]],
  pecho:['Torso',[0,.64,.29]], estomago:['Torso',[0,.18,.23]],
  manos:['Muneca_I',[0,-.13,.10]], piernas:['Pierna_D',[0,-.62,.15]]
};
const strings=[['Muneca_I',[0,-.09,0],[.62,5.2,0],'Hilo_0'],['Rodilla_I',[0,0,.07],[.26,5.2,.28],'Hilo_1'],['Muneca_D',[0,-.09,0],[-.62,5.2,0],'Hilo_2'],['Rodilla_D',[0,0,.07],[-.26,5.2,.28],'Hilo_3'],['Cabeza',[0,.70,0],[0,5.2,0],'Hilo_4']];
const stringEnd=new THREE.Vector3(),stringTop=new THREE.Vector3(),stringDir=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),inverse=new THREE.Matrix4();

function onModelError(error){failed=true;ready=false;console.error('No se pudo abrir el títere:',error);$('#stage-status').hidden=false;$('#stage-status').classList.add('error');$('#stage-status').innerHTML='No pudimos mostrar el cuerpo en 3D.<br>Comprueba que WebGL esté disponible.<br><button id="retry">Volver a intentar</button>';$('#retry').onclick=()=>location.reload();$('#start').textContent='Explorar los datos →';$('#start').disabled=false;announce('El modelo no está disponible. Puedes explorar los datos con los controles por zona.');}
try {
  renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000000,0);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
  scene.add(new THREE.HemisphereLight(0xfff8e9,0x8b927d,2.6));
  const key=new THREE.DirectionalLight(0xffeedb,3.6);key.position.set(4,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-4,right:4,top:6,bottom:-3});key.shadow.normalBias=.025;scene.add(key);
  const fill=new THREE.DirectionalLight(0xffffff,1.6);fill.position.set(-4,4,-3);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.09}));floor.rotation.x=-Math.PI/2;floor.position.y=.08;floor.receiveShadow=true;scene.add(floor);
  camera.position.set(.65,2.93,12.1);
  controls=new OrbitControls(camera,canvas);controls.target.copy(target);controls.enableDamping=!reduced;controls.dampingFactor=.075;controls.enablePan=false;controls.rotateSpeed=.52;controls.minPolarAngle=Math.PI/2-.025;controls.maxPolarAngle=Math.PI/2-.025;controls.minDistance=11.65;controls.maxDistance=13.1;controls.zoomSpeed=.35;controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};controls.update();
  controls.addEventListener('start',()=>{canvas.classList.add('dragging');rotating=0;});
  controls.addEventListener('end',()=>canvas.classList.remove('dragging'));
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  new ResizeObserver(resize).observe(stage);resize();
  new GLTFLoader().load('./assets/titere-articulado.glb',initModel,undefined,onModelError);
  canvas.addEventListener('webglcontextlost',(e)=>{e.preventDefault();onModelError(new Error('Se perdió el contexto WebGL'));});
} catch(error){onModelError(error);}

function initModel(gltf){
  model=gltf.scene;scene.add(model);
  model.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();}if(o.name){joints.set(o.name,o);baseRotations.set(o.name,o.quaternion.clone());}});
  const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o.name);});
  console.info('GLB inspeccionado',{bones,clips:gltf.animations.map(c=>c.name),articulaciones:[...joints.keys()].filter(n=>/^(Cabeza|Torso|Cintura|Hombro|Codo|Muneca|Dedo|Pierna|Rodilla)/.test(n))});
  makeHotspots();createIntro(gltf.animations);ready=true;introStart=performance.now()/1000;startTime=introStart;
  $('#stage-status').hidden=true;document.body.classList.add('model-ready');$('#start').disabled=false;$('#start').innerHTML='Comenzar <span aria-hidden="true">→</span>';
  requestAnimationFrame(frame);
}

function createIntro(clips){
  // El archivo no tiene Skeleton: animamos pivotes rígidos, sin alterar vértices.
  const duration=10,tracks=[];
  const headTrack=clips.flatMap(c=>c.tracks).find(t=>t.name==='Cabeza.quaternion');
  if(headTrack){const qbase=baseRotations.get('Cabeza'),q=new THREE.Quaternion(),values=[];for(let i=0;i<headTrack.values.length;i+=4){q.fromArray(headTrack.values,i);qbase.clone().slerp(q,.22).toArray(values,values.length);}tracks.push(new THREE.QuaternionKeyframeTrack(headTrack.name,Array.from(headTrack.times,t=>t*duration/headTrack.times[headTrack.times.length-1]),values,THREE.InterpolateLinear));}
  const motions=[['Hombro_I',1.2,[.035,0,.075]],['Hombro_D',1.7,[-.03,0,-.065]],['Codo_I',2.1,[-.1,0,0]],['Codo_D',2.3,[-.08,0,0]],['Muneca_I',3,[.08,0,.06]],['Muneca_D',3.2,[.07,0,-.04]],['Torso',4,[.025,.035,0]],['Cintura',4.2,[0,.035,.012]],['Pierna_I',5.2,[-.04,0,.012]],['Rodilla_I',5.3,[.065,0,0]]];
  for(const side of ['I','D'])for(let f=0;f<4;f++)motions.push([`Dedo_${side}_${f}`,3.1+f*.12,[.12,0,0]]);
  for(const [name,delay,angles] of motions){if(!joints.has(name))continue;const base=baseRotations.get(name),values=[],times=[];for(let i=0;i<=100;i++){const t=i*duration/100;const phase=(t-delay)/2.7;const w=phase>0&&phase<1?Math.sin(Math.PI*phase)**2:0;times.push(t);helperE.set(...angles.map(a=>a*w));helperQ.setFromEuler(helperE);base.clone().multiply(helperQ).toArray(values,values.length);}tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`,times,values,THREE.InterpolateLinear));}
  mixer=new THREE.AnimationMixer(model);introAction=mixer.clipAction(new THREE.AnimationClip('Despertar_sutil',duration,tracks));introAction.setLoop(THREE.LoopOnce,1);introAction.clampWhenFinished=true;if(!reduced)introAction.play();
}

function makeHotspots(){
  for(const [id,[name,offset]] of Object.entries(anchorDefinitions)){
    const joint=joints.get(name);if(!joint)continue;
    const anchor=new THREE.Object3D();anchor.position.fromArray(offset);joint.add(anchor);
    const hit=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),new THREE.MeshBasicMaterial({visible:false}));hit.userData.zone=id;anchor.add(hit);
    const el=document.createElement('button');el.type='button';el.className='hotspot';el.style.setProperty('--zone-color',zones[id].color);el.setAttribute('aria-label',`Explorar ${zones[id].name}`);el.setAttribute('aria-pressed','false');el.innerHTML=`<span class="hotspot-core"><b></b></span><span class="hotspot-label">${zones[id].symbol} ${zones[id].name}</span>`;el.hidden=true;el.addEventListener('click',()=>selectZone(id));$('#hotspots').append(el);
    hotspotObjects.set(id,{anchor,hit,el,position:new THREE.Vector3(),screen:{x:0,y:0}});
  }
}

function begin(){
  if(state.started){if(state.closing)resume();else $('#hotspots').querySelector('button')?.focus();return;}
  state.started=true;document.body.classList.add('exploring');$('#intro-copy').hidden=true;$('#explore-copy').hidden=false;$('#start').hidden=true;$('#journey').hidden=false;$('#chapter-number').textContent='02 / 03';$('#chapter-label').textContent='Descubrir lo que nos atraviesa';
  if(failed)makeFallback();
  hotspotObjects.forEach(({el},i)=>{el.hidden=false;el.style.animationDelay=`${i*.12}s`;});
  $('#welcome-panel').innerHTML=`<p class="small-label">EL CUERPO COMO MAPA</p><h2>Comienza donde<br>algo te haga sentir.</h2><p>Selecciona uno de los seis puntos para descubrir sensaciones, preguntas y conexiones.</p><div class="color-key">${zoneIds.map(id=>`<span><i style="--c:${zones[id].color}"></i>${zones[id].symbol} ${zones[id].name}</span>`).join('')}</div><p class="sample-note">Sensaciones reportadas · encuesta, n = 27<br>Cada zona abre una parte de la historia.</p>`;
  announce('Exploración iniciada. Seis zonas disponibles. Selecciona un punto del cuerpo.');
  const first=hotspotObjects.get('cabeza')?.el;first?.focus({preventScroll:true});
}
$('#start').addEventListener('click',begin);$('#nav-explore').addEventListener('click',()=>{if(!state.started)$('#start').focus();else{resume();hotspotObjects.get(state.selected||'cabeza')?.el.focus({preventScroll:true});}});

function selectZone(id){
  if(!state.started)begin();state.closing=false;state.selected=id;state.visited.add(id);state.quoteExpanded=false;
  const z=zones[id];document.documentElement.style.setProperty('--selected-color',z.color);
  $('#welcome-panel').hidden=true;$('#closing-panel').hidden=true;$('#zone-panel').hidden=false;
  renderZone(id);revealFactors(z);discoverRoute(z.route,z.color);
  hotspotObjects.forEach(({el},key)=>{el.classList.toggle('dim',key!==id);el.classList.toggle('seen',state.visited.has(key));el.setAttribute('aria-pressed',String(key===id));});
  highlightZone(id);updateProgress();announce(`${z.name}. ${z.sensations[0][1]} por ciento reportó ${z.sensations[0][0].toLowerCase()}. ${state.visited.size} de 6 zonas exploradas.`);
}

function renderZone(id){
  const z=zones[id],v=voices[z.quote],panel=$('#zone-panel');
  panel.innerHTML=`<div class="zone-heading"><span class="zone-symbol" aria-hidden="true">${z.symbol}</span><div><p class="small-label">${z.theme.toUpperCase()}</p><h2>${z.name}</h2></div></div><h3 class="zone-question" style="font-family:var(--serif);font-weight:400">${z.question}</h3><p class="zone-caption">${z.description}</p><div class="body-stat"><strong>${z.sensations[0][1]}<span> %</span></strong><span>reportó <b>«${z.sensations[0][0].toLowerCase()}»</b><br>en ${id==='pecho'?'el pecho':id==='manos'?'las manos':id==='piernas'?'las piernas':id==='cabeza'?'la cabeza':id==='boca'?'la boca':'el estómago'}.</span></div><p class="source-note">Sensación reportada en la encuesta · n = 27</p><details class="sensations-details"><summary>Ver todas las sensaciones de esta zona</summary>${z.sensations.map(([name,value])=>`<div class="sensation-row"><span>${name}</span><span>${value} %</span><div class="sensation-bar"><i style="--value:${value}%"></i></div></div>`).join('')}<p class="source-note">Categorías proporcionadas, sin completar la distribución. No son afirmaciones médicas.</p></details><div class="stats-list">${z.stats.map(([pct,text])=>`<div class="stat-row"><strong>${pct} %</strong><span>${text}</span></div>`).join('')}</div><p class="finding">${z.finding}</p><button class="quote-bubble" id="quote-toggle" aria-expanded="false"><span class="quote-top"><span>UNA VOZ · ${v.name}</span><span id="quote-sign">＋</span></span><span class="quote-text">“${v.text}”</span><span class="quote-caption" id="quote-caption" hidden>${v.stance}. Ejemplo conceptual proporcionado para el prototipo; no es una transcripción verificada.</span></button><p class="source-note">Voz: ejemplo conceptual proporcionado.</p><button class="text-button zone-next" id="next-zone"><span>Siguiente zona · ${zones[zoneIds[(zoneIds.indexOf(id)+1)%zoneIds.length]].name}</span><span>→</span></button>`;
  panel.style.animation='none';void panel.offsetWidth;panel.style.animation='';
  $('#quote-toggle').onclick=()=>{state.quoteExpanded=!state.quoteExpanded;$('#quote-toggle').setAttribute('aria-expanded',String(state.quoteExpanded));$('#quote-caption').hidden=!state.quoteExpanded;$('#quote-sign').textContent=state.quoteExpanded?'−':'＋';};
  $('#next-zone').onclick=()=>{const next=zoneIds[(zoneIds.indexOf(id)+1)%zoneIds.length];selectZone(next);hotspotObjects.get(next)?.el.focus({preventScroll:true});};
}

function revealFactors(z){
  for(const label of z.factors){if([...$('#factors').children].some(el=>el.textContent===label))continue;const n=$('#factors').children.length,[left,top]=factorPositions[n%factorPositions.length];const el=document.createElement('span');el.className='factor';el.textContent=label;el.style.cssText=`--factor-left:${left}%;top:${top}%;--factor-color:${z.color};--tilt:${n%2?5:-5}deg;transition-delay:${reduced?0:n%2*.15}s`;$('#factors').append(el);requestAnimationFrame(()=>el.classList.add('visible'));}
}
function updateProgress(){const n=state.visited.size;$('#progress-text').textContent=`${n} de 6 zonas`;$('#progress-bar').style.width=`${n/6*100}%`;$('#conclusion').hidden=n<3;if(n===6)$('#conclusion').textContent='Ver el cuerpo conectado ↗';}
function highlightZone(id){if(!model)return;const patterns={cabeza:/^Cabeza_madera|^Oreja/,boca:/^Cabeza_madera/,pecho:/^Torso_madera/,estomago:/^Torso_madera|^Union_cintura/,manos:/^Palma|^Falange|^Pulgar_madera/,piernas:/^Muslo|^Pantorrilla/};model.traverse(o=>{if(o.isMesh&&o.material.emissive){const active=id&&patterns[id].test(o.name);o.material.emissive.set(active?zones[id].color:0x000000);o.material.emissiveIntensity=active?.10:0;}});}

function discoverRoute(route,color){
  if(!ready)return;
  const timestamp=performance.now()/1000;
  for(let i=0;i<route.length-1;i++){const from=route[i],to=route[i+1],key=[from,to].sort().join(':');let edge=state.edges.get(key);if(edge){edge.started=timestamp+i*.7;edge.active=true;continue;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(49*3),3));geometry.setDrawRange(0,0);
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color,transparent:true,opacity:.65,depthTest:false}));line.renderOrder=3;line.frustumCulled=false;scene.add(line);
    const light=new THREE.Mesh(new THREE.SphereGeometry(.027,8,8),new THREE.MeshBasicMaterial({color,depthTest:false,transparent:true,opacity:.95}));light.renderOrder=4;scene.add(light);
    const glowGeometry=new THREE.BufferGeometry();glowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(49*2*3),3));const indices=[];for(let j=0;j<48;j++){const k=j*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}glowGeometry.setIndex(indices);glowGeometry.setDrawRange(0,0);const glow=new THREE.Mesh(glowGeometry,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.22,depthTest:false,side:THREE.DoubleSide}));glow.renderOrder=3;glow.frustumCulled=false;scene.add(glow);state.edges.set(key,{from,to,line,glow,light,started:timestamp+i*.7,active:true,points:[]});
  }
}
function updateEdges(time){
  for(const edge of state.edges.values()){
    const a=hotspotObjects.get(edge.from)?.position,b=hotspotObjects.get(edge.to)?.position;if(!a||!b)continue;
    const mid=a.clone().lerp(b,.5);mid.z+=.22;mid.x+=.07;const curve=new THREE.QuadraticBezierCurve3(a,mid,b);const positions=edge.line.geometry.attributes.position;
    for(let i=0;i<49;i++){const p=curve.getPoint(i/48);positions.setXYZ(i,p.x,p.y,p.z);const tangent=curve.getTangent(i/48),view=camera.position.clone().sub(p).normalize(),side=new THREE.Vector3().crossVectors(tangent,view).normalize().multiplyScalar(.016);const g=edge.glow.geometry.attributes.position;g.setXYZ(i*2,p.x+side.x,p.y+side.y,p.z+side.z);g.setXYZ(i*2+1,p.x-side.x,p.y-side.y,p.z-side.z);}positions.needsUpdate=true;edge.glow.geometry.attributes.position.needsUpdate=true;
    const elapsed=time-edge.started,progress=reduced?1:THREE.MathUtils.clamp(elapsed/1.3,0,1);edge.line.geometry.setDrawRange(0,Math.max(0,Math.floor(progress*49)));
    edge.glow.geometry.setDrawRange(0,Math.floor(progress*48)*6);edge.glow.material.opacity=state.closing?.32:.18;edge.line.material.opacity=state.closing?.95:edge.active?.85:.55;
    edge.light.visible=!reduced&&elapsed>0&&elapsed<2.4&&!state.closing;
    if(edge.light.visible)edge.light.position.copy(curve.getPoint(THREE.MathUtils.clamp(elapsed/2.4,0,1)));
    if(elapsed>2.4)edge.active=false;
  }
}
function showConclusion(){if(state.visited.size<3)return;state.closing=true;$('#zone-panel').hidden=true;$('#welcome-panel').hidden=true;$('#closing-panel').hidden=false;$('#chapter-number').textContent='03 / 03';$('#chapter-label').textContent='Distintas partes, una misma decisión';hotspotObjects.forEach(({el})=>el.classList.remove('dim'));highlightZone(null);announce('Vista general. Distintas partes, una misma decisión. Tus conexiones permanecen visibles.');if(innerWidth<=850)$('#closing-panel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}
function resume(){state.closing=false;$('#chapter-number').textContent=state.started?'02 / 03':'01 / 03';$('#chapter-label').textContent='Descubrir lo que nos atraviesa';$('#closing-panel').hidden=true;if(state.selected)selectZone(state.selected);else $('#welcome-panel').hidden=false;}
$('#conclusion').onclick=showConclusion;$('#continue').onclick=resume;

function rotate(amount){if(!controls)return;rotating+=amount;announce(amount<0?'Girando a la izquierda.':'Girando a la derecha.');}
$('#rotate-left').onclick=()=>rotate(-Math.PI/6);$('#rotate-right').onclick=()=>rotate(Math.PI/6);
$('#reset-view').onclick=()=>{if(!controls)return;rotating=0;camera.position.set(.65,2.93,12.1);controls.target.copy(target);controls.update();announce('Vista inicial restaurada.');};
canvas.addEventListener('keydown',(e)=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-Math.PI/8:Math.PI/8);}if(e.key==='Home'){e.preventDefault();$('#reset-view').click();}});
canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};dragged=false;});
canvas.addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)dragged=true;});
canvas.addEventListener('pointercancel',()=>{pointerStart=null;canvas.classList.remove('dragging');});
canvas.addEventListener('pointerup',e=>{pointerStart=null;if(dragged||!state.started||!ready)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...hotspotObjects.values()].map(h=>h.hit));if(hits.length)selectZone(hits[0].object.userData.zone);});

function updateStrings(){if(!model)return;model.updateMatrixWorld(true);inverse.copy(model.matrixWorld).invert();for(const [jointName,point,top,meshName] of strings){const joint=joints.get(jointName),mesh=joints.get(meshName);if(!joint||!mesh)continue;stringEnd.fromArray(point);joint.localToWorld(stringEnd).applyMatrix4(inverse);stringTop.fromArray(top);stringDir.copy(stringEnd).sub(stringTop);mesh.position.copy(stringTop).add(stringEnd).multiplyScalar(.5);mesh.scale.y=stringDir.length();mesh.quaternion.setFromUnitVectors(up,stringDir.normalize());}}
function idle(time){
  const t=time-startTime;
  if(reduced||t<10)return;
  for(const [name,axis,amplitude,speed,phase] of [['Torso','x',.008,.8,0],['Cabeza','y',.022,.47,0],['Hombro_I','z',.008,.8,.5],['Hombro_D','z',-.008,.8,.5]]){const node=joints.get(name);if(!node)continue;helperE.set(0,0,0);helperE[axis]=Math.sin(t*speed+phase)*amplitude;helperQ.setFromEuler(helperE);node.quaternion.copy(baseRotations.get(name)).multiply(helperQ);}
}
function updateHotspots(){
  const width=stage.clientWidth,height=stage.clientHeight;
  model.updateMatrixWorld(true);
  for(const [,h] of hotspotObjects){h.anchor.getWorldPosition(h.position);projected.copy(h.position).project(camera);h.screen.x=(projected.x*.5+.5)*width;h.screen.y=(-projected.y*.5+.5)*height;h.el.style.left=`${h.screen.x}px`;h.el.style.top=`${h.screen.y}px`;h.el.style.visibility=projected.z>1||projected.z< -1?'hidden':'visible';}
  const path=$('#panel-connection');if(state.selected&&!state.closing){const h=hotspotObjects.get(state.selected);if(h){const {x,y}=h.screen;if(innerWidth<=850){path.setAttribute('d',`M${x},${y} C${x+35},${y+70} ${width*.5},${height-50} ${width*.5},${height+12}`);}else{const end=width+24;path.setAttribute('d',`M${x},${y} C${x+70},${y} ${end-70},${height*.31} ${end},${height*.31}`);}}}else path.setAttribute('d','');
}
function frame(ms){
  if(!ready)return;requestAnimationFrame(frame);const time=ms/1000,dt=Math.min(time-(lastTime||time),.05);lastTime=time;
  if(document.hidden)return;
  if(!reduced&&introAction?.isRunning())mixer.setTime(Math.min(time-introStart,10));
  idle(time);updateStrings();
  if(Math.abs(rotating)>.0001){const step=reduced?rotating:rotating*Math.min(dt*8,1);camera.position.sub(target).applyAxisAngle(zAxis,step).add(target);rotating-=step;}
  controls.update();updateHotspots();updateEdges(time);renderer.render(scene,camera);
}
media.addEventListener('change',e=>{reduced=e.matches;if(controls)controls.enableDamping=!reduced;if(reduced){introAction?.stop();for(const [name,q] of baseRotations)joints.get(name)?.quaternion.copy(q);}else{introStart=performance.now()/1000-11;startTime=introStart;}});
function makeFallback(){for(const [i,id] of zoneIds.entries()){const el=document.createElement('button');el.className='quote-bubble';el.style.cssText=`position:absolute;left:15%;top:${12+i*11}%;width:70%;pointer-events:auto`;el.textContent=`${zones[id].symbol} ${zones[id].name}`;el.onclick=()=>selectZone(id);$('#hotspots').append(el);}$('#stage-status').hidden=true;}

// Diagnóstico de la experiencia sin datos personales.
window.anatomia={get state(){return {ready,started:state.started,selected:state.selected,visited:[...state.visited],connections:state.edges.size,reducedMotion:reduced};}};
