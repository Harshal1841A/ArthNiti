import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Landmark, Wallet, ArrowRight, Check } from 'lucide-react';

interface LoanOffer {
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
}

const LENDER_ICONS: Record<string, React.ReactNode> = {
  BANK: <Landmark className="h-4 w-4" />,
  COOP: <Building2 className="h-4 w-4" />,
  NBFC: <Wallet className="h-4 w-4" />,
};

const LENDER_COLORS: Record<string, string> = {
  BANK: '#3B82F6',
  COOP: '#10B981',
  NBFC: '#F59E0B',
};

export default function LoanOfferCarousel({ offers }: LoanOfferCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="glass-card p-6 border border-[var(--border)] flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4 mb-4">
          <div>
            <h3 className="text-lg font-serif font-bold text-[var(--text-primary)] tracking-tight">OCEN Loan Marketplace</h3>
            <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">Real-time credit protocol offers</p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded border border-[var(--border)] bg-[var(--border-subtle)] text-[var(--text-primary)]">{offers.length} ACTIVE BIDS</span>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {offers.map((offer, index) => {
            const isSelected = index === selectedIndex;
            const color = LENDER_COLORS[offer.lender_type] || '#64748B';

            return (
              <motion.div
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`flex-shrink-0 w-[270px] rounded-xl border p-5 cursor-pointer transition-all duration-300 snap-start flex flex-col justify-between ${
                  isSelected ? 'border-[var(--accent-emerald)]/60 bg-[var(--accent-emerald)]/5 shadow-md' : 'border-[var(--border)] bg-[var(--bg-page)] hover:border-[var(--border-subtle)]'
                }`}
                whileHover={{ y: -3 }}
                animate={isSelected ? { scale: 1.01 } : { scale: 1 }}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-8 h-8 rounded border" style={{ borderColor: `${color}40`, backgroundColor: `${color}15`, color }}>
                        {LENDER_ICONS[offer.lender_type]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--text-primary)] tracking-tight">{offer.lender_name}</div>
                        <div className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">{offer.lender_type}</div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center justify-center w-6 h-6 rounded bg-[var(--accent-emerald)]/20 text-[var(--accent-emerald)]">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Rate */}
                  <div className="mb-4">
                    <div className="text-3xl font-bold font-mono tracking-tight" style={{ color }}>
                      {offer.interest_rate_annual}%
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-secondary)]">Annual Percentage Rate</div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                      <div className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Monthly EMI</div>
                      <div className="text-xs font-mono font-bold text-[var(--text-primary)]">₹{offer.emi.toLocaleString()}</div>
                    </div>
                    <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                      <div className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Tenure</div>
                      <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{offer.tenure_months} MO</div>
                    </div>
                    <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                      <div className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Limit</div>
                      <div className="text-xs font-mono font-bold text-[var(--text-primary)]">₹{(offer.max_amount / 100000).toFixed(1)}L</div>
                    </div>
                    <div className="rounded border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
                      <div className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Turnaround</div>
                      <div className="text-xs font-mono font-bold text-[var(--text-primary)]">{offer.disbursement_days} DAYS</div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {offer.features.slice(0, 2).map((f, i) => (
                      <span key={i} className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--border-subtle)] text-[var(--text-secondary)] uppercase">{f}</span>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                <button className={`w-full py-2.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-[var(--accent-emerald)] text-black font-bold shadow-sm'
                    : 'border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)]'
                }`}>
                  Select Protocol Bid <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
