export class ArenaLayouts {
  static block(x, z, w, d, h, y = h / 2, kind = 'cover') {
    return { x, z, w, d, h, y, kind };
  }

  static stairs(x, z, dirX = 1, dirZ = 0, steps = 6, kind = 'stairs') {
    return Array.from({ length: steps }, (_, index) => {
      const height = 0.55 + index * 0.42;
      return ArenaLayouts.block(
        x + dirX * index * 2.2,
        z + dirZ * index * 2.2,
        dirX === 0 ? 5.5 : 2.4,
        dirZ === 0 ? 5.5 : 2.4,
        height,
        height / 2,
        kind,
      );
    });
  }

  static tallStairs(x, z, dirX = 1, dirZ = 0, baseY = 0, targetY = 6, steps = 10, kind = 'stairs') {
    return Array.from({ length: steps }, (_, index) => {
      const progress = (index + 1) / steps;
      const height = baseY + progress * targetY;
      return ArenaLayouts.block(
        x + dirX * index * 1.65,
        z + dirZ * index * 1.65,
        dirX === 0 ? 4.5 : 1.9,
        dirZ === 0 ? 4.5 : 1.9,
        height,
        height / 2,
        kind,
      );
    });
  }

  static floorStairs(x, z, dirX = 1, dirZ = 0, startY = 0.5, endY = 7.5, steps = 12, kind = 'stairs') {
    return Array.from({ length: steps }, (_, index) => {
      const progress = (index + 1) / steps;
      const top = startY + progress * (endY - startY);
      return ArenaLayouts.block(
        x + dirX * index * 2.1,
        z + dirZ * index * 2.1,
        dirX === 0 ? 5.2 : 2.6,
        dirZ === 0 ? 5.2 : 2.6,
        0.58,
        top - 0.29,
        kind,
      );
    });
  }

  static castleStairs(x, z, dirX = 1, dirZ = 0, startY = 0.5, endY = 7.5, steps = 23) {
    const stride = 1.15;
    const runLength = (steps - 1) * stride;
    const centerX = x + (dirX * runLength) / 2;
    const centerZ = z + (dirZ * runLength) / 2;
    const railHeight = endY - startY + 1.4;
    const railY = startY + railHeight / 2;
    const width = dirX === 0 ? 7.2 : 3.4;
    const depth = dirZ === 0 ? 7.2 : 3.4;
    const lengthBlock = runLength + 4.6;
    const perpX = dirZ === 0 ? 0 : 1;
    const perpZ = dirX === 0 ? 0 : 1;
    const railOffset = 4.85;
    const landingTopY = endY;
    const treadThickness = 0.58;

    const treads = Array.from({ length: steps }, (_, index) => {
      const progress = (index + 1) / steps;
      const top = startY + progress * (endY - startY);
      return ArenaLayouts.block(
        x + dirX * index * stride,
        z + dirZ * index * stride,
        width,
        depth,
        treadThickness,
        top - treadThickness / 2,
        'stone-steps',
      );
    });

    const landing = ArenaLayouts.block(
      x + dirX * (steps * stride),
      z + dirZ * (steps * stride),
      dirX === 0 ? 8.4 : 6.8,
      dirZ === 0 ? 8.4 : 6.8,
      0.65,
      landingTopY - 0.325,
      'stone-landing',
    );

    const railA = ArenaLayouts.block(
      centerX + perpX * railOffset,
      centerZ + perpZ * railOffset,
      dirX === 0 ? 0.7 : lengthBlock,
      dirZ === 0 ? 0.7 : lengthBlock,
      railHeight,
      railY,
      'stair-wall',
    );
    const railB = ArenaLayouts.block(
      centerX - perpX * railOffset,
      centerZ - perpZ * railOffset,
      dirX === 0 ? 0.7 : lengthBlock,
      dirZ === 0 ? 0.7 : lengthBlock,
      railHeight,
      railY,
      'stair-wall',
    );

    return [...treads, landing, railA, railB];
  }

  static blocksFor(map) {
    const b = ArenaLayouts.block;
    const s = ArenaLayouts.stairs;
    const ts = ArenaLayouts.tallStairs;
    const cs = ArenaLayouts.castleStairs;
    const theme = map.theme || map.id;
    const layouts = {
      foundry: [
        b(0, 0, 28, 24, 1, 5.5, 'factory-deck'),
        b(-14, 0, 1, 24, 5, 8.2, 'factory-wall'),
        b(14, 0, 1, 24, 5, 8.2, 'factory-wall'),
        b(0, -12, 28, 1, 5, 8.2, 'factory-wall'),
        b(-5, 2, 1, 10, 3, 7, 'factory-cover'),
        b(6, -3, 8, 1, 3, 7, 'factory-cover'),
        ...ts(-20, -9, 1, 0, 0, 5.5, 8, 'metal-steps'),
        b(0, -26, 20, 5, 3),
        b(-28, 0, 7, 22, 4),
        b(28, 0, 7, 22, 4),
        b(-12, 24, 20, 5, 3),
        b(16, -2, 9, 9, 5),
        b(-2, 10, 7, 16, 2.5),
      ],
      pitch: [
        b(0, 0, 32, 18, 1, 5.2, 'upper-stand'),
        b(-16, 0, 1, 18, 4, 7.5, 'dummy-wall'),
        b(16, 0, 1, 18, 4, 7.5, 'dummy-wall'),
        b(0, 0, 10, 1, 3, 6.8, 'dummy-wall'),
        ...ts(-28, -8, 1, 0, 0, 5.2, 8, 'green-steps'),
        b(0, -38, 28, 2.4, 4, 2, 'dummy-wall'),
        b(0, 38, 28, 2.4, 4, 2, 'dummy-wall'),
        b(-48, -32, 4, 4, 7, 3.5, 'corner-flag'),
        b(48, -32, 4, 4, 7, 3.5, 'corner-flag'),
        b(-48, 32, 4, 4, 7, 3.5, 'corner-flag'),
        b(48, 32, 4, 4, 7, 3.5, 'corner-flag'),
        b(-19, 0, 18, 7, 2, 4.8, 'stand'),
        b(19, 0, 18, 7, 2, 4.8, 'stand'),
        b(0, 18, 10, 10, 2, 7.2, 'upper-stand'),
        ...s(-35, -7, 1, 0, 7, 'green-steps'),
        ...s(35, 7, -1, 0, 7, 'green-steps'),
      ],
      castle: [
        b(0, 0, 124, 124, 0.35, -0.18, 'castle-garden'),

        b(0, 0, 60, 54, 1, 0, 'castle-floor'),
        b(-30, 0, 2, 54, 6.5, 3.25, 'castle-wall'),
        b(30, 0, 2, 54, 6.5, 3.25, 'castle-wall'),
        b(0, -27, 60, 2, 6.5, 3.25, 'castle-wall'),
        b(-20, 27, 20, 2, 6.5, 3.25, 'castle-wall'),
        b(20, 27, 20, 2, 6.5, 3.25, 'castle-wall'),
        b(0, 29.5, 11, 3, 2, 7.1, 'castle-gate'),
        b(-14, 4, 2, 26, 4.2, 2.1, 'castle-cover'),
        b(14, -6, 2, 24, 4.2, 2.1, 'castle-cover'),
        b(0, -8, 22, 2, 3.3, 1.65, 'castle-cover'),
        b(-8, 14, 12, 2, 3.1, 1.55, 'castle-cover'),
        b(13, 15, 10, 2, 3.1, 1.55, 'castle-cover'),

        b(0, -21, 60, 12, 1, 7, 'castle-floor'),
        b(0, 11, 60, 32, 1, 7, 'castle-floor'),
        b(-19, -10, 22, 10, 1, 7, 'castle-floor'),
        b(19, -10, 22, 10, 1, 7, 'castle-floor'),
        b(-30, 0, 2, 54, 6, 10, 'castle-wall'),
        b(30, 0, 2, 54, 6, 10, 'castle-wall'),
        b(0, -27, 60, 2, 6, 10, 'castle-wall'),
        b(-20, 27, 20, 2, 6, 10, 'castle-wall'),
        b(20, 27, 20, 2, 6, 10, 'castle-wall'),
        b(-9, -12, 18, 2, 3.5, 8.75, 'castle-cover'),
        b(-17, -4, 2, 14, 3.5, 8.75, 'castle-cover'),
        b(8, 18, 20, 2, 3.5, 8.75, 'castle-cover'),
        b(25, -6, 2, 14, 3.5, 8.75, 'castle-cover'),

        b(0, -13, 60, 28, 1, 14, 'castle-floor'),
        b(0, 20, 60, 14, 1, 14, 'castle-floor'),
        b(-19, 7, 22, 12, 1, 14, 'castle-floor'),
        b(19, 7, 22, 12, 1, 14, 'castle-floor'),
        b(-30, 0, 2, 54, 5.5, 16.75, 'castle-wall'),
        b(30, 0, 2, 54, 5.5, 16.75, 'castle-wall'),
        b(0, -27, 60, 2, 5.5, 16.75, 'castle-wall'),
        b(0, 27, 60, 2, 5.5, 16.75, 'castle-wall'),
        b(7, 18, 2, 14, 3.4, 15.7, 'castle-cover'),
        b(10, -5, 18, 2, 3.4, 15.7, 'castle-cover'),
        b(-19, -16, 10, 2, 3.2, 15.6, 'castle-cover'),
        b(19, 16, 10, 2, 3.2, 15.6, 'castle-cover'),

        b(0, -13, 60, 28, 1, 21, 'castle-roof'),
        b(0, 20, 60, 14, 1, 21, 'castle-roof'),
        b(-19, 7, 22, 12, 1, 21, 'castle-roof'),
        b(19, 7, 22, 12, 1, 21, 'castle-roof'),
        b(-30, 0, 2, 54, 2.3, 22.15, 'roof-wall'),
        b(30, 0, 2, 54, 2.3, 22.15, 'roof-wall'),
        b(0, -27, 60, 2, 2.3, 22.15, 'roof-wall'),
        b(0, 27, 60, 2, 2.3, 22.15, 'roof-wall'),
        b(-15, 11, 4, 4, 3.2, 22.6, 'roof-cover'),
        b(15, -11, 4, 4, 3.2, 22.6, 'roof-cover'),
        b(0, 0, 14, 2, 2.6, 22.3, 'roof-cover'),
        b(-9, -18, 2, 10, 2.4, 22.2, 'roof-cover'),
        b(9, 18, 2, 10, 2.4, 22.2, 'roof-cover'),

        b(-36, -33, 8, 8, 12, 6, 'castle-tower'),
        b(36, -33, 8, 8, 12, 6, 'castle-tower'),
        b(-36, 33, 8, 8, 10, 5, 'castle-tower'),
        b(36, 33, 8, 8, 10, 5, 'castle-tower'),
        b(-48, 0, 5, 18, 3.4, 1.7, 'garden-cover'),
        b(48, 0, 5, 18, 3.4, 1.7, 'garden-cover'),
        b(-18, 42, 18, 3, 2.4, 1.2, 'garden-cover'),
        b(18, 42, 18, 3, 2.4, 1.2, 'garden-cover'),
        b(-18, -42, 18, 3, 2.4, 1.2, 'garden-cover'),
        b(18, -42, 18, 3, 2.4, 1.2, 'garden-cover'),
        b(-6, 39, 4, 4, 3, 1.5, 'statue'),
        b(6, 39, 4, 4, 3, 1.5, 'statue'),

        ...cs(-25, -10, 1, 0, 0.5, 7.5, 23),
        ...cs(24, 7, -1, 0, 7.5, 14.5, 23),
        ...cs(-25, 7, 1, 0, 14.5, 21.5, 23),
      ],
      jungle: [
        b(0, 0, 24, 22, 1, 6.8, 'tree-platform'),
        b(-12, 0, 1, 22, 5, 9.5, 'bush'),
        b(12, 0, 1, 22, 5, 9.5, 'bush'),
        b(0, -11, 24, 1, 5, 9.5, 'bush'),
        b(-3, 4, 1, 8, 3, 8.5, 'root'),
        b(5, -3, 7, 1, 3, 8.5, 'root'),
        ...ts(-23, 7, 1, 0, 0, 6.8, 9, 'root-steps'),
        b(-42, -24, 8, 26, 9, 4.5, 'tree'),
        b(42, 20, 8, 26, 9, 4.5, 'tree'),
        b(-8, 0, 28, 5, 4, 2, 'bush'),
        b(24, -26, 15, 8, 5, 2.5, 'root'),
        b(-22, 28, 15, 8, 5, 2.5, 'root'),
        b(0, 28, 14, 14, 2, 7.2, 'tree-platform'),
        b(25, 0, 14, 14, 2, 10.2, 'tree-platform'),
        b(-25, -5, 14, 14, 2, 10.2, 'tree-platform'),
        ...s(-12, 14, 1, 1, 7, 'root-steps'),
        ...s(12, -16, -1, 1, 7, 'root-steps'),
      ],
      lava: [
        b(0, 0, 26, 22, 1, 6.6, 'island'),
        b(-13, 0, 1, 22, 5, 9.4, 'basalt'),
        b(13, 0, 1, 22, 5, 9.4, 'basalt'),
        b(0, -11, 26, 1, 5, 9.4, 'basalt'),
        b(0, 4, 7, 1, 3, 8.2, 'lava-rock'),
        ...ts(-24, -4, 1, 0, 0, 6.6, 9, 'basalt-steps'),
        b(-46, 0, 10, 48, 4, 2, 'basalt'),
        b(46, 0, 10, 48, 4, 2, 'basalt'),
        b(0, -46, 48, 10, 4, 2, 'basalt'),
        b(0, 46, 48, 10, 4, 2, 'basalt'),
        b(0, 0, 20, 20, 2, 5.8, 'island'),
        b(-26, -26, 13, 13, 2, 9.5, 'island'),
        b(26, 26, 13, 13, 2, 9.5, 'island'),
        b(-26, 26, 8, 8, 9, 4.5, 'lava-rock'),
        b(26, -26, 8, 8, 9, 4.5, 'lava-rock'),
        ...s(-16, -5, -1, -1, 7, 'basalt-steps'),
        ...s(16, 5, 1, 1, 7, 'basalt-steps'),
      ],
      neon: [
        b(0, 0, 28, 24, 1, 6, 'catwalk'),
        b(-14, 0, 1, 24, 5, 8.8, 'neon-barrier'),
        b(14, 0, 1, 24, 5, 8.8, 'neon-barrier'),
        b(0, -12, 28, 1, 5, 8.8, 'neon-barrier'),
        b(-4, 4, 1, 9, 3, 7.5, 'neon-barrier'),
        b(5, -3, 8, 1, 3, 7.5, 'neon-barrier'),
        ...ts(-25, 7, 1, 0, 0, 6, 8, 'neon-ramp'),
        b(0, -34, 24, 5, 4, 2, 'neon-barrier'),
        b(0, 34, 24, 5, 4, 2, 'neon-barrier'),
        b(-34, 0, 5, 24, 4, 2, 'neon-barrier'),
        b(34, 0, 5, 24, 4, 2, 'neon-barrier'),
        b(-18, -18, 14, 9, 2, 6.5, 'catwalk'),
        b(18, 18, 14, 9, 2, 6.5, 'catwalk'),
        b(0, 0, 10, 10, 2, 10, 'catwalk'),
        ...s(-28, -8, 1, 0, 7, 'neon-ramp'),
        ...s(28, 8, -1, 0, 7, 'neon-ramp'),
      ],
      ice: [
        b(0, 0, 26, 22, 1, 6.4, 'ice-shelf'),
        b(-13, 0, 1, 22, 5, 9.2, 'ice-wall'),
        b(13, 0, 1, 22, 5, 9.2, 'ice-wall'),
        b(0, -11, 26, 1, 5, 9.2, 'ice-wall'),
        b(-5, 3, 1, 8, 3, 8, 'ice-rock'),
        b(5, -3, 8, 1, 3, 8, 'ice-rock'),
        ...ts(-24, 6, 1, 0, 0, 6.4, 9, 'ice-steps'),
        b(-34, -22, 14, 14, 5, 2.5, 'ice-rock'),
        b(34, 22, 14, 14, 5, 2.5, 'ice-rock'),
        b(0, 0, 34, 5, 3, 1.5, 'ice-wall'),
        b(-16, 28, 16, 9, 2, 7, 'ice-shelf'),
        b(18, -28, 16, 9, 2, 7, 'ice-shelf'),
        ...s(-30, 14, 1, 1, 7, 'ice-steps'),
        ...s(30, -14, -1, -1, 7, 'ice-steps'),
      ],
      station: [
        b(0, 0, 30, 24, 1, 7, 'upper-module'),
        b(-15, 0, 1, 24, 5, 9.8, 'module'),
        b(15, 0, 1, 24, 5, 9.8, 'module'),
        b(0, -12, 30, 1, 5, 9.8, 'module'),
        b(-4, 4, 1, 9, 3, 8.5, 'module'),
        b(6, -3, 9, 1, 3, 8.5, 'module'),
        ...ts(-26, -8, 1, 0, 0, 7, 9, 'metal-steps'),
        b(0, 0, 12, 12, 5, 2.5, 'core'),
        b(-40, 0, 6, 42, 6, 3, 'module'),
        b(40, 0, 6, 42, 6, 3, 'module'),
        b(0, -40, 42, 6, 6, 3, 'module'),
        b(0, 40, 42, 6, 6, 3, 'module'),
        b(-22, -22, 14, 9, 2, 8, 'upper-module'),
        b(22, 22, 14, 9, 2, 8, 'upper-module'),
        ...s(-33, -12, 1, 0, 7, 'metal-steps'),
        ...s(33, 12, -1, 0, 7, 'metal-steps'),
      ],
    };
    return layouts[theme] || layouts.foundry;
  }
}
