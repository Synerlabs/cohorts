import { Database } from "@/lib/types/database.types";

export type FormTemplate = Database['public']['Tables']['form_templates']['Row'] & {
  fields?: Array<any>;
  estimated_completion_time?: number;
}; 