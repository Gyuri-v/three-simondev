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
            forward: false,
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
                this._move.forward = true;
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
                this._move.forward = false;
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
        // timeInSeconds = delta 값이라고 생각 / 약 0.01 정도
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

        const controlObject = this._params.target;
        const _Q = new THREE.Quaternion();
        const _A = new THREE.Vector3();
        const _R = controlObject.quaternion.clone();

        if ( this._move.forward ) {
            velocity.z += this._acceleration.z * timeInSeconds;
        }
        if ( this._move.backward ) {
            velocity.z -= this._acceleration.z * timeInSeconds;
        }
        if ( this._move.left ) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, Math.PI * timeInSeconds * this._acceleration.y) // (어떤축을 기준으로 할건지, 각도) -- y 축을 기준으로, 뒤에 값만큼 회전
            _R.multiply(_Q);
        }
        if ( this._move.right ) {
            _A.set(0, 1, 0);
            _Q.setFromAxisAngle(_A, -Math.PI * timeInSeconds * this._acceleration.y) // (어떤축을 기준으로 할건지, 각도) -- y 축을 기준으로, 뒤에 값만큼 회전
            _R.multiply(_Q);
        }

        controlObject.quaternion.copy(_R);

        const oldPosition = new THREE.Vector3();
        oldPosition.copy(controlObject.position);

        const forward = new THREE.Vector3(0, 0, 1);
        forward.applyQuaternion(controlObject.quaternion);
        forward.normalize();

        const sideways = new THREE.Vector3(1, 0, 0);
        sideways.applyQuaternion(controlObject.quaternion);
        sideways.normalize();
        
        sideways.multiplyScalar(velocity.x * timeInSeconds);
        forward.multiplyScalar(velocity.z * timeInSeconds);

        controlObject.position.add(forward);
        controlObject.position.add(sideways);

        oldPosition.copy(controlObject.position);
    }
}


class LoadModelDemo {
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
        this._clock = new THREE.Clock();
        
        this._LoadAnimationModel();
        this._RAF();
    }

    _LoadAnimationModel() {
        const loader = new FBXLoader();
        loader.setPath('./resources/zombie/');
        loader.load('mremireh_o_desbiens.fbx', (fbx) => {
            fbx.scale.setScalar(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });
        
            const params = {
                target: fbx,
                camera: this._camera
            }
            this._controls = new BasicCharacterControls(params);
            
            const anim = new FBXLoader();
            anim.setPath('./resources/zombie/');
            anim.load('walk.fbx', (anim => {
                const m = new THREE.AnimationMixer(fbx);
                this._mixers.push(m);
                const idle = m.clipAction(anim.animations[0]);
                idle.play();
            }));
            this._scene.add(fbx);
        });
    }

    _LoadAnimatedModleAndPlay(path, modelFile, animFile, offset) {
        const loader = new FBXLoader();
        loader.setPath(path);
        loader.load(modelFile, (fbx) => {
            fbx.scale.setScale(0.1);
            fbx.traverse(c => {
                c.castShadow = true;
            });
            fbx.position.copy(offset);

            const anim = new FBXLoader();
            anim.setPath(path);
            anim.load(animFile, (anim) => {
                const m = new THREE.AnimationMixer(fbx);
                this._mixers.push(m);
                const idle = m.clipAction(anim.animations[0]);
                idle.play();
            });
            this._scene.add(fbx);
        })
    }

    _LoadModel() {
        const loader = new GLTFLoader();
        loader.load('./resources/thing.glb', (gltf) => {
            gltf.scene.traverse(c => {
                c.castShadow = true;
            });
            this._scene.add(gltf.scene);
        })
    }

    _OnWindowResize() {
        this._camera.aspect = window.innerWidth / window.innerHeight;
        this._camera.updateProjectionMatrix();
        this._threejs.setSize(window.innerWidth, window.innerHeight);
    }

    _RAF() {
        
        requestAnimationFrame((t) => {
            
            if ( this._previousRAF === null ) {
                this._previousRAF = t;
            }

            this._RAF();

            this._threejs.render(this._scene, this._camera);
            this._Step(t - this._previousRAF);
            this._previousRAF = t;
        })
    }

    _Step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001;
        // = clock.getDelta() 와 같이 raf 함수가 실행될때 마다의 시간 간격을 가져오는데, 콘솔에 찍어보니 더 안정적임
        if (this._mixers) {
            this._mixers.map(m => m.update(timeElapsedS));
        };
        
        if (this._controls) {
            this._controls.Update(timeElapsedS);
        }
    }
}

let _APP = null;

window.addEventListener('DOMContentLoaded', () => {
    _APP = new LoadModelDemo();
})