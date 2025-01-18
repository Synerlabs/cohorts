export type Org = {
  id: string;
  name: string;
  slug: string;
  alternate_name?: string;
  description?: string;
  type: string;
  created_by: string;
  parent_id?: string;
};
