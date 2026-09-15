/// <reference types="@capacitor/keyboard" />
import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.lifeos.app',
  appName: 'LifeOS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Native,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
