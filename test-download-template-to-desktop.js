#!/usr/bin/env node

/**
 * Test script to download the base-template zip file to desktop
 * This verifies that we can successfully download the NocoBase template file
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const NOCOBASE_API_URL = process.env.VITE_NOCOBASE_API_URL || 'http://127.0.0.1:13000';

// Default NocoBase credentials (from test-nocobase-auth.js)
const TEST_CREDENTIALS = {
  email: process.env.NOCOBASE_TEST_EMAIL || 'admin@nocobase.com',
  password: process.env.NOCOBASE_TEST_PASSWORD || 'admin123',
};

class TemplateDownloadTester {
  constructor() {
    this.authToken = null;
    this.baseURL = NOCOBASE_API_URL;
    this.desktopPath = path.join(os.homedir(), 'Desktop');
  }

  async authenticate() {
    console.log('🔐 Authenticating with NocoBase...');
    
    const response = await fetch(`${this.baseURL}/api/auth:signIn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_CREDENTIALS),
    });

    if (response.ok) {
      const data = await response.json();
      this.authToken = data.data?.token;
      console.log('✅ Authentication successful');
      console.log(`🎫 Token: ${this.authToken ? this.authToken.substring(0, 20) + '...' : 'None'}`);
      return true;
    } else {
      const errorText = await response.text();
      console.log(`❌ Authentication failed: ${response.status} ${response.statusText}`);
      console.log('Error details:', errorText);
      return false;
    }
  }

  async getBaseTemplate() {
    console.log('\n📋 Fetching base-template from zip_uploads collection...');
    
    const response = await fetch(`${this.baseURL}/api/zip_uploads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (!data.data || data.data.length === 0) {
        console.log('❌ No zip uploads found in collection');
        return null;
      }

      // Find base-template by title
      const baseTemplate = data.data.find(item => item.title === 'base-template');
      
      if (baseTemplate) {
        console.log('✅ Base template found:');
        console.log(`   📁 Title: ${baseTemplate.title}`);
        console.log(`   📄 Filename: ${baseTemplate.filename}`);
        console.log(`   📏 Size: ${baseTemplate.size} bytes (${(baseTemplate.size / 1024).toFixed(2)} KB)`);
        console.log(`   🔗 URL: ${baseTemplate.url}`);
        console.log(`   🆔 ID: ${baseTemplate.id}`);
        return baseTemplate;
      } else {
        console.log('❌ Base template not found in collection');
        console.log('Available templates:');
        data.data.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.title} (${item.filename})`);
        });
        return null;
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed to fetch zip uploads: ${response.status} ${response.statusText}`);
      console.log('Error details:', errorText);
      return null;
    }
  }

  async downloadTemplateToDesktop(template) {
    console.log(`\n⬇️  Downloading template from: ${template.url}`);
    
    const response = await fetch(`${this.baseURL}${template.url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      console.log(`❌ Download failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error details:', errorText);
      return null;
    }

    // Get the binary data
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    console.log(`✅ Downloaded ${buffer.length} bytes`);
    console.log(`📊 Expected: ${template.size} bytes`);
    console.log(`🔍 Size match: ${buffer.length === template.size ? '✅ YES' : '❌ NO'}`);

    // Save to desktop
    const filename = `downloaded-${template.filename}`;
    const filePath = path.join(this.desktopPath, filename);
    
    console.log(`\n💾 Saving to desktop: ${filePath}`);
    
    try {
      fs.writeFileSync(filePath, buffer);
      
      // Verify the saved file
      const stats = fs.statSync(filePath);
      console.log(`✅ File saved successfully!`);
      console.log(`📏 Saved file size: ${stats.size} bytes`);
      console.log(`🔍 Size verification: ${stats.size === template.size ? '✅ PASSED' : '❌ FAILED'}`);
      
      return {
        filePath,
        originalSize: template.size,
        downloadedSize: buffer.length,
        savedSize: stats.size,
        success: true
      };
    } catch (error) {
      console.log(`❌ Failed to save file: ${error.message}`);
      return null;
    }
  }

  async testZipContents(filePath) {
    console.log(`\n🔍 Testing zip file contents...`);
    
    try {
      // Try to read the zip file header to verify it's a valid zip
      const buffer = fs.readFileSync(filePath);
      
      // ZIP file signature: PK (0x504B)
      if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
        console.log('✅ File appears to be a valid ZIP file (correct signature)');
        
        // Try to get some basic info about the zip structure
        const zipSignature = buffer.slice(0, 4).toString('hex');
        console.log(`   🔖 ZIP signature: ${zipSignature.toUpperCase()}`);
        
        return true;
      } else {
        console.log('❌ File does not appear to be a valid ZIP file (incorrect signature)');
        console.log(`   🔖 First 4 bytes: ${buffer.slice(0, 4).toString('hex').toUpperCase()}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Error reading zip file: ${error.message}`);
      return false;
    }
  }
}

async function runDownloadTest() {
  console.log('🧪 Testing Base-Template Download to Desktop');
  console.log('━'.repeat(50));
  console.log(`🖥️  Desktop path: ${path.join(os.homedir(), 'Desktop')}`);
  console.log('━'.repeat(50));

  const tester = new TemplateDownloadTester();

  try {
    // Step 1: Authenticate
    const authSuccess = await tester.authenticate();
    if (!authSuccess) {
      console.log('\n🛑 Cannot proceed without authentication');
      return;
    }

    // Step 2: Get base template info
    const template = await tester.getBaseTemplate();
    if (!template) {
      console.log('\n🛑 Cannot proceed without template info');
      return;
    }

    // Step 3: Download to desktop
    const downloadResult = await tester.downloadTemplateToDesktop(template);
    if (!downloadResult) {
      console.log('\n🛑 Download failed');
      return;
    }

    // Step 4: Verify zip file
    const isValidZip = await tester.testZipContents(downloadResult.filePath);

    // Final results
    console.log('\n🎉 Download Test Results:');
    console.log('━'.repeat(50));
    console.log('✅ NocoBase authentication: SUCCESS');
    console.log('✅ Template location: FOUND');
    console.log(`✅ File download: ${downloadResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Size verification: ${downloadResult.savedSize === downloadResult.originalSize ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ ZIP file validation: ${isValidZip ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n📂 Downloaded file details:');
    console.log(`   📍 Location: ${downloadResult.filePath}`);
    console.log(`   📏 Size: ${downloadResult.savedSize} bytes`);
    console.log(`   🎯 Original: ${downloadResult.originalSize} bytes`);
    
    if (downloadResult.success && isValidZip) {
      console.log('\n🚀 SUCCESS: Base-template download is working correctly!');
      console.log('   This confirms NocoBase API access and file download are functional.');
      console.log('   The issue with enterprise automation is likely in the WebContainer loading logic.');
    } else {
      console.log('\n❌ ISSUE DETECTED: Download or file validation failed');
      console.log('   This indicates a problem with NocoBase API access or file transfer.');
    }

  } catch (error) {
    console.log('\n💥 Test failed with error:');
    console.error(error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Ensure NocoBase is running on http://127.0.0.1:13000');
      console.log('   - Check if the port is correct in your .env.local');
      console.log('   - Verify NocoBase Docker container is running');
    }
  }

  console.log('\n━'.repeat(50));
  console.log('🏁 Download test completed');
}

// Run the test
runDownloadTest().catch(console.error);