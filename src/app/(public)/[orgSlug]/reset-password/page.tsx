import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage({ params }: { params: { orgSlug: string } }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <ResetPasswordForm orgSlug={params.orgSlug} />
    </div>
  );
} 