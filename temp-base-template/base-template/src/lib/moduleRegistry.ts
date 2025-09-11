import { ComponentType, lazy } from 'react'

export interface ModuleManifest {
  id: string
  name: string
  version: string
  route: string
  mainComponent: string
  icon: string
  iconColor?: string
  description: string
  enabled?: boolean
}

export interface DepartmentModule {
  manifest: ModuleManifest
  component: ComponentType<any>
}

class ModuleRegistry {
  private modules: Map<string, DepartmentModule> = new Map()
  private moduleManifests: Map<string, ModuleManifest> = new Map()

  registerModule(module: DepartmentModule) {
    this.modules.set(module.manifest.id, module)
    this.moduleManifests.set(module.manifest.id, module.manifest)
    console.log(`Module registered: ${module.manifest.name}`)
  }

  getModule(id: string): DepartmentModule | undefined {
    return this.modules.get(id)
  }

  getAllModules(): DepartmentModule[] {
    return Array.from(this.modules.values())
  }

  getEnabledModules(): DepartmentModule[] {
    return this.getAllModules().filter(m => m.manifest.enabled !== false)
  }

  hasModule(id: string): boolean {
    return this.modules.has(id)
  }

  // Load module dynamically (for future use with actual dynamic imports)
  async loadModule(moduleUrl: string): Promise<DepartmentModule | null> {
    try {
      // In production, this would load from your backend
      // For now, it's a placeholder for dynamic loading
      const module = await import(/* @vite-ignore */ moduleUrl)
      if (module.default && module.manifest) {
        const departmentModule: DepartmentModule = {
          manifest: module.manifest,
          component: module.default
        }
        this.registerModule(departmentModule)
        return departmentModule
      }
      return null
    } catch (error) {
      console.error(`Failed to load module from ${moduleUrl}:`, error)
      return null
    }
  }

  // Get placeholder component for missing modules
  getPlaceholderComponent(routePath: string): ComponentType {
    return lazy(() => import('../components/ModulePlaceholder').then(module => ({
      default: () => module.default({ routePath })
    })))
  }
}

export const moduleRegistry = new ModuleRegistry()