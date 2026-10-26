import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ParticleSound,audioTracks,soundLevels} from '../dist/particle-sound.js';
assert.equal(audioTracks.length,3);
for(const track of audioTracks){const bytes=await readFile(new URL('../dist/assets/audio/'+track.file,import.meta.url));assert.ok(bytes.length>10000);assert.equal(bytes.subarray(4,8).toString(),'ftyp','Cada pista es un archivo de audio M4A real');}
for(const phase of [0,.1,.3,.7,1]){
 const body=soundLevels({bodyActive:true,bodyPhase:phase});assert.equal(body.ambient,.4);assert.ok(body.body>0);assert.equal(body.opinion,0);
 const opinion=soundLevels({bodyActive:true,opinionActive:true});assert.equal(opinion.ambient,.4);assert.equal(opinion.body,0);assert.ok(opinion.opinion>0);
 assert.deepEqual(soundLevels({bodyActive:true,opinionActive:true,paused:true}),{ambient:0,body:0,opinion:0});
 assert.deepEqual(soundLevels({bodyActive:true,visible:false}),{ambient:0,body:0,opinion:0});
}
class Param{constructor(){this.value=0;}setTargetAtTime(value,time,decay){assert.ok(Number.isFinite(value)&&Number.isFinite(time)&&decay>0);this.value=value;}}
class Node{constructor(){for(const key of ['gain','pan','threshold','knee','ratio','playbackRate'])this[key]=new Param();}connect(node){return node;}start(when){this.started=when;}}
class Context{
 constructor(){this.state='suspended';this.currentTime=0;this.destination=new Node();this.sources=[];}
 createGain(){return new Node();}createStereoPanner(){return new Node();}createDynamicsCompressor(){return new Node();}
 createBufferSource(){const source=new Node();this.sources.push(source);return source;}
 createOscillator(){throw Error('No se deben sustituir los archivos por tonos sintetizados');}
 async resume(){this.state='running';}
}
let creations=0,loads=0;const context=new Context(),sound=new ParticleSound({createContext:()=>{creations++;return context;},loadBuffer:async()=>{loads++;return {duration:10};}});
assert.equal(creations,0);assert.equal(loads,0,'No hay descargas ni reproducción antes de interactuar');
await Promise.all([sound.unlock(),sound.body('cabeza'),sound.opinion(2)]);
assert.equal(creations,1);assert.equal(loads,3);assert.equal(context.sources.length,3);assert.equal(sound.ready,true);
for(const [i,source] of context.sources.entries()){assert.equal(source.loop,true);assert.equal(source.playbackRate.value,audioTracks[i].rate);assert.equal(source.started,.04);}
for(let i=0;i<120;i++){context.currentTime+=.05;await sound.body('manos');sound.update({body:{phase:(i%56)/56,pan:3},bodyActive:true});}
assert.equal(loads,3);assert.equal(context.sources.length,3,'Se reutilizan los tres bucles al navegar');assert.equal(sound.bodyPan.pan.value,.65);
for(let i=0;i<120;i++){context.currentTime+=.5;sound.update({bodyActive:true});assert.ok(sound.ambientGain.gain.value>0);assert.ok(sound.bodyGain.gain.value>0);}
context.currentTime+=.5;sound.update({bodyActive:true,opinions:{active:true,moving:false,pan:-3}});assert.equal(sound.bodyGain.gain.value,0);assert.ok(sound.opinionGain.gain.value>0);assert.equal(sound.ambientGain.gain.value,.4);
context.currentTime+=.05;sound.update({bodyActive:true,paused:true});assert.equal(sound.master.gain.value,0);
await sound.setEnabled(false);assert.equal(sound.master.gain.value,0);sound.setVisible(false);await sound.setEnabled(true);assert.equal(sound.master.gain.value,0);sound.setVisible(true);assert.equal(sound.master.gain.value,.5);
let mutedCreates=0;const muted=new ParticleSound({enabled:false,createContext:()=>{mutedCreates++;return new Context();}});await muted.body();assert.equal(mutedCreates,0);
let failed=false;const recoveryContext=new Context(),recovery=new ParticleSound({createContext:()=>recoveryContext,loadBuffer:async track=>{if(track.id==='ambient'&&!failed){failed=true;throw Error('Error temporal de red');}return {duration:10};}});
assert.equal(await recovery.unlock(),false);assert.equal(recovery.error,true);assert.equal(recoveryContext.sources.length,0);assert.equal(await recovery.unlock(),true);assert.equal(recoveryContext.sources.length,3);assert.equal(recovery.error,false);
const unavailable=new ParticleSound({createContext:()=>null});assert.equal(await unavailable.unlock(),false);assert.doesNotThrow(()=>unavailable.update({bodyActive:true}));
console.log('Verificado: tres audios reales, descarga por interacción, bucles sin fuentes duplicadas, ambiente continuo, cambio de capas, pausa, silencio y reintento tras un error de red.');
