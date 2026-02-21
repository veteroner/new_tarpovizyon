import type { ReactNode } from 'react';
// Unused during disabled auth phase; re-enable when activating auth
// import { Navigate, useLocation } from 'react-router-dom';
// import { useAuthStore } from '../store/authStore';
import { type Permission } from '../types/auth';
// import { type User } from '../types/auth'; // Unused during disabled auth phase

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
  requiredPermission?: {
    resource: Permission['resource'];
    action: Permission['action'];
  };
  fallback?: ReactNode;
}

/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication or specific permissions.
 * Redirects to login if user is not authenticated.
 * Shows fallback UI if user lacks required permission.
 * 
 * Usage:
 * ```tsx
 * <ProtectedRoute requireAuth>
 *   <RationEdit />
 * </ProtectedRoute>
 * 
 * <ProtectedRoute requiredPermission={{ resource: 'ration', action: 'delete' }}>
 *   <DeleteButton />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requireAuth: _requireAuth = true,
  requiredPermission: _requiredPermission,
  fallback: _fallback,
}: ProtectedRouteProps) {
  // AUTH DISABLED: Bypass all checks, render children directly
  // When re-enabling: uncomment the logic below and remove this return
  return <>{children}</>;

  /* DISABLED AUTH LOGIC (preserved for future use)
  
  const { user, loading } = useAuthStore();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if auth required but user not logged in
  if (requireAuth && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permission if required
  if (requiredPermission && user) {
    const allowed = hasPermission(
      user,
      requiredPermission.resource,
      requiredPermission.action
    );

    if (!allowed) {
      // Show fallback UI or default "Access Denied" message
      return (
        fallback || (
          <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Erişim Engellendi
              </h2>
              <p className="text-gray-600 mb-4">
                Bu sayfayı görüntülemek için yeterli izniniz yok.
              </p>
              <p className="text-sm text-gray-500">
                Rolünüz: <strong>{user.role}</strong>
              </p>
              <button
                onClick={() => window.history.back()}
                className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                ← Geri Dön
              </button>
            </div>
          </div>
        )
      );
    }
  }

  // User authenticated and has permission → render children
  return <>{children}</>;
  */
}

/* AUTH DISABLED: canAccessRoute utility commented out to fix fast-refresh warning
 * Re-enable when auth is reactivated
 *
 * export function canAccessRoute(
 *   user: User | null,
 *   permission?: { resource: Permission['resource']; action: Permission['action'] }
 * ): boolean {
 *   if (!user) return false;
 *   if (!permission) return true;
 *   return hasPermission(user, permission.resource, permission.action);
 * }
 */
