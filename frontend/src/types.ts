export type ViewKey = 'overview' | 'research' | 'twin';

export interface StreamPrediction {
  estimated_temperature_c: number;
  timestamp: string;
  threshold_c: number;
  above_threshold: boolean;
  difference_c: number;
  model_filename: string;
  inputs: Record<string, number>;
  history: Array<{timestamp: string; observed_c: number; estimated_c: number}>;
}

export interface PredictionInfo {
  loaded: boolean;
  state: string;
  error?: string | null;
  inference_error?: string | null;
  filename: string;
  features: string[];
}

export interface TwinZoneReading {
  prediction: StreamPrediction | null;
  timestamp: string;
  zone_id: string;
  zone_name: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  built_density: number;
  vegetation_index: number;
  air_temp_c: number;
  relative_humidity: number;
  solar_radiation_wm2: number;
  wind_speed_ms: number;
  hotspot_index: number;
  status: 'stable' | 'watch' | 'hotspot' | 'critical';
}

export interface ReplayState {
  playing: boolean;
  speed: number;
  frame_index: number;
  frame_count: number;
  current_timestamp: string;
}

export interface TwinFrame {
  readings: TwinZoneReading[];
  replay: ReplayState;
  average_temperature_c: number;
  average_humidity_pct: number;
  hotspot_zone_id: string;
  hotspot_zone_name: string;
  events: string[];
}

export interface TwinSummary {
  records: number;
  zones: number;
  timestamps: number;
  start: string;
  end: string;
  interval_minutes: number;
  zone_names: string[];
}

export interface ModelInfo {
  name: string;
  model_type: string;
  model_loaded: boolean;
  feature_names: string[];
  hyperparameters: Record<string, string | number | boolean | null>;
  feature_importance: Array<{ feature: string; importance: number }>;
  reported_metrics: { mae_c: number; rmse_c: number; r2: number };
  validation_note: string;
}

export interface ResearchPredictionInput {
  relative_humidity: number;
  avg_wind_speed: number;
  pressure_hpa: number;
  pm25: number;
  pm10: number;
  noise: number;
  hour: number;
  dayofweek: number;
  month: number;
  latitude: number;
  longitude: number;
}

export interface ResearchPredictionOutput {
  predicted_temperature_c: number;
  model_name: string;
  model_loaded: boolean;
}

export interface MelbourneSummary {
  dashboard_observations: number;
  selected_locations: number;
  mean_air_temperature_c: number;
  mean_relative_humidity_pct: number;
  high_temperature_events: number;
  prediction_train_rows: number;
  prediction_test_rows: number;
  random_forest_metrics: { mae_c: number; rmse_c: number; r2: number };
  note: string;
}
