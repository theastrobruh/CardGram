/**
 * Astro Physics Engine — 2D Rigid Body Physics for CardGram
 * Arquitectura basada en 'astro-physics-engine':
 * - PointerVelocityTracker con ventana de muestreo temporal (90ms)
 * - Inclinación dinámica con resorte-amortiguador (Spring-Damper Tilt: k_spring=145, d_damp=14)
 * - Detección y resolución elástica de colisiones AABB con masas e impulsos
 * - Substepping para estabilidad y prevención de tunneling
 * - Modos de fricción táctil exponencial (surfaceFriction = friction^(dt*60))
 * - Soporte especial para cuerpos restringidos (Azura: movimiento lateral puro)
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.AstroPhysics = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class PointerVelocityTracker {
    constructor() {
      this.samples = [];
    }

    reset(x, y) {
      this.samples = [{ x, y, t: performance.now() }];
    }

    push(x, y) {
      const now = performance.now();
      this.samples.push({ x, y, t: now });
      while (this.samples.length > 2 && now - this.samples[0].t > 90) {
        this.samples.shift();
      }
    }

    getVelocity() {
      if (this.samples.length < 2) return { vx: 0, vy: 0 };
      const first = this.samples[0];
      const last = this.samples[this.samples.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt < 0.004) return { vx: 0, vy: 0 };
      const maxV = 2800; // px/s
      return {
        vx: Math.max(-maxV, Math.min(maxV, (last.x - first.x) / dt)),
        vy: Math.max(-maxV, Math.min(maxV, (last.y - first.y) / dt))
      };
    }
  }

  class PhysicsWorld {
    constructor(options = {}) {
      this.mode = options.mode || 'tactile'; // 'tactile' | 'earth' | 'zero-g' | 'static'
      this.gravity = options.gravity || 1350; // px/s^2
      this.restitution = options.restitution !== undefined ? options.restitution : 0.65;
      this.friction = options.friction !== undefined ? options.friction : 0.945; // tactile surface friction
      this.collisionsEnabled = options.collisionsEnabled !== undefined ? options.collisionsEnabled : true;
      this.tiltEnabled = options.tiltEnabled !== undefined ? options.tiltEnabled : true;
      this.maxTilt = options.maxTilt || 16;
      this.bodies = new Map(); // id -> body
      this.animId = null;
      this.lastTime = 0;
      this.boundsGetter = options.getBounds || null;
      this.onImpact = options.onImpact || null;
      this.onTick = options.onTick || null;
    }

    addBody(id, data = {}) {
      const body = {
        id,
        kind: data.kind || 'card',
        x: data.x || 0,
        y: data.y || 0,
        vx: data.vx || 0,
        vy: data.vy || 0,
        width: data.width || 100,
        height: data.height || 140,
        mass: data.mass || 1,
        angle: data.angle || 0,
        angularVel: data.angularVel || 0,
        targetAngle: data.targetAngle || 0,
        scale: data.scale || 1,
        isDragging: false,
        lockY: Boolean(data.lockY), // Para Azura (movimiento lateral puro)
        lockRotation: Boolean(data.lockRotation), // Sin rotación
        isStatic: Boolean(data.isStatic),
        el: data.el || null,
        tracker: new PointerVelocityTracker(),
        customRender: data.customRender || null
      };
      this.bodies.set(id, body);
      return body;
    }

    removeBody(id) {
      this.bodies.delete(id);
    }

    getBody(id) {
      return this.bodies.get(id);
    }

    clear() {
      this.bodies.clear();
      this.stop();
    }

    start() {
      if (this.animId) return;
      this.lastTime = performance.now();
      const loop = (time) => {
        const dtRaw = (time - this.lastTime) / 1000;
        this.lastTime = time;
        this.step(Math.min(dtRaw, 0.05));
        if (typeof this.onTick === 'function') {
          this.onTick(this);
        }
        this.animId = requestAnimationFrame(loop);
      };
      this.animId = requestAnimationFrame(loop);
    }

    stop() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    }

    step(dtRaw) {
      if (this.bodies.size === 0) return;
      const bounds = typeof this.boundsGetter === 'function' ? this.boundsGetter() : null;
      if (!bounds) return;

      const dt = Math.min(dtRaw, 0.033);
      const substeps = 2; // Doble substep para máxima precisión física
      const subDt = dt / substeps;
      const list = Array.from(this.bodies.values());

      for (let s = 0; s < substeps; s++) {
        for (let i = 0; i < list.length; i++) {
          const b = list[i];
          if (b.isStatic) continue;

          // Inclinación por resorte-amortiguador (Spring-Damper Tilt)
          if (this.tiltEnabled && !b.lockRotation) {
            const springK = 145;
            const springDamp = 14;
            const target = b.isDragging
              ? Math.max(-13, Math.min(13, b.targetAngle))
              : Math.max(-this.maxTilt, Math.min(this.maxTilt, b.vx * 0.0085));
            const accelAngle = (target - b.angle) * springK - b.angularVel * springDamp;
            b.angularVel += accelAngle * subDt;
            b.angle += b.angularVel * subDt;
          } else if (b.lockRotation) {
            b.angle = 0;
            b.angularVel = 0;
          }

          if (b.isDragging) {
            b.targetAngle *= 0.88;
            continue;
          }

          // Fuerzas según modo táctil/físico
          if (this.mode === 'earth') {
            if (!b.lockY) b.vy += this.gravity * subDt;
            const airDamp = Math.pow(0.988, subDt * 60);
            b.vx *= airDamp;
            if (!b.lockY) b.vy *= airDamp;
          } else {
            // Tactile exponencial
            const surfaceFriction = Math.pow(this.friction, subDt * 60);
            b.vx *= surfaceFriction;
            if (!b.lockY) b.vy *= surfaceFriction;
            if (Math.hypot(b.vx, b.lockY ? 0 : b.vy) < 3.5) {
              b.vx = 0;
              b.vy = 0;
            }
          }

          // Integración de posición (px)
          b.x += b.vx * subDt;
          if (!b.lockY) b.y += b.vy * subDt;

          // Colisión con límites de ventana / contenedor
          const minX = bounds.left;
          const minY = bounds.top;
          const maxX = Math.max(minX, bounds.right - b.width);
          const maxY = Math.max(minY, bounds.bottom - b.height);
          const bounce = this.restitution;

          if (b.x < minX) {
            b.x = minX;
            b.vx = Math.abs(b.vx) * bounce;
            if (this.onImpact && Math.abs(b.vx) > 50) this.onImpact(b, 'wall-left');
          } else if (b.x > maxX) {
            b.x = maxX;
            b.vx = -Math.abs(b.vx) * bounce;
            if (this.onImpact && Math.abs(b.vx) > 50) this.onImpact(b, 'wall-right');
          }

          if (!b.lockY) {
            if (b.y < minY) {
              b.y = minY;
              b.vy = Math.abs(b.vy) * bounce;
              if (this.onImpact && Math.abs(b.vy) > 50) this.onImpact(b, 'wall-top');
            } else if (b.y > maxY) {
              b.y = maxY;
              b.vy = -Math.abs(b.vy) * bounce;
              if (this.onImpact && Math.abs(b.vy) > 50) this.onImpact(b, 'wall-bottom');
            }
          }
        }

        // Colisiones elásticas AABB entre elementos (Impulso y Masa)
        if (this.collisionsEnabled) {
          for (let i = 0; i < list.length; i++) {
            for (let j = i + 1; j < list.length; j++) {
              const a = list[i];
              const b = list[j];
              if (a.isStatic && b.isStatic) continue;

              const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
              const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

              if (overlapX > 0 && overlapY > 0) {
                let nx = 0, ny = 0, pen = 0;
                if (overlapX < overlapY || a.lockY || b.lockY) {
                  // Separación horizontal
                  pen = overlapX;
                  nx = a.x + a.width * 0.5 < b.x + b.width * 0.5 ? -1 : 1;
                } else {
                  pen = overlapY;
                  ny = a.y + a.height * 0.5 < b.y + b.height * 0.5 ? -1 : 1;
                }

                const invMassA = (a.isDragging || a.isStatic) ? 0 : 1 / Math.max(0.1, a.mass);
                const invMassB = (b.isDragging || b.isStatic) ? 0 : 1 / Math.max(0.1, b.mass);
                const invMassSum = invMassA + invMassB;
                if (invMassSum === 0) continue;

                const corr = pen / invMassSum;
                if (!a.lockY || ny === 0) {
                  a.x += nx * corr * invMassA;
                  if (!a.lockY) a.y += ny * corr * invMassA;
                }
                if (!b.lockY || ny === 0) {
                  b.x -= nx * corr * invMassB;
                  if (!b.lockY) b.y -= ny * corr * invMassB;
                }

                const velAlongNormal = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
                if (velAlongNormal < 0) {
                  const impulse = (-(1 + this.restitution) * velAlongNormal) / invMassSum;
                  if (!a.isDragging && !a.isStatic) {
                    a.vx += impulse * nx * invMassA;
                    if (!a.lockY) a.vy += impulse * ny * invMassA;
                  }
                  if (!b.isDragging && !b.isStatic) {
                    b.vx -= impulse * nx * invMassB;
                    if (!b.lockY) b.vy -= impulse * ny * invMassB;
                  }
                  if (this.onImpact && Math.abs(impulse) > 60) {
                    this.onImpact(a, b);
                  }
                }
              }
            }
          }
        }
      }

      // Renderizado a DOM
      for (let i = 0; i < list.length; i++) {
        const b = list[i];
        if (b.customRender) {
          b.customRender(b);
        } else if (b.el) {
          const rot = b.lockRotation || Math.abs(b.angle) < 0.05 ? '' : ` rotate(${b.angle.toFixed(2)}deg)`;
          b.el.style.transform = `translate3d(${b.x.toFixed(1)}px, ${b.y.toFixed(1)}px, 0)${rot} scale(${b.scale})`;
        }
      }
    }
  }

  return {
    PointerVelocityTracker,
    PhysicsWorld
  };
});
