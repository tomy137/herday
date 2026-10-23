import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.herdays',
  appName: 'HerDay',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0E1530',
  },
};

export default config;
