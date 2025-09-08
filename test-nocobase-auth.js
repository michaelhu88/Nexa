#!/usr/bin/env node

/**
 * Enhanced test script with authentication for NocoBase Zip Uploads collection
 * This script handles login and then queries the collection
 */

const NOCOBASE_API_URL = process.env.VITE_NOCOBASE_API_URL || 'http://127.0.0.1:13000';

// Default NocoBase credentials
const TEST_CREDENTIALS = {
  email: process.env.NOCOBASE_TEST_EMAIL || 'admin@nocobase.com',
  password: process.env.NOCOBASE_TEST_PASSWORD || 'admin123',
};

async function testNocoBaseWithAuth() {
  console.log('🔐 Testing NocoBase Connection with Authentication...');
  console.log(`📍 Connecting to: ${NOCOBASE_API_URL}`);
  console.log(`👤 Using email: ${TEST_CREDENTIALS.email}`);
  console.log('━'.repeat(60));

  let authToken = null;

  try {
    // Step 1: Authenticate
    console.log('1️⃣  Attempting to authenticate...');
    const loginResponse = await fetch(`${NOCOBASE_API_URL}/api/auth:signIn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: TEST_CREDENTIALS.password,
      }),
    });

    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      authToken = loginData.data?.token;
      console.log('✅ Authentication successful');
      console.log(`🎫 Token received: ${authToken ? authToken.substring(0, 20) + '...' : 'None'}`);
    } else {
      const errorText = await loginResponse.text();
      console.log(`❌ Authentication failed: ${loginResponse.status} ${loginResponse.statusText}`);
      console.log('Error details:', errorText);
      console.log('\n💡 Please check your credentials in the script or set environment variables:');
      console.log('   export NOCOBASE_TEST_EMAIL="your-email@example.com"');
      console.log('   export NOCOBASE_TEST_PASSWORD="your-password"');
      return;
    }

    // Step 2: Query Zip Uploads collection using direct endpoint
    console.log('\n2️⃣  Querying Zip Uploads collection via /api/zip_uploads...');
    const zipUploadsResponse = await fetch(`${NOCOBASE_API_URL}/api/zip_uploads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (zipUploadsResponse.ok) {
      const zipUploadsData = await zipUploadsResponse.json();
      console.log('✅ Zip Uploads query successful');
      console.log('📊 Collection Data:');
      console.log(JSON.stringify(zipUploadsData, null, 2));
      
      // Analyze the data structure
      if (zipUploadsData.data && Array.isArray(zipUploadsData.data)) {
        console.log(`\n📈 Found ${zipUploadsData.data.length} items in Zip Uploads collection`);
        
        zipUploadsData.data.forEach((item, index) => {
          console.log(`\n   📁 Item ${index + 1}:`);
          Object.keys(item).forEach(key => {
            const value = item[key];
            if (typeof value === 'string' || typeof value === 'number') {
              console.log(`      ${key}: ${value}`);
            } else if (Array.isArray(value)) {
              console.log(`      ${key}: [Array with ${value.length} items]`);
            } else if (value && typeof value === 'object') {
              console.log(`      ${key}: [Object]`);
            }
          });
        });
      } else if (zipUploadsData.data === null) {
        console.log('\n📭 Collection data is null - may be empty or access issue');
      }
    } else {
      console.log(`❌ Zip Uploads query failed: ${zipUploadsResponse.status} ${zipUploadsResponse.statusText}`);
      const errorText = await zipUploadsResponse.text();
      console.log('Error details:', errorText);
    }

    // Step 3: Search for base-template using direct endpoint with filter
    console.log('\n3️⃣  Searching for base-template using direct endpoint...');
    
    // Try with Title field filter
    const baseTemplateResponse = await fetch(`${NOCOBASE_API_URL}/api/zip_uploads?filter[Title][$eq]=base-template`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (baseTemplateResponse.ok) {
      const baseTemplateData = await baseTemplateResponse.json();
      console.log('✅ Base template search successful');
      console.log('🎯 Base Template Search Results:');
      console.log(JSON.stringify(baseTemplateData, null, 2));
      
      if (baseTemplateData.data && baseTemplateData.data.length > 0) {
        const template = baseTemplateData.data[0];
        console.log('\n🎊 SUCCESS: Found base-template!');
        console.log('📋 Template Details:');
        console.log(`   ID: ${template.id || 'N/A'}`);
        console.log(`   Title: ${template.Title || 'N/A'}`);
        console.log(`   File name: ${template['File name'] || 'N/A'}`);
        console.log(`   Size: ${template.Size || 'N/A'}`);
        console.log(`   Path: ${template.Path || 'N/A'}`);
        console.log(`   Created: ${template.createdAt || 'N/A'}`);
        console.log(`   Updated: ${template.updatedAt || 'N/A'}`);
        
        // Look for file attachments with various possible field names
        const fileField = template.file || template.File || template.attachment || template.files;
        if (fileField && Array.isArray(fileField) && fileField.length > 0) {
          console.log('\n📁 Attached Files:');
          fileField.forEach((file, index) => {
            console.log(`   File ${index + 1}:`);
            console.log(`     🆔 ID: ${file.id || 'N/A'}`);
            console.log(`     📄 Filename: ${file.filename || file.name || 'N/A'}`);
            console.log(`     📏 Size: ${file.size ? (file.size / 1024).toFixed(2) + ' KB' : 'N/A'}`);
            console.log(`     🏷️  MIME: ${file.mimetype || file.mime || 'N/A'}`);
            console.log(`     📅 Created: ${file.createdAt || 'N/A'}`);
          });
          
          console.log(`\n✨ Ready for download! Use attachment ID: ${fileField[0].id}`);
          console.log(`   Download URL: /api/attachments/${fileField[0].id}`);
        } else {
          console.log('\n📋 Template fields available:', Object.keys(template));
          console.log('⚠️  No file attachments found in expected format');
        }
      } else {
        console.log('\n❌ No base-template found in search results');
      }
    } else {
      console.log(`❌ Base template search failed: ${baseTemplateResponse.status} ${baseTemplateResponse.statusText}`);
      const errorText = await baseTemplateResponse.text();
      console.log('Error details:', errorText);
    }

    // Step 4: List all items using direct endpoint (should show all 5 ZIP uploads)
    console.log('\n4️⃣  Listing all items using direct /api/zip_uploads endpoint...');
    const allItemsResponse = await fetch(`${NOCOBASE_API_URL}/api/zip_uploads`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });

    if (allItemsResponse.ok) {
      const allItemsData = await allItemsResponse.json();
      console.log('✅ All items query successful');
      console.log('📊 Full Response Structure:');
      console.log(JSON.stringify(allItemsData, null, 2));
      
      if (allItemsData.data && Array.isArray(allItemsData.data) && allItemsData.data.length > 0) {
        console.log(`\n🎉 Found ${allItemsData.data.length} total ZIP uploads!`);
        
        allItemsData.data.forEach((item, index) => {
          const title = item.Title || item.name || item.title;
          const fileName = item['File name'] || 'N/A';
          const size = item.Size || 'N/A';
          console.log(`\n   📁 ${index + 1}. "${title}"`);
          console.log(`      📄 File: ${fileName}`);
          console.log(`      📏 Size: ${size} bytes`);
          console.log(`      🆔 ID: ${item.id || 'N/A'}`);
          console.log(`      📅 Created: ${item.createdAt || 'N/A'}`);
          
          // Show first few fields to understand structure
          console.log(`      🔧 Fields: ${Object.keys(item).slice(0, 5).join(', ')}...`);
        });
        
        // Specifically look for our expected files
        const expectedFiles = ['base-template', 'module-customer-care', 'module-sales', 'module-shipping', 'module-warehouse'];
        console.log(`\n🔍 Checking for expected files:`);
        expectedFiles.forEach(expectedFile => {
          const found = allItemsData.data.find(item => {
            const title = (item.Title || '').toLowerCase();
            return title.includes(expectedFile);
          });
          console.log(`   ${found ? '✅' : '❌'} ${expectedFile}: ${found ? 'Found' : 'Not found'}`);
        });
        
      } else if (allItemsData.data === null) {
        console.log('📭 Collection data is null - may need different access method');
      } else {
        console.log('📭 No items found or unexpected data structure');
        console.log('Response keys:', Object.keys(allItemsData));
      }
    } else {
      console.log(`❌ All items query failed: ${allItemsResponse.status} ${allItemsResponse.statusText}`);
      const errorText = await allItemsResponse.text();
      console.log('Error details:', errorText);
    }

  } catch (error) {
    console.log('\n❌ Test failed with error:');
    console.error(error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Ensure NocoBase is running on http://127.0.0.1:13000');
      console.log('   - Check if the port is correct in your .env.local');
      console.log('   - Verify NocoBase Docker container is running');
    }
  }

  console.log('\n━'.repeat(60));
  console.log('🏁 Test completed');
}

// Run the test
testNocoBaseWithAuth().catch(console.error);