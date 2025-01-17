import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";

export async function checkPermissions(requiredPermissions: string[]): Promise<boolean> {
  const AuthServerContext = getAuthenticatedServerContext();
  const { user, userPermissions } = AuthServerContext;

  if (!user) {
    return false;
  }

  return userPermissions.some((permission) => requiredPermissions.includes(permission));
} 