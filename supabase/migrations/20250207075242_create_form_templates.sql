-- Create form_templates table
CREATE TABLE public.form_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES public.group(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL, -- Stores the form structure and validation rules
    settings JSONB, -- Form-wide settings (e.g., submission limits, notifications)
    status VARCHAR(20) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create form_responses table
CREATE TABLE public.form_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES public.form_templates(id),
    response_data JSONB NOT NULL, -- Stores the actual form responses
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Add RLS policies for form_templates
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form templates in their organization" ON public.form_templates
    FOR SELECT
    USING (
        org_id IN (
            SELECT group_id FROM public.group_users WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage form templates in their organization" ON public.form_templates
    FOR ALL
    USING (
        org_id IN (
            SELECT group_id FROM public.group_users WHERE user_id = auth.uid()
        )
    );

-- Add RLS policies for form_responses
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form responses in their organization" ON public.form_responses
    FOR SELECT
    USING (
        template_id IN (
            SELECT id FROM public.form_templates 
            WHERE org_id IN (
                SELECT group_id FROM public.group_users WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can submit form responses" ON public.form_responses
    FOR INSERT
    WITH CHECK (
        template_id IN (
            SELECT id FROM public.form_templates 
            WHERE org_id IN (
                SELECT group_id FROM public.group_users WHERE user_id = auth.uid()
            )
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.form_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
