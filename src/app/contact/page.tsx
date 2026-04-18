import { ContactForm } from '@/components/ui/ContactForm'
import { Mail, MapPin, Clock } from 'lucide-react'

export const metadata = {
  title: 'Contact Us — noizu.direct',
  description: 'Get in touch with the noizu.direct team.',
}

export default function ContactPage() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-16">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground mb-3">Contact Us</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Have a question, partnership enquiry, or just want to say hi?
            We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Left — info */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Get in touch</h2>
              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Email</p>
                    <p className="text-sm text-muted-foreground">hello@noizu.direct</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Based in</p>
                    <p className="text-sm text-muted-foreground">Kuala Lumpur, Malaysia</p>
                    <p className="text-sm text-muted-foreground">Serving SEA creators</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Response time</p>
                    <p className="text-sm text-muted-foreground">1–2 business days</p>
                    <p className="text-sm text-muted-foreground">Mon–Fri, 9am–6pm MYT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* What we help with */}
            <div className="bg-surface rounded-xl p-5 border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">We can help with</h3>
              <ul className="flex flex-col gap-2">
                {[
                  'Creator account & onboarding',
                  'Order and payment issues',
                  'Partnership & sponsorship',
                  'Press & media enquiries',
                  'Convention & event collaboration',
                  'Technical support',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl border border-border p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
