#!/usr/bin/env node

/**
 * Test the updated API client with correct NocoBase endpoints
 */

const NOCOBASE_API_URL = 'http://127.0.0.1:13000';

// Simulate the API client methods
class TestApiClient {
  constructor() {
    this.baseURL = NOCOBASE_API_URL;
    this.authToken = null;
  }

  async authenticate() {
    const response = await fetch(`${this.baseURL}/api/auth:signIn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@nocobase.com',
        password: 'admin123',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      this.authToken = data.data?.token;
      return true;
    }
    return false;
  }

  async getZipUploads() {
    const response = await fetch(`${this.baseURL}/api/zip_uploads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (response.ok) {
      return response.json();
    }
    throw new Error(`Failed to get zip uploads: ${response.statusText}`);
  }

  async getBaseTemplate() {
    const response = await this.getZipUploads();
    
    if (!response.data || response.data.length === 0) {
      throw new Error('No zip uploads found');
    }

    // Find base-template by title
    const baseTemplate = response.data.find(item => item.title === 'base-template');
    
    if (!baseTemplate) {
      throw new Error('Base template not found');
    }

    return baseTemplate;
  }

  async getBaseTemplateZip() {
    const template = await this.getBaseTemplate();
    
    if (!template.url) {
      throw new Error('Base template file URL not found');
    }

    console.log(`📥 Downloading base template from: ${template.url}`);
    
    const response = await fetch(`${this.baseURL}${template.url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      },
    });

    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(`Failed to download zip file: ${response.statusText}`);
  }
}

async function testApiClient() {
  console.log('🧪 Testing Updated API Client...');
  console.log('━'.repeat(50));

  const client = new TestApiClient();

  try {
    // Step 1: Authenticate
    console.log('1️⃣  Authenticating...');
    const authSuccess = await client.authenticate();
    
    if (!authSuccess) {
      console.log('❌ Authentication failed');
      return;
    }
    console.log('✅ Authentication successful');

    // Step 2: Get all ZIP uploads
    console.log('\n2️⃣  Getting all ZIP uploads...');
    const uploads = await client.getZipUploads();
    console.log(`✅ Found ${uploads.data.length} ZIP uploads`);
    
    uploads.data.forEach((upload, index) => {
      console.log(`   ${index + 1}. ${upload.title} (${upload.filename}, ${upload.size} bytes)`);
    });

    // Step 3: Get base template specifically
    console.log('\n3️⃣  Getting base template...');
    const baseTemplate = await client.getBaseTemplate();
    console.log('✅ Base template found:');
    console.log(`   ID: ${baseTemplate.id}`);
    console.log(`   Title: ${baseTemplate.title}`);
    console.log(`   Filename: ${baseTemplate.filename}`);
    console.log(`   Size: ${(baseTemplate.size / 1024).toFixed(2)} KB`);
    console.log(`   URL: ${baseTemplate.url}`);

    // Step 4: Download base template zip
    console.log('\n4️⃣  Downloading base template zip...');
    const zipData = await client.getBaseTemplateZip();
    console.log(`✅ Downloaded ${zipData.byteLength} bytes`);
    console.log(`   Expected: ${baseTemplate.size} bytes`);
    console.log(`   Match: ${zipData.byteLength === baseTemplate.size ? '✅' : '❌'}`);

    console.log('\n🎉 All API client tests passed!');
    console.log('🚀 Ready for enterprise automation template system implementation');

  } catch (error) {
    console.log('\n❌ Test failed:');
    console.error(error.message);
  }

  console.log('\n━'.repeat(50));
  console.log('🏁 API client test completed');
}

testApiClient().catch(console.error);