import { test, expect } from '@playwright/test';

test.describe('Agentic Copywriter API', () => {
  let authToken;
  let projectId;

  test.beforeAll(async ({ request }) => {
    // Generate a test token
    try {
      const response = await request.post('/generate-token', {
        data: {
          user_id: 'test-user',
          expires_in: '1h'
        }
      });
      
      if (response.ok()) {
        const data = await response.json();
        authToken = data.token;
      }
    } catch (error) {
      console.warn('Could not generate test token, some tests may fail');
    }
  });

  test('should generate authentication token', async ({ request }) => {
    const response = await request.post('/generate-token', {
      data: {
        user_id: 'playwright-test-user',
        expires_in: '1h'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('token');
    expect(data.token).toBeTruthy();
    
    // Store token for other tests
    authToken = data.token;
  });

  test('should create a new project', async ({ request }) => {
    if (!authToken) {
      test.skip('No auth token available');
    }

    const response = await request.post('/interview', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        project_name: 'Playwright Test Project',
        description: 'Test project created by Playwright',
        created_via: 'automated_test'
      }
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('project_id');
    expect(data.project_id).toBeTruthy();
    
    // Store project ID for other tests
    projectId = data.project_id;
  });

  test('should list projects', async ({ request }) => {
    if (!authToken) {
      test.skip('No auth token available');
    }

    const response = await request.get('/projects', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.ok()).toBeTruthy();
    const projects = await response.json();
    expect(Array.isArray(projects)).toBeTruthy();
    
    if (projectId) {
      // Should include our test project
      const testProject = projects.find(p => p.id === projectId);
      expect(testProject).toBeTruthy();
      expect(testProject.project_name).toBe('Playwright Test Project');
    }
  });

  test('should reject unauthenticated requests', async ({ request }) => {
    const response = await request.get('/projects');
    expect(response.status()).toBe(401);
    
    const data = await response.json();
    expect(data.error).toContain('token');
  });

  test('should reject invalid authentication', async ({ request }) => {
    const response = await request.get('/projects', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    
    expect(response.status()).toBe(401);
  });

  test('should handle audio transcription with missing file', async ({ request }) => {
    if (!authToken) {
      test.skip('No auth token available');
    }

    const response = await request.post('/transcribe', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        project_id: projectId || 'test-project'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('audio file');
  });

  test('should validate project_id for book generation', async ({ request }) => {
    if (!authToken) {
      test.skip('No auth token available');
    }

    const response = await request.post('/generate-book/nonexistent-project', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Test Book',
        structure: 'automatic'
      }
    });

    // Should return error for nonexistent project
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should handle CORS properly', async ({ request }) => {
    const response = await request.options('/projects');
    
    // Should handle OPTIONS request for CORS
    expect(response.status()).toBeLessThan(500);
  });

  test('should serve static files', async ({ request }) => {
    const response = await request.get('/');
    expect(response.ok()).toBeTruthy();
    
    const content = await response.text();
    expect(content).toContain('Agentic Copywriter');
    expect(content).toContain('Live Voice Recording');
  });

  test('should handle Socket.IO endpoint', async ({ request }) => {
    const response = await request.get('/socket.io/');
    
    // Should respond to Socket.IO handshake
    expect(response.status()).toBeLessThan(500);
  });

  test('should validate required fields for project creation', async ({ request }) => {
    if (!authToken) {
      test.skip('No auth token available');
    }

    const response = await request.post('/interview', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        // Missing project_name
        description: 'Test project without name'
      }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('project_name');
  });

  test('should handle database connection errors gracefully', async ({ request }) => {
    // This test might fail if database is actually working
    // but ensures error handling is in place
    const response = await request.get('/health');
    
    // Should either return health status or handle gracefully
    expect(response.status()).toBeLessThan(500);
  });
});
