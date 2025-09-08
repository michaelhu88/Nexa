import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from 'ai';
import { enterpriseTemplateService } from '~/lib/services/enterprise-templates';
import { createScopedLogger } from '~/utils/logger';
import { toast } from 'react-toastify';

const logger = createScopedLogger('EnterpriseAutomation');

/**
 * DEBUG CONFIGURATION FOR TESTING
 *
 * Environment Variables:
 * - VITE_ENTERPRISE_DEBUG=true: Enables detailed debug logging
 * - VITE_FORCE_ENTERPRISE_TRIGGER=true: Forces trigger on every message
 *
 * Debug Triggers (always work regardless of context):
 * - Type "debug:trigger:enterprise" to force load template
 * - Type "force:enterprise:template" to force load template
 * - Type "test:automation:now" to force load template
 *
 * Manual Usage:
 * - const { forceLoadTemplate } = useEnterpriseAutomation(...)
 * - Call forceLoadTemplate() to bypass all checks
 */

const DEBUG_MODE = import.meta.env.VITE_ENTERPRISE_DEBUG === 'true';
const FORCE_TRIGGER = import.meta.env.VITE_FORCE_ENTERPRISE_TRIGGER === 'true';

// Special debug triggers that always work (for testing)
const DEBUG_TRIGGERS = ['debug:trigger:enterprise', 'force:enterprise:template', 'test:automation:now'];

// Keywords that indicate enterprise automation context
const ENTERPRISE_KEYWORDS = [
  'enterprise automation',
  'business automation',
  'workflow automation',
  'automate business',
  'automation template',
  'enterprise solution',
  'business process',
  'automation system',
];

// Trigger phrases that indicate user wants to proceed
const PROCEED_TRIGGERS = [
  // Original triggers
  "let's proceed",
  'lets proceed',
  'start building',
  'proceed',
  'yes, proceed',
  "let's start",
  'lets start',
  'begin',
  "let's go",
  'lets go',
  'start now',
  'ready to start',
  'ready to proceed',
  "i'm ready",
  'im ready',

  // Additional common variations
  "let's begin",
  'lets begin',
  "let's do it",
  'lets do it',
  "let's do this",
  'lets do this',
  'go ahead',
  'sure',
  'ok',
  'okay',
  'yes',
  'yep',
  'yeah',
  'sounds good',
  'looks good',
  'perfect',
  'great',
  'awesome',
  'continue',
  'next',
  'ready',
  'good to go',
  "let's build",
  'lets build',
  'start',
  'get started',
];

// AI responses that typically precede user confirmation
const AI_CONFIRMATION_PROMPTS = [
  'ready to proceed',
  'would you like to proceed',
  'shall we proceed',
  'ready to start',
  'would you like to begin',
  'shall we begin',
  'ready to get started',
  'confirm to proceed',
  'say "proceed"',
  'type "proceed"',
];

export interface UseEnterpriseAutomationOptions {
  messages: Message[];
  onTemplateLoad?: (message: Message) => void;
  enabled?: boolean;
}

export function useEnterpriseAutomation({ messages, onTemplateLoad, enabled = true }: UseEnterpriseAutomationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasEnterpriseContext, setHasEnterpriseContext] = useState(false);
  const hasLoadedTemplate = useRef(false);
  const lastProcessedMessageId = useRef<string | null>(null);

  // Helper function to extract text from message content (handles both string and array formats)
  const getMessageText = useCallback((content: any): string => {
    if (typeof content === 'string') {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .filter((item) => item && typeof item === 'object' && item.type === 'text')
        .map((item) => item.text || '')
        .join(' ');
    }

    return '';
  }, []);

  // Check if a message contains enterprise automation context
  const hasEnterpriseKeywords = useCallback(
    (content: any): boolean => {
      const textContent = getMessageText(content);
      const lowerContent = textContent.toLowerCase();

      return ENTERPRISE_KEYWORDS.some((keyword) => lowerContent.includes(keyword));
    },
    [getMessageText],
  );

  // Check if a message is a proceed trigger with improved flexible matching
  const isProceedTrigger = useCallback(
    (content: any): boolean => {
      const textContent = getMessageText(content);
      const lowerContent = textContent.toLowerCase().trim();

      // Debug mode overrides
      if (FORCE_TRIGGER) {
        logger.info('🧪 FORCE_TRIGGER enabled - always returning true');
        return true;
      }

      // Check for debug triggers first
      const isDebugTrigger = DEBUG_TRIGGERS.some((debugTrigger) => lowerContent.includes(debugTrigger.toLowerCase()));

      if (isDebugTrigger) {
        logger.info('🧪 DEBUG TRIGGER DETECTED:', textContent);
        return true;
      }

      // Normalize whitespace and punctuation for better matching
      const normalizedContent = lowerContent
        .replace(/[.,!?;:'"]+/g, ' ') // Replace punctuation with spaces
        .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
        .trim();

      return PROCEED_TRIGGERS.some((trigger) => {
        // Normalize the trigger similarly
        const normalizedTrigger = trigger.toLowerCase().trim();

        // Multiple matching strategies for maximum flexibility

        // 1. Exact match (normalized)
        if (normalizedContent === normalizedTrigger) {
          return true;
        }

        // 2. Starts with trigger (word boundary)
        if (normalizedContent.startsWith(normalizedTrigger + ' ')) {
          return true;
        }

        // 3. Ends with trigger (word boundary)
        if (normalizedContent.endsWith(' ' + normalizedTrigger)) {
          return true;
        }

        // 4. Contains trigger with word boundaries
        if (normalizedContent.includes(' ' + normalizedTrigger + ' ')) {
          return true;
        }

        // 5. Original content exact match (fallback)
        if (lowerContent === normalizedTrigger) {
          return true;
        }

        // 6. Handle short triggers that might be the entire message
        if (normalizedTrigger.length <= 6) {
          /*
           * For words like "ok", "yes", "sure", etc.
           * Check if the entire normalized content is just the trigger
           */
          if (normalizedContent === normalizedTrigger) {
            return true;
          }

          // Or if it starts/ends with the trigger plus common endings
          const commonEndings = ['!', '.', '?', ',', ' please', ' thanks'];

          if (
            commonEndings.some(
              (ending) =>
                lowerContent === normalizedTrigger + ending || lowerContent === normalizedTrigger + ending.trim(),
            )
          ) {
            return true;
          }
        }

        return false;
      });
    },
    [getMessageText],
  );

  // Check if AI has asked for confirmation
  const hasAIAskedForConfirmation = useCallback(
    (messages: Message[]): boolean => {
      // Look at recent assistant messages
      const recentAssistantMessages = messages.filter((m) => m.role === 'assistant').slice(-3); // Check last 3 assistant messages

      return recentAssistantMessages.some((msg) => {
        const textContent = getMessageText(msg.content);
        const lowerContent = textContent.toLowerCase();

        return AI_CONFIRMATION_PROMPTS.some((prompt) => lowerContent.includes(prompt));
      });
    },
    [getMessageText],
  );

  // Load the enterprise template
  const loadTemplate = useCallback(async () => {
    if (hasLoadedTemplate.current || isLoading) {
      logger.debug('Template already loaded or loading in progress', {
        hasLoaded: hasLoadedTemplate.current,
        isLoading,
      });
      return;
    }

    setIsLoading(true);
    logger.info('🚀 Starting enterprise template loading process...');

    // Show loading toast
    const toastId = toast.loading('Loading enterprise automation template...');

    try {
      // Check authentication first
      logger.debug('Checking authentication...');

      if (!enterpriseTemplateService.isAuthenticated()) {
        logger.warn('Not authenticated with NocoBase');
        toast.update(toastId, {
          render: 'Please log in to access enterprise automation templates',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });

        return;
      }

      logger.info('✅ Authentication verified');

      // Load the template
      logger.info('📥 Calling enterpriseTemplateService.loadEnterpriseTemplate()...');

      const templateMessage = await enterpriseTemplateService.loadEnterpriseTemplate();
      logger.info('✅ Template service returned message', {
        messageId: templateMessage.id,
        role: templateMessage.role,
        contentLength: templateMessage.content.length,
        hasNexaArtifact: templateMessage.content.includes('<nexaArtifact'),
      });

      // Mark as loaded
      hasLoadedTemplate.current = true;

      // Update toast
      toast.update(toastId, {
        render: 'Enterprise template loaded successfully!',
        type: 'success',
        isLoading: false,
        autoClose: 3000,
      });

      // Call the callback with the template message
      if (onTemplateLoad) {
        logger.info('📤 Calling onTemplateLoad callback with template message...');
        logger.info('🔍 Message details before callback:', {
          id: templateMessage.id,
          role: templateMessage.role,
          contentPreview: templateMessage.content.substring(0, 200) + '...',
          hasNexaArtifact: templateMessage.content.includes('<nexaArtifact'),
          hasNexaAction: templateMessage.content.includes('<nexaAction'),
          nexaActionCount: (templateMessage.content.match(/<nexaAction/g) || []).length,
        });

        onTemplateLoad(templateMessage);

        logger.info('✅ Template message passed to callback');
        logger.info('🎯 Enterprise automation should now trigger workbench loading...');
      } else {
        logger.warn('No onTemplateLoad callback provided');
      }

      logger.info('🎉 Enterprise template loading completed successfully!');
    } catch (error) {
      logger.error('💥 Failed to load enterprise template:', error);

      toast.update(toastId, {
        render: `Failed to load template: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, onTemplateLoad]);

  // Monitor messages for enterprise automation context and triggers
  useEffect(() => {
    if (!enabled || messages.length === 0) {
      logger.debug('Hook disabled or no messages', { enabled, messageCount: messages.length });
      return;
    }

    // Get the latest user message
    const latestUserMessage = messages.filter((m) => m.role === 'user').slice(-1)[0];

    if (!latestUserMessage || latestUserMessage.id === lastProcessedMessageId.current) {
      logger.debug('No new user message to process', {
        hasMessage: !!latestUserMessage,
        alreadyProcessed: latestUserMessage?.id === lastProcessedMessageId.current,
        lastProcessedId: lastProcessedMessageId.current,
        currentMessageId: latestUserMessage?.id,
      });
      return;
    }

    // Mark this message as being processed to prevent duplicates
    lastProcessedMessageId.current = latestUserMessage.id;

    const userContent = latestUserMessage.content;
    const userTextContent = getMessageText(userContent);

    logger.info('Processing new user message', {
      messageId: latestUserMessage.id,
      contentType: typeof userContent,
      textContent: userTextContent.substring(0, 100) + (userTextContent.length > 100 ? '...' : ''),
      messageCount: messages.length,
    });

    // Show debug configuration
    if (DEBUG_MODE) {
      logger.info('🧪 DEBUG MODE ACTIVE');
    }

    if (FORCE_TRIGGER) {
      logger.info('🧪 FORCE_TRIGGER ACTIVE - Will trigger on any message');
    }

    if (DEBUG_MODE || FORCE_TRIGGER) {
      logger.info('🧪 Debug triggers available:', DEBUG_TRIGGERS);
    }

    // Check if we have enterprise context in recent conversation
    const recentMessages = messages.slice(-10); // Look at last 10 messages
    const hasRecentEnterpriseContext = recentMessages.some((msg) => hasEnterpriseKeywords(msg.content));

    logger.debug(`🏢 ENTERPRISE CONTEXT ANALYSIS`);
    logger.debug(`Recent enterprise context: ${hasRecentEnterpriseContext ? '✅ DETECTED' : '❌ NOT FOUND'}`);
    logger.debug(`Checking last ${recentMessages.length} messages`);

    if (!hasRecentEnterpriseContext) {
      logger.debug('🔍 Searching for enterprise keywords in recent messages:');
      recentMessages.forEach((msg, index) => {
        const msgText = getMessageText(msg.content);
        const hasKeywords = hasEnterpriseKeywords(msg.content);
        const foundKeywords = ENTERPRISE_KEYWORDS.filter((keyword) => msgText.toLowerCase().includes(keyword));
        logger.debug(
          `  Message ${recentMessages.length - index}: ${msg.role} - ${hasKeywords ? '✅' : '❌'} ${foundKeywords.length > 0 ? `(found: ${foundKeywords.join(', ')})` : ''}`,
        );
      });
    }

    // Update enterprise context state
    if (hasRecentEnterpriseContext) {
      logger.info('Enterprise context detected in recent messages');
      setHasEnterpriseContext(true);
    }

    // Check if this is a proceed trigger with detailed logging
    const isProceed = isProceedTrigger(userContent);
    const lowerUserText = userTextContent.toLowerCase().trim();

    logger.debug(`🔍 TRIGGER DETECTION ANALYSIS`);
    logger.debug(`User input: "${userTextContent}"`);
    logger.debug(`Normalized: "${lowerUserText}"`);
    logger.debug(`Input length: ${userTextContent.length}`);

    if (FORCE_TRIGGER || DEBUG_MODE) {
      logger.debug(`🧪 Debug mode: FORCE=${FORCE_TRIGGER}, DEBUG=${DEBUG_MODE}`);
    }

    logger.debug(`Final result: ${isProceed ? '✅ TRIGGER DETECTED' : '❌ NO TRIGGER'}`);

    if (!isProceed) {
      logger.debug('🔍 Testing each trigger phrase with improved matching:');

      // Show normalized content for debugging
      const normalizedUserText = lowerUserText
        .replace(/[.,!?;:'"]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      logger.debug(`Normalized user input: "${normalizedUserText}"`);

      PROCEED_TRIGGERS.forEach((trigger) => {
        const normalizedTrigger = trigger.toLowerCase().trim();

        // Test each matching strategy
        const exactMatch = normalizedUserText === normalizedTrigger;
        const startsWithTrigger = normalizedUserText.startsWith(normalizedTrigger + ' ');
        const endsWithTrigger = normalizedUserText.endsWith(' ' + normalizedTrigger);
        const containsWithBoundaries = normalizedUserText.includes(' ' + normalizedTrigger + ' ');
        const originalExact = lowerUserText === normalizedTrigger;

        // Short trigger special handling
        let shortTriggerMatch = false;

        if (normalizedTrigger.length <= 6) {
          const commonEndings = ['!', '.', '?', ',', ' please', ' thanks'];
          shortTriggerMatch = commonEndings.some(
            (ending) =>
              lowerUserText === normalizedTrigger + ending || lowerUserText === normalizedTrigger + ending.trim(),
          );
        }

        const isMatch =
          exactMatch ||
          startsWithTrigger ||
          endsWithTrigger ||
          containsWithBoundaries ||
          originalExact ||
          shortTriggerMatch;

        if (isMatch) {
          logger.debug(
            `  "${trigger}": ✅ MATCH (normalized exact: ${exactMatch}, starts: ${startsWithTrigger}, ends: ${endsWithTrigger}, contains: ${containsWithBoundaries}, original exact: ${originalExact}, short special: ${shortTriggerMatch})`,
          );
        } else {
          // Only show first few failed matches to avoid spam
          const failedIndex = PROCEED_TRIGGERS.indexOf(trigger);

          if (failedIndex < 5) {
            logger.debug(`  "${trigger}": ❌`);
          } else if (failedIndex === 5) {
            logger.debug(`  ... (${PROCEED_TRIGGERS.length - 5} more triggers tested)`);
          }
        }
      });
    }

    if (hasRecentEnterpriseContext && isProceed) {
      // Also check if AI has recently asked for confirmation
      const aiAskedForConfirmation = hasAIAskedForConfirmation(messages);

      logger.info('🎯 ENTERPRISE AUTOMATION TRIGGER DETECTED!', {
        userMessage: userTextContent,
        hasContext: hasRecentEnterpriseContext,
        aiAskedForConfirmation,
        messageId: latestUserMessage.id,
      });

      // If we have context and either AI asked for confirmation or user explicitly said proceed
      if (aiAskedForConfirmation || isProceed) {
        logger.info('🚀 LOADING ENTERPRISE TEMPLATE NOW!');
        loadTemplate();
      }
    }

    // Check if user is directly asking for enterprise automation
    if (
      hasEnterpriseKeywords(userContent) &&
      (userTextContent.toLowerCase().includes('start') ||
        userTextContent.toLowerCase().includes('begin') ||
        userTextContent.toLowerCase().includes('create') ||
        userTextContent.toLowerCase().includes('build'))
    ) {
      logger.info('Direct enterprise automation request detected', {
        userText: userTextContent,
        keywords: ENTERPRISE_KEYWORDS.filter((kw) => userTextContent.toLowerCase().includes(kw)),
      });
      setHasEnterpriseContext(true);
    }
  }, [messages, enabled, getMessageText, loadTemplate]);

  // Force load template for testing (bypasses all checks)
  const forceLoadTemplate = useCallback(async () => {
    logger.info('🧪 FORCE LOADING TEMPLATE - Bypassing all checks');
    await loadTemplate();
  }, [loadTemplate]);

  return {
    isLoading,
    hasEnterpriseContext,
    loadTemplate, // Expose this for manual triggering if needed
    forceLoadTemplate, // Force load for testing
    hasLoadedTemplate: hasLoadedTemplate.current,

    // Debug info
    debugInfo: {
      debugMode: DEBUG_MODE,
      forceTrigger: FORCE_TRIGGER,
      debugTriggers: DEBUG_TRIGGERS,
    },
  };
}
