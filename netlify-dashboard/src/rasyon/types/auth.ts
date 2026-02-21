/**
 * Authentication & Authorization Types
 * 
 * Enterprise-grade auth system with role-based access control (RBAC)
 */

export type UserRole = 'admin' | 'nutritionist' | 'viewer';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  organizationId: string | null;
  createdAt: string; // ISO timestamp
  lastLoginAt: string; // ISO timestamp
  emailVerified: boolean;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  plan: 'free' | 'pro' | 'enterprise';
}

export interface Permission {
  resource: 'ration' | 'feed' | 'inventory' | 'settings' | 'organization';
  action: 'create' | 'read' | 'update' | 'delete';
}

/**
 * Role Permission Matrix
 * Defines what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Full access to everything
    { resource: 'ration', action: 'create' },
    { resource: 'ration', action: 'read' },
    { resource: 'ration', action: 'update' },
    { resource: 'ration', action: 'delete' },
    { resource: 'feed', action: 'create' },
    { resource: 'feed', action: 'read' },
    { resource: 'feed', action: 'update' },
    { resource: 'feed', action: 'delete' },
    { resource: 'inventory', action: 'create' },
    { resource: 'inventory', action: 'read' },
    { resource: 'inventory', action: 'update' },
    { resource: 'inventory', action: 'delete' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'organization', action: 'create' },
    { resource: 'organization', action: 'read' },
    { resource: 'organization', action: 'update' },
    { resource: 'organization', action: 'delete' },
  ],
  nutritionist: [
    // Can CRUD rations, read-only feeds/inventory
    { resource: 'ration', action: 'create' },
    { resource: 'ration', action: 'read' },
    { resource: 'ration', action: 'update' },
    { resource: 'ration', action: 'delete' },
    { resource: 'feed', action: 'read' },
    { resource: 'inventory', action: 'read' },
    { resource: 'settings', action: 'read' },
  ],
  viewer: [
    // Read-only access
    { resource: 'ration', action: 'read' },
    { resource: 'feed', action: 'read' },
    { resource: 'inventory', action: 'read' },
  ],
};

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: User | null,
  resource: Permission['resource'],
  action: Permission['action']
): boolean {
  if (!user) return false;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  return rolePermissions.some(
    (p) => p.resource === resource && p.action === action
  );
}

/**
 * Check if user can perform action (utility)
 */
export const can = {
  createRation: (user: User | null) => hasPermission(user, 'ration', 'create'),
  editRation: (user: User | null) => hasPermission(user, 'ration', 'update'),
  deleteRation: (user: User | null) => hasPermission(user, 'ration', 'delete'),
  createFeed: (user: User | null) => hasPermission(user, 'feed', 'create'),
  editFeed: (user: User | null) => hasPermission(user, 'feed', 'update'),
  deleteFeed: (user: User | null) => hasPermission(user, 'feed', 'delete'),
  manageInventory: (user: User | null) => hasPermission(user, 'inventory', 'create'),
  manageOrganization: (user: User | null) => hasPermission(user, 'organization', 'update'),
};
