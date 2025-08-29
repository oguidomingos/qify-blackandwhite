const { ConvexHttpClient } = require('convex/browser');
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

async function checkMessages() {
  try {
    console.log('🔍 Checking for roigem organization...');
    const orgs = await convex.query('organizations:list');
    const roigem = orgs.find(o => o.name.includes('roigem') || o.instanceName === 'roigem');
    
    if (!roigem) {
      console.log('❌ Roigem organization not found');
      return;
    }
    
    console.log('✅ Found roigem org:', roigem.name, roigem._id);
    
    // Check recent messages
    const messages = await convex.query('messages:listRecent', { 
      orgId: roigem._id, 
      limit: 10 
    });
    
    console.log('💬 Recent messages:', messages?.messages?.length || 0);
    
    if (messages?.messages && messages.messages.length > 0) {
      const lastMessage = messages.messages[0];
      console.log('📨 Last message:');
      console.log('  - Text:', lastMessage.text.substring(0, 100));
      console.log('  - Direction:', lastMessage.direction);
      console.log('  - Timestamp:', new Date(lastMessage.createdAt).toISOString());
      
      // Check sessions
      const sessions = await convex.query('sessions:listByOrg', { orgId: roigem._id });
      console.log('🎯 Sessions:', sessions?.length || 0);
      
      if (sessions && sessions.length > 0) {
        const lastSession = sessions[0];
        console.log('📊 Last session stage:', lastSession.currentStage);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkMessages().catch(console.error);