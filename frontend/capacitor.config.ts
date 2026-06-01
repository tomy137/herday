import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.herdays',
  appName: 'HerDay',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    backgroundColor: '#ffffff',
  },
};

export default config;
