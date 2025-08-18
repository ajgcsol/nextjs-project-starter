import { Configuration, RedirectRequest } from "@azure/msal-browser";

// Configuration for Microsoft Authentication Library (MSAL)
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID || "your-client-id", // Replace with your Azure AD App Registration client ID
    authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY || "https://login.microsoftonline.com/common",
    redirectUri: process.env.NEXT_PUBLIC_AZURE_AD_REDIRECT_URI || "http://localhost:3001/dashboard",
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_AZURE_AD_LOGOUT_REDIRECT_URI || "http://localhost:3001/login",
  },
  cache: {
    cacheLocation: "localStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case 0: // LogLevel.Error
            console.error(message);
            return;
          case 1: // LogLevel.Warning
            console.warn(message);
            return;
          case 2: // LogLevel.Info
            console.info(message);
            return;
          case 3: // LogLevel.Verbose
            console.debug(message);
            return;
        }
      },
    },
  },
};

// Add scopes here for ID token to be used at Microsoft identity platform endpoints.
export const loginRequest: RedirectRequest = {
  scopes: ["User.Read", "email", "profile", "openid"],
  prompt: "select_account",
};

// Add the endpoints here for Microsoft Graph API services you'd like to use.
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  graphUsersEndpoint: "https://graph.microsoft.com/v1.0/users",
};

// Role mapping for Microsoft 365 users based on their groups or other attributes
export const roleMapping = {
  // Map Azure AD groups to application roles
  groups: {
    "admin-group-id": ["admin"],
    "faculty-group-id": ["faculty"],
    "editor-group-id": ["editor"],
    "student-group-id": ["student"],
  },
  // Map specific users to roles (fallback)
  users: {
    "admin@yourdomain.edu": ["admin"],
    "professor@yourdomain.edu": ["faculty", "reviewer"],
    "editor@yourdomain.edu": ["editor", "reviewer"],
  },
  // Default role for authenticated users
  default: ["student"],
};