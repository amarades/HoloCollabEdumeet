import React, { useState } from 'react';
import { X, Mic, Video, Volume2, Monitor, Hand, Cpu, ChevronDown } from 'lucide-react';

interface SettingsPanelProps {
    onClose: () => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }> = ({
    checked,
    onChange,
    label,
    description,
}) => (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
        <div>
            <div className="text-gray-800 font-medium text-sm">{label}</div>
            {description && <div className="text-gray-400 text-xs mt-0.5">{description}</div>}
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-primary' : 'bg-gray-200'}`}
        >
            <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
            />
        </button>
    </div>
);

const SelectField: React.FC<{ label: string; value: string; options: string[]; onChange: (v: string) => void }> = ({
    label,
    value,
    options,
    onChange,
}) => (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-100 last:border-0">
        <div className="text-gray-800 font-medium text-sm">{label}</div>
        <div className="relative">
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-primary cursor-pointer"
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
    </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'display' | 'gestures'>('audio');

    // Audio
    const [micEnabled, setMicEnabled] = useState(true);
    const [noiseSuppression, setNoiseSuppression] = useState(true);
    const [echoCancellation, setEchoCancellation] = useState(true);
    const [spatialAudio, setSpatialAudio] = useState(false);
    const [micDevice, setMicDevice] = useState('Default Microphone');
    const [speakerDevice, setSpeakerDevice] = useState('Default Speaker');

    // Video
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [mirrorVideo, setMirrorVideo] = useState(true);
    const [hdVideo, setHdVideo] = useState(true);
    const [lowLightMode, setLowLightMode] = useState(false);
    const [resolution, setResolution] = useState('720p');

    // Display
    const [darkMode, setDarkMode] = useState(false);
    const [showGestureOverlay, setShowGestureOverlay] = useState(true);
    const [showParticipantNames, setShowParticipantNames] = useState(true);
    const [compactUI, setCompactUI] = useState(false);

    // Gestures
    const [gesturesEnabled, setGesturesEnabled] = useState(true);
    const [gestureConfidence, setGestureConfidence] = useState('0.7');
    const [handTracking, setHandTracking] = useState(true);
    const [gestureHaptics, setGestureHaptics] = useState(false);

    const tabs = [
        { id: 'audio' as const, label: 'Audio', icon: Mic },
        { id: 'video' as const, label: 'Video', icon: Video },
        { id: 'display' as const, label: 'Display', icon: Monitor },
        { id: 'gestures' as const, label: 'Gestures', icon: Hand },
    ];

    return (
        <div className="absolute inset-4 md:inset-y-10 md:right-10 md:left-auto md:w-[420px] bg-white rounded-2xl border border-gray-200 shadow-2xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-gray-900 font-semibold text-lg flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" />
                    Session Settings
                </h2>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-gray-200 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Tab Nav */}
            <div className="flex border-b border-gray-200 bg-gray-50/50">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex-1 py-3 text-xs font-semibold flex flex-col items-center gap-1 transition-all
                            ${activeTab === id
                                ? 'text-primary border-b-2 border-primary bg-white'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                {activeTab === 'audio' && (
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                <Mic className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <div className="text-gray-900 font-semibold text-sm">Microphone</div>
                                <div className="text-gray-400 text-xs">Input device configuration</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 mb-6">
                            <Toggle checked={micEnabled} onChange={setMicEnabled} label="Enable Microphone" description="Allow others to hear you" />
                            <Toggle checked={noiseSuppression} onChange={setNoiseSuppression} label="Noise Suppression" description="Reduce background noise" />
                            <Toggle checked={echoCancellation} onChange={setEchoCancellation} label="Echo Cancellation" description="Prevent audio feedback" />
                            <SelectField
                                label="Microphone"
                                value={micDevice}
                                options={['Default Microphone', 'Built-in Mic', 'External Mic']}
                                onChange={setMicDevice}
                            />
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                                <Volume2 className="w-4 h-4 text-purple-500" />
                            </div>
                            <div>
                                <div className="text-gray-900 font-semibold text-sm">Speaker</div>
                                <div className="text-gray-400 text-xs">Output device configuration</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4">
                            <Toggle checked={spatialAudio} onChange={setSpatialAudio} label="Spatial Audio" description="3D positional audio (experimental)" />
                            <SelectField
                                label="Speaker"
                                value={speakerDevice}
                                options={['Default Speaker', 'Built-in Speaker', 'Headphones']}
                                onChange={setSpeakerDevice}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'video' && (
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                                <Video className="w-4 h-4 text-green-500" />
                            </div>
                            <div>
                                <div className="text-gray-900 font-semibold text-sm">Camera</div>
                                <div className="text-gray-400 text-xs">Video input settings</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4">
                            <Toggle checked={cameraEnabled} onChange={setCameraEnabled} label="Enable Camera" description="Show your video to others" />
                            <Toggle checked={mirrorVideo} onChange={setMirrorVideo} label="Mirror Video" description="Flip your camera horizontally" />
                            <Toggle checked={hdVideo} onChange={setHdVideo} label="HD Video" description="Stream at higher quality" />
                            <Toggle checked={lowLightMode} onChange={setLowLightMode} label="Low-Light Enhancement" description="Improve video in dark environments" />
                            <SelectField
                                label="Resolution"
                                value={resolution}
                                options={['360p', '480p', '720p', '1080p']}
                                onChange={setResolution}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'display' && (
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                                <Monitor className="w-4 h-4 text-orange-500" />
                            </div>
                            <div>
                                <div className="text-gray-900 font-semibold text-sm">Interface</div>
                                <div className="text-gray-400 text-xs">Customize your session view</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4">
                            <Toggle checked={showGestureOverlay} onChange={setShowGestureOverlay} label="Gesture Status Overlay" description="Show gesture detection badge" />
                            <Toggle checked={showParticipantNames} onChange={setShowParticipantNames} label="Participant Names" description="Display name labels in session" />
                            <Toggle checked={darkMode} onChange={setDarkMode} label="Dark Mode" description="Switch to dark interface (coming soon)" />
                            <Toggle checked={compactUI} onChange={setCompactUI} label="Compact Controls" description="Use smaller control buttons" />
                        </div>
                    </div>
                )}

                {activeTab === 'gestures' && (
                    <div className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
                                <Hand className="w-4 h-4 text-pink-500" />
                            </div>
                            <div>
                                <div className="text-gray-900 font-semibold text-sm">Hand Tracking</div>
                                <div className="text-gray-400 text-xs">AR gesture controls</div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 mb-6">
                            <Toggle checked={gesturesEnabled} onChange={setGesturesEnabled} label="Enable Gestures" description="Control 3D models with hand movements" />
                            <Toggle checked={handTracking} onChange={setHandTracking} label="Hand Landmark Tracking" description="Send hand data over network" />
                            <Toggle checked={gestureHaptics} onChange={setGestureHaptics} label="Haptic Feedback" description="Vibration on gesture recognition (mobile)" />
                            <SelectField
                                label="Confidence Level"
                                value={gestureConfidence}
                                options={['0.5', '0.6', '0.7', '0.8', '0.9']}
                                onChange={setGestureConfidence}
                            />
                        </div>

                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <h3 className="text-primary font-semibold text-sm mb-2">Gesture Guide</h3>
                            <div className="flex flex-col gap-2">
                                {[
                                    { gesture: '✊ Fist', action: 'Reset model position & scale' },
                                    { gesture: '☝️ Point', action: 'Move model to cursor' },
                                    { gesture: '🤏 Pinch Close', action: 'Zoom in on model' },
                                    { gesture: '🖐️ Open Left', action: 'Rotate model left' },
                                    { gesture: '🖐️ Open Right', action: 'Rotate model right' },
                                ].map(({ gesture, action }) => (
                                    <div key={gesture} className="flex items-center justify-between">
                                        <span className="text-gray-700 text-sm font-medium">{gesture}</span>
                                        <span className="text-gray-400 text-xs">{action}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
