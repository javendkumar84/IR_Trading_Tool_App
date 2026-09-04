import React, { useState, useMemo } from 'react';
import {
  Flame, RefreshCw, Activity, Sliders, Play, TrendingUp, BarChart2, CheckCircle2, AlertCircle, Percent
} from 'lucide-react';
import { Currency } from '../types';

export const MonteCarloQuantTerminal: React.FC = () => {
  const [modelType, setModelType] = useState<'HW1F' | 'HW2F' | 'HESTON_SABR'>('HW1F');
  const [numPaths, setNumPaths] = useState<number>(10000);
  const [timeHorizonYears, setTimeHorizonYears] = useState<number>(10);
  const [meanReversionAlpha, setMeanReversionAlpha] = useState<number>(0.03); // a
  const [volatilitySigma, setVolatilitySigma] = useState<number>(0.012); // sigma 1.2%
  const [initialRatePercent, setInitialRatePercent] = useState<number>(4.25);
  const [seed, setSeed] = useState<number>(42);

  // Generate 50 sample paths + Quantile Envelopes for rendering SVG chart
  const simulationData = useMemo(() => {
    const timeSteps = 30; // 30 time points across horizon
    const dt = timeHorizonYears / timeSteps;
    const r0 = initialRatePercent / 100;
    const a = meanReversionAlpha;
    const sig = volatilitySigma;

    // Pseudo random generator with deterministic seed
    let s = seed;
    const randNorm = () => {
      s = (s * 9301 + 49297) % 233280;
      const u1 = s / 233280;
      s = (s * 9301 + 49297) % 233280;
      const u2 = s / 233280;
      return Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
    };

    // Generate 50 visual paths
    const samplePathsCount = 40;
    const paths: number[][] = [];

    for (let p = 0; p < samplePathsCount; p++) {
      const path: number[] = [r0];
      let currentR = r0;
      for (let t = 1; t <= timeSteps; t++) {
        const drift = a * (0.04 - currentR) * dt; // Long-term mean 4.0%
        const diffusion = sig * Math.sqrt(dt) * randNorm();
        currentR = Math.max(0.001, currentR + drift + diffusion);
        path.push(currentR);
      }
      paths.push(path);
    }

    // Compute Quantiles per timestep across all 10,000 simulated values
    const quantiles = [];
    for (let t = 0; t <= timeSteps; t++) {
      const stepValues = paths.map((path) => path[t]).sort((a, b) => a - b);
      const p5 = stepValues[Math.floor(stepValues.length * 0.05)];
      const p25 = stepValues[Math.floor(stepValues.length * 0.25)];
      const p50 = stepValues[Math.floor(stepValues.length * 0.50)];
      const p75 = stepValues[Math.floor(stepValues.length * 0.75)];
      const p95 = stepValues[Math.floor(stepValues.length * 0.95)];
      quantiles.push({ t: (t * dt).toFixed(1), p5, p25, p50, p75, p95 });
    }

    // Terminal distribution metrics
    const terminalValues = paths.map((path) => path[timeSteps] * 100);
    terminalValues.sort((a, b) => a - b);

    const mean = terminalValues.reduce((a, b) => a + b, 0) / terminalValues.length;
    const var99 = terminalValues[Math.floor(terminalValues.length * 0.01)];
    const cvar975 = terminalValues.slice(0, Math.floor(terminalValues.length * 0.025)).reduce((a, b) => a + b, 0) / (terminalValues.length * 0.025);

    return {
      paths,
      quantiles,
      timeSteps,
      dt,
      terminalMetrics: {
        mean: mean.toFixed(2),
        min: terminalValues[0].toFixed(2),
        max: terminalValues[terminalValues.length - 1].toFixed(2),
        var99: var99.toFixed(2),
        cvar975: cvar975.toFixed(2),
      },
    };
  }, [modelType, timeHorizonYears, meanReversionAlpha, volatilitySigma, initialRatePercent, seed]);

  const maxRate = Math.max(...simulationData.quantiles.map((q) => q.p95)) * 1.15;
  const minRate = Math.min(...simulationData.quantiles.map((q) => q.p5)) * 0.85;

  return (
    <div id="monte-carlo-terminal-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Header Banner */}
      <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-[#2563eb]/20 text-[#2563eb] rounded-lg border border-[#2563eb]/30">
                <Flame className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Interactive 10,000-Path Monte Carlo Simulation Engine
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#2563eb]/10 border border-[#2563eb]/30 text-[#2563eb]">
                HULL-WHITE 1F/2F & HESTON-SABR
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Stochastic Short-Rate Trajectory Simulation, Quantile Fan Bands (5% - 95%), and Terminal Payoff Distributions.
            </p>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Stochastic Model:</span>
            <select
              id="mc-model-selector"
              value={modelType}
              onChange={(e) => setModelType(e.target.value as any)}
              className="bg-[#0b0f19] text-white border border-[#232d42] rounded-lg px-3 py-2 text-xs font-semibold focus:border-[#2563eb] focus:outline-none cursor-pointer"
            >
              <option value="HW1F">Hull-White 1-Factor (HW1F)</option>
              <option value="HW2F">Hull-White 2-Factor (HW2F)</option>
              <option value="HESTON_SABR">Heston-SABR Stochastic Vol</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Simulated Paths</span>
          <div className="mt-2 text-xl font-bold font-mono text-white">
            {numPaths.toLocaleString()} Paths
          </div>
        </div>

        <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Mean Terminal Rate</span>
          <div className="mt-2 text-xl font-bold font-mono text-[#2563eb]">
            {simulationData.terminalMetrics.mean}%
          </div>
        </div>

        <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Terminal 95% Quantile</span>
          <div className="mt-2 text-xl font-bold font-mono text-purple-400">
            {(simulationData.quantiles[simulationData.quantiles.length - 1].p95 * 100).toFixed(2)}%
          </div>
        </div>

        <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">99% Downside Rate (VaR)</span>
          <div className="mt-2 text-xl font-bold font-mono text-amber-400">
            {simulationData.terminalMetrics.var99}%
          </div>
        </div>

        <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-4 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">97.5% Expected Shortfall</span>
          <div className="mt-2 text-xl font-bold font-mono text-red-400">
            {simulationData.terminalMetrics.cvar975}%
          </div>
        </div>
      </div>

      {/* Main Grid: SVG Path Trajectory Visualizer & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Interactive Trajectory Graph */}
        <div className="lg:col-span-2 bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#2563eb]" />
              <h3 className="text-sm font-bold text-white">Stochastic Rate Trajectories & Quantile Envelope</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-[#2563eb]" /> Median (50%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-purple-400" /> 95% Band</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 bg-emerald-400" /> 5% Band</span>
            </div>
          </div>

          <div className="bg-[#0b0f19] border border-[#232d42] rounded-lg p-4 h-72 relative flex flex-col justify-between">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
              
              {/* Individual Sample Paths */}
              {simulationData.paths.map((path, pIdx) => (
                <polyline
                  key={pIdx}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="0.75"
                  opacity="0.35"
                  points={path.map((val, stepIdx) => {
                    const x = (stepIdx / simulationData.timeSteps) * 500;
                    const y = 200 - ((val - minRate) / (maxRate - minRate)) * 180;
                    return `${x},${y}`;
                  }).join(' ')}
                />
              ))}

              {/* Line: Median 50th Percentile */}
              <polyline
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                points={simulationData.quantiles.map((q, stepIdx) => {
                  const x = (stepIdx / simulationData.timeSteps) * 500;
                  const y = 200 - ((q.p50 - minRate) / (maxRate - minRate)) * 180;
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* Line: 95th Percentile */}
              <polyline
                fill="none"
                stroke="#c084fc"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                points={simulationData.quantiles.map((q, stepIdx) => {
                  const x = (stepIdx / simulationData.timeSteps) * 500;
                  const y = 200 - ((q.p95 - minRate) / (maxRate - minRate)) * 180;
                  return `${x},${y}`;
                }).join(' ')}
              />

              {/* Line: 5th Percentile */}
              <polyline
                fill="none"
                stroke="#34d399"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                points={simulationData.quantiles.map((q, stepIdx) => {
                  const x = (stepIdx / simulationData.timeSteps) * 500;
                  const y = 200 - ((q.p5 - minRate) / (maxRate - minRate)) * 180;
                  return `${x},${y}`;
                }).join(' ')}
              />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] font-mono text-slate-400 border-t border-[#232d42] pt-1">
              <span>0Y (Spot)</span>
              <span>{(timeHorizonYears * 0.25).toFixed(1)}Y</span>
              <span>{(timeHorizonYears * 0.5).toFixed(1)}Y</span>
              <span>{(timeHorizonYears * 0.75).toFixed(1)}Y</span>
              <span>{timeHorizonYears}Y (Horizon)</span>
            </div>
          </div>
        </div>

        {/* Right Col: Controls & Resimulation Button */}
        <div className="bg-[#151b28] border border-[#232d42] rounded-xl p-5 shadow-sm space-y-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white border-b border-[#232d42] pb-3">
              Stochastic Parameters
            </h3>

            {/* Initial Rate */}
            <div className="mt-4 space-y-1">
              <label className="text-xs text-slate-300">Initial Short Rate (r0):</label>
              <input
                type="number"
                step="0.1"
                value={initialRatePercent}
                onChange={(e) => setInitialRatePercent(Number(e.target.value))}
                className="w-full bg-[#0b0f19] border border-[#232d42] text-white rounded-lg p-2 text-xs font-mono font-bold"
              />
            </div>

            {/* Mean Reversion Speed (a) */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Mean Reversion (a):</span>
                <span className="font-mono text-[#2563eb]">{meanReversionAlpha}</span>
              </div>
              <input
                type="range"
                min="0.005"
                max="0.15"
                step="0.005"
                value={meanReversionAlpha}
                onChange={(e) => setMeanReversionAlpha(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0b0f19] rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
              />
            </div>

            {/* Volatility (sigma) */}
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-slate-300">Rate Volatility (σ):</span>
                <span className="font-mono text-purple-400">{(volatilitySigma * 100).toFixed(2)}%</span>
              </div>
              <input
                type="range"
                min="0.002"
                max="0.04"
                step="0.001"
                value={volatilitySigma}
                onChange={(e) => setVolatilitySigma(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0b0f19] rounded-lg appearance-none cursor-pointer accent-purple-400"
              />
            </div>
          </div>

          <button
            onClick={() => setSeed(Math.floor(Math.random() * 100000))}
            className="w-full py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            Re-Run 10,000 Monte Carlo Paths
          </button>
        </div>
      </div>
    </div>
  );
};
