import { Navigate, useParams } from 'react-router-dom'

export function WorkflowEditPage() {
  const { id } = useParams()

  if (!id) {
    return <Navigate to="/workflows" replace />
  }

  return <Navigate to={`/workflows/${id}/studio`} replace />
}