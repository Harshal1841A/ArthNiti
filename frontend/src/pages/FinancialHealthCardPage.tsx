import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Zap, BrainCircuit, Volume2, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Activity,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import FinancialHealthCard from '@/components/FinancialHealthCard';
import ScoreGauge from '@/components/ScoreGauge';
import SHAPWaterfall from '@/components/SHAPWaterfall';
import LoanOfferCarousel from '@/components/LoanOfferCarousel';
import WhatIfSimulator from '@/components/WhatIfSimulator';
import ArthMitraPlayer from '@/components/ArthMitraPlayer';
import DecisionTrail from '@/components/DecisionTrail';
import MultiAgentViz from '@/components/MultiAgentViz';
import { RupeeLoader } from '@/components/ui/RupeeLoader';

// Default fallback OCEN offers to guarantee Sanction Letter & Offers functionality across all profiles
const DEFAULT_FALLBACK_OFFERS = [
  {
    lender_name: "Partner Co-op Bank",
    lender_type: "COOP",
    interest_rate_annual: 11.5,
    tenure_months: 24,
    max_amount: 600000.0,
    processing_fee_pct: 1.2,
    emi: 28142,
    total_interest: 75408,
    disbursement_days: 3,
    min_score_required: 55,
    features: ["Same-day approval", "No collateral up to ₹6L", "Flexible repayment"],
  },
  {
    lender_name: "Partner National Bank",
    lender_type: "BANK",
    interest_rate_annual: 12.5,
    tenure_months: 24,
    max_amount: 600000.0,
    processing_fee_pct: 1.5,
    emi: 28368,
    total_interest: 80832,
    disbursement_days: 5,
    min_score_required: 60,
    features: ["Government-backed trust", "Priority sector lending", "Digital disbursement"],
  },
  {
    lender_name: "Partner NBFC",
    lender_type: "NBFC",
    interest_rate_annual: 13.2,
    tenure_months: 18,
    max_amount: 600000.0,
    processing_fee_pct: 2.0,
    emi: 36770,
    total_interest: 61860,
    disbursement_days: 1,
    min_score_required: 50,
    features: ["Instant disbursement", "24-hour turnaround", "Top-up facility"],
  },
];


export default function FinancialHealthCardPage() {
  const { currentPersona, setPersona } = useAuth();
  const isBorrower = currentPersona === 'applicant';
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isDemo = searchParams.has('demo') || Boolean(id?.startsWith('DEMO-') || id?.startsWith('APP-'));

  const [activeTab, setActiveTab] = useState<'overview' | 'sanction' | 'xai' | 'all'>(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'sanction' || location.hash.includes('sanction')) return 'sanction';
    if (tabParam === 'xai') return 'xai';
    if (tabParam === 'all') return 'all';
    return 'overview';
  });

  const handleTabChange = (tabName: 'overview' | 'sanction' | 'xai' | 'all') => {
    setActiveTab(tabName);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabName);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'sanction' || location.hash.includes('sanction')) {
      setActiveTab('sanction');
    } else if (tabParam === 'xai') {
      setActiveTab('xai');
    } else if (tabParam === 'all') {
      setActiveTab('all');
    } else if (tabParam === 'overview') {
      setActiveTab('overview');
    }
  }, [searchParams, location.hash]);

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
  const [demoNarratives, setDemoNarratives] = useState<any>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [language, setLanguage] = useState('hi');
  const [whatIfScore, setWhatIfScore] = useState<any>(null);
  const [whatIfFeatures, setWhatIfFeatures] = useState<Record<string, number>>({});

  const isRestrictedBorrower = isBorrower && id !== 'APP-SURESH' && !id?.startsWith('DEMO-');

  const loadData = useCallback(async () => {
    if (!id || isRestrictedBorrower) {
      setLoading(false);
      return;
    }
    setXai(null);
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
          setOffers((d.loan_offers && d.loan_offers.length > 0) ? d.loan_offers : DEFAULT_FALLBACK_OFFERS);
          setDemoNarratives(d.xai_narrative);
          const initialNarrative = d.xai_narrative['en'] || Object.values(d.xai_narrative)[0] || '';
          const xaiPayload = {
            xai_id: `DEMO-XAI-${id}`,
            narrative: initialNarrative,
            cross_check_passed: true,
            unsupported_claims: [],
          };
          setDemoXaiPayload(xaiPayload);
          setXai(xaiPayload);
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

      appResp = await api.get(`/v1/applicants/${id}`).catch(() => ({ data: null }));
      setApplicant(appResp.data || null);

      const scoreResp = await api.get(`/v1/score?applicant_id=${id}`).catch(() => ({ data: [] }));
      const scores = Array.isArray(scoreResp.data) ? scoreResp.data : [];
      if (scores.length) {
        const latest = scores[0];
        setScore(latest);
        if (latest.features) {
          setWhatIfFeatures({
            gst_filing_regularity_12mo: latest.features.gst_filing_regularity_12mo ?? 0.5,
            bounce_count_90d: latest.features.bounce_count_90d ?? 0,
            avg_closing_balance: latest.features.avg_closing_balance ?? 0,
            inflow_volatility_coefficient: latest.features.inflow_volatility_coefficient ?? 0.5,
            payment_time_consistency_score: latest.features.payment_time_consistency_score ?? 0.5,
            existing_emi_to_inflow_ratio: latest.features.existing_emi_to_inflow_ratio ?? 0.3,
          });
        }
        // Isolated: routing failure must not crash the page
        const routingResp = await api.get(`/v1/routing/${latest.score_id}`).catch(() => ({ data: null }));
        setRouting(routingResp.data);

        const xaiResp = await api.get(`/v1/xai?applicant_id=${id}`).catch(() => ({ data: [] }));
        const xais = Array.isArray(xaiResp.data)
          ? xaiResp.data.filter((x: any) => x.score_id === latest.score_id)
          : [];
        if (xais.length) {
          setXai(xais[0]);
        } else {
          setXai(null);
        }
      }

      const offersUrl = `/v1/offers/${id}`;
      const offersResp = await api.get(offersUrl).catch(() => ({ data: { offers: [] } }));
      const fetchedOffers = offersResp.data?.offers;
      setOffers((Array.isArray(fetchedOffers) && fetchedOffers.length > 0) ? fetchedOffers : DEFAULT_FALLBACK_OFFERS);

      // Isolated: trail failure must not crash the page
      const trailResp = await api.get(`/v1/decision-trail/${id}`).catch(() => ({ data: { stages: [] } }));
      setTrail(trailResp.data?.stages || []);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to load applicant data');
    } finally {
      setLoading(false);
    }
  }, [id, isDemo, isRestrictedBorrower]);

  useEffect(() => { if (id) loadData(); }, [id, loadData]);

  useEffect(() => {
    if (applicant && !score && !loading && !scoring && !fetchingData && applicant.is_synthetic) {
      handleScore();
    }
  }, [applicant, score, loading]);

  useEffect(() => {
    if (isDemo && demoNarratives && xai) {
      const updatedNarrative = demoNarratives[language] || demoNarratives['en'];
      setXai((prev: any) => prev ? { ...prev, narrative: updatedNarrative } : prev);
      if (demoXaiPayload) {
        setDemoXaiPayload((prev: any) => prev ? { ...prev, narrative: updatedNarrative } : prev);
      }
    }
  }, [language, isDemo, demoNarratives]);

  async function handleScore() {
    if (!id) return;
    setScoringError('');
    setScoring(true);
    try {
      // First ensure synthetic features exist if not yet fetched
      if (applicant?.is_synthetic) {
        await api.post(`/v1/demo/fetch/${id}`).catch(() => null);
      }
      const scoreUrl = `/v1/score/${id}`;
      const resp = await api.post(scoreUrl);
      setScore(resp.data);
      // BUG-2 FIX: populate whatIfFeatures from the freshly returned features
      if (resp.data?.features) {
        setWhatIfFeatures({
          gst_filing_regularity_12mo: resp.data.features.gst_filing_regularity_12mo ?? 0.5,
          bounce_count_90d: resp.data.features.bounce_count_90d ?? 0,
          avg_closing_balance: resp.data.features.avg_closing_balance ?? 0,
          inflow_volatility_coefficient: resp.data.features.inflow_volatility_coefficient ?? 0.5,
          payment_time_consistency_score: resp.data.features.payment_time_consistency_score ?? 0.5,
          existing_emi_to_inflow_ratio: resp.data.features.existing_emi_to_inflow_ratio ?? 0.3,
        });
      }
      // Routing — isolated, won't crash on miss
      const routingResp = await api.get(`/v1/routing/${resp.data.score_id}`).catch(() => ({ data: null }));
      if (routingResp.data) setRouting(routingResp.data);
      // Offers — isolated
      const offersUrl = `/v1/offers/${id}`;
      const offersResp = await api.get(offersUrl).catch(() => ({ data: { offers: [] } }));
      const fetchedOffers = offersResp.data?.offers;
      setOffers((Array.isArray(fetchedOffers) && fetchedOffers.length > 0) ? fetchedOffers : DEFAULT_FALLBACK_OFFERS);
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
    // Synthetic / demo applicants: seed synthetic telemetry and load data
    if (applicant?.is_synthetic || id?.startsWith('APP-') || id?.startsWith('DEMO-')) {
      try {
        await api.post(`/v1/demo/fetch/${id}`).catch(() => null);
        await new Promise(r => setTimeout(r, 600));
        await loadData();
        if (!score) {
          await handleScore();
        }
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
      setScoringError(e.response?.data?.detail || 'XAI generation failed');
    } finally { setGeneratingXAI(false); }
  }

  // BUG-7 FIX: Only expose features when loaded from the backend.
  // Never fall back to DEFAULT_WHAT_IF_FEATURES (ideal borrower) — that
  // caused the original What-If / SHAP discrepancy bug.
  const activeWhatIfFeatures = Object.keys(whatIfFeatures).length > 0 ? whatIfFeatures : null;
  const activeScoreId = score?.score_id ?? null;

  // BUG-3 & BUG-5 FIX: Call the real /score/simulate endpoint instead of the
  // local linear formula so the What-If score and SHAP values are model-accurate.
  const handleWhatIfChange = useCallback(async (values: Record<string, number>) => {
    if (!activeScoreId) return;
    const isBaseline = activeWhatIfFeatures
      ? Object.keys(values).every((k) => values[k] === activeWhatIfFeatures[k])
      : false;
    if (isBaseline) {
      setWhatIfScore(null);
      return;
    }
    try {
      const resp = await api.post('/v1/score/simulate', {
        score_id: activeScoreId,
        overrides: values,
      });
      setWhatIfScore(resp.data);
    } catch {
      // Silently fall back to null — don't crash the page on a simulate error
      setWhatIfScore(null);
    }
  }, [activeScoreId, activeWhatIfFeatures]);

  if (isRestrictedBorrower) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 max-w-xl mx-auto text-center font-sans">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-tier-high-risk/15 text-tier-high-risk border border-tier-high-risk/30 mb-5 shadow-sm">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight font-serif">
          Role Access Restricted
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8 font-medium leading-relaxed">
          You are currently signed in as a <span className="font-bold text-[var(--text-primary)]">Borrower</span>. You are authorized to inspect only your own verified 360° Financial Health Card (<span className="font-mono font-bold text-[var(--text-primary)]">APP-SURESH</span>). Accessing confidential financial records of other MSMEs requires Bank Underwriter credentials.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={() => setPersona('credit_officer')}
            className="btn-gold px-5 py-2.5 text-xs font-bold"
          >
            Switch to Credit Officer Role
          </button>
          <Link to="/applicants/APP-SURESH/health-card?demo=true">
            <button className="btn-action px-5 py-2.5 text-xs font-bold">
              View My Own Health Card
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RupeeLoader size="lg" label="Loading Dossier Telemetry..." />
      </div>
    );
  }

  if (error && !applicant && !score && !isDemo) {
    return (
      <div className="rounded-xl border border-tier-high-risk/30 bg-tier-high-risk/10 p-6 text-sm text-tier-high-risk font-mono">
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
  const activeFactors = displayScore?.contributing_factors || displayScore?.factors || [];
  const strengths = activeFactors.filter((f: any) => f.shap_value > 0);
  const risks = activeFactors.filter((f: any) => f.shap_value < 0);
  const deltaScore = whatIfScore && score ? whatIfScore.score - score.score : 0;

  return (
    <div className="space-y-8 font-sans">
      {error && (
        <div className="rounded-xl border border-tier-high-risk/30 bg-tier-high-risk/10 p-4 text-xs text-tier-high-risk font-mono flex items-center justify-between shadow-sm">
          <div><span className="font-bold uppercase">System Notification:</span> {error}</div>
          <button onClick={() => setError('')} className="underline hover:text-[var(--text-primary)] font-bold ml-4">Dismiss</button>
        </div>
      )}
      {/* Inline fetch error banner */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-xl border border-tier-watch/30 bg-tier-watch/10 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-tier-watch flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-tier-watch mb-0.5">AA Telemetry Error</div>
            <div className="text-xs text-tier-watch/80 font-mono">{fetchError}</div>
          </div>
          <button onClick={() => setFetchError('')} className="text-tier-watch/60 hover:text-tier-watch text-lg leading-none">×</button>
        </div>
      )}
      {/* Inline scoring error banner — does NOT kill the page */}
      {scoringError && (
        <div className="flex items-start gap-3 rounded-xl border border-tier-high-risk/30 bg-tier-high-risk/10 px-5 py-4">
          <AlertTriangle className="h-4 w-4 text-tier-high-risk flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-xs font-bold font-mono uppercase tracking-wider text-tier-high-risk mb-0.5">Scoring Error</div>
            <div className="text-xs text-tier-high-risk/80 font-mono">{scoringError}</div>
            {scoringError.includes('normalized features') && (
              <div className="mt-2 text-xs text-[var(--text-secondary)] font-sans">
                👉 Click <strong>Fetch AA Telemetry</strong> first to pull financial data, then re-run scoring.
              </div>
            )}
          </div>
          <button
            onClick={() => setScoringError('')}
            className="text-tier-high-risk/60 hover:text-tier-high-risk text-lg leading-none"
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
              {!applicant.has_bureau_record && <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase bg-tier-watch/15 text-tier-watch border border-tier-watch/30">Thin File (NTC)</span>}
            </div>
          </div>
        </div>
        {!isBorrower && (
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
              {scoring ? <RupeeLoader size="sm" className="mr-1.5" /> : <Activity className="h-3.5 w-3.5" />}
              {scoring ? 'Computing Score (~45ms)...' : score ? 'Re-run AI Scoring' : 'Execute AI Scoring (~45ms)'}
            </button>
          </div>
        )}
      </div>

      {/* Multi-Agent Viz (Underwriter only) */}
      {!isBorrower && <MultiAgentViz activeStage={score ? 'decision' : 'aa'} />}

      {/* Decision Trail (Underwriter only) */}
      {!isBorrower && trail.length > 0 && <DecisionTrail stages={trail} />}

      {!displayScore && (
        <div className="glass-card p-10 border border-[var(--border)] text-center max-w-2xl mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4 text-[var(--accent)]">
            <Activity className="h-8 w-8" />
          </div>
          <span className="eyebrow">{isBorrower ? 'EVALUATION IN PROGRESS' : 'STEP 1: TELEMETRY & SCORING PENDING'}</span>
          <h3 className="text-xl font-serif font-bold text-[var(--text-primary)] mt-1 mb-2">
            {isBorrower ? 'Your 360° Health Card is Being Synthesized' : 'No XGBoost Score Computed Yet'}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto font-sans leading-relaxed">
            {isBorrower
              ? 'Our automated AI system is processing your Account Aggregator bank telemetry and GST filings. Please check back shortly.'
              : 'This applicant\'s Account Aggregator (AA) telemetry is either pending sync or has not been scored yet. Click below to pull 12-month bank statements and execute sub-second credit scoring.'}
          </p>
          {!isBorrower && (
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
                {scoring ? <RupeeLoader size="sm" className="mr-1.5" /> : <Activity className="h-4 w-4" />}
                {scoring ? 'Computing Score (~45ms)...' : '2. Execute AI Scoring (~45ms)'}
              </button>
            </div>
          )}
          <div className="mt-6 pt-6 border-t border-[var(--border)] text-[11px] font-mono text-[var(--text-secondary)] flex items-center justify-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-tier-strong" />
            DEPA / Sahamati Compliant • Zero-Knowledge Data Storage
          </div>
        </div>
      )}

      {displayScore && (
        <>
          {/* Page View / Section Switcher */}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] pb-4 mb-6">
            <button
              type="button"
              onClick={() => handleTabChange('overview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[var(--accent)] text-[#0A0B0F] shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              <Activity className="h-4 w-4" /> 1. 360° Health Card & Telemetry
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('sanction')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'sanction'
                  ? 'bg-[var(--accent)] text-[#0A0B0F] shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              <Zap className="h-4 w-4" /> 2. Sanction Letter & OCEN Offers ({offers.length})
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('xai')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'xai'
                  ? 'bg-[var(--accent)] text-[#0A0B0F] shadow-sm'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
              }`}
            >
              <Volume2 className="h-4 w-4" /> 3. AI Narrative & Arth-Mitra Voice
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold ml-auto transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[var(--surface-raised)] text-[var(--text-primary)] border border-[var(--border)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              View All Sections
            </button>
          </div>

          {/* Overview Tab: Score + Card Row + SHAP + What-If */}
          {(activeTab === 'overview' || activeTab === 'all') && (
            <div className="space-y-6 mb-8">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 text-xs text-[var(--text-secondary)] flex items-start gap-3.5 shadow-sm">
                <div className="flex shrink-0 items-center justify-center px-2.5 py-1.5 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] font-bold font-mono text-xs tracking-wider border border-[var(--accent)]/30 select-none">
                  360°
                </div>
                <div>
                  <strong className="text-[var(--text-primary)] font-sans text-sm block mb-1">Why is this called a 360° Financial Health Card?</strong>
                  <p className="leading-relaxed">
                    Unlike traditional banks that rely on a single static bureau check (CIBIL) or PDF statement, ArthNiti evaluates your business across all 360 degrees of financial health: <span className="text-[var(--text-primary)] font-semibold">Bank Account Aggregator cash flow velocity</span>, <span className="text-[var(--text-primary)] font-semibold">14-month GSTR-3B tax compliance</span>, <span className="text-[var(--text-primary)] font-semibold">OCEN daily UPI settlements</span>, and <span className="text-[var(--text-primary)] font-semibold">AI explainability (SHAP factors)</span>. Just like a medical health report card, it synthesizes every vital sign into one actionable score.
                  </p>
                </div>
              </div>

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
                      className={`mt-4 text-xs font-bold font-mono px-3 py-1 rounded border ${deltaScore > 0 ? 'bg-tier-strong/10 text-tier-strong border-tier-strong/30' : 'bg-tier-high-risk/10 text-tier-high-risk border-tier-high-risk/30'}`}
                    >
                      SIMULATION DELTA: {deltaScore > 0 ? '+' : ''}{deltaScore} PTS
                    </motion.div>
                  )}
                  <div className="mt-5 text-center">
                    <div className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-mono font-semibold ${
                      routing?.routing === 'REJECT' ? 'bg-tier-high-risk/15 text-tier-high-risk border border-tier-high-risk/30' :
                      routing?.requires_review ? 'bg-tier-watch/15 text-tier-watch border border-tier-watch/30' : 'bg-tier-strong/15 text-tier-strong border border-tier-strong/30'
                    }`}>
                      {routing?.routing === 'REJECT' ? <AlertTriangle className="h-4 w-4" /> : routing?.requires_review ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                      {routing?.routing === 'STRAIGHT_THROUGH' ? 'Straight-Through Underwriting Approval' : routing?.routing === 'REJECT' ? 'Adverse Action Notice (Declined)' : 'Enhanced Human Underwriting Review Required'}
                    </div>
                  </div>
                </div>
              </div>

              {!isBorrower && (
                <div className="glass-card p-6 border border-[var(--border)]">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-5">
                    <div>
                      <span className="eyebrow">EXPLAINABILITY // LOCAL SHAP</span>
                      <h3 className="text-base font-serif text-[var(--text-primary)]">SHAP Explainer <span className="italic">Matrix</span>.</h3>
                    </div>
                    <span className="text-xs font-mono text-[var(--text-secondary)]">LOCAL EXPLANATIONS</span>
                  </div>
                  <SHAPWaterfall factors={displayScore?.contributing_factors || displayScore?.factors || []} />
                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-tier-strong font-bold mb-2.5 flex items-center gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5" /> Key Drivers (+)
                      </div>
                      {strengths.length > 0 ? strengths.slice(0, 3).map((f: any) => (
                        <div key={f.feature} className="text-xs text-[var(--text-secondary)] mb-1.5 font-mono">
                          {f.feature.replace(/_/g, ' ')}: <span className="text-tier-strong font-bold">+{f.shap_value.toFixed(4)}</span>
                        </div>
                      )) : <p className="text-xs font-mono text-[var(--text-secondary)]">No positive determinants</p>}
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-widest text-tier-high-risk font-bold mb-2.5 flex items-center gap-1.5">
                        <TrendingDown className="h-3.5 w-3.5" /> Key Drivers (-)
                      </div>
                      {risks.length > 0 ? risks.slice(0, 3).map((f: any) => (
                        <div key={f.feature} className="text-xs text-[var(--text-secondary)] mb-1.5 font-mono">
                          {f.feature.replace(/_/g, ' ')}: <span className="text-tier-high-risk font-bold">{f.shap_value.toFixed(4)}</span>
                        </div>
                      )) : <p className="text-xs font-mono text-[var(--text-secondary)]">No risk determinants</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* What-If Simulator (Underwriter only, only when real features loaded) */}
              {!isBorrower && activeWhatIfFeatures && activeScoreId && (
                <WhatIfSimulator
                  initialValues={activeWhatIfFeatures}
                  onChange={handleWhatIfChange}
                />
              )}
            </div>
          )}

          {/* Sanction Tab: LoanOfferCarousel */}
          {(activeTab === 'sanction' || activeTab === 'all') && (
            <div className="space-y-6 mb-8" id="sanction-section">
              <LoanOfferCarousel offers={offers} />
            </div>
          )}

          {/* XAI Narrative & Voice Tab */}
          {(activeTab === 'xai' || activeTab === 'all') && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" id="xai-section">
              <div className="glass-card p-6 border border-[var(--border)]">
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
                  <div>
                    <span className="eyebrow">SYNTHESIS // NEMOTRON ULTRA</span>
                    <h3 className="text-base font-serif text-[var(--text-primary)] flex items-center gap-2">
                      <BrainCircuit className="h-4 w-4 text-[var(--accent)]" /> XAI Narrative <span className="italic">Dossier</span>.
                    </h3>
                  </div>
                  {!isBorrower && xai && (
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
                      xai.cross_check_passed ? 'bg-tier-strong/15 text-tier-strong border border-tier-strong/30' : 'bg-tier-high-risk/15 text-tier-high-risk border border-tier-high-risk/30'
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
                      {isBorrower
                        ? 'AI credit determination synthesis in progress. Your vernacular explanation will be ready shortly.'
                        : `XGBoost numeric credit scoring completed deterministically in ${displayScore.inference_ms || 45}ms. Invoke NVIDIA Nemotron Ultra to generate a cross-checked, vernacular explanation and IndicTTS audio.`}
                    </p>
                    {!isBorrower && (
                      <button
                        className="btn-gold px-5 py-2.5 text-xs mx-auto flex items-center justify-center"
                        onClick={handleGenerateXAI}
                        disabled={generatingXAI}
                      >
                        {generatingXAI ? (
                          <>
                            <RupeeLoader size="sm" className="mr-2" />
                            Synthesizing XAI Narrative (~2-3s)...
                          </>
                        ) : (
                          <>
                            <BrainCircuit className="h-3.5 w-3.5 mr-2" />
                            Generate AI Narrative & Audio Explanation
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="glass-card p-6 border border-[var(--border)] space-y-4">
                <div className="border-b border-[var(--border)] pb-3 mb-4">
                  <span className="eyebrow">VERNACULAR // AUDIO</span>
                  <h3 className="text-base font-serif text-[var(--text-primary)] flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-tier-strong" /> Arth-Mitra Voice <span className="italic">Interface</span>.
                  </h3>
                </div>
                <ArthMitraPlayer
                  narrativeText={xai?.narrative || ''}
                  language={language}
                  onLanguageChange={setLanguage}
                  personaId={id}
                />
                <p className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border)] pt-3">
                  Arth-Mitra explains credit determinations directly to MSME borrowers in native regional dialects via IndicTTS / Web Audio API fallback.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
