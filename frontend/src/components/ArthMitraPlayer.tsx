import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi' },
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
];

interface ArthMitraPlayerProps {
  audioUrl?: string;
  narrativeText: string;
  language: string;
  onLanguageChange: (lang: string) => void;
  isLoading?: boolean;
  personaId?: string;
  isFallback?: boolean;
}

// Pre-generated narratives for hackathon demo personas
export const HINDI_NARRATIVES: Record<string, string> = {
  "APP-RAMESH": "Ramesh ji, aapka financial health score 72 hai. Ye ADEQUATE tier hai. Aapki monthly income stable hai, aur payment timing bhi consistent hai. GST filing 60% hai — theek hai par aur behtar ho sakta hai. 90 din mein ek bounce dikha hai — chhoti si chinta. Cash flow overall theek hai, working capital loan ke liye sidha approval mil sakta hai.",
  "APP-PRIYA": "Priya ji, aapka score 85 hai — ye STRONG tier hai. Aapka business bahut disciplined hai: GST filing 95% hai, zero bounces, closing balance ₹92K strong hai, aur payroll 8% badh raha hai. Monthly income ₹3.85L stable hai. Ye bilkul best credit profile hai — sidha approval eligible hai.",
  "APP-VIKRAM": "Vikram sahab, aapka score 45 hai — ye WATCH tier hai. Aapki income bahut unstable hai (65% volatility), 90 din mein 4 din negative balance, aur 3 bounces hain. GST filing 45% ho gayi hai, aur turnover bhi 3% ghat raha hai. Transaction count achha hai bas. Human officer review zaroori hai. Collateral maangna chahiye, ya loan ₹3L tak limit karna chahiye.",
  "APP-ANITA": "Anita ji, aapka score 28 hai — ye HIGH RISK tier hai. Aapka profile bahut stressed hai: 90 din mein 5 bounces, 7 din negative balance, aur EMI-to-income 55% hai jo bahut zyada hai. Income volatility 78% hai, aur GST compliance 25% tak ghat gayi hai. Aap over-leveraged hain. Human officer review zaroori hai. Loan decline karna chahiye, ya bahut kam amount aur strict collateral ke saath.",
  "APP-SURESH": "Suresh ji, aapka score 61 hai — ye ADEQUATE tier hai. Aapka electronics retail business solid hai, monthly income ₹2.15L hai, aur GST compliance 80% achhi hai. Closing balance ₹42K hai jo safety buffer hai. Main risk volatility 45% hai — seasonal demand lagta hai. Ek bounce acceptable hai. Sidha approval recommended hai, par credit officer ko seasonal pattern monitor karna chahiye.",
};

export const ENGLISH_NARRATIVES: Record<string, string> = {
  "APP-RAMESH": "Ramesh's Financial Health Score is 72 (ADEQUATE). His monthly income is stable at ₹1.42L with consistent payment timing. GST filing regularity at 60% is a moderate strength, though there is room for improvement. One bounce in the last 90 days is a minor risk factor. Overall, his cash-flow profile supports straight-through approval for working-capital credit.",
  "APP-PRIYA": "Priya's Financial Health Score is 85 (STRONG). Her business demonstrates exceptional financial discipline: 95% GST filing regularity, zero bounces, strong closing balance buffer at ₹92K, and a growing payroll trend of 8% YoY. Monthly inflow of ₹3.85L is highly stable. This is a textbook creditworthy profile with straight-through approval eligibility.",
  "APP-VIKRAM": "Vikram's Financial Health Score is 45 (WATCH). His income is highly volatile at 65% coefficient, with 4 days of negative balance and 3 bounces in the last 90 days. GST filing has dropped to 45% and turnover declined 3% YoY. Transaction velocity is the only positive signal. Enhanced human review is required before any credit decision.",
  "APP-ANITA": "Anita's Financial Health Score is 28 (HIGH RISK). This profile exhibits severe credit stress: 5 bounces in 90 days, 7 days of negative balance, and an EMI-to-income ratio of 55% which is critically high. Income volatility is extreme at 78%, and GST compliance has deteriorated to 25%. This applicant is currently over-leveraged and requires immediate human officer review.",
  "APP-SURESH": "Suresh's Financial Health Score is 61 (ADEQUATE). He runs a solid electronics retail business with ₹2.15L monthly inflow and good GST compliance at 80%. Closing balance of ₹42K provides a decent buffer. The main risk factor is income volatility at 45%, which suggests seasonal demand fluctuations. One bounce is within acceptable limits. Straight-through approval is recommended.",
};

export default function ArthMitraPlayer({ audioUrl, narrativeText, language, onLanguageChange, isLoading }: ArthMitraPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setFallback(true);
        useBrowserTTS();
      });
    }
  }, [audioUrl]);

  const useBrowserTTS = () => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(narrativeText);
      utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      setFallback(true);
    }
  };

  const togglePlay = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(() => useBrowserTTS());
      }
    } else {
      useBrowserTTS();
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[1];

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-page)]/50">
      <div className="flex items-center gap-4">
        {/* Play button */}
        <button
          onClick={togglePlay}
          disabled={isLoading}
          className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-emerald)]/15 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald)]/25 transition-all border border-[var(--accent-emerald)]/40 shrink-0"
        >
          {isLoading ? (
            <motion.div className="w-4 h-4 border-2 border-[var(--accent-emerald)] border-t-transparent rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </button>

        {/* Waveform */}
        <div className="flex-1 flex items-center gap-[3px] h-10 overflow-hidden">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-[var(--accent-emerald)]/70"
              animate={
                isPlaying
                  ? { height: [6, 28 + Math.random() * 12, 6] }
                  : { height: 6 }
              }
              transition={{
                duration: 0.4 + Math.random() * 0.3,
                repeat: isPlaying ? Infinity : 0,
                repeatType: 'reverse',
                delay: i * 0.04,
              }}
            />
          ))}
        </div>

        {/* Language selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowLangDropdown(!showLangDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-xs font-mono font-bold uppercase text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-all"
          >
            <Globe className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
            {currentLang.label}
          </button>
          <AnimatePresence>
            {showLangDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute right-0 top-full mt-1 py-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-xl z-50 min-w-[120px]"
              >
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      onLanguageChange(l.code);
                      setShowLangDropdown(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${l.code === language ? 'text-[var(--accent-emerald)] font-bold bg-[var(--border-subtle)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                  >
                    {l.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {fallback && (
        <div className="mt-3 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[var(--accent-amber)] border-t border-[var(--border-subtle)] pt-2.5">
          <Volume2 className="h-3 w-3" />
          Native Speech API Fallback Active
        </div>
      )}

      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
