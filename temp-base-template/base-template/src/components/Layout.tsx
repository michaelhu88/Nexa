import { ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  title: string
}

export default function Layout({ children, title }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {location.pathname !== '/' && (
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              )}
              <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}