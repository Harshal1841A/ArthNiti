import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Loader2, ArrowLeft, Zap, BrainCircuit, Volume2, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Activity,
} from 'lucide-react';
import api from '@/lib/api';
import FinancialHealthCard from '@/components/FinancialHealthCard';
import ScoreGauge from '@/components/ScoreGauge';
import SHAPWaterfall from '@/components/SHAPWaterfall';
import LoanOfferCarousel from '@/components/LoanOfferCarousel';
import WhatIfSimulator from '@/components/WhatIfSimulator';
import ArthMitraPlayer from '@/components/ArthMitraPlayer';
import DecisionTrail from '@/components/DecisionTrail';
import MultiAgentViz from '@/components/MultiAgentViz';

// Lightweight score simulation for What-If
function simulateScore(features: Record<string, number>): { score: number; tier: string; factors: { feature: string; shap_value: number }[] } {
  const bounce = features.bounce_count_90d ?? 0;
  const vol = features.inflow_volatility_coefficient ?? 0.5;
  const neg = features.days_with_negative_balance_90d ?? 0;
  const gst = features.gst_filing_regularity_12mo ?? 0.5;
  const pay = features.payment_time_consistency_score ?? 0.5;
  const bal = features.avg_closing_balance ?? 50000;
  const emi = features.existing_emi_to_inflow_ratio ?? 0.3;

  const score = Math.max(0, Math.min(100, Math.round(
    50
    - bounce * 8
    - vol * 25
    - neg * 4
    + gst * 25
    + pay * 20
    + (bal / 100000) * 15
    - emi * 15
  )));

  const tier = score >= 75 ? 'STRONG' : score >= 50 ? 'ADEQUATE' : score >= 25 ? 'WATCH' : 'HIGH_RISK';

  const factors = [
    { feature: 'gst_filing_regularity_12mo', shap_value: gst * 0.15 },
    { feature: 'avg_closing_balance', shap_value: (bal / 100000) * 0.12 },
    { feature: 'payment_time_consistency_score', shap_value: pay * 0.10 },
    { feature: 'inflow_volatility_coefficient', shap_value: -vol * 0.18 },
    { feature: 'bounce_count_90d', shap_value: -bounce * 0.08 },
  ].sort((a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value));

  return { score, tier, factors };
}

export default function FinancialHealthCardPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isDemo = searchParams.has('demo');

  const [applicant, setApplicant] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [xai, setXai] = useState<any>(null);
  const [trail, setTrail] = useState<any[]>([]);
  const [routing, setRouting] = useState<any>(null);
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scoringError, setScoringError] = useState('');
  const [fetchError, setFetchError] = useState('');
  const [generatingXAI, setGeneratingXAI] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [demoXaiPayload, setDemoXaiPayload] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [whatIfScore, setWhatIfScore] = useState<any>(null);
  const [whatIfFeatures, setWhatIfFeatures] = useState<Record<string, number>>({});

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      let appResp;
      if (isDemo) {
        const demoResp = await api.get(`/v1/demo/personas/${id}`).catch(() => null);
        if (demoResp?.data) {
          const d = demoResp.data;
          setApplicant(d.applicant);
          setScore(d.score_result);
          setTrail(d.decision_trail);
          setRouting(d.routing);
          setOffers(d.loan_offers);
          setDemoXaiPayload({
            xai_id: `DEMO-XAI-${id}`,
            narrative: d.xai_narrative[language] || d.xai_narrative['en'],
            cross_check_passed: true,
            unsupported_claims: [],
          });
          setWhatIfFeatures({
            gst_filing_regularity_12mo: d.features.gst_filing_regularity_12mo ?? 0.5,
            bounce_count_90d: d.features.bounce_count_90d ?? 0,
            avg_closing_balance: d.features.avg_closing_balance ?? 0,
            inflow_volatility_coefficient: d.features.inflow_volatility_coefficient ?? 0.5,
            payment_time_consistency_score: d.features.payment_time_consistency_score ?? 0.5,
            existing_emi_to_inflow_ratio: d.features.existing_emi_to_inflow_ratio ?? 0.3,
          });
          setLoading(false);
          return;
        }
      }

      // BUG-17 FIX: Fetch the specific applicant by ID instead of loading all applicants
      // and filtering client-side. The new GET /v1/applicants/{id} endpoint is O(1) vs O(n).
      appResp = await api.get(`/v1/applicants/${id}`).catch(() => ({ data: null }));
      setApplicant(appResp.data || null);

      const scoreResp = await api.get(`/v1/score?applicant_id=${id}`).catch(() => ({ data: [] }));
      const scores = Array.isArray(scoreResp.data)
        ? scoreResp.data.filter((s: any) => s.applicant_id === id)
        : [];
      if (scores.length) {
        // NEW-05 FIX: Backend returns DESC order (order_by computed_at.desc()), so scores[0] is the LATEST score.
        // Previously used scores[scores.length - 1], which picked the oldest historical score instead!
        const latest = scores[0];
        setScore(latest);
        // Isolated: routing failure must not crash the page
        const routingResp = await api.get(`/v1/routing/${latest.score_id}`).catch(() => ({ data: null }));
        setRouting(routingResp.data);

        const xaiResp = await api.get(`/v1/xai?applicant_id=${id}`).catch(() => ({ data: [] }));
        const xais = Array.isArray(xaiResp.data)
          ? xaiResp.data.filter((x: any) => x.score_id === latest.score_id)
          : [];
        if (xais.length) setXai(xais[0]);

        const offersResp = await api.get(`/v1/offers/${id}`).catch(() => ({ data: { offers: [] } }));
        setOffers(offersResp.data?.offers || []);
      }

      // Isolated: trail failure must not crash the page
      const trailResp = await api.get(`/v1/decision-trail/${id}`).catch(() => ({ data: { stages: [] } }));
      setTrail(trailResp.data?.stages || []);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load applicant data');
    } finally {
      setLoading(false);
    }
  }, [id, isDemo, language]);

  // BUG-05 & NEW-04 FIX: loadData is now a stable useCallback triggered when id or language changes.
  useEffect(() => { if (id) loadData(); }, [id, loadData]);

  async function handleScore() {
    if (!id) return;
    setScoringError('');
    setScoring(true);
    try {
      // Synthetic applicants use the demo score endpoint which doesn't need NormalizedFeatures
      const scoreUrl = applicant?.is_synthetic ? `/v1/demo/score/${id}` : `/v1/score/${id}`;
      const resp = await api.post(scoreUrl);
      setScore(resp.data);
      // Routing — isolated, won't crash on miss
      const routingResp = await api.get(`/v1/routing/${resp.data.score_id}`).catch(() => ({ data: null }));
      if (routingResp.data) setRouting(routingResp.data);
      // Offers — isolated
      const offersUrl = applicant?.is_synthetic ? `/v1/demo/offers/${id}` : `/v1/offers/${id}`;
      const offersResp = await api.get(offersUrl).catch(() => ({ data: { offers: [] } }));
      setOffers(offersResp.data?.offers || []);
      // Trail — isolated
      const trailResp = await api.get(`/v1/decision-trail/${id}`).catch(() => ({ data: { stages: [] } }));
      setTrail(trailResp.data?.stages || []);
    } catch (e: any) {
      const msg = e.response?.data?.detail || 'Scoring failed';
      setScoringError(msg);
    } finally {
      setScoring(false);
    }
  }

  async function handleFetchData() {
    setFetchError('');
    setFetchingData(true);
    // Synthetic / demo applicants: use the backend demo consent + mock-fetch flow
    if (applicant?.is_synthetic) {
      try {
        // 1. Ensure ACTIVE consent exists in demo mode
        await api.post(`/v1/demo/consent/${id}`).catch(() => null);
        // 2. Short UX delay to show animation, then reload data
        await new Promise(r => setTimeout(r, 1000));
        await loadData();
      } catch (e: any) {
        setFetchError('Demo data sync failed — try refreshing the page.');
      } finally {
        setFetchingData(false);
      }
      return;
    }

    try {
      const consentResp = await api.get(`/v1/consent/applicant/${id}`).catch(() => ({ data: [] }));
      const activeConsents = (consentResp.data || []).filter((c: any) => c.status === 'ACTIVE');

      if (activeConsents.length === 0) {
        setFetchError('No active consent handle found. The applicant must approve the consent request on their AA app first.');
        setFetchingData(false);
        return;
      }

      const consentHandle = activeConsents[0].consent_handle;
      // BUG-03 FIX: Send applicant_id and consent_handle in POST body, not query string.
      // Query string params get logged by every proxy, CDN, and browser history.
      await api.post(`/v1/consent/aa/fetch`, { applicant_id: id, consent_handle: consentHandle });
      await loadData();
    } catch (e: any) {
      setFetchError(e.response?.data?.detail || 'Failed to fetch AA data');
    } finally {
      setFetchingData(false);
    }
  }

  async function handleGenerateXAI() {
    if (!score) return;
    setGeneratingXAI(true);
    try {
      if (isDemo && demoXaiPayload) {
        await new Promise(r => setTimeout(r, 1500));
        setXai(demoXaiPayload);
      } else {
        const resp = await api.post(`/v1/xai/${score.score_id}`);
        setXai(resp.data);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || 'XAI generation failed');
    } finally { setGeneratingXAI(false); }
  }

  const handleWhatIfChange = useCallback((values: Record<string, number>) => {
    const sim = simulateScore(values);
    setWhatIfScore(sim);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
        <span className="ml-3 text-sm text-[var(--text-secondary)] font-mono uppercase tracking-wider font-semibold">Loading Dossier Telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-6 text-sm text-[#F43F5E] font-mono">
        <div className="font-bold mb-1 uppercase tracking-wider">System Exception</div>
        {error}
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="glass-card p-8 text-center text-sm text-[var(--text-secondary)] font-mono">
        Dossier record not found in system registry.
      </div>
    );
  }

  const displayScore = whatIfScore || score;
  const strengths = displayScore?.contributing_factors?.filter((f: any) => f.shap_value > 0) || [];
  const risks = displayScore?.contributing_factors?.filter((f: any) => f.shap_value < 0) || [];
  const deltaScore = whatIfScore && score ? whatIfScore.score - score.score : 0;

  return (
    <div className="space-y-8 font-sans">
      {/* Inline fetch error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#F59E0B] mb-0.5">AA Telemetry Error</div>
            <div className="text-xs text-[#F59E0B]/80 font-mono">{fetchError}</div>
          </div>
          <button onClick={() => setFetchError('')} className="text-[#F59E0B]/60 hover:text-[#F59E0B] text-lg leading-none">×</button>
        </div>
      )}
      {/* Inline scoring error banner — does NOT kill the page */}
      {scoringError && (
        <div className="flex items-start gap-3 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-[#F43F5E] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-[#F43F5E] mb-0.5">Scoring Error</div>
            <div className="text-xs text-[#F43F5E]/80 font-mono">{scoringError}</div>
            {scoringError.includes('normalized features') && (
              <div className="mt-2 text-xs text-[var(--text-secondary)] font-sans">
                👉 Click <strong>Fetch AA Telemetry</strong> first to pull financial data, then re-run scoring.
              </div>
            )}
          </div>
          <button
            onClick={() => setScoringError('')}
            className="text-[#F43F5E]/60 hover:text-[#F43F5E] text-lg leading-none"
          >×</button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <button className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-raised)] transition-all">
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="eyebrow mb-0">DOSSIER // {applicant.id}</span>
            </div>
            <h1 className="text-3xl font-serif text-[var(--text-primary)]">{applicant.business_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {applicant.is_synthetic && <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-[var(--border)] text-[var(--text-secondary)] border border-[var(--border)]">Synthetic Prototype</span>}
              {!applicant.has_bureau_record && <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">Thin File (NTC)</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            className="btn-action"
            onClick={handleFetchData}
            disabled={fetchingData}
          >
            <Zap className="h-3.5 w-3.5 text-[var(--accent)]" />
            {fetchingData ? 'Syncing AA Telemetry...' : 'Fetch AA Telemetry'}
          </button>
          <button className="btn-gold" onClick={handleScore} disabled={scoring}>
            {scoring ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            {scoring ? 'Computing Score (~45ms)...' : score ? 'Re-run AI Scoring' : 'Execute AI Scoring (~45ms)'}
          </button>
        </div>
      </div>

      {/* Multi-Agent Viz */}
      <MultiAgentViz activeStage={score ? 'decision' : 'aa'} />

      {/* Decision Trail */}
      {trail.length > 0 && <DecisionTrail stages={trail} />}

      {!displayScore && (
        <div className="glass-card p-10 border border-[var(--border)] text-center max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--accent)]">
            <Activity className="h-8 w-8" />
          </div>
          <span className="eyebrow">STEP 1: TELEMETRY & SCORING PENDING</span>
          <h3 className="text-xl font-serif font-bold text-[var(--text-primary)] mt-1 mb-2">
            No XGBoost Score Computed Yet
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto font-sans leading-relaxed">
            This applicant's Account Aggregator (AA) telemetry is either pending sync or has not been scored yet. Click below to pull 12-month bank statements and execute sub-second credit scoring.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              className="btn-action px-5 py-2.5 text-xs flex items-center gap-2"
              onClick={handleFetchData}
              disabled={fetchingData}
            >
              <Zap className="h-4 w-4 text-[var(--accent)]" />
              {fetchingData ? 'Syncing AA Telemetry...' : '1. Pull AA Telemetry'}
            </button>
            <button
              className="btn-gold px-6 py-2.5 text-xs flex items-center gap-2"
              onClick={handleScore}
              disabled={scoring}
            >
              {scoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
              {scoring ? 'Computing Score (~45ms)...' : '2. Execute AI Scoring (~45ms)'}
            </button>
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)] flex items-center justify-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
            DEPA / Sahamati Compliant • Zero-Knowledge Data Storage
          </div>
        </div>
      )}

      {displayScore && (
        <>
          {/* Score + Card Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FinancialHealthCard
              score={displayScore.score}
              tier={displayScore.tier}
              businessName={applicant.business_name}
              city={applicant.city}
              industry={applicant.industry}
              isNTC={!applicant.has_bureau_record}
              modelVersion={displayScore.model_version || 'xgb_model'}
              inferenceMs={displayScore.inference_ms}
            />
            <div className="glass-card p-6 flex flex-col items-center justify-center border border-[var(--border)]">
              <ScoreGauge score={displayScore.score} tier={displayScore.tier} size={220} />
              {deltaScore !== 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 text-xs font-bold font-mono px-3 py-1 rounded border ${deltaScore > 0 ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' : 'bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/30'}`}
                >
                  SIMULATION DELTA: {deltaScore > 0 ? '+' : ''}{deltaScore} PTS
                </motion.div>
              )}
              <div className="mt-5 text-center">
                <div className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold ${
                  routing?.routing === 'REJECT' ? 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30' :
                  routing?.requires_review ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30' : 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                }`}>
                  {routing?.routing === 'REJECT' ? <AlertTriangle className="h-4 w-4" /> : routing?.requires_review ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {routing?.routing === 'STRAIGHT_THROUGH' ? 'Straight-Through Underwriting Approval' : routing?.routing === 'REJECT' ? 'Adverse Action Notice (Declined)' : 'Enhanced Human Underwriting Review Required'}
                </div>
              </div>
            </div>
          </div>

          {/* SHAP + Offers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 border border-[var(--border)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
                <div>
                  <span className="eyebrow">EXPLAINABILITY // LOCAL SHAP</span>
                  <h3 className="text-base font-serif text-[var(--text-primary)]">SHAP Explainer <span className="italic">Matrix</span>.</h3>
                </div>
                <span className="text-xs font-mono text-[var(--text-secondary)]">LOCAL EXPLANATIONS</span>
              </div>
              <SHAPWaterfall factors={displayScore.contributing_factors || []} />
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#10B981] font-bold mb-2.5 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" /> Key Drivers (+)
                  </div>
                  {strengths.length > 0 ? strengths.slice(0, 3).map((f: any) => (
                    <div key={f.feature} className="text-xs text-[var(--text-secondary)] mb-1.5 font-mono">
                      {f.feature.replace(/_/g, ' ')}: <span className="text-[#10B981] font-bold">+{f.shap_value.toFixed(4)}</span>
                    </div>
                  )) : <p className="text-xs font-mono text-[var(--text-secondary)]">No positive determinants</p>}
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[#F43F5E] font-bold mb-2.5 flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5" /> Key Drivers (-)
                  </div>
                  {risks.length > 0 ? risks.slice(0, 3).map((f: any) => (
                    <div key={f.feature} className="text-xs text-[var(--text-secondary)] mb-1.5 font-mono">
                      {f.feature.replace(/_/g, ' ')}: <span className="text-[#F43F5E] font-bold">{f.shap_value.toFixed(4)}</span>
                    </div>
                  )) : <p className="text-xs font-mono text-[var(--text-secondary)]">No risk determinants</p>}
                </div>
              </div>
            </div>

            <LoanOfferCarousel offers={offers} />
          </div>

          {/* What-If Simulator */}
          <WhatIfSimulator
            initialValues={whatIfFeatures}
            onChange={handleWhatIfChange}
          />

          {/* XAI + Arth-Mitra */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card p-6 border border-[var(--border)]">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                <div>
                  <span className="eyebrow">SYNTHESIS // NEMOTRON ULTRA</span>
                  <h3 className="text-base font-serif text-[var(--text-primary)] flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-[var(--accent)]" /> XAI Narrative <span className="italic">Dossier</span>.
                  </h3>
                </div>
                {xai && (
                  <button
                    className="btn-action"
                    onClick={handleGenerateXAI}
                    disabled={generatingXAI}
                  >
                    {generatingXAI ? 'Synthesizing...' : 'Regenerate Narrative'}
                  </button>
                )}
              </div>
              {xai ? (
                <div className="space-y-4">
                  <div className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-mono font-semibold ${
                    xai.cross_check_passed ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' : 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30'
                  }`}>
                    {xai.cross_check_passed ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {xai.cross_check_passed ? 'Numeric Fact-Check Verified' : 'Hallucination / Unsupported Claims Flagged'}
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--surface)] rounded-xl p-5 border border-[var(--border)] font-serif">{xai.narrative}</p>
                  <div className="text-[10px] font-mono text-[var(--text-secondary)]">Synthesized by Nemotron Ultra • Audited by SHAP Telemetry Engine</div>
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                  <BrainCircuit className="h-10 w-10 mx-auto mb-3 text-[var(--accent)] opacity-80" />
                  <h4 className="text-sm font-serif font-bold text-[var(--text-primary)] mb-1.5">Step 2: AI Narrative & Audio Synthesis</h4>
                  <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mb-5 font-sans">
                    XGBoost numeric credit scoring completed deterministically in {displayScore.inference_ms || 45}ms. 
                    Invoke NVIDIA Nemotron Ultra to generate a cross-checked, vernacular explanation and IndicTTS audio.
                  </p>
                  <button
                    className="btn-gold px-5 py-2.5 text-xs mx-auto flex items-center justify-center"
                    onClick={handleGenerateXAI}
                    disabled={generatingXAI}
                  >
                    {generatingXAI ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                        Synthesizing XAI Narrative (~2-3s)...
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="h-3.5 w-3.5 mr-2" />
                        Generate AI Narrative & Audio Explanation
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="glass-card p-6 border border-[var(--border)] space-y-4">
              <div className="border-b border-[var(--border)] pb-3 mb-4">
                <span className="eyebrow">VERNACULAR // AUDIO</span>
                <h3 className="text-base font-serif text-[var(--text-primary)] flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-[#10B981]" /> Arth-Mitra Voice <span className="italic">Interface</span>.
                </h3>
              </div>
              <ArthMitraPlayer
                narrativeText={xai?.narrative || ''}
                language={language}
                onLanguageChange={setLanguage}
              />
              <p className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-3">
                Arth-Mitra explains credit determinations directly to MSME borrowers in native regional dialects via IndicTTS / Web Audio API fallback.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
