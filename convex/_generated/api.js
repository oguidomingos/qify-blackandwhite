// Temporary API file until Convex is properly set up
export const api = {
  organizations: {
    getByClerkId: null,
    create: null,
    updateOnboardingStep: null,
  },
  businessProfiles: {
    getByOrg: null,
    upsert: null,
  },
  agentConfigurations: {
    getByOrg: null,
    upsert: null,
  },
  evolutionInstances: {
    getByOrg: null,
    create: null,
    getQRCode: null,
    checkConnection: null,
    startSync: null,
  },
  google: {
    getCredentialsByOrg: null,
    listCalendars: null,
  },
  organizationSettings: {
    getByOrg: null,
    upsert: null,
  },
};

export const internal = {
  evolutionInstances: {
    createInDb: null,
    updateQRCode: null,
    updateConnection: null,
    updateLastSync: null,
    getById: null,
  },
  syncStatus: {
    create: null,
  },
};