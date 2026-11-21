// 3D-сцены сайта на three.js: гараж с машиной (главная), гаражные ковры (подбор, товар), антибукса (товар).
// Размеры из характеристик: ширина полосы 500 мм, борт 45 мм, толщина 5 мм; антибукса 940 × 200 × 27 мм, шипы 7 мм.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C = { rubber: 0x1c1e22, rubber2: 0x2a2d33, floor: 0xe6e3dc, wall: 0xf1efea, tag: 0xd8262b, acc: 0x2457e6, body: 0x2b3038, glass: 0x1a1e24, rim: 0xc9ccd2 };

type Label = { el: HTMLElement; at: THREE.Vector3 };

function base(host: HTMLElement, opts: { fov?: number } = {}) {
  const canvasWrap = host.querySelector<HTMLElement>('.s3d-canvas') || host;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  canvasWrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 32, 1, 0.05, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfc8bb, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 2.1);
  sun.position.set(4, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 30 });
  sun.shadow.radius = 6;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.6);
  fill.position.set(-5, 3, -2);
  scene.add(fill);
  const labels: Label[] = [];
  const v = new THREE.Vector3();
  const size = () => {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  };
  const placeLabels = () => {
    const w = canvasWrap.clientWidth, h = canvasWrap.clientHeight;
    for (const l of labels) {
      v.copy(l.at).project(camera);
      l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      l.el.style.opacity = v.z < 1 ? '1' : '0';
    }
  };
  const label = (text: string, at: THREE.Vector3, cls = '') => {
    const el = document.createElement('span');
    el.className = 's3d-lbl ' + cls;
    el.innerHTML = `<i></i><b>${text}</b>`;
    canvasWrap.appendChild(el);
    const l = { el, at };
    labels.push(l);
    return l;
  };
  new ResizeObserver(() => { size(); render(); }).observe(canvasWrap);
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvasWrap);
  const render = () => { renderer.render(scene, camera); placeLabels(); };
  size();
  return { renderer, scene, camera, sun, label, render, size, isVisible: () => visible && !document.hidden, wrap: canvasWrap };
}

const rubber = (c = C.rubber) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0.02 });

// Одна полоса гаражного ковра: основание, борта, канавки, заезд, упор, бирка. Ось Z — длина, начало у заезда.
function garageStrip(len: number) {
  const g = new THREE.Group();
  const W = 0.5, H = 0.045, T = 0.005, rimW = 0.028;
  const m = rubber(), m2 = rubber(C.rubber2);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(W, T, len), m);
  plate.position.set(0, T / 2, len / 2);
  g.add(plate);
  for (const s of [-1, 1]) {
    const rim = new THREE.Mesh(new RoundedBoxGeometry(rimW, H, len, 2, 0.008), m);
    rim.position.set(s * (W / 2 - rimW / 2), H / 2, len / 2);
    g.add(rim);
  }
  // продольные канавки — тонкие рёбра
  const ribs = 9, ribGeo = new THREE.BoxGeometry(0.008, 0.004, len - 0.5);
  const inst = new THREE.InstancedMesh(ribGeo, m2, ribs);
  const o = new THREE.Object3D();
  for (let i = 0; i < ribs; i++) {
    o.position.set(-W / 2 + rimW + 0.03 + i * ((W - 2 * rimW - 0.06) / (ribs - 1)), T + 0.002, len / 2 + 0.05);
    o.updateMatrix();
    inst.setMatrixAt(i, o.matrix);
  }
  g.add(inst);
  // заезд — клин спереди
  const ramp = new THREE.Shape();
  ramp.moveTo(0, 0); ramp.lineTo(0.22, 0); ramp.lineTo(0.22, H * 0.55); ramp.quadraticCurveTo(0.08, H * 0.5, 0, 0.004); ramp.lineTo(0, 0);
  const rampGeo = new THREE.ExtrudeGeometry(ramp, { depth: W, bevelEnabled: false });
  rampGeo.rotateY(-Math.PI / 2);
  rampGeo.translate(W / 2, 0, -0.22);
  const rampM = new THREE.Mesh(rampGeo, m);
  rampM.position.z = 0.22 - 0.2;
  g.add(rampM);
  // упор в конце
  const stop = new THREE.Mesh(new RoundedBoxGeometry(W, 0.075, 0.14, 3, 0.03), m);
  stop.position.set(0, 0.0375, len - 0.07);
  g.add(stop);
  // бирка
  const tag = new THREE.Mesh(new RoundedBoxGeometry(0.11, 0.012, 0.035, 2, 0.005), new THREE.MeshStandardMaterial({ color: C.tag, roughness: 0.45 }));
  tag.position.set(0, T + 0.006, 0.34);
  g.add(tag);
  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

function garagePair(len: number, gap = 1.1) {
  const pair = new THREE.Group();
  const a = garageStrip(len), b = garageStrip(len);
  a.position.x = -gap / 2 - 0.25; b.position.x = gap / 2 + 0.25;
  pair.add(a, b);
  return pair;
}

// Обобщённая машина: профиль сбоку с колёсными арками, выдавлен по ширине. Перед — к +Z.
function car() {
  const g = new THREE.Group();
  const L = 4.4, Wd = 1.62, FW = -1.36, RW = 1.34, R = 0.34, ARC = 0.43, BOT = 0.3;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, BOT + 0.06);
  s.lineTo(FW - ARC, BOT);
  s.absarc(FW, R, ARC, Math.PI, 0, true);
  s.lineTo(RW - ARC, BOT);
  s.absarc(RW, R, ARC, Math.PI, 0, true);
  s.lineTo(L / 2, BOT + 0.04);
  s.lineTo(L / 2, 0.74);
  s.quadraticCurveTo(L / 2, 0.97, 1.85, 1.02);
  s.quadraticCurveTo(1.45, 1.39, 0.95, 1.43);
  s.lineTo(-0.15, 1.45);
  s.quadraticCurveTo(-0.7, 1.43, -1.05, 1.0);
  s.lineTo(-L / 2 + 0.3, 0.9);
  s.quadraticCurveTo(-L / 2 + 0.02, 0.86, -L / 2, 0.72);
  s.lineTo(-L / 2, BOT + 0.06);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: Wd - 0.14, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 5, curveSegments: 24 });
  bodyGeo.translate(0, 0, -(Wd - 0.14) / 2);
  bodyGeo.rotateY(Math.PI / 2);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x8c96a3, roughness: 0.28, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.12 });
  g.add(new THREE.Mesh(bodyGeo, paint));
  // стёкла
  const w = new THREE.Shape();
  w.moveTo(-0.93, 1.04); w.quadraticCurveTo(-0.6, 1.37, -0.15, 1.385); w.lineTo(0.92, 1.37); w.quadraticCurveTo(1.34, 1.33, 1.66, 1.05); w.lineTo(-0.93, 1.04);
  const wGeo = new THREE.ExtrudeGeometry(w, { depth: Wd + 0.005, bevelEnabled: false, curveSegments: 16 });
  wGeo.translate(0, 0, -(Wd + 0.005) / 2);
  wGeo.rotateY(Math.PI / 2);
  g.add(new THREE.Mesh(wGeo, new THREE.MeshPhysicalMaterial({ color: 0x20262e, roughness: 0.05, metalness: 0.3, clearcoat: 1 })));
  // стойка между окнами
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(Wd + 0.01, 0.34, 0.07), paint);
  pillar.position.set(0, 1.2, -0.2);
  g.add(pillar);
  // бамперы и пороги — тёмный пластик
  const plastic = new THREE.MeshStandardMaterial({ color: 0x24272c, roughness: 0.7 });
  for (const z of [L / 2 + 0.04, -L / 2 - 0.04]) { const b = new THREE.Mesh(new RoundedBoxGeometry(Wd - 0.05, 0.16, 0.12, 2, 0.04), plastic); b.position.set(0, 0.42, z); g.add(b); }
  for (const x of [-Wd / 2 - 0.02, Wd / 2 + 0.02]) { const sill = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.08, 1.75, 2, 0.02), plastic); sill.position.set(x, 0.36, -0.02); g.add(sill); }
  // фары и фонари
  for (const sx of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.36, 0.1, 0.06, 2, 0.025), new THREE.MeshStandardMaterial({ color: 0xf4f4ee, emissive: 0x8a8a80, roughness: 0.15 }));
    hl.position.set(sx, 0.8, L / 2 + 0.04); g.add(hl);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.08, 0.06, 2, 0.025), new THREE.MeshStandardMaterial({ color: 0xc0262b, emissive: 0x3a0606, roughness: 0.3 }));
    tl.position.set(sx, 0.88, -L / 2 - 0.03); g.add(tl);
  }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.12, 0.01), new THREE.MeshStandardMaterial({ color: 0xf2f2ee, roughness: 0.6 }));
  plate.position.set(0, 0.6, -L / 2 - 0.075); g.add(plate);
  const wheels: THREE.Object3D[] = [];
  const tire = new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.92 });
  const rimM = new THREE.MeshStandardMaterial({ color: 0xd3d6db, roughness: 0.25, metalness: 0.85 });
  for (const [x, z] of [[-0.74, -FW], [0.74, -FW], [-0.74, -RW], [0.74, -RW]]) {
    const wh = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(R - 0.09, 0.09, 14, 40), tire);
    t.rotation.y = Math.PI / 2;
    const tread = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.2, 40, 1, true), tire);
    tread.rotation.z = Math.PI / 2;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.21, 24), rimM);
    disc.rotation.z = Math.PI / 2;
    wh.add(t, tread, disc);
    for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.215, 0.05, 0.16), rimM); sp.rotation.x = (k / 5) * Math.PI * 2; wh.add(sp); }
    wh.position.set(x, R, z);
    g.add(wh);
    wheels.push(wh);
  }
  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return { g, wheels, frontZ: -FW };
}

function floor(scene: THREE.Scene, w = 14, d = 14) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: C.floor, roughness: 0.95 }));
  f.rotation.x = -Math.PI / 2;
  f.receiveShadow = true;
  scene.add(f);
  // швы плитки
  const lines = new THREE.Group();
  const lm = new THREE.MeshBasicMaterial({ color: 0xd8d4cb });
  for (let i = -w / 2; i <= w / 2; i += 0.6) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.01, d), lm); l.rotation.x = -Math.PI / 2; l.position.set(i, 0.0005, 0); lines.add(l); }
  for (let i = -d / 2; i <= d / 2; i += 0.6) { const l = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.01), lm); l.rotation.x = -Math.PI / 2; l.position.set(0, 0.0005, i); lines.add(l); }
  scene.add(lines);
  return f;
}

const ease = (t: number) => 1 - Math.pow(1 - t, 3);

// ---------- Главная: гараж, машина заезжает и встаёт у упора ----------
// Ось Z к зрителю. Стена за упором, полосы тянутся от стены к зрителю, машина въезжает передом к стене.
function sceneGarage(host: HTMLElement) {
  const B = base(host, { fov: 30 });
  let len = Number(host.dataset.len || 5);
  floor(B.scene);
  const WALL = -0.75, STOP = -0.5;
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 5), new THREE.MeshStandardMaterial({ color: C.wall, roughness: 1 }));
  wall.position.set(0, 2.5, WALL);
  wall.receiveShadow = true;
  B.scene.add(wall);
  const world = new THREE.Group();
  B.scene.add(world);
  let pair = garagePair(len);
  const fix = () => { pair.rotation.y = Math.PI; pair.position.set(0, 0, STOP + len); };
  world.add(pair); fix();
  const c = car();
  c.g.rotation.y = Math.PI;
  c.g.position.y = 0.005;
  B.scene.add(c.g);
  const parkedZ = () => STOP + 0.14 + 0.34 - 0.03 + c.frontZ;
  const lblSide = B.label('Борт 45 мм', new THREE.Vector3(), 'acc');
  const lblStop = B.label('Упор', new THREE.Vector3(0.8, 0.1, STOP + 0.07));
  const lblW = B.label('Ширина 500 мм', new THREE.Vector3());
  const relabel = () => { lblSide.at.set(-1.06, 0.05, STOP + len * 0.9); lblW.at.set(0.8, 0.03, STOP + len - 0.12); };
  relabel(); void lblStop;
  const target = new THREE.Vector3(0, 0.45, 0);
  let az = 0.66, el = 0.3;
  const dist = () => 7.0 + len * 0.5;
  const setCam = () => {
    target.z = STOP + len * 0.48;
    const d = dist();
    B.camera.position.set(target.x + Math.sin(az) * Math.cos(el) * d, target.y + Math.sin(el) * d, target.z + Math.cos(az) * Math.cos(el) * d);
    B.camera.lookAt(target);
  };
  setCam();
  let mx = 0, my = 0, cx = 0, cy = 0;
  if (!reduce) host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });
  host.addEventListener('pointerleave', () => { mx = 0; my = 0; });
  const startZ = () => STOP + len + 4.5;
  let t0 = performance.now();
  const dur = 3400;
  c.g.position.z = reduce ? parkedZ() : startZ();
  if (reduce) { B.render(); host.classList.add('s3d-ready'); }
  document.addEventListener('len', (e: any) => {
    len = e.detail.len; world.remove(pair); pair = garagePair(len); world.add(pair); fix(); relabel(); setCam();
    c.g.position.z = reduce ? parkedZ() : startZ(); t0 = performance.now(); if (reduce) B.render();
  });
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (reduce || !B.isVisible()) return;
    const k = Math.min(1, (now - t0) / dur), e = ease(k);
    const z = startZ() + (parkedZ() - startZ()) * e;
    const dz = z - c.g.position.z;
    c.g.position.z = z;
    c.wheels.forEach((w) => (w.rotation.x -= dz / 0.33));
    c.g.rotation.x = k < 1 ? 0 : Math.sin(Math.min(1, (now - t0 - dur) / 500) * Math.PI) * 0.012;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05;
    az = 0.66 + cx * 0.5; el = 0.3 - cy * 0.12;
    setCam();
    B.render();
    if (k > 0.02) host.classList.add('s3d-ready');
  };
  requestAnimationFrame(loop);
}

// ---------- Ковры отдельно: вращение мышью, длина по кнопкам ----------
function sceneMats(host: HTMLElement) {
  const B = base(host, { fov: 30 });
  let len = Number(host.dataset.len || 5);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.16 }));
  sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; B.scene.add(sh);
  let pair = garagePair(len, 0.9);
  const grp = new THREE.Group(); grp.add(pair); B.scene.add(grp);
  const center = () => { pair.position.z = -len / 2; };
  center();
  // размерная линия длины
  const dimM = new THREE.LineBasicMaterial({ color: C.acc });
  let dim = new THREE.Line(new THREE.BufferGeometry(), dimM); B.scene.add(dim);
  const lblL = B.label('', new THREE.Vector3(), 'acc big');
  const lblH = B.label('Борт 45 мм', new THREE.Vector3());
  const lblS = B.label('Упор', new THREE.Vector3());
  const update = () => {
    const x = 1.2;
    dim.geometry.dispose();
    dim.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0.01, -len / 2), new THREE.Vector3(x, 0.01, len / 2), new THREE.Vector3(x - 0.08, 0.01, len / 2), new THREE.Vector3(x + 0.08, 0.01, len / 2), new THREE.Vector3(x, 0.01, len / 2), new THREE.Vector3(x, 0.01, -len / 2), new THREE.Vector3(x - 0.08, 0.01, -len / 2), new THREE.Vector3(x + 0.08, 0.01, -len / 2)]);
    lblL.el.querySelector('b')!.textContent = `${String(len).replace('.', ',')} м`;
    lblL.at.set(x + 0.05, 0.02, 0);
    lblH.at.set(-0.95 - 0.25, 0.05, -len / 2 + len * 0.3);
    lblS.at.set(0.7, 0.08, len / 2 - 0.07);
  };
  update();
  const controls = new OrbitControls(B.camera, B.renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 3; controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI / 2.15; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.6;
  const fit = () => { const d = 3.0 + len * 1.45; B.camera.position.set(d * 0.6, d * 0.52, d * 0.6); controls.target.set(0.25, 0, 0); controls.update(); };
  fit();
  controls.addEventListener('start', () => (controls.autoRotate = false));
  let scaleAnim = 1;
  document.addEventListener('len', (e: any) => {
    len = e.detail.len; grp.remove(pair); pair = garagePair(len, 0.9); grp.add(pair); center(); update(); fit();
    scaleAnim = reduce ? 1 : 0.85; B.render();
  });
  controls.addEventListener('change', () => reduce && B.render());
  const loop = () => {
    requestAnimationFrame(loop);
    if (!B.isVisible()) return;
    if (scaleAnim < 1) { scaleAnim = Math.min(1, scaleAnim + 0.012); grp.scale.set(1, 1, 0.85 + 0.15 * ease((scaleAnim - 0.85) / 0.15)); }
    controls.update();
    B.render();
  };
  B.render(); host.classList.add('s3d-ready');
  if (!reduce) loop(); else controls.addEventListener('change', B.render);
}

// ---------- Антибукса: лента с шипами сверху и протектором снизу ----------
function tape() {
  const g = new THREE.Group();
  const L = 0.94, W = 0.2, H = 0.012;
  const m = rubber(0x202226);
  const plate = new THREE.Mesh(new RoundedBoxGeometry(W, H, L, 3, 0.004), m);
  plate.position.y = H / 2 + 0.01;
  g.add(plate);
  // шипы 7 мм сеткой
  const spike = new THREE.CylinderGeometry(0.0035, 0.0065, 0.009, 8);
  const nx = 9, nz = 40;
  const inst = new THREE.InstancedMesh(spike, rubber(0x4a4f58), nx * nz);
  const o = new THREE.Object3D(); let i = 0;
  for (let a = 0; a < nz; a++) for (let b = 0; b < nx; b++) {
    o.position.set(-W / 2 + 0.016 + b * ((W - 0.032) / (nx - 1)) + (a % 2 ? 0.006 : 0), 0.01 + H + 0.0035, -L / 2 + 0.02 + a * ((L - 0.04) / (nz - 1)));
    o.updateMatrix(); inst.setMatrixAt(i++, o.matrix);
  }
  g.add(inst);
  // протектор снизу — ёлочка
  const lug = new THREE.BoxGeometry(0.09, 0.01, 0.014);
  const lugs = new THREE.InstancedMesh(lug, m, 2 * 24);
  i = 0;
  for (let a = 0; a < 24; a++) for (const s of [-1, 1]) {
    o.position.set(s * 0.048, 0.005, -L / 2 + 0.03 + a * ((L - 0.06) / 23)); o.rotation.set(0, s * 0.5, 0); o.updateMatrix(); lugs.setMatrixAt(i++, o.matrix);
  }
  g.add(lugs);
  // скос-заезд с одного конца
  g.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

function sceneTape(host: HTMLElement) {
  const B = base(host, { fov: 28 });
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.18 }));
  sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; B.scene.add(sh);
  const a = tape(), b = tape();
  a.position.set(-0.14, 0, 0); b.position.set(0.14, 0.0, 0.06); b.rotation.y = 0.08;
  B.scene.add(a, b);
  B.label('940 мм', new THREE.Vector3(-0.27, 0.03, 0), 'acc big');
  B.label('Шипы 7 мм', new THREE.Vector3(0.14, 0.035, -0.32));
  B.label('Ширина 200 мм', new THREE.Vector3(0.14, 0.03, 0.55));
  const controls = new OrbitControls(B.camera, B.renderer.domElement);
  controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 0.7; controls.maxDistance = 3;
  controls.maxPolarAngle = Math.PI / 2.1; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.9;
  B.camera.position.set(1.25, 1.05, 1.4); controls.target.set(0, 0, 0.02); controls.update();
  controls.addEventListener('start', () => (controls.autoRotate = false));
  B.render(); host.classList.add('s3d-ready');
  if (reduce) { controls.addEventListener('change', B.render); return; }
  const loop = () => { requestAnimationFrame(loop); if (!B.isVisible()) return; controls.update(); B.render(); };
  loop();
}

export function mount(host: HTMLElement) {
  const kind = host.dataset['3d'];
  try {
    if (kind === 'garage') sceneGarage(host);
    else if (kind === 'mats') sceneMats(host);
    else if (kind === 'tape') sceneTape(host);
  } catch (e) {
    host.classList.add('s3d-fail');
    throw e;
  }
}
