"use client";

import { createContext, useContext } from "react";

interface EmployeeContextType {
  onDelete: (id: string) => void;
  onDuplicate: (id: string, currentData: any) => void;
  onInfo: (id: string) => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(
  undefined,
);

export function EmployeeProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: EmployeeContextType;
}) {
  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployeeContext() {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error(
      "useEmployeeContext must be used within an EmployeeProvider",
    );
  }
  return context;
}
