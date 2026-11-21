// 3D-сцена «Подбор длины»: гараж, гаражные ковры, машина задним ходом встаёт на ковры у упора.
// Всё построено кодом three.js (без внешних моделей). Размеры ковров из характеристик: ширина 500 мм, борт 45 мм, толщина 5 мм.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 640px)').matches;
const ACC = 0x2457e6;

// ---------- процедурные текстуры (canvas) ----------
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number], srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const noise = (g: CanvasRenderingContext2D, w: number, h: number, a: number, n = 9000) => {
  for (let i = 0; i < n; i++) { const v = Math.random() * 255; g.fillStyle = `rgba(${v},${v},${v},${a})`; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2); }
};
// керамическая плитка 60 см, как на фото гаража клиента
const tileTex = () => canvasTex(512, 512, (g) => {
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const l = 214 + Math.random() * 10; g.fillStyle = `rgb(${l},${l - 8},${l - 22})`; g.fillRect(x * 256, y * 256, 256, 256); }
  noise(g, 512, 512, 0.05, 14000);
  g.fillStyle = '#b9ae9c'; g.fillRect(0, 0, 512, 4); g.fillRect(0, 254, 512, 4); g.fillRect(0, 0, 4, 512); g.fillRect(254, 0, 4, 512);
}, [10, 10]);
const tileRough = () => canvasTex(256, 256, (g) => { g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 0.25, 6000); g.fillStyle = '#d0d0d0'; g.fillRect(0, 0, 256, 3); g.fillRect(0, 126, 256, 4); g.fillRect(0, 0, 3, 256); g.fillRect(126, 0, 4, 256); }, [10, 10], false);
const plasterTex = () => canvasTex(512, 512, (g) => { g.fillStyle = '#ece8e0'; g.fillRect(0, 0, 512, 512); noise(g, 512, 512, 0.06, 20000); }, [4, 2]);
// стена из камня, как в гараже на фото клиента
const stoneTex = () => canvasTex(512, 512, (g) => {
  g.fillStyle = '#cbb898'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 512, y = Math.random() * 512, w = 50 + Math.random() * 90, h = 28 + Math.random() * 40, l = 170 + Math.random() * 45;
    g.fillStyle = `rgb(${l},${l - 16},${l - 40})`; g.beginPath(); g.ellipse(x, y, w / 2, h / 2, Math.random() * 0.4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(90,75,55,.35)'; g.lineWidth = 3; g.stroke();
  }
  noise(g, 512, 512, 0.07, 16000);
}, [3, 1.5]);
// дно полосы: продольные канавки
const treadTex = () => canvasTex(128, 512, (g) => {
  g.fillStyle = '#26282d'; g.fillRect(0, 0, 128, 512);
  g.fillStyle = '#18191d'; for (let x = 8; x < 128; x += 16) g.fillRect(x, 0, 5, 512);
  noise(g, 128, 512, 0.06, 2500);
}, [1, 8]);
const labelTex = (text: string, bg: string, fg: string, w = 512, h = 128) => canvasTex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `800 ${h * 0.58}px Manrope, Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 4);
});

const rubber = (map?: THREE.Texture) => new THREE.MeshStandardMaterial({ color: map ? 0xffffff : 0x1d1f23, map, roughness: 0.78, metalness: 0 });
const shadowAll = (o: THREE.Object3D) => o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });

// ---------- полоса гаражного ковра ----------
// Профиль поперёк (ширина 0.5 м, борт 45 мм, дно 6 мм) выдавлен по длине. z=0 у заезда, упор в конце.
function strip(len: number, tread: THREE.Texture) {
  const g = new THREE.Group();
  const W = 0.5, H = 0.045, T = 0.006, R = 0.028;
  const s = new THREE.Shape();
  s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0);
  s.lineTo(W / 2, H - 0.008); s.quadraticCurveTo(W / 2, H, W / 2 - 0.008, H);
  s.lineTo(W / 2 - R + 0.006, H); s.quadraticCurveTo(W / 2 - R, H, W / 2 - R, H - 0.008);
  s.lineTo(W / 2 - R - 0.008, T); s.lineTo(-W / 2 + R + 0.008, T);
  s.lineTo(-W / 2 + R, H - 0.008); s.quadraticCurveTo(-W / 2 + R, H, -W / 2 + R - 0.006, H);
  s.lineTo(-W / 2 + 0.008, H); s.quadraticCurveTo(-W / 2, H, -W / 2, H - 0.008); s.lineTo(-W / 2, 0);
  g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 6 }), rubber()));
  const tr = tread.clone(); tr.needsUpdate = true; tr.repeat.set(1, len * 2);
  const bottom = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * R - 0.016, len - 0.3), new THREE.MeshStandardMaterial({ map: tr, roughness: 0.85 }));
  bottom.rotation.x = -Math.PI / 2; bottom.position.set(0, T + 0.0006, len / 2 + 0.1); g.add(bottom);
  // поперечные рёбра «ёлочкой» у заезда
  const ribs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.006, 0.016), rubber(), 12); const o = new THREE.Object3D(); let i = 0;
  for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) { o.position.set(sd * 0.1, T + 0.003, 0.32 + k * 0.07); o.rotation.set(0, sd * 0.35, 0); o.updateMatrix(); ribs.setMatrixAt(i++, o.matrix); }
  g.add(ribs);
  // заезд — пологий клин
  const ramp = new THREE.Shape(); ramp.moveTo(0, 0); ramp.lineTo(0.26, 0); ramp.lineTo(0.26, H * 0.6); ramp.quadraticCurveTo(0.1, H * 0.5, 0, 0.003); ramp.lineTo(0, 0);
  const rg = new THREE.ExtrudeGeometry(ramp, { depth: W, bevelEnabled: false }); rg.rotateY(-Math.PI / 2); rg.translate(W / 2, 0, -0.24);
  g.add(new THREE.Mesh(rg, rubber()));
  // упор с надписью
  const stop = new THREE.Mesh(new RoundedBoxGeometry(W, 0.085, 0.16, 4, 0.035), rubber()); stop.position.set(0, 0.0425, len - 0.08); g.add(stop);
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.04), new THREE.MeshStandardMaterial({ map: labelTex('АГАТЭК', '#24272c', '#c9ccd2'), roughness: 0.6 }));
  plate.position.set(0, 0.06, len - 0.162); plate.rotation.set(-0.35, Math.PI, 0); g.add(plate);
  // бирка
  const tag = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.01, 0.04, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0xc8262b, roughness: 0.4 }));
  tag.position.set(0, T + 0.005, 0.18); g.add(tag);
  shadowAll(g);
  return g;
}
function stripPair(len: number, tread: THREE.Texture) {
  const p = new THREE.Group(); const a = strip(len, tread), b = strip(len, tread);
  a.position.x = -0.8; b.position.x = 0.8; p.add(a, b); return p;
}

// ---------- машина: профиль сбоку с арками, выдавлен по ширине; перед к +Z ----------
function car(env: THREE.Texture) {
  const g = new THREE.Group();
  const L = 4.45, Wd = 1.64, FW = -1.38, RW = 1.36, R = 0.34, ARC = 0.44, BOT = 0.3;
  const s = new THREE.Shape();
  s.moveTo(-L / 2, BOT + 0.08); s.lineTo(FW - ARC, BOT); s.absarc(FW, R, ARC, Math.PI, 0, true);
  s.lineTo(RW - ARC, BOT); s.absarc(RW, R, ARC, Math.PI, 0, true); s.lineTo(L / 2, BOT + 0.06);
  s.lineTo(L / 2, 0.76); s.quadraticCurveTo(L / 2 - 0.02, 0.98, 1.86, 1.03);
  s.quadraticCurveTo(1.46, 1.4, 0.95, 1.44); s.lineTo(-0.18, 1.46); s.quadraticCurveTo(-0.72, 1.44, -1.08, 1.0);
  s.lineTo(-L / 2 + 0.32, 0.9); s.quadraticCurveTo(-L / 2 + 0.03, 0.86, -L / 2, 0.7); s.lineTo(-L / 2, BOT + 0.08);
  const bodyGeo = new THREE.ExtrudeGeometry(s, { depth: Wd - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 8, curveSegments: 32 });
  bodyGeo.translate(0, 0, -(Wd - 0.16) / 2); bodyGeo.rotateY(Math.PI / 2);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0x9c1b22, roughness: 0.22, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.06, envMap: env, envMapIntensity: 1.1 });
  g.add(new THREE.Mesh(bodyGeo, paint));
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x101418, roughness: 0.02, metalness: 0.1, clearcoat: 1, envMap: env, envMapIntensity: 1.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xdfe3e8, roughness: 0.12, metalness: 1, envMap: env });
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.65 });
  // стёкла и стойки
  const w = new THREE.Shape(); w.moveTo(-0.95, 1.05); w.quadraticCurveTo(-0.62, 1.38, -0.18, 1.395); w.lineTo(0.93, 1.38); w.quadraticCurveTo(1.36, 1.34, 1.68, 1.06); w.lineTo(-0.95, 1.05);
  const wg = new THREE.ExtrudeGeometry(w, { depth: Wd + 0.004, bevelEnabled: false, curveSegments: 20 }); wg.translate(0, 0, -(Wd + 0.004) / 2); wg.rotateY(Math.PI / 2);
  g.add(new THREE.Mesh(wg, glassM));
  for (const z of [-0.22, 0.62]) { const p = new THREE.Mesh(new THREE.BoxGeometry(Wd + 0.012, 0.36, 0.07), paint); p.position.set(0, 1.21, z); g.add(p); }
  // линии дверей и ручки
  const seamM = new THREE.MeshStandardMaterial({ color: 0x3a0a0e, roughness: 0.5 });
  for (const sx of [-1, 1]) {
    for (const z of [-0.95, 0.2, 1.05]) { const seam = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.6, 0.008), seamM); seam.position.set(sx * (Wd / 2 + 0.071), 0.72, z); g.add(seam); }
    for (const z of [-0.55, 0.55]) { const h = new THREE.Mesh(new RoundedBoxGeometry(0.02, 0.03, 0.16, 2, 0.008), chrome); h.position.set(sx * (Wd / 2 + 0.08), 0.9, z); g.add(h); }
    const m = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.1, 0.18, 3, 0.04), paint); m.position.set(sx * (Wd / 2 + 0.13), 1.02, 0.98); g.add(m);
  }
  // бамперы, решётка, фары
  const fb = new THREE.Mesh(new RoundedBoxGeometry(Wd - 0.02, 0.22, 0.14, 3, 0.06), plastic); fb.position.set(0, 0.44, L / 2 + 0.03); g.add(fb);
  const rb = fb.clone(); rb.position.z = -L / 2 - 0.03; g.add(rb);
  const grille = new THREE.Mesh(new RoundedBoxGeometry(0.78, 0.2, 0.04, 3, 0.05), new THREE.MeshStandardMaterial({ color: 0x0e0f11, roughness: 0.4, metalness: 0.4 })); grille.position.set(0, 0.68, L / 2 + 0.06); g.add(grille);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.012, 8, 32), chrome); ring.position.set(0, 0.69, L / 2 + 0.085); g.add(ring);
  for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.008, 0.01), chrome); bar.position.set(0, 0.61 + k * 0.045, L / 2 + 0.081); g.add(bar); }
  const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdfe8ff, emissiveIntensity: 0.6, roughness: 0.05 });
  for (const sx of [-0.58, 0.58]) {
    const housing = new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.13, 0.06, 3, 0.04), chrome); housing.position.set(sx, 0.8, L / 2 + 0.035); g.add(housing);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 24), lampM); lens.rotation.x = Math.PI / 2; lens.position.set(sx - Math.sign(sx) * 0.07, 0.8, L / 2 + 0.07); g.add(lens);
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.01), lampM); drl.position.set(sx + Math.sign(sx) * 0.06, 0.835, L / 2 + 0.068); g.add(drl);
    const fog = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), lampM); fog.rotation.x = Math.PI / 2; fog.position.set(sx * 1.05, 0.44, L / 2 + 0.1); g.add(fog);
    const tail = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.09, 0.05, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0xb0161c, emissive: 0x3a0000, roughness: 0.2 })); tail.position.set(sx, 0.9, -L / 2 - 0.02); g.add(tail);
  }
  // номер «АГАТЭК» — как на фото клиента
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.112), new THREE.MeshStandardMaterial({ map: labelTex('АГАТЭК', '#f4f4f0', '#111111', 520, 112), roughness: 0.5 }));
  plate.position.set(0, 0.47, L / 2 + 0.105); g.add(plate);
  const plate2 = plate.clone(); plate2.rotation.y = Math.PI; plate2.position.set(0, 0.6, -L / 2 - 0.06); g.add(plate2);
  // колёса: протектор, диск с 10 спицами, тормоз с синим суппортом
  const wheels: THREE.Object3D[] = [];
  const tireM = new THREE.MeshStandardMaterial({ color: 0x141518, roughness: 0.92 });
  const rimM = new THREE.MeshStandardMaterial({ color: 0xc7cbd1, roughness: 0.18, metalness: 1, envMap: env });
  const discM = new THREE.MeshStandardMaterial({ color: 0x6f7378, roughness: 0.5, metalness: 0.8 });
  for (const [x, z] of [[-0.74, -FW], [0.74, -FW], [-0.74, -RW], [0.74, -RW]]) {
    const wh = new THREE.Group(); const side = Math.sign(x);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(R - 0.085, 0.085, 18, 48), tireM); tire.rotation.y = Math.PI / 2; wh.add(tire);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.004, R - 0.004, 0.2, 48, 1, true), tireM); band.rotation.z = Math.PI / 2; wh.add(band);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.02, 32), discM); disc.rotation.z = Math.PI / 2; disc.position.x = -side * 0.02; wh.add(disc);
    const cal = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.12, 0.08, 2, 0.015), new THREE.MeshStandardMaterial({ color: ACC, roughness: 0.35 })); cal.position.set(side * 0.01, 0.1, 0.08); wh.add(cal);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.16, 40, 1, true), rimM); hub.rotation.z = Math.PI / 2; wh.add(hub);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.03, 20), rimM); cap.rotation.z = Math.PI / 2; cap.position.x = side * 0.085; wh.add(cap);
    for (let k = 0; k < 10; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.028), rimM); const a = (k / 10) * Math.PI * 2; sp.position.set(side * 0.075, Math.cos(a) * 0.105, Math.sin(a) * 0.105); sp.rotation.x = -a; wh.add(sp); }
    wh.position.set(x, R, z); g.add(wh); wheels.push(wh);
  }
  shadowAll(g);
  return { g, wheels, rearZ: -RW };
}

// ---------- гараж ----------
function garage(scene: THREE.Scene) {
  const room = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshStandardMaterial({ map: tileTex(), roughnessMap: tileRough(), roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = 2.6; floor.receiveShadow = true; room.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: stoneTex(), roughness: 0.95 })); back.position.set(0, 1.5, -1.0); back.receiveShadow = true; room.add(back);
  const pl = plasterTex();
  for (const sx of [-1, 1]) { const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 3), new THREE.MeshStandardMaterial({ map: pl, roughness: 0.95 })); wall.rotation.y = -sx * Math.PI / 2; wall.position.set(sx * 3, 1.5, 3.5); wall.receiveShadow = true; room.add(wall); }
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: 0xb8ad9a, roughness: 0.8 })); plinth.position.set(0, 0.05, -0.99); room.add(plinth);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshStandardMaterial({ color: 0xf2f0eb, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3, 3.5); room.add(ceil);
  const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.2 });
  for (const z of [0.6, 3.2]) { const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.03, 0.14), lampM); lamp.position.set(0, 2.98, z); room.add(lamp); }
  // стеллаж: канистра, коробка и антибукса на полке
  const shelfM = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.6, metalness: 0.4 });
  const shelf = new THREE.Group();
  for (const y of [0.4, 0.95, 1.5]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 1.2), shelfM); s.position.y = y; shelf.add(s); }
  for (const [x, z] of [[-0.18, -0.58], [0.18, -0.58], [-0.18, 0.58], [0.18, 0.58]]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), shelfM); p.position.set(x, 0.8, z); shelf.add(p); }
  const can = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.3, 0.26, 3, 0.03), new THREE.MeshStandardMaterial({ color: ACC, roughness: 0.45 })); can.position.set(0, 1.12, 0.3); shelf.add(can);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.4), new THREE.MeshStandardMaterial({ color: 0xa8875a, roughness: 0.9 })); box.position.set(0, 0.53, -0.3); shelf.add(box);
  const tape = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.03, 0.94, 2, 0.008), rubber()); tape.position.set(0, 1.53, -0.1); shelf.add(tape);
  shelf.position.set(-2.72, 0, 0.4); shadowAll(shelf); room.add(shelf);
  scene.add(room);
}

export function mount(host: HTMLElement) {
  try { run(host); } catch (e) { host.classList.add('s3d-fail'); throw e; }
}

function run(host: HTMLElement) {
  const wrap = host.querySelector<HTMLElement>('.s3d-canvas') || host;
  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  wrap.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xe9e5dd);
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 60);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd7cdbb, 0.4));
  const key = new THREE.DirectionalLight(0xfff6ea, 2.2); key.position.set(1.6, 2.9, 2.4); key.castShadow = true;
  const sm = small ? 1024 : 2048; key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -3.5, right: 3.5, top: 4, bottom: -4, near: 0.5, far: 12 });
  key.shadow.radius = 5; key.shadow.bias = -0.0005; key.shadow.normalBias = 0.02; scene.add(key);
  const fill = new THREE.PointLight(0xffffff, 2.5, 8, 2); fill.position.set(0, 2.85, 3.2); scene.add(fill);

  garage(scene);
  const tread = treadTex();
  let len = Number(host.dataset.len || 5);
  const STOP = -0.7; // упор у задней стены
  const mats = new THREE.Group(); scene.add(mats);
  let pair = stripPair(len, tread);
  const placeMats = () => { pair.rotation.y = Math.PI; pair.position.set(0, 0, STOP + len); };
  mats.add(pair); placeMats();
  const c = car(env); scene.add(c.g); c.g.position.y = 0.006;
  // задним ходом: задние колёса встают у упора
  const parkedZ = () => STOP + 0.16 + 0.34 - 0.03 - c.rearZ;
  const startZ = () => parkedZ() + 4.2;

  const labels: { el: HTMLElement; at: THREE.Vector3 }[] = [];
  const label = (t: string, cls = '') => { const el = document.createElement('span'); el.className = 's3d-lbl ' + cls; el.innerHTML = `<i></i><b>${t}</b>`; wrap.appendChild(el); const l = { el, at: new THREE.Vector3() }; labels.push(l); return l; };
  const lSide = label('Борт 45 мм', 'acc'), lStop = label('Упор'), lW = label('Ширина 500 мм');
  const relabel = () => { lSide.at.set(1.06, 0.05, STOP + len - 0.55); lStop.at.set(-1.06, 0.09, STOP + 0.08); lW.at.set(-0.8, 0.02, STOP + len + 0.05); };
  relabel();

  // мягкие затенения (GTAO) и сглаживание; на телефоне без GTAO
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (!small) { const gtao = new GTAOPass(scene, camera, 1, 1); gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.4, thickness: 1.2, scale: 1.1 }); gtao.blendIntensity = 0.85; composer.addPass(gtao); }
  composer.addPass(new OutputPass());
  composer.addPass(new SMAAPass());

  const target = new THREE.Vector3();
  let az = -0.5, el = 0.34;
  const setCam = () => {
    target.set(0, 0.55, STOP + len * 0.5 + 0.4);
    const d = 6.6 + len * 0.42;
    camera.position.set(target.x + Math.sin(az) * Math.cos(el) * d, Math.min(2.7, target.y + Math.sin(el) * d), target.z + Math.cos(az) * Math.cos(el) * d);
    camera.lookAt(target);
  };
  const v = new THREE.Vector3();
  const size = () => { const w = wrap.clientWidth, h = wrap.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const draw = () => {
    composer.render();
    const w = wrap.clientWidth, h = wrap.clientHeight;
    for (const l of labels) { v.copy(l.at).project(camera); l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`; l.el.style.opacity = v.z < 1 ? '1' : '0'; }
  };
  new ResizeObserver(() => { size(); draw(); }).observe(wrap);
  let visible = true; new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(wrap);
  size(); setCam();

  let mx = 0, my = 0, cx = 0, cy = 0;
  if (!reduce) host.addEventListener('pointermove', (e) => { const r = host.getBoundingClientRect(); mx = (e.clientX - r.left) / r.width - 0.5; my = (e.clientY - r.top) / r.height - 0.5; });
  host.addEventListener('pointerleave', () => { mx = 0; my = 0; });
  let t0 = performance.now(); const dur = 3600;
  c.g.position.z = reduce ? parkedZ() : startZ();
  document.addEventListener('len', (e: any) => {
    len = Number(e.detail.len); mats.remove(pair); pair = stripPair(len, tread); mats.add(pair); placeMats(); relabel(); setCam();
    c.g.position.z = reduce ? parkedZ() : startZ(); t0 = performance.now(); if (reduce) draw();
    host.dispatchEvent(new CustomEvent('drive'));
  });
  if (reduce) { draw(); host.classList.add('s3d-ready'); return; }
  host.dispatchEvent(new CustomEvent('drive'));
  const loop = (now: number) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    const z = startZ() + (parkedZ() - startZ()) * e; const dz = z - c.g.position.z; c.g.position.z = z;
    c.wheels.forEach((w) => (w.rotation.x += dz / 0.34));
    c.g.rotation.x = k < 1 ? 0 : Math.sin(Math.min(1, (now - t0 - dur) / 450) * Math.PI) * -0.01;
    cx += (mx - cx) * 0.05; cy += (my - cy) * 0.05; az = -0.5 + cx * 0.45; el = 0.34 - cy * 0.12;
    setCam(); draw();
    if (k > 0.02) host.classList.add('s3d-ready');
  };
  requestAnimationFrame(loop);
}
