from __future__ import annotations

from pathlib import Path
from threading import RLock
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.utils.validation import check_is_fitted

from .models import ModelInfo, ResearchPredictionInput, ResearchPredictionOutput

MODEL_PATH = Path(__file__).resolve().parents[1] / 'assets/models/random_forest_final.joblib'
FEATURES = ['relative_humidity', 'avg_wind_speed', 'pressure_hpa', 'pm25', 'pm10',
            'noise', 'hour', 'dayofweek', 'month', 'latitude', 'longitude']
REPORTED_METRICS = {'mae_c': 2.214, 'rmse_c': 2.820, 'r2': 0.714}


class ModelRegistry:
    def __init__(self):
        self.model: Any | None = None
        self.load_error: str | None = None
        self.state = 'missing'
        self.features = list(FEATURES)
        self._lock = RLock()

    def load(self):
        with self._lock:
            if self.model is not None:
                return
            if not MODEL_PATH.exists():
                self.state = 'missing'
                self.load_error = 'Copy random_forest_final.joblib into backend/assets/models/ and restart the backend.'
                return
            self.state = 'loading'
            try:
                candidate = joblib.load(MODEL_PATH)
                if isinstance(candidate, dict):
                    candidate = candidate.get('pipeline', candidate.get('model'))
                estimator = candidate.steps[-1][1] if isinstance(candidate, Pipeline) else candidate
                if not isinstance(estimator, RandomForestRegressor):
                    raise ValueError('Expected a fitted RandomForestRegressor or a pipeline ending in one.')
                check_is_fitted(estimator)
                names = getattr(candidate, 'feature_names_in_', None)
                if names is not None:
                    self.features = [str(name) for name in names]
                    unsupported = set(self.features) - set(FEATURES)
                    if unsupported:
                        raise ValueError(f'Unsupported model inputs: {sorted(unsupported)}. Supply the training script to map them correctly.')
                elif getattr(candidate, 'n_features_in_', None) != len(FEATURES):
                    raise ValueError('Model has no compatible feature schema. Expected the documented 11 features.')
                self.model = candidate
                self.load_error = None
                self.state = 'ready'
            except Exception as exc:
                self.model = None
                self.state = 'error'
                self.load_error = f'Model could not be loaded: {exc}'

    def predict_batch(self, rows: pd.DataFrame):
        with self._lock:
            if self.model is None:
                raise RuntimeError(self.load_error or 'Model is loading; no prediction is available yet.')
            try:
                inputs = rows.loc[:, self.features].astype(float)
                if not np.isfinite(inputs.to_numpy()).all():
                    raise ValueError('Model inputs must be finite. Check the simulation CSV.')
                supplied = inputs if hasattr(self.model, 'feature_names_in_') else inputs.to_numpy()
                result = np.asarray(self.model.predict(supplied), dtype=float)
                if result.shape != (len(inputs),) or not np.isfinite(result).all():
                    raise ValueError('Model must return one finite temperature value per input row.')
                return result
            except Exception as exc:
                raise RuntimeError(f'Prediction failed: {exc}') from exc

    def predict(self, payload: ResearchPredictionInput):
        value = float(self.predict_batch(pd.DataFrame([payload.model_dump()]))[0])
        return ResearchPredictionOutput(predicted_temperature_c=round(value, 3),
                                       model_name='User Random Forest', model_loaded=True)

    def stream_info(self):
        return {'loaded': self.model is not None, 'state': self.state, 'error': self.load_error,
                'filename': MODEL_PATH.name, 'features': self.features,
                'output': 'Estimated air temperature (°C)', 'horizon_minutes': None}

    def info(self):
        return ModelInfo(name='User Random Forest Temperature Model', model_type='User-supplied Random Forest',
                         model_loaded=self.model is not None, feature_names=self.features,
                         hyperparameters={}, feature_importance=[], reported_metrics=REPORTED_METRICS,
                         validation_note='Metrics are previously reported Melbourne research results, not validation of this simulation or the newly supplied file. The dashboard uses only your supplied model. Its target must be confirmed from your training script; no future horizon is assumed.')


registry = ModelRegistry()
