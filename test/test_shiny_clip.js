// Test für js/shiny_clip.js: Multi-Audio-Quellen, Lautstärke-Mixer, Migration von cfg.audio und Aufräumen.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

function makeNode(tag) {
  const node = {
    tagName: (tag || 'div').toUpperCase(),
    className: '',
    textContent: '',
    value: '',
    min: '',
    max: '',
    step: '',
    type: '',
    checked: false,
    disabled: false,
    selectedIndex: 0,
    title: '',
    children: [],
    listeners: {},
    style: {},
    appendChild(c) {
      this.children.push(c);
      c.parentNode = this;
      if (this.tagName === 'SELECT' && c.tagName === 'OPTION') {
        if (this.children.length === 1 || c.selected) {
          this.value = c.value;
          this.selectedIndex = this.children.length - 1;
        }
      }
      return c;
    },
    get options() { return this.children.filter(c => c.tagName === 'OPTION'); },
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
    dispatch(ev) { (this.listeners[ev] || []).forEach(fn => fn({ target: this })); },
    setAttribute(k, v) { this[k] = v; },
    remove() {},
    querySelector(sel) {
      if (sel.startsWith('.')) return this.find(n => (' ' + (n.className || '') + ' ').includes(' ' + sel.slice(1) + ' '));
      return null;
    },
    querySelectorAll(sel) {
      const out = [];
      const walk = (n) => {
        if (sel.startsWith('.') && (' ' + (n.className || '') + ' ').includes(' ' + sel.slice(1) + ' ')) out.push(n);
        (n.children || []).forEach(walk);
      };
      walk(this);
      return out;
    },
    find(pred) {
      if (pred(this)) return this;
      for (const c of this.children) {
        const hit = c.find ? c.find(pred) : null;
        if (hit) return hit;
      }
      return null;
    }
  };
  let _html = '';
  Object.defineProperty(node, 'innerHTML', {
    get() { return _html; },
    set(v) { _html = String(v); if (v === '') node.children = []; }
  });
  return node;
}

function makeTrack(kind, id) {
  return {
    kind,
    id: id || kind + '-' + Math.random().toString(36).slice(2, 6),
    stopped: false,
    listeners: {},
    stop() { this.stopped = true; },
    clone() { return makeTrack(kind, this.id + '-clone'); },
    applyConstraints() { return Promise.resolve(); },
    addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  };
}

function createEnv() {
  const toasts = [];
  const gains = [];
  let acClosed = false;
  let acCount = 0;

  class FakeMediaStream {
    constructor(tracks) { this._tracks = (tracks || []).slice(); }
    getTracks() { return this._tracks.slice(); }
    getVideoTracks() { return this._tracks.filter(t => t.kind === 'video'); }
    getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio'); }
  }

  class FakeMediaRecorder {
    constructor(stream, opts) {
      this.stream = stream;
      this.mimeType = (opts && opts.mimeType) || 'video/webm';
      this.state = 'inactive';
    }
    static isTypeSupported() { return true; }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; if (this.onstop) this.onstop(); }
  }

  class FakeAudioContext {
    constructor() {
      acCount++;
      this.state = 'running';
      this._destStream = new FakeMediaStream([makeTrack('audio', 'mixed')]);
    }
    resume() { return Promise.resolve(); }
    close() { acClosed = true; return Promise.resolve(); }
    createMediaStreamDestination() { return { stream: this._destStream }; }
    createMediaStreamSource(ms) {
      return {
        stream: ms,
        connected: [],
        disconnected: false,
        connect(target) { this.connected.push(target); },
        disconnect() { this.disconnected = true; }
      };
    }
    createGain() {
      const g = {
        gain: { value: 1 },
        connected: [],
        disconnected: false,
        connect(target) { this.connected.push(target); },
        disconnect() { this.disconnected = true; }
      };
      gains.push(g);
      return g;
    }
  }

  const document = {
    body: makeNode('body'),
    contains() { return true; },
    createTextNode(t) { return { tagName: '#TEXT', textContent: t, children: [] }; },
    createElement(t) { return makeNode(t); }
  };

  const devices = [
    { kind: 'videoinput', deviceId: 'cam1', label: 'Capture Card' },
    { kind: 'audioinput', deviceId: 'mic1', label: 'Mein Mikrofon' },
    { kind: 'audioinput', deviceId: 'disc1', label: 'CABLE Output (Discord)' }
  ];

  const getUserMediaCalls = [];
  const getDisplayMediaCalls = [];

  const navigator = {
    mediaDevices: {
      enumerateDevices() { return Promise.resolve(devices); },
      getUserMedia(constraints) {
        getUserMediaCalls.push(constraints);
        if (constraints.audio && constraints.audio.deviceId && constraints.audio.deviceId.exact === 'broken') {
          return Promise.reject(new Error('Device unplugged'));
        }
        const tracks = [];
        if (constraints.video) tracks.push(makeTrack('video', 'cam-vid'));
        if (constraints.audio) tracks.push(makeTrack('audio', 'in-' + (constraints.audio.deviceId ? constraints.audio.deviceId.exact : 'def')));
        return Promise.resolve(new FakeMediaStream(tracks));
      },
      getDisplayMedia(constraints) {
        getDisplayMediaCalls.push(constraints);
        const tracks = [makeTrack('video', 'disp-vid')];
        if (constraints.audio) tracks.push(makeTrack('audio', 'sys-loopback'));
        return Promise.resolve(new FakeMediaStream(tracks));
      }
    }
  };

  const windowObj = {
    CC: {
      LANG: 'de',
      el(tag, attrs) {
        const n = makeNode(tag);
        if (attrs) Object.keys(attrs).forEach(k => {
          if (k === 'class') n.className = attrs[k];
          else if (k === 'text') n.textContent = attrs[k];
          else n[k] = attrs[k];
        });
        return n;
      },
      toast(m) { toasts.push(m); }
    },
    CCCapture: {
      chooseScreen(cb) { cb({ kind: 'screen', id: 'scr1', label: 'Spiel-Fenster' }); }
    },
    desktop: {
      shiny: {
        chooseSource() {},
        saveClip() { return Promise.resolve({ path: 'clip.mp4' }); }
      }
    },
    AudioContext: FakeAudioContext,
    MediaStream: FakeMediaStream,
    MediaRecorder: FakeMediaRecorder,
    navigator,
    document
  };
  windowObj.window = windowObj;

  const ctx = {
    window: windowObj,
    document,
    navigator,
    MediaStream: FakeMediaStream,
    MediaRecorder: FakeMediaRecorder,
    AudioContext: FakeAudioContext,
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    Promise,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Error,
    Uint8Array,
    Blob: function () {},
    URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
    console
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/shiny_clip.js'), 'utf8'), ctx);
  return {
    Clip: windowObj.CCShinyClip,
    MediaStream: FakeMediaStream,
    toasts,
    gains,
    get acClosed() { return acClosed; },
    get acCount() { return acCount; },
    getUserMediaCalls,
    getDisplayMediaCalls
  };
}

async function run() {
  const plain = (x) => JSON.parse(JSON.stringify(x));
  // 1. Migration & Normalisierung
  {
    const env = createEnv();
    let cfg = env.Clip.init({ audio: 'system' });
    assert.deepStrictEqual(plain(cfg.audioSources), [{ id: 'system', label: '', volume: 1 }]);

    cfg = env.Clip.init({ audio: 'in:mic1' });
    assert.deepStrictEqual(plain(cfg.audioSources), [{ id: 'in:mic1', label: '', volume: 1 }]);

    cfg = env.Clip.init({ audio: '' });
    assert.deepStrictEqual(plain(cfg.audioSources), []);

    cfg = env.Clip.init({
      audioSources: [
        { id: 'system', volume: 0.8 },
        { id: 'system', volume: 0.2 }, // Duplikat
        { id: 'in:mic1', volume: 5 },  // clamp auf 2
        { id: 'in:disc1', volume: -1 }, // clamp auf 0
        { id: 'invalid', volume: 1 }
      ]
    });
    assert.deepStrictEqual(plain(cfg.audioSources), [
      { id: 'system', label: '', volume: 0.8 },
      { id: 'in:mic1', label: '', volume: 2 },
      { id: 'in:disc1', label: '', volume: 0 }
    ]);
  }

  // 2. UI: Mehrere Quellen hinzufügen, Lautstärke live ändern, Quelle entfernen
  {
    const env = createEnv();
    let persisted = 0;
    const cfg = env.Clip.init({
      audioSources: [{ id: 'system', label: '', volume: 1 }]
    }, () => { persisted++; });

    const box = makeNode('div');
    env.Clip.panel(box, {});
    await new Promise(r => setTimeout(r, 20));

    // Dropdown zum Hinzufügen finden (das Select in .clip-audio)
    const audioBox = box.querySelector('.clip-audio');
    assert.ok(audioBox, 'clip-audio Bereich muss gerendert sein');
    const addSel = audioBox.find(n => n.tagName === 'SELECT');
    assert.ok(addSel, 'Audio-Auswahl-Dropdown muss vorhanden sein');

    // mic1 hinzufügen
    const micIdx = addSel.options.findIndex(o => o.value === 'in:mic1');
    assert.ok(micIdx > 0, 'mic1 muss im Dropdown stehen');
    addSel.selectedIndex = micIdx;
    addSel.value = 'in:mic1';
    addSel.dispatch('change');
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(cfg.audioSources.length, 2);
    assert.strictEqual(cfg.audioSources[1].id, 'in:mic1');

    // disc1 hinzufügen
    const addSel2 = box.querySelector('.clip-audio').find(n => n.tagName === 'SELECT');
    const discIdx = addSel2.options.findIndex(o => o.value === 'in:disc1');
    assert.ok(discIdx > 0, 'disc1 muss im Dropdown stehen');
    addSel2.selectedIndex = discIdx;
    addSel2.value = 'in:disc1';
    addSel2.dispatch('change');
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(cfg.audioSources.length, 3);
    const rows = box.querySelectorAll('.clip-audio-row');
    assert.strictEqual(rows.length, 3);

    // Bildschirm-Aufnahme starten -> alle 3 Quellen müssen im AudioContext gemischt werden
    const screenBtn = box.find(n => n.tagName === 'BUTTON' && n.textContent === 'Bildschirm / Fenster');
    screenBtn.dispatch('click');
    await new Promise(r => setTimeout(r, 30));

    assert.strictEqual(env.Clip.active(), true);
    assert.strictEqual(env.acCount, 1);
    assert.strictEqual(env.gains.length, 3);
    assert.strictEqual(env.gains[0].gain.value, 1);

    // Lautstärke für mic1 (Zeile 1) live ändern auf 150 %
    const liveRows = box.querySelectorAll('.clip-audio-row');
    const micSlider = liveRows[1].find(n => n.tagName === 'INPUT' && n.type === 'range');
    micSlider.value = '150';
    micSlider.dispatch('input');
    assert.strictEqual(cfg.audioSources[1].volume, 1.5);
    assert.strictEqual(env.gains[1].gain.value, 1.5);

    // disc1 (Zeile 2) entfernen -> GainNode wird getrennt
    const delBtn = liveRows[2].find(n => n.tagName === 'BUTTON');
    delBtn.dispatch('click');
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(cfg.audioSources.length, 2);
    assert.strictEqual(env.gains[2].disconnected, true);

    // Puffer stoppen -> AudioContext wird geschlossen
    const stopBtn = box.find(n => n.tagName === 'BUTTON' && n.textContent === 'Puffer stoppen');
    stopBtn.dispatch('click');
    assert.strictEqual(env.Clip.active(), false);
    assert.strictEqual(env.acClosed, true);
  }

  // 3. Kamera + Systemton + defektes Mikrofon (graceful fallback)
  {
    const env = createEnv();
    env.Clip.init({
      audioSources: [
        { id: 'system', label: '', volume: 0.7 },
        { id: 'in:broken', label: 'Defekt', volume: 1 },
        { id: 'in:mic1', label: 'Mikro', volume: 1.2 }
      ]
    });
    const box = makeNode('div');
    env.Clip.panel(box, {});
    await new Promise(r => setTimeout(r, 20));

    const camSel = box.querySelector('.det-cam');
    assert.ok(camSel.options.length >= 2, 'Kamera-Option muss geladen sein');
    camSel.selectedIndex = 1;
    camSel.value = 'cam1';
    camSel.dispatch('change');
    await new Promise(r => setTimeout(r, 30));

    assert.strictEqual(env.Clip.active(), true);
    // 2 funktionierende Audio-Quellen (system + mic1), broken hat Toast ausgelöst aber nicht abgebrochen
    assert.strictEqual(env.gains.length, 2);
    assert.strictEqual(env.gains[0].gain.value, 0.7);
    assert.strictEqual(env.gains[1].gain.value, 1.2);
    assert.ok(env.toasts.some(m => m.includes('Defekt')), 'Toast für fehlgeschlagene Tonquelle erwartet');

    const stopBtn = box.find(n => n.tagName === 'BUTTON' && n.textContent === 'Puffer stoppen');
    stopBtn.dispatch('click');
    assert.strictEqual(env.acClosed, true);
  }

  // 4. Automatisches Verbinden mit der Projektor-/Erkennungsquelle (syncDetect & panel)
  {
    const env = createEnv();
    env.Clip.init({ audioSources: [{ id: 'detect', label: '', volume: 0.9 }] });
    const detStream = new env.MediaStream([makeTrack('video', 'proj-v'), makeTrack('audio', 'proj-a')]);
    const box = makeNode('div');
    env.Clip.panel(box, { hunt: () => 'h1', stream: () => detStream });
    await new Promise(r => setTimeout(r, 30));

    assert.strictEqual(env.Clip.active(), true, 'Clips muss automatisch mit aktiver Erkennung/Projektor verbinden');
    assert.strictEqual(env.gains.length, 1);
    assert.strictEqual(env.gains[0].gain.value, 0.9);

    // Manueller Stopp verhindert sofortiges Wiederverbinden bei erneutem panel()-Aufruf derselben Quelle
    const stopBtn = box.find(n => n.tagName === 'BUTTON' && n.textContent === 'Puffer stoppen');
    stopBtn.dispatch('click');
    assert.strictEqual(env.Clip.active(), false);
    env.Clip.panel(box, { hunt: () => 'h1', stream: () => detStream });
    await new Promise(r => setTimeout(r, 20));
    assert.strictEqual(env.Clip.active(), false);

    // Neue Quelle via syncDetect verbindet automatisch wieder
    const detStream2 = new env.MediaStream([makeTrack('video', 'proj-v2'), makeTrack('audio', 'proj-a2')]);
    env.Clip.syncDetect('h1', detStream2);
    await new Promise(r => setTimeout(r, 30));
    assert.strictEqual(env.Clip.active(), true);

    // Trennen der Erkennungsquelle stoppt auch den Clip-Puffer
    env.Clip.syncDetect('h1', null);
    assert.strictEqual(env.Clip.active(), false);
  }

  console.log('ok   test_shiny_clip.js');
}

run().catch((err) => {
  console.error('FAIL test_shiny_clip.js:', err);
  process.exit(1);
});
