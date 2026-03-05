import * as THREE from 'three';
// @ts-expect-error - GLTFLoader types are typically provided by @types/three but may not be recognized depending on tsconfig resolution
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Define State Interface
export interface ModelState {
    rotation?: { x: number; y: number; z: number };
    scale?: number;
    position?: { x: number; y: number; z: number };
    camera?: { position: { x: number; y: number; z: number } };
    selected_part?: string | null;
    visible?: boolean;
    model_url?: string;
}

export class ARScene {
    private canvas: HTMLCanvasElement;
    private scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    public currentModel: THREE.Group | null = null;
    private currentModelUrl: string | null = null;
    private selectedPart: THREE.Mesh | null = null;
    private animationId: number | null = null;
    private isDragging: boolean = false;
    private previousMousePosition = { x: 0, y: 0 };

    // Bound listener references for cleanup
    private boundMouseMove: (e: MouseEvent) => void = () => { };
    private boundMouseUp: () => void = () => { };
    private boundResize: () => void = () => { };

    // Callbacks for events
    public onStateChange?: (state: ModelState) => void;
    public onPartSelected?: (partName: string) => void;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        console.log('ARScene: Constructor called');


        // Init properties with temporary values to satisfy TS (will be overwritten in init)
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera();
        this.renderer = new THREE.WebGLRenderer();

        this.init();
        this.animate();
    }

    private init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        // Create camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            this.canvas.clientWidth / this.canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 5);

        // Create renderer with proper transparency settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true,  // ✅ CRITICAL: Enable transparency
            premultipliedAlpha: false,  // ✅ CRITICAL: Prevent transparency issues
            preserveDrawingBuffer: true
        });

        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // ✅ CRITICAL: Set clear color with full transparency
        this.renderer.setClearColor(0x000000, 0);  // 0 = fully transparent

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight1.position.set(5, 5, 5);
        this.scene.add(directionalLight1);

        const directionalLight2 = new THREE.DirectionalLight(0x6366f1, 0.4);
        directionalLight2.position.set(-5, -3, -5);
        this.scene.add(directionalLight2);

        // Controls
        this.setupMouseControls();

        // Resize handler
        this.boundResize = this.onWindowResize.bind(this);
        window.addEventListener('resize', this.boundResize);
    }

    private setupMouseControls() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.boundMouseMove = (e: MouseEvent) => {
            if (!this.isDragging || !this.currentModel) return;

            const deltaX = e.clientX - this.previousMousePosition.x;
            const deltaY = e.clientY - this.previousMousePosition.y;

            if (e.buttons === 2 || (e.buttons === 1 && e.shiftKey)) {
                const panSpeed = 0.01;
                this.currentModel.position.x += deltaX * panSpeed;
                this.currentModel.position.y -= deltaY * panSpeed;
            } else {
                this.currentModel.rotation.y += deltaX * 0.01;
                this.currentModel.rotation.x += deltaY * 0.01;
            }

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
            this.notifyStateChange();
        };

        this.boundMouseUp = () => {
            this.isDragging = false;
        };

        window.addEventListener('mousemove', this.boundMouseMove);
        window.addEventListener('mouseup', this.boundMouseUp);

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * -0.001;
            this.camera.position.z = Math.max(2, Math.min(15, this.camera.position.z + delta));
            this.notifyStateChange();
        });

        this.canvas.addEventListener('click', () => {
            // Raycasting for part selection can be implemented here if needed
        });
    }

    public loadModelFromUrl(url: string): Promise<void> {
        if (this.currentModelUrl === url) return Promise.resolve();

        console.log(`📦 Loading model from URL: ${url}`);
        const loader = new GLTFLoader();

        // Strip hostname so the request goes through Vite's /api proxy (avoids CORS).
        // e.g. "http://localhost:8000/api/models/foo.glb" → "/api/models/foo.glb"
        let fullUrl: string;
        try {
            const parsed = new URL(url);
            fullUrl = parsed.pathname + parsed.search;
        } catch {
            // url is already relative (e.g. "/api/models/foo.glb")
            fullUrl = url.startsWith('/') ? url : `/api/models/${url}`;
        }
        console.log(`🔗 Full model URL (proxied): ${fullUrl}`);

        return new Promise((resolve, reject) => {
            loader.load(fullUrl, (gltf: any) => {
                if (this.currentModel) {
                    this.scene.remove(this.currentModel);
                }

                const model = gltf.scene;

                // ✅ CRITICAL: Ensure all materials are visible
                model.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach((mat: any) => {
                                mat.transparent = false;
                                mat.opacity = 1;
                                mat.depthWrite = true;
                                mat.depthTest = true;
                            });
                        } else {
                            child.material.transparent = false;
                            child.material.opacity = 1;
                            child.material.depthWrite = true;
                            child.material.depthTest = true;
                        }
                        child.visible = true;
                        child.frustumCulled = false;
                    }
                });

                this.currentModel = model;
                this.currentModelUrl = url;

                // Center and Scale
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());

                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 3 / maxDim;
                model.scale.setScalar(scale);
                model.position.sub(center.multiplyScalar(scale));

                this.scene.add(model);
                this.renderer.render(this.scene, this.camera);
                console.log('✅ Model loaded successfully');
                resolve();
            },
                (progress: any) => {
                    const percentComplete = (progress.loaded / progress.total) * 100;
                    console.log(`⏳ Loading: ${percentComplete.toFixed(2)}%`);
                },
                (error: any) => {
                    console.error('❌ An error happened loading the model:', error);
                    reject(error);
                });
        });
    }

    private animate() {
        this.animationId = requestAnimationFrame(this.animate.bind(this));

        this.renderer.render(this.scene, this.camera);
    }

    public clearModel() {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            // Dispose geometries/materials to free GPU memory
            this.currentModel.traverse((obj: any) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach((m: any) => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
            this.currentModel = null;
            this.currentModelUrl = null;
            this.renderer.render(this.scene, this.camera);
        }
    }

    private onWindowResize() {
        if (!this.canvas) return;
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }

    public getState(): ModelState | null {
        if (!this.currentModel) return null;

        return {
            rotation: {
                x: this.currentModel.rotation.x,
                y: this.currentModel.rotation.y,
                z: this.currentModel.rotation.z
            },
            scale: this.currentModel.scale.x, // Assuming uniform
            position: {
                x: this.currentModel.position.x,
                y: this.currentModel.position.y,
                z: this.currentModel.position.z
            },
            camera: {
                position: {
                    x: this.camera.position.x,
                    y: this.camera.position.y,
                    z: this.camera.position.z
                }
            },
            selected_part: this.selectedPart ? this.selectedPart.name : null
        };
    }

    public applyState(state: ModelState) {
        // Check for model URL change
        if (state.model_url && state.model_url !== this.currentModelUrl) {
            this.loadModelFromUrl(state.model_url);
        }

        if (!this.currentModel || !state) return;

        // Apply rotation
        if (state.rotation) {
            this.currentModel.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
        }

        // Apply scale
        if (state.scale !== undefined && this.currentModel) {
            this.currentModel.scale.setScalar(state.scale);
        }

        // Apply position
        if (state.position) {
            this.currentModel.position.set(state.position.x, state.position.y, state.position.z);
        }

        // Apply camera
        if (state.camera?.position) {
            this.camera.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z);
        }

        // Apply selection
        if (state.selected_part) {
            this.selectPart(state.selected_part);
        }

        // Apply visibility
        if (state.visible !== undefined && this.currentModel) {
            this.currentModel.visible = state.visible;
        }
    }

    public async loadModel(url: string): Promise<void> {
        await this.loadModelFromUrl(url);
    }

    public toggleModelVisibility() {
        if (this.currentModel) {
            this.currentModel.visible = !this.currentModel.visible;
            if (this.onStateChange) {
                this.onStateChange({ visible: this.currentModel.visible });
            }
        }
    }

    public selectPart(partName: string) {
        if (!this.currentModel) return;

        // Reset old
        if (this.selectedPart) {
            (this.selectedPart.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
        }

        const part = this.currentModel.children.find(child => child.name === partName) as THREE.Mesh;
        if (part) {
            (part.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5;
            this.selectedPart = part;
            if (this.onPartSelected) this.onPartSelected(partName);
        }
    }

    public setMode(_mode: 'student' | 'instructor') {
        // mode is currently unused by the class logic internally
    }

    public notifyStateChange() {
        if (this.onStateChange) {
            const state = this.getState();
            if (state) this.onStateChange(state);
        }
    }

    // Actions for buttons
    public resetView() {
        this.camera.position.set(0, 0, 5);
        if (this.currentModel) this.currentModel.rotation.set(0, 0, 0);
        this.notifyStateChange();
    }

    public rotateModel(axis: 'x' | 'y' | 'z', angle: number) {
        if (!this.currentModel) return;
        this.currentModel.rotation[axis] += angle;
        this.notifyStateChange();
    }

    public dispose() {
        if (this.animationId) cancelAnimationFrame(this.animationId);

        // Remove window-level event listeners to prevent memory leaks
        window.removeEventListener('mousemove', this.boundMouseMove);
        window.removeEventListener('mouseup', this.boundMouseUp);
        window.removeEventListener('resize', this.boundResize);

        // Dispose all geometries and materials to free GPU memory
        this.scene.traverse((obj: any) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((mat: any) => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        this.renderer.dispose();
    }
}
