import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { indexedDBMigration, type MigrationResult } from '~/lib/migration/indexedDBMigration';
import { Button } from '~/components/ui/Button';
import { toast } from 'react-toastify';

interface MigrationDialogProps {
  onComplete: () => void;
}

type MigrationStep = 'checking' | 'prompt' | 'migrating' | 'complete' | 'skip';

export function MigrationDialog({ onComplete }: MigrationDialogProps) {
  const [step, setStep] = useState<MigrationStep>('checking');
  const [hasData, setHasData] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    checkForExistingData();
  }, []);

  const checkForExistingData = async () => {
    try {
      const hasExistingData = await indexedDBMigration.checkForExistingData();
      setHasData(hasExistingData);

      if (hasExistingData) {
        setStep('prompt');
        setIsVisible(true);
      } else {
        // No data to migrate, complete immediately
        onComplete();
      }
    } catch (error) {
      console.error('Failed to check for existing data:', error);

      // If we can't check, just continue without migration
      onComplete();
    }
  };

  const handleMigrate = async () => {
    setStep('migrating');

    try {
      const result = await indexedDBMigration.migrateToProjects();
      setMigrationResult(result);
      setStep('complete');

      if (result.success && result.migratedCount > 0) {
        toast.success(`Successfully migrated ${result.migratedCount} project${result.migratedCount !== 1 ? 's' : ''}!`);
      } else if (result.failedCount > 0) {
        toast.error(`Migration completed with ${result.failedCount} error${result.failedCount !== 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationResult({
        success: false,
        migratedCount: 0,
        failedCount: 1,
        errors: [error instanceof Error ? error.message : 'Migration failed'],
      });
      setStep('complete');
      toast.error('Migration failed. Your data is still safe in browser storage.');
    }
  };

  const handleSkip = () => {
    setStep('skip');
    toast.info('Migration skipped. Your existing data remains in browser storage.');
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  const handleCleanup = async () => {
    try {
      await indexedDBMigration.cleanupIndexedDB();
      toast.success('Browser storage cleaned up successfully');
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('Failed to cleanup browser storage');
    } finally {
      handleClose();
    }
  };

  if (!hasData || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-nexa-elements-background-depth-2 rounded-xl shadow-xl border border-nexa-elements-borderColor"
          >
            {step === 'prompt' && (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <div className="i-ph:database w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-nexa-elements-textPrimary">Migrate Your Data</h2>
                      <p className="text-sm text-nexa-elements-textSecondary">
                        We found existing projects in your browser
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-nexa-elements-textPrimary">
                      We've upgraded Nexa to use secure cloud storage! Your existing projects are currently stored
                      locally in your browser.
                    </p>

                    <p className="text-nexa-elements-textPrimary">
                      Would you like to migrate them to your new cloud account? This will:
                    </p>

                    <ul className="list-disc list-inside space-y-2 text-sm text-nexa-elements-textSecondary ml-4">
                      <li>Move your projects to secure cloud storage</li>
                      <li>Enable access from multiple devices</li>
                      <li>Preserve your chat history and files</li>
                      <li>Keep your data safe from browser clearing</li>
                    </ul>

                    <div className="bg-nexa-elements-background-depth-1 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="i-ph:info w-4 h-4 text-blue-600 mt-0.5" />
                        <div className="text-xs text-nexa-elements-textSecondary">
                          <strong>Note:</strong> Your original data will remain in your browser until you choose to
                          clean it up.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-nexa-elements-borderColor">
                  <Button
                    onClick={handleSkip}
                    className="flex-1 bg-nexa-elements-background-depth-1 text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-3"
                  >
                    Skip for Now
                  </Button>
                  <Button
                    onClick={handleMigrate}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                  >
                    <div className="i-ph:cloud-arrow-up mr-2" />
                    Migrate Projects
                  </Button>
                </div>
              </>
            )}

            {step === 'migrating' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4">
                  <div className="i-ph:spinner-gap w-16 h-16 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-nexa-elements-textPrimary mb-2">Migrating Your Projects</h3>
                <p className="text-nexa-elements-textSecondary">
                  Please wait while we securely transfer your data to the cloud...
                </p>
              </div>
            )}

            {step === 'complete' && migrationResult && (
              <>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        migrationResult.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 ${
                          migrationResult.success
                            ? 'i-ph:check-circle text-green-600 dark:text-green-400'
                            : 'i-ph:warning-circle text-red-600 dark:text-red-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-nexa-elements-textPrimary">
                        {migrationResult.success ? 'Migration Complete!' : 'Migration Issues'}
                      </h2>
                      <p className="text-sm text-nexa-elements-textSecondary">
                        {migrationResult.success
                          ? 'Your projects have been moved to the cloud'
                          : 'Some issues occurred during migration'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {migrationResult.migratedCount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <div className="i-ph:check w-4 h-4" />
                        <span>
                          Successfully migrated {migrationResult.migratedCount} project
                          {migrationResult.migratedCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    {migrationResult.failedCount > 0 && (
                      <div className="text-sm text-red-600 dark:text-red-400">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="i-ph:warning w-4 h-4" />
                          <span>
                            Failed to migrate {migrationResult.failedCount} project
                            {migrationResult.failedCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {migrationResult.errors.length > 0 && (
                          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mt-2">
                            <details className="cursor-pointer">
                              <summary className="font-medium">View Error Details</summary>
                              <div className="mt-2 text-xs">
                                {migrationResult.errors.map((error, index) => (
                                  <div key={index} className="mb-1">
                                    {error}
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}

                    {migrationResult.success && (
                      <div className="bg-nexa-elements-background-depth-1 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                          <div className="i-ph:trash w-4 h-4 text-orange-600 mt-0.5" />
                          <div className="text-sm text-nexa-elements-textSecondary">
                            <div className="font-medium mb-1">Clean Up Browser Storage?</div>
                            <div>
                              You can now safely remove the old data from your browser storage to free up space.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-nexa-elements-borderColor">
                  <Button
                    onClick={handleClose}
                    className="flex-1 bg-nexa-elements-background-depth-1 text-nexa-elements-textPrimary hover:bg-nexa-elements-background-depth-3"
                  >
                    Continue
                  </Button>
                  {migrationResult.success && (
                    <Button onClick={handleCleanup} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
                      <div className="i-ph:broom mr-2" />
                      Clean Up Browser Data
                    </Button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
