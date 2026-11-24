import * as THREE from 'three';
import { makeCanvas } from '../utils/utils.js';

const KFONT = '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo","Nanum Gothic",sans-serif';

/** Draws the banner artwork onto canvases and caches one texture per kind. */
export class BannerTextures {
  static WIDTH = 1024;
  static HEIGHT = 256;
  static #cache = new Map();

  static get(kind) {
    if (!this.#cache.has(kind)) this.#cache.set(kind, this.#build(kind));
    return this.#cache.get(kind);
  }

  static dispose() {
    this.#cache.forEach(t => t.dispose());
    this.#cache.clear();
  }

  static drawNoPigeon(ctx, cx, cy, r) {
    ctx.save();
    ctx.fillStyle = '#161616';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.06, cy + r * 0.14, r * 0.40, r * 0.25, -0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - r * 0.20, cy, r * 0.17, r * 0.15, 0.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.31, cy - r * 0.13, r * 0.145, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.43, cy - r * 0.15); ctx.lineTo(cx - r * 0.60, cy - r * 0.07); ctx.lineTo(cx - r * 0.42, cy - r * 0.04); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + r * 0.38, cy + r * 0.06); ctx.lineTo(cx + r * 0.68, cy - r * 0.10); ctx.lineTo(cx + r * 0.64, cy + r * 0.18); ctx.fill();
    ctx.strokeStyle = '#D6231B'; ctx.lineWidth = r * 0.17; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.86, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - r * 0.60, cy - r * 0.60); ctx.lineTo(cx + r * 0.60, cy + r * 0.60); ctx.stroke();
    ctx.restore();
  }

  static outlined(ctx, txt, x, y, fill, stroke, w) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke; ctx.lineWidth = w; ctx.strokeText(txt, x, y);
    ctx.fillStyle = fill; ctx.fillText(txt, x, y);
  }

  static #paint = [
    // kind 0: blue-framed "no feeding" sign
    (ctx, Wd, Hd) => {
      const { drawNoPigeon, outlined } = BannerTextures;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, Wd, Hd);
      ctx.strokeStyle = '#2C4DA0'; ctx.lineWidth = 8; ctx.strokeRect(4, 4, Wd - 8, Hd - 8);
      drawNoPigeon(ctx, 112, 128, 92);
      drawNoPigeon(ctx, Wd - 112, 128, 92);
      ctx.textAlign = 'center';
      ctx.font = 'bold 96px ' + KFONT;
      outlined(ctx, '비둘기', 372, 96, '#111111', '#FFFFFF', 10);
      outlined(ctx, '먹이주기 금지', 676, 96, '#D6231B', '#FFFFFF', 10);
      ctx.fillStyle = '#1F3A8A'; ctx.fillRect(228, 168, 568, 62);
      ctx.font = 'bold 30px ' + KFONT;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('과도한 먹이주기는 도시생태계에 위해를 끼칠 수 있습니다', 512, 200);
    },
    // kind 1: sky-blue "stop feeding" banner
    (ctx, Wd, Hd) => {
      const { outlined } = BannerTextures;
      const g = ctx.createLinearGradient(0, 0, Wd, 0);
      g.addColorStop(0, '#DDEBF7'); g.addColorStop(0.5, '#FFFFFF'); g.addColorStop(1, '#D3E6F6');
      ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Hd);
      ctx.fillStyle = 'rgba(70,140,205,0.35)';
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(60 + i * 30, 140 + i * 18, 320, 40, -0.35, 0, 7); ctx.fill(); }
      ctx.textAlign = 'center';
      ctx.font = 'bold 82px ' + KFONT;
      outlined(ctx, '비둘기 먹이 주기는', 330, 90, '#1F4FB0', '#FFFFFF', 12);
      ctx.font = 'bold 108px ' + KFONT;
      outlined(ctx, '이제 그만 !', 790, 90, '#D6231B', '#FFFFFF', 14);
      ctx.font = 'bold 28px ' + KFONT;
      ctx.fillStyle = '#1B1B1B';
      ctx.fillText('비둘기는 무리를 이뤄 주민에게 혐오감을 주고, 분변, 털 날림 등으로 주거환경이 나빠지고 있습니다.', 512, 186);
      ctx.fillText('비둘기가 스스로 먹이를 찾을 수 있도록 주민 여러분의 많은 협조 부탁드립니다.', 512, 226);
    },
    // kind 2: left-aligned "don't feed the pigeons"
    (ctx, Wd, Hd) => {
      const { drawNoPigeon, outlined } = BannerTextures;
      ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, Wd, Hd);
      ctx.strokeStyle = '#BBBBBB'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, Wd - 4, Hd - 4);
      drawNoPigeon(ctx, Wd - 140, 128, 96);
      ctx.textAlign = 'left';
      ctx.font = 'bold 84px ' + KFONT;
      outlined(ctx, '비둘기', 50, 74, '#111111', '#FFFFFF', 8);
      ctx.font = 'bold 60px ' + KFONT;
      outlined(ctx, '에게', 318, 84, '#111111', '#FFFFFF', 8);
      ctx.font = 'bold 84px ' + KFONT;
      outlined(ctx, '먹이를 주지마세요', 50, 158, '#D6231B', '#FFFFFF', 8);
      ctx.font = 'bold 27px ' + KFONT;
      ctx.fillStyle = '#222222';
      ctx.fillText('비둘기가 스스로 먹이를 찾아 생태계의 당당한 일원이 될 수 있도록 도와주세요', 52, 222);
    },
  ];

  static #build(kind) {
    const { WIDTH: Wd, HEIGHT: Hd } = this;
    const [c, ctx] = makeCanvas(Wd, Hd);
    ctx.textBaseline = 'middle';
    (this.#paint[kind] ?? this.#paint[2])(ctx, Wd, Hd);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
}

/** A cloth banner (optionally on two poles) that also registers itself as a pigeon perch. */
export default class Banner {
  static poleMaterial = new THREE.MeshStandardMaterial({ color: 0x777369, roughness: 0.6, metalness: 0.5 });

  constructor({ scene, world, x = 0, y = 3, z = 0, rotY = 0, width = 4, kind = 0, poles = false }) {
    Object.assign(this, { scene, world, x, y, z, rotY, width, kind, poles });
    this.height = width / 4;
    this.group = new THREE.Group();
    this.perch = null;

    this.mesh = this.#buildCloth();
    this.group.add(this.mesh);
    if (poles) this.#buildPoles();
    this.scene.add(this.group);
    this.#registerPerch();
  }

  #buildCloth() {
    const { width, height } = this;
    const geo = new THREE.PlaneGeometry(width, height, 8, 1);
    // 살짝 늘어진 천 느낌
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) / (width / 2);
      pos.setZ(i, Math.sin(px * Math.PI) * 0.04 - (1 - px * px) * 0.02);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: BannerTextures.get(this.kind), roughness: 0.9, side: THREE.DoubleSide }));
    mesh.position.set(this.x, this.y, this.z);
    mesh.rotation.y = this.rotY;
    mesh.castShadow = mesh.receiveShadow = true;
    return mesh;
  }

  #buildPoles() {
    const { x, y, z, rotY, width, height } = this;
    const right = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY));
    const len = y + height / 2 + 0.15;
    const off = width / 2 + 0.06;
    this.poleMeshes = [-1, 1].map(s => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, len, 8), Banner.poleMaterial);
      pole.position.set(x + right.x * s * off, len / 2, z + right.z * s * off);
      pole.castShadow = true;
      this.group.add(pole);
      return pole;
    });
  }

  #registerPerch() {
    this.perch = {
      pos: new THREE.Vector3(this.x, this.y + this.height / 2 + 0.03, this.z),
      hard: 0.62,
      kind: 'banner',
      normal: new THREE.Vector3(Math.sin(this.rotY), 0, Math.cos(this.rotY)),
    };
    this.world.perches.push(this.perch);
  }

  dispose() {
    this.scene.remove(this.group);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose(); // 텍스처는 BannerTextures가 공유 관리
    this.poleMeshes?.forEach(p => p.geometry.dispose());
    const i = this.world.perches.indexOf(this.perch);
    if (i >= 0) this.world.perches.splice(i, 1);
  }
}