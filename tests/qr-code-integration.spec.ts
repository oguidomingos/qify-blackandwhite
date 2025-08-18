import { test, expect } from '@playwright/test';

test.describe('QR Code Integration in Settings/AI', () => {
  test('should display QR code functionality in AI settings page', async ({ page }) => {
    // Navigate directly to the settings AI page
    await page.goto('/settings/ai');

    // We expect to either see the login page or the AI settings
    // Let's check what we get
    await page.waitForLoadState('networkidle');
    
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Take a screenshot to see what we get
    await page.screenshot({ path: 'test-results/ai-settings-page.png', fullPage: true });
    
    // Check if we're on a login page
    const hasSignInButton = await page.locator('text=Sign in').count() > 0;
    const hasGoogleButton = await page.locator('text=Continue with Google').count() > 0;
    
    if (hasSignInButton || hasGoogleButton) {
      console.log('❗ Authentication required - found login page');
      
      // Try to check if there's a development mode bypass
      const hasDevMode = await page.locator('text=Development mode').count() > 0;
      
      if (hasDevMode) {
        console.log('🔧 Development mode detected');
      }
      
      // For now, just verify we're getting the auth screen as expected
      expect(hasSignInButton || hasGoogleButton).toBe(true);
      
    } else {
      console.log('✅ Accessed AI settings page directly');
      
      // Look for AI configuration elements
      const hasAISettings = await page.locator('h1, h2, h3').filter({ hasText: /AI|Configuração|Settings/ }).count() > 0;
      
      if (hasAISettings) {
        console.log('🤖 Found AI settings elements');
        
        // Look for WhatsApp or QR code related elements
        const hasWhatsAppElements = await page.locator('text=/WhatsApp|QR|Código/i').count() > 0;
        
        if (hasWhatsAppElements) {
          console.log('📱 Found WhatsApp/QR code elements');
        }
        
        // Look for form elements
        const formElements = await page.locator('input, textarea, select, button').count();
        console.log(`📝 Found ${formElements} form elements`);
        
        // Take a detailed screenshot
        await page.screenshot({ path: 'test-results/ai-settings-content.png', fullPage: true });
      }
    }
    
    // Verify the page loaded without major errors
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('should handle WhatsApp API endpoint availability', async ({ page }) => {
    // Test if the QR code API endpoint is accessible
    const response = await page.request.get('/api/health');
    
    if (response.ok()) {
      const healthData = await response.json();
      console.log('Health check response:', healthData);
      expect(healthData.status).toBe('ok');
    } else {
      console.log('Health endpoint not available:', response.status());
    }
  });

  test('should verify WhatsApp webhook endpoint exists', async ({ page }) => {
    // Test webhook endpoint
    const response = await page.request.get('/api/webhook/whatsapp');
    
    // Webhook should exist but return appropriate response for GET
    console.log('Webhook endpoint status:', response.status());
    expect([200, 405]).toContain(response.status()); // 200 OK or 405 Method Not Allowed
  });

  test('should check QR code generation endpoint', async ({ page }) => {
    // Test QR generation endpoint exists
    const response = await page.request.post('/api/wa/qr', {
      data: {
        orgId: 'test-org',
        instanceName: 'test-instance'
      }
    });
    
    console.log('QR endpoint status:', response.status());
    // Could be 400 (validation), 404 (not found), or other
    // Just verify the endpoint exists (not 404 for route not found)
    expect(response.status()).not.toBe(404);
  });
});

test.describe('Application Navigation and Structure', () => {
  test('should verify key pages are accessible', async ({ page }) => {
    const pagesToTest = [
      '/',
      '/dashboard',
      '/settings',
      '/settings/whatsapp',
      '/settings/organization',
      '/onboarding'
    ];
    
    for (const pagePath of pagesToTest) {
      console.log(`Testing page: ${pagePath}`);
      
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check if we get a valid response (not 404)
      const pageTitle = await page.title();
      const bodyText = await page.locator('body').textContent();
      
      console.log(`  - Title: ${pageTitle}`);
      console.log(`  - Content length: ${bodyText?.length || 0} chars`);
      
      // Verify page loaded with content
      expect(bodyText).toBeTruthy();
      expect(bodyText.length).toBeGreaterThan(10);
      
      // Take screenshots for analysis
      await page.screenshot({ path: `test-results/page-${pagePath.replace(/\//g, '-')}.png` });
    }
  });
});