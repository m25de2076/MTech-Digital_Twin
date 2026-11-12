import asyncio
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

from app.model_registry import FEATURES, ModelRegistry, registry
from app.replay import TwinReplayEngine


class RecordingPredictor:
    feature_names_in_ = np.array(list(reversed(FEATURES)))

    def __init__(self):
        self.calls = []

    def predict(self, data):
        self.calls.append(data.copy())
        return np.arange(len(data), dtype=float) + 30


class StreamTests(unittest.TestCase):
    def setUp(self):
        self.old = registry.model, registry.features, registry.state
        self.model = RecordingPredictor()
        registry.model = self.model
        registry.features = list(self.model.feature_names_in_)
        registry.state = 'ready'
        self.engine = TwinReplayEngine()

    def tearDown(self):
        registry.model, registry.features, registry.state = self.old

    def test_batch_mapping_and_output(self):
        frame = asyncio.run(self.engine.snapshot())
        self.assertEqual(len(self.model.calls), 1)
        inputs = self.model.calls[0]
        self.assertEqual(list(inputs.columns), list(self.model.feature_names_in_))
        self.assertNotIn('air_temp_c', inputs)
        self.assertEqual(len(inputs), 8)
        row = self.engine._current_rows().iloc[0]
        self.assertEqual(inputs.iloc[0].avg_wind_speed, row.wind_speed_ms)
        self.assertEqual(inputs.iloc[0].hour, row.timestamp.hour)
        self.assertEqual(inputs.iloc[0].pm25, row.pm25)
        for i, reading in enumerate(frame.readings):
            self.assertEqual(reading.prediction['estimated_temperature_c'], 30+i)
            self.assertEqual(reading.prediction['above_threshold'], i >= 5)
            self.assertEqual(reading.prediction['model_filename'], 'random_forest_final.joblib')

    def test_missing_model_does_not_substitute(self):
        registry.model = None
        frame = asyncio.run(self.engine.snapshot())
        self.assertTrue(all(r.prediction is None for r in frame.readings))
        self.assertEqual(self.model.calls, [])

    def test_pause_snapshot_cache_and_reset(self):
        async def run():
            await self.engine.control('pause')
            first = await self.engine.snapshot()
            second = await self.engine.snapshot()
            self.assertEqual(first, second)
            self.assertEqual(len(self.model.calls), 1)
            await self.engine.control('step')
            frame = await self.engine.snapshot()
            self.assertEqual(len(frame.readings[0].prediction['history']), 2)
            await self.engine.control('reset')
            frame = await self.engine.snapshot()
            self.assertEqual(len(frame.readings[0].prediction['history']), 1)
        asyncio.run(run())

    def test_prediction_error_stays_visible(self):
        with patch.object(self.model, 'predict', side_effect=ValueError('incompatible features')):
            frame = asyncio.run(self.engine.snapshot())
        self.assertTrue(all(r.prediction is None for r in frame.readings))
        self.assertIn('incompatible features', self.engine.predictor.info()['inference_error'])

    def test_loader_missing_file(self):
        instance = ModelRegistry()
        with patch('app.model_registry.MODEL_PATH') as path:
            path.exists.return_value = False
            instance.load()
        self.assertIsNone(instance.model)
        self.assertEqual(instance.state, 'missing')

    def test_loader_rejects_non_random_forest(self):
        instance = ModelRegistry()
        with patch('app.model_registry.MODEL_PATH') as path, patch('app.model_registry.joblib.load', return_value={'model': object()}):
            path.exists.return_value = True
            instance.load()
        self.assertIsNone(instance.model)
        self.assertEqual(instance.state, 'error')


if __name__ == '__main__':
    unittest.main()
