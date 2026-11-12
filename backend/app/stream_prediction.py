from __future__ import annotations

import os

import numpy as np
import pandas as pd

from .model_registry import registry


class StreamPredictionService:
    def __init__(self):
        self.threshold = float(os.getenv('TEMPERATURE_THRESHOLD_C', '35'))
        if not np.isfinite(self.threshold):
            raise ValueError('TEMPERATURE_THRESHOLD_C must be finite.')
        self.cache = {}
        self.history = {}
        self.error = None

    def reset(self):
        self.cache.clear()
        self.history.clear()

    def predict(self, timestamp, rows):
        if registry.model is None:
            return {}
        key = pd.Timestamp(timestamp)
        if key in self.cache:
            return self.cache[key]
        inputs = rows[['relative_humidity', 'wind_speed_ms', 'pressure_hpa', 'pm25',
                       'pm10', 'noise', 'latitude', 'longitude']].copy()
        inputs = inputs.rename(columns={'wind_speed_ms': 'avg_wind_speed'})
        inputs['hour'] = key.hour
        inputs['dayofweek'] = key.dayofweek
        inputs['month'] = key.month
        try:
            values = registry.predict_batch(inputs)
            self.error = None
        except RuntimeError as exc:
            self.error = str(exc)
            return {}
        outputs = {}
        for (_, row), value in zip(rows.iterrows(), values):
            zone = str(row.zone_id)
            history = self.history.setdefault(zone, [])
            history.append({'timestamp': key.isoformat(), 'observed_c': float(row.air_temp_c),
                            'estimated_c': round(float(value), 3)})
            del history[:-24]
            outputs[zone] = {'estimated_temperature_c': round(float(value), 3),
                             'timestamp': key.isoformat(), 'threshold_c': self.threshold,
                             'above_threshold': bool(value >= self.threshold),
                             'difference_c': round(float(value - row.air_temp_c), 3),
                             'model_filename': 'random_forest_final.joblib',
                             'inputs': {name: float(inputs.loc[row.name, name]) for name in registry.features},
                             'history': [dict(entry) for entry in history]}
        self.cache = {key: outputs}
        return outputs

    def info(self):
        return {**registry.stream_info(), 'inference_error': self.error,
                'threshold_c': self.threshold, 'stream_source': 'Synthetic inputs; not field validation'}
