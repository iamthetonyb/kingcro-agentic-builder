import { test, expect } from '@playwright/test';

test.describe('Agentic Copywriter Web Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the main page with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Agentic Copywriter/);
    await expect(page.locator('h1')).toContainText('Agentic Copywriter - Voice to Book Platform');
  });

  test('should display connection status', async ({ page }) => {
    const connectionStatus = page.locator('#connectionStatus');
    await expect(connectionStatus).toBeVisible();
    
    // Should start as disconnected or connected
    await expect(connectionStatus).toHaveClass(/status-(connected|disconnected)/);
  });

  test('should have authentication section', async ({ page }) => {
    await expect(page.locator('text=Authentication')).toBeVisible();
    await expect(page.locator('#authToken')).toBeVisible();
    await expect(page.locator('button:has-text("Set Authentication")')).toBeVisible();
  });

  test('should have project management section', async ({ page }) => {
    await expect(page.locator('text=Project Management')).toBeVisible();
    await expect(page.locator('#projectName')).toBeVisible();
    await expect(page.locator('button:has-text("Create New Project")')).toBeVisible();
  });

  test('should have live voice recording section', async ({ page }) => {
    await expect(page.locator('text=Live Voice Recording & Transcription')).toBeVisible();
    await expect(page.locator('#liveRecordButton')).toBeVisible();
    await expect(page.locator('#liveRecordButton')).toContainText('Start Live Recording');
  });

  test('should have file upload section', async ({ page }) => {
    await expect(page.locator('text=Voice Recording & File Upload')).toBeVisible();
    await expect(page.locator('#fileUploadArea')).toBeVisible();
    await expect(page.locator('#audioFile')).toBeHidden(); // Hidden file input
  });

  test('should have book generation section', async ({ page }) => {
    await expect(page.locator('text=Book Generation & Copywriting')).toBeVisible();
    await expect(page.locator('#bookTitle')).toBeVisible();
    await expect(page.locator('#bookStructure')).toBeVisible();
    await expect(page.locator('button:has-text("Generate Book")')).toBeVisible();
  });

  test('should require authentication token for project creation', async ({ page }) => {
    await page.fill('#projectName', 'Test Project');
    await page.click('button:has-text("Create New Project")');
    
    // Should show error message about authentication
    await expect(page.locator('.status.error')).toContainText('Please set authentication token first');
  });

  test('should require project selection for live recording', async ({ page }) => {
    await page.click('#liveRecordButton');
    
    // Should show error message about project selection
    await expect(page.locator('.status.error')).toContainText('Please select or create a project first');
  });

  test('should enable transcribe button when file is selected', async ({ page }) => {
    // Initial state - button should be disabled
    await expect(page.locator('#transcribeButton')).toBeDisabled();
    
    // Simulate file selection by creating a test file
    const fileInput = page.locator('#audioFile');
    await fileInput.setInputFiles({
      name: 'test-audio.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.from('fake audio data')
    });
    
    // Button should now be enabled
    await expect(page.locator('#transcribeButton')).toBeEnabled();
  });

  test('should update upload text when file is selected', async ({ page }) => {
    const fileInput = page.locator('#audioFile');
    await fileInput.setInputFiles({
      name: 'test-audio.wav',
      mimeType: 'audio/wav',
      buffer: Buffer.from('fake audio data')
    });
    
    await expect(page.locator('#uploadText')).toContainText('Selected: test-audio.wav');
  });

  test('should show projects list when loaded', async ({ page }) => {
    const projectsList = page.locator('#projectsList');
    await expect(projectsList).toBeVisible();
    await expect(projectsList).toContainText('Click to load projects...');
  });

  test('should display results area when needed', async ({ page }) => {
    const resultsArea = page.locator('#resultsArea');
    // Should be hidden initially
    await expect(resultsArea).toBeHidden();
  });

  test('should have responsive design elements', async ({ page }) => {
    // Check that the page has responsive CSS classes and containers
    await expect(page.locator('.container')).toHaveCount.atLeast(4);
    await expect(page.locator('.section')).toHaveCount.atLeast(3);
  });

  test('should have proper audio file input attributes', async ({ page }) => {
    const audioInput = page.locator('#audioFile');
    await expect(audioInput).toHaveAttribute('accept', 'audio/*');
    await expect(audioInput).toHaveAttribute('type', 'file');
  });

  test('should have language selection options', async ({ page }) => {
    const languageSelect = page.locator('#language');
    await expect(languageSelect).toBeVisible();
    
    // Check for some expected language options
    await expect(languageSelect.locator('option[value="auto"]')).toBeVisible();
    await expect(languageSelect.locator('option[value="en"]')).toBeVisible();
    await expect(languageSelect.locator('option[value="es"]')).toBeVisible();
  });

  test('should have book structure options', async ({ page }) => {
    const structureSelect = page.locator('#bookStructure');
    await expect(structureSelect).toBeVisible();
    
    // Check for expected structure options
    await expect(structureSelect.locator('option[value="automatic"]')).toBeVisible();
    await expect(structureSelect.locator('option[value="chronological"]')).toBeVisible();
    await expect(structureSelect.locator('option[value="thematic"]')).toBeVisible();
  });
});
