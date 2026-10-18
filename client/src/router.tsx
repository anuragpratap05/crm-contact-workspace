import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import ContactDetailPage from '@/routes/ContactDetailPage'
import ContactsPage from '@/routes/ContactsPage'
import NotFoundPage from '@/routes/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/contacts" replace /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'contacts/:id', element: <ContactDetailPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
