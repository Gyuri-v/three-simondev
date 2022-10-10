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

  // initializeDemo_() {
  //   this.controls_ = new FirstPersonControls(this.camera_, this.threejs_.domElemnt);

  // }

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
}
