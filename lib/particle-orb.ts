/**
 * Pure 3D twin-bust silhouette & spring-jiggle physics mathematics for the
 * Hey Lady animated luxury brand emblem ("Hot & Premium Twerking/Bouncing Bust Crest").
 * - Generates a deterministic 3D sculpted twin-bust particle constellation
 *   (twin anatomically curved hemisphere domes, cleavage valley contour,
 *   luminous rose-gold apex highlights, and ambient velvet stardust halo).
 * - Computes coupled spring-harmonic twerk/jiggle displacement (vertical bounce,
 *   counter-phase left/right sway, radial squeeze-and-swell, and interactive
 *   impulse excitation on hover/click).
 * - Zero DOM dependencies — directly unit-testable with node:test.
 */

export interface OrbParticle3D {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  luminance: number;
  layer: 'band' | 'shell' | 'halo';
  side: 'left' | 'right' | 'center';
  phase: number;
}

export interface ProjectedOrbParticle {
  px: number;
  py: number;
  z: number;
  radius: number;
  alpha: number;
  color: string;
  glow: boolean;
}

export interface BustKinematicsState {
  leftOffsetY: number;
  rightOffsetY: number;
  leftOffsetX: number;
  rightOffsetX: number;
  leftScaleX: number;
  leftScaleY: number;
  rightScaleX: number;
  rightScaleY: number;
  cleavageGlow: number;
  tiltAngle: number;
}

/**
 * Deterministic PRNG (Mulberry32) so SSR hydration, tests, and every frame
 * start from an identical, crisp constellation without jitter.
 */
function createSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Computes realistic damped spring-harmonic twerk/jiggle kinematics for the
 * twin bust lobes at a given time `t` (in seconds), interaction boost, and
 * impulse energy.
 * - Left and right domes bounce vertically with a playful phase offset
 *   (signature twerk/jiggle rhythm) while conserving volume (vertical drop
 *   expands horizontal fullness; upward lift narrows slightly).
 */
export function computeBustKinematics(params: {
  time: number;
  boost?: number;
  impulse?: number;
}): BustKinematicsState {
  const { time } = params;
  const boost = Math.max(0.5, Math.min(3, params.boost ?? 1));
  const impulse = Math.max(0, Math.min(2, params.impulse ?? 0));

  const amp = (0.11 + impulse * 0.14) * boost;
  const freq = 4.6 * (0.85 + 0.15 * boost);
  // Subtle double-time twerk polyrhythm (fundamental + 2nd harmonic)
  const phaseL = time * freq;
  const phaseR = time * freq + 0.52; // slight counter-phase lag for lifelike jiggle

  const waveL = Math.sin(phaseL) + 0.32 * Math.sin(phaseL * 2 + 0.4);
  const waveR = Math.sin(phaseR) + 0.32 * Math.sin(phaseR * 2 + 0.9);

  const leftOffsetY = waveL * amp;
  const rightOffsetY = waveR * amp;

  // Symmetrical inward/outward cleavage squeeze as the bust bounces
  const squeezeL = Math.cos(phaseL) * amp * 0.48;
  const squeezeR = -Math.cos(phaseR) * amp * 0.48;

  // Volume-preserving elastic deformation (squash & stretch)
  const leftScaleX = 1 + waveL * amp * 0.55;
  const leftScaleY = 1 - waveL * amp * 0.42;
  const rightScaleX = 1 + waveR * amp * 0.55;
  const rightScaleY = 1 - waveR * amp * 0.42;

  const cleavageGlow = Math.max(
    0.25,
    Math.min(1, 0.58 + 0.42 * Math.sin(time * freq * 1.5))
  );
  const tiltAngle = Math.sin(time * (freq * 0.5)) * 0.065 * boost;

  return {
    leftOffsetY,
    rightOffsetY,
    leftOffsetX: squeezeL,
    rightOffsetX: squeezeR,
    leftScaleX,
    leftScaleY,
    rightScaleX,
    rightScaleY,
    cleavageGlow,
    tiltAngle,
  };
}

/**
 * Builds the 3D Twin-Bust Particle & Contour Constellation:
 * - ~54% `shell`: Twin sculpted 3D breast hemispheres (left dome centered at
 *   x = -0.44, right dome centered at x = +0.44, natural teardrop gravity droop)
 * - ~34% `band`: High-luminance under-bust & cleavage sweetheart contour +
 *   radiant rose-gold apex highlights
 * - ~12% `halo`: Sensual ambient crimson-gold stardust aura
 */
export function generateOrbParticles(
  totalCount: number,
  seed = 18082026
): OrbParticle3D[] {
  const safeCount = Math.max(24, Math.min(1800, Math.floor(totalCount)));
  const rand = createSeededRandom(seed);
  const particles: OrbParticle3D[] = [];

  const bandCount = Math.floor(safeCount * 0.36);
  const haloCount = Math.floor(safeCount * 0.12);
  const shellCount = safeCount - bandCount - haloCount;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const lobeCentersX = [-0.43, 0.43] as const;
  const lobeRadius = 0.52;

  // 1. Twin Sculpted 3D Bust Hemispheres (`shell`)
  for (let i = 0; i < shellCount; i += 1) {
    const sideIndex = i % 2;
    const side: 'left' | 'right' = sideIndex === 0 ? 'left' : 'right';
    const cx = lobeCentersX[sideIndex];

    const idxInLobe = Math.floor(i / 2);
    const perLobe = Math.max(1, Math.ceil(shellCount / 2));
    // Concentrate points on the forward-facing hemisphere (z >= -0.15)
    const u = (idxInLobe + 0.5) / perLobe;
    const zLocal = 1 - 1.15 * u; // ranges from +1 (apex) down to -0.15 (ribcage base)
    const ringR = Math.sqrt(Math.max(0, 1 - zLocal * zLocal));
    const theta = goldenAngle * idxInLobe + (rand() - 0.5) * 0.12;

    const lx = Math.cos(theta) * ringR;
    const ly = Math.sin(theta) * ringR;
    // Natural teardrop contour: slightly fuller lower curve as zLocal increases
    const teardropY = ly + Math.max(0, zLocal) * 0.14;

    particles.push({
      x: cx + lx * lobeRadius,
      y: teardropY * lobeRadius * 1.04 + 0.04,
      z: zLocal * 0.85,
      baseRadius: 0.56 + Math.max(0, zLocal) * 0.45 + rand() * 0.35,
      luminance: 0.48 + Math.max(0, zLocal) * 0.48,
      layer: 'shell',
      side,
      phase: rand() * Math.PI * 2,
    });
  }

  // 2. Luminous Sweetheart Cleavage, Under-Bust Curves & Rose-Gold Apex Peaks (`band`)
  for (let i = 0; i < bandCount; i += 1) {
    const sideIndex = i % 2;
    const side: 'left' | 'right' = sideIndex === 0 ? 'left' : 'right';
    const cx = lobeCentersX[sideIndex];
    const mode = i % 5;

    if (mode === 0) {
      // Radiant Apex Peak / Areola Crown Highlight
      const r = rand() * 0.14;
      const angle = rand() * Math.PI * 2;
      particles.push({
        x: cx * 1.04 + Math.cos(angle) * r,
        y: 0.11 + Math.sin(angle) * r,
        z: 0.88 + rand() * 0.12,
        baseRadius: 0.9 + rand() * 0.45,
        luminance: 0.94 + rand() * 0.06,
        layer: 'band',
        side,
        phase: rand() * Math.PI * 2,
      });
    } else {
      // Sensual Under-Bust & Inner Cleavage Rim Arc
      const arcAngle = -0.15 * Math.PI + rand() * 1.3 * Math.PI;
      const rimJitter = 0.96 + rand() * 0.08;
      const lx = Math.cos(arcAngle) * lobeRadius * rimJitter;
      const ly = Math.sin(arcAngle) * lobeRadius * 1.05 * rimJitter;

      particles.push({
        x: cx + lx,
        y: ly + 0.05,
        z: 0.35 + Math.sin(arcAngle) * 0.35,
        baseRadius: 0.65 + rand() * 0.5,
        luminance: 0.78 + rand() * 0.22,
        layer: 'band',
        side,
        phase: rand() * Math.PI * 2,
      });
    }
  }

  // 3. Sensual Outer Stardust Halo (`halo`)
  for (let i = 0; i < haloCount; i += 1) {
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - u * u));
    const dist = 1.04 + rand() * 0.24;

    particles.push({
      x: Math.cos(theta) * r * dist,
      y: u * dist * 0.82,
      z: Math.sin(theta) * r * dist * 0.6,
      baseRadius: 0.42 + rand() * 0.48,
      luminance: 0.32 + rand() * 0.4,
      layer: 'halo',
      side: 'center',
      phase: rand() * Math.PI * 2,
    });
  }

  return particles;
}

/**
 * Picks a luxury rose-gold / warm champagne / neon-crimson / velvet-amber hue
 * for the 3D twin-bust particles.
 */
function pickParticleColor(
  layer: OrbParticle3D['layer'],
  depthFactor: number,
  luminance: number
): string {
  if (layer === 'band') {
    if (depthFactor > 0.78 && luminance > 0.9) return '#FFF1F2'; // hot white-rose apex glint
    if (depthFactor > 0.56) return '#FDA4AF'; // silky rose-pink highlight
    return '#FB7185'; // vibrant crimson-rose contour
  }
  if (layer === 'halo') {
    return depthFactor > 0.5 ? '#FCD34D' : '#F43F5E';
  }
  // Shell: warm champagne-peach on upper/front swell, deep velvet crimson-amber in cleavage shadow
  if (depthFactor > 0.74) return '#FDE68A';
  if (depthFactor > 0.48) return '#FB7185';
  if (depthFactor > 0.24) return '#E11D48';
  return '#9F1239';
}

/**
 * Projects the animated 3D twin-bust particles with live spring-harmonic twerk/jiggle
 * kinematics onto a 2D square canvas and sorts back-to-front.
 */
export function projectOrbParticles(
  particles: readonly OrbParticle3D[],
  params: {
    size: number;
    angleY: number;
    tiltZ?: number;
    tiltX?: number;
    time?: number;
    boost?: number;
    impulse?: number;
  }
): ProjectedOrbParticle[] {
  const { size, angleY } = params;
  const time = params.time ?? 0;
  const boost = params.boost ?? 1;
  const impulse = params.impulse ?? 0;

  const kinematics = computeBustKinematics({ time, boost, impulse });

  // Gentle seductive torso sway around Y instead of full 360 spin so the twin bust silhouette always faces the viewer
  const swayY = Math.sin(angleY * 1.35) * 0.24;
  const tiltZ = (params.tiltZ ?? 0) + kinematics.tiltAngle;
  const tiltX = params.tiltX ?? 0.14;

  const cx = size / 2;
  const cy = size / 2;
  const bustRadius = size * 0.42;
  const fov = 2.85;
  const scaleUnit = Math.max(0.42, Math.min(1.08, size / 132));

  const cosY = Math.cos(swayY);
  const sinY = Math.sin(swayY);
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const cosZ = Math.cos(tiltZ);
  const sinZ = Math.sin(tiltZ);

  const projected: ProjectedOrbParticle[] = new Array(particles.length);

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];

    const lobeCenter = p.side === 'left' ? -0.43 : p.side === 'right' ? 0.43 : 0;
    const scaleX =
      p.side === 'left'
        ? kinematics.leftScaleX
        : p.side === 'right'
          ? kinematics.rightScaleX
          : 1;
    const scaleY =
      p.side === 'left'
        ? kinematics.leftScaleY
        : p.side === 'right'
          ? kinematics.rightScaleY
          : 1;
    const offsetX =
      p.side === 'left'
        ? kinematics.leftOffsetX
        : p.side === 'right'
          ? kinematics.rightOffsetX
          : 0;
    const offsetY =
      p.side === 'left'
        ? kinematics.leftOffsetY
        : p.side === 'right'
          ? kinematics.rightOffsetY
          : 0;

    // Elastic deformation weighted by forward depth (apex jiggles most, ribcage base stays anchored)
    const jiggleWeight = p.side === 'center' ? 0.35 : Math.max(0.25, (p.z + 0.2) / 1.1);
    const localDx = (p.x - lobeCenter) * (1 + (scaleX - 1) * jiggleWeight);
    const localDy = p.y * (1 + (scaleY - 1) * jiggleWeight);

    const x0 = lobeCenter + localDx + offsetX * jiggleWeight;
    const y0 = localDy + offsetY * jiggleWeight;
    const z0 =
      p.z *
      (1 +
        Math.sin(time * 5.2 + (p.side === 'left' ? 0 : 0.6) + p.phase * 0.15) *
          0.06 *
          jiggleWeight);

    // 1. Torso Y-axis sway
    const x1 = x0 * cosY - z0 * sinY;
    const z1 = x0 * sinY + z0 * cosY;
    const y1 = y0;

    // 2. Playful Z-axis shoulder/chest tilt
    const x2 = x1 * cosZ - y1 * sinZ;
    const y2 = x1 * sinZ + y1 * cosZ;
    const z2 = z1;

    // 3. Viewing X-axis angle
    const y3 = y2 * cosX - z2 * sinX;
    const z3 = y2 * sinX + z2 * cosX;
    const x3 = x2;

    const perspective = fov / (fov - z3 * 0.75);
    const px = cx + x3 * bustRadius * perspective;
    const py = cy + y3 * bustRadius * perspective;

    const depthFactor = Math.max(0, Math.min(1, (z3 + 1.15) / 2.2));
    const twinkle = 0.88 + 0.12 * Math.sin(time * 3.4 + p.phase);

    const alpha = Math.max(
      0.08,
      Math.min(
        1,
        (p.layer === 'band' ? 0.38 : p.layer === 'halo' ? 0.14 : 0.2) +
          depthFactor * (p.layer === 'band' ? 0.72 : 0.64) * p.luminance * twinkle
      )
    );

    const radius = Math.max(
      0.42,
      p.baseRadius * scaleUnit * (0.54 + depthFactor * 0.64) * perspective
    );

    projected[i] = {
      px,
      py,
      z: z3,
      radius,
      alpha,
      color: pickParticleColor(p.layer, depthFactor, p.luminance),
      glow: p.layer === 'band' && depthFactor > 0.72 && p.luminance > 0.86,
    };
  }

  projected.sort((a, b) => a.z - b.z);
  return projected;
}
