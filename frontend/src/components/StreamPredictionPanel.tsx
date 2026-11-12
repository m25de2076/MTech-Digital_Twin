import type { PredictionInfo, TwinZoneReading } from '../types';

const timeLabel = (value: string) => new Date(value).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

export function StreamPredictionPanel({zone, info}: {zone: TwinZoneReading | null; info: PredictionInfo | null}) {
  const prediction = zone?.prediction;
  if (!prediction) return <div className="panel prediction-panel"><span className="eyebrow">Your Random Forest · streamed inference</span><h3>{info?.state === 'loading' ? 'Loading your model…' : info?.loaded ? 'Waiting for model output' : 'Add your trained model'}</h3><p>{info?.inference_error || info?.error || 'Waiting for backend model status.'}</p><p>Copy <strong>random_forest_final.joblib</strong> into <strong>backend/assets/models/</strong>, then restart the backend. No replacement model is used.</p></div>;
  const history = prediction.history;
  const values = history.flatMap(p => [p.observed_c, p.estimated_c]).concat(prediction.threshold_c);
  const low = Math.floor(Math.min(...values) - 1), high = Math.ceil(Math.max(...values) + 1);
  const x = (i: number) => 48 + i / Math.max(1, history.length - 1) * 460;
  const y = (v: number) => 154 - (v - low) / (high - low) * 130;
  return <div className="panel prediction-panel">
    <div className="panel-header"><div><span className="eyebrow">Your Random Forest · temperature estimation</span><h3>{zone?.zone_name}</h3></div><span className={`status-pill ${prediction.above_threshold ? 'hotspot' : 'stable'}`}>{prediction.above_threshold ? 'Above threshold' : 'Below threshold'}</span></div>
    <div className="prediction-values"><div><span>Simulated temperature</span><strong>{zone?.air_temp_c.toFixed(1)}°C</strong><small>{timeLabel(prediction.timestamp)}</small></div><div><span>Model-estimated temperature</span><strong>{prediction.estimated_temperature_c.toFixed(1)}°C</strong><small>Same timestamp · difference {prediction.difference_c >= 0 ? '+' : ''}{prediction.difference_c.toFixed(1)}°C</small></div></div>
    <p className="prediction-message">Output from {prediction.model_filename}. This is a temperature estimate, not a 30-minute forecast.</p>
    <svg viewBox="0 0 540 190" className="prediction-chart" role="img" aria-label="Simulated temperature and your model's estimated temperature at matching timestamps">
      {[low, (low + high) / 2, high].map(v => <g key={v}><line x1="48" x2="508" y1={y(v)} y2={y(v)} stroke="#36505c"/><text x="40" y={y(v)+4} textAnchor="end">{v.toFixed(1)}°</text></g>)}
      <line x1="48" x2="508" y1={y(prediction.threshold_c)} y2={y(prediction.threshold_c)} stroke="#fbbf63" strokeDasharray="5 5"/>
      <polyline points={history.map((p,i) => `${x(i)},${y(p.observed_c)}`).join(' ')} fill="none" stroke="#6ddbc2" strokeWidth="3"/>
      <polyline points={history.map((p,i) => `${x(i)},${y(p.estimated_c)}`).join(' ')} fill="none" stroke="#91b9ff" strokeWidth="3"/>
      {history.map((p,i) => <circle key={p.timestamp} cx={x(i)} cy={y(p.estimated_c)} r="3" fill="#91b9ff"/>)}
      <text x="48" y="178">{timeLabel(history[0].timestamp)}</text><text x="508" y="178" textAnchor="end">{timeLabel(prediction.timestamp)}</text>
    </svg>
    <div className="prediction-legend"><span>Simulated temperature</span><span>Your model estimate</span><span>Threshold {prediction.threshold_c}°C</span></div>
    <details className="prediction-details"><summary>Inspect inputs sent to your model</summary><dl className="definition-list">{Object.entries(prediction.inputs).map(([name,value]) => <div key={name}><dt>{name}</dt><dd>{value.toFixed(3)}</dd></div>)}</dl><p>All environmental inputs and coordinates are simulated scenario data. Pressure, particulate levels and noise were added for the documented input schema. This demonstrates integration, not accuracy at these locations. The threshold is a demonstration setting, not a validated heat-risk limit. The difference from simulated temperature is not a real-world validation error.</p></details>
  </div>;
}
