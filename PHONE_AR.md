# Phone AR setup and checks

## What changed

- Phone AR now shows support and error messages above the canvas, immediately below the controls.
- Unsupported laptops/browsers receive a device-support message.
- Android: the support check and Start camera AR are separate taps so the session request retains direct user activation.
- iPhone/iPad: Quick Look support is checked and the bundled USDZ is verified before showing its launch link. The development server sends its proper content type.
- Access-denied and missing surface-tracking errors have actionable messages.
- The district stays hidden until a surface is found and tapped. Exit restores the normal view.
- Export GLB is removed from the toolbar. The scene assets remain for AR and offline editing.

## Model installation remains exactly the same

Copy your existing random_forest_final.joblib into backend/assets/models/. No other model is provided or trained. Follow README.md for normal startup. All backend source and simulation bytes are unchanged from the user-model version.

## iPhone / iPad

Open the app in Safari, directly rather than in a messaging app's embedded browser. Tap Phone AR, then Open iPhone / iPad AR. Quick Look displays the static district. It does not include live model predictions or moving actors; those remain in the web 3D view. A model may first open in object mode: select AR within Quick Look if offered, then scan the surface.

For consistent device access use the trusted HTTPS setup below. If Quick Look reports unavailable, the app will show a message instead of pretending AR started.

## Android

Use a phone and browser that support WebXR immersive AR and surface tracking. Open the trusted HTTPS address in Chrome. Tap Phone AR, then Start camera AR. Allow access, scan a well-lit floor or table, and tap when the green ring appears. Movement and connected telemetry continue in WebXR. If no overlay controls are supported, use the browser/system AR exit control.

An http://192.168.x.x:5173 address cannot provide a secure WebXR session. Switching to https:// without configuring certificates does not enable HTTPS. Browser permission and hardware support are also required; code cannot add AR hardware support to an unsupported device.

## Local HTTPS from your Mac

Keep the Mac and phone on the same Wi-Fi. Use your current Mac Wi-Fi IP from System Settings → Wi-Fi → Details → TCP/IP. The earlier 192.168.31.114 address is only an example and may have changed.

1. Install mkcert if it is not installed (requires an existing Homebrew installation):

```bash
brew install mkcert
```

2. From the extracted project root, create a certificate for your current Mac IP:

```bash
bash setup_phone_ar.sh 192.168.31.114
```

The script may request permission to install your development certificate authority into the Mac trust store. Certificates are generated locally and are not included in the ZIP.

3. Find the public root certificate folder:

```bash
open "$(mkcert -CAROOT)"
```

Transfer **only rootCA.pem** to your own phone. Do not transfer rootCA-key.pem or phone-key.pem.

- iPhone/iPad: open rootCA.pem, install its downloaded profile in Settings, then enable full trust for that certificate under Settings → General → About → Certificate Trust Settings.
- Android: install rootCA.pem as a CA certificate using the device's security/credential settings (menu names vary). Some managed phones disallow user CAs; use a deployment with a publicly trusted HTTPS certificate in that case.

Only trust the certificate generated on your own Mac for this test. Remove the development CA from your phone when it is no longer needed.

4. Start the backend normally on 127.0.0.1:8000. Stop the old frontend, then from the project root:

```bash
cd frontend
npm ci
PHONE_AR_HTTPS=1 npm run dev
```

5. On the phone open the HTTPS address for the IP you used:

```text
https://192.168.31.114:5173
```

Confirm the browser shows no certificate error. Do not merely bypass a certificate warning. The frontend proxies the backend API and WebSocket on the same HTTPS origin; no backend/model path change is needed. If the Mac IP changes, regenerate the certificate with setup_phone_ar.sh using the new address.

If the page itself cannot load, check Wi-Fi client isolation and the Mac firewall's permission for Node. Phone localhost points to the phone, not your Mac.

For hosted HTTPS instead, use deploy/Caddyfile with your own domain and the production build; it already proxies the API and WebSocket and sets the USDZ type. Keep the demo private or add authentication before exposing it publicly.

## Verification status

The production frontend build and 10 automated AR routing/error checks pass. Backend files are byte-for-byte unchanged. The test covers unsupported desktops, HTTP Android, supported/unsupported Apple browsers, iPad desktop identification, supported/unsupported WebXR, rejected checks and denied permissions. Physical phone tracking, Quick Look launch and camera permission prompts still require testing on your devices; no physical-device success is claimed.

Commands from frontend:

```bash
npm run test:ar
npm run build
```

## References

- https://developer.mozilla.org/en-US/docs/Web/API/XRSystem/requestSession
- https://webkit.org/blog/8421/viewing-augmented-reality-assets-in-safari-for-ios/
- https://github.com/FiloSottile/mkcert
