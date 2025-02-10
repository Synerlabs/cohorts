export const getApplicationStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'pending':
      return 'secondary';
    case 'pending_payment':
      return 'secondary';
    case 'approved':
      return 'outline';
    case 'rejected':
      return 'destructive';
    default:
      return 'default';
  }
};

export const getActivationTypeBadgeVariant = (activationType: string) => {
  switch (activationType) {
    case 'automatic':
      return 'default';
    case 'review_required':
      return 'secondary';
    case 'payment_required':
      return 'destructive';
    case 'review_then_payment':
      return 'outline';
    default:
      return 'default';
  }
}; 