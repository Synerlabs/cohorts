interface ApplicationHeaderProps {
  title: string;
  description: string;
}

export function ApplicationHeader({ title, description }: ApplicationHeaderProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
} 