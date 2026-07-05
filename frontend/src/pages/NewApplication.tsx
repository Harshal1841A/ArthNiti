import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'bn', label: 'Bengali' },
];

export default function NewApplication() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [hasBureau, setHasBureau] = useState(false);
  const [language, setLanguage] = useState('en');
  const [useAA, setUseAA] = useState(true);
  const [useDocumentFallback, setUseDocumentFallback] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const resp = await api.post('/v1/applicants', {
        business_name: businessName,
        has_bureau_record: hasBureau,
        preferred_language: language,
      });
      const applicant = resp.data;

      if (useDocumentFallback) {
        navigate(`/applicants/${applicant.id}`);
        return;
      }

      if (useAA) {
        await api.post('/v1/consent/request', {
          applicant_id: applicant.id,
          fi_types: ['DEPOSIT'],
          purpose: 'MSME credit underwriting — ArthNiti PoC',
          purpose_code: '101',
        });
      }

      navigate(`/applicants/${applicant.id}`);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to create application');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 font-sans">
      <div className="flex items-center gap-4 border-b border-[var(--border)] pb-6">
        <Link to="/applicants">
          <button className="h-10 w-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center hover:bg-[var(--surface-raised)] transition-all">
            <ArrowLeft className="h-4 w-4 text-[var(--text-primary)]" />
          </button>
        </Link>
        <div>
          <span className="eyebrow">ONBOARDING // DOSSIER INTAKE</span>
          <h1 className="text-3xl font-serif text-[var(--text-primary)]">New <span className="italic">Application</span>.</h1>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 border border-[var(--border)] p-4 rounded-xl bg-[var(--surface)] font-mono">
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-[var(--text-primary)] text-[var(--bg-page)]' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>1</div>
          Business Identity
        </div>
        <div className="h-px flex-1 bg-[var(--border)]" />
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-[var(--text-primary)] text-[var(--bg-page)]' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>2</div>
          Data Sources
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-5 text-sm text-[#F43F5E] flex items-start gap-3 font-mono">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="glass-card p-6 border border-[var(--border)] space-y-6">
            <div className="border-b border-[var(--border)] pb-4">
              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">Entity Credentials</h2>
              <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Enter core legal entity attributes</p>
            </div>
            
            <div className="space-y-5 font-sans">
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Business Name</label>
                <input
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  placeholder="e.g. Ramesh General Store & Co."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--text-primary)] transition-all font-serif font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Traditional Credit Bureau Footprint</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer transition-all ${hasBureau ? 'border-[var(--text-primary)] bg-[var(--surface-raised)] shadow-sm' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]'}`}>
                    <input
                      type="radio"
                      checked={hasBureau}
                      onChange={() => setHasBureau(true)}
                      className="h-4 w-4 accent-[var(--text-primary)]"
                    />
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">Bureau Footprint Present</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">Existing CIBIL/Experian history</div>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3.5 rounded-xl border p-4 cursor-pointer transition-all ${!hasBureau ? 'border-[var(--text-primary)] bg-[var(--surface-raised)] shadow-sm' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]'}`}>
                    <input
                      type="radio"
                      checked={!hasBureau}
                      onChange={() => setHasBureau(false)}
                      className="h-4 w-4 accent-[var(--text-primary)]"
                    />
                    <div>
                      <div className="text-sm font-bold text-[var(--text-primary)]">New-to-Credit (NTC / NTB)</div>
                      <div className="text-xs text-[var(--text-secondary)] mt-0.5">Thin file borrower / Alternate underwriting</div>
                    </div>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Preferred Voice & Explanation Language (Arth-Mitra)</label>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-primary)] font-mono font-semibold"
                >
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code} className="bg-[var(--surface)] text-[var(--text-primary)]">{l.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => setStep(2)} className="btn-gold">
                  Proceed to Data Topology →
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="glass-card p-6 border border-[var(--border)] space-y-6">
            <div className="border-b border-[var(--border)] pb-4">
              <h2 className="text-xl font-serif font-bold text-[var(--text-primary)] tracking-tight">Data Integration Protocol</h2>
              <p className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">Select real-time telemetry or document fallback adapters</p>
            </div>
            
            <div className="space-y-4 font-sans">
              <label className={`flex items-start gap-4 rounded-xl border p-5 cursor-pointer transition-all ${useAA ? 'border-[#10B981] bg-[#10B981]/10 shadow-md' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]'}`}>
                <input type="checkbox" checked={useAA} onChange={e => setUseAA(e.target.checked)} className="mt-1 h-4 w-4 accent-[#10B981]" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-[var(--text-primary)]">Account Aggregator Framework (AA)</div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">LIVE API</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Real Finvu sandbox integration. ReBIT-spec consent protocol with continuous bank telemetry normalization.
                  </div>
                </div>
              </label>
              
              <label className={`flex items-start gap-4 rounded-xl border p-5 cursor-pointer transition-all ${useDocumentFallback ? 'border-[#F59E0B] bg-[#F59E0B]/10 shadow-md' : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)]'}`}>
                <input type="checkbox" checked={useDocumentFallback} onChange={e => setUseDocumentFallback(e.target.checked)} className="mt-1 h-4 w-4 accent-[#F59E0B]" />
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-bold text-[var(--text-primary)]">Document Fallback Pipeline</div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30">ASYNC LLM</span>
                  </div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Upload unstructured PDF financial statements or GST returns for thin-file applicants with zero API footprint.
                  </div>
                </div>
              </label>

              <div className="flex justify-between pt-4 border-t border-[var(--border)]">
                <button type="button" onClick={() => setStep(1)} className="btn-action">
                  ← Back
                </button>
                <button type="submit" disabled={submitting} className="btn-gold disabled:opacity-50">
                  {submitting ? 'Initiating Pipeline...' : 'Generate AI Dossier'}
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
