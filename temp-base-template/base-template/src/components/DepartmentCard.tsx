import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface DepartmentCardProps {
  icon: ReactNode
  title: string
  description: string
  path: string
}

export default function DepartmentCard({ icon, title, description, path }: DepartmentCardProps) {
  const navigate = useNavigate()

  return (
    <button
      onClick={() => navigate(path)}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-8 text-left border border-gray-100 hover:border-gray-200 group"
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-6xl group-hover:scale-110 transition-transform duration-200">
          {icon}
        </div>
        <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
    </button>
  )
}