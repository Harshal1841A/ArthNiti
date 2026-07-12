import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Landmark, Wallet, ArrowRight, Check, CheckCircle2, Download, ShieldCheck, RefreshCw } from 'lucide-react';
import { lenderColor } from '@/lib/tierColors';
import { RupeeLoader } from '@/components/ui/RupeeLoader';
import { generateMandateReceiptPDF } from '@/lib/mandatePdf';

export interface LoanOffer {
  lender_name: string;
  lender_type: string;
  interest_rate_annual: number;
  tenure_months: number;
  max_amount: number;
  processing_fee_pct: number;
  emi: number;
  total_interest: number;
  disbursement_days: number;
  features: string[];
}

interface LoanOfferCarouselProps {
  offers: LoanOffer[];
  onSelectOffer?: (offer: LoanOffer) => void;
}

const LENDER_ICONS: Record<string, React.ReactNode> = {
  BANK: <Landmark className="h-4 w-4" />,
  COOP: <Building2 className="h-4 w-4" />,
  NBFC: <Wallet className="h-4 w-4" />,
};

export default function LoanOfferCarousel({ offers, onSelectOffer }: LoanOfferCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [acceptedBid, setAcceptedBid] = useState<LoanOffer | null>(null);
  const [bidStage, setBidStage] = useState<'idle' | 'signing' | 'disbursed'>('idle');
  const [mandateId, setMandateId] = useState<string>('');

  useEffect(() => {
    if (offers && offers.length > 0) {
      // If no bid is accepted yet, OR if the acceptedBid is not in the new offers list (persona changed)
      const isCurrentBidInOffers = acceptedBid && offers.some(o => o.lender_name === acceptedBid.lender_name);
      if (!acceptedBid || !isCurrentBidInOffers) {
        setSelectedIndex(0);
        setAcceptedBid(offers[0]);
        setBidStage('disbursed');
        setMandateId(`OCEN-MANDATE-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    } else {
      setAcceptedBid(null);
    }
  }, [offers]);

  const handleSelectBid = (offer: LoanOffer, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex(index);
    setAcceptedBid(offer);
    setBidStage('signing');
    setMandateId(`OCEN-MANDATE-${Math.floor(100000 + Math.random() * 900000)}`);
    
    if (onSelectOffer) {
      onSelectOffer(offer);
    }

    setTimeout(() => {
      setBidStage('disbursed');
    }, 800);
  };

  const handleDownloadReceipt = () => {
    if (!acceptedBid) return;
    generateMandateReceiptPDF(acceptedBid, mandateId);
  };

  return (
    <div className="glass-card p-6 border border-[var(--border)] flex flex-col justify-between space-y-6">
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight">OCEN Loan Marketplace</h3>
            <p className="text-xs font-sans text-[var(--text-secondary)] mt-0.5">Real-time credit protocol offers & instant e-sign mandates</p>
          </div>
          <span className="text-xs font-sans font-bold px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--border-subtle)] text-[var(--text-primary)]">
            {(offers || []).length} ACTIVE BIDS
          </span>
        </div>

        {!(offers && offers.length > 0) ? (
          <div className="text-center py-12 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] my-4">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-[var(--text-secondary)] opacity-40" />
            <h4 className="text-sm font-serif font-bold text-[var(--text-primary)] mb-1">No Active OCEN Loan Offers</h4>
            <p className="text-xs text-[var(--text-secondary)] font-sans max-w-xs mx-auto">
              Lenders on the Open Credit Enablement Network (OCEN) are awaiting score computation or credit risk verification before bidding.
            </p>
          </div>
        ) : (
          <div className="flex gap-5 overflow-x-auto pb-4 snap-x pt-1">
            {offers.map((offer, index) => {
              const isSelected = index === selectedIndex;
              const color = lenderColor(offer.lender_type);
              const isThisBidAccepted = acceptedBid?.lender_name === offer.lender_name;

              return (
                <motion.div
                  key={index}
                  onClick={(e) => handleSelectBid(offer, index, e)}
                  className={`flex-shrink-0 w-[290px] min-h-[380px] rounded-xl border p-5 cursor-pointer transition-all duration-300 snap-start flex flex-col justify-between ${
                    isSelected ? 'card-surface-elevated border-[var(--accent-emerald)]/70 ring-1 ring-[var(--accent-emerald)]/30' : 'card-surface-base hover:border-[var(--text-secondary)]'
                  }`}
                  whileHover={{ y: -3 }}
                  animate={isSelected ? { scale: 1.01 } : { scale: 1 }}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg border shadow-sm" style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}>
                          {LENDER_ICONS[offer.lender_type]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--text-primary)] tracking-tight font-sans">{offer.lender_name}</div>
                          <div className="text-xs font-sans text-[var(--text-secondary)] uppercase font-semibold">{offer.lender_type}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    {/* Rate */}
                    <div>
                      <div className="text-3xl font-bold font-mono tracking-tight leading-none" style={{ color }}>
                        {offer.interest_rate_annual}%
                      </div>
                      <div className="text-xs font-sans uppercase tracking-wider text-[var(--text-secondary)] mt-1 font-semibold">Annual Percentage Rate</div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                        <div className="text-[11px] font-sans uppercase text-[var(--text-secondary)] font-medium">Monthly EMI</div>
                        <div className="text-xs font-mono font-bold text-[var(--text-primary)]">₹{(offer.emi || 0).toLocaleString()}</div>
                      </div>
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                        <div className="text-[11px] font-sans uppercase text-[var(--text-secondary)] font-medium">Tenure</div>
                        <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{offer.tenure_months || 0} MO</div>
                      </div>
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                        <div className="text-[11px] font-sans uppercase text-[var(--text-secondary)] font-medium">Limit</div>
                        <div className="text-xs font-mono font-bold text-[var(--text-primary)]">₹{((offer.max_amount || 0) / 100000).toFixed(1)}L</div>
                      </div>
                      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                        <div className="text-[11px] font-sans uppercase text-[var(--text-secondary)] font-medium">Turnaround</div>
                        <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{offer.disbursement_days || 1} DAYS</div>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {offer.features.map((f, i) => (
                        <span key={i} className="text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-md border border-[var(--border)] bg-[var(--border-subtle)] text-[var(--text-secondary)] uppercase">{f}</span>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-4 mt-auto">
                    <button
                      type="button"
                      onClick={(e) => handleSelectBid(offer, index, e)}
                      className={`w-full py-3 rounded-xl text-xs font-sans font-extrabold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                        isThisBidAccepted && bidStage === 'disbursed'
                          ? 'bg-[var(--accent-emerald)] text-white font-extrabold shadow-lg ring-2 ring-[var(--accent-emerald)]/50'
                          : isThisBidAccepted && bidStage === 'signing'
                          ? 'bg-[var(--border-subtle)] text-[var(--accent)] font-extrabold animate-pulse'
                          : isSelected
                          ? 'bg-[var(--accent-emerald)] text-black font-extrabold shadow-lg hover:opacity-95'
                          : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                      }`}
                    >
                      {isThisBidAccepted && bidStage === 'signing' ? (
                        <>
                          <RupeeLoader size="sm" className="mr-1.5" /> Executing Mandate...
                        </>
                      ) : isThisBidAccepted && bidStage === 'disbursed' ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mandate Registered
                        </>
                      ) : (
                        <>
                          Select Protocol Bid <ArrowRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Interactive OCEN Protocol Acceptance Overlay / Dossier Card */}
      <AnimatePresence>
        {acceptedBid && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="rounded-xl border border-[var(--accent-emerald)]/50 bg-[var(--accent-emerald)]/5 p-5 font-sans space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-[var(--accent-emerald)]" />
                <div>
                  <h4 className="text-sm font-serif font-bold text-[var(--text-primary)]">
                    OCEN 4.0 Mandate Handshake — {acceptedBid.lender_name}
                  </h4>
                  <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                    Mandate ID: <span className="text-[var(--text-primary)] font-bold">{mandateId}</span> • ULI / AA Consent Locked
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-sans font-bold px-2.5 py-1 rounded-full bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] uppercase flex items-center gap-1">
                  {bidStage === 'signing' ? <RupeeLoader size="sm" /> : <Check className="h-3 w-3" />}
                  {bidStage === 'signing' ? 'Signing & Verifying...' : 'AA Mandate Executed'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--surface)] p-3.5 rounded-xl border border-[var(--border)]">
              <div>
                <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] block">Sanction Limit</span>
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">₹{((acceptedBid.max_amount || 0) / 100000).toFixed(2)} Lakhs</span>
              </div>
              <div>
                <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] block">Interest Rate</span>
                <span className="text-sm font-mono font-bold text-[var(--accent-emerald)]">{acceptedBid.interest_rate_annual || 0}% APR</span>
              </div>
              <div>
                <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] block">Tenure &amp; EMI</span>
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">₹{(acceptedBid.emi || 0).toLocaleString()} / {acceptedBid.tenure_months || 0}m</span>
              </div>
              <div>
                <span className="text-[10px] font-sans uppercase text-[var(--text-secondary)] block">Disbursement SLA</span>
                <span className="text-sm font-mono font-bold text-[var(--text-primary)]">{acceptedBid.disbursement_days || 1} Days (Direct Bank)</span>
              </div>
            </div>

            {bidStage === 'disbursed' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2"
              >
                <div className="text-xs font-sans text-[var(--text-secondary)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--accent-emerald)] animate-ping" />
                  Cryptographic AA e-Sign Verified. Funds scheduled for direct transfer via Account Aggregator rail.
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleDownloadReceipt}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-lg bg-[var(--accent-emerald)] text-black font-sans font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" /> Mandate Receipt (PDF)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAcceptedBid(null)}
                    className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-sans text-xs hover:bg-[var(--surface-raised)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Switch Offer
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
