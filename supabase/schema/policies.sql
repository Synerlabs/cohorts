-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_connected_accounts ENABLE ROW LEVEL SECURITY;

-- Organizations Policies
CREATE POLICY "Public read access for organizations"
ON organizations FOR SELECT
USING (true);

CREATE POLICY "Admins can update organizations"
ON organizations FOR UPDATE
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = organizations.id 
        AND role = 'admin'
    )
);

-- Members Policies
CREATE POLICY "Organization members can view other members"
ON members FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = members.org_id
    )
);

CREATE POLICY "Admins can manage members"
ON members FOR ALL
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = members.org_id 
        AND role = 'admin'
    )
);

-- Membership Plans Policies
CREATE POLICY "Public read access for membership plans"
ON membership_plans FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage membership plans"
ON membership_plans FOR ALL
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = membership_plans.org_id 
        AND role = 'admin'
    )
);

-- Orders Policies
CREATE POLICY "Members can view their own orders"
ON orders FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE id = orders.member_id
    )
);

CREATE POLICY "Admins can view all orders"
ON orders FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = orders.org_id 
        AND role = 'admin'
    )
);

-- Payments Policies
CREATE POLICY "Members can view their own payments"
ON payments FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE id = payments.member_id
    )
);

CREATE POLICY "Admins can view all payments"
ON payments FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = payments.org_id 
        AND role = 'admin'
    )
);

-- Stripe Connected Accounts Policies
CREATE POLICY "Admins can view stripe settings"
ON stripe_connected_accounts FOR SELECT
USING (
    auth.uid() IN (
        SELECT user_id 
        FROM members 
        WHERE org_id = stripe_connected_accounts.org_id 
        AND role = 'admin'
    )
); 