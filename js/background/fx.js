function createSeededRandom(seed = 1) {
  let state = Math.max(1, Math.floor(seed) % 2147483647);

  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function createCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createLinearCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function createTextureFromCanvas(THREE, canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function drawSoftBlob(ctx, x, y, radius, colorStops, alpha = 1) {
  const gradient = ctx.createRadialGradient(x, y, radius * 0.08, x, y, radius);

  colorStops.forEach((stop) => {
    gradient.addColorStop(stop.offset, stop.color);
  });

  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function createGlowTexture(THREE, options = {}) {
  const size = options.size || 256;
  const innerColor = options.innerColor || "rgba(255,255,255,1)";
  const midColor = options.midColor || "rgba(171,225,255,0.42)";
  const outerColor = options.outerColor || "rgba(0,0,0,0)";
  const canvas = createCanvas(size);
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size * 0.5, size * 0.5, size * 0.04, size * 0.5, size * 0.5, size * 0.5);

  gradient.addColorStop(0, innerColor);
  gradient.addColorStop(0.35, midColor);
  gradient.addColorStop(1, outerColor);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  return createTextureFromCanvas(THREE, canvas);
}

export function createStreakTexture(THREE, options = {}) {
  const width = options.width || 1024;
  const height = options.height || 96;
  const color = options.color || "rgba(151,238,255,0.96)";
  const accent = options.accent || "rgba(255,255,255,0.9)";
  const outer = options.outer || "rgba(0,0,0,0)";
  const canvas = createLinearCanvas(width, height);
  const context = canvas.getContext("2d");

  const gradient = context.createLinearGradient(0, height * 0.5, width, height * 0.5);
  gradient.addColorStop(0, outer);
  gradient.addColorStop(0.08, color);
  gradient.addColorStop(0.45, accent);
  gradient.addColorStop(0.88, color);
  gradient.addColorStop(1, outer);

  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, height * 0.5);
  context.lineTo(width * 0.12, height * 0.16);
  context.lineTo(width * 0.88, height * 0.16);
  context.lineTo(width, height * 0.5);
  context.lineTo(width * 0.88, height * 0.84);
  context.lineTo(width * 0.12, height * 0.84);
  context.closePath();
  context.fill();

  const core = context.createLinearGradient(0, height * 0.5, width, height * 0.5);
  core.addColorStop(0, "rgba(255,255,255,0)");
  core.addColorStop(0.18, "rgba(255,255,255,0.54)");
  core.addColorStop(0.5, "rgba(255,255,255,0.98)");
  core.addColorStop(0.82, "rgba(255,255,255,0.54)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = core;
  context.fillRect(0, height * 0.42, width, height * 0.16);

  return createTextureFromCanvas(THREE, canvas);
}

export function createNebulaTexture(THREE, options = {}) {
  const size = options.size || 1024;
  const seed = options.seed || 7;
  const density = options.density || 24;
  const banded = Boolean(options.banded);
  const palette = options.palette || [
    "rgba(52,108,255,0.28)",
    "rgba(76,214,255,0.24)",
    "rgba(190,116,255,0.18)",
    "rgba(255,155,91,0.16)"
  ];
  const canvas = createCanvas(size);
  const context = canvas.getContext("2d");
  const random = createSeededRandom(seed);

  context.clearRect(0, 0, size, size);
  context.globalCompositeOperation = "lighter";

  if (banded) {
    context.save();
    context.translate(size * 0.5, size * 0.5);
    context.rotate(-0.48);
    context.translate(-size * 0.5, -size * 0.5);

    for (let index = 0; index < density + 14; index += 1) {
      const t = index / Math.max(1, density + 13);
      const x = size * (0.12 + t * 0.76 + random() * 0.08);
      const y = size * (0.42 + (random() - 0.5) * 0.2);
      const radius = size * (0.08 + random() * 0.12);
      const color = palette[index % palette.length];
      drawSoftBlob(
        context,
        x,
        y,
        radius,
        [
          { offset: 0, color },
          { offset: 0.55, color: color.replace(/0\.\d+\)/, "0.12)") },
          { offset: 1, color: "rgba(0,0,0,0)" }
        ],
        0.8
      );
    }

    context.restore();
  }

  for (let index = 0; index < density; index += 1) {
    const x = size * (0.08 + random() * 0.84);
    const y = size * (0.08 + random() * 0.84);
    const radius = size * (0.1 + random() * 0.22);
    const color = palette[index % palette.length];
    const middleAlpha = 0.08 + random() * 0.08;

    drawSoftBlob(
      context,
      x,
      y,
      radius,
      [
        { offset: 0, color },
        { offset: 0.45, color: color.replace(/0\.\d+\)/, `${middleAlpha.toFixed(2)})`) },
        { offset: 1, color: "rgba(0,0,0,0)" }
      ],
      0.95
    );
  }

  context.globalCompositeOperation = "source-over";
  return createTextureFromCanvas(THREE, canvas);
}

export function createPlanetTexture(THREE, options = {}) {
  const size = options.size || 1024;
  const seed = options.seed || 3;
  const palette = options.palette || {
    shadow: "#07111d",
    base: "#14345d",
    mid: "#2f6da6",
    detail: "#62b5d6",
    accent: "#f59d61"
  };
  const random = createSeededRandom(seed);
  const canvas = createCanvas(size);
  const context = canvas.getContext("2d");

  const baseGradient = context.createRadialGradient(size * 0.34, size * 0.28, size * 0.1, size * 0.5, size * 0.5, size * 0.58);
  baseGradient.addColorStop(0, palette.detail);
  baseGradient.addColorStop(0.22, palette.mid);
  baseGradient.addColorStop(0.72, palette.base);
  baseGradient.addColorStop(1, palette.shadow);
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, size, size);

  context.save();
  context.translate(size * 0.5, size * 0.5);
  context.rotate(-0.32 + random() * 0.18);
  context.translate(-size * 0.5, -size * 0.5);
  context.globalAlpha = 0.38;

  for (let index = 0; index < 16; index += 1) {
    const y = size * (0.18 + index * 0.038 + (random() - 0.5) * 0.025);
    const width = size * (0.28 + random() * 0.18);
    const height = size * (0.018 + random() * 0.028);
    const bandColor = index % 4 === 0 ? palette.accent : index % 2 === 0 ? palette.detail : palette.mid;
    const bandGradient = context.createLinearGradient(size * 0.5 - width, y, size * 0.5 + width, y);

    bandGradient.addColorStop(0, "rgba(0,0,0,0)");
    bandGradient.addColorStop(0.2, `${bandColor}10`);
    bandGradient.addColorStop(0.5, `${bandColor}66`);
    bandGradient.addColorStop(0.8, `${bandColor}10`);
    bandGradient.addColorStop(1, "rgba(0,0,0,0)");

    context.strokeStyle = bandGradient;
    context.lineWidth = height;
    context.beginPath();
    context.ellipse(size * 0.5, y, width, height * (1.4 + random() * 0.5), 0, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();

  context.globalAlpha = 0.9;
  for (let index = 0; index < 22; index += 1) {
    const x = size * (0.14 + random() * 0.72);
    const y = size * (0.14 + random() * 0.72);
    const radius = size * (0.04 + random() * 0.12);
    const color = index % 5 === 0 ? palette.accent : index % 2 === 0 ? palette.detail : palette.base;
    drawSoftBlob(
      context,
      x,
      y,
      radius,
      [
        { offset: 0, color: `${color}e0` },
        { offset: 0.7, color: `${color}20` },
        { offset: 1, color: "rgba(0,0,0,0)" }
      ],
      0.55
    );
  }

  context.globalCompositeOperation = "multiply";
  const terminator = context.createLinearGradient(size * 0.12, size * 0.1, size * 0.88, size * 0.84);
  terminator.addColorStop(0, "rgba(3,7,16,0.82)");
  terminator.addColorStop(0.34, "rgba(3,7,16,0.42)");
  terminator.addColorStop(0.62, "rgba(3,7,16,0.12)");
  terminator.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = terminator;
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 16; index += 1) {
    const x = size * (0.16 + random() * 0.68);
    const y = size * (0.16 + random() * 0.68);
    const radius = size * (0.03 + random() * 0.08);
    drawSoftBlob(
      context,
      x,
      y,
      radius,
      [
        { offset: 0, color: "rgba(4,10,18,0.62)" },
        { offset: 1, color: "rgba(0,0,0,0)" }
      ],
      1
    );
  }

  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;

  const atmosphereSweep = context.createLinearGradient(size * 0.08, size * 0.16, size * 0.82, size * 0.86);
  atmosphereSweep.addColorStop(0, "rgba(255,255,255,0)");
  atmosphereSweep.addColorStop(0.48, "rgba(255,255,255,0.03)");
  atmosphereSweep.addColorStop(0.72, `${palette.detail}36`);
  atmosphereSweep.addColorStop(1, `${palette.accent}16`);
  context.fillStyle = atmosphereSweep;
  context.fillRect(0, 0, size, size);

  const rim = context.createRadialGradient(size * 0.5, size * 0.5, size * 0.34, size * 0.5, size * 0.5, size * 0.5);
  rim.addColorStop(0.82, "rgba(255,255,255,0)");
  rim.addColorStop(0.96, "rgba(255,255,255,0.18)");
  rim.addColorStop(1, "rgba(255,255,255,0.42)");
  context.fillStyle = rim;
  context.fillRect(0, 0, size, size);

  return createTextureFromCanvas(THREE, canvas);
}
