const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8'),catalogs=JSON.parse(html.match(/<script id="locale-catalogs" type="application\/json">([\s\S]*?)<\/script>/)[1]);const server=http.createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html)});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:402,height:874},locale:'ja-JP'});let errors=[],submissions=[],telemetry=[],mode='offline',rankMode='normal',raceCount=0;const ledger=new Map();
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.open=()=>null;window.confirm=()=>true;});
 await page.route('**/*.supabase.co/**',async route=>{
  const fn=route.request().url().split('/').pop(),p=route.request().postDataJSON();assert.notEqual(fn,'submit_score','legacy submission must never retry');
  if(fn==='submit_score_once_shared_v1'){submissions.push(p);const duplicate=ledger.has(p.p_submission_id);ledger.set(p.p_submission_id,p);if(mode==='malformed'){await route.fulfill({json:{}});return;}if(mode==='offline'){await route.fulfill({status:503,json:{code:'offline'}});return;}await route.fulfill({json:[{accepted:true,result_display_name:p.p_display_name,result_normalized_name:p.p_display_name,result_first_score:p.p_score,result_best_score:p.p_score,result_play_count:1,was_duplicate:duplicate}]});return;}
  if(fn==='record_game_play'){telemetry.push(p);await route.fulfill({json:{accepted:true}});return;}
  if(fn==='get_game_play_stats'){await route.fulfill({json:[{player_count:35,total_play_count:50}]});return;}
  if(rankMode==='fail'){await route.fulfill({status:503,json:{code:'offline'}});return;}
  if(rankMode==='malformed'){await route.fulfill({json:[{display_name:'missing score/rank'}]});return;}
  if(rankMode==='empty'){await route.fulfill({json:[]});return;}
  let prefix='Player';if(rankMode==='race'){raceCount++;prefix=raceCount===1?'Stale':'Fresh';await new Promise(r=>setTimeout(r,raceCount===1?200:10));}
  await route.fulfill({json:Array.from({length:35},(_,i)=>({rank_no:i<2?1:i+1,display_name:rankMode==='normal'?(i<2?'同名 <img>':`Player ${i}`):prefix,best_score:12345+i}))});
 });
 await page.goto(`http://127.0.0.1:${server.address().port}`);assert.equal(await page.locator('#homeScreen #playerName').count(),1);
 await page.click('#soundToggle');assert.equal(await page.evaluate(()=>state.audio),null);await page.locator('#soundVolume').fill('0');await page.locator('#soundVolume').dispatchEvent('input');await page.reload();assert.equal(await page.evaluate(()=>soundEnabled),false);assert.equal(await page.evaluate(()=>soundVolume),0);
 for(const lang of Object.keys(catalogs)){
  await page.selectOption('#languageSelect',lang);assert.equal(await page.locator('#shareHomeBtn').textContent(),catalogs[lang].shareX);assert.equal(await page.locator('#nameDisclosure').textContent(),catalogs[lang].nameDisclosure);
  for(const viewport of [{width:402,height:874},{width:874,height:402}]){await page.setViewportSize(viewport);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,lang+' overflow');}
  await page.click('#ruleBtn');assert.equal(await page.locator('[data-i18n="rule4"]').textContent(),catalogs[lang].rule4);await page.click('#ruleBackBtn');
  await page.click('#shareHomeBtn');assert.ok((await page.locator('#commonShareText').inputValue()).includes('https://chameleonjp.codeberg.page/binkarabin/'));await page.click('#commonShareClose');
 }
 await page.setViewportSize({width:402,height:874});await page.selectOption('#languageSelect','en');
 async function begin(name){await page.fill('#playerName',name);await page.click('#startBtn');await page.evaluate(()=>{clearTimeout(state.countdownTimerId);state.mode='PLAYING';state.startTime=performance.now()-12345;state.elapsedMs=12345;setCountdownOverlay('');setStatus('sourcePrompt');});}
 async function solve(){
  await page.evaluate(()=>{
   // The shipped stage has four groups of four equal mixed bottles. Solve via real pour operations.
   for(const firstColor of ['red','purple','lime','gray']){
    const source=state.bottles.map((b,i)=>b.length===4&&b[0]===firstColor?i:-1).filter(i=>i>=0);
    if(source.length!==4)throw Error('Unexpected stage shape');
    for(let level=0;level<3;level++){const target=state.bottles.findIndex(b=>b.length===0);for(const from of source)tryPour(from,target);}
    for(const from of source.slice(1))tryPour(from,source[0]);
   }
  });await page.waitForFunction(()=>state.mode==='RESULT');await page.waitForFunction(()=>document.getElementById('rankingList').children.length===30);
 }
 await begin('');const before=await page.evaluate(()=>({bottles:state.bottles,start:state.startTime,mode:state.mode,moves:state.moveCount,run:state.runId}));await page.evaluate(()=>window.gameI18n.setLanguage('vi'));assert.deepEqual(await page.evaluate(()=>({bottles:state.bottles,start:state.startTime,mode:state.mode,moves:state.moveCount,run:state.runId})),before);
 await solve();assert.equal(await page.evaluate(()=>state.moveCount),60);assert.equal(await page.evaluate(()=>checkClear()),true);assert.equal(submissions.length,0);assert.equal(telemetry.length,1);assert.equal(telemetry[0].p_display_name,'');assert.equal(await page.locator('#submitStatus').textContent(),catalogs.vi.guestResult);await page.click('#resultHomeBtn');
 await begin('   ');await page.click('#retireBtn');await page.waitForFunction(()=>state.mode==='RESULT');assert.equal(submissions.length,0);assert.equal(telemetry.at(-1).p_result_type,'retire');await page.click('#resultHomeBtn');
 await page.fill('#playerName','名 <>&');await page.locator('#playerName').dispatchEvent('keydown',{key:'Enter',isComposing:true});assert.equal(await page.evaluate(()=>state.mode),'HOME');await begin('名 <>&');await page.evaluate(()=>document.getElementById('playerName').value='Later');await solve();await page.waitForFunction(()=>state.submitStatus==='failed');assert.equal(submissions.length,1);assert.equal(submissions[0].p_display_name,'名 <>&');
 const payload=submissions[0],time=await page.evaluate(()=>state.elapsedMs),moves=await page.evaluate(()=>state.moveCount);assert.equal(payload.p_score,Math.round(time));assert.equal(moves,60);const telemetryBefore=telemetry.length;
 await page.reload();await page.waitForFunction(()=>state.mode==='RESULT'&&state.submitStatus==='failed');await page.waitForTimeout(100);assert.deepEqual(submissions.at(-1),payload);assert.equal(telemetry.length,telemetryBefore,'reload must not duplicate separate non-idempotent telemetry');assert.equal(await page.evaluate(()=>state.elapsedMs),time);
 mode='malformed';await page.click('#retrySendBtn');await page.waitForFunction(()=>state.submitStatus==='failed');mode='online';await page.click('#retrySendBtn');await page.waitForFunction(()=>state.submitStatus==='submitted');await page.waitForFunction(()=>!document.getElementById('retryRankingBtn').disabled);assert.equal(ledger.size,1);assert.deepEqual(submissions.at(-1),payload);const count=submissions.length;
 for(const lang of Object.keys(catalogs)){
  await page.evaluate(l=>window.gameI18n.setLanguage(l),lang);assert.equal(await page.evaluate(()=>state.elapsedMs),time);assert.equal(submissions.length,count);assert.equal(await page.locator('#rankingList li').count(),30);assert.equal(await page.locator('#rankingList img').count(),0);
  await page.click('#shareResultBtn');const text=await page.locator('#commonShareText').inputValue();assert.ok(text.includes((time/1000).toFixed(3)));assert.ok(!text.includes('名 <>&'));await page.click('#commonShareClose');
 }
 rankMode='race';await page.evaluate(()=>{void fetchRanking();void fetchRanking();});await page.waitForTimeout(350);assert.equal(await page.locator('#rankingList li').first().locator('span').nth(1).textContent(),'Fresh');
 rankMode='fail';await page.click('#retryRankingBtn');await page.waitForFunction(()=>!document.getElementById('retryRankingBtn').disabled);assert.equal(await page.locator('#rankingReadStatus').textContent(),catalogs.th.rankingLoadFailed);
 rankMode='malformed';await page.click('#retryRankingBtn');await page.waitForFunction(()=>!document.getElementById('retryRankingBtn').disabled);assert.equal(await page.locator('#rankingReadStatus').textContent(),catalogs.th.rankingLoadFailed);
 rankMode='empty';await page.click('#retryRankingBtn');await page.waitForFunction(()=>!document.getElementById('retryRankingBtn').disabled);assert.equal(await page.locator('#rankingList').textContent(),catalogs.th.noRecords);
 await page.click('#resultHomeBtn');await page.fill('#playerName','');await page.locator('#playerName').dispatchEvent('change');await page.reload();assert.equal(await page.locator('#playerName').inputValue(),'');assert.equal(await page.evaluate(()=>soundEnabled),false);assert.equal(await page.evaluate(()=>soundVolume),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({languages:Object.keys(catalogs).length,solved20BottlesIn60Moves:true,guestClearAndRetire:true,snapshotStable:true,lostAckSameId:true,distinctScoreIds:ledger.size,telemetryPreservedWithoutReloadRetry:true,top30:true,rankingRaceFailureEmpty:true,soundOffZeroPreserved:true,productionWrites:0}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
