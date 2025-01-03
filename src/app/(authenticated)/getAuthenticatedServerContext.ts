import { cache } from "react";
import { User } from "@supabase/auth-js";

export const getAuthenticatedServerContext: () => {
  calledByNested: boolean;
  createdAt: string;
  calledByLayout: boolean;
  org: any;
  calledByPage: boolean;
  user: any;
  userPermissions: string[];
} = cache(() => ({
  createdAt: Date.now().toString(),
  org: null,
  user: null,
  calledByLayout: false,
  calledByPage: false,
  calledByNested: false,
  userPermissions: [],
}));
