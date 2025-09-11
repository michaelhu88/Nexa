import DepartmentCard from '../components/DepartmentCard'
import { Crown, Plus, Briefcase, Package, Truck, Headphones } from 'lucide-react'
import { moduleRegistry } from '../lib/moduleRegistry'

export default function DepartmentSelection() {
  // Get all registered modules
  const modules = moduleRegistry.getEnabledModules()
  
  // Convert modules to department format
  const moduleDepartments = modules.map(module => {
    const iconMap = {
      'Briefcase': Briefcase,
      'Package': Package,
      'Truck': Truck,
      'Headphones': Headphones
    }
    
    const IconComponent = iconMap[module.manifest.icon] || Package
    
    return {
      icon: <IconComponent className={`w-16 h-16 ${module.manifest.iconColor || 'text-gray-500'}`} />,
      title: module.manifest.name,
      description: module.manifest.description,
      path: module.manifest.route
    }
  })

  // Full View is always available (part of base template)
  const fullViewDepartment = {
    icon: <Crown className="w-16 h-16 text-yellow-500" />,
    title: 'Full View',
    description: 'Complete access to all systems and data',
    path: '/full-view'
  }

  // Available department placeholders (shown when no modules loaded)
  const availableModulePreviews = [
    {
      icon: <Plus className="w-16 h-16 text-gray-400" />,
      title: 'Sales Department',
      description: 'Customer interactions, orders, and sales analytics',
      path: '#',
      isPlaceholder: true
    },
    {
      icon: <Plus className="w-16 h-16 text-gray-400" />,
      title: 'Warehouse Manager',
      description: 'Inventory management, stock levels, and warehouse operations',
      path: '#',
      isPlaceholder: true
    },
    {
      icon: <Plus className="w-16 h-16 text-gray-400" />,
      title: 'Shipping Department',
      description: 'Order fulfillment, shipping, and delivery tracking',
      path: '#',
      isPlaceholder: true
    },
    {
      icon: <Plus className="w-16 h-16 text-gray-400" />,
      title: 'Customer Care',
      description: 'Customer support, returns, and issue resolution',
      path: '#',
      isPlaceholder: true
    }
  ]

  const hasModules = moduleDepartments.length > 0
  const allDepartments = [fullViewDepartment, ...moduleDepartments]
  const displayModules = hasModules ? [] : availableModulePreviews

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold text-center text-gray-900 mb-4">
          Automating Your Enterprise
        </h1>
        <p className="text-lg text-center text-gray-600 mb-12">
          {hasModules 
            ? 'Choose your department to access the appropriate admin interface'
            : 'Add modules to expand your admin dashboard capabilities'
          }
        </p>
        
        {/* Active Departments */}
        {hasModules && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {allDepartments.slice(0, 3).map((dept) => (
                <DepartmentCard key={dept.path} {...dept} />
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {allDepartments.slice(3).map((dept) => (
                <DepartmentCard key={dept.path} {...dept} />
              ))}
            </div>
          </>
        )}

        {/* Full View when no modules */}
        {!hasModules && (
          <div className="grid grid-cols-1 gap-6 mb-12 max-w-md mx-auto">
            <DepartmentCard {...fullViewDepartment} />
          </div>
        )}
        
        {/* Available Modules Preview */}
        {!hasModules && (
          <div className="mt-16">
            <h2 className="text-2xl font-semibold text-center text-gray-800 mb-8">
              Available Department Modules
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Install department modules to unlock specialized admin interfaces
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto opacity-60">
              {displayModules.map((module, index) => (
                <div 
                  key={index}
                  className="bg-white p-6 rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors cursor-not-allowed"
                >
                  <div className="flex flex-col items-center text-center">
                    {module.icon}
                    <h3 className="text-xl font-semibold text-gray-700 mt-4 mb-2">
                      {module.title}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {module.description}
                    </p>
                    <div className="mt-4 px-4 py-2 bg-gray-100 text-gray-500 text-sm rounded-lg">
                      Module not installed
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}