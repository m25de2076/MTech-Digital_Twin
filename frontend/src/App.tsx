import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Building2, Database, Trees } from 'lucide-react';
import { KpiCard } from './components/KpiCard';
import { ModelPanel } from './components/ModelPanel';
import { PredictionWorkbench } from './components/PredictionWorkbench';
import { StreamPredictionPanel } from './components/StreamPredictionPanel';
import { ReplayControls } from './components/ReplayControls';
import { ResearchSummary } from './components/ResearchSummary';
import { TwinScene } from './components/TwinScene';
import { ZoneTable } from './components/ZoneTable';
import { api, STREAM_URL } from './lib/api';
import type {
  MelbourneSummary,
  ModelInfo,
  PredictionInfo,
  ResearchPredictionInput,
  ResearchPredictionOutput,
  TwinFrame,
  TwinSummary,
  TwinZoneReading,
  ViewKey,
} from './types';

const navigation: Array<{ key: ViewKey; label: string; icon: JSX.Element }> = [
  { key: 'overview', label: 'Mission Control', icon: <Activity size={18} /> },
  { key: 'research', label: 'Research Analytics', icon: <BarChart3 size={18} /> },
  { key: 'twin', label: 'Digital Twin', icon: <Building2 size={18} /> },
];

function App() {
  const [activeView, setActiveView] = useState<ViewKey>('overview');
  const [frame, setFrame] = useState<TwinFrame | null>(null);
  const [twinSummary, setTwinSummary] = useState<TwinSummary | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [melbourne, setMelbourne] = useState<MelbourneSummary | null>(null);
  const [predictionInfo, setPredictionInfo] = useState<PredictionInfo | null>(null);
  const [prediction, setPrediction] = useState<ResearchPredictionOutput | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>('Z06');
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getTwinSummary().then(setTwinSummary),
      api.getModelInfo().then(setModel),
      api.getMelbourneSummary().then(setMelbourne),
      api.getPredictionInfo().then(setPredictionInfo),
    ]).catch((reason: Error) => setError(reason.message));

    const modelTimer = setInterval(() => {
      api.getPredictionInfo().then(setPredictionInfo).catch(() => {});
      api.getModelInfo().then(setModel).catch(() => {});
    }, 3000);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let socket: WebSocket;
    function connect() {
      socket = new WebSocket(STREAM_URL);
      socket.onopen = () => setConnection('online');
      socket.onclose = () => {
        if (stopped) return;
        setConnection('offline');
        timer = setTimeout(connect, 2000);
      };
      socket.onerror = () => setConnection('offline');
      socket.onmessage = (message) => setFrame(JSON.parse(message.data) as TwinFrame);
    }
    connect();
    return () => { stopped = true; clearInterval(modelTimer); clearTimeout(timer); socket.close(); };
  }, []);

  const zones = frame?.readings ?? [];
  const selectedZone: TwinZoneReading | null = useMemo(() => {
    if (!zones.length) return null;
    return zones.find((item) => item.zone_id === selectedZoneId) ?? zones[0];
  }, [zones, selectedZoneId]);

  async function runPrediction(payload: ResearchPredictionInput) {
    try {
      setPrediction(await api.predict(payload));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  async function controlReplay(payload: { action?: 'play' | 'pause' | 'reset' | 'step'; speed?: number }) {
    try {
      await api.controlReplay(payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  const hotspotCount = zones.filter((item) => item.status === 'hotspot' || item.status === 'critical').length;
  const criticalCount = zones.filter((item) => item.status === 'critical').length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">UM</div>
          <div>
            <strong>Urban Microclimate</strong>
            <span>Command Center</span>
          </div>
        </div>

        <nav className="nav-stack">
          {navigation.map((item) => (
            <button key={item.key} className={`nav-item ${activeView === item.key ? 'active' : ''}`} onClick={() => setActiveView(item.key)}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-badge"><Database size={16} /> Melbourne model</div>
          <div className="sidebar-badge"><Activity size={16} /> Your Random Forest model</div>
          <div className="sidebar-badge"><Trees size={16} /> Micro-zone simulation</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Multi-scale environmental intelligence</span>
            <h1>Urban Heat Hotspot Monitoring Platform</h1>
          </div>
          <div className="runtime-cluster">
            <span className={`runtime-pill ${connection}`}><i />{connection === 'online' ? 'LIVE REPLAY' : connection.toUpperCase()}</span>
            <span className={`model-pill ${predictionInfo?.loaded ? 'ready' : 'not-ready'}`}>Your RF {predictionInfo?.loaded ? 'READY' : 'UNAVAILABLE'}</span>
          </div>
        </header>

        {error && <div className="error-banner" onClick={() => setError(null)}>{error}</div>}

        <section className="kpi-grid">
          <KpiCard label="Simulation records" value={(twinSummary?.records ?? 46080).toLocaleString()} detail={`${twinSummary?.zones ?? 8} micro-zones · 15 min interval`} />
          <KpiCard label="Current mean temp" value={`${(frame?.average_temperature_c ?? 0).toFixed(1)}°C`} detail={frame?.replay.current_timestamp ? new Date(frame.replay.current_timestamp).toLocaleString() : 'Replay initializing'} />
          <KpiCard label="Active hotspots" value={String(hotspotCount)} detail={`${criticalCount} critical zones`} />
          <KpiCard label="Model estimates above threshold" value={String(zones.filter(z => z.prediction?.above_threshold).length)} detail="Estimated temperature ≥ configured threshold" />
        </section>

        {activeView === 'overview' && (
          <section className="content-grid">
            <div className="wide-col">
              <TwinScene zones={zones} selectedZoneId={selectedZoneId} onSelect={setSelectedZoneId} />
              <div className="panel control-panel">
                <div className="panel-header">
                  <div><span className="eyebrow">Historical simulation replay</span><h3>Playback control</h3></div>
                  <span className="timestamp-readout">{frame?.replay.current_timestamp ? new Date(frame.replay.current_timestamp).toLocaleString() : '—'}</span>
                </div>
                <ReplayControls replay={frame?.replay ?? null} onControl={controlReplay} />
                {frame?.replay && <div className="progress-bar"><i style={{ width: `${(frame.replay.frame_index / Math.max(1, frame.replay.frame_count - 1)) * 100}%` }} /></div>}
              </div>
            </div>
            <div className="stack-col">
              <StreamPredictionPanel zone={selectedZone} info={predictionInfo} />
              <div className="panel selected-panel">
                <div className="panel-header">
                  <div><span className="eyebrow">Selected micro-zone</span><h3>{selectedZone?.zone_name ?? 'Loading'}</h3></div>
                  {selectedZone && <span className={`status-pill ${selectedZone.status}`}>{selectedZone.status}</span>}
                </div>
                {selectedZone && (
                  <>
                    <div className="selected-grid">
                      <div><span>Temperature</span><strong>{selectedZone.air_temp_c.toFixed(1)}°C</strong></div>
                      <div><span>Humidity</span><strong>{selectedZone.relative_humidity.toFixed(0)}%</strong></div>
                      <div><span>Solar radiation</span><strong>{selectedZone.solar_radiation_wm2.toFixed(0)} W/m²</strong></div>
                      <div><span>Wind speed</span><strong>{selectedZone.wind_speed_ms.toFixed(1)} m/s</strong></div>
                      <div><span>Built density</span><strong>{selectedZone.built_density.toFixed(2)}</strong></div>
                      <div><span>Vegetation index</span><strong>{selectedZone.vegetation_index.toFixed(2)}</strong></div>
                    </div>
                    <div className="hotspot-score">
                      <span>Hotspot index</span><strong>{selectedZone.hotspot_index.toFixed(1)}</strong>
                      <div><i style={{ width: `${selectedZone.hotspot_index}%` }} /></div>
                    </div>
                    <div className="context-note">
                      <strong>Micro-zone interpretation</strong>
                      <p>{selectedZone.built_density >= 0.8 ? 'High built density increases retained heat potential. ' : ''}{selectedZone.vegetation_index <= 0.15 ? 'Low vegetation limits local shading and evaporative cooling. ' : ''}{selectedZone.solar_radiation_wm2 >= 600 ? 'High solar exposure is currently increasing thermal load.' : 'Current solar exposure is limited.'}</p>
                    </div>
                  </>
                )}
              </div>
              <div className="panel operational-panel">
                <span className="eyebrow">Current system state</span>
                <dl className="definition-list">
                  <div><dt>Replay</dt><dd>{frame?.replay.playing ? 'Running' : 'Paused'}</dd></div>
                  <div><dt>Speed</dt><dd>{frame?.replay.speed ?? 10}×</dd></div>
                  <div><dt>Hotspot</dt><dd>{frame?.hotspot_zone_name ?? '—'}</dd></div>
                  <div><dt>Prediction model</dt><dd>{predictionInfo?.loaded ? 'Loaded' : 'Unavailable'}</dd></div>
                </dl>
              </div>
            </div>
            <ZoneTable zones={zones} selectedZoneId={selectedZoneId} onSelect={setSelectedZoneId} />
          </section>
        )}

        {activeView === 'research' && (
          <section className="stack-section">
            <StreamPredictionPanel zone={selectedZone} info={predictionInfo} />
            <ResearchSummary summary={melbourne} />
            <ModelPanel model={model} />
            <PredictionWorkbench prediction={prediction} onPredict={runPrediction} />
          </section>
        )}

        {activeView === 'twin' && (
          <section className="stack-section">
            <StreamPredictionPanel zone={selectedZone} info={predictionInfo} />
            <TwinScene zones={zones} selectedZoneId={selectedZoneId} onSelect={setSelectedZoneId} />
            <div className="panel control-panel">
              <div className="panel-header">
                <div><span className="eyebrow">Simulation dataset</span><h3>46,080-row replay engine</h3></div>
                <span className="timestamp-readout">{frame?.replay.current_timestamp ? new Date(frame.replay.current_timestamp).toLocaleString() : '—'}</span>
              </div>
              <ReplayControls replay={frame?.replay ?? null} onControl={controlReplay} />
            </div>
            <ZoneTable zones={zones} selectedZoneId={selectedZoneId} onSelect={setSelectedZoneId} />
          </section>
        )}


      </main>
    </div>
  );
}

export default App;
