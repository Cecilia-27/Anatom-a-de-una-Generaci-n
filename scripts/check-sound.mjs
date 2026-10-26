import assert from 'node:assert/strict';
import {ParticleSound,pigmentNoise,soundLevels} from '../dist/particle-sound.js';
const noise=pigmentNoise(48000);
assert.deepEqual(noise,pigmentNoise(48000));assert.ok(noise.some(v=>Math.abs(v)>.05));assert.ok(noise.every(v=>Number.isFinite(v)&&Math.abs(v)<=1));
for(const phase of [0,.1,.3,.7,1]){
  const body=soundLevels({bodyActive:true,bodyPhase:phase});assert.ok(body.body>0&&body.body<.5);assert.equal(body.opinion,0);
  const opinion=soundLevels({bodyActive:true,opinionActive:true,opinionMoving:true,opinionPhase:phase});assert.equal(opinion.body,0);assert.ok(opinion.opinion>0&&opinion.opinion<.14);
  assert.deepEqual(soundLevels({bodyActive:true,opinionActive:true,opinionMoving:true,paused:true}),{body:0,opinion:0});
  assert.deepEqual(soundLevels({bodyActive:true,visible:false}),{body:0,opinion:0});
}
assert.equal(soundLevels({opinionActive:true,opinionMoving:false}).opinion,0);
assert.ok(soundLevels({bodyActive:false,bodyAccent:.8}).body>0,'La selección conserva un acento breve aunque el movimiento esté reducido');
assert.ok(soundLevels({opinionActive:true,opinionMoving:false,accent:.8}).opinion>0);
class Param{constructor(){this.value=0;}setTargetAtTime(value,time,decay){assert.ok(Number.isFinite(value)&&Number.isFinite(time)&&decay>0);this.value=value;}}
class Node{constructor(){for(const key of ['gain','frequency','pan','Q','threshold','knee','ratio'])this[key]=new Param();}connect(node){return node;}start(){}}
class Context{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination=new Node();this.sources=0;}
  createGain(){return new Node();}createStereoPanner(){return new Node();}createDynamicsCompressor(){return new Node();}createBiquadFilter(){return new Node();}
  createOscillator(){this.sources++;return new Node();}createBufferSource(){this.sources++;return new Node();}
  createBuffer(channels,length){return {length,copyToChannel(samples){assert.equal(samples.length,length);}};}
  async resume(){this.state='running';}
}
let creations=0;const context=new Context(),sound=new ParticleSound({createContext:()=>{creations++;return context;}});
assert.equal(creations,0,'Cargar el módulo no crea ni reproduce audio');
await sound.body('cabeza');assert.equal(creations,1);assert.equal(context.sources,4);
for(let i=0;i<120;i++){context.currentTime+=.05;await sound.body(i%2?'pecho':'manos');sound.update({body:{phase:(i%56)/56,pan:3},bodyActive:true});}
assert.equal(creations,1);assert.equal(context.sources,4,'Cambiar de zona reutiliza las voces sin acumular fuentes');assert.equal(sound.bodyPan.pan.value,.75);
await sound.opinion(2);context.currentTime+=.5;sound.update({opinions:{active:true,moving:false,phase:1,pan:-3}});assert.ok(sound.opinionGain.gain.value>0);assert.equal(sound.bodyGain.gain.value,0);
context.currentTime+=.05;sound.update({body:{phase:.5},bodyActive:true,paused:true});assert.equal(sound.bodyGain.gain.value,0);assert.equal(sound.opinionGain.gain.value,0);
await sound.setEnabled(false);assert.equal(sound.master.gain.value,0);sound.setVisible(false);await sound.setEnabled(true);assert.equal(sound.master.gain.value,0);sound.setVisible(true);assert.equal(sound.master.gain.value,.24);
let mutedCreations=0;const muted=new ParticleSound({enabled:false,createContext:()=>{mutedCreations++;return new Context();}});await muted.body('cabeza');assert.equal(mutedCreations,0);
const unavailable=new ParticleSound({createContext:()=>null});assert.equal(await unavailable.unlock(),false);assert.doesNotThrow(()=>unavailable.update({bodyActive:true}));
console.log('Verificado: dos timbres, sincronía de movimiento, pausa y pestaña oculta, silencio persistente, inicio por interacción y cuatro fuentes reutilizadas sin acumulación.');
