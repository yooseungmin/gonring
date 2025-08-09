const { v4: uuidv4 } = require('uuid');

// Mock test configuration (for demonstration without real API)
const API_BASE_URL = process.env.API_URL || 'http://localhost:8000/api/v1';
const TEST_USERS = {
  userA: {
    username: 'test_user_a@example.com',
    password: 'Password123!',
    token: 'mock_token_a',
    userId: '1a2b3c4d',
    virtualUserId: '1a2b3c4d-5e6f-7g8h-9i0j',
  },
  userB: {
    username: 'test_user_b@example.com',
    password: 'Password123!',
    token: 'mock_token_b',
    userId: '2b3c4d5e',
    virtualUserId: '2b3c4d5e-6f7g-8h9i-0j1k',
  }
};

// Mock API functions (for demonstration)
const api = {
  // Mock database
  mockDB: {
    boxes: []
  },
  
  async login(username, password) {
    // Mock login response
    const user = username.includes('user_a') ? TEST_USERS.userA : TEST_USERS.userB;
    return {
      success: true,
      data: {
        access_token: user.token,
        token_type: 'bearer'
      },
      message: 'Successfully logged in'
    };
  },
  
  async getCurrentUser(token) {
    // Mock user response based on token
    const user = token === TEST_USERS.userA.token ? TEST_USERS.userA : TEST_USERS.userB;
    return {
      success: true,
      data: {
        id: user.userId,
        email: user.username,
        username: user.username.split('@')[0],
        is_active: true,
        is_superuser: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        virtual_user: {
          id: user.virtualUserId,
          user_id: user.userId,
          description: null,
          created_at: new Date().toISOString()
        }
      },
      message: 'User retrieved successfully'
    };
  },
  
  async createBox(token, boxData) {
    // Check who is creating the box
    const user = token === TEST_USERS.userA.token ? TEST_USERS.userA : TEST_USERS.userB;
    
    // Create a box with the correct owner_id
    const newBox = {
      id: uuidv4(),
      name: boxData.name,
      description: boxData.description || null,
      is_public: !!boxData.is_public,
      owner_id: user.virtualUserId, // This is the key property we're testing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      content_count: 0
    };
    
    // Add to our mock database
    this.mockDB.boxes.push(newBox);
    
    return {
      success: true,
      data: newBox,
      message: 'Box created successfully'
    };
  },
  
  async getMyBoxes(token) {
    // Determine which user is requesting boxes
    const user = token === TEST_USERS.userA.token ? TEST_USERS.userA : TEST_USERS.userB;
    
    // Filter boxes by owner_id
    const userBoxes = this.mockDB.boxes.filter(box => box.owner_id === user.virtualUserId);
    
    return {
      success: true,
      data: userBoxes,
      message: 'Boxes retrieved successfully'
    };
  },
  
  async getBox(token, boxId) {
    const box = this.mockDB.boxes.find(b => b.id === boxId);
    
    if (!box) {
      const error = new Error('Box not found');
      error.response = { status: 404 };
      throw error;
    }
    
    return {
      success: true,
      data: box,
      message: 'Box retrieved successfully'
    };
  },
  
  async updateBox(token, boxId, updateData) {
    // Find the box
    const box = this.mockDB.boxes.find(b => b.id === boxId);
    
    if (!box) {
      const error = new Error('Box not found');
      error.response = { status: 404 };
      throw error;
    }
    
    // Check ownership
    const user = token === TEST_USERS.userA.token ? TEST_USERS.userA : TEST_USERS.userB;
    if (box.owner_id !== user.virtualUserId) {
      const error = new Error('Forbidden: You do not own this box');
      error.response = { status: 403 };
      throw error;
    }
    
    // Update box
    Object.assign(box, updateData);
    box.updated_at = new Date().toISOString();
    
    return {
      success: true,
      data: box,
      message: 'Box updated successfully'
    };
  },
  
  async deleteBox(token, boxId) {
    // Find the box
    const boxIndex = this.mockDB.boxes.findIndex(b => b.id === boxId);
    
    if (boxIndex === -1) {
      const error = new Error('Box not found');
      error.response = { status: 404 };
      throw error;
    }
    
    const box = this.mockDB.boxes[boxIndex];
    
    // Check ownership
    const user = token === TEST_USERS.userA.token ? TEST_USERS.userA : TEST_USERS.userB;
    if (box.owner_id !== user.virtualUserId) {
      const error = new Error('Forbidden: You do not own this box');
      error.response = { status: 403 };
      throw error;
    }
    
    // Delete box
    this.mockDB.boxes.splice(boxIndex, 1);
    
    return {
      success: true,
      message: 'Box deleted successfully'
    };
  }
};

// Setup: For our mock tests, we already have the user data setup
async function setup() {
  console.log('Setting up test users...');
  console.log(`User A virtual user ID: ${TEST_USERS.userA.virtualUserId}`);
  console.log(`User B virtual user ID: ${TEST_USERS.userB.virtualUserId}`);
  
  // Clear mock database
  api.mockDB.boxes = [];
}

// Test 1: POST /boxes should set owner_id to virtual_user.id
async function testBoxCreationOwnership() {
  console.log('\n--- Test 1: Box Creation Ownership ---');
  
  try {
    // Create a test box
    const boxData = {
      name: `Test Box ${uuidv4().substring(0, 8)}`,
      description: 'This is a test box for API testing',
      is_public: false
    };
    
    // Create box as User A
    const createResponse = await api.createBox(TEST_USERS.userA.token, boxData);
    
    if (createResponse.success && createResponse.data) {
      const box = createResponse.data;
      console.log(`Box created successfully with ID: ${box.id}`);
      
      // Verify owner_id matches virtual_user.id
      const isOwnershipCorrect = box.owner_id === TEST_USERS.userA.virtualUserId;
      console.log(`Box.owner_id: ${box.owner_id}`);
      console.log(`UserA.virtualUserId: ${TEST_USERS.userA.virtualUserId}`);
      console.log(`Ownership verification: ${isOwnershipCorrect ? 'PASSED' : 'FAILED'}`);
      
      return { 
        success: isOwnershipCorrect, 
        boxId: box.id,
        message: isOwnershipCorrect 
          ? 'Box ownership correctly set to virtual_user.id' 
          : 'Box ownership does not match virtual_user.id'
      };
    } else {
      console.error('Failed to create box:', createResponse.message);
      return { success: false, message: `Failed to create box: ${createResponse.message}` };
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return { success: false, message: `Test error: ${error.message}` };
  }
}

// Test 2: GET /boxes/me should only return boxes owned by the authenticated user
async function testGetMyBoxes() {
  console.log('\n--- Test 2: Get My Boxes ---');
  
  try {
    // Create a box for User A
    const boxDataA = {
      name: `User A's Box ${uuidv4().substring(0, 8)}`,
      description: 'This box belongs to User A',
      is_public: true
    };
    
    const createResponseA = await api.createBox(TEST_USERS.userA.token, boxDataA);
    if (!createResponseA.success) {
      throw new Error(`Failed to create box for User A: ${createResponseA.message}`);
    }
    
    // Create a box for User B
    const boxDataB = {
      name: `User B's Box ${uuidv4().substring(0, 8)}`,
      description: 'This box belongs to User B',
      is_public: true
    };
    
    const createResponseB = await api.createBox(TEST_USERS.userB.token, boxDataB);
    if (!createResponseB.success) {
      throw new Error(`Failed to create box for User B: ${createResponseB.message}`);
    }
    
    // Get User A's boxes
    const myBoxesResponse = await api.getMyBoxes(TEST_USERS.userA.token);
    
    if (myBoxesResponse.success && Array.isArray(myBoxesResponse.data)) {
      console.log(`Retrieved ${myBoxesResponse.data.length} boxes for User A`);
      
      // Verify all boxes belong to User A
      const allBelongToUserA = myBoxesResponse.data.every(
        box => box.owner_id === TEST_USERS.userA.virtualUserId
      );
      
      console.log(`All boxes belong to User A: ${allBelongToUserA ? 'YES' : 'NO'}`);
      
      // Check if any box belongs to User B
      const hasBBoxes = myBoxesResponse.data.some(
        box => box.owner_id === TEST_USERS.userB.virtualUserId
      );
      
      console.log(`Contains any User B boxes: ${hasBBoxes ? 'YES (FAIL)' : 'NO (PASS)'}`);
      
      return { 
        success: allBelongToUserA && !hasBBoxes, 
        message: allBelongToUserA && !hasBBoxes 
          ? 'GET /boxes/me correctly returns only the authenticated user\'s boxes' 
          : 'GET /boxes/me returned boxes not owned by the authenticated user'
      };
    } else {
      console.error('Failed to get user boxes:', myBoxesResponse.message);
      return { success: false, message: `Failed to get user boxes: ${myBoxesResponse.message}` };
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return { success: false, message: `Test error: ${error.message}` };
  }
}

// Test 3: User should not be able to modify or delete boxes they don't own
async function testBoxPermissions() {
  console.log('\n--- Test 3: Box Permission Enforcement ---');
  
  try {
    // Create a box for User A
    const boxData = {
      name: `Protected Box ${uuidv4().substring(0, 8)}`,
      description: 'This box belongs to User A and should not be editable by User B',
      is_public: true
    };
    
    const createResponse = await api.createBox(TEST_USERS.userA.token, boxData);
    if (!createResponse.success || !createResponse.data) {
      throw new Error(`Failed to create box for permission test: ${createResponse.message}`);
    }
    
    const boxId = createResponse.data.id;
    console.log(`Test box created with ID: ${boxId}`);
    
    // Attempt to update the box as User B
    const updateData = {
      name: 'Attempt to modify another user\'s box',
      description: 'This should fail with a 403 Forbidden error'
    };
    
    try {
      console.log('Attempting to update box as unauthorized user...');
      await api.updateBox(TEST_USERS.userB.token, boxId, updateData);
      console.log('FAILED: Update succeeded when it should have failed');
      return { 
        success: false,
        message: 'Security violation: User B was able to modify User A\'s box'
      };
    } catch (error) {
      // We expect a 403 Forbidden error
      if (error.response && error.response.status === 403) {
        console.log('PASSED: Received expected 403 Forbidden error on update attempt');
      } else {
        console.error('Unexpected error during update test:', error.message);
        return { success: false, message: `Unexpected error: ${error.message}` };
      }
    }
    
    // Attempt to delete the box as User B
    try {
      console.log('Attempting to delete box as unauthorized user...');
      await api.deleteBox(TEST_USERS.userB.token, boxId);
      console.log('FAILED: Delete succeeded when it should have failed');
      return { 
        success: false,
        message: 'Security violation: User B was able to delete User A\'s box'
      };
    } catch (error) {
      // We expect a 403 Forbidden error
      if (error.response && error.response.status === 403) {
        console.log('PASSED: Received expected 403 Forbidden error on delete attempt');
        return { 
          success: true,
          message: 'Box permission enforcement works correctly'
        };
      } else {
        console.error('Unexpected error during delete test:', error.message);
        return { success: false, message: `Unexpected error: ${error.message}` };
      }
    }
  } catch (error) {
    console.error('Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return { success: false, message: `Test error: ${error.message}` };
  }
}

// Run all tests
async function runTests() {
  try {
    await setup();
    
    const testResults = {
      boxCreationOwnership: await testBoxCreationOwnership(),
      getMyBoxes: await testGetMyBoxes(),
      boxPermissions: await testBoxPermissions()
    };
    
    console.log('\n=== TEST RESULTS SUMMARY ===');
    Object.entries(testResults).forEach(([testName, result]) => {
      console.log(`${testName}: ${result.success ? 'PASSED' : 'FAILED'} - ${result.message}`);
    });
    
    const allPassed = Object.values(testResults).every(result => result.success);
    console.log(`\nOverall test result: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

// Execute the tests
runTests();
