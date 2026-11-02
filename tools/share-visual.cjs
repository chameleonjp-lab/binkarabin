// Mock-only fixed-head home/result acceptance. No HTTP connection or score send.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engines=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8'),catalogs=JSON.parse(html.match(/<script id="locale-catalogs" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const origin='http://127.0.0.1:4199',publicUrl='https://chameleonjp.codeberg.page/binkarabin/';
async function visible(page,selector){
 const e=page.locator(selector);assert.equal(await e.isVisible(),true);await e.scrollIntoViewIfNeeded();
 const a=await e.evaluate(el=>{
  const r=el.getBoundingClientRect(),epsilon=1;let opacity=1,unclipped=true;
  for(let n=el;n;n=n.parentElement){
   const style=getComputedStyle(n);opacity*=Number(style.opacity);
   if(n===el)continue;const p=n.getBoundingClientRect(),left=p.left+n.clientLeft,top=p.top+n.clientTop;
   if(/hidden|clip|scroll|auto/.test(style.overflowX))unclipped=unclipped&&r.left>=left-epsilon&&r.right<=left+n.clientWidth+epsilon;
   if(/hidden|clip|scroll|auto/.test(style.overflowY))unclipped=unclipped&&r.top>=top-epsilon&&r.bottom<=top+n.clientHeight+epsilon;
  }
  const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
  return{w:r.width,h:r.height,opacity,unclipped,viewport:r.left>=-epsilon&&r.top>=-epsilon&&r.right<=innerWidth+epsilon&&r.bottom<=innerHeight+epsilon,hit:hit===el||el.contains(hit),pointer:getComputedStyle(el).pointerEvents};
 });
 assert.ok(a.w>=44&&a.h>=44,selector+' target');assert.ok(a.opacity>0);assert.ok(a.viewport,selector+' full rect inside viewport');assert.ok(a.unclipped,selector+' full rect inside overflow ancestors');assert.notEqual(a.pointer,'none');assert.equal(a.hit,true);
}
async function main(){const engine=process.env.BROWSER_ENGINE||'chromium';assert.ok(['chromium','webkit'].includes(engine));const browser=await engines[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:402,height:874},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();let scoreAttempts=0;const intents=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await context.routeWebSocket('**/*',socket=>socket.close());
 await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin===origin&&u.pathname==='/'&&['GET','HEAD'].includes(req.method()))return route.fulfill({contentType:'text/html; charset=utf-8',body:req.method()==='HEAD'?'':html});if(u.origin==='https://x.com'&&u.pathname==='/intent/post'&&req.method()==='GET'){intents.push(u.searchParams.get('text'));return route.fulfill({contentType:'text/html',body:'<title>Mock composer</title>'});}if(u.hostname.endsWith('.supabase.co')&&u.pathname.endsWith('/get_best_score_ranking')&&req.method()==='POST')return route.fulfill({json:[]});if(u.pathname.includes('submit')||u.pathname.includes('start')||u.pathname.includes('record_game_play'))scoreAttempts++;return route.abort();});
 await page.addInitScript(()=>{localStorage.setItem('binkarabin:sound','off');localStorage.setItem('binkarabinName','');});await page.goto(origin+'/');
 const home=page.locator('#shareHomeBtn');await home.evaluate(e=>e.style.display='none');await assert.rejects(()=>visible(page,'#shareHomeBtn'));await home.evaluate(e=>e.style.removeProperty('display'));await home.evaluate(e=>e.parentElement.style.opacity='0');await assert.rejects(()=>visible(page,'#shareHomeBtn'));await home.evaluate(e=>e.parentElement.style.removeProperty('opacity'));
 await home.evaluate(e=>{const w=document.createElement('div');w.id='clip-negative';w.style.cssText='overflow:hidden;flex-shrink:0;height:'+(e.getBoundingClientRect().height-8)+'px';e.before(w);w.append(e);});await assert.rejects(()=>visible(page,'#shareHomeBtn'));await home.evaluate(e=>e.parentElement.replaceWith(e));await visible(page,'#shareHomeBtn');
 for(const phase of ['home','clear','retire']){
  if(phase!=='home'){await page.evaluate(retired=>{localStorage.setItem(RESULT_KEY,JSON.stringify({playerName:'',play:null,elapsedMs:12345,moveCount:60,retired,submitStatus:'guest',countStatus:'countRecorded'}));if(!restoreResult())throw Error('fixture restore failed')},phase==='retire');assert.equal(await page.evaluate(()=>state.mode),'RESULT');assert.equal(await page.evaluate(()=>state.play),null);}
  const selector=phase==='home'?'#shareHomeBtn':'#shareResultBtn';
  for(const [lang,catalog]of Object.entries(catalogs)){
   await page.evaluate(lang=>window.gameI18n.setLanguage(lang),lang);
   const frozen=await page.evaluate(()=>({elapsedMs:state.elapsedMs,moveCount:state.moveCount,retired:state.retired,finished:state.finished}));
   for(const viewport of [{width:402,height:874},{width:874,height:402}]){
    await page.setViewportSize(viewport);await visible(page,selector);await visible(page,`#${phase==='home'?'home':'result'}Screen .common-ranking-link`);
    const link=page.locator(selector);assert.equal(await link.textContent(),catalog.shareX);assert.deepEqual(await link.evaluate(e=>({bg:getComputedStyle(e).backgroundColor,fg:getComputedStyle(e).color})),{bg:'rgb(0, 0, 0)',fg:'rgb(255, 255, 255)'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const expected=await page.evaluate(result=>result?t(state.retired?'shareRetire':'shareClear',{game:t('gameTitle'),seconds:(state.elapsedMs/1000).toFixed(3),moves:state.moveCount,url:GAME_URL})+'\n#ビンカラビン #ゲーム制作':[t('gameTitle'),t('shareDescription'),'#ビンカラビン #ゲーム制作',GAME_URL].join('\n'),phase!=='home');
    const before=intents.length,opened=context.waitForEvent('page');await link.tap();const popup=await opened;await popup.waitForURL('https://x.com/intent/post**');assert.equal(new URL(popup.url()).searchParams.get('text'),expected);assert.equal(intents.length,before+1);assert.equal(intents[before],expected);assert.ok(expected.includes(publicUrl));await popup.close();
    await page.evaluate(()=>{window.__shareOpen=window.open;window.open=()=>null;});await link.tap();assert.equal(await page.locator('#commonShareFallback').isVisible(),true);assert.equal(await page.locator('#commonShareText').inputValue(),expected);await page.click('#commonShareClose');await page.evaluate(()=>{window.open=window.__shareOpen;delete window.__shareOpen});assert.equal(intents.length,before+1);assert.equal(await page.locator('#commonShareCopy').isVisible(),false);
    assert.deepEqual(await page.evaluate(()=>({elapsedMs:state.elapsedMs,moveCount:state.moveCount,retired:state.retired,finished:state.finished})),frozen);assert.equal(scoreAttempts,0);
    fs.mkdirSync(path.join(root,'test-artifacts'),{recursive:true});await page.screenshot({path:path.join(root,'test-artifacts',`${engine}-${phase}-${lang}-${viewport.width}x${viewport.height}.png`),fullPage:true});
   }
  }
 }
 assert.deepEqual(errors,[]);assert.equal(scoreAttempts,0);console.log(JSON.stringify({engine,languages:15,orientations:2,phases:3,freshIntentAndFallback:90,scoreAttempts,negativeVisibilityControls:true}));
}finally{await context.close();await browser.close();}}
main().catch(e=>{console.error(e);process.exitCode=1});
