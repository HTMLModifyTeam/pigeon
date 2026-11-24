import * as THREE from 'three';

/* ============================================================
   사람
   ============================================================ */
const SKIN = [0xE8C4A0, 0xD4A87C, 0xC08D62, 0xF0D2B4, 0xA8764E];
const CLOTH = [0x3A4C6B, 0x6B3A3A, 0x4A5B4A, 0x2E2E33, 0x7A6A4E, 0x5B4A6B, 0x8A8578];
const HAIR = [0x1E1A17, 0x3A2A1E, 0x6B5540, 0x8A8580];
const pick = arr => arr[(Math.random() * arr.length) | 0];

const mat = (color, roughness, extra) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

export default class Person {
  /**
   * @param {boolean} sitting
   * @param {{skin?:number, top?:number, bottom?:number, hair?:number, cap?:boolean}} opts
   */
  constructor(sitting = false, opts = {}) {
    this.sitting = sitting;
    this.opts = opts;
    this.hipY = sitting ? 0.52 : 0.92;

    this.colors = {
      skin: opts.skin ?? pick(SKIN),
      top: opts.top ?? pick(CLOTH),
      bottom: opts.bottom ?? pick(CLOTH),
      hair: opts.hair ?? pick(HAIR),
    };
    const c = this.colors;
    this.mats = {
      skin: mat(c.skin, 0.85),
      top: mat(c.top, 0.92),
      bottom: mat(c.bottom, 0.92),
      shoe: mat(0x2A2724, 0.8),
    };

    this.group = new THREE.Group();
    this.upper = new THREE.Group();
    this.upper.position.y = this.hipY;
    this.group.add(this.upper);

    this.#buildTorso();
    this.head = this.#buildHead();
    if (opts.cap) this.#buildCap();
    this.arms = this.#buildArms();
    this.legs = this.#buildLegs();
  }

  /** 몸에 속한 메시를 만들고 그림자/위치를 설정하는 헬퍼 */
  #mesh(geo, material, { pos, rot, scale, shadow = false } = {}) {
    const m = new THREE.Mesh(geo, material);
    if (pos) m.position.set(...pos);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    m.castShadow = shadow;
    return m;
  }

  #buildTorso() {
    const { top, skin } = this.mats;
    this.upper.add(
      this.#mesh(new THREE.CapsuleGeometry(0.17, 0.40, 4, 10), top, { pos: [0, 0.32, 0], shadow: true }),
      // 어깨
      this.#mesh(new THREE.CapsuleGeometry(0.155, 0.30, 4, 10), top, { pos: [0, 0.52, 0], rot: [0, 0, Math.PI / 2], shadow: true }),
      // 목
      this.#mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.09, 8), skin, { pos: [0, 0.68, 0] }),
    );
  }

  #buildHead() {
    const head = this.#mesh(new THREE.SphereGeometry(0.115, 16, 12), this.mats.skin, { pos: [0, 0.80, 0], scale: [0.92, 1.12, 1.0], shadow: true });
    this.upper.add(head);

    this.upper.add(this.#mesh(new THREE.SphereGeometry(0.122, 14, 10, 0, 6.3, 0, 1.9), mat(this.colors.hair, 0.95), { pos: [0, 0.815, 0], scale: [0.95, 1.15, 1.02], shadow: true }));

    const eyeMat = mat(0x22201E, 0.3);
    [-1, 1].forEach(s => this.upper.add(this.#mesh(new THREE.SphereGeometry(0.016, 8, 6), eyeMat, { pos: [s * 0.042, 0.815, 0.098] })));
    return head;
  }

  #buildCap() {
    const capMat = mat(0x17233A, 0.85);
    this.upper.add(
      this.#mesh(new THREE.CylinderGeometry(0.128, 0.132, 0.075, 16), capMat, { pos: [0, 0.905, 0], shadow: true }),
      this.#mesh(new THREE.BoxGeometry(0.15, 0.018, 0.11), capMat, { pos: [0, 0.87, 0.13] }),
      this.#mesh(new THREE.BoxGeometry(0.27, 0.03, 0.02), mat(0xD8C25A, 0.6), { pos: [0, 0.885, 0.118] }),
    );
  }

  #buildArms() {
    const { top, skin } = this.mats;
    return [-1, 1].map(s => {
      const arm = new THREE.Group();
      arm.position.set(s * 0.20, 0.54, 0);
      arm.add(this.#mesh(new THREE.CapsuleGeometry(0.052, 0.24, 3, 8), top, { pos: [0, -0.16, 0], shadow: true }));

      const fore = new THREE.Group();
      fore.position.y = -0.30;
      fore.add(this.#mesh(new THREE.CapsuleGeometry(0.046, 0.22, 3, 8), skin, { pos: [0, -0.14, 0], shadow: true }));
      const hand = this.#mesh(new THREE.SphereGeometry(0.055, 10, 8), skin, { pos: [0, -0.28, 0] });
      fore.add(hand);

      arm.add(fore);
      this.upper.add(arm);
      return { arm, fore, hand };
    });
  }

  #buildLegs() {
    const { bottom, shoe } = this.mats;
    const sitting = this.sitting;
    return [-1, 1].map(s => {
      const leg = new THREE.Group();
      leg.position.set(s * 0.085, this.hipY, 0);

      const thigh = this.#mesh(new THREE.CapsuleGeometry(0.072, sitting ? 0.30 : 0.34, 3, 8), bottom, { shadow: true });
      const shin = new THREE.Group();
      if (sitting) {
        thigh.rotation.x = -Math.PI / 2;
        thigh.position.set(0, 0, 0.20);
        shin.position.set(0, 0, 0.40);
      } else {
        thigh.position.y = -0.19;
        shin.position.y = -0.40;
      }
      leg.add(thigh);

      shin.add(this.#mesh(new THREE.CapsuleGeometry(0.062, 0.34, 3, 8), bottom, { pos: [0, -0.19, 0], shadow: true }), this.#mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), shoe, { pos: [0, -0.40, 0.06], shadow: true }));
      leg.add(shin);
      this.group.add(leg);
      return { leg, shin };
    });
  }

  /** 메모리 해제 */
  dispose() {
    this.group.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    Object.values(this.mats).forEach(m => m.dispose());
  }
}

// 기존 함수형 호출 호환: buildPerson(sitting, opts) → { group, upper, arms, legs, head, colors }
export function buildPerson(sitting, opts) {
  const p = new Person(sitting, opts);
  return { group: p.group, upper: p.upper, arms: p.arms, legs: p.legs, head: p.head, colors: p.colors, person: p };
}