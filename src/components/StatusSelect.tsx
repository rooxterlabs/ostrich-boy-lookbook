import type { WorkflowStatus } from '../models/lookbook'

export function StatusSelect({ value, onChange }: { value: WorkflowStatus; onChange: (value: WorkflowStatus) => void }) {
  return (
    <label className="status-field">
      <span>Status</span>
      <select value={value} onChange={(event) => onChange(event.target.value as WorkflowStatus)}>
        <option value="draft">Draft</option>
        <option value="submitted">Submitted</option>
        <option value="approved">Approved</option>
      </select>
    </label>
  )
}
