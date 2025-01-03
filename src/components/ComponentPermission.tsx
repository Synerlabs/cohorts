import { flattenedPermissions, permissions } from "@/lib/types/permissions";
import { getAuthenticatedServerContext } from "@/app/(authenticated)/getAuthenticatedServerContext";

type ComponentPermissionProps = {
  requiredPermissions: string[];
  children: React.ReactNode;
};

export function ComponentPermission({
  requiredPermissions,
  children,
}: ComponentPermissionProps) {
  const AuthServerContext = getAuthenticatedServerContext();
  const { user, userPermissions } = AuthServerContext;
  console.log("userPermissions", userPermissions);
  if (!user) {
    return <></>;
  }
  return (
    userPermissions.some((permission) =>
      requiredPermissions.includes(permission),
    ) && <>{children}</>
  );
}
