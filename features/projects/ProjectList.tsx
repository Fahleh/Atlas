"use client";

import { useState, useMemo } from "react";
import { Plus, AlertCircle, Sparkles, SearchX } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import { useProject } from "@/providers/ProjectContext";
import { Skeleton } from "@/components/Skeleton";
import type { ProjectStatus } from "@/types/atlas.types";
import { ProjectStats } from "./ProjectStats";
import { ProjectCard } from "./ProjectCard";
import { ProjectListTable } from "./ProjectListTable";
import { ProjectSlideOver } from "./ProjectSlideOver";
import styles from "./ProjectList.module.css";

type StatusFilter = "all" | ProjectStatus;
type ViewMode = "grid" | "list";

const SKELETON_CARD_COUNT = 6;

const STATUS_FILTERS: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
  { label: "Archived", value: "archived" },
];

/**
 * Full projects page content: stats, search/filter toolbar, card grid,
 * and slide-over panel. Orchestrates useProjects() and useProject() context.
 */
export function ProjectList() {
  const { data: projects = [], isLoading, isError, refetch } = useProjects();
  const { selectedProject, setSelectedProject } = useProject();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  // TODO: replace with create modal implementation
  const [, setIsCreateModalOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        query === "" ||
        project.name.toLowerCase().includes(query) ||
        (project.description ?? "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const hasNoProjects = !isLoading && !isError && projects.length === 0;
  const hasNoResults =
    !isLoading &&
    !isError &&
    projects.length > 0 &&
    filteredProjects.length === 0;
  const showGrid = !isLoading && !isError && filteredProjects.length > 0;

  return (
    <div className={styles.pageContainer}>
      {/* Page header */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className={styles.newButton}
        >
          <Plus size={16} aria-hidden="true" />
          New project
        </button>
      </div>

      {/* Stats bar — shown only after successful load */}
      {!isLoading && !isError && <ProjectStats projects={projects} />}

      {/* Toolbar: search, status filter, view toggle */}
      <div className="flex items-center gap-4 flex-wrap">
        <label htmlFor="project-search" className={styles.srOnly}>
          Search projects
        </label>
        <input
          id="project-search"
          type="search"
          className={styles.searchInput}
          placeholder="Search projects by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        <div
          role="tablist"
          aria-label="Filter projects by status"
          className={styles.filterTabs}
        >
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              role="tab"
              aria-selected={statusFilter === filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`${styles.filterTab} ${
                statusFilter === filter.value ? styles.filterTabActive : ""
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div role="group" aria-label="View mode" className={styles.viewToggle}>
          <button
            type="button"
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => setViewMode("grid")}
            className={`${styles.viewButton} ${
              viewMode === "grid" ? styles.viewButtonActive : ""
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => setViewMode("list")}
            className={`${styles.viewButton} ${
              viewMode === "list" ? styles.viewButtonActive : ""
            }`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="1" y="2" width="14" height="2" rx="1" />
              <rect x="1" y="7" width="14" height="2" rx="1" />
              <rect x="1" y="12" width="14" height="2" rx="1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          aria-label="Loading projects"
        >
          {Array.from({ length: SKELETON_CARD_COUNT }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonCardHeader}>
                <Skeleton
                  width="36px"
                  height="36px"
                  borderRadius="var(--radius-md)"
                />
                <Skeleton
                  width="80px"
                  height="1.25rem"
                  borderRadius="var(--radius-pill)"
                />
              </div>
              <div className={styles.skeletonCardBody}>
                <Skeleton width="70%" height="1rem" />
                <Skeleton width="100%" height="0.75rem" />
                <Skeleton width="55%" height="0.75rem" />
              </div>
              <Skeleton
                width="100%"
                height="4px"
                borderRadius="var(--radius-pill)"
              />
              <div className={styles.skeletonAvatars}>
                <Skeleton
                  width="28px"
                  height="28px"
                  borderRadius="var(--radius-pill)"
                />
                <Skeleton
                  width="28px"
                  height="28px"
                  borderRadius="var(--radius-pill)"
                />
                <Skeleton
                  width="28px"
                  height="28px"
                  borderRadius="var(--radius-pill)"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className={styles.stateContainer} role="alert">
          <AlertCircle
            size={48}
            className={`${styles.stateIcon} ${styles.stateIconDanger}`}
            aria-hidden="true"
          />
          <p className={styles.stateMessage}>Failed to load projects.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className={styles.retryButton}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state — no projects exist */}
      {hasNoProjects && (
        <div className={styles.stateContainer}>
          <Sparkles size={48} className={styles.stateIcon} aria-hidden="true" />
          <p className={styles.stateMessage}>No projects yet.</p>
          <p className={styles.stateSubtitle}>
            Create your first project to get started.
          </p>
        </div>
      )}

      {/* Empty state — search/filter returned no results */}
      {hasNoResults && (
        <div className={styles.stateContainer}>
          <SearchX size={48} className={styles.stateIcon} aria-hidden="true" />
          <p className={styles.stateMessage}>No projects match your search.</p>
        </div>
      )}

      {/* Project grid */}
      {showGrid && viewMode === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSelect={setSelectedProject}
            />
          ))}
        </div>
      )}

      {/* Project list (table view) */}
      {showGrid && viewMode === "list" && (
        <ProjectListTable
          projects={filteredProjects}
          onSelect={setSelectedProject}
        />
      )}

      {/* Slide-over panel — always in DOM, CSS-controlled visibility */}
      <ProjectSlideOver
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </div>
  );
}
