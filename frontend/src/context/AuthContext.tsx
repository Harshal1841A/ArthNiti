import React, { createContext, useContext, useState } from 'react';

export type PersonaKey = 'admin' | 'credit_officer' | 'applicant';

export interface Persona {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'CREDIT_OFFICER' | 'APPLICANT';
  title: string;
}

export const PERSONAS: Record<PersonaKey, Persona> = {
  admin: {
    id: 'USR-ADMIN-01',
    email: 'admin@arthniti.in',
    name: 'Ananya Sharma',
    role: 'ADMIN',
    title: 'PoC Lead & Root Administrator',
  },
  credit_officer: {
    id: 'USR-OFFICER-01',
    email: 'officer@idbibank.in',
    name: 'Rajesh Verma',
    role: 'CREDIT_OFFICER',
    title: 'Senior MSME Credit Underwriter (IDBI Bank)',
  },
  applicant: {
    id: 'USR-MSME-01',
    email: 'msme@arthniti.in',
    name: 'Suresh Patel',
    role: 'APPLICANT',
    title: 'Proprietor, Patel Electronics & Co.',
  },
};

interface AuthContextType {
  user: Persona;
  currentPersona: PersonaKey;
  setPersona: (key: PersonaKey) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: PERSONAS.admin,
  currentPersona: 'admin',
  setPersona: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentPersona, setCurrentPersonaState] = useState<PersonaKey>(() => {
    try {
      const saved = localStorage.getItem('arthniti_demo_persona') as PersonaKey;
      if (saved && PERSONAS[saved]) return saved;
      const legacyRole = localStorage.getItem('arthniti_persona');
      if (legacyRole === 'borrower') return 'applicant';
      if (legacyRole === 'underwriter') return 'credit_officer';
      return 'admin';
    } catch {
      return 'admin';
    }
  });

  const setPersona = (key: PersonaKey) => {
    if (PERSONAS[key]) {
      setCurrentPersonaState(key);
      try {
        localStorage.setItem('arthniti_demo_persona', key);
        localStorage.setItem('arthniti_persona', key === 'applicant' ? 'borrower' : 'underwriter');
      } catch {}
    }
  };

  const user = PERSONAS[currentPersona];

  return (
    <AuthContext.Provider value={{ user, currentPersona, setPersona }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
