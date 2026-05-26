'use client';

export function ProfileTabEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
