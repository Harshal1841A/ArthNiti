import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PersonaKey } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface PersonaGuardProps {
  allowedPersonas: PersonaKey[];
  children: React.ReactNode;
}

export default function PersonaGuard({ allowedPersonas, children }: PersonaGuardProps) {
  const { currentPersona, setPersona } = useAuth();
  const navigate = useNavigate();

  if (!allowedPersonas.includes(currentPersona)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] p-8 max-w-xl mx-auto text-center font-sans">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 mb-5 shadow-sm">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
          Role Access Restricted
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8 font-medium leading-relaxed">
          You are currently signed in as <span className="font-bold text-[var(--text-primary)] capitalize">{currentPersona.replace('_', ' ')}</span> (Borrower mode). This workspace section contains sensitive MSME credit risk evaluations, diagnostic OCEN pipelines, and human underwriting queues accessible only to authorized Bank Underwriters and Administrators.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          <Button
            variant="default"
            onClick={() => {
              setPersona('credit_officer');
            }}
            className="font-bold px-5"
          >
            Switch to Underwriter Persona
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/demo')}
            className="font-bold px-5 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Instant Loan Demo
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
