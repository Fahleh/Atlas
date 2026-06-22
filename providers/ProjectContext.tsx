"use client";

import { Project } from "@/types/atlas.types";
import { createContext, useContext, useState, type ReactNode } from "react";

type ProjectContextValue = {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
};

type ProjectProviderProps = {
  children: ReactNode;
};

const ProjectContext = createContext<ProjectContextValue | undefined>(
  undefined,
);

/**
 * Provides global project state to the component tree.
 *
 * @param children - React subtree that will have access to project context
 */
export function ProjectProvider({ children }: ProjectProviderProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Returns the currently selected project and its setter function.
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
