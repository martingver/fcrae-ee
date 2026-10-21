import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createSiteServer} from './static-server.mjs';
import {mkdir} from 'node:fs/promises';
// Run with Playwright available in node_modules or through NODE_PATH.
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
await mkdir(new URL('../output/',import.meta.url),{recursive:true});
const server=createSiteServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=process.env.VERIFY_BASE||`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch();
try {
 for(const [width,height] of [[320,568],[390,844],[768,1024],[844,390],[1440,900]]) {
  const ctx=await browser.newContext({viewport:{width,height},locale:'en-US'});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [name,path] of [['home','/'],['supporters','/toetajad/'],['news','/uudised/hooaja-viimane-kodumang-2026/']]) {
   await page.goto(base+path,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const panel=page.locator('.analytics-consent');const box=await panel.boundingBox();
   assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);
   assert(box.width<=440);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const states=await page.locator('.analytics-consent-actions button').evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,bg:s.backgroundColor,color:s.color,font:s.fontSize};}));
   assert.deepEqual(states[0],states[1],'Both consent choices have equal geometry and styling');
   assert(states[0].height>=44&&states[0].width>=44);
   await panel.locator('summary').focus();await page.keyboard.press('Enter');
   const focus=await panel.locator('summary').evaluate(el=>{const r=el.getBoundingClientRect(),p=el.closest('.analytics-consent-copy').getBoundingClientRect(),s=getComputedStyle(el);return {left:r.left-parseFloat(s.outlineWidth)-parseFloat(s.outlineOffset),boundary:p.left};});
   assert(focus.left>=focus.boundary-0.5,JSON.stringify({width,height,name,focus}));
   assert(await panel.locator('details').evaluate(el=>el.open));
   for(const button of await panel.locator('.analytics-consent-actions button').all()){
    const r=await button.boundingBox();assert(r.y>=0&&r.y+r.height<=height,'Decision stays visible with expanded details');
   }
   const copy=await panel.locator('.analytics-consent-copy').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight}));
   if(height<=568)assert(copy.scroll>copy.height,'Long detail text scrolls inside the card');
   await page.keyboard.press('Enter');
   assert(!(await panel.locator('details').evaluate(el=>el.open)));
   if(name==='home'&&(width===390||width===1440)) {
    await panel.locator('h2').click();
    await page.screenshot({path:`output/consent-new-home-${width}.png`});
    if(width===1440)await panel.screenshot({path:'output/consent-new-card.png'});
   }
  }
  assert.deepEqual(errors,[]);await ctx.close();console.log(`PASS ${width}x${height}: homepage/supporters/news; compact card, equal buttons, expanded details scroll, decisions visible, keyboard disclosure, no overflow`);
 }
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
