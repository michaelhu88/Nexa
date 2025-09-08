#!/usr/bin/env node

/**
 * Test script to verify the enterprise template service logic
 * This simulates the template loading and message generation process
 */

import JSZip from 'jszip';

// Mock auth store for testing
const mockAuthStore = {
  get: () => ({ token: 'test-token-123' })
};

async function testEnterpriseTemplateService() {
  console.log('🧪 Testing Enterprise Template Service');
  console.log('━'.repeat(50));

  try {
    // Test authentication check
    console.log('1️⃣  Testing authentication check...');
    console.log(`   Auth status: ${enterpriseTemplateService.isAuthenticated()}`);
    
    if (!enterpriseTemplateService.isAuthenticated()) {
      console.log('⚠️  Not authenticated - please log in to NocoBase first');
      console.log('   You can run the main app and log in, or run test-nocobase-auth.js');
      return;
    }

    // Test template loading
    console.log('\n2️⃣  Testing template loading...');
    console.log('   This will test the complete flow:');
    console.log('   - Fetch base-template from NocoBase');
    console.log('   - Extract zip contents');
    console.log('   - Strip path prefixes');
    console.log('   - Generate nexaArtifact message');
    console.log('   - Add project commands');

    const startTime = Date.now();
    const templateMessage = await enterpriseTemplateService.loadEnterpriseTemplate();
    const elapsed = Date.now() - startTime;

    console.log(`\n✅ Template loading completed in ${elapsed}ms`);
    
    // Analyze the generated message
    console.log('\n3️⃣  Analyzing generated message...');
    console.log(`   Message ID: ${templateMessage.id}`);
    console.log(`   Role: ${templateMessage.role}`);
    console.log(`   Content length: ${templateMessage.content.length} characters`);
    console.log(`   Created: ${templateMessage.createdAt}`);

    // Check for nexaArtifact structure
    const hasNexaArtifact = templateMessage.content.includes('<nexaArtifact');
    const hasNexaActions = templateMessage.content.includes('<nexaAction');
    const nexaActionCount = (templateMessage.content.match(/<nexaAction/g) || []).length;
    
    console.log(`\n📋 Message Structure Analysis:`);
    console.log(`   Contains nexaArtifact: ${hasNexaArtifact ? '✅' : '❌'}`);
    console.log(`   Contains nexaActions: ${hasNexaActions ? '✅' : '❌'}`);
    console.log(`   Number of nexaActions: ${nexaActionCount}`);

    // Check for specific file types
    const hasPackageJson = templateMessage.content.includes('package.json');
    const hasReactFiles = templateMessage.content.includes('.tsx') || templateMessage.content.includes('.jsx');
    const hasInstallCommand = templateMessage.content.includes('npm install');
    
    console.log(`\n📁 Content Analysis:`);
    console.log(`   Contains package.json: ${hasPackageJson ? '✅' : '❌'}`);
    console.log(`   Contains React files: ${hasReactFiles ? '✅' : '❌'}`);
    console.log(`   Contains npm install: ${hasInstallCommand ? '✅' : '❌'}`);

    // Extract file paths from the message
    const filePathMatches = templateMessage.content.match(/filePath="([^"]*)"/g) || [];
    const filePaths = filePathMatches.map(match => match.match(/filePath="([^"]*)"/)[1]);
    
    console.log(`\n📄 File Paths Found (${filePaths.length}):`);
    filePaths.slice(0, 10).forEach((path, index) => {
      console.log(`   ${index + 1}. ${path}`);
    });
    if (filePaths.length > 10) {
      console.log(`   ... and ${filePaths.length - 10} more files`);
    }

    // Check for problematic paths
    const hasPrefixPaths = filePaths.some(path => path.startsWith('base-template/'));
    console.log(`\n🔍 Path Analysis:`);
    console.log(`   Clean paths (no base-template/ prefix): ${!hasPrefixPaths ? '✅' : '❌'}`);
    
    if (hasPrefixPaths) {
      const prefixPaths = filePaths.filter(path => path.startsWith('base-template/'));
      console.log(`   Found ${prefixPaths.length} paths with prefix:`);
      prefixPaths.slice(0, 5).forEach(path => console.log(`     - ${path}`));
    }

    // Save a snippet of the message for inspection
    console.log(`\n💾 Saving message sample...`);
    const messageSample = templateMessage.content.substring(0, 1000) + 
      (templateMessage.content.length > 1000 ? '\n\n... [truncated] ...' : '');
    
    console.log('\n📝 Message Sample:');
    console.log('━'.repeat(50));
    console.log(messageSample);
    console.log('━'.repeat(50));

    // Final validation
    console.log('\n🎯 Validation Results:');
    console.log('━'.repeat(30));
    
    const validations = [
      { name: 'Message generated', passed: !!templateMessage },
      { name: 'Has nexaArtifact', passed: hasNexaArtifact },
      { name: 'Has nexaActions', passed: hasNexaActions },
      { name: 'Has clean paths', passed: !hasPrefixPaths },
      { name: 'Has multiple files', passed: nexaActionCount > 5 },
      { name: 'Has package.json', passed: hasPackageJson },
      { name: 'Has npm install', passed: hasInstallCommand }
    ];

    validations.forEach(v => {
      console.log(`${v.passed ? '✅' : '❌'} ${v.name}`);
    });

    const allPassed = validations.every(v => v.passed);
    
    if (allPassed) {
      console.log('\n🎉 ALL TESTS PASSED!');
      console.log('   The enterprise template service is working correctly.');
      console.log('   The generated message should load properly in the workbench.');
    } else {
      console.log('\n⚠️  Some tests failed - check the issues above');
    }

  } catch (error) {
    console.log('\n❌ Test failed with error:');
    console.error(error);
    
    if (error.message.includes('Authentication required')) {
      console.log('\n💡 Make sure you are logged in to NocoBase:');
      console.log('   - Run the main app and log in through the UI');
      console.log('   - Or run: node test-nocobase-auth.js');
    }
  }

  console.log('\n━'.repeat(50));
  console.log('🏁 Enterprise Template Service test completed');
}

// Run the test
testEnterpriseTemplateService().catch(console.error);