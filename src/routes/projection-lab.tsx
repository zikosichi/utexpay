import { createFileRoute } from '@tanstack/react-router'

import { ProjectionLab } from '#/components/projection/ProjectionLab'

export const Route = createFileRoute('/projection-lab')({
  component: ProjectionLabPage,
})

function ProjectionLabPage() {
  return <ProjectionLab />
}
