export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function randomInt(min, max) {
  return Math.floor(randomBetween(min, max + 1));
}

export function randomSign() {
  return Math.random() > 0.5 ? 1 : -1;
}

export function pickOne(values) {
  return values[Math.floor(Math.random() * values.length)];
}

export function pickDifferent(values, previousValue) {
  const length = values.length;

  if (length <= 1) {
    return values[0];
  }

  let index = Math.floor(Math.random() * length);

  if (values[index] === previousValue) {
    index = (index + 1 + Math.floor(Math.random() * (length - 1))) % length;
  }

  return values[index];
}

export function chance(probability) {
  return Math.random() < probability;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function blend(current, target, alpha) {
  return current + (target - current) * alpha;
}

export function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function pickQualityValue(definition, qualityName) {
  if (definition && typeof definition === "object" && qualityName in definition) {
    return definition[qualityName];
  }

  return definition;
}

export function normalizeWrap(value, min, max) {
  const range = max - min;

  if (range <= 0) {
    return min;
  }

  let wrapped = value;

  while (wrapped < min) {
    wrapped += range;
  }

  while (wrapped > max) {
    wrapped -= range;
  }

  return wrapped;
}
