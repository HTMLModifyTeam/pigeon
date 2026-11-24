import * as THREE from 'three';
import { FLY } from '../data/data.js';

const BODY_H = 0.115;      // 몸통 중심 ~ 발바닥 높이
const WORLD_LIMIT = 108;
const CEILING = 62;
const TOES_TOTAL = 8;

// 매 프레임 new 하지 않도록 재사용하는 임시 벡터
const _f = new THREE.Vector3();
const _up = new THREE.Vector3();
const _prev = new THREE.Vector3();
const _aligned = new THREE.Vector3();
const _v0 = new THREE.Vector3();
const _Y = new THREE.Vector3(0, 1, 0);

export default class Pigeon {
  constructor(o) {
    Object.assign(this, {
      scene: null,
      groundHeightAt: (x, z, y) => null,
      buildPigeon: () => null,
      // 전역(window.SFX / collideSolids)에 의존하지 않도록 주입 가능하게 함
      sfx: typeof SFX !== 'undefined' ? SFX : null,
      collideSolids: typeof collideSolids === 'function' ? collideSolids : null,
    }, o);

    this.model = this.buildPigeon();
    this.scene.add(this.model.root);

    this.pos = new THREE.Vector3(0, 16, 14);
    this.vel = new THREE.Vector3(0, 0, -7);
    this.yaw = Math.PI;
    this.pitch = -0.18;
    this.roll = 0;
    this.mode = 'fly'; // fly | walk | perch | stun

    this.flapT = 0;
    this.flapPhase = 0;
    this.flapHeld = false; // 버튼 누르고 있는 동안 계속 날갯짓
    this.walkPhase = 0;
    this.perch = null;
    this.stunT = 0;
    this.slipT = 0;
    this.fold = 1;
    this.toesLost = 0;
    this.peckT = 0;
    this.peckDur = 0.34;
    this.peckTarget = null;
    this.cooT = 0;
    this.landCooldown = 0;
  }

  // ---------- helpers ----------
  _sfx(name) { if (this.sfx && this.sfx[name]) this.sfx[name](); }

  _ground(x = this.pos.x, z = this.pos.z, y = this.pos.y) {
    const g = this.groundHeightAt(x, z, y);
    return g == null ? 0 : g; // null 반환 시 NaN 방지
  }

  forward(out = new THREE.Vector3()) {
    const cp = Math.cos(this.pitch);
    return out.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  stun(duration = 1.5) {
    this.mode = 'stun';
    this.stunT = duration;
    this.perch = null;
  }

  // ---------- actions ----------
  flap() {
    if (this.mode === 'stun' || this.flapT > 0) return false;

    if (this.mode === 'walk' || this.mode === 'perch') {
      this.mode = 'fly';
      this.perch = null;
      this.vel.set(Math.sin(this.yaw) * 2.2, FLY.takeoffUp, Math.cos(this.yaw) * 2.2);
      this.pitch = 0.35;
    } else {
      this.vel.y += FLY.flapUp;
      this.vel.addScaledVector(this.forward(_f), FLY.flapFwd);
    }
    this.flapT = FLY.flapCooldown;
    this.flapPhase = 0;
    this._sfx('flap');
    return true;
  }

  peck() {
    if (this.peckT > 0 || this.mode !== 'walk') return false;
    this.peckT = this.peckDur;
    return true;
  }

  // ---------- update ----------
  update(dt, input) {
    // 타이머는 프레임당 한 번만 감소
    if (this.flapT > 0) this.flapT -= dt;
    if (this.peckT > 0) this.peckT -= dt;
    if (this.cooT > 0) this.cooT -= dt;
    if (this.landCooldown > 0) this.landCooldown -= dt;
    if (this.slipT > 0) this.slipT = Math.max(0, this.slipT - dt);

    if (this.flapHeld && this.flapT <= 0) this.flap(); // flap()이 모드 검사를 함

    if (this.mode === 'stun') this.updateStun(dt);
    else if (this.mode === 'walk' || this.mode === 'perch') this.updateGround(dt, input);
    else this.updateFly(dt, input);

    this.applyTransform(dt);
  }

  updateStun(dt) {
    this.stunT -= dt;
    this.vel.y -= FLY.gravity * dt;
    _prev.copy(this.pos);
    this.pos.addScaledVector(this.vel, dt);
    if (this.collideSolids) this.collideSolids(_prev, this.pos, this.vel);
    this.roll += dt * 5;

    const gy = this._ground() + BODY_H;
    if (this.pos.y <= gy) {
      this.pos.y = gy;
      this.vel.set(0, 0, 0);
      if (this.stunT <= 0) {
        this.mode = 'walk';
        this.roll = 0;
        this.pitch = 0;
      }
    }
  }

  updateFly(dt, input) {
    this.yaw -= input.x * FLY.yawRate * dt;
    this.pitch += -input.y * FLY.pitchRate * dt;
    this.pitch = Math.max(-FLY.maxPitch, Math.min(FLY.maxPitch, this.pitch));
    this.pitch += (-0.05 - this.pitch) * Math.min(1, 0.35 * dt);

    const targetRoll = -input.x * 0.85;
    this.roll += (targetRoll - this.roll) * Math.min(1, dt * 5.5);

    const f = this.forward(_f);
    const speed = this.vel.length();
    _up.copy(_Y).addScaledVector(f, -f.y).normalize();

    let lift = Math.min(FLY.maxLift, speed * speed * FLY.liftCoef);
    lift *= 1 - Math.abs(this.roll) * 0.22;
    this.vel.addScaledVector(_up, lift * dt);
    this.vel.y -= FLY.gravity * dt;
    this.vel.multiplyScalar(Math.exp(-FLY.drag * dt * (1 + Math.abs(this.pitch) * 0.4)));

    // 속도 방향을 기수 방향으로 정렬
    _aligned.copy(f).multiplyScalar(this.vel.length());
    this.vel.lerp(_aligned, Math.min(1, FLY.align * dt));

    _prev.copy(this.pos);
    this.pos.addScaledVector(this.vel, dt);
    if (this.collideSolids) this.collideSolids(_prev, this.pos, this.vel);

    for (const axis of ['x', 'z']) {
      if (Math.abs(this.pos[axis]) > WORLD_LIMIT) {
        this.pos[axis] = Math.sign(this.pos[axis]) * WORLD_LIMIT;
        this.vel[axis] *= -0.3;
      }
    }
    if (this.pos.y > CEILING) {
      this.pos.y = CEILING;
      this.vel.y = Math.min(0, this.vel.y);
    }
  }

  updateGround(dt, input) {
    if (this.peckT > 0) return;
    const k = Math.min(1, dt * 6);
    this.yaw -= input.x * 2.4 * dt;

    if (this.mode === 'perch') {
      // 횃대 위에서는 제자리. 스틱을 세게 밀면 그쪽으로 뛰어내림
      if (Math.hypot(input.x, input.y) > 0.55) {
        this.yaw -= Math.atan2(input.x, -input.y);
        this.mode = 'fly';
        this.perch = null;
        this.vel.set(Math.sin(this.yaw) * 1.8, -0.3, Math.cos(this.yaw) * 1.8);
        this.pitch = -0.25;
        this._sfx('flap');
        return;
      }
      this.roll -= this.roll * k;
      this.pitch -= this.pitch * k;
      return;
    }

    const fwd = -input.y;
    const spd = FLY.walkSpeed * Math.max(0.5, 1 - this.toesLost * 0.05);
    if (Math.abs(fwd) > 0.05) {
      _prev.copy(this.pos);
      this.pos.x += Math.sin(this.yaw) * fwd * spd * dt;
      this.pos.z += Math.cos(this.yaw) * fwd * spd * dt;
      this.walkPhase += dt * 7.5 * Math.abs(fwd);

      if (this.collideSolids) {
        this.collideSolids(_prev, this.pos, _v0.set(0, 0, 0));
        // 지붕/단상 가장자리에서 떨어짐
        if (this.pos.y > this._ground() + 0.5) {
          this.mode = 'fly';
          this.vel.set(Math.sin(this.yaw) * 1.2, -0.5, Math.cos(this.yaw) * 1.2);
          this.pitch = -0.3;
          return;
        }
      }
    }
    this.roll -= this.roll * k;
    this.pitch -= this.pitch * k;
    this.pos.y = this._ground() + BODY_H;
  }

  // ---------- animation ----------
  applyTransform(dt) {
    const m = this.model;
    m.root.position.copy(this.pos);
    m.root.rotation.y = this.yaw;
    m.tilt.rotation.x = -this.pitch;
    m.tilt.rotation.z = this.roll;

    const flying = this.mode === 'fly' || this.mode === 'stun' || this.slipT > 0;
    this.fold += ((flying ? 0 : 1) - this.fold) * Math.min(1, dt * 9);

    let flapAngle = 0, twist = 0;
    if (this.mode === 'fly') {
      const glide = this.flapT <= 0;
      this.flapPhase += dt * (glide ? 3.0 : 13.5);
      if (glide) {
        flapAngle = 0.10 + Math.sin(this.flapPhase * 1.1) * 0.055;
        twist = -0.10;
      } else {
        flapAngle = Math.sin(this.flapPhase * 2.9 - 1.2) * 1.05 + 0.15;
        twist = Math.sin(this.flapPhase * 2.9 - 1.9) * 0.42;
      }
    } else if (this.mode === 'stun' || this.slipT > 0) {
      this.flapPhase += dt * 22;
      flapAngle = Math.sin(this.flapPhase * 3) * 0.95;
      twist = 0.25;
    } else {
      flapAngle = -0.02;
    }

    // 접힘: 뒤로 쓸고, 몸통 옆면에 붙이고, 손목이 접히므로 길이가 줄어듦
    const f = this.fold;
    const sweep = f * 1.30;
    const spanScale = 1 - f * 0.46;
    const chordScale = 1 - f * 0.30;
    const wingZ = flapAngle * (1 - f) - f * 0.10;
    const wingX = twist * (1 - f);

    m.wingR.upperArm.rotation.set(wingX, 0, wingZ);
    m.wingL.upperArm.rotation.set(wingX, 0, -wingZ);
    const sx = 0.030 - f * 0.006, sy = 0.040 + f * 0.008, sz = 0.006 - f * 0.026;
    m.wingR.upperArm.position.set(sx, sy, sz);
    m.wingL.upperArm.position.set(-sx, sy, sz);
    m.wingR.foreArm.rotation.set(0, sweep, 0);
    m.wingL.foreArm.rotation.set(0, -sweep, 0);
    m.wingR.foreArm.scale.set(spanScale, 1, chordScale);
    m.wingL.foreArm.scale.set(spanScale, 1, chordScale);

    const spread = f < 0.55;
    m.wingR.shoulder.visible = spread;
    m.wingL.shoulder.visible = spread;
    m.foldedR.visible = !spread;
    m.foldedL.visible = !spread;

    // 꼬리
    if (this.mode === 'fly') {
      m.tailPivot.rotation.x = -this.pitch * 0.30 + 0.06;
      m.tailPivot.scale.x = 1.0;
    } else {
      m.tailPivot.rotation.x = -0.10;
      m.tailPivot.scale.x = 0.72;
    }

    // 머리 까딱 / 다리
    if (this.mode === 'walk' || this.mode === 'perch') {
      const TAU = Math.PI * 2;
      const p = this.walkPhase % TAU;
      const peakAt = Math.PI * 0.32;
      const thrust = p < peakAt ? p / peakAt : 1 - (p - peakAt) / (TAU - peakAt);
      m.headPivot.position.set(0, 0.126 + thrust * 0.006, 0.108 + thrust * 0.050);
      m.headPivot.rotation.x = -thrust * 0.12;
      m.tilt.position.y = Math.sin(this.walkPhase * 2) * 0.005;

      const s = Math.sin(this.walkPhase);
      m.feet[0].group.position.set(-0.031, -0.104 + Math.max(0, s) * 0.018, 0.010 + s * 0.038);
      m.feet[1].group.position.set(0.031, -0.104 + Math.max(0, -s) * 0.018, 0.010 - s * 0.038);
      m.feet[0].group.rotation.x = 0;
      m.feet[1].group.rotation.x = 0;
    } else {
      m.headPivot.position.set(0, 0.126, 0.108);
      m.headPivot.rotation.x = THREE.MathUtils.clamp(this.pitch * 0.55, -0.45, 0.45);
      m.tilt.position.y = 0;
      m.feet[0].group.position.set(-0.026, -0.052, -0.062);
      m.feet[1].group.position.set(0.026, -0.052, -0.062);
      m.feet[0].group.rotation.x = 1.55;
      m.feet[1].group.rotation.x = 1.55;
    }

    this.applyPeck();
    this.applyCoo();
  }

  applyPeck() {
    if (this.peckT <= 0) return;
    const m = this.model;
    const k = Math.sin(Math.PI * (1 - this.peckT / this.peckDur)); // 0→1→0
    m.headPivot.rotation.x = -1.30 * k;
    m.headPivot.position.y = 0.126 - 0.085 * k;
    m.headPivot.position.z = 0.108 + 0.060 * k;
    m.tilt.rotation.x = -this.pitch + 0.28 * k; // 몸도 앞으로 숙임
  }

  applyCoo() {
    const m = this.model;
    if (this.cooT > 0) {
      const k = Math.sin(Math.PI * Math.min(1, this.cooT / 1.1));
      const p = 1 + 0.42 * k + 0.08 * Math.sin(this.cooT * 60) * k;
      m.neck.scale.set(0.080 * p, 0.098 * (1 + 0.18 * k), 0.086 * p);
      m.neck2.scale.set(0.066 * (1 + 0.25 * k), 0.074, 0.070 * (1 + 0.25 * k));
      m.headPivot.rotation.x += 0.35 * k;
    } else {
      m.neck.scale.set(0.080, 0.098, 0.086);
      m.neck2.scale.set(0.066, 0.074, 0.070);
    }
  }

  // ---------- toes ----------
  loseToe() {
    const alive = this.model.allToes.filter(t => t.visible);
    if (alive.length <= 2) return null;
    const pick = alive[(Math.random() * alive.length) | 0];
    pick.visible = false;
    this.toesLost++;
    return pick;
  }

  toeCount() {
    return this.model.allToes.filter(t => t.visible).length;
  }

  perchChance(hard) {
    const grip = 0.25 + 0.75 * (this.toeCount() / TOES_TOTAL);
    const base = 1 - hard * 0.92;
    return Math.max(0.06, Math.min(0.99, base + (grip - 1) * hard * 1.9 + grip * 0.14));
  }
}