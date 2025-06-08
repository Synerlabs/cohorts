import { ForgotPasswordForm } from "@/app/(public)/(home)/components/login/forgot-password-form";

export default async function ForgotPasswordPage({ params }: { params: { orgSlug: string } }) {
  const resolvedParams = await params;
  const orgSlug = decodeURIComponent(resolvedParams.orgSlug).replace(/^@/, "");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <ForgotPasswordForm orgSlug={orgSlug} />
    </div>
  );
} 