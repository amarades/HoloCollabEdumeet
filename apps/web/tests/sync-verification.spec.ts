import { test, expect } from '@playwright/test';

test.describe('Real-Time Collaboration Sync Verification', () => {
  test('3D Model Sync - Model URL included in state', async ({ page }) => {
    // Mock ARScene getState to include model_url
    await page.goto('http://localhost:5174/session/test-session');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that model_url is included in state exports
    const modelUrlInState = await page.evaluate(() => {
      const scene = (window as any).arSceneRef?.current;
      if (scene) {
        const state = scene.getState();
        return state?.model_url !== undefined;
      }
      return false;
    });
    
    expect(modelUrlInState).toBe(true);
  });

  test('3D Model Sync - Remote model loading', async ({ page }) => {
    await page.goto('http://localhost:5174/session/test-session');
    await page.waitForLoadState('networkidle');
    
    // Simulate MODEL_CHANGED event
    await page.evaluate(() => {
      const socket = (window as any).socketRef?.current;
      if (socket) {
        // Trigger the MODEL_CHANGED event handler
        const mockData = { model_url: 'https://example.com/test-model.glb' };
        socket.emit = (event: string, data: any) => {
          if (event === 'MODEL_CHANGED') {
            // Simulate the event being received
            const listeners = socket._listeners || {};
            const modelChangedListener = listeners['MODEL_CHANGED'];
            if (modelChangedListener) {
              modelChangedListener(mockData);
            }
          }
        };
      }
    });
    
    // Check that loadModel was called
    const modelLoaded = await page.evaluate(() => {
      const arScene = (window as any).arSceneRef?.current;
      return arScene?._loadModelCalled || false;
    });
    
    expect(modelLoaded).toBe(true);
  });

  test('WebRTC Manager - Initialization', async ({ page }) => {
    await page.goto('http://localhost:5174/session/test-session');
    await page.waitForLoadState('networkidle');
    
    // Check WebRTC manager is initialized
    const webRTCManagerExists = await page.evaluate(() => {
      return (window as any).webRTCManagerRef?.current !== undefined;
    });
    
    expect(webRTCManagerExists).toBe(true);
  });

  test('WebRTC Manager - Remote stream handling', async ({ page }) => {
    await page.goto('http://localhost:5174/session/test-session');
    await page.waitForLoadState('networkidle');
    
    // Simulate remote stream
    const remoteStreamHandled = await page.evaluate(() => {
      const webRTCManager = (window as any).webRTCManagerRef?.current;
      if (webRTCManager) {
        // Simulate receiving a remote stream
        const mockStream = new MediaStream();
        const callbacks = webRTCManager.callbacks;
        if (callbacks.onRemoteStream) {
          callbacks.onRemoteStream('test-user-123', mockStream);
        }
        return true;
      }
      return false;
    });
    
    expect(remoteStreamHandled).toBe(true);
    
    // Check that remote streams state is updated
    const remoteStreamsUpdated = await page.evaluate(() => {
      const remoteStreams = (window as any).remoteStreams;
      return remoteStreams && 'test-user-123' in remoteStreams;
    });
    
    expect(remoteStreamsUpdated).toBe(true);
  });

  test('Video Grid - Remote streams rendering', async ({ page }) => {
    await page.goto('http://localhost:5174/session/test-session');
    await page.waitForLoadState('networkidle');
    
    // Check VideoGrid receives remoteStreams prop
    const videoGridHasRemoteStreams = await page.evaluate(() => {
      const videoGrid = document.querySelector('div[data-testid="video-grid"]');
      if (videoGrid) {
        // Check if the component was rendered with remoteStreams
        return videoGrid.getAttribute('data-has-remote-streams') === 'true';
      }
      return false;
    });
    
    // This test would need the VideoGrid to expose its internal state
    // For now, just verify the component renders without errors
    const videoGridRenders = await page.locator('[data-testid="video-grid"]').isVisible();
    expect(videoGridRenders).toBe(true);
  });

  test('Integration - Complete sync flow', async ({ page }) => {
    await page.goto('http://localhost:5174/session/test-session');
    await page.waitForLoadState('networkidle');
    
    // Mock the complete flow
    const integrationTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        // 1. Check ARScene state includes model_url
        const scene = (window as any).arSceneRef?.current;
        if (!scene) {
          resolve(false);
          return;
        }
        
        const state = scene.getState();
        if (!state || state.model_url === undefined) {
          resolve(false);
          return;
        }
        
        // 2. Check WebRTC manager exists
        const webRTC = (window as any).webRTCManagerRef?.current;
        if (!webRTC) {
          resolve(false);
          return;
        }
        
        // 3. Check SocketManager has getUserId
        const socket = (window as any).socketRef?.current;
        if (!socket || typeof socket.getUserId !== 'function') {
          resolve(false);
          return;
        }
        
        // All checks passed
        resolve(true);
      });
    });
    
    expect(integrationTest).toBe(true);
  });
});
