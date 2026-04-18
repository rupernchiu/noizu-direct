export default function AccountClosedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Account Closed</h1>
        <p className="text-muted-foreground mb-6">Your noizu.direct creator account has been closed. Your final balance will be paid out within 30 days.</p>
        <p className="text-sm text-muted-foreground">Need help? Contact <a href="mailto:hello@noizu.direct" className="text-primary hover:underline">hello@noizu.direct</a></p>
      </div>
    </div>
  )
}
