import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface OperatorContextType {
  isOperator: boolean;
  operatorKey: string | null;
  login: (key: string) => boolean;
  logout: () => void;
}

const OperatorContext = createContext<OperatorContextType | null>(null);

// Simple operator keys for demo (in production, use proper auth)
const VALID_OPERATOR_KEYS = [
  'operator-demo-2024',
  'soltok-admin',
  'bridge-operator',
];

export const OperatorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOperator, setIsOperator] = useState(() => {
    const saved = localStorage.getItem('soltok_operator');
    return saved ? VALID_OPERATOR_KEYS.includes(saved) : false;
  });
  const [operatorKey, setOperatorKey] = useState<string | null>(() => {
    const saved = localStorage.getItem('soltok_operator');
    return saved && VALID_OPERATOR_KEYS.includes(saved) ? saved : null;
  });

  const login = useCallback((key: string): boolean => {
    if (VALID_OPERATOR_KEYS.includes(key)) {
      setIsOperator(true);
      setOperatorKey(key);
      localStorage.setItem('soltok_operator', key);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setIsOperator(false);
    setOperatorKey(null);
    localStorage.removeItem('soltok_operator');
  }, []);

  return (
    <OperatorContext.Provider value={{ isOperator, operatorKey, login, logout }}>
      {children}
    </OperatorContext.Provider>
  );
};

export const useOperator = () => {
  const context = useContext(OperatorContext);
  if (!context) {
    throw new Error('useOperator must be used within OperatorProvider');
  }
  return context;
};

export default OperatorContext;
