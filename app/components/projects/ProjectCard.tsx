import { useState } from 'react';
import { motion } from 'framer-motion';
import { type ProjectListItem } from '~/lib/stores/projects';
import { formatDistanceToNow } from '~/utils/date';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface ProjectCardProps {
  project: ProjectListItem;
  onClick: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onClick, onDelete }: ProjectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group bg-nexa-elements-background-depth-2 rounded-xl border border-nexa-elements-borderColor shadow-sm hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer transition-all duration-200"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-t-xl relative overflow-hidden">
        {project.thumbnailUrl ? (
          <img src={project.thumbnailUrl} alt={`${project.name} thumbnail`} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="i-ph:code text-3xl text-blue-500/50" />
          </div>
        )}

        {/* Project Actions Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu.Root open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenu.Trigger
              onClick={handleMenuClick}
              className="p-1.5 rounded-lg bg-white/90 dark:bg-black/90 backdrop-blur-sm hover:bg-white dark:hover:bg-black transition-colors"
            >
              <div className="i-ph:dots-three-vertical w-4 h-4 text-nexa-elements-textSecondary" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Content
              className="min-w-[160px] bg-white dark:bg-nexa-elements-background-depth-2 rounded-lg shadow-lg border border-nexa-elements-borderColor py-1 z-50"
              sideOffset={5}
              align="end"
            >
              <DropdownMenu.Item className="px-3 py-2 text-sm text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-1 cursor-pointer outline-none">
                <div className="flex items-center gap-2">
                  <div className="i-ph:pencil w-4 h-4" />
                  Rename
                </div>
              </DropdownMenu.Item>

              <DropdownMenu.Item className="px-3 py-2 text-sm text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-1 cursor-pointer outline-none">
                <div className="flex items-center gap-2">
                  <div className="i-ph:copy w-4 h-4" />
                  Duplicate
                </div>
              </DropdownMenu.Item>

              <DropdownMenu.Item className="px-3 py-2 text-sm text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-1 cursor-pointer outline-none">
                <div className="flex items-center gap-2">
                  <div className="i-ph:download w-4 h-4" />
                  Export
                </div>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-px bg-nexa-elements-borderColor my-1" />

              <DropdownMenu.Item
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer outline-none"
              >
                <div className="flex items-center gap-2">
                  <div className="i-ph:trash w-4 h-4" />
                  Delete
                </div>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        {/* Public Badge */}
        {project.isPublic && (
          <div className="absolute top-2 left-2">
            <div className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
              Public
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-nexa-elements-textPrimary truncate group-hover:text-blue-600 transition-colors">
            {project.name}
          </h3>
        </div>

        {project.description && (
          <p className="text-sm text-nexa-elements-textSecondary mb-3 line-clamp-2">{project.description}</p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-nexa-elements-textTertiary">
          <div className="flex items-center gap-1">
            <div className="i-ph:clock w-3 h-3" />
            <span title={`Last accessed: ${new Date(project.lastAccessedAt).toLocaleString()}`}>
              {formatDistanceToNow(new Date(project.lastAccessedAt))} ago
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="i-ph:calendar w-3 h-3" />
            <span title={`Created: ${new Date(project.createdAt).toLocaleString()}`}>
              {formatDistanceToNow(new Date(project.createdAt))} ago
            </span>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
