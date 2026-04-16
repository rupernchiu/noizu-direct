// No auth needed — just a static info page
export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🔴</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Account Suspended</h1>
        <p className="text-muted-foreground mb-6">Your creator account has been suspended. Please contact us for more information.</p>
        <a href="mailto:hello@noizu.direct" className="text-primary hover:underline text-sm">hello@noizu.direct</a>
      </div>
    </div>
  )
}
