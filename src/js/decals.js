import * as THREE from 'three';

import {
    FirstPersonControls
} from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/FirstPersonControls.js';
import {
    ReinhardToneMapping
} from 'three';

const KEYS = {
    'a': 65,
    's': 83,
    'w': 87,
    'd': 68,
};

function clamp(x, a, b) {
    // clamp -- css 에서는 clamp(<min>, <ideal>, <max>) 설정된 이상적인 값을 기준으로 상한, 하한 사이의 값을 고정 -- font-size: clamp(1rem, 10vw, 2rem); 같이
    return Math.min(Math.max(x, a), b);
}

class InputController {
    constructor(target) {
        this.target_ = target || document;
        this.initialize_();
    }

    initialize_() {
        this.current_ = {
            leftButton: false,
            rightButton: false,
            mouseXDelta: 0,
            mouseYDelta: 0,
            mouseX: 0,
            mouseY: 0,
        };
        this.previous_ = null;
        this.keys_ = {};
        this.previousKeys_ = {};
        this.target_.addEventListener('mousedown', (e) => this.onMouseDown_(e), false);
        this.target_.addEventListener('mousemove', (e) => this.onMouseMove_(e), false);
        this.target_.addEventListener('mouseup', (e) => this.onMouseUp_(e), false);
        this.target_.addEventListener('keydown', (e) => this.onKeyDown_(e), false);
        this.target_.addEventListener('keyup', (e) => this.onKeyUp_(e), false);
    }

    onMouseMove_(e) {
        // 마우스 좌표 가운데를 원점으로 맞추고,
        this.current_.mouseX = e.pageX - window.innerWidth / 2;
        this.current_.mouseY = e.pageY - window.innerHeight / 2;


        if (this.previous_ === null) {
            this.previous_ = {
                ...this.current_ // ... : this.curret_ 의 전부를 불러옴
            };
        }

        // 마우스 얼마나 움직였는지
        this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
        this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;
    }

    onMouseDown_(e) {
        this.onMouseMove_(e);

        switch (e.button) {
            case 0: { // 마우스 좌클릭
                this.current_.leftButton = true;
                break;
            }
            case 2: { // 마우스 우클릭
                this.current_.rightButton = true;
                break;
            }
        }
    }

    onMouseUp_(e) {
        this.onMouseMove_(e);

        switch (e.button) {
            case 0: { // 마우스 좌클릭
                this.current_.leftButton = false;
                break;
            }
            case 2: { // 마우스 우클릭
                this.current_.rightButton = false;
                break;
            }
        }
    }

    onKeyDown_(e) {
        this.keys_[e.keyCode] = true;
    }

    onKeyUp_(e) {
        this.keys_[e.keyCode] = false;
    }

    key(keyCode) {
        return !!this.keys_[keyCode];
    }

    isReady() {
        return this.previous_ !== null;
    }

    update(_) {
        // mouse delta 값 계속 업데이트
        if (this.previous_ !== null) {
            this.current_.mouseXDelta = this.current_.mouseX - this.previous_.mouseX;
            this.current_.mouseYDelta = this.current_.mouseY - this.previous_.mouseY;

            this.previous_ = {
                ...this.current_
            }; // current 로 합체
        }
    }
}

class FirstPersonCamera {
    constructor(camera, objects) {
        this.camera_ = camera;
        this.input_ = new InputController();
        this.rotation_ = new THREE.Quaternion(); // 카메라의 로테이션
        this.translation_ = new THREE.Vector3(0, 2, 0);
        this.phi_ = 0;
        this.phiSpeed_ = 8;
        this.theta_ = 0;
        this.thetaSpeed_ = 5;
        this.headBobActive_ = false;
        this.headBobTimer_ = 0;
        this.objects_ = objects;
    }

    update(timeElapsedS) {
        this.updateRotation_(timeElapsedS);
        this.updateCamera_(timeElapsedS);
        this.updateTranslation_(timeElapsedS);
        this.updateHeadBob_(timeElapsedS);
        this.input_.update(timeElapsedS); // input 들 계속 업데이트
    }

    updateCamera_(_) {
        // console.log(this.headBobTimer_);
        this.camera_.quaternion.copy(this.rotation_); // updateRotation_에서 구한 값 
        this.camera_.position.copy(this.translation_); // updateTranslation_ 에서 구합 값
        this.camera_.position.y += Math.sin(this.headBobTimer_ * 10) * 1.5; // headBobTimer_ 값만큼 sin 그래프 처럼 움직이고

        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(this.rotation_);

        const dir = forward.clone();

        forward.multiplyScalar(100);
        forward.add(this.translation_);

        let closest = forward;
        const result = new THREE.Vector3();
        const ray = new THREE.Ray(this.translation_, dir); // this.translation_ (origin)을 기준으로 dir 방향으로 광선 쏘기
        for (let i = 0; i < this.objects_.length; ++i) { // this.objects_ : mesh 수 만큼 만들었던 박스들
            if (ray.intersectBox(this.objects_[i], result)) { // this.objects_[i]의 박스와 교차하는 값을 result 에 저장
                if (result.distanceTo(ray.origin) < closest.distanceTo(ray.origin)) {
                    closest = result.clone();
                }
            }
        }

        this.camera_.lookAt(closest);
    }

    updateHeadBob_(timeElapsedS) {
        if (this.headBobActive_) {
            const wavelength = Math.PI;
            const nextStep = 1 + Math.floor(((this.headBobTimer_ + 0.000001) * 10) / wavelength);
            const nextStepTime = nextStep * wavelength / 10;
            this.headBobTimer_ = Math.min(this.headBobTimer_ + timeElapsedS, nextStepTime);

            if (this.headBobTimer_ == nextStepTime) {
                this.headBobActive_ = false;
            }
        }
    }

    updateTranslation_(timeElapsedS) {
        const forwardVelocity = (this.input_.key(KEYS.w) ? 1 : 0) + (this.input_.key(KEYS.s) ? -1 : 0); // w키 눌름 1, s키 눌름 -1
        const strafeVelocity = (this.input_.key(KEYS.a) ? 1 : 0) + (this.input_.key(KEYS.d) ? -1 : 0); // a키 눌름 1, d키 눌름 -1

        const qx = new THREE.Quaternion();
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_); // updateRotation_ 에서 정한 쿼터니언 x 값

        const forward = new THREE.Vector3(0, 0, -1); // z 앞으로 간당
        forward.applyQuaternion(qx);
        forward.multiplyScalar(forwardVelocity * timeElapsedS * 10); // 타임 * 10 씩 곱합

        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(qx);
        left.multiplyScalar(strafeVelocity * timeElapsedS * 10); // 타임 * -10 씩 곱합

        this.translation_.add(forward);
        this.translation_.add(left);

        if (forwardVelocity != 0 || strafeVelocity != 0) {
            this.headBobActive_ = true; // 움직임이 있으면 머리 움직이라고
        }
    }

    updateRotation_(timeElapsedS) {
        const xh = this.input_.current_.mouseXDelta / window.innerWidth;
        const yh = this.input_.current_.mouseYDelta / window.innerHeight;

        this.phi_ += -xh * this.phiSpeed_; // -마우스x움직인거리/윈도우width * 설정해둔 phiSpeed
        this.theta_ = clamp(this.theta_ + -yh * this.thetaSpeed_, -Math.PI / 3, Math.PI / 3); // 1.(이상적)기존theta_ + -마우스y움직인거리/윈도우height 2.(최소값)-60도  3.(최대값)60도

        const qx = new THREE.Quaternion(); // 카메라 퀀터니언 구할때 x 값
        qx.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.phi_); // y 축 기준으로 가로로 돌려
        const qz = new THREE.Quaternion(); // 카메라 퀀터니언 구할때 z 값
        qz.setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.theta_); // x 축 기준으로 세로로 돌려

        const q = new THREE.Quaternion(); // rotation quaternion
        q.multiply(qx);
        q.multiply(qz);

        this.rotation_.copy(q);
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
        this.threejs_ = new THREE.WebGLRenderer({
            antialias: false,
        });
        this.threejs_.shadowMap.enabled = true;
        this.threejs_.shadowMap.type = THREE.PCFShadowMap;
        this.threejs_.setPixelRatio(window.devicePixelRatio);
        this.threejs_.setSize(window.innerWidth, window.innerHeight);
        this.threejs_.physicallyCorrectLights = true; // 물리적으로 올바른 조명 모드를 사용할지 여부
        this.threejs_.outputEncoding = THREE.sRGBEncoding;

        document.body.appendChild(this.threejs_.domElement);

        window.addEventListener('resize', () => {
            this.onWindowResize_();
        }, false);

        const aspect = window.innerWidth / window.innerHeight;
        this.camera_ = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
        this.camera_.position.set(0, 2, 0);

        this.scene_ = new THREE.Scene();

        this.uiCamera_ = new THREE.OrthographicCamera(-1, 1, 1 * aspect, -1 * aspect, 1, 1000); // OrthographicCamera : 직교 카메라
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
        const checkerboard = mapLoader.load('resources/checkerboard.png');
        checkerboard.anisotropy = maxAnisotropy;
        checkerboard.wrapS = THREE.RepeatWrapping;
        checkerboard.wrapT = THREE.RepeatWrapping;
        checkerboard.repeat.set(32, 32);
        checkerboard.encoding = THREE.sRGBEncoding;

        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                map: checkerboard
            })
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

        for (let i = 0; i < meshes.length; ++i) {
            const b = new THREE.Box3();
            b.setFromObject(meshes[i]);
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

        let light = new THREE.SpotLight('#fff', distance, angle, penumbra, decay);
        light.castShadow = true;
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
            this.threejs_.autoClear = false;
            this.threejs_.render(this.uiScene_, this.uiCamera_);
            this.previousRAF_ = t;
            this.raf_();
        })
    }

    step_(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;

        // this.controls_.update(timeElapsedS);
        this.fpsCamera_.update(timeElapsedS);
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new FirstPersonCameraDemo();
})
