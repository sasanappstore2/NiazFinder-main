'use client';

export function ProfileTabEmpty({ message }: { message: string }) {
  return (
    <div className="profile-surface rounded-2xl border border-dashed px-6 py-16 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
