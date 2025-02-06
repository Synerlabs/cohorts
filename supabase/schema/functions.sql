-- Handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, first_name, last_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Process order payment
CREATE OR REPLACE FUNCTION process_order_payment(
    p_order_id UUID,
    p_payment_id UUID
)
RETURNS void AS $$
DECLARE
    v_payment_status payment_status;
    v_order_total numeric;
    v_paid_amount numeric;
BEGIN
    -- Get payment status
    SELECT status INTO v_payment_status
    FROM payments
    WHERE id = p_payment_id;

    -- If payment is successful
    IF v_payment_status = 'paid' THEN
        -- Calculate total paid amount for the order
        SELECT 
            orders.total_amount,
            COALESCE(SUM(p.amount), 0) as paid_amount
        INTO v_order_total, v_paid_amount
        FROM orders
        LEFT JOIN payments p ON p.order_id = orders.id AND p.status = 'paid'
        WHERE orders.id = p_order_id
        GROUP BY orders.total_amount;

        -- If fully paid, update order status
        IF v_paid_amount >= v_order_total THEN
            UPDATE orders
            SET status = 'completed'
            WHERE id = p_order_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get organization members
CREATE OR REPLACE FUNCTION get_organization_members(p_org_id UUID)
RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    role member_role,
    status TEXT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id as member_id,
        m.user_id,
        u.email,
        p.first_name,
        p.last_name,
        m.role,
        m.status,
        m.created_at
    FROM members m
    JOIN auth.users u ON u.id = m.user_id
    JOIN profiles p ON p.id = m.user_id
    WHERE m.org_id = p_org_id
    ORDER BY m.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update member status
CREATE OR REPLACE FUNCTION update_member_status(
    p_member_id UUID,
    p_new_status TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE members
    SET status = p_new_status
    WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate organization metrics
CREATE OR REPLACE FUNCTION get_organization_metrics(p_org_id UUID)
RETURNS TABLE (
    total_members BIGINT,
    active_members BIGINT,
    total_revenue NUMERIC,
    active_plans BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM members WHERE org_id = p_org_id) as total_members,
        (SELECT COUNT(*) FROM members WHERE org_id = p_org_id AND status = 'active') as active_members,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE org_id = p_org_id AND status = 'paid') as total_revenue,
        (SELECT COUNT(*) FROM membership_plans WHERE org_id = p_org_id AND active = true) as active_plans;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 