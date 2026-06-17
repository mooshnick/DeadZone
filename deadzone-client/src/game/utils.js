export const makeId = () => Math.random().toString(36).slice(2, 9);

export const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export const nowMs = () => performance.now();
