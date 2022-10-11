import * as THREE from 'three';

import { FirstPersonControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/FirstPersonControls.js';
import { ReinhardToneMapping } from 'three';

const KEYS = {
  a: 65,
  s: 83,
  w: 87,
  d: 68,
};

function clamp(x, a, b) {
  // clamp -- css 에서는 clamp(<min>, <ideal>, <max>) 설정된 이상적인 값을 기준으로 상한, 하한 사이의 값을 고정 -- font-size: clamp(1rem, 10vw, 2rem); 같이
  return Math.min(Math.max(x, a), b);
}

class FirstPersonCamera {
  constructor() {
    // 
  }
}

class FirstPersonCameraDemo {
  constructor() {
    this.initialize_();
  }

  initialize_() {
    this.initializeRenderer_();
    this.initializeLight_();
    this.initializeScene_();
    this.initializePostFX_();
    this.initializeDemo_();

    this.previousRAF_ = null;
    this.raf_();
    this.onWindowResize_();
  }

  initializeDemo_() {
    // this.controls_ = new FirstPersonControls(this.camera_, this.threejs_.domElement);
    // this.controls_.lookSpeed = 0.8;
    // this.controls_.movementSpeed = 5;

    this.fpsCamera_ = new FirstPersonCamera(this.camera_, this.objects_);
  }

  initializeRenderer_() {
    this.threejs_ = new THREE.WebGL1Renderer({
      antialias: false,
    });
    this.threejs_.shadowMap.enabled = true;
    this.threejs_.shadowMap.type = THREE.PCFShadowMap;
    this.threejs_.setPixelRatio(window.devicePixelRatio);
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
    this.threejs_.physicallyCorrectLights = true; // ????
    this.threejs_.outputEncoding = THREE.sRGBEncoding;

    document.body.appendChild(this.threejs_.domElement);

    window.addEventListener('resize', () => { 
      this.onWindowResize_();
    }, false);

    const aspect = window.innerWidth/window.innerHeight;
    this.camera_ = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
    this.camera_.position.set(0, 0, 0);

    this.scene_ = new THREE.Scene();

    this.uiCamera_ = new THREE.OrthographicCamera(-1, 1, 1 * aspect, -1 * aspect, 1, 1000); // ??? OrthographicCamera
    this.uiScene_ = new THREE.Scene();
  }

  initializeScene_() {
    const loader = new THREE.CubeTextureLoader();
    const texture = loader.load([
      './resources/skybox/posx.jpg',
      './resources/skybox/negx.jpg',
      './resources/skybox/posy.jpg',
      './resources/skybox/negy.jpg',
      './resources/skybox/posz.jpg',
      './resources/skybox/negz.jpg',
    ]);

    texture.encoding = THREE.sRGBEncoding;
    this.scene_.background = texture;

    // 체크 보드 만들기
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy();
    // maxAnisotropy : max 비등방성 | .getMaxAnisotropy() 사용 가능한 최대 이방성을 반환
    const checkerboader = mapLoader.load('resources/checkerboard.png');
    checkerboader.anisotropy = maxAnisotropy;
    checkerboader.wrapS = THREE.RepeatWrapping;
    checkerboader.wrapT = THREE.RepeatWrapping;
    checkerboader.repeat.set(32, 32);
    checkerboader.encoding = THREE.sRGBEncoding;

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100, 10, 10),
      new THREE.MeshStandardMaterial({ map: checkerboader })
    )
    plane.castShadow = false;
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    this.scene_.add(plane);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(4, 4, 4),
      this.loadMaterial_('vintage-tile1_', 0.2)
    );
    box.position.set(10, 2, 0);
    box.castShadow = true;
    box.receiveShadow = true;
    this.scene_.add(box);

    const concreteMaterial = this.loadMaterial_('concrete3-', 4);

    const wall1 = new THREE.Mesh(
      new THREE.BoxGeometry(100, 100, 4),
      concreteMaterial
    );
    wall1.position.set(0, -40, -50);
    wall1.castShadow = true;
    wall1.receiveShadow = true;
    this.scene_.add(wall1);

    const wall2 = wall1.clone();
    wall1.position.set(0, -40, 50);
    this.scene_.add(wall2);

    const wall3 = new THREE.Mesh(
      new THREE.BoxGeometry(4, 100, 100),
      concreteMaterial);
    wall3.position.set(50, -40, 0);
    wall3.castShadow = true;
    wall3.receiveShadow = true;
    this.scene_.add(wall3);

    const wall4 = wall3.clone();
    wall4.position.set(-50, -40, 0);
    this.scene_.add(wall4);
    
    const meshes = [plane, box, wall1, wall2, wall3, wall4]
    
    this.objects_ = [];

    for (let i = 0; i < meshes.length; i++) {
      const b = new THREE.Box2();
      b.setFromObject(meshes[i]); // ????
      this.objects_.push(b);
    }

    // crosshair -- 표적!! 
    const crosshair = mapLoader.load('resources/crosshair.png');
    crosshair.anisotropy = maxAnisotropy;
    
    this.sprite_ = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: crosshair,
        color: 0xffffff,
        fog: false, 
        depthTest: false,
        depthWrite: false
      })
    )
    this.sprite_.scale.set(0.15, 0.15 * this.camera_.aspect, 1);
    this.sprite_.position.set(0, 0, -10);

    this.uiScene_.add(this.sprite_);
  }

  initializeLight_() {
    const distance = 50;
    const angle = Math.PI / 4;
    const penumbra = 0.5;
    const decay = 1;

    let light = new THREE.SpotLight('#fff', distance, angle, penumbra, decay);f
    light.castShadow = true;
    // ????
    light.shadow.bias = -0.00001;
    light.shadow.mapSize.width = 4096;
    light.shadow.mapSize.height = 4096;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 100;

    light.position.set(25, 25, 0);
    light.lookAt(0, 0, 0);
    this.scene_.add(light);

    const upColour = 0xffff80;
    const downColur = 0x808080;
    light = new THREE.HemisphereLight(upColour, downColur, 0.5);
    light.color.setHSL(0.6, 1, 0.6); // 0과 1 사이의 색조 값, 채도 값, 밝기 값 순서대로
    light.groundColor.setHSL(0.095, 1, 0.75); // groundColor : 생성자에 전달된 조명의 바탕색. 기본값은 흰색
    light.position.set(0, 4, 0);
    this.scene_.add(light);
  }

  loadMaterial_(name, tiling) {
    const mapLoader = new THREE.TextureLoader();
    const maxAnisotropy = this.threejs_.capabilities.getMaxAnisotropy(); // 사용 가능한 최대 이방성을 반환

    const metalMap = mapLoader.load('resources/freepbr/' + name + 'metallic.png');
    metalMap.anisotropy = maxAnisotropy;
    metalMap.wrapS = THREE.RepeatWrapping;
    metalMap.wrapT = THREE.RepeatWrapping;
    metalMap.repeat.set(tiling, tiling);

    const albedo = mapLoader.load('resources/freepbr/' + name + 'albedo.png');
    albedo.anisotropy = maxAnisotropy;
    albedo.wrapS = THREE.RepeatWrapping;
    albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(tiling, tiling);
    albedo.encoding = THREE.sRGBEncoding;

    const normalMap = mapLoader.load('resources/freepbr/' + name + 'normal.png');
    normalMap.anisotropy = maxAnisotropy;
    normalMap.wrapS = THREE.RepeatWrapping;
    normalMap.wrapT = THREE.RepeatWrapping;
    normalMap.repeat.set(tiling, tiling);

    const roughnessMap = mapLoader.load('resources/freepbr/' + name + 'roughness.png');
    roughnessMap.anisotropy = maxAnisotropy;
    roughnessMap.wrapS = THREE.RepeatWrapping;
    roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(tiling, tiling);

    const material = new THREE.MeshStandardMaterial({
      metalnessMap: metalMap,
      map: albedo,
      normalMap: normalMap,
      roughnessMap: roughnessMap
    });

    return material;
  }

  initializePostFX_() {}

  onWindowResize_() {
    this.camera_.aspect = window.innerWidth / window.innerHeight;
    this.camera_.updateProjectionMatrix();

    this.uiCamera_.left = -this.camera_.aspect;
    this.uiCamera_.right = this.camera_.aspect;
    this.uiCamera_.updateProjectionMatrix();
    
    this.threejs_.setSize(window.innerWidth, window.innerHeight);
  }

  raf_() {
    requestAnimationFrame((t) => {
      if (this.previousRAF_ === null) {
        this.previousRAF_ = t;
      }
      
      this.step_(t - this.previousRAF_);
      this.threejs_.autoClear = true;
      this.threejs_.render(this.scene_, this.camera_);
      this.threejs_.autoClear = false; // ???? 왜 또하는가?
      this.threejs_.render(this.uiCamera_, this.uiCamera_);
      this.previousRAF_ = t;
      this.raf_();
    }) 
  }

  step_(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    
    this.fpsCamera_.update(timeElapsed);
  }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
  _APP = new FirstPersonCameraDemo();
})
