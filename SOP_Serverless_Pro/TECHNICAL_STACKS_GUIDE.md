# Guia de Stacks Técnicos — Serverless

## 📋 ÍNDICE
1. [Stack AWS + Next.js + Convex + Clerk](#stack-aws-nextjs-convex-clerk)
2. [Stack Azure + React + Cosmos + Auth0](#stack-azure-react-cosmos-auth0)
3. [Stack GCP + Vue + Firestore + Firebase Auth](#stack-gcp-vue-firestore-firebase-auth)
4. [Métricas e Analytics](#métricas-e-analytics)
5. [Compliance e Legal](#compliance-e-legal)

---

## 1. STACK AWS + NEXT.JS + CONVEX + CLERK

### Arquitetura Overview
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Next.js   │───▶│    Clerk     │───▶│   Convex    │
│  (Frontend) │    │   (Auth)     │    │ (Backend)   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│  Vercel/    │                        │    AWS      │
│  CloudFront │                        │ (Functions) │
└─────────────┘                        └─────────────┘
```

### Componentes Principais

#### Frontend (Next.js 14+)
```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs'
import { ConvexProvider } from 'convex/react'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <ConvexProvider client={convex}>
        <html lang="pt-BR">
          <body>{children}</body>
        </html>
      </ConvexProvider>
    </ClerkProvider>
  )
}

// app/dashboard/page.tsx
import { useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'

export default function Dashboard() {
  const user = useUser()
  const tasks = useQuery(api.tasks.list, { userId: user.id })
  
  return (
    <div>
      <h1>Dashboard</h1>
      {tasks?.map(task => (
        <TaskCard key={task._id} task={task} />
      ))}
    </div>
  )
}
```

#### Backend (Convex)
```typescript
// convex/tasks.ts
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("tasks")
      .filter(q => q.eq(q.field("userId"), userId))
      .collect()
  }
})

export const create = mutation({
  args: { 
    title: v.string(),
    description: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tasks", {
      ...args,
      completed: false,
      createdAt: Date.now()
    })
  }
})

// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    userId: v.string(),
    completed: v.boolean(),
    createdAt: v.number()
  }).index("by_user", ["userId"])
})
```

#### Autenticação (Clerk)
```typescript
// middleware.ts
import { authMiddleware } from "@clerk/nextjs"

export default authMiddleware({
  publicRoutes: ["/", "/api/webhook"],
  ignoredRoutes: ["/api/convex"]
})

// app/api/webhook/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  const body = await req.text()
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    return new Response('Error verifying webhook', { status: 400 })
  }

  // Handle user.created, user.updated, etc.
  if (evt.type === 'user.created') {
    // Sync user to Convex
    await convex.mutation(api.users.create, {
      clerkId: evt.data.id,
      email: evt.data.email_addresses[0].email_address
    })
  }

  return new Response('', { status: 200 })
}
```

#### Deployment (AWS CDK)
```typescript
// infrastructure/stack.ts
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as s3 from 'aws-cdk-lib/aws-s3'

export class NextjsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // S3 bucket for static assets
    const bucket = new s3.Bucket(this, 'StaticAssets', {
      bucketName: `${id.toLowerCase()}-static-assets`,
      publicReadAccess: true,
      websiteIndexDocument: 'index.html'
    })

    // CloudFront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'Distribution', {
      originConfigs: [{
        s3OriginSource: {
          s3BucketSource: bucket
        },
        behaviors: [{
          isDefaultBehavior: true,
          compress: true,
          allowedMethods: cloudfront.CloudFrontAllowedMethods.GET_HEAD_OPTIONS
        }]
      }]
    })

    // Output the distribution URL
    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: distribution.distributionDomainName
    })
  }
}
```

### Configuração de Ambiente
```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://...convex.cloud
CONVEX_DEPLOY_KEY=...
```

### Monitoramento e Observabilidade
```typescript
// lib/analytics.ts
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Analytics />
      <SpeedInsights />
    </>
  )
}

// lib/monitoring.ts
import { captureException } from '@sentry/nextjs'

export function logError(error: Error, context?: Record<string, any>) {
  console.error('Application error:', error)
  captureException(error, { extra: context })
}
```

---

## 2. STACK AZURE + REACT + COSMOS + AUTH0

### Arquitetura Overview
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   React     │───▶│    Auth0     │───▶│   Azure     │
│ (Frontend)  │    │   (Auth)     │    │ Functions   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│   Azure     │                        │  Cosmos DB  │
│  Static Web │                        │             │
└─────────────┘                        └─────────────┘
```

### Componentes Principais

#### Frontend (React + Vite)
```typescript
// src/main.tsx
import { Auth0Provider } from '@auth0/auth0-react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Auth0Provider
    domain={import.meta.env.VITE_AUTH0_DOMAIN}
    clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: import.meta.env.VITE_AUTH0_AUDIENCE
    }}
  >
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </Auth0Provider>
)

// src/hooks/useApi.ts
import { useAuth0 } from '@auth0/auth0-react'
import { useQuery, useMutation } from '@tanstack/react-query'

export function useApi() {
  const { getAccessTokenSilently } = useAuth0()
  
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = await getAccessTokenSilently()
    
    return fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
  }
  
  return { apiCall }
}
```

#### Backend (Azure Functions)
```typescript
// src/functions/users.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { CosmosClient } from '@azure/cosmos'

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING)
const database = client.database('MyApp')
const container = database.container('Users')

export async function getUsers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const { resources: users } = await container.items.readAll().fetchAll()
    
    return {
      status: 200,
      jsonBody: { users }
    }
  } catch (error) {
    context.error('Error fetching users:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    }
  }
}

export async function createUser(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const user = await request.json()
    const { resource: createdUser } = await container.items.create({
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    })
    
    return {
      status: 201,
      jsonBody: { user: createdUser }
    }
  } catch (error) {
    context.error('Error creating user:', error)
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    }
  }
}

app.http('getUsers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'users',
  handler: getUsers
})

app.http('createUser', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'users',
  handler: createUser
})
```

#### Infraestrutura (Bicep)
```bicep
// main.bicep
param location string = resourceGroup().location
param appName string

// Cosmos DB Account
resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2023-04-15' = {
  name: '${appName}-cosmos'
  location: location
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: '${appName}-functions'
  location: location
  kind: 'functionapp,linux'
  properties: {
    serverFarmId: hostingPlan.id
    siteConfig: {
      linuxFxVersion: 'NODE|18'
      appSettings: [
        {
          name: 'COSMOS_CONNECTION_STRING'
          value: cosmosAccount.listConnectionStrings().connectionStrings[0].connectionString
        }
      ]
    }
  }
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2022-03-01' = {
  name: '${appName}-web'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/user/repo'
    branch: 'main'
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'dist'
    }
  }
}
```

---

## 3. STACK GCP + VUE + FIRESTORE + FIREBASE AUTH

### Arquitetura Overview
```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Vue.js    │───▶│  Firebase    │───▶│  Cloud      │
│ (Frontend)  │    │   Auth       │    │ Functions   │
└─────────────┘    └──────────────┘    └─────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│  Firebase   │                        │  Firestore  │
│  Hosting    │                        │             │
└─────────────┘                        └─────────────┘
```

### Componentes Principais

#### Frontend (Vue 3 + Composition API)
```typescript
// src/composables/useAuth.ts
import { ref, computed } from 'vue'
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth'

const auth = getAuth()
const user = ref<User | null>(null)

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (error) {
      throw new Error('Failed to sign in')
    }
  }
  
  const signUp = async (email: string, password: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, password)
    } catch (error) {
      throw new Error('Failed to sign up')
    }
  }
  
  const logout = async () => {
    await signOut(auth)
  }
  
  // Listen to auth state changes
  onAuthStateChanged(auth, (newUser) => {
    user.value = newUser
  })
  
  return {
    user: readonly(user),
    isAuthenticated,
    signIn,
    signUp,
    logout
  }
}

// src/composables/useFirestore.ts
import { ref, computed } from 'vue'
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore'

const db = getFirestore()

export function useCollection<T>(collectionName: string) {
  const documents = ref<T[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  const add = async (data: Omit<T, 'id'>) => {
    try {
      loading.value = true
      await addDoc(collection(db, collectionName), data)
    } catch (err) {
      error.value = 'Failed to add document'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const update = async (id: string, data: Partial<T>) => {
    try {
      loading.value = true
      await updateDoc(doc(db, collectionName, id), data)
    } catch (err) {
      error.value = 'Failed to update document'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const remove = async (id: string) => {
    try {
      loading.value = true
      await deleteDoc(doc(db, collectionName, id))
    } catch (err) {
      error.value = 'Failed to delete document'
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const subscribe = (userId?: string) => {
    let q = collection(db, collectionName)
    
    if (userId) {
      q = query(q, where('userId', '==', userId))
    }
    
    return onSnapshot(q, (snapshot) => {
      documents.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[]
    })
  }
  
  return {
    documents: readonly(documents),
    loading: readonly(loading),
    error: readonly(error),
    add,
    update,
    remove,
    subscribe
  }
}
```

#### Backend (Cloud Functions)
```typescript
// functions/src/index.ts
import { onRequest } from 'firebase-functions/v2/https'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase-admin/app'

initializeApp()
const db = getFirestore()

// HTTP Function
export const api = onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  
  try {
    const { path, method } = req
    
    if (path === '/users' && method === 'GET') {
      const snapshot = await db.collection('users').get()
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      res.json({ users })
    } else {
      res.status(404).json({ error: 'Not found' })
    }
  } catch (error) {
    console.error('API Error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Firestore Trigger
export const onUserCreated = onDocumentCreated('users/{userId}', async (event) => {
  const userData = event.data?.data()
  
  if (userData) {
    // Send welcome email, create default settings, etc.
    console.log('New user created:', userData)
    
    // Create default user settings
    await db.collection('userSettings').doc(event.params.userId).set({
      theme: 'light',
      notifications: true,
      createdAt: new Date()
    })
  }
})
```

#### Configuração (Firebase)
```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}

// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // User settings
    match /userSettings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public data
    match /public/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 4. MÉTRICAS E ANALYTICS

### Business Intelligence Dashboard

#### Métricas de Produto (AARRR)
```typescript
// lib/analytics.ts
interface AnalyticsEvent {
  event: string
  userId?: string
  properties?: Record<string, any>
  timestamp: Date
}

class Analytics {
  private events: AnalyticsEvent[] = []
  
  // Acquisition
  trackSignup(userId: string, source: string) {
    this.track('user_signup', userId, { source })
  }
  
  // Activation
  trackFirstAction(userId: string, action: string) {
    this.track('first_action', userId, { action })
  }
  
  // Retention
  trackReturn(userId: string, daysSinceLastVisit: number) {
    this.track('user_return', userId, { daysSinceLastVisit })
  }
  
  // Revenue
  trackPurchase(userId: string, amount: number, currency: string) {
    this.track('purchase', userId, { amount, currency })
  }
  
  // Referral
  trackReferral(userId: string, referredUserId: string) {
    this.track('referral', userId, { referredUserId })
  }
  
  private track(event: string, userId?: string, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      userId,
      properties,
      timestamp: new Date()
    }
    
    this.events.push(analyticsEvent)
    
    // Send to analytics service
    this.sendToAnalytics(analyticsEvent)
  }
  
  private async sendToAnalytics(event: AnalyticsEvent) {
    // Send to multiple analytics providers
    await Promise.all([
      this.sendToMixpanel(event),
      this.sendToAmplitude(event),
      this.sendToCustomAnalytics(event)
    ])
  }
}
```

#### Dashboard de Métricas Técnicas
```typescript
// lib/monitoring.ts
interface TechnicalMetrics {
  // RED Metrics
  requestRate: number
  errorRate: number
  duration: number
  
  // USE Metrics
  utilization: number
  saturation: number
  errors: number
  
  // Business Metrics
  activeUsers: number
  revenue: number
  conversionRate: number
}

class MetricsCollector {
  async collectMetrics(): Promise<TechnicalMetrics> {
    const [
      requestRate,
      errorRate,
      duration,
      utilization,
      saturation,
      errors,
      activeUsers,
      revenue,
      conversionRate
    ] = await Promise.all([
      this.getRequestRate(),
      this.getErrorRate(),
      this.getAverageDuration(),
      this.getCPUUtilization(),
      this.getMemorySaturation(),
      this.getErrorCount(),
      this.getActiveUsers(),
      this.getTotalRevenue(),
      this.getConversionRate()
    ])
    
    return {
      requestRate,
      errorRate,
      duration,
      utilization,
      saturation,
      errors,
      activeUsers,
      revenue,
      conversionRate
    }
  }
  
  private async getRequestRate(): Promise<number> {
    // Implementation depends on monitoring service
    // CloudWatch, DataDog, New Relic, etc.
    return 0
  }
  
  // ... other metric collection methods
}
```

### A/B Testing Framework
```typescript
// lib/experiments.ts
interface Experiment {
  id: string
  name: string
  variants: string[]
  trafficAllocation: number
  startDate: Date
  endDate?: Date
  status: 'draft' | 'running' | 'completed'
}

class ExperimentManager {
  private experiments: Map<string, Experiment> = new Map()
  
  async getVariant(experimentId: string, userId: string): Promise<string> {
    const experiment = this.experiments.get(experimentId)
    
    if (!experiment || experiment.status !== 'running') {
      return 'control'
    }
    
    // Consistent hashing for user assignment
    const hash = this.hashUserId(userId + experimentId)
    const bucket = hash % 100
    
    if (bucket < experiment.trafficAllocation) {
      // Assign to variant based on hash
      const variantIndex = hash % experiment.variants.length
      return experiment.variants[variantIndex]
    }
    
    return 'control'
  }
  
  trackConversion(experimentId: string, userId: string, conversionType: string) {
    // Track conversion for analysis
    this.analytics.track('experiment_conversion', userId, {
      experimentId,
      conversionType,
      variant: this.getUserVariant(experimentId, userId)
    })
  }
  
  private hashUserId(input: string): number {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}
```

---

## 5. COMPLIANCE E LEGAL

### LGPD/GDPR Implementation

#### Data Subject Rights
```typescript
// lib/privacy.ts
interface DataSubjectRequest {
  id: string
  userId: string
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction'
  status: 'pending' | 'processing' | 'completed' | 'rejected'
  requestDate: Date
  completionDate?: Date
  reason?: string
}

class PrivacyManager {
  async handleDataSubjectRequest(request: DataSubjectRequest) {
    switch (request.type) {
      case 'access':
        return await this.exportUserData(request.userId)
      
      case 'erasure':
        return await this.deleteUserData(request.userId)
      
      case 'portability':
        return await this.exportPortableData(request.userId)
      
      case 'rectification':
        return await this.updateUserData(request.userId, request.data)
      
      case 'restriction':
        return await this.restrictUserData(request.userId)
    }
  }
  
  private async exportUserData(userId: string) {
    // Collect all user data from all systems
    const userData = await Promise.all([
      this.getUserProfile(userId),
      this.getUserActivity(userId),
      this.getUserPreferences(userId),
      this.getUserTransactions(userId)
    ])
    
    return {
      profile: userData[0],
      activity: userData[1],
      preferences: userData[2],
      transactions: userData[3],
      exportDate: new Date(),
      format: 'JSON'
    }
  }
  
  private async deleteUserData(userId: string) {
    // Soft delete with retention period
    await Promise.all([
      this.markUserForDeletion(userId),
      this.anonymizeUserData(userId),
      this.scheduleDataPurge(userId, 30) // 30 days retention
    ])
  }
}
```

#### Consent Management
```typescript
// lib/consent.ts
interface ConsentRecord {
  userId: string
  purpose: string
  granted: boolean
  timestamp: Date
  ipAddress: string
  userAgent: string
  version: string
}

class ConsentManager {
  async recordConsent(
    userId: string, 
    purpose: string, 
    granted: boolean,
    metadata: { ipAddress: string; userAgent: string }
  ) {
    const consent: ConsentRecord = {
      userId,
      purpose,
      granted,
      timestamp: new Date(),
      ipAddress: metadata.ipAddress,
      userAgent: metadata.userAgent,
      version: '1.0'
    }
    
    await this.saveConsent(consent)
    
    // Update user permissions
    await this.updateUserPermissions(userId, purpose, granted)
  }
  
  async getConsentStatus(userId: string, purpose: string): Promise<boolean> {
    const consent = await this.getLatestConsent(userId, purpose)
    return consent?.granted ?? false
  }
  
  async withdrawConsent(userId: string, purpose: string) {
    await this.recordConsent(userId, purpose, false, {
      ipAddress: 'system',
      userAgent: 'system'
    })
    
    // Trigger data cleanup for this purpose
    await this.cleanupDataForPurpose(userId, purpose)
  }
}
```

#### Audit Trail
```typescript
// lib/audit.ts
interface AuditEvent {
  id: string
  userId?: string
  action: string
  resource: string
  timestamp: Date
  ipAddress: string
  userAgent: string
  result: 'success' | 'failure'
  details?: Record<string, any>
}

class AuditLogger {
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    const auditEvent: AuditEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date()
    }
    
    // Store in tamper-proof storage
    await this.storeAuditEvent(auditEvent)
    
    // Send to SIEM if critical action
    if (this.isCriticalAction(event.action)) {
      await this.sendToSIEM(auditEvent)
    }
  }
  
  async getAuditTrail(
    userId?: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<AuditEvent[]> {
    return await this.queryAuditEvents({
      userId,
      startDate,
      endDate
    })
  }
  
  private isCriticalAction(action: string): boolean {
    const criticalActions = [
      'user_login',
      'user_logout',
      'data_export',
      'data_deletion',
      'permission_change',
      'admin_action'
    ]
    
    return criticalActions.includes(action)
  }
}
```

### Security Headers e Configurações
```typescript
// middleware/security.ts
export function securityHeaders() {
  return {
    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // XSS protection
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    
    // CSP
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.example.com"
    ].join('; '),
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()'
    ].join(', ')
  }
}
```

---

## 📚 RECURSOS ADICIONAIS

### Ferramentas de Desenvolvimento
- **Stacks**: Create T3 App, Vite, Next.js
- **State Management**: Zustand, Pinia, Redux Toolkit
- **UI Libraries**: Tailwind CSS, Chakra UI, Vuetify
- **Testing**: Vitest, Jest, Cypress, Playwright

### Serviços de Terceiros
- **Auth**: Clerk, Auth0, Firebase Auth, AWS Cognito
- **Database**: Convex, Supabase, PlanetScale, MongoDB Atlas
- **Analytics**: Mixpanel, Amplitude, PostHog, Google Analytics
- **Monitoring**: Sentry, LogRocket, DataDog, New Relic

### Compliance e Segurança
- **OWASP**: Top 10, ASVS, Testing Guide
- **Privacy**: LGPD, GDPR, CCPA guidelines
- **Security**: NIST Framework, ISO 27001
- **Audit**: SOC 2, PCI DSS requirements

---

*Este guia técnico complementa o guia principal e deve ser atualizado conforme novas tecnologias e práticas emergem.*