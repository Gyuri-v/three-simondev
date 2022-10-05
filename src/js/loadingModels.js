import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

class BasicCharacterControls {
    constructor(params) {
        this._Init(params);
    }

    _Init(params) {
        this._params = params;
        this._move = {
            forwards: false,
            backward: false,
            left: false,
            right: false,
        };
        this._decceleration /* 감속 */ = new THREE.Vector3(-0.0005, -0.0001, -5.0);
        this._acceleration  /* 가속 */ = new THREE.Vector3(1, 0.25, 50.0);
        this._velocity /* 속도 */ = new THREE.Vector3(0, 0, 0);

        document.addEventListener('keydown', (e) => this._onKeyDown(e), false);
        document.addEventListener('keyup', (e) => this._onKeyUp(e), false);
        // addEventListener( 행동, 함수, true:캡쳐링-부모노드부터이벤트전파 & false:버블링-자식노드부터이벤트전파 )
    } 

    _onKeyDown(event) {
        switch (event.keyCode) {
            case 87:  // w
                this._move.forwards = true;
                break;
            case 65: // a
                this._move.left = true;
                break;
            case 83: // s
                this._move.backward = true;
                break;
            case 68: // d
                this._move.right = true;
                break;
            case 38: // up
            case 37: // left
            case 40: // down
            case 39: // right
                break;
        }
    }

    _onKeyUp(event) {
        switch (event.keyCode) {
            case 87:  // w
                this._move.forwards = false;
                break;
            case 65: // a
                this._move.left = false;
                break;
            case 83: // s
                this._move.backward = false;
                break;
            case 68: // d
                this._move.right = false;
                break;
            case 38: // up
            case 37: // left
            case 40: // down
            case 39: // right
                break;
        }
    }
    
    Update(timeInSeconds) {
        const velocity = this._velocity;
        const frameDecceleration /* 프레임감속 */ = new THREE.Vector3(
            velocity.x * this._decceleration.x,
            velocity.y * this._decceleration.y,
            velocity.z * this._decceleration.z,
        );
        frameDecceleration.multiplyScalar(timeInSeconds);
        frameDecceleration.z = Math.sign(frameDecceleration.z) * Math.min(
            Math.abs(frameDecceleration.z), Math.abs(velocity.z)
        )
        velocity.add(frameDecceleration);
    }
}


class LoadModel {
    constructor() {
        this._Init();
    }
    
    _Init() {
        this._threejs = new THREE.WebGL1Renderer({
            antialias: true,
        });
        this._threejs.shadowMap.enabled = true;
        this._threejs.shadowMap.type = THREE.PCFShadowMap;
        this._threejs.setPixelRatio(window.devicePixelRatio);
        this._threejs.setSize(window.innerWidth, window.innerHeight);

        document.body.appendChild(this._threejs.domElement);
        
        window.addEventListener('resize', () => { this.OnWindowResize() }, false);
        
        this._camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 1.0, 1000.0);
        this._camera.position.set(75, 20, 0);
        
        this._scene = new THREE.Scene();
        
        let light = new THREE.DirectionalLight('#fff', 1.0);
        light.position.set(20, 100, 10);
        light.target.position.set(0, 0, 0);
        light.castShadow = true;
        // light.shadow.bias = -0.001;
        // light.shadow.mapSize.width = 2048;
        // light.shadow.mapSize.height = 2048;
        // light.shadow.camera.near = 0.1;
        // light.shadow.camera.far = 500.0;
        // light.shadow.camera.near = 0.5;
        // light.shadow.camera.far = 500.0;
        // light.shadow.camera.left = 100;
        // light.shadow.camera.right = -100;
        // light.shadow.camera.top = 100;
        // light.shadow.camera.bottom = -100;
        this._scene.add(light);

        light = new THREE.AmbientLight('#fff', 4.0);
        this._scene.add(light);
        
        const controls = new OrbitControls(this._camera, this._threejs.domElement);
        controls.target.set(0, 20, 0);
        controls.update();
        
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            './resources/posx.jpg',
            './resources/negx.jpg',
            './resources/posy.jpg',
            './resources/negy.jpg',
            './resources/posz.jpg',
            './resources/negz.jpg',
        ]);
        this._scene.background = texture;
        
        const plane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100, 10, 10),
            new THREE.MeshStandardMaterial({
                color: 0x202020,
            })
        );
        plane.castShadow = false;
        plane.receiveShadow = true;
        plane.rotation.x = -Math.PI / 2;
        this._scene.add(plane);

        this._mixers = [];
        this._previousRAF = null;
        
        this._LoadAnimationModel();
        this._RAF();
    }

    _LoadAnimationModel() {
        const loader = new FBXLoader();
        loader.setPath('./resources/zombie/');
        loader.load('mremireh_o_desbiens.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
        })
    }
}