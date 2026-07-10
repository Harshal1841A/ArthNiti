import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth, PersonaKey } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface PersonaGuardProps {
  allowedPersonas: PersonaKey[];
  children: React.ReactNode;
}

function BlockedScreen({
  message,
  showSwitchToOfficer,
}: {
  message: string;
  showSwitchToOfficer: boolean;
}) {
  const { setPersona } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8 max-w-xl mx-auto text-center font-sans">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 mb-5 shadow-sm">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
        Role Access Restricted
      </h2>
      <p className="text-sm text-[var(--text-secondary)] mb-8 font-medium leading-relaxed">
        {message}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        {/*
          Deliberately NOT offering a "switch to a more privileged persona"
          button here when the block is about applicant-ownership (viewing
          someone else's dossier) — letting the blocked user grant themselves
          access with one click defeats the point of the restriction. The
          section-level guard below (allowedPersonas) still offers it, since
          that block is about which *area* of the app a role sees, not about
          reading another business's confidential data — the two aren't the
          same kind of "restricted."
        */}
        {showSwitchToOfficer && (
          <Button variant="default" onClick={() => setPersona('credit_officer')} className="font-bold px-5">
            Switch to Underwriter Persona
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="font-bold px-5 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Return to Overview
        </Button>
      </div>
    </div>
  );
}

export default function PersonaGuard({ allowedPersonas, children }: PersonaGuardProps) {
  const { currentPersona } = useAuth();

  if (!allowedPersonas.includes(currentPersona)) {
    return (
      <BlockedScreen
        showSwitchToOfficer
        message={`You are currently signed in as ${currentPersona.replace('_', ' ')} (Borrower mode). This workspace section contains sensitive MSME credit risk evaluations, diagnostic OCEN pipelines, and human underwriting queues accessible only to authorized Bank Underwriters and Administrators.`}
      />
    );
  }

  return <>{children}</>;
}

/**
 * Guards /applicants/:id specifically. Role alone (allowedPersonas above)
 * only says whether a persona can reach the dossier-detail route at all —
 * it does not, and cannot, say *which* dossier. Without this, "Suresh Patel
 * (Applicant)" could navigate directly to any other business's URL and read
 * their full financial dossier, even with the nav link hidden and the
 * section-level guard satisfied. Role and ownership are different checks;
 * this was the one still missing.
 */
export function ApplicantOwnershipGuard({ children }: { children: React.ReactNode }) {
  const { user, currentPersona } = useAuth();
  const { id } = useParams<{ id: string }>();

  const isOwnRecord =
    currentPersona !== 'applicant' || (!!user.linkedApplicantId && user.linkedApplicantId === id);

  if (!isOwnRecord) {
    return (
      <BlockedScreen
        showSwitchToOfficer={false}
        message={`You're signed in as ${user.name} (Borrower mode), which only has access to your own MSME dossier (${user.linkedApplicantId ?? 'your linked application'}). Other businesses' financial records are confidential and not visible to this persona.`}
      />
    );
  }

  return <>{children}</>;
}
