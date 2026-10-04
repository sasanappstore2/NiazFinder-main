import type { CapacitorConfig } from '@capacitor/cli';

/**
 * NiazFinder native wrapper.
 *
 * The app loads the LIVE site (server.url) inside the WebView — there is no
 * static export. For device testing on the LAN keep the mkcert HTTPS proxy
 * running (`caddy start --config ~/.niazfinder-https/Caddyfile`) and make sure
 * the mkcert root CA profile is trusted on the device.
 *
 * For production, point `server.url` at the deployed https origin.
 */
const DEV_SERVER_URL = process.env.NIAZ_APP_URL ?? 'https://192.168.254.3:8443';

const config: CapacitorConfig = {
  appId: 'com.niazfinder.app',
  appName: 'نیاز فایندر',
  webDir: 'www',
  server: {
    url: DEV_SERVER_URL,
    allowNavigation: ['192.168.254.3', 'niazfinder.com', '*.niazfinder.com'],
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#059669',
  },
};

export default config;
