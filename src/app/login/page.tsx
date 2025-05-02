import { LoginForm } from "@/app/(public)/(home)/components/login/login-form";
import { createClient } from "@/lib/utils/supabase/server";
import { redirect } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { RequestInviteButton } from "./components/request-invite-button";

interface LoginPageProps {
  searchParams: {
    error?: string;
    message?: string;
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createClient();

  // Check if user is already logged in
  const { data, error } = await supabase.auth.getUser();
  if (data?.user) {
    redirect("/home");
  }

  // Get error message from URL params
  const errorMessage = searchParams.error || searchParams.message;
  
  // Check if this is an expired link error
  const isExpiredLink = errorMessage?.toLowerCase().includes('expired') || 
                        errorMessage?.toLowerCase().includes('invitation') ||
                        errorMessage?.toLowerCase().includes('invalid');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {errorMessage && (
        <div className="mb-6 max-w-md w-full">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
          
          {isExpiredLink && (
            <div className="flex justify-center">
              <RequestInviteButton />
            </div>
          )}
        </div>
      )}

      <LoginForm />
    </div>
  );
} 