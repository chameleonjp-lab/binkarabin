import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=html.split('// Saved sound settings are separate from names and scores.')[1].split('// End saved sound settings.')[0];
function setup(saved={},supported=true){
 let created=0,now=0;const listeners={},els=new Map();
 const node=()=>({frequency:{value:0},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){},start(){},stop(at){if(at===undefined)this.onended?.();}});
 class Audio {constructor(){created++;this.state='running';this.currentTime=0;this.destination={};}createGain(){return node();}createOscillator(){return node();}suspend(){this.state='suspended';return Promise.resolve();}resume(){this.state='running';return Promise.resolve();}}
 const document={hidden:false,documentElement:{},querySelectorAll:()=>[],getElementById:id=>id==='locale-catalogs'?{textContent:html.match(/<script id="locale-catalogs" type="application\/json">([\s\S]*?)<\/script>/)[1]}:null,addEventListener(k,f){listeners[k]=f;}};
 const ctx=vm.createContext({state:{audio:null},navigator:{languages:['ja']},document,window:supported?{AudioContext:Audio}:{},localStorage:{getItem:k=>saved[k]??null,setItem:(k,v)=>saved[k]=v},$:id=>{if(!els.has(id))els.set(id,{dataset:{},addEventListener(){},setAttribute(){}});return els.get(id);},performance:{now:()=>now},Number,Math,Set});
 vm.runInContext(html.match(/<script id="localization">([\s\S]*?)<\/script>/)[1],ctx);
 vm.runInContext('const setText=window.gameI18n.text;'+code+';globalThis.api={setSoundEnabled,setSoundVolume,resumeAudio,playSound,get:()=>({enabled:soundEnabled,volume:soundVolume,nodes:soundNodes.size})};',ctx);
 return {api:ctx.api,document,listeners,saved,created:()=>created,tick:()=>now+=100};
}
test('first visit defaults on with nonzero volume but no audio context',()=>{const x=setup();assert.equal(x.api.get().enabled,true);assert.equal(x.api.get().volume,.5);assert.equal(x.created(),0);});
test('saved off and zero survive reload and do not initialize audio',()=>{for(const saved of [{'binkarabin:sound':'off'},{'binkarabin:volume':'0'}]){const x=setup(saved);x.api.resumeAudio();assert.equal(x.created(),0);assert.ok(!x.api.get().enabled||x.api.get().volume===0);}});
test('first action off is applied before initialization',()=>{const x=setup();x.api.setSoundEnabled(false);assert.equal(x.created(),0);assert.equal(x.saved['binkarabin:sound'],'off');});
test('explicit zero persists and missing AudioContext never blocks play',()=>{const x=setup({},false);assert.doesNotThrow(()=>x.api.resumeAudio());x.api.setSoundVolume(0);assert.equal(setup(x.saved).api.get().volume,0);});
test('rapid taps are limited; final result replaces previous sound and hide stops it',()=>{const x=setup();x.api.resumeAudio();x.api.playSound('select');x.api.playSound('select');assert.equal(x.api.get().nodes,1);x.api.playSound('clear');assert.equal(x.api.get().nodes,1);x.document.hidden=true;x.listeners.visibilitychange();assert.equal(x.api.get().nodes,0);x.api.setSoundEnabled(false);x.document.hidden=false;x.listeners.visibilitychange();x.tick();x.api.playSound('pour');assert.equal(x.api.get().nodes,0);});
