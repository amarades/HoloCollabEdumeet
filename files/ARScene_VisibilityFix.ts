// ARScene.ts - VISIBILITY FIXES
// Replace the init() and loadModelFromUrl() methods with these updated versions

// UPDATED init() method - Fix renderer transparency
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
    window.addEventListener('resize', this.onWindowResize.bind(this));
}

// UPDATED loadModelFromUrl() method - Ensure model visibility
public loadModelFromUrl(url: string) {
    if (this.currentModelUrl === url) return;

    console.log(`📦 Loading model from URL: ${url}`);
    const loader = new GLTFLoader();

    // Fix for absolute URLs from backend
    const fullUrl = url.startsWith('http') ? url : `http://localhost:8000${url}`;
    console.log(`🔗 Full model URL: ${fullUrl}`);

    loader.load(fullUrl, (gltf) => {
        console.log('✅ GLTF loader callback triggered');
        console.log('📊 GLTF data:', gltf);
        
        if (this.currentModel) {
            console.log('🗑️ Removing current model');
            this.scene.remove(this.currentModel);
        }

        const model = gltf.scene;
        
        // ✅ CRITICAL: Ensure all materials are visible
        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Make sure materials are opaque and visible
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
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
                child.frustumCulled = false; // Prevent culling
            }
        });
        
        this.currentModel = model;
        this.currentModelUrl = url;

        // Center and Scale
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim; // Normalize to approx 3 units
        model.scale.setScalar(scale);

        console.log(`📏 Model scale: ${scale}`);
        console.log(`📍 Model center:`, center);
        console.log(`📦 Model bounds:`, box);

        model.position.sub(center.multiplyScalar(scale)); // Center it

        this.scene.add(model);
        
        // ✅ CRITICAL: Force an immediate render
        this.renderer.render(this.scene, this.camera);
        
        console.log("✅ Model loaded successfully and rendered");
        console.log("👁️ Model visible:", model.visible);
        console.log("🎨 Scene children:", this.scene.children.length);

    }, 
    (progress) => {
        // Loading progress
        const percentComplete = (progress.loaded / progress.total) * 100;
        console.log(`⏳ Loading: ${percentComplete.toFixed(2)}%`);
    },
    (error) => {
        console.error('❌ An error happened loading the model:', error);
        console.error('📋 Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });
        // Fallback to demo model if load fails
        if (!this.currentModel) {
            console.log('🔄 Loading fallback demo model');
            this.loadDemoModel();
        }
    });
}
