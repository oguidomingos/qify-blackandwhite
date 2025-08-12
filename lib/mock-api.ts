// Mock API service to simulate data storage until Convex is properly set up

// Mock organization data
let mockOrganizations: any[] = [];
let mockBusinessProfiles: any[] = [];
let mockAgentConfigurations: any[] = [];

// Mock function to simulate saving organization data
export const saveOrganization = async (data: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const org = {
        id: `org_${Date.now()}`,
        ...data,
        createdAt: Date.now(),
      };
      mockOrganizations.push(org);
      resolve(org);
    }, 500);
  });
};

// Mock function to simulate saving business profile
export const saveBusinessProfile = async (orgId: string, data: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const profile = {
        id: `bp_${Date.now()}`,
        orgId,
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockBusinessProfiles.push(profile);
      resolve(profile);
    }, 500);
  });
};

// Mock function to simulate saving agent configuration
export const saveAgentConfiguration = async (orgId: string, data: any) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const config = {
        id: `ac_${Date.now()}`,
        orgId,
        ...data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      mockAgentConfigurations.push(config);
      resolve(config);
    }, 500);
  });
};

// Mock function to simulate getting organization by Clerk ID
export const getOrganizationByClerkId = async (clerkOrgId: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const org = mockOrganizations.find(org => org.clerkOrgId === clerkOrgId);
      resolve(org || null);
    }, 300);
  });
};

// Mock function to simulate updating onboarding step
export const updateOnboardingStep = async (orgId: string, step: string, completed: boolean = false) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const orgIndex = mockOrganizations.findIndex(org => org.id === orgId);
      if (orgIndex !== -1) {
        mockOrganizations[orgIndex].onboardingStep = step;
        mockOrganizations[orgIndex].onboardingCompleted = completed;
        mockOrganizations[orgIndex].updatedAt = Date.now();
      }
      resolve(mockOrganizations[orgIndex] || null);
    }, 300);
  });
};

// Mock function to simulate getting business profile by org ID
export const getBusinessProfileByOrg = async (orgId: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const profile = mockBusinessProfiles.find(bp => bp.orgId === orgId);
      resolve(profile || null);
    }, 300);
  });
};

// Mock function to simulate getting agent configuration by org ID
export const getAgentConfigurationByOrg = async (orgId: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const config = mockAgentConfigurations.find(ac => ac.orgId === orgId);
      resolve(config || null);
    }, 300);
  });
};