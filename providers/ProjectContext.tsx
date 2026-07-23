"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type ProjectContextValue = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
};

type ProjectProviderProps = {
  children: ReactNode;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined,
);

/**
 * Provides the selected project ID to the component tree.
 * Consumers derive the live Project object from their own query data using
 * this ID, so the slide-over always reflects the current React Query cache
 * rather than a stale point-in-time snapshot.
 *
 * @param children - React subtree that will have access to project context
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  return (
    <ProjectContext.Provider value={{ selectedProjectId, setSelectedProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Returns the selected project ID and its setter.
 * Must be used inside a ProjectProvider.
 * @returns ProjectContextValue
 */
export function useProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);

  if (ctx === undefined) {
    throw new Error("useProject must be used within a ProjectProvider");
  }

  return ctx;
}
