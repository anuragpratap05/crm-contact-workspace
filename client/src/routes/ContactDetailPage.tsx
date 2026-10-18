import { Link, useParams } from 'react-router-dom'

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="space-y-4">
      <Link to="/contacts" className="text-sm font-medium text-slate-600 hover:text-slate-900">
        ← Back to contacts
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Contact</h1>
      <p className="text-sm text-slate-600">
        The detail view, edit form and conflict handling arrive in a later phase.
      </p>
      <p className="font-mono text-xs text-slate-500">{id}</p>
    </div>
  )
}
