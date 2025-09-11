import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import DepartmentSelection from './pages/DepartmentSelection'
import FullView from './pages/FullView'
import { moduleRegistry } from './lib/moduleRegistry'

// No static module loading - modules will be loaded dynamically by AI agent

function App() {
  useEffect(() => {
    // In production, AI agents would load modules from your backend here
    // Example: 
    // import { registerModule } from './lib/moduleLoader'
    // registerModule(SalesComponent, salesManifest)
    
    // For testing: Expose moduleRegistry to window for dynamic loading
    if (typeof window !== 'undefined') {
      window.moduleRegistry = moduleRegistry
    }
  }, [])

  const renderModuleRoute = (path: string, moduleId: string) => {
    const module = moduleRegistry.getModule(moduleId)
    if (module) {
      const Component = module.component
      return <Route path={`${path}/*`} element={<Component />} />
    } else {
      const Placeholder = moduleRegistry.getPlaceholderComponent(path)
      return <Route path={`${path}/*`} element={
        <Suspense fallback={<div>Loading...</div>}>
          <Placeholder />
        </Suspense>
      } />
    }
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<DepartmentSelection />} />
        <Route path="/full-view/*" element={<FullView />} />
        {renderModuleRoute('/sales', 'sales-module')}
        {renderModuleRoute('/warehouse', 'warehouse-module')}
        {renderModuleRoute('/shipping', 'shipping-module')}
        {renderModuleRoute('/customer-care', 'customer-care-module')}
      </Routes>
    </Router>
  )
}

export default App