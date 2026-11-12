export interface AREnvironment {
  userAgent: string;
  platform: string;
  touchPoints: number;
  secure: boolean;
  quickLookSupported: boolean;
  xrSupported?: () => Promise<boolean>;
}
export type ARSupport = { mode: 'quick-look' | 'webxr' | 'unavailable'; message: string };
export async function checkARSupport(env: AREnvironment): Promise<ARSupport> {
  const appleMobile = /iPhone|iPad|iPod/.test(env.userAgent) || (env.platform === 'MacIntel' && env.touchPoints > 1);
  const mobile = appleMobile || /Android/.test(env.userAgent);
  if (appleMobile) {
    return env.quickLookSupported
      ? {mode: 'quick-look', message: 'Tap Open iPhone / iPad AR to place a static model. Live readings and movement remain in the web view.'}
      : {mode: 'unavailable', message: 'This browser does not support Apple AR Quick Look. Open this page directly in Safari on your iPhone or iPad, outside any in-app browser.'};
  }
  if (!env.secure) return {mode: 'unavailable', message: mobile
    ? 'AR cannot start over HTTP. Open the trusted HTTPS address described in PHONE_AR.md. An http://192.168… address is not sufficient.'
    : 'This device/browser cannot start phone AR here. Use a supported phone with the trusted HTTPS address. The normal 3D view works on this laptop.'};
  if (!env.xrSupported) return {mode: 'unavailable', message: 'This device/browser does not support immersive AR. Use an AR-capable Android phone with Chrome, or an iPhone/iPad with Safari. The normal 3D view remains available.'};
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const supported = await Promise.race([env.xrSupported(), new Promise<boolean>((_, reject) => { timeout = setTimeout(() => reject(new Error('Support check timed out')), 5000); })]);
    return supported ? {mode: 'webxr', message: 'AR is available. Tap Start camera AR, allow access, then scan a well-lit floor or table.'}
      : {mode: 'unavailable', message: 'This device/browser does not support immersive AR. Use an AR-capable Android phone with Chrome, or an iPhone/iPad with Safari.'};
  } catch {
    return {mode: 'unavailable', message: 'AR availability could not be checked. Open the page directly in a supported browser, verify HTTPS and browser permissions, then try again.'};
  } finally { clearTimeout(timeout); }
}
export function arErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'AR access was denied or blocked. Allow camera/AR access in browser settings and open this page directly over trusted HTTPS.';
  if (name === 'NotSupportedError') return 'This device/browser cannot provide the AR surface tracking required to place the model.';
  if (name === 'InvalidStateError') return 'Another AR session may be active. Close it and tap Start camera AR again.';
  return `Unable to start AR. ${error instanceof Error ? error.message : 'Please retry in a supported browser.'}`;
}
