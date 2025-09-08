#!/usr/bin/env node

/**
 * Test script for WebContainer zip loading functionality
 * This tests the enterprise template loading service
 */

import JSZip from 'jszip';
import fetch from 'node-fetch';

const NOCOBASE_API_URL = process.env.VITE_NOCOBASE_API_URL || 'http://127.0.0.1:13000';

// Test credentials
const TEST_CREDENTIALS = {
  email: 'admin@nocobase.com',
  password: 'admin123',
};

class TestEnterpriseTemplateLoader {
  constructor() {
    this.authToken = null;
    this.baseURL = NOCOBASE_API_URL;
  }

  async authenticate() {
    console.log('🔐 Authenticating...');
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
      return true;
    }
    
    console.log('❌ Authentication failed');
    return false;
  }

  async getBaseTemplate() {
    console.log('📥 Fetching base-template...');
    const response = await fetch(`${this.baseURL}/api/zip_uploads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      const baseTemplate = data.data.find(item => item.title === 'base-template');
      
      if (baseTemplate) {
        console.log('✅ Base template found:', {
          id: baseTemplate.id,
          title: baseTemplate.title,
          filename: baseTemplate.filename,
          size: baseTemplate.size,
          url: baseTemplate.url
        });
        return baseTemplate;
      }
    }
    
    console.log('❌ Base template not found');
    return null;
  }

  async downloadAndExtractZip(template) {
    console.log(`\n📦 Downloading zip from: ${template.url}`);
    
    const response = await fetch(`${this.baseURL}${template.url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      console.log('❌ Failed to download zip');
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ Downloaded ${arrayBuffer.byteLength} bytes`);

    console.log('\n📂 Extracting zip contents...');
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    const files = [];
    const fileNames = Object.keys(zip.files);
    
    console.log(`📊 Found ${fileNames.length} entries in zip`);

    for (const filename of fileNames) {
      const file = zip.files[filename];
      
      if (file.dir) {
        console.log(`   📁 Directory: ${filename}`);
        continue;
      }

      const ext = filename.substring(filename.lastIndexOf('.'));
      const isBinary = ['.png', '.jpg', '.jpeg', '.gif', '.ico'].includes(ext);
      
      let content;
      if (isBinary) {
        const arrayBuffer = await file.async('arraybuffer');
        const bytes = new Uint8Array(arrayBuffer);
        content = btoa(String.fromCharCode(...bytes));
        console.log(`   🖼️  Binary file: ${filename} (${bytes.length} bytes -> base64)`);
      } else {
        content = await file.async('string');
        console.log(`   📄 Text file: ${filename} (${content.length} chars)`);
      }

      files.push({
        path: filename,
        content: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        isBinary,
        size: content.length
      });
    }

    return files;
  }

  generateNexaArtifact(files) {
    console.log('\n🎨 Generating nexaArtifact structure...');
    
    const textFiles = files.filter(f => !f.isBinary);
    console.log(`   📝 ${textFiles.length} text files to include`);
    
    const nexaActions = textFiles.map(file => {
      return `<nexaAction type="file" filePath="${file.path}">
${file.content}
</nexaAction>`;
    }).join('\n\n');

    const artifact = `<nexaArtifact id="enterprise-template" title="Base Template - Enterprise Automation" type="bundled">
${nexaActions}
</nexaArtifact>`;

    console.log('✅ Generated artifact structure');
    console.log(`   Total length: ${artifact.length} characters`);
    
    return artifact;
  }
}

async function runTest() {
  console.log('🧪 Testing WebContainer Zip Loading');
  console.log('━'.repeat(50));

  const loader = new TestEnterpriseTemplateLoader();

  try {
    // Step 1: Authenticate
    const authSuccess = await loader.authenticate();
    if (!authSuccess) {
      return;
    }

    // Step 2: Get base template
    const template = await loader.getBaseTemplate();
    if (!template) {
      return;
    }

    // Step 3: Download and extract zip
    const files = await loader.downloadAndExtractZip(template);
    if (!files) {
      return;
    }

    // Step 4: Generate nexaArtifact structure
    const artifact = loader.generateNexaArtifact(files);

    console.log('\n🎉 Test Results:');
    console.log('━'.repeat(50));
    console.log('✅ Successfully authenticated with NocoBase');
    console.log('✅ Located base-template in zip_uploads collection');
    console.log(`✅ Downloaded and extracted ${files.length} files`);
    console.log('✅ Generated nexaArtifact structure for WebContainer');
    console.log('\n📋 File Summary:');
    files.slice(0, 5).forEach(file => {
      console.log(`   - ${file.path} (${file.isBinary ? 'binary' : 'text'}, ${file.size} chars/bytes)`);
    });
    if (files.length > 5) {
      console.log(`   ... and ${files.length - 5} more files`);
    }
    
    console.log('\n🚀 Ready for integration with Chat component!');
    console.log('   When user says "let\'s proceed!" after enterprise automation context:');
    console.log('   1. This service will fetch the template');
    console.log('   2. Extract and format files as nexaActions');
    console.log('   3. MessageParser will handle opening the workbench');

  } catch (error) {
    console.log('\n❌ Test failed:');
    console.error(error);
  }

  console.log('\n━'.repeat(50));
  console.log('🏁 Test completed');
}

// Run the test
runTest().catch(console.error);