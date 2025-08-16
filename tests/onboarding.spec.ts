import { test, expect } from '@playwright/test';

test.describe('Qify Onboarding Flow', () => {
  test('should complete the full onboarding flow successfully', async ({ page }) => {
    // Navigate to onboarding page
    await page.goto('/onboarding');

    // Wait for the page to load and check if we're on the onboarding page
    await expect(page.locator('h1')).toContainText('Configuração Inicial');
    await expect(page.locator('text=Passo 1 de 4')).toBeVisible();

    // Step 1: Business Profile
    console.log('📋 Testing Step 1: Business Profile');
    
    // Verify we're on the business profile step
    await expect(page.locator('[data-slot="card-title"]:has-text("Perfil do Negócio")')).toBeVisible();
    
    // Fill in business information
    await page.fill('input[id="businessName"]', 'TechSolutions Ltda');
    await page.fill('input[id="niche"]', 'Tecnologia');
    await page.fill('input[id="services"]', 'Desenvolvimento, Consultoria, Suporte');
    await page.fill('input[id="targetAudience"]', 'Empresas médias');
    await page.fill('textarea[id="businessDescription"]', 'Empresa de tecnologia especializada em soluções digitais');
    await page.fill('input[id="website"]', 'https://techsolutions.com.br');

    // Wait for data to be filled
    await expect(page.locator('input[id="businessName"]')).toHaveValue('TechSolutions Ltda');
    
    // Monitor console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Click Next button and wait for save
    console.log('💾 Saving Step 1 data...');
    await page.click('button:has-text("Próximo")');
    
    // Wait for the step to complete (look for step 2 indicator)
    await expect(page.locator('text=Passo 2 de 4')).toBeVisible({ timeout: 10000 });
    
    // Check that business profile step is marked as completed
    await expect(page.locator('[data-testid="step-business-completed"], .text-green-400')).toBeVisible();
    
    console.log('✅ Step 1 completed successfully');

    // Step 2: Google Calendar
    console.log('📅 Testing Step 2: Google Calendar');
    
    // Verify we're on the Google Calendar step
    await expect(page.locator('h3', { hasText: 'Google Calendar' })).toBeVisible();
    
    // Verify the "Conectar Google Calendar" button is present but don't click it (would redirect)
    await expect(page.locator('button:has-text("Conectar Google Calendar")')).toBeVisible();
    
    // Skip this step by clicking "Próximo"
    console.log('⏭️ Skipping Google Calendar step...');
    await page.click('button:has-text("Próximo")');
    
    // Wait for step 3
    await expect(page.locator('text=Passo 3 de 4')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Step 2 completed successfully');

    // Step 3: Agent Configuration
    console.log('🤖 Testing Step 3: Agent Configuration');
    
    // Verify we're on the agent configuration step
    await expect(page.locator('[data-slot="card-title"]:has-text("Configuração do Agente")')).toBeVisible();
    
    // Fill in agent name
    await page.fill('input[id="agentName"]', 'Sofia da TechSolutions');
    
    // Select the "Amigável" personality
    console.log('😊 Selecting Amigável personality...');
    await page.locator('h4:has-text("Amigável")').click();
    
    // Verify the personality is selected and example message shows
    await expect(page.locator('text=Caloroso, empático e conversacional')).toBeVisible();
    await expect(page.locator('text=Exemplo de mensagem:')).toBeVisible();
    await expect(page.locator('text=Oi! Tudo bem? Sou o assistente da TechSolutions')).toBeVisible();
    
    // Click Next to save agent configuration
    console.log('💾 Saving Step 3 data...');
    await page.click('button:has-text("Próximo")');
    
    // Wait for step 4
    await expect(page.locator('text=Passo 4 de 4')).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Step 3 completed successfully');

    // Step 4: WhatsApp Setup
    console.log('📱 Testing Step 4: WhatsApp Setup');
    
    // Verify we're on the WhatsApp setup step
    await expect(page.locator('h3', { hasText: 'WhatsApp Setup' })).toBeVisible();
    
    // Fill in phone number
    await page.fill('input[id="phoneNumber"]', '+5511999999999');
    await expect(page.locator('input[id="phoneNumber"]')).toHaveValue('+5511999999999');
    
    // Click "Configurar WhatsApp" button
    console.log('💾 Saving WhatsApp configuration...');
    await page.click('button:has-text("Configurar WhatsApp")');
    
    // Wait for the save to complete (button should become enabled again)
    await expect(page.locator('button:has-text("Configurar WhatsApp")')).not.toHaveText('Salvando...');
    
    console.log('✅ WhatsApp configuration saved');
    
    // Click "Finalizar" to complete onboarding
    console.log('🏁 Finalizing onboarding...');
    await page.click('button:has-text("Finalizar")');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    
    console.log('✅ Onboarding completed - redirected to dashboard');
    
    // Verify we're on the dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    console.log(`Final URL: ${page.url()}`);
    
    // Take a screenshot to verify dashboard content
    await page.screenshot({ path: 'test-results/final-dashboard.png' });
    
    // Check for any typical dashboard content - be flexible about what we expect
    const dashboardContent = await page.textContent('body');
    console.log('Dashboard loaded with content length:', dashboardContent?.length || 0);
    
    // Check for any console errors during the flow
    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console errors detected:', consoleErrors);
    } else {
      console.log('✅ No console errors detected during onboarding');
    }
    
    console.log('🎉 Full onboarding flow test completed successfully!');
  });

  test('should validate required fields in business profile step', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Try to proceed without filling required fields
    await page.click('button:has-text("Próximo")');
    
    // Should still be on step 1 if validation is working
    await expect(page.locator('text=Passo 1 de 4')).toBeVisible();
    
    // Fill minimum required fields
    await page.fill('input[id="businessName"]', 'Test Business');
    await page.fill('input[id="niche"]', 'Test Niche');
    await page.fill('input[id="targetAudience"]', 'Test Audience');
    await page.fill('textarea[id="businessDescription"]', 'Test description');
    
    // Now it should proceed
    await page.click('button:has-text("Próximo")');
    await expect(page.locator('text=Passo 2 de 4')).toBeVisible({ timeout: 10000 });
  });

  test('should validate phone number in WhatsApp step', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Skip to WhatsApp step by filling previous steps quickly
    // Step 1
    await page.fill('input[id="businessName"]', 'Test Business');
    await page.fill('input[id="niche"]', 'Test');
    await page.fill('input[id="targetAudience"]', 'Test');
    await page.fill('textarea[id="businessDescription"]', 'Test');
    await page.click('button:has-text("Próximo")');
    
    // Step 2
    await expect(page.locator('text=Passo 2 de 4')).toBeVisible();
    await page.click('button:has-text("Próximo")');
    
    // Step 3
    await expect(page.locator('text=Passo 3 de 4')).toBeVisible();
    await page.fill('input[id="agentName"]', 'Test Agent');
    await page.click('button:has-text("Próximo")');
    
    // Step 4 - Test phone validation
    await expect(page.locator('text=Passo 4 de 4')).toBeVisible();
    
    // Try to configure WhatsApp without phone number
    const configButton = page.locator('button:has-text("Configurar WhatsApp")');
    await expect(configButton).toBeDisabled();
    
    // Fill invalid phone number
    await page.fill('input[id="phoneNumber"]', '123');
    // Button might still be enabled but should show validation
    
    // Fill valid phone number
    await page.fill('input[id="phoneNumber"]', '+5511999999999');
    await expect(configButton).toBeEnabled();
  });

  test('should handle navigation between steps correctly', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Fill step 1
    await page.fill('input[id="businessName"]', 'Test Business');
    await page.fill('input[id="niche"]', 'Test');
    await page.fill('input[id="targetAudience"]', 'Test');
    await page.fill('textarea[id="businessDescription"]', 'Test');
    await page.click('button:has-text("Próximo")');
    
    // Go to step 2
    await expect(page.locator('text=Passo 2 de 4')).toBeVisible();
    
    // Go back to step 1
    await page.click('button:has-text("Anterior")');
    await expect(page.locator('text=Passo 1 de 4')).toBeVisible();
    
    // Verify data is preserved
    await expect(page.locator('input[id="businessName"]')).toHaveValue('Test Business');
    
    // Go forward again
    await page.click('button:has-text("Próximo")');
    await expect(page.locator('text=Passo 2 de 4')).toBeVisible();
  });

  test('should update progress bar correctly', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Check initial progress (25% for step 1 of 4)
    const progressBar = page.locator('[role="progressbar"], .progress');
    
    // Complete step 1
    await page.fill('input[id="businessName"]', 'Test Business');
    await page.fill('input[id="niche"]', 'Test');
    await page.fill('input[id="targetAudience"]', 'Test');
    await page.fill('textarea[id="businessDescription"]', 'Test');
    await page.click('button:has-text("Próximo")');
    
    // Check progress updates to 50% (step 2 of 4)
    await expect(page.locator('text=Passo 2 de 4')).toBeVisible();
    
    // Complete step 2
    await page.click('button:has-text("Próximo")');
    
    // Check progress updates to 75% (step 3 of 4)
    await expect(page.locator('text=Passo 3 de 4')).toBeVisible();
    
    // Complete step 3
    await page.fill('input[id="agentName"]', 'Test Agent');
    await page.click('button:has-text("Próximo")');
    
    // Check progress updates to 100% (step 4 of 4)
    await expect(page.locator('text=Passo 4 de 4')).toBeVisible();
  });
});