import Link from 'next/link'
import { Palette, BookOpen, Camera, Package, Sparkles } from 'lucide-react'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Palette,
  BookOpen,
  Camera,
  Package,
  Sparkles,
  Sticker: Sparkles,
}

interface CategoryItem {
  name: string
  icon: string
  link: string
}

interface CategoriesContent {
  title: string
  items: CategoryItem[]
}

export default function CategoriesSection({ content }: { content: CategoriesContent }) {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-[#16161f]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-[#f0f0f5] mb-8">{content.title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {content.items.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? Sparkles
            return (
              <Link
                key={item.name}
                href={item.link}
                className="flex flex-col items-center gap-3 p-6 bg-[#1e1e2a] rounded-xl border border-[#2a2a3a] hover:border-[#7c3aed]/50 hover:bg-[#7c3aed]/5 transition-all group"
              >
                <Icon className="size-8 text-[#7c3aed] group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-[#f0f0f5] text-center">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
