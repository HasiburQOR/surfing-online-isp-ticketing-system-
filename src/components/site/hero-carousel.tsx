'use client'

import * as React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface HeroSlide {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
}

const AUTOPLAY_MS = 5000

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const multiple = slides.length > 1
  const [emblaRef, embla] = useEmblaCarousel({ loop: multiple, watchDrag: multiple })
  const [selected, setSelected] = React.useState(0)
  const [paused, setPaused] = React.useState(false)

  React.useEffect(() => {
    if (!embla) return
    const onSelect = () => setSelected(embla.selectedScrollSnap())
    onSelect()
    embla.on('select', onSelect)
    return () => {
      embla.off('select', onSelect)
    }
  }, [embla])

  // Auto-advance; stops on hover/focus and for users who prefer reduced motion.
  React.useEffect(() => {
    if (!embla || !multiple || paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => embla.scrollNext(), AUTOPLAY_MS)
    return () => clearInterval(t)
  }, [embla, multiple, paused])

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      aria-label="Offers and announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-lg" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, i) => {
            const img = (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slide.imageUrl}
                alt={slide.title}
                className="h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            )
            return (
              <div
                key={slide.id}
                className="aspect-[4/3] min-w-0 shrink-0 grow-0 basis-full"
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${slides.length}`}
              >
                {slide.linkUrl ? (
                  <a
                    href={slide.linkUrl}
                    className="block h-full w-full"
                    {...(/^https?:/i.test(slide.linkUrl)
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                  >
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            )
          })}
        </div>
      </div>

      {multiple ? (
        <>
          <button
            type="button"
            onClick={() => embla?.scrollPrev()}
            aria-label="Previous slide"
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border backdrop-blur transition hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => embla?.scrollNext()}
            aria-label="Next slide"
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow ring-1 ring-border backdrop-blur transition hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => embla?.scrollTo(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === selected}
                className={cn(
                  'h-2 rounded-full ring-1 ring-black/10 transition-all',
                  i === selected ? 'w-6 bg-accent' : 'w-2 bg-background/80 hover:bg-background',
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}
