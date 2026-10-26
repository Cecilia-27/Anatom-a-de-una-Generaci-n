import * as THREE from 'three';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { zones, voices, mainZoneIds, coverQuote } from './data.js';
import { bodyParts, partOrder, createPose, setPoseValue, jointAngles, partForMesh } from './pose.js';
import { renderZoneChart, contextCharts } from './charts.js';
import { FocusController, bodyBounds, regionBounds } from './focus.js';
import { PigmentSystem } from './pigments.js';
import { zoneStories, pigmentFactors } from './experience.js';
import {zoneIcon} from './zone-icons.js';
import {addAmbientMotion} from './motion.js';

const $ = (s) => document.querySelector(s);
const zoneIds = Object.keys(zones);
const state = {started:false, selected:null, visited:new Set(), edges:new Map(), closing:false, voice:0, quoteExpanded:false};
const media = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = media.matches;
const announce = (message) => { $('#announcement').textContent = message; };
const dialog = $('#info-dialog');
let lastFocus;
function openDialog(html){lastFocus=document.activeElement;$('#dialog-content').innerHTML=html;$('#dialog-content').scrollTop=0;$('#dialog-content').querySelector('h2')?.setAttribute('id','dialog-title');dialog.showModal();dialog.querySelector('.dialog-close').focus();}
function closeDialog(){dialog.close();lastFocus?.focus();}
$('.dialog-close').addEventListener('click',closeDialog);
dialog.addEventListener('click',(e)=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
dialog.addEventListener('cancel',()=>{requestAnimationFrame(()=>lastFocus?.focus());});

function showSources(){openDialog(`<p class="dialog-eyebrow">ACERCA DE LOS DATOS</p><h2>Escuchar lo que<br>el cuerpo cuenta.</h2><p>Esta experiencia presenta los resultados proporcionados de una encuesta de <strong>27 personas</strong> sobre la decisión de tener, postergar o no tener hijos.</p><h3>Cómo leer los porcentajes</h3><p>Los factores, preocupaciones y emociones corresponden a las opciones reportadas en la encuesta. Se presentan de forma independiente y no deben sumarse como una distribución de la población. La muestra describe a las personas participantes; no representa a toda la Generación Z.</p><h3>Sensaciones, sin interpretaciones médicas</h3><p>Los porcentajes corporales son <strong>sensaciones reportadas en la encuesta</strong>. No prueban que una emoción cause un síntoma en una parte del cuerpo. «Vacío» se conserva como categoría original, sin asignarle una interpretación adicional. Se muestran únicamente las categorías y porcentajes proporcionados, sin completar las distribuciones.</p><p>Las manchas y los hilos que conectan zonas son recorridos narrativos de exploración, no relaciones estadísticas ni mecanismos fisiológicos. Los pies no tienen un dato independiente.</p><h3>Las voces</h3><p>Los cuatro comentarios están identificados como <strong>ejemplos conceptuales proporcionados</strong>. No se presentan como transcripciones verificadas de entrevistas.</p>`);}
$('#sources').addEventListener('click',showSources);
$('#nav-about').addEventListener('click',()=>openDialog(`<p class="dialog-eyebrow">SOBRE EL PROYECTO</p><h2 class="dialog-brand-title" aria-label="Anatomía de una Generación"><img src="./assets/portada-titulo.svg" width="865.21" height="253.99" alt=""></h2><p>Una decisión que atraviesa el cuerpo.</p><p>Una exploración interactiva sobre cómo la Generación Z vive la decisión de tener, postergar o no tener hijos. Emociones, presiones sociales, economía y proyectos personales se encuentran alrededor de un mismo cuerpo.</p><div class="about-marks"><span>Visualización de datos</span><span>Narrativa generacional</span><span>Exploración 3D</span></div><h3>Cómo explorar</h3><p>Comienza el recorrido y elige una de las seis zonas. Arrastra el títere horizontalmente para girarlo, usa los botones ↶ / ↷ o las flechas del teclado al enfocar el modelo. Con Tab puedes recorrer los puntos; con Enter o espacio abrir sus datos.</p><p>En «Mover el cuerpo», selecciona una parte y arrástrala o ajusta sus controles. Puedes flexionar codos, muñecas, dedos, rodillas y tobillos. La postura se conserva al regresar a los datos y puedes restablecerla en cualquier momento.</p><p>Tras descubrir tres zonas podrás ver una vista conjunta y continuar explorando. El movimiento se reduce automáticamente si tu dispositivo así lo solicita.</p><p class="source-note">Modelo original: titere-articulado.glb · encuesta, n = 27.</p>`));
function voiceContent(){const v=voices[state.voice];return `<p class="dialog-eyebrow">LAS OPINIONES · ${v.stance.toUpperCase()}</p><h2 id="dialog-title">Hay muchas formas<br>de imaginarlo.</h2><blockquote class="voice-quote">“${v.text}”</blockquote><div class="voice-name" style="--voice-color:${v.color}">${v.name}</div><div class="voice-controls"><button class="round-button" data-voice-step="-1" aria-label="Voz anterior">←</button><span>${state.voice+1} / ${voices.length}</span><button class="round-button" data-voice-step="1" aria-label="Siguiente voz">→</button></div><p class="voice-disclaimer">Ejemplo conceptual proporcionado para el prototipo. No es una transcripción verificada de entrevista.</p>`;}
function showVoices(index=state.voice){state.voice=index;openDialog(voiceContent());}
$('#nav-voices').addEventListener('click',()=>showVoices());
$('#dialog-content').addEventListener('click',(e)=>{const b=e.target.closest('[data-voice-step]');if(!b)return;state.voice=(state.voice+Number(b.dataset.voiceStep)+voices.length)%voices.length;$('#dialog-content').innerHTML=voiceContent();$('#dialog-content').querySelector(`[data-voice-step="${b.dataset.voiceStep}"]`).focus();});

const stage = $('#stage'), canvas = $('#body-canvas');
const INTRO_DURATION=14;
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
const pose = createPose(), displayedPose = createPose(), jointHandles = new Map();
let ambientWeight=0;
let motionMode=false, selectedPart='cabeza', poseChanged=false, poseDrag=null;
let focusController=null,pigments=null,selectedAnchorKey=null,handAnchorKey='manos',focusStrength=0,focusZone=null,focusScroll=0,focusReframeAt=0,flowPaused=false,suppressZoneClick=false;
const modelMeshes=[],originalColors=new Map(),factorLabels=new Map();
let zoneRenderTimer=null,zoneRenderToken=0;
const anchorDefinitions = {
  cabeza:['Cabeza',[0,.45,.275]], boca:['Cabeza',[0,.12,.28]],
  pecho:['Torso',[0,.64,.29]], estomago:['Torso',[0,.18,.23]],
  manos:['Muneca_I',[0,-.13,.10]], manos_D:['Muneca_D',[0,-.13,.10]], piernas:['Pierna_D',[0,-.62,.15]]
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
  controls=new OrbitControls(camera,canvas);controls.target.copy(target);controls.enableDamping=!reduced;controls.dampingFactor=.075;controls.enablePan=false;controls.rotateSpeed=.52;controls.minPolarAngle=Math.PI/2-.025;controls.maxPolarAngle=Math.PI/2-.025;controls.minDistance=11.65;controls.maxDistance=13.1;controls.enableZoom=true;controls.zoomSpeed=.6;controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};controls.update();
  controls.addEventListener('start',()=>{canvas.classList.add('dragging');rotating=0;focusReframeAt=0;});
  controls.addEventListener('end',()=>canvas.classList.remove('dragging'));
  const resize=()=>{const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=document.body.classList.contains('cover-view')&&innerWidth>850?30:32;camera.updateProjectionMatrix();focusController?.resize();};
  new ResizeObserver(resize).observe(stage);resize();
  new GLTFLoader().load('./assets/titere-articulado.glb',initModel,undefined,onModelError);
  canvas.addEventListener('webglcontextlost',(e)=>{e.preventDefault();onModelError(new Error('Se perdió el contexto WebGL'));});
} catch(error){onModelError(error);}

function initModel(gltf){
  model=gltf.scene;scene.add(model);
  model.traverse((o)=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material=o.material.clone();modelMeshes.push(o);originalColors.set(o.uuid,{color:o.material.color.clone(),muted:o.material.color.clone().lerp(new THREE.Color('#b7a99e'),.42)});}if(o.name){joints.set(o.name,o);baseRotations.set(o.name,o.quaternion.clone());}});
  const bones=[];model.traverse(o=>{if(o.isBone)bones.push(o.name);});
  console.info('GLB inspeccionado',{bones,clips:gltf.animations.map(c=>c.name),articulaciones:[...joints.keys()].filter(n=>/^(Cabeza|Torso|Cintura|Hombro|Codo|Muneca|Dedo|Pierna|Rodilla)/.test(n))});
  makeHotspots();createIntro(gltf.animations);ready=true;introStart=performance.now()/1000;startTime=introStart;
  const bounds=bodyBounds(modelMeshes),height=bounds.getSize(new THREE.Vector3()).y;
  pigments=new PigmentSystem({scene,box:bounds,getAnchor:zone=>getZoneHotspot(zone)?.anchor});
  focusController=new FocusController({camera,controls,bodyHeight:height,getBox:zone=>regionBounds(zone,modelMeshes,handAnchorKey==='manos_D'?'D':'I'),getReduced:()=>reduced,getMobile:()=>false,getOverview:()=>({position:new THREE.Vector3(.65,2.93,12.1),target:target.clone()}),onPhase:handleFocusPhase,onVisual:(zone,strength)=>{focusZone=zone;focusStrength=strength;}});
  controls.minDistance=height*.55;controls.maxDistance=height*2.8;
  console.info('Encuadres calculados desde el GLB',{bodyBounds:bounds.getSize(new THREE.Vector3()).toArray()});
  initArticulation();$('#mode-pose').disabled=false;
  $('#stage-status').hidden=true;document.body.classList.add('model-ready');$('#start').disabled=false;$('#start').innerHTML='comenzar interacción <span aria-hidden="true">⟶</span>';
  requestAnimationFrame(frame);
}

function createIntro(clips){
  // El archivo no tiene Skeleton: animamos pivotes rígidos, sin alterar vértices.
  const duration=INTRO_DURATION,tracks=[];
  const headTrack=clips.flatMap(c=>c.tracks).find(t=>t.name==='Cabeza.quaternion');
  if(headTrack){const qbase=baseRotations.get('Cabeza'),q=new THREE.Quaternion(),values=[];for(let i=0;i<headTrack.values.length;i+=4){q.fromArray(headTrack.values,i);qbase.clone().slerp(q,.45).toArray(values,values.length);}tracks.push(new THREE.QuaternionKeyframeTrack(headTrack.name,Array.from(headTrack.times,t=>t*duration/headTrack.times[headTrack.times.length-1]),values,THREE.InterpolateLinear));}
  const motions=[['Hombro_I',1.5,[.065,0,.24]],['Hombro_D',2.1,[-.055,0,-.19]],['Codo_I',2.8,[-.28,0,0]],['Codo_D',3.1,[-.21,0,0]],['Muneca_I',4,[.16,0,.13]],['Muneca_D',4.3,[.14,0,-.10]],['Torso',5.2,[.05,.065,0]],['Cintura',5.5,[0,.06,.025]],['Pierna_I',7,[-.085,0,.025]],['Rodilla_I',7.2,[.15,0,0]]];
  for(const side of ['I','D'])for(let f=0;f<4;f++)motions.push([`Dedo_${side}_${f}`,4.2+f*.18,[.24,0,0]]);
  for(const [name,delay,angles] of motions){if(!joints.has(name))continue;const base=baseRotations.get(name),values=[],times=[];for(let i=0;i<=100;i++){const t=i*duration/100;const phase=(t-delay)/4.8;const w=phase>0&&phase<1?Math.sin(Math.PI*phase)**2:0;times.push(t);helperE.set(...angles.map(a=>a*w));helperQ.setFromEuler(helperE);base.clone().multiply(helperQ).toArray(values,values.length);}tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`,times,values,THREE.InterpolateLinear));}
  mixer=new THREE.AnimationMixer(model);introAction=mixer.clipAction(new THREE.AnimationClip('Despertar_sutil',duration,tracks));introAction.setLoop(THREE.LoopOnce,1);introAction.clampWhenFinished=true;if(!reduced)introAction.play();
}

function makeHotspots(){
  for(const [id,[name,offset]] of Object.entries(anchorDefinitions)){
    const zone=id==='manos_D'?'manos':id;
    const joint=joints.get(name);if(!joint)continue;
    const anchor=new THREE.Object3D();anchor.position.fromArray(offset);joint.add(anchor);
    const hit=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),new THREE.MeshBasicMaterial({visible:false}));Object.assign(hit.userData,{zone,anchorKey:id});anchor.add(hit);
    const el=document.createElement('button');el.type='button';el.className='hotspot';el.style.setProperty('--zone-color',zones[zone].color);el.setAttribute('aria-label',id==='manos_D'?'Explorar Manos, mano derecha':`Explorar ${zones[zone].name}`);el.setAttribute('aria-pressed','false');el.innerHTML=`<span class="hotspot-core"><b></b></span><span class="hotspot-label">${zones[zone].symbol} ${id==='manos_D'?'Mano derecha':zones[zone].name}</span>`;el.hidden=true;el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&focusController?.phase==='open')startPartDrag(e,partForZone(zone,id),el);});el.addEventListener('pointermove',movePartDrag);el.addEventListener('pointerup',endPartDrag);el.addEventListener('pointercancel',endPartDrag);el.addEventListener('lostpointercapture',endPartDrag);el.addEventListener('click',()=>{if(suppressZoneClick){suppressZoneClick=false;return;}selectZone(zone,id);});$('#hotspots').append(el);
    hotspotObjects.set(id,{zone,anchor,hit,el,position:new THREE.Vector3(),screen:{x:0,y:0}});
  }
}

function begin(){
  if(motionMode)setMotionMode(false);
  document.body.classList.remove('cover-view');
  if(state.started){if(state.closing)resume();else $('#hotspots').querySelector('button')?.focus();return;}
  state.started=true;document.body.classList.add('exploring');$('#intro-copy').hidden=true;$('#explore-copy').hidden=false;$('#start').hidden=true;$('#journey').hidden=false;$('#chapter-number').textContent='02 / 03';$('#chapter-label').textContent='Descubrir lo que nos atraviesa';
  if(failed)makeFallback();
  hotspotObjects.forEach(({el},i)=>{el.hidden=false;el.style.animationDelay=`${i*.12}s`;});
  updateFreeGuide();window.scrollTo({top:0,behavior:'instant'});$('#pigment-toggle').hidden=false;if(pigments&&!pigments.active.length)revealFactors(zones.cabeza);
  announce('Exploración iniciada. Seis zonas disponibles. Selecciona un punto del cuerpo.');
  const first=hotspotObjects.get('cabeza')?.el;first?.focus({preventScroll:true});
}
$('#start').addEventListener('click',begin);$('#nav-explore').addEventListener('click',()=>{if(!state.started)$('#start').focus();else{resume();hotspotObjects.get(state.selected||'cabeza')?.el.focus({preventScroll:true});}});

function getZoneHotspot(id){return hotspotObjects.get(id==='manos'?handAnchorKey:id);}
function partForZone(id,key=id){return id==='cabeza'||id==='boca'?'cabeza':id==='pecho'||id==='estomago'?'torso':id==='manos'?`mano_${key==='manos_D'?'D':'I'}`:'pierna_D';}
function zoneForPart(part){return part==='cabeza'?['cabeza','cabeza']:part==='torso'?['pecho','pecho']:part.startsWith('pierna')?['piernas','piernas']:['manos',part.endsWith('_D')?'manos_D':'manos'];}
function canArticulate(){return motionMode||focusController?.phase==='open';}
function selectZone(id,anchorKey=id){
  if(focusController?.phase==='zooming-out')return;
  if(focusController?.busy&&state.selected===id&&selectedAnchorKey===anchorKey)return;
  endPartDrag();
  if(motionMode)setMotionMode(false);
  if(!state.started)begin();state.closing=false;state.selected=id;state.visited.add(id);state.quoteExpanded=false;
  selectedAnchorKey=anchorKey;if(id==='manos')handAnchorKey=anchorKey;
  introAction?.stop();updateManualPose(0);model?.updateMatrixWorld(true);
  const z=zones[id];document.documentElement.style.setProperty('--selected-color',z.color);
  $('#welcome-panel').hidden=true;$('#closing-panel').hidden=true;
  selectedPart=partForZone(id,anchorKey);clearTimeout(zoneRenderTimer);const token=++zoneRenderToken,panel=$('#zone-panel'),replacePanel=()=>{if(token!==zoneRenderToken||state.selected!==id)return;renderZone(id);renderJointControls();};
  if(!panel.hidden&&!reduced){panel.classList.add('chart-leaving');zoneRenderTimer=setTimeout(replacePanel,300);}else replacePanel();
  revealFactors(z);rotating=0;
  hotspotObjects.forEach(({el,zone},key)=>{el.classList.toggle('dim',key!==anchorKey);el.classList.toggle('seen',state.visited.has(zone));el.setAttribute('aria-pressed',String(key===anchorKey));});
  updateProgress();
  const h=hotspotObjects.get(anchorKey);h?.anchor.getWorldPosition(world);const screenX=h?world.clone().project(camera).x:0;
  const side='right';
  if(focusController)focusController.select(id,side,{force:true});else handleFocusPhase('open',id,side);
  announce(`Acercándonos a ${z.name.toLowerCase()}.`);
}

function renderZone(id){
  const z=zones[id],story=zoneStories[id],panel=$('#zone-panel'),index=mainZoneIds.indexOf(id);
  const quoted=z.testimony?.verified===true&&z.testimony.text&&z.testimony.source?z.testimony:id==='cabeza'?coverQuote:{text:voices[z.quote].text,source:`${voices[z.quote].name} · ejemplo conceptual`,verified:false};
  panel.classList.add('glass-panel');panel.classList.remove('chart-leaving');panel.setAttribute('role','region');panel.removeAttribute('aria-modal');panel.setAttribute('aria-labelledby','glass-title');panel.inert=true;
  panel.innerHTML=`<div class="editorial-panel-top"><button id="return-body" class="body-return">← <span>Volver al cuerpo</span></button><span class="zone-counter">${index>=0?`${index+1} / 5`:'Recorrido complementario'}</span><button id="close-zone" class="editorial-close" aria-label="Cerrar información de la zona">×</button></div>
    <div class="editorial-zone-heading"><span class="zone-illustration" style="--wash-color:${z.color}">${zoneIcon(id)}</span><div><h2 id="glass-title">${id==='pecho'?'Pecho':z.name}</h2><p class="editorial-subtitle">${z.subtitle}</p></div></div>
    <p class="editorial-description">${z.description} Una lectura de las experiencias subjetivas reportadas al pensar o hablar de esta decisión.</p>
    <blockquote class="editorial-quote" style="--wash-color:${z.color}"><p>“${quoted.text}”</p><cite>${quoted.source||'Entrevista verificada'}</cite></blockquote>
    <div class="data-tabs" role="tablist" aria-label="Resultados de ${z.name}"><button id="tab-sensations" type="button" role="tab" aria-selected="true" aria-controls="data-sensations" tabindex="0">Sensaciones</button><button id="tab-context" type="button" role="tab" aria-selected="false" aria-controls="data-context" tabindex="-1">Decisión y emociones</button></div>
    <div id="data-sensations" class="data-tab-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-sensations">${renderZoneChart(id)}<p class="editorial-finding">${story.insight}</p></div>
    <div id="data-context" class="data-tab-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-context" hidden>${contextCharts(id)}<p class="finding">${z.finding}</p></div>
    ${id==='manos'?`<div class="focus-hand-nav" aria-label="Mano que exploras"><button data-hand-anchor="manos" aria-label="Ver mano izquierda" aria-pressed="${handAnchorKey==='manos'}">Mano izquierda</button><button data-hand-anchor="manos_D" aria-label="Ver mano derecha" aria-pressed="${handAnchorKey==='manos_D'}">Mano derecha</button></div>`:''}
    <details class="focus-motion" id="focus-motion"><summary>Mover el cuerpo aquí <span aria-hidden="true">↗</span></summary><p>Arrastra una pieza con el mouse para articularla o el fondo para girar. En touch, arrastra para girar y usa estos controles para articular. Tu postura se conserva al cambiar de zona.</p><label for="focus-body-part">Parte del cuerpo</label><select id="focus-body-part">${partOrder.map(key=>`<option value="${key}" ${key===selectedPart?'selected':''}>${bodyParts[key].name}</option>`).join('')}</select><div id="focus-joint-controls"></div><button id="focus-reset-pose" class="text-button">↺ Restablecer postura</button></details>
    <details class="zone-shortcuts"><summary>Otros recorridos y zonas</summary><nav class="focus-zone-nav" aria-label="Cambiar de zona sin cerrar">${zoneIds.map(key=>`<button type="button" data-focus-zone="${key}" aria-label="Ir a ${zones[key].name}" aria-pressed="${key===id}">${zones[key].name}</button>`).join('')}</nav></details>
    <label class="focus-zone-select" for="focus-zone-select">Cambiar de zona<select id="focus-zone-select">${zoneIds.map(key=>`<option value="${key}" ${key===id?'selected':''}>${zones[key].name}</option>`).join('')}</select></label>
    <p class="editorial-method">Encuesta n = 27 · Experiencias subjetivas. Las manchas son recorridos narrativos; no representan relaciones médicas.</p><button class="chart-help" id="chart-help">Cómo leer los datos ↗</button>`;
  panel.querySelectorAll('[data-focus-zone]').forEach(button=>button.onclick=()=>selectZone(button.dataset.focusZone));
  panel.querySelectorAll('[data-hand-anchor]').forEach(button=>button.onclick=()=>selectZone('manos',button.dataset.handAnchor));
  $('#focus-zone-select').onchange=e=>selectZone(e.target.value);
  $('#focus-body-part').onchange=e=>selectPart(e.target.value);
  $('#focus-joint-controls').addEventListener('input',e=>{if(e.target.matches('[data-pose-field]'))changePose(selectedPart,e.target.dataset.poseField,Number(e.target.value));});
  $('#focus-reset-pose').onclick=resetPose;
  const tabs=[...panel.querySelectorAll('[role="tab"]')];
  const activateTab=(tab,focus=false)=>{for(const button of tabs){const selected=button===tab;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;$('#'+button.getAttribute('aria-controls')).hidden=!selected;}if(focus)tab.focus();};
  tabs.forEach((tab,index)=>{tab.onclick=()=>activateTab(tab);tab.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();activateTab(tabs[next],true);}};});
  $('#chart-help').onclick=showSources;$('#close-zone').onclick=()=>requestCloseFocus();$('#return-body').onclick=()=>{resetPose();requestCloseFocus(undefined,{overview:true});};
}
function updateFreeGuide(){
  $('#welcome-panel').innerHTML=`<p class="small-label">EL CUERPO COMO MAPA</p><h2>${state.visited.size?'Tu recorrido<br>continúa.':'Gira, descubre<br>y acércate.'}</h2><p>${state.visited.size?'Las huellas que descubriste permanecen. Elige otra luz para seguir conectando el cuerpo.':'Selecciona una luz del cuerpo. Acércate a sus sensaciones, mueve las piezas y cambia de zona sin cerrar la ventana.'}</p><div class="color-key">${zoneIds.map(id=>`<span><i style="--c:${zones[id].color}"></i>${zones[id].symbol} ${zones[id].name}</span>`).join('')}</div><p class="sample-note">Encuesta, n = 27 · Experiencias subjetivas.<br>Las manchas no representan relaciones médicas.</p>`;
}
function requestCloseFocus(afterClose,{overview=false}={}){
  endPartDrag();clearTimeout(zoneRenderTimer);zoneRenderToken++;focusReframeAt=0;
  if(focusController?.busy)focusController.close(afterClose,{overview});
  else{handleFocusPhase('free',state.selected);afterClose?.();}
}
function handleFocusPhase(phase,id,side='right'){
  stage.dataset.focusPhase=phase;
  const active=phase!=='free',panel=$('#zone-panel');
  if(active&&!document.body.classList.contains('focus-active'))focusScroll=scrollY;
  document.body.classList.toggle('focus-active',active);document.body.classList.toggle('panel-left',active&&side==='left');document.body.classList.remove('panel-ready');document.body.classList.toggle('focus-exit',phase==='zooming-out');
  $('.site-header').inert=false;$('.editorial').inert=false;$('.site-footer').inert=false;
  for(const selector of ['#mode-data','#mode-pose','#rotate-left','#rotate-right','#reset-view'])$(selector).disabled=(selector==='#mode-pose'&&!ready)||(['#mode-data','#mode-pose','#reset-view'].includes(selector)?active:active&&phase!=='open');
  hotspotObjects.forEach(({el})=>el.disabled=phase==='zooming-out');canvas.tabIndex=phase==='open'||!active?0:-1;canvas.setAttribute('aria-label',active?'Títere en detalle. Arrastra una pieza para articularla o el fondo para girar. Selecciona otra luz para cambiar de zona.':'Títere 3D. Arrastra para girar o usa las flechas izquierda y derecha del teclado.');
  $('#focus-status').hidden=!active||phase==='open';$('#focus-status').textContent=phase==='zooming-out'?'Volviendo al cuerpo…':`Acercándonos a ${zones[id]?.name.toLowerCase()||'la zona'}…`;
  if(phase==='zooming-in'){panel.inert=true;if(!panel.childElementCount)panel.hidden=true;}
  if(phase==='open'){panel.hidden=false;panel.inert=false;panel.scrollTop=0;void panel.offsetWidth;requestAnimationFrame(()=>{if(stage.dataset.focusPhase==='open'){document.body.classList.add('panel-ready');$('#return-body')?.focus({preventScroll:true});}});announce(`${zones[id].name}. Información de la zona. Puedes mover las piezas o cambiar directamente a otra zona.`);}
  if(phase==='zooming-out'){panel.inert=true;}
  if(phase==='free'){
    const returnKey=selectedAnchorKey;panel.hidden=true;panel.inert=false;state.selected=null;document.querySelectorAll('[data-zone-nav]').forEach(button=>button.setAttribute('aria-pressed','false'));selectedAnchorKey=null;focusZone=null;focusStrength=0;highlightZone(null);
    hotspotObjects.forEach(({el,zone})=>{el.classList.remove('dim');el.setAttribute('aria-pressed','false');el.classList.toggle('seen',state.visited.has(zone));});
    $('#welcome-panel').hidden=false;updateFreeGuide();window.scrollTo({top:focusScroll,behavior:'instant'});hotspotObjects.get(returnKey)?.el.focus({preventScroll:true});announce('Vista general restaurada. Puedes girar el cuerpo y elegir otra zona.');
  }
}
function updateFocusVisuals(time){
  if(!focusZone||!focusController?.busy){pigments?.highlight(null,'#ffffff',0,time,reduced);return;}
  const patterns={cabeza:/^Cabeza_madera|^Oreja/,boca:/^Cabeza_madera/,pecho:/^Torso_madera|^Union_hombro/,estomago:/^Torso_madera|^Pelvis/,manos:/^Palma|^Falange|^Pulgar_madera/,piernas:/^Muslo|^Pantorrilla/};
  for(const mesh of modelMeshes){const base=originalColors.get(mesh.uuid);let selected=patterns[focusZone].test(mesh.name);if(focusZone==='manos')selected=selected&&new RegExp(`_${handAnchorKey==='manos_D'?'D':'I'}(?:_|$)`).test(mesh.name);mesh.material.color.copy(base.color).lerp(base.muted,selected?0:focusStrength*.60);if(mesh.material.emissive){mesh.material.emissive.set(selected?zones[focusZone].color:0x000000);mesh.material.emissiveIntensity=selected?.22*focusStrength:0;}}
  pigments?.highlight(focusZone,zones[focusZone].color,focusStrength,time,reduced||flowPaused);
}
document.addEventListener('keydown',e=>{
  if(!document.body.classList.contains('focus-active')||dialog.open)return;
  if(e.key==='Escape'){e.preventDefault();requestCloseFocus();return;}

});
function revealFactors(z){
  const labels=z.factors.filter(label=>pigmentFactors[label]).slice(0,2);factorLabels.forEach(el=>el.classList.remove('visible'));
  for(const label of labels){let el=factorLabels.get(label);if(!el){el=document.createElement('span');el.className='factor';el.textContent=label;el.style.setProperty('--factor-color',pigmentFactors[label].color);el.style.setProperty('--tilt',`${factorLabels.size%2?4:-4}deg`);$('#factors').append(el);factorLabels.set(label,el);}el.classList.add('visible');discoverRoute(pigmentFactors[label].route,pigmentFactors[label].color);}
  if(pigments){pigments.box.copy(bodyBounds(modelMeshes));pigments.activate(labels,performance.now()/1000,reduced||flowPaused);}
}
function updateFactorLabels(){
  if(!pigments)return;const width=stage.clientWidth,height=stage.clientHeight;
  for(const [label,el] of factorLabels){projected.copy(pigments.sourcePoint(label)).project(camera);el.style.left=`${(projected.x*.5+.5)*width}px`;el.style.top=`${(-projected.y*.5+.5)*height}px`;el.style.visibility=projected.z>1||projected.z< -1?'hidden':'visible';}
}

function updateProgress(){document.querySelectorAll('[data-zone-nav]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.zoneNav===state.selected));button.classList.toggle('is-visited',state.visited.has(button.dataset.zoneNav));});$('#rail-connections').disabled=state.visited.size<3;const n=state.visited.size;$('#progress-text').textContent=`${n} de 6 zonas`;$('#progress-bar').style.width=`${n/6*100}%`;$('#conclusion').hidden=n<3;if(n===6)$('#conclusion').textContent='Ver el cuerpo conectado ↗';}
function highlightZone(id){if(!model)return;const patterns={cabeza:/^Cabeza_madera|^Oreja/,boca:/^Cabeza_madera/,pecho:/^Torso_madera/,estomago:/^Torso_madera|^Union_cintura/,manos:/^Palma|^Falange|^Pulgar_madera/,piernas:/^Muslo|^Pantorrilla/};model.traverse(o=>{if(o.isMesh&&o.material.emissive){const base=originalColors.get(o.uuid);if(base)o.material.color.copy(base.color);const active=id&&patterns[id].test(o.name);o.material.emissive.set(active?zones[id].color:0x000000);o.material.emissiveIntensity=active?.10:0;}});}

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
    edge.line.visible=!motionMode;edge.glow.visible=!motionMode;
    const a=getZoneHotspot(edge.from)?.position,b=getZoneHotspot(edge.to)?.position;if(!a||!b)continue;
    const mid=a.clone().lerp(b,.5);mid.z+=.22;mid.x+=.07;const curve=new THREE.QuadraticBezierCurve3(a,mid,b);const positions=edge.line.geometry.attributes.position;
    for(let i=0;i<49;i++){const p=curve.getPoint(i/48);positions.setXYZ(i,p.x,p.y,p.z);const tangent=curve.getTangent(i/48),view=camera.position.clone().sub(p).normalize(),side=new THREE.Vector3().crossVectors(tangent,view).normalize().multiplyScalar(.016);const g=edge.glow.geometry.attributes.position;g.setXYZ(i*2,p.x+side.x,p.y+side.y,p.z+side.z);g.setXYZ(i*2+1,p.x-side.x,p.y-side.y,p.z-side.z);}positions.needsUpdate=true;edge.glow.geometry.attributes.position.needsUpdate=true;
    const elapsed=time-edge.started,progress=reduced?1:THREE.MathUtils.clamp(elapsed/1.3,0,1);edge.line.geometry.setDrawRange(0,Math.max(0,Math.floor(progress*49)));
    edge.glow.geometry.setDrawRange(0,Math.floor(progress*48)*6);edge.glow.material.opacity=state.closing?.10:.035;edge.line.material.opacity=state.closing?.32:edge.active?.24:.12;
    edge.light.visible=false;
    if(edge.light.visible)edge.light.position.copy(curve.getPoint(THREE.MathUtils.clamp(elapsed/2.4,0,1)));
    if(elapsed>2.4)edge.active=false;
  }
}
function showConclusion(){if(state.visited.size<3)return;if(focusController?.busy){requestCloseFocus(()=>showConclusion());return;}if(motionMode)setMotionMode(false);state.closing=true;$('#zone-panel').hidden=true;$('#welcome-panel').hidden=true;$('#closing-panel').hidden=false;$('#chapter-number').textContent='03 / 03';$('#chapter-label').textContent='Distintas partes, una misma decisión';hotspotObjects.forEach(({el})=>el.classList.remove('dim'));highlightZone(null);announce('Vista general. Distintas partes, una misma decisión. Tus conexiones permanecen visibles.');if(innerWidth<=850)$('#closing-panel').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});}
function resume(){if(focusController?.busy){requestCloseFocus();return;}if(motionMode)setMotionMode(false);state.closing=false;$('#chapter-number').textContent=state.started?'02 / 03':'01 / 03';$('#chapter-label').textContent='Descubrir lo que nos atraviesa';$('#closing-panel').hidden=true;$('#zone-panel').hidden=true;$('#welcome-panel').hidden=false;updateFreeGuide();}
$('#conclusion').onclick=showConclusion;$('#continue').onclick=resume;
$('#zone-buttons').innerHTML=mainZoneIds.map(id=>`<button type="button" data-zone-nav="${id}" aria-label="Explorar ${zones[id].name} desde zonas del cuerpo" aria-pressed="false" style="--wash-color:${zones[id].color}"><span class="zone-nav-icon">${zoneIcon(id)}</span><span>${id==='pecho'?'Pecho':zones[id].name}</span><small class="zone-visited">Explorada</small></button>`).join('');
$('#zone-buttons').addEventListener('click',e=>{const button=e.target.closest('[data-zone-nav]');if(!button)return;selectZone(button.dataset.zoneNav);(innerWidth>1050?$('#main'):$('#stage')).scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});});
$('#rail-explore').onclick=()=>{if(focusController?.busy)requestCloseFocus();else resume();$('#stage').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});};
$('#rail-zones').onclick=()=>$('#zone-navigation').scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});
$('#rail-voices').onclick=()=>showVoices();$('#rail-connections').onclick=showConclusion;


function initArticulation(){
  $('#body-part').innerHTML=partOrder.map(id=>`<option value="${id}">${bodyParts[id].name}</option>`).join('');
  for(const id of partOrder){
    const part=bodyParts[id],[name,offset]=part.anchor,joint=joints.get(name);if(!joint)continue;
    const anchor=new THREE.Object3D();anchor.position.fromArray(offset);joint.add(anchor);
    const el=document.createElement('button');el.className='joint-handle';el.type='button';el.dataset.part=id;el.setAttribute('aria-label',`Mover ${part.name.toLowerCase()}`);el.setAttribute('aria-pressed',String(id===selectedPart));el.innerHTML=`<span aria-hidden="true">${part.symbol}</span><span class="joint-name">${part.name}</span>`;
    el.addEventListener('pointerdown',e=>startPartDrag(e,id,el));
    el.addEventListener('pointermove',movePartDrag);
    el.addEventListener('pointerup',endPartDrag);
    el.addEventListener('pointercancel',endPartDrag);
    el.addEventListener('lostpointercapture',endPartDrag);
    el.addEventListener('click',()=>selectPart(id));
    $('#joint-handles').append(el);jointHandles.set(id,{anchor,el,position:new THREE.Vector3()});
  }
  renderJointControls();
}
function setMotionMode(enabled){
  if(focusController?.busy)return;
  if(enabled&&!ready)return;
  endPartDrag();motionMode=enabled;document.body.classList.toggle('moving-body',enabled);document.body.classList.toggle('cover-view',!enabled&&!state.started);
  $('#mode-data').setAttribute('aria-pressed',String(!enabled));$('#mode-pose').setAttribute('aria-pressed',String(enabled));
  $('#articulation-panel').hidden=!enabled;$('#joint-handles').hidden=!enabled;
  $('#welcome-panel').hidden=enabled||state.started&&(!!state.selected||state.closing);
  $('#zone-panel').hidden=enabled||!state.selected||state.closing;
  $('#closing-panel').hidden=enabled||!state.closing;
  hotspotObjects.forEach(({el})=>el.hidden=enabled||!state.started);
  if(enabled){
    introAction?.stop();rotating=0;selectPart(selectedPart);canvas.setAttribute('aria-label','Títere articulado. Arrastra una parte para moverla o arrastra el fondo para girar. Usa los controles para ajustar cada articulación.');
    announce('Modo mover el cuerpo. Elige una parte y arrastra, o ajusta sus controles.');
  }else{
    highlightZone(state.closing?null:state.selected);canvas.setAttribute('aria-label','Títere 3D. Arrastra para girar o usa las flechas izquierda y derecha del teclado.');
    announce('Modo explorar datos. Tu postura se conserva.');
  }
}
$('#mode-pose').onclick=()=>setMotionMode(true);$('#mode-data').onclick=()=>setMotionMode(false);
function selectPart(id){
  if(!bodyParts[id])return;const changed=id!==selectedPart;selectedPart=id;$('#body-part').value=id;
  jointHandles.forEach(({el},key)=>el.setAttribute('aria-pressed',String(id===key)));
  if($('#focus-body-part'))$('#focus-body-part').value=id;
  if(changed||!$('#joint-controls').children.length||$('#focus-joint-controls'))renderJointControls();
  highlightZone(null);model?.traverse(o=>{if(o.isMesh&&o.material.emissive&&partForMesh(o.name)===id){o.material.emissive.set('#7d8867');o.material.emissiveIntensity=.16;}});
  announce(`${bodyParts[id].name}. Arrastra o usa los controles de movimiento.`);
}
$('#body-part').onchange=e=>selectPart(e.target.value);
function renderJointControls(){
  const part=bodyParts[selectedPart];$('#body-part').value=selectedPart;const markup=part.fields.map(f=>`<label class="joint-control" for="pose-${f.id}"><span>${f.label}</span><output id="value-${f.id}" for="pose-${f.id}">${Math.round(pose[selectedPart][f.id])}${f.unit}</output><input id="pose-${f.id}" data-pose-field="${f.id}" type="range" min="${f.min}" max="${f.max}" step="1" value="${pose[selectedPart][f.id]}" aria-label="${part.name}: ${f.label.toLowerCase()}"></label>`).join('');
  $('#joint-controls').innerHTML=markup;if($('#focus-joint-controls')){$('#focus-joint-controls').innerHTML=markup.replaceAll('id="pose-','id="focus-pose-').replaceAll('for="pose-','for="focus-pose-').replaceAll('id="value-','id="focus-value-');$('#focus-body-part').value=selectedPart;}
}
$('#joint-controls').addEventListener('input',e=>{if(!e.target.matches('[data-pose-field]'))return;changePose(selectedPart,e.target.dataset.poseField,Number(e.target.value));});
function changePose(part,fieldId,value){
  if(!setPoseValue(pose,part,fieldId,value))return;poseChanged=true;if(focusController?.busy)focusReframeAt=performance.now()/1000+.24;
  if(part===selectedPart){const f=bodyParts[part].fields.find(f=>f.id===fieldId),input=$(`#pose-${fieldId}`),output=$(`#value-${fieldId}`);if(input)input.value=String(pose[part][fieldId]);if(output)output.textContent=`${Math.round(pose[part][fieldId])}${f.unit}`;const focusInput=$(`#focus-pose-${fieldId}`),focusOutput=$(`#focus-value-${fieldId}`);if(focusInput)focusInput.value=String(pose[part][fieldId]);if(focusOutput)focusOutput.textContent=`${Math.round(pose[part][fieldId])}${f.unit}`;}
}
function resetPose(){endPartDrag();const neutral=createPose();for(const id of partOrder)Object.assign(pose[id],neutral[id]);poseChanged=false;renderJointControls();if(focusController?.busy)focusReframeAt=performance.now()/1000+.35;announce('Postura original restaurada.');}
$('#reset-pose').onclick=resetPose;
function updateManualPose(dt){
  let changing=false,offset=false;
  for(const id of partOrder)for(const f of bodyParts[id].fields){const current=displayedPose[id][f.id],value=pose[id][f.id],difference=value-current;displayedPose[id][f.id]=reduced||Math.abs(difference)<.02?value:current+difference*(1-Math.exp(-dt*16));if(Math.abs(displayedPose[id][f.id])>.001)offset=true;if(Math.abs(difference)>.02)changing=true;}
  const active=motionMode||!!focusController?.busy||poseChanged||offset||changing;
  for(const [name,a] of Object.entries(jointAngles(displayedPose))){const node=joints.get(name);if(!node)continue;helperE.set(a.x,a.y,a.z);helperQ.setFromEuler(helperE);node.quaternion.copy(baseRotations.get(name)).multiply(helperQ);}
  return active;
}
function startPartDrag(e,id,element,clickZone=null){
  if(!canArticulate()||!ready||e.button!==0)return;
  e.preventDefault();e.stopImmediatePropagation();selectPart(id);introAction?.stop();rotating=0;
  controls.enabled=false;controls.enableDamping=false;
  suppressZoneClick=false;poseDrag={id,element,clickZone,moved:false,pointerId:e.pointerId,x:e.clientX,y:e.clientY,values:{...pose[id]}};
  element.setPointerCapture(e.pointerId);element.classList.add('is-dragging');canvas.classList.add('dragging');document.body.classList.add('articulating');
}
function movePartDrag(e){
  if(!poseDrag||e.pointerId!==poseDrag.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
  const d=poseDrag,[horizontal,vertical]=bodyParts[d.id].drag,dx=e.clientX-d.x,dy=d.y-e.clientY;
  if(Math.hypot(dx,dy)<3)return;d.moved=true;suppressZoneClick=d.element!==canvas;
  changePose(d.id,horizontal,d.values[horizontal]+dx*.35);changePose(d.id,vertical,d.values[vertical]+dy*.45);
}
function endPartDrag(e){
  if(!poseDrag||e?.pointerId!==undefined&&e.pointerId!==poseDrag.pointerId)return;
  e?.preventDefault();e?.stopImmediatePropagation();const d=poseDrag;poseDrag=null;
  if(d.element.hasPointerCapture(d.pointerId))d.element.releasePointerCapture(d.pointerId);
  d.element.classList.remove('is-dragging');canvas.classList.remove('dragging');document.body.classList.remove('articulating');
  if(controls){const orbitAllowed=!focusController?.busy||(focusController.phase==='open'&&!focusController.animation);controls.enabled=orbitAllowed;controls.enableDamping=orbitAllowed&&!reduced;}
  if(focusController?.phase==='open'){if(d.moved)focusReframeAt=performance.now()/1000+.16;else if(e?.type==='pointerup'&&d.element===canvas)selectZone(...(d.clickZone||zoneForPart(d.id)));}
}
// Capturamos las piezas antes de que OrbitControls interprete el arrastre como giro.
canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch'||!canArticulate()||!ready||e.button!==0)return;
  const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(model,true).find(h=>h.object.isMesh&&partForMesh(h.object.name));
  if(hit){
    const part=partForMesh(hit.object.name),zone=zoneForPart(part),allowed=part==='cabeza'?['cabeza','boca']:part==='torso'?['pecho','estomago']:[zone[0]];
    const nearest=[...hotspotObjects.entries()].filter(([key,h])=>allowed.includes(h.zone)&&(h.zone!=='manos'||key===zone[1])).sort((a,b)=>hit.point.distanceToSquared(a[1].position)-hit.point.distanceToSquared(b[1].position))[0];
    startPartDrag(e,part,canvas,nearest?[nearest[1].zone,nearest[0]]:zone);
  }
},true);
canvas.addEventListener('pointermove',movePartDrag,true);canvas.addEventListener('pointerup',endPartDrag,true);canvas.addEventListener('pointercancel',endPartDrag,true);canvas.addEventListener('lostpointercapture',endPartDrag,true);
window.addEventListener('blur',()=>endPartDrag());
function updateJointHandles(){
  if(!motionMode)return;const width=stage.clientWidth,height=stage.clientHeight;
  for(const h of jointHandles.values()){h.anchor.getWorldPosition(h.position);projected.copy(h.position).project(camera);h.el.style.left=`${(projected.x*.5+.5)*width}px`;h.el.style.top=`${(-projected.y*.5+.5)*height}px`;h.el.style.visibility=projected.z>1||projected.z< -1?'hidden':'visible';}
}

function rotate(amount){if(!controls||(focusController?.busy&&(focusController.phase!=='open'||focusController.animation)))return;rotating+=amount;announce(amount<0?'Girando a la izquierda.':'Girando a la derecha.');}
$('#rotate-left').onclick=()=>rotate(-Math.PI/6);$('#rotate-right').onclick=()=>rotate(Math.PI/6);
$('#reset-view').onclick=()=>{if(!controls||focusController?.busy)return;rotating=0;camera.position.set(.65,2.93,12.1);controls.target.copy(target);controls.update();announce('Vista inicial restaurada.');};
canvas.addEventListener('keydown',(e)=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-Math.PI/8:Math.PI/8);}if(e.key==='Home'){e.preventDefault();$('#reset-view').click();}});
canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};dragged=false;});
canvas.addEventListener('pointermove',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)dragged=true;});
canvas.addEventListener('pointercancel',()=>{pointerStart=null;canvas.classList.remove('dragging');});
canvas.addEventListener('pointerup',e=>{pointerStart=null;if(dragged||!state.started||!ready||focusController?.phase==='zooming-out'||motionMode)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...hotspotObjects.values()].map(h=>h.hit));if(hits.length)selectZone(hits[0].object.userData.zone,hits[0].object.userData.anchorKey);});

function updateStrings(){if(!model)return;model.updateMatrixWorld(true);inverse.copy(model.matrixWorld).invert();for(const [jointName,point,top,meshName] of strings){const joint=joints.get(jointName),mesh=joints.get(meshName);if(!joint||!mesh)continue;stringEnd.fromArray(point);joint.localToWorld(stringEnd).applyMatrix4(inverse);stringTop.fromArray(top);stringDir.copy(stringEnd).sub(stringTop);mesh.position.copy(stringTop).add(stringEnd).multiplyScalar(.5);mesh.scale.y=stringDir.length();mesh.quaternion.setFromUnitVectors(up,stringDir.normalize());}}
function idle(time,dt){
  // Se suaviza al acercar la cámara y al arrastrar; nunca altera el estado de los controles.
  const phase=focusController?.phase;
  const desired=reduced||poseDrag||phase==='zooming-in'||phase==='zooming-out'?0:phase==='open'?.4:motionMode?.65:1;
  ambientWeight+= (desired-ambientWeight)*(1-Math.exp(-dt*(desired?1.8:10)));
  if(reduced||ambientWeight<.0001)return;
  const angles=addAmbientMotion(jointAngles(displayedPose),time-startTime,ambientWeight);
  for(const [name,a] of Object.entries(angles)){
    const node=joints.get(name);if(!node)continue;
    helperE.set(a.x,a.y,a.z);helperQ.setFromEuler(helperE);
    node.quaternion.copy(baseRotations.get(name)).multiply(helperQ);
  }
}
function updateHotspots(){
  const width=stage.clientWidth,height=stage.clientHeight,panelRect=focusController?.phase==='open'&&!$('#zone-panel').hidden?$('#zone-panel').getBoundingClientRect():null,stageRect=panelRect?stage.getBoundingClientRect():null;
  model.updateMatrixWorld(true);
  for(const [,h] of hotspotObjects){h.anchor.getWorldPosition(h.position);projected.copy(h.position).project(camera);h.screen.x=(projected.x*.5+.5)*width;h.screen.y=(-projected.y*.5+.5)*height;h.el.style.left=`${h.screen.x}px`;h.el.style.top=`${h.screen.y}px`;const covered=panelRect&&h.screen.x+stageRect.left>=panelRect.left&&h.screen.x+stageRect.left<=panelRect.right&&h.screen.y+stageRect.top>=panelRect.top&&h.screen.y+stageRect.top<=panelRect.bottom;h.el.style.visibility=covered||projected.z>1||projected.z< -1||Math.abs(projected.x)>1||Math.abs(projected.y)>1?'hidden':'visible';}
  const path=$('#panel-connection');if(state.selected&&!state.closing){const h=hotspotObjects.get(state.selected);if(h){const {x,y}=h.screen;if(innerWidth<=850){path.setAttribute('d',`M${x},${y} C${x+35},${y+70} ${width*.5},${height-50} ${width*.5},${height+12}`);}else{const end=width+24;path.setAttribute('d',`M${x},${y} C${x+70},${y} ${end-70},${height*.31} ${end},${height*.31}`);}}}else path.setAttribute('d','');
}
function frame(ms){
  if(!ready)return;requestAnimationFrame(frame);const time=ms/1000,dt=Math.min(time-(lastTime||time),.05);lastTime=time;
  if(document.hidden)return;
  const manualActive=updateManualPose(dt);
  if(!manualActive&&!reduced&&introAction?.isRunning())mixer.setTime(Math.min(time-introStart,INTRO_DURATION));
  else idle(time,dt);
  updateStrings();
  if(focusController?.phase==='open'&&focusReframeAt&&time>=focusReframeAt&&!poseDrag){focusReframeAt=0;focusController.reframe();}
  if((!focusController?.busy||focusController.phase==='open'&&!focusController.animation)&&Math.abs(rotating)>.0001){const step=reduced?rotating:rotating*Math.min(dt*8,1),orbitTarget=focusController?.busy?controls.target:target;camera.position.sub(orbitTarget).applyAxisAngle(zAxis,step).add(orbitTarget);rotating-=step;}
  const focusing=focusController?.update(time);if(!focusing||focusController.phase==='open'&&!focusController.animation&&controls.enabled)controls.update();updateHotspots();updateJointHandles();updateEdges(time);updateFactorLabels();pigments?.update(time,camera,renderer,{visible:state.started,reduced,paused:flowPaused});updateFocusVisuals(time);renderer.render(scene,camera);
}
media.addEventListener('change',e=>{reduced=e.matches;if(controls)controls.enableDamping=!reduced;if(reduced){introAction?.stop();if(!motionMode&&!poseChanged)for(const [name,q] of baseRotations)joints.get(name)?.quaternion.copy(q);}else{introStart=performance.now()/1000-INTRO_DURATION-1;startTime=introStart;}});
$('#pigment-toggle').onclick=()=>{flowPaused=!flowPaused;document.body.classList.toggle('flow-paused',flowPaused);$('#pigment-toggle').setAttribute('aria-pressed',String(flowPaused));$('#pigment-toggle').textContent=flowPaused?'▷ Reanudar manchas':'Ⅱ Pausar manchas';};
function makeFallback(){for(const [i,id] of zoneIds.entries()){const el=document.createElement('button');el.className='quote-bubble';el.style.cssText=`position:absolute;left:15%;top:${12+i*11}%;width:70%;pointer-events:auto`;el.textContent=`${zones[id].symbol} ${zones[id].name}`;el.onclick=()=>selectZone(id);$('#hotspots').append(el);}$('#stage-status').hidden=true;}

// Diagnóstico de la experiencia sin datos personales.
window.anatomia={get state(){return {ready,started:state.started,selected:state.selected,visited:[...state.visited],connections:state.edges.size,reducedMotion:reduced,focusPhase:focusController?.phase||'free',pigmentMemories:pigments?.memories.size||0};}};
