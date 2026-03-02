// Session.tsx - VIDEO CONTAINER Z-INDEX FIX
// Replace the video container section (around lines 360-420) with this:

{/* Main Video Container - FIXED Z-INDEX LAYERS */}
<div className="relative flex-1 bg-black rounded-3xl overflow-hidden shadow-2xl">
    {/* Layer 1: Video Background - Z-10 */}
    <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover z-10"
        style={{ transform: 'scaleX(-1)' }} // Mirror video for natural hand movements
    />
    
    {/* Layer 2: AR Canvas Overlay - Z-20 (ABOVE VIDEO) */}
    <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full z-20 pointer-events-auto"
        style={{ 
            background: 'transparent',
            touchAction: 'none' // Better touch handling
        }}
    />
    
    {/* Layer 3: UI Elements - Z-30+ */}
    
    {/* Top Left Status and Gesture Display - Z-30 */}
    <div className="absolute top-6 left-6 flex flex-col gap-3 z-30 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white text-sm font-medium">Live Session</span>
        </div>
        
        {/* Gesture Detection Display */}
        <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2">
            <Hand className="w-4 h-4 text-white" />
            <span className="text-white text-sm font-medium">{currentGesture}</span>
        </div>
        
        {/* Gesture Status Indicator */}
        <div className={`px-4 py-2 rounded-full flex items-center gap-2 ${
            gesturesEnabled 
                ? 'bg-green-500/20 border border-green-500/50' 
                : 'bg-gray-500/20 border border-gray-500/50'
        }`}>
            <div className={`w-2 h-2 rounded-full ${gesturesEnabled ? 'bg-green-500' : 'bg-gray-500'}`} />
            <span className="text-white text-xs font-medium">
                {gesturesEnabled ? 'Gestures Active' : 'Gestures Off'}
            </span>
        </div>
    </div>

    {/* Bottom Name Tag - Z-30 */}
    <div className="absolute bottom-24 left-6 z-30 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white text-sm font-medium">
                {user?.name} (Presenting)
            </span>
        </div>
    </div>

    {/* Bottom Control Bar - Z-40 (ABOVE EVERYTHING) */}
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 z-40">
        <div className="flex items-center justify-center gap-4">
            <button 
                onClick={handleToggleAudio} 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    micOn 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                title={micOn ? 'Mute Microphone' : 'Unmute Microphone'}
            >
                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            
            <button 
                onClick={handleToggleVideo} 
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    cameraOn 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
                title={cameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
                {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            
            <button 
                onClick={handleToggleModel}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
                    modelVisible 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 scale-110' 
                        : 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-400 hover:to-gray-500'
                } text-white`}
                title={modelVisible ? 'Hide 3D Model' : 'Show 3D Model'}
            >
                {modelVisible ? <Eye size={28} /> : <EyeOff size={28} />}
            </button>
            
            <button
                onClick={() => setGesturesEnabled(!gesturesEnabled)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    gesturesEnabled 
                        ? 'bg-white/20 hover:bg-white/30 text-white' 
                        : 'bg-red-500/50 hover:bg-red-600/50 text-white/70'
                }`}
                title={gesturesEnabled ? 'Disable Hand Gestures' : 'Enable Hand Gestures'}
            >
                <Hand size={24} />
            </button>
            
            <button 
                onClick={handleLeave} 
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all shadow-lg hover:scale-105"
                title="Leave Session"
            >
                <PhoneOff size={24} />
            </button>
        </div>
    </div>

    {/* Floating Sidebar Tools - Z-35 */}
    <SessionSidebar 
        activeTool={activeTool} 
        onSelectTool={setActiveTool} 
        onModelUpload={handleModelUpload} 
    />
</div>

{/* Add this import at the top of Session.tsx */}
import { GestureRecognizer } from '../services/GestureRecognizer';
