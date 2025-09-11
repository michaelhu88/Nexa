import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { motion } from 'framer-motion';
import { useNavigate } from '@remix-run/react';
import { projectsStore, projectActions, type ProjectListItem } from '~/lib/stores/projects';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { CreateProjectDialog } from './CreateProjectDialog';
import { ProjectCard } from './ProjectCard';
import { ProjectSkeleton } from './ProjectSkeleton';

export function ProjectDashboard() {
  const navigate = useNavigate();
  const { projectList, isLoading, error } = useStore(projectsStore);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastAccessed' | 'created'>('lastAccessed');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    // Load projects when component mounts
    projectActions.listProjects().catch(console.error);
  }, []);

  // Filter and sort projects
  const filteredProjects = projectList
    .filter(
      (project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'lastAccessed':
          return new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

  const handleProjectClick = async (project: ProjectListItem) => {
    try {
      await projectActions.loadProject(project.id);
      navigate(`/project/${project.urlSlug}`);
    } catch (error) {
      console.error('Failed to load project:', error);
    }
  };

  const handleProjectDelete = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      try {
        await projectActions.deleteProject(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-nexa-elements-textPrimary mb-2">Your Projects</h1>
          <p className="text-nexa-elements-textSecondary">Manage and organize your AI-powered development projects</p>
        </div>

        <Button
          onClick={() => setShowCreateDialog(true)}
          className="mt-4 sm:mt-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          <div className="i-ph:plus mr-2" />
          New Project
        </Button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-nexa-elements-textTertiary">
            <div className="i-ph:magnifying-glass w-4 h-4" />
          </div>
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-nexa-elements-borderColor bg-nexa-elements-background-depth-1 text-nexa-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="lastAccessed">Sort by Last Accessed</option>
          <option value="name">Sort by Name</option>
          <option value="created">Sort by Date Created</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <div className="i-ph:warning-circle" />
            <span className="font-medium">Error loading projects</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          <Button
            onClick={() => projectActions.listProjects()}
            className="mt-3 text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, index) => (
            <ProjectSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredProjects.length === 0 && (
        <div className="text-center py-12">
          {searchTerm ? (
            <>
              <div className="i-ph:magnifying-glass w-16 h-16 mx-auto text-nexa-elements-textTertiary mb-4" />
              <h3 className="text-xl font-semibold text-nexa-elements-textPrimary mb-2">No projects found</h3>
              <p className="text-nexa-elements-textSecondary mb-4">
                Try adjusting your search terms or create a new project
              </p>
              <Button
                onClick={() => setSearchTerm('')}
                className="bg-nexa-elements-background-depth-2 text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-3"
              >
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <div className="i-ph:folder-plus w-16 h-16 mx-auto text-nexa-elements-textTertiary mb-4" />
              <h3 className="text-xl font-semibold text-nexa-elements-textPrimary mb-2">No projects yet</h3>
              <p className="text-nexa-elements-textSecondary mb-6">
                Create your first project to get started with AI-powered development
              </p>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <div className="i-ph:plus mr-2" />
                Create Your First Project
              </Button>
            </>
          )}
        </div>
      )}

      {/* Projects Grid */}
      {!isLoading && !error && filteredProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ProjectCard
                project={project}
                onClick={() => handleProjectClick(project)}
                onDelete={() => handleProjectDelete(project.id)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Statistics */}
      {!isLoading && !error && filteredProjects.length > 0 && (
        <div className="mt-8 p-4 bg-nexa-elements-background-depth-2 rounded-lg">
          <div className="flex flex-wrap gap-6 text-sm text-nexa-elements-textSecondary">
            <span>
              <span className="font-medium text-nexa-elements-textPrimary">{filteredProjects.length}</span>{' '}
              {filteredProjects.length === 1 ? 'project' : 'projects'}
              {searchTerm && ' (filtered)'}
            </span>
            <span>
              <span className="font-medium text-nexa-elements-textPrimary">
                {filteredProjects.filter((p) => p.isPublic).length}
              </span>{' '}
              public
            </span>
            <span>
              <span className="font-medium text-nexa-elements-textPrimary">
                {filteredProjects.filter((p) => !p.isPublic).length}
              </span>{' '}
              private
            </span>
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={(project) => {
          setShowCreateDialog(false);
          handleProjectClick(project);
        }}
      />
    </div>
  );
}
