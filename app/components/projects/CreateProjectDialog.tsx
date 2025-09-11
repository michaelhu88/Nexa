import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectActions, type Project } from '~/lib/stores/projects';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/Input';
import { toast } from 'react-toastify';

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

const templates = [
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Start from scratch with an empty project',
    icon: 'i-ph:file-plus',
    files: {},
  },
  {
    id: 'react-app',
    name: 'React Application',
    description: 'Modern React app with TypeScript and Vite',
    icon: 'i-ph:atom',
    files: {
      'package.json': {
        type: 'file' as const,
        content: JSON.stringify(
          {
            name: 'react-app',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'vite',
              build: 'vite build',
              preview: 'vite preview',
            },
            dependencies: {
              react: '^18.2.0',
              'react-dom': '^18.2.0',
            },
            devDependencies: {
              '@types/react': '^18.2.43',
              '@types/react-dom': '^18.2.17',
              '@vitejs/plugin-react': '^4.2.1',
              typescript: '^5.2.2',
              vite: '^5.0.8',
            },
          },
          null,
          2,
        ),
        isBinary: false,
      },
      'vite.config.ts': {
        type: 'file' as const,
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,
        isBinary: false,
      },
      'src/App.tsx': {
        type: 'file' as const,
        content: `import React from 'react'

function App() {
  return (
    <div className="App">
      <h1>Hello React!</h1>
      <p>Welcome to your new React application.</p>
    </div>
  )
}

export default App`,
        isBinary: false,
      },
      'src/main.tsx': {
        type: 'file' as const,
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,
        isBinary: false,
      },
      'index.html': {
        type: 'file' as const,
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
        isBinary: false,
      },
    },
  },
  {
    id: 'express-api',
    name: 'Express API',
    description: 'Node.js REST API with Express and TypeScript',
    icon: 'i-ph:globe',
    files: {
      'package.json': {
        type: 'file' as const,
        content: JSON.stringify(
          {
            name: 'express-api',
            version: '1.0.0',
            type: 'module',
            scripts: {
              dev: 'tsx watch src/index.ts',
              build: 'tsc',
              start: 'node dist/index.js',
            },
            dependencies: {
              express: '^4.18.2',
              cors: '^2.8.5',
            },
            devDependencies: {
              '@types/express': '^4.17.21',
              '@types/cors': '^2.8.17',
              '@types/node': '^20.10.5',
              tsx: '^4.6.2',
              typescript: '^5.3.3',
            },
          },
          null,
          2,
        ),
        isBinary: false,
      },
      'src/index.ts': {
        type: 'file' as const,
        content: `import express from 'express'
import cors from 'cors'

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express API!' })
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(port, () => {
  console.log(\`Server running at http://localhost:\${port}\`)
})`,
        isBinary: false,
      },
      'tsconfig.json': {
        type: 'file' as const,
        content: JSON.stringify(
          {
            compilerOptions: {
              target: 'ES2020',
              module: 'NodeNext',
              moduleResolution: 'NodeNext',
              outDir: './dist',
              rootDir: './src',
              strict: true,
              esModuleInterop: true,
              skipLibCheck: true,
              forceConsistentCasingInFileNames: true,
            },
            include: ['src/**/*'],
            exclude: ['node_modules', 'dist'],
          },
          null,
          2,
        ),
        isBinary: false,
      },
    },
  },
];

export function CreateProjectDialog({ isOpen, onClose, onSuccess }: CreateProjectDialogProps) {
  const [step, setStep] = useState<'template' | 'details'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState(templates[0]);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleTemplateSelect = (template: (typeof templates)[0]) => {
    setSelectedTemplate(template);
    setStep('details');

    if (!projectName && template.id !== 'blank') {
      setProjectName(template.name);
    }
  };

  const handleCreate = async () => {
    if (!projectName.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setIsCreating(true);

    try {
      const project = await projectActions.createProject({
        name: projectName.trim(),
        description: description.trim() || undefined,
        isPublic,
        files: selectedTemplate.files,
      });

      onSuccess(project);
      handleReset();
      toast.success(`Project "${project.name}" created successfully!`);
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error('Failed to create project. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setStep('template');
    setSelectedTemplate(templates[0]);
    setProjectName('');
    setDescription('');
    setIsPublic(false);
    setIsCreating(false);
  };

  const handleClose = () => {
    if (!isCreating) {
      handleReset();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
              onClick={handleClose}
            />

            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-nexa-elements-background-depth-2 rounded-xl shadow-xl border border-nexa-elements-borderColor"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-nexa-elements-borderColor">
                <div>
                  <h2 className="text-xl font-semibold text-nexa-elements-textPrimary">
                    {step === 'template' ? 'Choose Template' : 'Project Details'}
                  </h2>
                  <p className="text-sm text-nexa-elements-textSecondary mt-1">
                    {step === 'template' ? 'Select a template to get started quickly' : 'Configure your new project'}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-nexa-elements-background-depth-1 rounded-lg transition-colors"
                  disabled={isCreating}
                >
                  <div className="i-ph:x w-5 h-5 text-nexa-elements-textSecondary" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {step === 'template' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <motion.button
                        key={template.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleTemplateSelect(template)}
                        className="p-4 text-left border border-nexa-elements-borderColor rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all"
                      >
                        <div className={`${template.icon} w-8 h-8 text-blue-500 mb-3`} />
                        <h3 className="font-medium text-nexa-elements-textPrimary mb-1">{template.name}</h3>
                        <p className="text-sm text-nexa-elements-textSecondary">{template.description}</p>
                      </motion.button>
                    ))}
                  </div>
                )}

                {step === 'details' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-nexa-elements-textPrimary mb-1">
                        Project Name *
                      </label>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Enter project name"
                        disabled={isCreating}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-nexa-elements-textPrimary mb-1">
                        Description
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your project (optional)"
                        rows={3}
                        disabled={isCreating}
                        className="w-full px-3 py-2 border border-nexa-elements-borderColor rounded-lg bg-nexa-elements-background-depth-1 text-nexa-elements-textPrimary placeholder-nexa-elements-textTertiary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        id="isPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        disabled={isCreating}
                        className="rounded border-nexa-elements-borderColor text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="isPublic" className="text-sm text-nexa-elements-textPrimary">
                        Make this project public
                      </label>
                    </div>

                    <div className="bg-nexa-elements-background-depth-1 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className={`${selectedTemplate.icon} w-6 h-6 text-blue-500 mt-0.5`} />
                        <div>
                          <h4 className="font-medium text-nexa-elements-textPrimary">{selectedTemplate.name}</h4>
                          <p className="text-sm text-nexa-elements-textSecondary">{selectedTemplate.description}</p>
                          <button
                            onClick={() => setStep('template')}
                            className="text-xs text-blue-600 hover:underline mt-1"
                            disabled={isCreating}
                          >
                            Change template
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              {step === 'details' && (
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-nexa-elements-borderColor">
                  <Button
                    onClick={() => setStep('template')}
                    disabled={isCreating}
                    className="bg-nexa-elements-background-depth-1 text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-3"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating || !projectName.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    {isCreating ? (
                      <>
                        <div className="i-ph:spinner-gap animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <div className="i-ph:plus mr-2" />
                        Create Project
                      </>
                    )}
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
