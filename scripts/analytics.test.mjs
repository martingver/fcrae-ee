import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';

const source = await readFile(new URL('../analytics.js', import.meta.url), 'utf8');
const key = 'rae-sk-analytics-consent-v1';
const id = 'G-WBRDS9YMX5';

function boot({saved, url='https://fcrae.ee/toetajad/', brokenStorage=false}={}) {
  const listeners = {}, windowListeners = {}, scripts = [], cookies = [];
  const nodes = new Map();
  const node = () => ({
    listeners: {}, hidden: false, isConnected: true,
    addEventListener(name, fn) { this.listeners[name] = fn; },
    setAttribute() {}, append() {}, focus() {},
    querySelector(selector) {
      if (!nodes.has(selector)) nodes.set(selector, node());
      return nodes.get(selector);
    }
  });
  let stored = saved === undefined ? null : JSON.stringify(saved), reloaded = false;
  const location = new URL(url);
  location.reload = () => { reloaded = true; };
  const document = {
    title: 'Toeta Rae SK', referrer: 'https://www.facebook.com/path?email=private@example.com',
    createElement: node, body: {append(element) { this.panel = element; }},
    head: {append(element) { scripts.push(element.src); }},
    addEventListener(name, fn) { listeners[name] = fn; },
    querySelector: () => node(),
    get cookie() { return '_ga=old; _ga_WBRDS9YMX5=old; unrelated=keep'; },
    set cookie(value) { cookies.push(value); }
  };
  const window = { addEventListener(name, fn) { windowListeners[name] = fn; } };
  vm.runInNewContext(source, {
    window, document, location, URL, URLSearchParams, Date,
    localStorage: {
      getItem() { if (brokenStorage) throw Error('blocked'); return stored; },
      setItem(_, value) { if (brokenStorage) throw Error('blocked'); stored = value; }
    }
  });
  return {
    window, document, scripts, cookies, listeners, windowListeners,
    click: (selector) => nodes.get(selector).listeners.click(),
    commands: () => (window.dataLayer || []).map(args => Array.from(args)),
    stored: () => JSON.parse(stored), reloaded: () => reloaded,
    setSaved: (value) => { stored = JSON.stringify(value); }
  };
}

test('GA sends nothing until explicit consent, and remembers refusal', () => {
  const site = boot();
  site.listeners['supporter-event']({detail:{event:'cooperation_success'}});
  assert.deepEqual(site.scripts, []);
  assert.deepEqual(site.commands(), []);
  assert.equal(site.document.body.panel.hidden, false);
  site.click('[data-analytics-deny]');
  assert.equal(site.stored().value, 'denied');
  assert.deepEqual(site.scripts, []);
  assert.equal(site.window['ga-disable-' + id], true);
  assert.ok(site.cookies.every(cookie => !cookie.startsWith('unrelated=')));
  const returning = boot({saved:site.stored()});
  assert.equal(returning.document.body.panel.hidden, true);
  assert.deepEqual(returning.scripts, []);
});

test('consented events use only approved names, no form fields or private URL values', () => {
  const site = boot({url:'https://fcrae.ee/toetajad/?email=private@example.com&utm_source=uudis&utm_medium=veeb&utm_campaign=hooaja-lopumang-2026#secret'});
  site.click('[data-analytics-allow]');
  assert.deepEqual(site.scripts, ['https://www.googletagmanager.com/gtag/js?id='+id]);
  site.listeners['supporter-event']({detail:{event:'cooperation_success',email:'private@example.com',message:'SECRET'}});
  site.listeners['supporter-event']({detail:{event:'private@example.com'}});
  const commands = site.commands();
  assert.equal(commands.filter(c=>c[0]==='event').length, 2);
  assert.equal(commands[0][0], 'consent');
  assert.equal(commands[0][2].ad_user_data, 'denied');
  assert.equal(commands.find(c=>c[0]==='config')[2].send_page_view, false);
  assert.equal(commands.at(-1)[1], 'cooperation_success');
  assert.equal(commands.at(-1)[2].page_referrer, 'https://www.facebook.com/');
  assert.match(commands.at(-1)[2].page_location,/utm_source=uudis/);
  assert.doesNotMatch(JSON.stringify(commands),/private|SECRET|secret/);
  site.click('[data-analytics-deny]');
  const count = site.commands().length;
  site.listeners['supporter-event']({detail:{event:'cooperation_success'}});
  assert.equal(site.commands().length, count);
  assert.equal(site.window['ga-disable-'+id],true);
  assert.equal(site.reloaded(),true);
});

test('expired/malformed consent and blocked storage fail closed; localhost never loads GA', () => {
  for (const saved of [{value:'granted',at:1},{value:'yes',at:Date.now()},{value:'granted',at:Date.now()+10000}]) {
    assert.deepEqual(boot({saved}).scripts, []);
  }
  const blocked = boot({brokenStorage:true});
  assert.deepEqual(blocked.scripts, []);
  assert.doesNotThrow(()=>blocked.click('[data-analytics-deny]'));
  const local = boot({url:'http://localhost:4173/',saved:{value:'granted',at:Date.now()}});
  assert.deepEqual(local.scripts, []);
});

test('consent withdrawal in another tab stops measurement and removes GA cookies', () => {
  const site = boot({saved:{value:'granted',at:Date.now()}});
  site.setSaved({value:'denied',at:Date.now()});
  site.windowListeners.storage({key});
  assert.equal(site.window['ga-disable-'+id],true);
  assert.equal(site.reloaded(),true);
  assert.ok(site.cookies.some(cookie=>cookie.startsWith('_ga=')));
});

test('every public page loads one shared consent implementation with current styling', async () => {
  const files = execFileSync('git',['ls-files','*.html'],{encoding:'utf8'}).trim().split(/\r?\n/);
  for (const file of files) {
    const html = await readFile(new URL('../'+file,import.meta.url),'utf8');
    assert.equal((html.match(/src="\/analytics\.js\?v=20261021-consent"/g)||[]).length,1,file);
    assert.match(html,/styles\.css\?v=20261021-consent/,file);
    assert.doesNotMatch(html,/src="https:\/\/(www\.)?(googletagmanager|google-analytics)\.com/,file);
  }
});
