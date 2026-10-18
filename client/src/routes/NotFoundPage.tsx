import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-slate-600">That URL does not match anything in this app.</p>
      <Link to="/contacts" className="inline-block text-sm font-medium text-slate-900 underline">
        Go to contacts
      </Link>
    </div>
  )
}
