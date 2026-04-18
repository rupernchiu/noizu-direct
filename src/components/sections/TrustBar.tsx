import { ShieldCheck, BadgeCheck, Heart, Percent, Zap } from 'lucide-react'

export function TrustBar() {
  return (
    <section className="bg-primary/5 border-y border-primary/10 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap sm:items-center sm:justify-center gap-6 sm:gap-8 text-center">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Escrow Protected Payments</p>
              <p className="text-xs text-muted-foreground">Your money is held safely until delivery</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <BadgeCheck className="w-6 h-6 text-secondary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Verified SEA Creators</p>
              <p className="text-xs text-muted-foreground">Every creator is reviewed and approved</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <Heart className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">Fan Art Friendly</p>
              <p className="text-xs text-muted-foreground">Built for the cosplay &amp; doujin community</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <Percent className="w-6 h-6 text-secondary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">0% Platform Fee</p>
              <p className="text-xs text-muted-foreground">During our launch period — you keep everything</p>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <Zap className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm text-foreground">10-Minute Setup</p>
              <p className="text-xs text-muted-foreground">Your store is live before your next coffee</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
