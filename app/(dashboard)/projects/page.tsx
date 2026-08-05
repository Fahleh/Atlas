import { Suspense } from "react";
import { ProjectList } from "@/features/projects/ProjectList";

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectList />
    </Suspense>
  );
}
