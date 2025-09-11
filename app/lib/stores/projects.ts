import { atom, map, computed } from 'nanostores';
import type { FileMap } from './files';
import { authClient } from '~/lib/supabase/auth-client';
import { toast } from 'react-toastify';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ProjectStore');

// Types
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  urlSlug: string;
  thumbnailUrl?: string;
  settings: Record<string, any>;
  metadata: {
    gitUrl?: string;
    gitBranch?: string;
    netlifySiteId?: string;
    vercelProjectId?: string;
    [key: string]: any;
  };
  isPublic: boolean;
  isTemplate: boolean;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  filePath: string;
  content?: string;
  contentBinary?: Uint8Array;
  isBinary: boolean;
  fileType?: string;
  fileSize?: number;
  checksum?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  isPublic?: boolean;
  files?: FileMap;
  metadata?: Record<string, any>;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  urlSlug: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  lastAccessedAt: Date;
  createdAt: Date;
}

// Store state
interface ProjectsState {
  currentProject: Project | null;
  projectList: ProjectListItem[];
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

// Initialize stores
export const projectsStore = map<ProjectsState>({
  currentProject: null,
  projectList: [],
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  error: null,
});

// Project files store (separate for performance)
export const projectFilesStore = map<FileMap>({});

// Computed values
export const currentProjectId = computed(projectsStore, (state) => state.currentProject?.id);
export const hasUnsavedChanges = atom<boolean>(false);

// Actions
export const projectActions = {
  // List user's projects
  async listProjects(): Promise<ProjectListItem[]> {
    try {
      projectsStore.setKey('isLoading', true);
      projectsStore.setKey('error', null);

      const response = await fetch('/api/projects/list', {
        headers: {
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load projects');
      }

      const projects = (await response.json()) as ProjectListItem[];
      projectsStore.setKey('projectList', projects);

      return projects;
    } catch (error) {
      logger.error('Failed to list projects:', error);
      projectsStore.setKey('error', error instanceof Error ? error.message : 'Failed to load projects');
      throw error;
    } finally {
      projectsStore.setKey('isLoading', false);
    }
  },

  // Create a new project
  async createProject(input: CreateProjectInput): Promise<Project> {
    try {
      projectsStore.setKey('isLoading', true);
      projectsStore.setKey('error', null);

      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Failed to create project');
      }

      const project = (await response.json()) as Project;

      // Update stores
      projectsStore.setKey('currentProject', project);

      // Add to project list
      const currentList = projectsStore.get().projectList;
      projectsStore.setKey('projectList', [project as ProjectListItem, ...currentList]);

      // If files were provided, set them in the files store
      if (input.files) {
        projectFilesStore.set(input.files);
      }

      toast.success(`Project "${project.name}" created successfully`);

      return project;
    } catch (error) {
      logger.error('Failed to create project:', error);
      projectsStore.setKey('error', error instanceof Error ? error.message : 'Failed to create project');
      throw error;
    } finally {
      projectsStore.setKey('isLoading', false);
    }
  },

  // Load a project with its files
  async loadProject(projectId: string): Promise<void> {
    try {
      projectsStore.setKey('isLoading', true);
      projectsStore.setKey('error', null);

      const response = await fetch(`/api/projects/load?id=${projectId}`, {
        headers: {
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load project');
      }

      const { project, files } = (await response.json()) as { project: Project; files: any };

      // Update stores
      projectsStore.setKey('currentProject', project);

      // Convert files to FileMap format
      const fileMap: FileMap = {};

      for (const file of files) {
        fileMap[file.filePath] = {
          type: 'file',
          content: file.isBinary ? file.contentBinary : file.content,
          isBinary: file.isBinary,
        };
      }

      projectFilesStore.set(fileMap);
      hasUnsavedChanges.set(false);

      // Update last accessed
      await projectActions.updateLastAccessed(projectId);

      logger.info(`Project ${projectId} loaded successfully`);
    } catch (error) {
      logger.error('Failed to load project:', error);
      projectsStore.setKey('error', error instanceof Error ? error.message : 'Failed to load project');
      throw error;
    } finally {
      projectsStore.setKey('isLoading', false);
    }
  },

  // Save current project files
  async saveProject(files?: FileMap): Promise<void> {
    const currentProject = projectsStore.get().currentProject;

    if (!currentProject) {
      throw new Error('No project loaded');
    }

    try {
      projectsStore.setKey('isSaving', true);
      projectsStore.setKey('error', null);

      const filesToSave = files || projectFilesStore.get();

      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          projectId: currentProject.id,
          files: filesToSave,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save project');
      }

      projectsStore.setKey('lastSaved', new Date());
      hasUnsavedChanges.set(false);

      logger.info(`Project ${currentProject.id} saved successfully`);
    } catch (error) {
      logger.error('Failed to save project:', error);
      projectsStore.setKey('error', error instanceof Error ? error.message : 'Failed to save project');
      throw error;
    } finally {
      projectsStore.setKey('isSaving', false);
    }
  },

  // Update project metadata
  async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
    try {
      const response = await fetch('/api/projects/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      const updatedProject = (await response.json()) as Project;

      // Update current project if it's the one being updated
      if (projectsStore.get().currentProject?.id === projectId) {
        projectsStore.setKey('currentProject', updatedProject);
      }

      // Update in project list
      const list = projectsStore.get().projectList;
      const index = list.findIndex((p) => p.id === projectId);

      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        projectsStore.setKey('projectList', [...list]);
      }

      toast.success('Project updated successfully');
    } catch (error) {
      logger.error('Failed to update project:', error);
      throw error;
    }
  },

  // Delete a project
  async deleteProject(projectId: string): Promise<void> {
    try {
      const response = await fetch(`/api/projects/delete?id=${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      // Clear current project if it's the one being deleted
      if (projectsStore.get().currentProject?.id === projectId) {
        projectsStore.setKey('currentProject', null);
        projectFilesStore.set({});
      }

      // Remove from project list
      const list = projectsStore.get().projectList;
      projectsStore.setKey(
        'projectList',
        list.filter((p) => p.id !== projectId),
      );

      toast.success('Project deleted successfully');
    } catch (error) {
      logger.error('Failed to delete project:', error);
      throw error;
    }
  },

  // Update last accessed timestamp
  async updateLastAccessed(projectId: string): Promise<void> {
    try {
      await fetch('/api/projects/touch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await authClient.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ projectId }),
      });
    } catch (error) {
      // Non-critical error, just log it
      logger.warn('Failed to update last accessed:', error);
    }
  },

  // Clear current project
  clearCurrentProject(): void {
    projectsStore.setKey('currentProject', null);
    projectFilesStore.set({});
    hasUnsavedChanges.set(false);
  },

  // Update a single file
  updateFile(path: string, content: string | Uint8Array, isBinary = false): void {
    projectFilesStore.setKey(path, {
      type: 'file',
      content: content as string,
      isBinary,
    });
    hasUnsavedChanges.set(true);
  },

  // Delete a file
  deleteFile(path: string): void {
    const files = { ...projectFilesStore.get() };
    delete files[path];
    projectFilesStore.set(files);
    hasUnsavedChanges.set(true);
  },

  // Auto-save functionality
  startAutoSave(intervalMs = 30000): () => void {
    const interval = setInterval(async () => {
      if (hasUnsavedChanges.get() && !projectsStore.get().isSaving) {
        try {
          await projectActions.saveProject();
        } catch (error) {
          logger.error('Auto-save failed:', error);
        }
      }
    }, intervalMs);

    // Return cleanup function
    return () => clearInterval(interval);
  },
};

// Export helper functions
export const getCurrentProject = () => projectsStore.get().currentProject;
export const getProjectFiles = () => projectFilesStore.get();
export const isProjectLoading = () => projectsStore.get().isLoading;
export const isProjectSaving = () => projectsStore.get().isSaving;
