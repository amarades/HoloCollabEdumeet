import * as THREE from 'three';
// @ts-expect-error - GLTFLoader types are typically provided by @types/three but may not be recognized depending on tsconfig resolution
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Define State Interface
export interface ModelState {
    model_url?: string;
    rotation?: { x: number; y: number; z: number };
    scale?: number;
    position?: { x: number; y: number; z: number };
    camera?: { position: { x: number; y: number; z: number } };
    selected_part?: string | null;
    visible?: boolean;
    // New visual & motion properties
    visual_filter?: 'realistic' | 'blue_glow' | 'red_glow';
    auto_oscillate?: boolean;
}

// Slide data type for Feature 10 — 3D Presentation Mode
export interface SlideData {
    title: string;
    body: string;
    modelKey?: string;
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
    private holoPointLight: THREE.PointLight | null = null;

    // Presentation mode state
    private presentationSlides: THREE.Mesh[] = [];
    private currentSlideIndex: number = 0;
    public isPresentationMode: boolean = false;

    // Visual & Motion state
    private visualFilter: 'realistic' | 'blue_glow' | 'red_glow' = 'realistic';
    private autoOscillate: boolean = false;

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

        // Neutral secondary directional light
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-5, -3, -5);
        this.scene.add(directionalLight2);

        // PointLight — helps with depth, neutral by default
        this.holoPointLight = new THREE.PointLight(0xffffff, 1, 10);
        this.holoPointLight.position.set(0, 2, 3);
        this.scene.add(this.holoPointLight);

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

        // ── Hologram Shader Implementation ──
        const hologramShader = {
            uniforms: {
                uTime: { value: 0 },
                uColor: { value: new THREE.Color(0x7c3aed) }, // Deep Purple core
                uGlowColor: { value: new THREE.Color(0x6366f1) }, // Indigo glow
                uOpacity: { value: 0.8 },
                uFilterMode: { value: 0.0 }, // 0: Blue, 1: Red, 2: Realistic
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform vec3 uColor;
                uniform vec3 uGlowColor;
                uniform float uOpacity;
                uniform float uFilterMode;
                varying vec3 vNormal;
                varying vec3 vPosition;
                varying vec2 vUv;

                void main() {
                    // Glow colors based on mode

                    // Glow colors based on mode
                    vec3 coreColor = uColor;
                    vec3 glowColor = uGlowColor;
                    if (uFilterMode > 0.5) {
                        coreColor = vec3(0.8, 0.1, 0.1); // Red
                        glowColor = vec3(1.0, 0.3, 0.3);
                    }

                    // Fresnel Effect (Rim Glow)
                    vec3 viewDirection = normalize(-vPosition);
                    float fresnel = pow(1.0 - max(dot(vNormal, viewDirection), 0.0), 3.0);
                    
                    // Animated Scanlines
                    float scanline = sin(vPosition.y * 20.0 - uTime * 5.0) * 0.1 + 0.9;
                    
                    // Flickering
                    float flicker = sin(uTime * 20.0) * 0.02 + 0.98;
                    
                    // Grid Pattern (Subtle)
                    float grid = (sin(vPosition.x * 40.0) * sin(vPosition.z * 40.0)) * 0.05 + 0.95;
                    
                    vec3 finalColor = mix(coreColor, glowColor, fresnel);
                    float alpha = (uOpacity * 0.5 + fresnel * 0.5) * scanline * flicker * grid;
                    
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `
        };

        return new Promise((resolve, reject) => {
            loader.load(fullUrl, (gltf: any) => {
                if (this.currentModel) {
                    this.scene.remove(this.currentModel);
                }

                const model = gltf.scene;

                // ✅ CRITICAL: Apply Hologram Shader to all meshes and preserve original
                model.traverse((child: any) => {
                    if (child instanceof THREE.Mesh) {
                        // Store original material if not already stored
                        if (!child.userData.originalMaterial) {
                            child.userData.originalMaterial = child.material;
                        }
                        
                        // Create and store hologram material
                        child.userData.hologramMaterial = new THREE.ShaderMaterial({
                            uniforms: THREE.UniformsUtils.clone(hologramShader.uniforms),
                            vertexShader: hologramShader.vertexShader,
                            fragmentShader: hologramShader.fragmentShader,
                            transparent: true,
                            side: THREE.DoubleSide,
                            depthWrite: false,
                            blending: THREE.AdditiveBlending
                        });

                        // Initialize with current filter (swaps material if needed)
                        this.applyFilterToMesh(child);
                        
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

        const time = performance.now() / 1000;

        // Feature 1: Float animation + shader uniform update
        if (this.currentModel && !this.isPresentationMode) {
            // Gentle sine-wave float
            this.currentModel.position.y = Math.sin(time * 0.8) * 0.15;
            
            // 180-degree oscillation (sine wave between -90 and 90 degrees)
            if (this.autoOscillate && !this.isDragging) {
                // Math.sin(time) gives -1 to 1. PI/2 is 90 degrees.
                const angle = Math.sin(time * 0.5) * (Math.PI / 2);
                this.currentModel.rotation.y = angle;
            } else if (!this.isDragging) {
                // Fallback slow rotate
                this.currentModel.rotation.y += 0.003;
            }

            this.currentModel.traverse((child: any) => {
                if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                    child.material.uniforms.uTime.value = time;
                }
            });
        }

        // Animate point light intensity for pulsing glow
        if (this.holoPointLight) {
            this.holoPointLight.intensity = 1.5 + Math.sin(time * 2) * 0.5;
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ── Feature 10: 3D Presentation Mode ──────────────────────────────────────

    public startPresentationMode(slides: SlideData[]) {
        this.isPresentationMode = true;
        // Clear previous slides
        this.presentationSlides.forEach(s => this.scene.remove(s));
        this.presentationSlides = [];

        slides.forEach((slide, index) => {
            const geometry = new THREE.PlaneGeometry(2.5, 1.8);

            // Render slide text to an offscreen canvas
            const offscreen = document.createElement('canvas');
            offscreen.width = 512;
            offscreen.height = 368;
            const ctx = offscreen.getContext('2d')!;

            ctx.fillStyle = 'rgba(0, 17, 34, 0.85)';
            ctx.fillRect(0, 0, 512, 368);

            // Title
            ctx.fillStyle = '#00d4ff';
            ctx.font = 'bold 36px monospace';
            ctx.fillText(slide.title, 24, 60);

            // Divider
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(24, 80);
            ctx.lineTo(488, 80);
            ctx.stroke();

            // Body text (word-wrap)
            ctx.fillStyle = '#ffffff';
            ctx.font = '22px monospace';
            const words = slide.body.split(' ');
            let line = '';
            let y = 120;
            for (const word of words) {
                const test = line + word + ' ';
                if (ctx.measureText(test).width > 460) {
                    ctx.fillText(line, 24, y);
                    line = word + ' ';
                    y += 30;
                } else {
                    line = test;
                }
            }
            ctx.fillText(line, 24, y);

            // Slide index
            ctx.fillStyle = 'rgba(0, 212, 255, 0.5)';
            ctx.font = '16px monospace';
            ctx.fillText(`${index + 1} / ${slides.length}`, 450, 350);

            const texture = new THREE.CanvasTexture(offscreen);
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.92,
                side: THREE.DoubleSide,
            });

            const mesh = new THREE.Mesh(geometry, material);

            // Position in arc formation
            const angle = ((index - Math.floor(slides.length / 2)) / Math.max(slides.length, 1)) * Math.PI * 0.6;
            mesh.position.set(Math.sin(angle) * 4, 0, -Math.cos(angle) * 2);
            mesh.rotation.y = -angle;
            mesh.visible = index === 0;

            this.scene.add(mesh);
            this.presentationSlides.push(mesh);
        });

        this.currentSlideIndex = 0;
    }

    public nextSlide() {
        if (this.presentationSlides.length === 0) return;
        this.presentationSlides[this.currentSlideIndex].visible = false;
        this.currentSlideIndex = Math.min(this.currentSlideIndex + 1, this.presentationSlides.length - 1);
        this.presentationSlides[this.currentSlideIndex].visible = true;
    }

    public prevSlide() {
        if (this.presentationSlides.length === 0) return;
        this.presentationSlides[this.currentSlideIndex].visible = false;
        this.currentSlideIndex = Math.max(this.currentSlideIndex - 1, 0);
        this.presentationSlides[this.currentSlideIndex].visible = true;
    }

    public getCurrentSlide() {
        return this.currentSlideIndex;
    }

    public stopPresentationMode() {
        this.isPresentationMode = false;
        this.presentationSlides.forEach(s => {
            s.geometry.dispose();
            (s.material as THREE.MeshBasicMaterial).map?.dispose();
            (s.material as THREE.MeshBasicMaterial).dispose();
            this.scene.remove(s);
        });
        this.presentationSlides = [];
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
            model_url: this.currentModelUrl ?? undefined, // null → undefined to match ModelState type
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
            selected_part: this.selectedPart ? this.selectedPart.name : null,
            visual_filter: this.visualFilter,
            auto_oscillate: this.autoOscillate
        };
    }

    public setVisualFilter(filter: 'realistic' | 'blue_glow' | 'red_glow') {
        this.visualFilter = filter;
        this.updateMeshFilters();
        
        // Update scene lighting based on filter
        if (this.holoPointLight) {
            switch (filter) {
                case 'blue_glow':
                    this.holoPointLight.color.set(0x00d4ff);
                    this.holoPointLight.intensity = 2;
                    break;
                case 'red_glow':
                    this.holoPointLight.color.set(0xff4444);
                    this.holoPointLight.intensity = 2;
                    break;
                case 'realistic':
                default:
                    this.holoPointLight.color.set(0xffffff);
                    this.holoPointLight.intensity = 1;
                    break;
            }
        }

        this.notifyStateChange();
    }

    public setAutoOscillate(enabled: boolean) {
        this.autoOscillate = enabled;
        this.notifyStateChange();
    }

    private updateMeshFilters() {
        if (this.currentModel) {
            this.currentModel.traverse((child: any) => {
                if (child instanceof THREE.Mesh) {
                    this.applyFilterToMesh(child);
                }
            });
        }
    }

    private applyFilterToMesh(mesh: THREE.Mesh) {
        if (this.visualFilter === 'realistic') {
            // Restore original material with standard rendering properties
            if (mesh.userData.originalMaterial) {
                mesh.material = mesh.userData.originalMaterial;
            }
        } else {
            // Apply hologram material with additive blending
            if (mesh.userData.hologramMaterial) {
                mesh.material = mesh.userData.hologramMaterial;
                const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms;
                
                switch (this.visualFilter) {
                    case 'red_glow':
                        uniforms.uFilterMode.value = 1.0;
                        break;
                    case 'blue_glow':
                    default:
                        uniforms.uFilterMode.value = 0.0;
                        break;
                }
            }
        }
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

        // Apply filter & oscillation without notifying
        if (state.visual_filter && state.visual_filter !== this.visualFilter) {
            this.visualFilter = state.visual_filter;
            this.updateMeshFilters();
        }
        if (state.auto_oscillate !== undefined) {
            this.autoOscillate = state.auto_oscillate;
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

    // ── Multi-object Scene Management ─────────────────────────────────────────
    // Maps server-assigned object id → Three.js mesh
    private sceneObjects: Map<string, THREE.Object3D> = new Map();

    private makeObjectMesh(type: string, color: string): THREE.Mesh {
        let geometry: THREE.BufferGeometry;
        switch (type) {
            case 'sphere':   geometry = new THREE.SphereGeometry(0.4, 32, 32); break;
            case 'cone':
            case 'pyramid':  geometry = new THREE.ConeGeometry(0.4, 0.8, 4); break;
            case 'cylinder': geometry = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 32); break;
            default:         geometry = new THREE.BoxGeometry(0.7, 0.7, 0.7); break; // box / cube
        }
        const colorHex = parseInt(color.replace('#', ''), 16);
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(colorHex || 0x6366f1),
            emissive: new THREE.Color(colorHex || 0x6366f1),
            emissiveIntensity: 0.35,
            metalness: 0.3,
            roughness: 0.4,
            transparent: true,
            opacity: 0.88,
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * Add a networked object to the scene.
     * Called when OBJECT_ADDED arrives from the server.
     */
    public addSceneObject(obj: { id: string; type: string; position: number[]; color: string; scale?: number[] }) {
        if (this.sceneObjects.has(obj.id)) return; // already present

        const mesh = this.makeObjectMesh(obj.type, obj.color);
        const [px, py, pz] = obj.position ?? [0, 0, 0];
        mesh.position.set(px, py, pz);
        if (obj.scale) {
            const [sx, sy, sz] = obj.scale;
            mesh.scale.set(sx, sy, sz);
        }
        mesh.userData = { id: obj.id, type: obj.type };
        this.scene.add(mesh);
        this.sceneObjects.set(obj.id, mesh);
    }

    /**
     * Update position/rotation/scale of an existing networked object.
     * Called when OBJECT_UPDATED arrives from the server.
     */
    public updateSceneObject(obj: { id: string; position?: number[]; rotation?: number[]; scale?: number[] }) {
        const mesh = this.sceneObjects.get(obj.id);
        if (!mesh) return;

        if (obj.position) {
            const [px, py, pz] = obj.position;
            mesh.position.set(px, py, pz);
        }
        if (obj.rotation) {
            const [rx, ry, rz] = obj.rotation;
            mesh.rotation.set(rx, ry, rz);
        }
        if (obj.scale) {
            const [sx, sy, sz] = obj.scale;
            mesh.scale.set(sx, sy, sz);
        }
    }

    /**
     * Remove a networked object from the scene.
     * Called when OBJECT_DELETED arrives from the server.
     */
    public deleteSceneObject(id: string) {
        const mesh = this.sceneObjects.get(id);
        if (!mesh) return;
        this.scene.remove(mesh);
        (mesh as THREE.Mesh).geometry?.dispose();
        const mat = (mesh as THREE.Mesh).material;
        if (mat) {
            if (Array.isArray(mat)) mat.forEach(m => m.dispose());
            else (mat as THREE.Material).dispose();
        }
        this.sceneObjects.delete(id);
    }

    /**
     * Apply a full scene snapshot from the server (SCENE_STATE on join).
     */
    public applySceneState(objects: Array<{ id: string; type: string; position: number[]; color: string; scale?: number[] }>) {
        // Remove objects no longer in state
        const incoming = new Set(objects.map(o => o.id));
        for (const [id] of this.sceneObjects) {
            if (!incoming.has(id)) this.deleteSceneObject(id);
        }
        // Add or update
        for (const obj of objects) {
            if (this.sceneObjects.has(obj.id)) {
                this.updateSceneObject(obj as any);
            } else {
                this.addSceneObject(obj);
            }
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
