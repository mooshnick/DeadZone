import * as THREE from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const APOCALYPTIC_CITY_URL = '/model/apocalyptic_city-transformed.glb';
const DRACO_DECODER_PATH = '/draco/';
const APOCALYPTIC_CITY_SCALE = 0.055;
const APOCALYPTIC_CITY_FLOOR_Y = -0.35;
const APOCALYPTIC_CITY_SKYBOX_OBJECT = 'Object_13';

export class ArenaBuilder {
  constructor(scene, selectedMap) {
    this.scene = scene;
    this.selectedMap = selectedMap;
    this.blockMeshes = [];
  }

  build(blocks) {
    this.addLighting();
    if (this.selectedMap.theme !== 'apocalyptic') {
      this.addGround();
      this.addWalls();
    }
    this.addMapModel();
    this.addBlocks(blocks);
    this.addThemeDetails(blocks);
    return this.blockMeshes;
  }

  addLighting() {
    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x23313b, 1.7);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(-24, 42, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    this.scene.add(sun);
  }

  addGround() {
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(140, 0.5, 140),
      new THREE.MeshStandardMaterial({ color: this.selectedMap.ground, roughness: 0.92, metalness: 0.04 }),
    );
    ground.receiveShadow = true;
    ground.position.y = -0.25;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(140, 40, this.selectedMap.accent, '#ffffff');
    grid.material.opacity = 0.16;
    grid.material.transparent = true;
    this.scene.add(grid);
  }

  addMapModel() {
    if (this.selectedMap.theme !== 'apocalyptic') {
      return;
    }

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    loader.setDRACOLoader(dracoLoader);
    loader.load(APOCALYPTIC_CITY_URL, (gltf) => {
      const city = gltf.scene;
      city.name = 'Apocalyptic City Visual Map';
      const skybox = city.getObjectByName(APOCALYPTIC_CITY_SKYBOX_OBJECT);
      if (skybox?.parent) {
        skybox.parent.remove(skybox);
      }
      city.scale.setScalar(APOCALYPTIC_CITY_SCALE);
      city.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(city);
      const center = bounds.getCenter(new THREE.Vector3());
      city.position.set(
        -center.x,
        APOCALYPTIC_CITY_FLOOR_Y - bounds.min.y,
        -center.z,
      );
      city.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.blocksBullets = true;
        object.userData.isArenaVisual = true;
        if (object.material) {
          object.material.roughness = Math.min(1, object.material.roughness ?? 0.78);
          object.material.needsUpdate = true;
        }
      });
      this.scene.add(city);
    }, undefined, (error) => {
      console.error('Failed to load Apocalyptic City map', error);
      dracoLoader.dispose();
    });
  }

  addWalls() {
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: this.selectedMap.theme === 'castle' ? '#6f7888' : '#192332',
      roughness: 0.8,
      metalness: this.selectedMap.theme === 'station' ? 0.18 : 0.04,
    });
    [
      { x: 0, z: -68, w: 138, d: 1.5 },
      { x: 0, z: 68, w: 138, d: 1.5 },
      { x: -68, z: 0, w: 1.5, d: 138 },
      { x: 68, z: 0, w: 1.5, d: 138 },
    ].forEach((wall) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(wall.w, 7, wall.d), wallMaterial);
      mesh.position.set(wall.x, 3.5, wall.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.addBlockDetail({ ...wall, h: 7, y: 3.5, kind: 'arena-wall' });
    });
  }

  addBlockDetail(block) {
    if (this.selectedMap.theme === 'foundry') {
      this.addFoundryBlockDetail(block);
    }

    if (this.selectedMap.theme === 'castle') {
      this.addCastleDetail(block);
    }

    if (block.kind === 'corner-flag') {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 4.2, 10),
        new THREE.MeshStandardMaterial({ color: '#ffffff' }),
      );
      pole.position.set(block.x, block.y + block.h / 2 + 2.1, block.z);
      const flag = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 0.06),
        new THREE.MeshBasicMaterial({ color: this.selectedMap.accent }),
      );
      flag.position.set(block.x + 0.75, block.y + block.h / 2 + 3.45, block.z);
      this.scene.add(pole, flag);
      return;
    }

    if (block.kind === 'castle-gate') {
      const bannerMaterial = new THREE.MeshBasicMaterial({ color: '#d63446' });
      [-2.4, 2.4].forEach((offset) => {
        const banner = new THREE.Mesh(new THREE.BoxGeometry(1.3, 3.2, 0.08), bannerMaterial);
        banner.position.set(block.x + offset, block.y + block.h / 2 + 1.6, block.z + 3.6);
        this.scene.add(banner);
      });
      return;
    }

    if ((block.kind?.includes('wall') || block.kind === 'upper-walkway' || block.kind === 'castle-tower') && this.selectedMap.theme === 'castle') {
      const count = block.w > block.d ? Math.floor(block.w / 7) : Math.floor(block.d / 7);
      for (let index = -Math.floor(count / 2); index <= Math.floor(count / 2); index += 1) {
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(1.4, 1.2, 1.4),
          this.materialFor(block.kind),
        );
        tooth.position.set(
          block.x + (block.w > block.d ? index * 6.5 : 0),
          block.y + block.h / 2 + 0.8,
          block.z + (block.d >= block.w ? index * 6.5 : 0),
        );
        tooth.castShadow = true;
        this.scene.add(tooth);
      }
      return;
    }

    if (block.kind === 'neon-barrier' || block.kind === 'catwalk') {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.8, block.w * 0.86), 0.08, Math.max(0.8, block.d * 0.86)),
        new THREE.MeshBasicMaterial({ color: this.selectedMap.accent }),
      );
      strip.position.set(block.x, block.y + block.h / 2 + 0.08, block.z);
      this.scene.add(strip);
    }
  }

  addCastleDetail(block) {
    if (block.kind === 'castle-floor' || block.kind === 'castle-roof') {
      this.addCastleFloorDetail(block);
      return;
    }

    if (block.kind === 'stone-steps' || block.kind === 'stone-landing') {
      this.addCastleStairDetail(block);
      return;
    }

    const masonryKinds = ['castle-wall', 'castle-tower', 'castle-cover', 'castle-gate', 'roof-wall', 'stair-wall'];
    if (!masonryKinds.includes(block.kind)) {
      return;
    }

    const mortar = new THREE.MeshBasicMaterial({ color: '#4d5662', transparent: true, opacity: 0.68 });
    const courseCount = Math.min(8, Math.max(2, Math.floor(block.h / 1.05)));
    const isWideX = block.w >= block.d;
    for (let index = 1; index < courseCount; index += 1) {
      const y = block.y - block.h / 2 + index * (block.h / courseCount);
      if (isWideX) {
        [-1, 1].forEach((side) => {
          const line = new THREE.Mesh(new THREE.BoxGeometry(block.w * 0.9, 0.045, 0.06), mortar);
          line.position.set(block.x, y, block.z + side * (block.d / 2 + 0.035));
          this.scene.add(line);
        });
      } else {
        [-1, 1].forEach((side) => {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.045, block.d * 0.9), mortar);
          line.position.set(block.x + side * (block.w / 2 + 0.035), y, block.z);
          this.scene.add(line);
        });
      }
    }

    const brickCount = Math.min(7, Math.max(2, Math.floor((isWideX ? block.w : block.d) / 6)));
    for (let index = -Math.floor(brickCount / 2); index <= Math.floor(brickCount / 2); index += 1) {
      const offset = index * 5.5;
      const y = block.y + block.h * 0.08;
      if (isWideX) {
        [-1, 1].forEach((side) => {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.055, block.h * 0.72, 0.055), mortar);
          line.position.set(block.x + offset, y, block.z + side * (block.d / 2 + 0.04));
          this.scene.add(line);
        });
      } else {
        [-1, 1].forEach((side) => {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.055, block.h * 0.72, 0.055), mortar);
          line.position.set(block.x + side * (block.w / 2 + 0.04), y, block.z + offset);
          this.scene.add(line);
        });
      }
    }
  }

  addCastleFloorDetail(block) {
    const topY = block.y + block.h / 2 + 0.035;
    const mortar = new THREE.MeshBasicMaterial({
      color: block.kind === 'castle-roof' ? '#313842' : '#757f8d',
      transparent: true,
      opacity: 0.42,
    });
    const spacing = 7;
    const xLines = Math.min(7, Math.floor(block.w / spacing));
    const zLines = Math.min(7, Math.floor(block.d / spacing));

    for (let index = 1; index <= xLines; index += 1) {
      const x = block.x - block.w / 2 + (block.w / (xLines + 1)) * index;
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, Math.max(0.5, block.d * 0.92)), mortar);
      line.position.set(x, topY, block.z);
      this.scene.add(line);
    }

    for (let index = 1; index <= zLines; index += 1) {
      const z = block.z - block.d / 2 + (block.d / (zLines + 1)) * index;
      const line = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.5, block.w * 0.92), 0.035, 0.05), mortar);
      line.position.set(block.x, topY, z);
      this.scene.add(line);
    }
  }

  addCastleStairDetail(block) {
    const cap = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.5, block.w * 0.92), 0.08, Math.max(0.5, block.d * 0.92)),
      new THREE.MeshStandardMaterial({ color: '#9aa3af', roughness: 0.76 }),
    );
    cap.position.set(block.x, block.y + block.h / 2 + 0.045, block.z);
    cap.receiveShadow = true;

    const trimMaterial = new THREE.MeshBasicMaterial({ color: '#d0d6df', transparent: true, opacity: 0.48 });
    const topY = block.y + block.h / 2 + 0.115;
    const trimDepth = 0.07;
    const trims = [
      new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.5, block.w * 0.9), 0.055, trimDepth), trimMaterial),
      new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.5, block.w * 0.9), 0.055, trimDepth), trimMaterial),
      new THREE.Mesh(new THREE.BoxGeometry(trimDepth, 0.055, Math.max(0.5, block.d * 0.9)), trimMaterial),
      new THREE.Mesh(new THREE.BoxGeometry(trimDepth, 0.055, Math.max(0.5, block.d * 0.9)), trimMaterial),
    ];

    trims[0].position.set(block.x, topY, block.z - block.d / 2 + 0.08);
    trims[1].position.set(block.x, topY, block.z + block.d / 2 - 0.08);
    trims[2].position.set(block.x - block.w / 2 + 0.08, topY, block.z);
    trims[3].position.set(block.x + block.w / 2 - 0.08, topY, block.z);
    this.scene.add(cap, ...trims);
  }

  addFoundryBlockDetail(block) {
    const warning = new THREE.MeshBasicMaterial({ color: '#f5a524' });
    const molten = new THREE.MeshBasicMaterial({ color: '#ff5a1f' });
    const darkSteel = new THREE.MeshStandardMaterial({ color: '#111820', roughness: 0.72, metalness: 0.35 });
    const steel = new THREE.MeshStandardMaterial({ color: '#3d4652', roughness: 0.58, metalness: 0.42 });

    if (block.kind === 'factory-boundary-wall' || block.kind === 'factory-spawn-wall') {
      const isWideX = block.w > block.d;
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(isWideX ? block.w * 0.86 : 0.08, 0.18, isWideX ? 0.08 : block.d * 0.86),
        warning,
      );
      stripe.position.set(
        block.x + (isWideX ? 0 : Math.sign(block.x || 1) * (block.w / 2 + 0.05)),
        block.y + block.h * 0.12,
        block.z + (isWideX ? Math.sign(block.z || 1) * (block.d / 2 + 0.05) : 0),
      );
      this.scene.add(stripe);
    }

    if (block.kind === 'factory-corner-tower') {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(block.w * 0.88, 0.45, block.d * 0.88), steel);
      cap.position.set(block.x, block.y + block.h / 2 + 0.25, block.z);
      cap.castShadow = true;
      this.scene.add(cap);
    }

    if (block.kind === 'factory-furnace') {
      const glow = new THREE.Mesh(new THREE.BoxGeometry(block.w * 0.72, 0.08, block.d * 0.62), molten);
      glow.position.set(block.x, block.y + block.h / 2 + 0.08, block.z);
      this.scene.add(glow);

      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.9, 4.8, 16), darkSteel);
      chimney.position.set(block.x - block.w * 0.28, block.y + block.h / 2 + 2.4, block.z - block.d * 0.18);
      chimney.castShadow = true;
      this.scene.add(chimney);
    }

    if (block.kind === 'factory-crate-stack') {
      const bandA = new THREE.Mesh(new THREE.BoxGeometry(block.w * 0.94, 0.16, 0.16), darkSteel);
      const bandB = new THREE.Mesh(new THREE.BoxGeometry(block.w * 0.94, 0.16, 0.16), darkSteel);
      bandA.position.set(block.x, block.y + block.h * 0.12, block.z - block.d * 0.28);
      bandB.position.set(block.x, block.y + block.h * 0.12, block.z + block.d * 0.28);
      this.scene.add(bandA, bandB);
    }

    if (block.kind === 'factory-pipe-cover') {
      [-0.32, 0, 0.32].forEach((offset) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, block.d * 0.9, 14), steel);
        pipe.position.set(block.x + offset * block.w, block.y + block.h / 2 + 0.35, block.z);
        pipe.rotation.x = Math.PI / 2;
        pipe.castShadow = true;
        this.scene.add(pipe);
      });
    }

    if (block.kind === 'factory-machine' || block.kind === 'factory-low-cover' || block.kind === 'factory-barrier') {
      const topStrip = new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.7, block.w * 0.82), 0.08, Math.max(0.18, block.d * 0.14)),
        warning,
      );
      topStrip.position.set(block.x, block.y + block.h / 2 + 0.07, block.z);
      this.scene.add(topStrip);
    }

    if (block.kind === 'factory-rail') {
      const railTop = new THREE.Mesh(new THREE.BoxGeometry(block.w * 1.4, 0.22, block.d * 1.03), darkSteel);
      railTop.position.set(block.x, block.y + block.h / 2 + 0.15, block.z);
      railTop.castShadow = true;
      this.scene.add(railTop);
    }
  }

  addBlocks(blocks) {
    blocks.forEach((block) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(block.w, block.h, block.d), this.materialFor(block.kind));
      mesh.position.set(block.x, block.y, block.z);
      mesh.userData.block = block;
      mesh.userData.baseOpacity = mesh.material.opacity ?? 1;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.blockMeshes.push(mesh);
      this.addBlockDetail(block);
    });
  }

  materialFor(kind) {
    const theme = this.selectedMap.theme;
    if (theme === 'apocalyptic') {
      return new THREE.MeshStandardMaterial({
        color: '#ff9f43',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        roughness: 0.85,
      });
    }

    if (theme === 'castle') {
      const castleColors = {
        'castle-garden': '#4f7942',
        'castle-floor': '#5a5a5a',
        'castle-wall': '#808080',
        'castle-cover': '#404040',
        'castle-gate': '#56606d',
        'castle-tower': '#737c89',
        'castle-roof': '#4a4a4a',
        'roof-wall': '#303030',
        'roof-cover': '#202020',
        'garden-cover': '#54634b',
        statue: '#b6c0ce',
        'stone-steps': '#6d747e',
        'stone-landing': '#747d89',
        'stair-wall': '#69727e',
      };
      return new THREE.MeshStandardMaterial({
        color: castleColors[kind] || '#727b87',
        roughness: 0.72,
        metalness: 0.04,
      });
    }
    const colorByTheme = {
      pitch: kind === 'dummy-wall' ? '#eef3f8' : '#37a857',
      castle: '#8b96a6',
      jungle: kind === 'tree' ? '#5b3a24' : '#285b34',
      lava: kind === 'lava-rock' ? '#171717' : '#3a2f2d',
      neon: '#2a315c',
      ice: '#a7f0ff',
      station: '#323b52',
      foundry: this.selectedMap.accent,
    };
    const stepKinds = ['green-steps', 'stone-steps', 'tower-steps', 'root-steps', 'basalt-steps', 'neon-ramp', 'ice-steps', 'metal-steps'];
    const foundryColors = {
      'factory-boundary-wall': '#232a31',
      'factory-corner-tower': '#2f3842',
      'factory-spawn-wall': '#3a414c',
      'factory-crate-stack': '#b97322',
      'factory-furnace': '#242a31',
      'factory-low-cover': '#c88926',
      'factory-machine': '#38434f',
      'factory-pipe-cover': '#2f3944',
      'factory-barrier': '#c88926',
      'factory-deck': '#4b5563',
      'factory-rail': '#202832',
      'metal-steps': '#6f7a86',
    };
    return new THREE.MeshStandardMaterial({
      color: theme === 'foundry'
        ? foundryColors[kind] || '#8b5b1d'
        : kind === 'castle-courtyard' ? '#49693f' : stepKinds.includes(kind) ? this.selectedMap.accent : colorByTheme[theme] || this.selectedMap.accent,
      emissive: theme === 'lava' ? '#461208' : '#000000',
      emissiveIntensity: theme === 'lava' ? 0.18 : 0,
      roughness: 0.62,
      metalness: theme === 'station' || theme === 'neon' ? 0.24 : 0.08,
    });
  }

  addThemeDetails(blocks) {
    if (this.selectedMap.theme === 'foundry') {
      this.addFoundryDetails();
    }

    if (this.selectedMap.theme === 'lava') {
      const lava = new THREE.Mesh(
        new THREE.BoxGeometry(82, 0.25, 82),
        new THREE.MeshBasicMaterial({ color: '#ff3b1f' }),
      );
      lava.position.y = -0.65;
      this.scene.add(lava);
    }

    if (this.selectedMap.theme === 'pitch') {
      const lineMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const midLine = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 78), lineMaterial);
      midLine.position.y = 0.04;
      this.scene.add(midLine);
      const center = new THREE.Mesh(new THREE.TorusGeometry(9, 0.08, 8, 48), lineMaterial);
      center.rotation.x = Math.PI / 2;
      center.position.y = 0.08;
      this.scene.add(center);
    }

    if (this.selectedMap.theme === 'castle' || this.selectedMap.theme === 'jungle') {
      blocks.filter((block) => block.kind?.includes('statue') || block.kind === 'tree').forEach((block) => {
        const crown = new THREE.Mesh(
          new THREE.ConeGeometry(block.kind === 'tree' ? 4.2 : 1.4, block.kind === 'tree' ? 5 : 2.2, 10),
          new THREE.MeshStandardMaterial({ color: block.kind === 'tree' ? '#2f8f42' : '#c6ced8' }),
        );
        crown.position.set(block.x, block.y + block.h / 2 + 2.2, block.z);
        crown.castShadow = true;
        this.scene.add(crown);
      });
    }

    if (this.selectedMap.theme === 'castle') {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.48, 2.4, 10),
        new THREE.MeshStandardMaterial({ color: '#5b3a24' }),
      );
      trunk.position.y = 1.2;
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(2.1, 18, 14),
        new THREE.MeshStandardMaterial({ color: '#438f42' }),
      );
      crown.position.y = 3.2;
      tree.add(trunk, crown);
      tree.position.set(-42, 0.1, 46);
      this.scene.add(tree);
    }
  }

  addFoundryDetails() {
    const steel = new THREE.MeshStandardMaterial({ color: '#3d4652', roughness: 0.58, metalness: 0.42 });
    const darkSteel = new THREE.MeshStandardMaterial({ color: '#151a20', roughness: 0.72, metalness: 0.35 });
    const warning = new THREE.MeshBasicMaterial({ color: '#f5a524' });
    const molten = new THREE.MeshBasicMaterial({ color: '#ff5a1f' });
    const ember = new THREE.MeshBasicMaterial({ color: '#ff9f2f', transparent: true, opacity: 0.82 });

    this.addFoundryLightRig();
    this.addFoundryFloorStrips(warning, molten);
    this.addFoundryPipes(steel, darkSteel);
    this.addFoundryMachines(steel, darkSteel, molten);
    this.addFoundryHangingChains(darkSteel);
    this.addFoundrySparks(ember);
  }

  addFoundryLightRig() {
    [
      [-42, 8, -42],
      [42, 8, -42],
      [-42, 8, 42],
      [42, 8, 42],
      [0, 10, -28],
    ].forEach(([x, y, z]) => {
      const light = new THREE.PointLight(0xff7a2f, 1.8, 42, 1.6);
      light.position.set(x, y, z);
      this.scene.add(light);

      const lamp = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.7, 0.32, 16),
        new THREE.MeshBasicMaterial({ color: '#ffb24a' }),
      );
      lamp.position.set(x, y - 0.25, z);
      lamp.rotation.x = Math.PI / 2;
      this.scene.add(lamp);
    });
  }

  addFoundryFloorStrips(warning, molten) {
    [-46, 46].forEach((z) => {
      const channel = new THREE.Mesh(new THREE.BoxGeometry(70, 0.05, 2.1), molten);
      channel.position.set(0, 0.035, z);
      this.scene.add(channel);
    });

    [-42, -21, 21, 42].forEach((x) => {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 38), warning);
      strip.position.set(x, 0.08, 0);
      this.scene.add(strip);
    });

    [-1, 1].forEach((side) => {
      const catwalkEdge = new THREE.Mesh(new THREE.BoxGeometry(36, 0.12, 0.28), warning);
      catwalkEdge.position.set(0, 6.08, side * 12.4);
      this.scene.add(catwalkEdge);
    });
  }

  addFoundryPipes(steel, darkSteel) {
    [
      { x: -55, z: -16, length: 72, rotation: Math.PI / 2 },
      { x: 55, z: 16, length: 72, rotation: Math.PI / 2 },
      { x: -18, z: 55, length: 58, rotation: 0 },
      { x: 18, z: -55, length: 58, rotation: 0 },
    ].forEach((pipe) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, pipe.length, 18), steel);
      mesh.position.set(pipe.x, 2.2, pipe.z);
      mesh.rotation.z = pipe.rotation;
      mesh.castShadow = true;
      this.scene.add(mesh);

      [-0.35, 0.35].forEach((offset) => {
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 1.4), darkSteel);
        if (pipe.rotation === 0) {
          clamp.position.set(pipe.x, 2.2, pipe.z + offset * pipe.length);
        } else {
          clamp.position.set(pipe.x + offset * pipe.length, 2.2, pipe.z);
        }
        this.scene.add(clamp);
      });
    });
  }

  addFoundryMachines(steel, darkSteel, molten) {
    [
      { x: -46, z: -34, w: 7, d: 5 },
      { x: 46, z: 34, w: 7, d: 5 },
      { x: -46, z: 34, w: 5, d: 7 },
      { x: 46, z: -34, w: 5, d: 7 },
    ].forEach((machine) => {
      const base = new THREE.Mesh(new THREE.BoxGeometry(machine.w, 2.2, machine.d), steel);
      base.position.set(machine.x, 1.1, machine.z);
      base.castShadow = true;
      base.receiveShadow = true;

      const furnace = new THREE.Mesh(new THREE.BoxGeometry(machine.w * 0.62, 1.1, 0.22), molten);
      furnace.position.set(machine.x, 1.35, machine.z - machine.d / 2 - 0.03);

      const top = new THREE.Mesh(new THREE.BoxGeometry(machine.w * 0.72, 0.42, machine.d * 0.72), darkSteel);
      top.position.set(machine.x, 2.42, machine.z);
      this.scene.add(base, furnace, top);
    });

    [-18, 18].forEach((x) => {
      const crane = new THREE.Group();
      const postA = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), darkSteel);
      postA.position.set(x - 7, 3.6, -34);
      const postB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.2, 0.5), darkSteel);
      postB.position.set(x + 7, 3.6, -34);
      const beam = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.45, 0.65), steel);
      beam.position.set(x, 7.1, -34);
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 12), molten);
      hook.position.set(x, 5.65, -34);
      hook.rotation.x = Math.PI;
      crane.add(postA, postB, beam, hook);
      this.scene.add(crane);
    });
  }

  addFoundryHangingChains(darkSteel) {
    [-34, -12, 12, 34].forEach((x) => {
      const chain = new THREE.Group();
      for (let index = 0; index < 7; index += 1) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 14), darkSteel);
        link.position.set(x, 7.4 - index * 0.38, 24);
        link.rotation.x = index % 2 === 0 ? Math.PI / 2 : 0;
        chain.add(link);
      }
      this.scene.add(chain);
    });
  }

  addFoundrySparks(ember) {
    for (let index = 0; index < 28; index += 1) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (index % 3) * 0.025, 8, 6), ember);
      spark.position.set(
        -8 + (index % 7) * 2.6,
        1.4 + (index % 5) * 0.55,
        -44 + Math.floor(index / 7) * 4.2,
      );
      this.scene.add(spark);
    }
  }
}
