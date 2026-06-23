import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PREVIEW_SETTINGS = {
  hero: {
    camera: [0, 1.15, 8.2],
    target: [0, 0.35, 0],
    scale: 1.08,
    y: 0.1,
  },
  side: {
    camera: [0, 1.08, 7.25],
    target: [0, 0.28, 0],
    scale: 0.98,
    y: 0,
  },
};

export function CharacterPreview({ accessories = [], outfit, weaponColor = '#cbd8ea', grenadeColor = '#687386', menuPose = false, variant, weaponId = 'rifle' }) {
  const mountRef = useRef(null);
  const stateRef = useRef(null);

  const accessoryKey = accessories.map((item) => item.id).join('|');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const previewVariant = variant || (menuPose ? 'hero' : 'side');
    const settings = PREVIEW_SETTINGS[previewVariant] || PREVIEW_SETTINGS.side;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(...settings.camera);
    camera.lookAt(...settings.target);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    mount.appendChild(renderer.domElement);

    const character = new THREE.Group();
    const model = new THREE.Group();
    character.position.set(0, settings.y, 0);
    character.scale.setScalar(settings.scale);
    character.rotation.y = -0.35;

    const shellColor = outfit.displayColor || outfit.shell;
    const trimColor = outfit.trim || shellColor;
    const shellMaterial = new THREE.MeshStandardMaterial({
      color: shellColor,
      roughness: 0.38,
      metalness: 0.02,
      emissive: shellColor,
      emissiveIntensity: 0.05,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: shellColor,
      roughness: 0.34,
      metalness: 0.05,
      emissive: shellColor,
      emissiveIntensity: 0.14,
    });
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: trimColor,
      roughness: 0.32,
      metalness: 0.05,
      emissive: trimColor,
      emissiveIntensity: 0.18,
    });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.32 });
    const weaponMaterial = new THREE.MeshStandardMaterial({
      color: weaponColor,
      emissive: weaponColor,
      emissiveIntensity: 0.24,
      metalness: 0.18,
      roughness: 0.22,
    });
    const grenadeMaterial = new THREE.MeshStandardMaterial({
      color: grenadeColor,
      emissive: grenadeColor,
      emissiveIntensity: 0.26,
      metalness: 0.1,
      roughness: 0.32,
    });

    const body = new THREE.Mesh(new THREE.SphereGeometry(1.45, 40, 28), shellMaterial);
    body.scale.y = 1.18;
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.72, 32, 18, 0, Math.PI), darkMaterial);
    visor.position.set(0, 0.35, 1.22);
    visor.scale.set(1.25, 0.68, 0.38);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.13, 12, 40), trimMaterial);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = -0.45;
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.58, 0.12), accentMaterial);
    chestPlate.position.set(0, 0.08, 1.33);
    chestPlate.scale.set(0.92, 1, 1);
    const weaponParts = createWeaponPreviewMeshes(weaponId, weaponMaterial, darkMaterial);
    const grenade = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), grenadeMaterial);
    grenade.position.set(-1.28, -0.45, 0.82);
    const accessoryMeshes = accessories.flatMap((accessory) => createAccessoryMeshes(accessory));
    model.add(body, visor, belt, chestPlate, ...weaponParts, grenade, ...accessoryMeshes);

    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.x = -center.x;
    model.position.y = -center.y + 0.05;
    character.add(model);
    scene.add(character);

    scene.add(new THREE.AmbientLight(0xffffff, 3.3));
    scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 2.6));
    const key = new THREE.DirectionalLight(0xffffff, 3.2);
    key.position.set(4, 5, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 1.55);
    fill.position.set(-5, 3, 4);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(0, 4, -5);
    scene.add(key, fill, rim);
    stateRef.current = {
      accessoryMeshes,
      accentMaterial,
      body,
      character,
      darkMaterial,
      grenade,
      grenadeMaterial,
      model,
      shellMaterial,
      trimMaterial,
      weaponMaterial,
      weaponParts,
    };

    let frame;
    const render = (time) => {
      character.rotation.y = time * 0.00045;
      character.position.y = settings.y + Math.sin(time * 0.0014) * 0.08;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(1, height);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.dispose();
      const currentState = stateRef.current;
      const currentWeaponParts = currentState?.weaponParts || weaponParts;
      const currentAccessoryMeshes = currentState?.accessoryMeshes || accessoryMeshes;
      [body, visor, belt, chestPlate, ...currentWeaponParts, grenade, ...currentAccessoryMeshes].forEach((mesh) => mesh.geometry.dispose());
      [shellMaterial, trimMaterial, accentMaterial, darkMaterial, weaponMaterial, grenadeMaterial].forEach((material) => material.dispose());
      currentAccessoryMeshes.forEach((mesh) => mesh.material?.dispose?.());
      stateRef.current = null;
      renderer.domElement.remove();
    };
    // Build the WebGL scene once per preview size. Visual changes are applied in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuPose, variant]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    const shellColor = outfit.displayColor || outfit.shell;
    const trimColor = outfit.trim || shellColor;
    state.shellMaterial.color.set(shellColor);
    state.shellMaterial.emissive.set(shellColor);
    state.trimMaterial.color.set(shellColor);
    state.trimMaterial.emissive.set(shellColor);
    state.accentMaterial.color.set(trimColor);
    state.accentMaterial.emissive.set(trimColor);
  }, [outfit.displayColor, outfit.shell, outfit.trim]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.weaponParts.forEach((mesh) => {
      state.model.remove(mesh);
      mesh.geometry.dispose();
    });
    const weaponParts = createWeaponPreviewMeshes(weaponId, state.weaponMaterial, state.darkMaterial);
    state.weaponParts = weaponParts;
    state.model.add(...weaponParts);
  }, [weaponId]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.weaponMaterial.color.set(weaponColor);
    state.weaponMaterial.emissive.set(weaponColor);
  }, [weaponColor]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.grenadeMaterial.color.set(grenadeColor);
    state.grenadeMaterial.emissive.set(grenadeColor);
  }, [grenadeColor]);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return;
    state.accessoryMeshes.forEach((mesh) => {
      state.model.remove(mesh);
      mesh.geometry.dispose();
      mesh.material?.dispose?.();
    });
    const nextMeshes = accessories.flatMap((accessory) => createAccessoryMeshes(accessory));
    state.accessoryMeshes = nextMeshes;
    state.model.add(...nextMeshes);
    // Accessory objects are rebuilt only when their ids change, which prevents preview stutter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessoryKey]);

  const previewVariant = variant || (menuPose ? 'hero' : 'side');

  return (
    <div
      className={`character-preview-canvas character-preview-canvas--${previewVariant}`}
      ref={mountRef}
      aria-label="3D player character preview"
    />
  );
}

function createAccessoryMeshes(accessory) {
  if (!accessory) return [];
  const material = new THREE.MeshStandardMaterial({
    color: accessory.color,
    emissive: accessory.color,
    emissiveIntensity: 0.1,
    roughness: 0.36,
    metalness: 0.08,
  });

  if (accessory.slot === 'hat') {
    if (accessory.id === 'party-hat') {
      const party = new THREE.Mesh(new THREE.ConeGeometry(0.58, 1.05, 24), material);
      party.position.set(0, 2.22, 0.02);
      return [party];
    }
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.05, 0.28, 28), material);
    brim.position.set(0, 1.72, 0.06);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.72, 0.62, 24), material);
    top.position.set(0, 2.12, 0.02);
    if (accessory.id === 'propeller-hat') {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.36, 10), material);
      stem.position.set(0, 2.58, 0.02);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.14), material);
      blade.position.set(0, 2.78, 0.02);
      return [brim, top, stem, blade];
    }
    return [brim, top];
  }

  if (accessory.slot === 'glasses') {
    const lensA = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.08), material);
    lensA.position.set(-0.36, 0.42, 1.64);
    const lensB = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 0.08), material);
    lensB.position.set(0.36, 0.42, 1.64);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), material);
    bridge.position.set(0, 0.42, 1.64);
    return [lensA, lensB, bridge];
  }

  if (accessory.slot === 'tail') {
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.18, 18), material);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, -0.18, -1.42);
    return [tail];
  }

  if (accessory.slot === 'shoes') {
    if (['skateboard', 'surfboard'].includes(accessory.id)) {
      const board = new THREE.Mesh(new THREE.BoxGeometry(accessory.id === 'surfboard' ? 2.2 : 1.62, 0.16, 0.52), material);
      board.position.set(0, -1.48, 0.2);
      board.rotation.z = accessory.id === 'surfboard' ? 0.04 : 0;
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.42 });
      const wheels = [-0.58, 0.58].flatMap((x) => [-0.24, 0.64].map((z) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, -1.62, z);
        return wheel;
      }));
      return accessory.id === 'skateboard' ? [board, ...wheels] : [board];
    }
    if (accessory.id === 'bimba') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.45, 1.2), material);
      body.position.set(0, -1.36, 0.24);
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 10), material);
      handle.rotation.x = Math.PI / 2;
      handle.position.set(0, -1.0, 0.9);
      return [body, handle];
    }
    if (accessory.id === 'segway') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.34), material);
      base.position.set(0, -1.48, 0.18);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 12), material);
      pole.position.set(0, -0.9, 0.4);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.1), material);
      handle.position.set(0, -0.28, 0.4);
      return [base, pole, handle];
    }
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 1.02), material);
    left.position.set(-0.62, -1.22, 0.28);
    const right = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.42, 1.02), material);
    right.position.set(0.62, -1.22, 0.28);
    return [left, right];
  }

  if (accessory.slot === 'belt') {
    const belt = new THREE.Mesh(new THREE.TorusGeometry(1.26, 0.16, 12, 42), material);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = -0.45;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.14), material);
    buckle.position.set(0, -0.45, 1.3);
    return [belt, buckle];
  }

  if (accessory.slot === 'backpack') {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.15, 0.42), material);
    pack.position.set(0, 0.0, -1.28);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.08, 18), material);
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.78, -1.52);
    return [pack, roll];
  }

  if (accessory.slot === 'watch') {
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.46, 0.16), material);
    band.position.set(1.32, -0.32, 0.72);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), material);
    face.position.set(1.42, -0.32, 0.82);
    return [band, face];
  }

  if (accessory.slot === 'nose') {
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.2, accessory.id === 'duck-nose' ? 0.62 : 0.28, 18), material);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.16, 1.78);
    if (accessory.id === 'clown-nose') {
      nose.geometry.dispose();
      nose.geometry = new THREE.SphereGeometry(0.24, 18, 12);
    }
    return [nose];
  }

  if (accessory.slot === 'hair') {
    const tufts = [-0.34, 0, 0.34].map((x) => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.62, 12), material);
      spike.position.set(x, 1.98 + Math.abs(x) * 0.18, 0.12);
      spike.rotation.z = -x * 0.8;
      return spike;
    });
    return tufts;
  }

  if (accessory.slot === 'shirt') {
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.92, 0.16), material);
    shirt.position.set(0, -0.05, 1.36);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.94, 0.18), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.34 }));
    stripe.position.set(0, -0.05, 1.47);
    return accessory.id === 'shirt-stripes' ? [shirt, stripe] : [shirt];
  }

  return [];
}

function createWeaponPreviewMeshes(weaponId, material, dark) {
  const groupOffset = new THREE.Vector3(1.08, -0.12, 0.86);
  const place = (mesh, x = 0, y = 0, z = 0) => {
    mesh.position.add(groupOffset).add(new THREE.Vector3(x, y, z));
    mesh.rotation.z += -0.12;
    return mesh;
  };

  if (weaponId === 'sniper') {
    const receiver = place(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 1.05), material), 0.08, 0, 0);
    const barrel = place(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 2.8, 14), material), 0, 0, -1.35);
    barrel.rotation.x = Math.PI / 2;
    const scope = place(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.86, 16), dark), 0, 0.34, -0.1);
    scope.rotation.x = Math.PI / 2;
    const stock = place(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.62), dark), 0, 0, 0.84);
    return [receiver, barrel, scope, stock];
  }

  if (weaponId === 'shotgun') {
    const body = place(new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 1.15), material), 0, 0, -0.1);
    const left = place(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.28, 16), dark), -0.18, 0.06, -0.78);
    left.rotation.x = Math.PI / 2;
    const right = place(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.28, 16), dark), 0.18, 0.06, -0.78);
    right.rotation.x = Math.PI / 2;
    const pump = place(new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.2, 0.42), dark), 0, -0.2, -0.32);
    return [body, left, right, pump];
  }

  if (weaponId === 'smg') {
    const body = place(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.92), material), 0, 0, -0.08);
    const barrel = place(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.62, 14), dark), 0, 0, -0.72);
    barrel.rotation.x = Math.PI / 2;
    const mag = place(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.78, 0.22), dark), 0, -0.5, 0.08);
    mag.rotation.x = -0.25;
    return [body, barrel, mag];
  }

  if (weaponId === 'blaster') {
    const core = place(new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), material), 0, 0, 0.02);
    const barrel = place(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 1.25, 18), material), 0, 0, -0.72);
    barrel.rotation.x = Math.PI / 2;
    const ring = place(new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.04, 10, 24), dark), 0, 0, -0.48);
    return [core, barrel, ring];
  }

  if (weaponId === 'rpg') {
    const tube = place(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 2.35, 20), material), 0, 0, -0.12);
    tube.rotation.x = Math.PI / 2;
    const cone = place(new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.75, 20), dark), 0, 0, -1.5);
    cone.rotation.x = -Math.PI / 2;
    const rear = place(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.28, 18), dark), 0, 0, 1.08);
    rear.rotation.x = Math.PI / 2;
    const handle = place(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.66, 0.25), dark), 0, -0.45, 0.12);
    return [tube, cone, rear, handle];
  }

  const body = place(new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 1.48), material), 0, 0, -0.08);
  const barrel = place(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.82, 14), material), 0, 0, -1.15);
  barrel.rotation.x = Math.PI / 2;
  const mag = place(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.25), dark), 0, -0.43, 0.12);
  mag.rotation.x = -0.18;
  const stock = place(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.25, 0.5), dark), 0, 0, 0.75);
  return [body, barrel, mag, stock];
}
