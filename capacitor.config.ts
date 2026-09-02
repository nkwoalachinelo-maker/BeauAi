import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beauai.app',
  appName: 'Beau AI',
  webDir: 'dist',
  server: {
    url: 'https://beau-ai.vercel.app',
    cleartext: false
  }
};

export default config;
