import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface VideoSettings {
  cameraEnabled: boolean;
  hdVideo: boolean;
  resolution: string;
  mirrorVideo: boolean;
  lowLightMode: boolean;
}

export interface SettingsContextType {
  videoSettings: VideoSettings;
  updateVideoSettings: (settings: Partial<VideoSettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
    cameraEnabled: true,
    hdVideo: true,
    resolution: '1080p',
    mirrorVideo: false,
    lowLightMode: false,
  });

  const updateVideoSettings = (newSettings: Partial<VideoSettings>) => {
    setVideoSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ videoSettings, updateVideoSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};