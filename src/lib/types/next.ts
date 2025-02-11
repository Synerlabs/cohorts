export type PageProps = {
  params: Promise<{ slug: string, [key: string]: string | string[] | undefined }> ;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};
