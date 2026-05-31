export default function AuthErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md space-y-3 text-center">
        <h1 className="text-xl font-semibold text-foreground">Sign-in failed</h1>
        <p className="text-sm text-muted-foreground">We could not complete Google sign-in. Please try again.</p>
        <a
          href="/auth/login"
          className="inline-flex rounded-md border border-border bg-surface px-4 py-2 text-sm text-foreground transition hover:border-border-strong hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          Back to login
        </a>
      </div>
    </main>
  );
}
