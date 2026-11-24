/**
 * Pure 3D golden particle-orb mathematics for the Hey Lady animated brand logo.
 * Generates a deterministic Fibonacci sphere + radiant equatorial band + ambient
 * stardust halo inspired by kinetic luminous-sphere motion graphics.
 * Zero DOM dependencies — directly unit-testable with node:test.
 */

export interface OrbParticle3D {
  x: number;
  y: number;
  z: number;
  baseRadius: number;
  luminance: number;
  layer: 'band' | 'shell' | 'halo';
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
 * Builds the 3D particle constellation:
 * - ~52% golden sphere shell (Fibonacci lattice for uniform curvature)
 * - ~36% dense equatorial luminous ribbon (signature bright golden core band)
 * - ~12% subtle outer stardust halo
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

  // 1. Spherical Fibonacci shell
  for (let i = 0; i < shellCount; i += 1) {
    const t = (i + 0.5) / shellCount;
    const y = 1 - 2 * t;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i + (rand() - 0.5) * 0.14;
    const jitter = 0.94 + rand() * 0.1;

    particles.push({
      x: Math.cos(theta) * r * jitter,
      y: y * jitter,
      z: Math.sin(theta) * r * jitter,
      baseRadius: 0.55 + rand() * 0.65,
      luminance: 0.45 + rand() * 0.45,
      layer: 'shell',
      phase: rand() * Math.PI * 2,
    });
  }

  // 2. Signature luminous diagonal/equatorial golden energy band
  for (let i = 0; i < bandCount; i += 1) {
    const theta = (i / bandCount) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    // Gaussian-like concentration near y = 0 with delicate shimmer feathering
    const spread = ((rand() + rand() + rand()) / 3 - 0.5) * 0.56;
    const y = spread;
    const r = Math.sqrt(Math.max(0.08, 1 - y * y)) * (0.95 + rand() * 0.09);
    const coreWeight = 1 - Math.min(1, Math.abs(spread) / 0.28);

    particles.push({
      x: Math.cos(theta) * r,
      y,
      z: Math.sin(theta) * r,
      baseRadius: 0.45 + coreWeight * 0.65 + rand() * 0.3,
      luminance: 0.65 + coreWeight * 0.35,
      layer: 'band',
      phase: rand() * Math.PI * 2,
    });
  }

  // 3. Delicate outer golden stardust halo
  for (let i = 0; i < haloCount; i += 1) {
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const r = Math.sqrt(Math.max(0, 1 - u * u));
    const dist = 1.08 + rand() * 0.28;

    particles.push({
      x: Math.cos(theta) * r * dist,
      y: u * dist,
      z: Math.sin(theta) * r * dist,
      baseRadius: 0.4 + rand() * 0.5,
      luminance: 0.28 + rand() * 0.4,
      layer: 'halo',
      phase: rand() * Math.PI * 2,
    });
  }

  return particles;
}

/**
 * Picks a luxury gold / champagne / burnished-amber / rose-copper particle hue
 * matching the luminous golden orb aesthetic.
 */
function pickParticleColor(
  layer: OrbParticle3D['layer'],
  depthFactor: number,
  luminance: number
): string {
  if (layer === 'band') {
    if (depthFactor > 0.68 && luminance > 0.82) return '#FFFBEB'; // white-gold core sparkle
    if (depthFactor > 0.45) return '#FDE047'; // bright luminous gold
    return '#F59E0B'; // rich amber gold
  }
  if (layer === 'halo') {
    return depthFactor > 0.5 ? '#FCD34D' : '#D97706';
  }
  // Shell: warm champagne on the front rim, deep burnished amber/rose-bronze on back
  if (depthFactor > 0.72) return '#FEF08A';
  if (depthFactor > 0.42) return '#F59E0B';
  if (depthFactor > 0.2) return '#B45309';
  return '#9F1239'; // subtle velvet crimson shadow undertone on far side
}

/**
 * Projects rotated 3D particles onto a 2D square canvas and sorts back-to-front
 * so foreground golden sparks naturally layer over deeper amber particles.
 */
export function projectOrbParticles(
  particles: readonly OrbParticle3D[],
  params: {
    size: number;
    angleY: number;
    tiltZ?: number;
    tiltX?: number;
    time?: number;
  }
): ProjectedOrbParticle[] {
  const { size, angleY } = params;
  const tiltZ = params.tiltZ ?? -0.24; // subtle luxury diagonal band tilt like reference video
  const tiltX = params.tiltX ?? 0.22;
  const time = params.time ?? 0;

  const cx = size / 2;
  const cy = size / 2;
  const sphereRadius = size * 0.38;
  const fov = 2.85;
  const scaleUnit = Math.max(0.4, Math.min(1.05, size / 138));

  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const cosZ = Math.cos(tiltZ);
  const sinZ = Math.sin(tiltZ);

  const projected: ProjectedOrbParticle[] = new Array(particles.length);

  for (let i = 0; i < particles.length; i += 1) {
    const p = particles[i];

    // Gentle organic shimmer along the luminous equatorial band
    const wave =
      p.layer === 'band'
        ? 1 + Math.sin(time * 2.1 + p.phase) * 0.035
        : p.layer === 'halo'
          ? 1 + Math.sin(time * 1.4 + p.phase) * 0.045
          : 1;

    const x0 = p.x * wave;
    const y0 = p.y * wave;
    const z0 = p.z * wave;

    // 1. Rotate around Y axis (primary spin)
    const x1 = x0 * cosY - z0 * sinY;
    const z1 = x0 * sinY + z0 * cosY;
    const y1 = y0;

    // 2. Apply diagonal Z tilt
    const x2 = x1 * cosZ - y1 * sinZ;
    const y2 = x1 * sinZ + y1 * cosZ;
    const z2 = z1;

    // 3. Apply subtle X viewing angle
    const y3 = y2 * cosX - z2 * sinX;
    const z3 = y2 * sinX + z2 * cosX;
    const x3 = x2;

    const perspective = fov / (fov - z3 * 0.75);
    const px = cx + x3 * sphereRadius * perspective;
    const py = cy + y3 * sphereRadius * perspective;

    // Depth factor in [0, 1] (0 = far back, 1 = front center)
    const depthFactor = Math.max(0, Math.min(1, (z3 + 1.25) / 2.5));
    const twinkle = 0.86 + 0.14 * Math.sin(time * 2.6 + p.phase);

    const alpha = Math.max(
      0.08,
      Math.min(
        1,
        (p.layer === 'band' ? 0.34 : p.layer === 'halo' ? 0.14 : 0.16) +
          depthFactor * (p.layer === 'band' ? 0.72 : 0.62) * p.luminance * twinkle
      )
    );

    const radius = Math.max(
      0.4,
      p.baseRadius * scaleUnit * (0.52 + depthFactor * 0.62) * perspective
    );

    projected[i] = {
      px,
      py,
      z: z3,
      radius,
      alpha,
      color: pickParticleColor(p.layer, depthFactor, p.luminance),
      glow: p.layer === 'band' && depthFactor > 0.74 && p.luminance > 0.88,
    };
  }

  projected.sort((a, b) => a.z - b.z);
  return projected;
}
