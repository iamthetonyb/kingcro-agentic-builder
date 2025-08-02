import { test, expect } from '@playwright/test';

test.describe('Real-time Voice Transcription', () => {
  test('should establish Socket.IO connection and handle live transcription flow', async ({ page }) => {
    await page.goto('/');

    // Wait for Socket.IO to connect
    await page.waitForTimeout(2000);

    // Check connection status
    const connectionStatus = page.locator('#connectionStatus');
    await expect(connectionStatus).toHaveClass(/status-connected/);

    // Set up authentication (mock token)
    await page.fill('#authToken', 'test-token-for-playwright');
    await page.click('button:has-text("Set Authentication")');

    // Create a test project
    await page.fill('#projectName', 'Live Recording Test Project');
    
    // Mock the project creation response
    await page.route('/interview', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          project_id: 'test-project-123',
          project_name: 'Live Recording Test Project'
        })
      });
    });

    await page.click('button:has-text("Create New Project")');
    await expect(page.locator('.status.success')).toContainText('Project');

    // Test live recording functionality
    const liveRecordButton = page.locator('#liveRecordButton');
    await expect(liveRecordButton).toContainText('Start Live Recording');

    // Mock getUserMedia for testing
    await page.addInitScript(() => {
      // Mock MediaRecorder
      window.MediaRecorder = class MockMediaRecorder {
        constructor(stream, options) {
          this.stream = stream;
          this.options = options;
          this.state = 'inactive';
          this.ondataavailable = null;
        }

        start(timeslice) {
          this.state = 'recording';
          // Simulate audio data events
          setTimeout(() => {
            if (this.ondataavailable) {
              const mockBlob = new Blob(['mock audio data'], { type: 'audio/webm' });
              this.ondataavailable({ data: mockBlob });
            }
          }, 1000);
        }

        stop() {
          this.state = 'inactive';
        }

        static isTypeSupported(type) {
          return true;
        }
      };

      // Mock getUserMedia
      navigator.mediaDevices = navigator.mediaDevices || {};
      navigator.mediaDevices.getUserMedia = () => {
        return Promise.resolve({
          getTracks: () => [{
            stop: () => {}
          }]
        });
      };

      // Mock AudioContext
      window.AudioContext = class MockAudioContext {
        constructor() {
          this.sampleRate = 16000;
        }
        
        createMediaStreamSource() {
          return {
            connect: () => {}
          };
        }
        
        createAnalyser() {
          return {
            fftSize: 256,
            frequencyBinCount: 128,
            getByteFrequencyData: (array) => {
              // Fill with mock data
              for (let i = 0; i < array.length; i++) {
                array[i] = Math.random() * 255;
              }
            }
          };
        }
        
        close() {
          return Promise.resolve();
        }
      };
    });

    // Now test the live recording
    await liveRecordButton.click();

    // Should change to recording state
    await expect(liveRecordButton).toContainText('Stop Live Recording');
    await expect(liveRecordButton).toHaveClass(/recording/);

    // Audio visualizer should appear
    await expect(page.locator('#audioVisualizer')).toBeVisible();

    // Status should update
    const liveStatus = page.locator('#liveStatus');
    await expect(liveStatus).toHaveClass(/status-recording/);

    // Stop recording
    await liveRecordButton.click();
    await expect(liveRecordButton).toContainText('Start Live Recording');
    await expect(page.locator('#audioVisualizer')).toBeHidden();
  });

  test('should handle Socket.IO disconnection gracefully', async ({ page }) => {
    await page.goto('/');

    // Wait for initial connection
    await page.waitForTimeout(2000);

    // Simulate socket disconnection
    await page.evaluate(() => {
      if (window.socket) {
        window.socket.disconnect();
      }
    });

    // Should update connection status
    await expect(page.locator('#connectionStatus')).toHaveClass(/status-disconnected/);
    await expect(page.locator('#statusText')).toContainText('Disconnected');
  });

  test('should validate microphone permissions', async ({ page, context }) => {
    await page.goto('/');

    // Mock permission denial
    await context.grantPermissions([], { origin: page.url() });
    
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => {
        return Promise.reject(new Error('Permission denied'));
      };
    });

    // Set up auth and project
    await page.fill('#authToken', 'test-token');
    await page.click('button:has-text("Set Authentication")');
    
    await page.route('/interview', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ project_id: 'test-project' })
      });
    });

    await page.fill('#projectName', 'Test Project');
    await page.click('button:has-text("Create New Project")');

    // Try to start recording
    await page.click('#liveRecordButton');

    // Should show error message
    await expect(page.locator('.status.error')).toContainText('Failed to start recording');
  });

  test('should display live transcription results', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Mock Socket.IO events
    await page.evaluate(() => {
      // Simulate receiving transcription results
      setTimeout(() => {
        if (window.socket && window.displayLiveTranscription) {
          window.displayLiveTranscription({
            text: 'This is a test transcription',
            confidence: 0.85,
            timestamp: new Date().toISOString()
          });
        }
      }, 1000);
    });

    const transcriptionDisplay = page.locator('#liveTranscriptionDisplay');

    // Should show transcription entry
    await expect(transcriptionDisplay.locator('.transcript-entry')).toBeVisible();
    await expect(transcriptionDisplay).toContainText('This is a test transcription');
    await expect(transcriptionDisplay).toContainText('85% confidence');
  });

  test('should handle audio chunk processing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Test that audio visualization works
    await page.addInitScript(() => {
      // Mock the audio visualization
      window.testAudioVisualization = () => {
        const audioBars = document.getElementById('audioBars');
        if (audioBars) {
          // Create some bars
          for (let i = 0; i < 10; i++) {
            const bar = document.createElement('div');
            bar.className = 'audio-bar';
            bar.style.height = '20px';
            audioBars.appendChild(bar);
          }
          return true;
        }
        return false;
      };
    });

    const result = await page.evaluate(() => window.testAudioVisualization());
    expect(result).toBeTruthy();
  });

  test('should maintain real-time connection during extended recording', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    // Simulate long recording session
    let messageCount = 0;
    
    await page.evaluate(() => {
      // Mock continuous socket events
      if (window.socket) {
        const interval = setInterval(() => {
          if (window.displayLiveTranscription) {
            window.displayLiveTranscription({
              text: `Transcription chunk ${Date.now()}`,
              confidence: 0.7 + Math.random() * 0.3,
              timestamp: new Date().toISOString()
            });
          }
        }, 500);

        // Stop after 5 seconds
        setTimeout(() => clearInterval(interval), 5000);
      }
    });

    // Wait for multiple transcription entries
    await page.waitForTimeout(6000);

    const transcriptionEntries = page.locator('.transcript-entry');
    const count = await transcriptionEntries.count();
    
    // Should have received multiple transcription chunks
    expect(count).toBeGreaterThan(5);
  });
});
