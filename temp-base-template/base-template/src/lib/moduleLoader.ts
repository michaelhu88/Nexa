import { moduleRegistry } from './moduleRegistry'

// Helper function to dynamically load a module from imported code
export async function loadModuleFromCode(moduleCode: string, manifest: any): Promise<boolean> {
  try {
    // Create a blob URL from the module code
    const blob = new Blob([moduleCode], { type: 'application/javascript' })
    const moduleUrl = URL.createObjectURL(blob)
    
    // Dynamically import the module
    const module = await import(moduleUrl)
    
    // Clean up the blob URL
    URL.revokeObjectURL(moduleUrl)
    
    // Register the module
    if (module.default && manifest) {
      moduleRegistry.registerModule({
        manifest,
        component: module.default
      })
      return true
    }
    
    return false
  } catch (error) {
    console.error('Failed to load module from code:', error)
    return false
  }
}

// Helper function for AI agents to register modules directly
export function registerModule(component: any, manifest: any): boolean {
  try {
    moduleRegistry.registerModule({
      manifest,
      component
    })
    console.log(`✅ Module registered: ${manifest.name}`)
    return true
  } catch (error) {
    console.error('Failed to register module:', error)
    return false
  }
}

// Helper to check if module is loaded
export function isModuleLoaded(moduleId: string): boolean {
  return moduleRegistry.hasModule(moduleId)
}

// Helper to get all loaded modules
export function getLoadedModules() {
  return moduleRegistry.getEnabledModules()
}