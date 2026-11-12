# Microclimate Command Center — Your Random Forest

This project streams simulated environmental inputs into your existing trained Random Forest and displays its estimated air temperature in Mission Control, Digital Twin, the zone table and 3D labels. It contains no replacement model, training script, automatic retraining or fabricated fallback predictions.

## 1. Install your model

Copy the file shown in your Melbourne project's models folder, keeping its exact name:

```text
random_forest_final.joblib
```

Destination inside this extracted project:

```text
backend/assets/models/random_forest_final.joblib
```

Use Finder to copy it, or from the project root run:

```bash
bash setup_model.sh "/full/path/to/melbourne_microclimate_local_project/models/random_forest_final.joblib"
```

The original model is approximately 1.57 GB. It is not included in this ZIP. Copy your own trusted file locally rather than uploading it through the webpage. Restart the backend after adding or replacing it. The app displays missing/loading/error states until the actual file is loaded and inference succeeds.

## 2. Run on your Mac

Stop earlier frontend/backend servers with Control+C. Extract this ZIP into a new folder.

Terminal 1, from the project root:

```bash
cd backend
python3.13 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --port 8000
```

Terminal 2, from the project root:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173 and hard-refresh with Command+Shift+R. Allow time and sufficient memory for the large model to load. Use one backend worker so it is loaded only once. The package retains the previous dependency pins; if your model was saved under another scikit-learn version, use the original training environment rather than retraining or replacing the model blindly.

## 3. What you should see

- Without your model: the digital twin and replay work; prediction stays unavailable with the exact installation path.
- With a compatible model: Your RF READY appears, and the selected zone displays Model-estimated temperature.
- A chart compares simulated temperature with your model's estimate at the same timestamp.
- Inspect inputs sent to your model shows the exact numerical feature values.
- The zone table and 3D labels display estimates from the same model output.
- Play, pause, step and reset control the shared simulation. Opening another browser does not accelerate replay.
- Research Analytics uses this same loaded model for its manual form.

## Input contract

The documented model inputs are:

| Feature | Stream mapping |
|---|---|
| relative_humidity | Simulated relative humidity (%) |
| avg_wind_speed | Simulated wind_speed_ms (m/s) |
| pressure_hpa | Simulated pressure (hPa) |
| pm25 | Simulated particulate concentration (µg/m³) |
| pm10 | Simulated particulate concentration (µg/m³) |
| noise | Simulated noise level (dB) |
| hour | Replay timestamp hour (0–23) |
| dayofweek | Replay weekday (Monday = 0) |
| month | Replay month (1–12) |
| latitude | Scenario zone latitude |
| longitude | Scenario zone longitude |

The included simulation CSV has been extended with reproducible pressure, PM2.5, PM10 and noise fields. These are synthetic scenario values, not Melbourne measurements. Existing humidity, wind and coordinates are also simulated. Current air_temp_c is used only for display/comparison and the existing rule-based hotspot index; it is not passed as a predictor to the documented model.

If the saved model exposes feature_names_in_, the adapter uses that exact order and rejects unknown names. For an array-trained model without names, the documented 11-feature order above is used only when its feature count is 11; confirm that order against your training script. The loader accepts a fitted RandomForestRegressor, a fitted sklearn Pipeline ending in one, or a dictionary containing either under model or pipeline. Other schemas produce a visible compatibility error rather than guessed mappings.

The filename alone cannot establish the target variable, units or future prediction horizon. This integration assumes the previously documented air-temperature-in-Celsius target. Confirm with the original training script before making research claims. It deliberately makes no 30-minute forecasting claim.

## Interpretation

Your model estimates temperature using contemporaneous inputs. It is not converted into a future forecasting model by streaming those inputs. The display compares the estimate against a default 35°C demonstration threshold; this is not a validated health limit or formal urban–rural UHI assessment. The existing current hotspot score remains a separate rule-based indicator.

The simulated district is geographically distinct from Melbourne. Successful inference demonstrates a working end-to-end connection, not field accuracy or model transferability. The difference between simulated temperature and model-estimated temperature is not a real-world validation metric. Research Analytics preserves previously reported Melbourne results, explicitly labelled as historical results rather than validation of an arbitrary uploaded file.

Change the runtime threshold by restarting with:

```bash
TEMPERATURE_THRESHOLD_C=36 python -m uvicorn app.main:app --port 8000
```

## Verification

```bash
cd backend
python -m unittest discover -s tests -v
```

The tests check missing-model behavior, invalid-model rejection, exact input mapping and order, batching, prediction propagation and replay reset. Test doubles are used only for plumbing tests; no test model is shipped or used by the running application. Production frontend build is checked. Your actual 1.57 GB model was not supplied, so its successful deserialization and numerical outputs must be verified on your Mac. Browser and physical phone AR checks remain to be performed there.

API: GET /api/prediction/model reports actual state and inference errors; GET /api/twin/snapshot and WebSocket /ws/twin return per-zone prediction objects or null. POST /api/research/predict uses the same model instance.

See DIGITAL_TWIN.md for the preserved 3D, model export and HTTPS/AR setup.

## Phone AR update

Read PHONE_AR.md before testing on your phone. The support message now appears above the 3D viewer. Android uses Phone AR → Start camera AR; supported Apple devices use Phone AR → Open iPhone / iPad AR. Export GLB has been removed from the toolbar. Backend and Random Forest wiring are unchanged.
