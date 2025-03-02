-- Application and Membership Status Types
CREATE TYPE "public"."application_status" AS ENUM (
    'pending',
    'pending_payment',
    'approved',
    'rejected'
);

CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'processing',
    'paid',
    'failed',
    'refunded',
    'cancelled'
);

CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
);

CREATE TYPE "public"."member_role" AS ENUM (
    'admin',
    'member',
    'guest'
);

CREATE TYPE "public"."payment_provider" AS ENUM (
    'stripe',
    'manual'
);

CREATE TYPE "public"."membership_activation_type" AS ENUM (
    'automatic',
    'review_required',
    'payment_required',
    'review_then_payment',
    'form_required',
    'form_then_payment',
    'form_then_review',
    'form_then_payment_then_review',
    'form_then_review_then_payment'
); 