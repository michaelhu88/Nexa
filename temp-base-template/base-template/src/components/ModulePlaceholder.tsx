import { AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ModulePlaceholderProps {
  routePath: string
}

export default function ModulePlaceholder({ routePath }: ModulePlaceholderProps) {
  const navigate = useNavigate()
  
  const departmentName = routePath.split('/')[1]?.replace('-', ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Department'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Module Not Loaded
        </h2>
        <p className="text-gray-600 mb-6">
          The {departmentName} module is not currently loaded. 
          This module needs to be installed separately.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Return to Department Selection
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}