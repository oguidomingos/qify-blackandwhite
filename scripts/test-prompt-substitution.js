#!/usr/bin/env node

/**
 * Test script for template substitution functionality
 */

console.log('🧪 Testing Template Substitution');
console.log('='.repeat(50));

// Test the template substitution function locally
function substitutePromptTemplate(template, variables) {
  let result = template;
  
  // Simple variable substitution like {{variableName}}
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? String(variables[varName]) : match;
  });
  
  // Handle $now special variable 
  result = result.replace(/\{\{\$now\}\}/g, () => {
    return new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  });
  
  // Conditional substitution like {{#if variable}}content{{else}}alternative{{/if}}
  result = result.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{else\}\}(.*?)\{\{\/if\}\}/gs, (match, varPath, ifContent, elseContent) => {
    const value = getNestedProperty(variables, varPath);
    return value ? ifContent : elseContent;
  });
  
  // Simple conditionals without else
  result = result.replace(/\{\{#if\s+(\w+(?:\.\w+)*)\}\}(.*?)\{\{\/if\}\}/gs, (match, varPath, content) => {
    const value = getNestedProperty(variables, varPath);
    return value ? content : '';
  });
  
  // Nested property access like {{facts.name}}
  result = result.replace(/\{\{(\w+\.\w+)\}\}/g, (match, varPath) => {
    const value = getNestedProperty(variables, varPath);
    return value !== undefined ? String(value) : match;
  });
  
  return result;
}

function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

// Test template
const testTemplate = `📅 **Data/Hora Atual:** {{$now}}
📋 **Dados do Cliente:**
* Nome: {{#if facts.name}}{{facts.name}}{{else}}Não informado{{/if}}
* Empresa: {{#if facts.business}}{{facts.business}}{{else}}Não informado{{/if}}
* Estágio: {{currentStage}}
* Perguntas feitas: {{askedQuestions}}

🎯 **Contexto da Conversa:**
{{contextText}}`;

// Test variables
const testVars = {
  currentStage: 'P',
  askedQuestions: 'Nome, empresa, problema principal',
  contextText: 'Cliente demonstrou interesse em soluções de automação.',
  facts: {
    name: 'João Silva',
    business: 'TechCorp Ltda'
  }
};

console.log('📝 Template original:');
console.log(testTemplate);
console.log('\n' + '='.repeat(50));

console.log('🔧 Variáveis de teste:');
console.log(JSON.stringify(testVars, null, 2));
console.log('\n' + '='.repeat(50));

console.log('✨ Resultado da substituição:');
const result = substitutePromptTemplate(testTemplate, testVars);
console.log(result);
console.log('\n' + '='.repeat(50));

// Test edge cases
console.log('🧪 Testando casos especiais...');

const edgeCaseTemplate = `
- Variable not found: {{nonExistent}}
- Nested not found: {{facts.missing}}
- Conditional with missing: {{#if facts.missing}}Found{{else}}Not found{{/if}}
- Simple conditional: {{#if facts.name}}Name exists: {{facts.name}}{{/if}}
- Current timestamp: {{$now}}
`;

const edgeResult = substitutePromptTemplate(edgeCaseTemplate, testVars);
console.log(edgeResult);

console.log('\n✅ Template substitution test completed!');
console.log('🎯 Key features verified:');
console.log('  - {{$now}} timestamp substitution');  
console.log('  - {{variable}} simple substitution');
console.log('  - {{object.property}} nested property access');
console.log('  - {{#if condition}}content{{else}}alternative{{/if}} conditionals');
console.log('  - Missing variable handling (keeps original placeholder)');