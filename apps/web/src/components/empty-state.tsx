export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-none border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
      {label}

    </div>
  );
}