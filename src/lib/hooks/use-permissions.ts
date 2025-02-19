"use client";

import { useEffect, useState } from "react";

export function usePermissions(userPermissions: string[] = []) {
  const hasPermission = (requiredPermissions: string | string[]) => {
    if (!userPermissions) return false;

    if (typeof requiredPermissions === "string") {
      return userPermissions.includes(requiredPermissions);
    }

    return requiredPermissions.every((permission) => userPermissions.includes(permission));
  };

  return {
    hasPermission,
  };
} 