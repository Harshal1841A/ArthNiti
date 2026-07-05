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
  const [generatingXAI, setGeneratingXAI] = useState(false);
  const [demoXaiPayload, setDemoXaiPayload] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [whatIfScore, setWhatIfScore] = useState<any>(null);
  const [whatIfFeatures, setWhatIfFeatures] = useState<Record<string, number>>({});

  async function loadData() {
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

      appResp = await api.get('/v1/applicants');
      const found = appResp.data.find((a: any) => a.id === id);
      setApplicant(found || null);

      const scoreResp = await api.get(`/v1/score?applicant_id=${id}`).catch(() => ({ data: [] }));
      const scores = scoreResp.data.filter((s: any) => s.applicant_id === id);
      if (scores.length) {
        const latest = scores[scores.length - 1];
        setScore(latest);
        const routingResp = await api.get(`/v1/routing/${latest.score_id}`);
        setRouting(routingResp.data);

        const xaiResp = await api.get(`/v1/xai?applicant_id=${id}`).catch(() => ({ data: [] }));
        const xais = xaiResp.data.filter((x: any) => x.score_id === latest.score_id);
        if (xais.length) setXai(xais[xais.length - 1]);

        const offersResp = await api.get(`/v1/offers/${id}`).catch(() => ({ data: { offers: [] } }));
        setOffers(offersResp.data?.offers || []);
      }

      const trailResp = await api.get(`/v1/decision-trail/${id}`);
      setTrail(trailResp.data?.stages || []);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load applicant data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) loadData(); }, [id, language]);

  async function handleScore() {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await api.post(`/v1/score/${id}`);
      setScore(resp.data);
      const routingResp = await api.get(`/v1/routing/${resp.data.score_id}`);
      setRouting(routingResp.data);
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchData() {
    if (applicant?.is_synthetic || isDemo) {
      setFetchingData(true);
      await new Promise(r => setTimeout(r, 1500));
      await loadData();
      setFetchingData(false);
      return;
    }

    setFetchingData(true);
    try {
      const consentResp = await api.get(`/v1/consent/applicant/${id}`);
      const activeConsents = consentResp.data.filter((c: any) => c.status === 'ACTIVE');
      
      if (activeConsents.length === 0) {
        alert("No active consent handle found. Applicant must approve on AA app.");
        setFetchingData(false);
        return;
      }
      
      const consentHandle = activeConsents[0].consent_handle;
      await api.post(`/v1/consent/aa/fetch?applicant_id=${id}&consent_handle=${consentHandle}`);
      await loadData();
    } catch (e: any) {
      setError(e.response?.data?.detail || "Failed to fetch AA data");
    } finally { setFetchingData(false); }
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
          {!score && (
            <button className="btn-gold" onClick={handleScore}>
              <Activity className="h-3.5 w-3.5" /> Execute AI Scoring
            </button>
          )}
        </div>
      </div>

      {/* Multi-Agent Viz */}
      <MultiAgentViz activeStage={score ? 'decision' : 'aa'} />

      {/* Decision Trail */}
      {trail.length > 0 && <DecisionTrail stages={trail} />}

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
                {!xai && (
                  <button
                    className="btn-action"
                    onClick={handleGenerateXAI}
                    disabled={generatingXAI}
                  >
                    {generatingXAI ? 'Synthesizing...' : 'Generate Narrative'}
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
                <div className="text-center py-12 text-[var(--text-secondary)] font-mono">
                  <BrainCircuit className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-bold">No underwriting narrative generated.</p>
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
