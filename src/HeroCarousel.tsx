import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export interface HeroSlide {
  label: string;
  src: string;
}

const motionPreference = "(prefers-reduced-motion: reduce)";
const slideInterval = 6500;

export function HeroCarousel({
  slides,
  fallback,
}: {
  slides: HeroSlide[];
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [paused, setPaused] = useState(() => matchMedia(motionPreference).matches);
  const [position, setPosition] = useState({
    current: slides[0].src,
    previous: "",
    backwards: false,
  });
  const available = slides.filter((slide) => !failed.includes(slide.src));
  const active = Math.max(0, available.findIndex((slide) => slide.src === position.current));
  const current = available[active];
  const currentSrc = current?.src;
  const next = available[(active + 1) % available.length]?.src;

  useEffect(() => {
    const preference = matchMedia(motionPreference);
    const onChange = () => {
      if (preference.matches) setPaused(true);
    };
    preference.addEventListener("change", onChange);
    return () => preference.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || !currentSrc || !next || currentSrc === next) return;
    const timer = window.setInterval(() => {
      if (!document.hidden)
        setPosition({ current: next, previous: currentSrc, backwards: false });
    }, slideInterval);
    return () => window.clearInterval(timer);
  }, [paused, currentSrc, next]);

  if (!current) return fallback;

  const move = (direction: number) => {
    setPaused(true);
    setPosition({
      current: available[(active + direction + available.length) % available.length].src,
      previous: current.src,
      backwards: direction < 0,
    });
  };

  return (
    <>
      <div className={position.backwards ? "hero-slides backwards" : "hero-slides"} aria-hidden="true">
        {available.map((slide) => {
          const state = slide.src === current.src
            ? position.previous ? " current entering" : " current"
            : slide.src === position.previous ? " leaving" : "";
          return (
            <img
              key={slide.src}
              className={"hero-slide" + state}
              src={slide.src}
              alt=""
              fetchPriority={slide.src === slides[0].src ? "high" : "low"}
              decoding="async"
              onError={() => setFailed((urls) => [...urls, slide.src])}
            />
          );
        })}
      </div>
      {available.length > 1 && (
        <div className="hero-carousel-controls" role="group" aria-label="Hotel photos">
          <button type="button" aria-label={paused ? "Play photo slideshow" : "Pause photo slideshow"} onClick={() => setPaused((value) => !value)}>
            {paused ? <Play size={17} /> : <Pause size={17} />}
          </button>
          <button type="button" aria-label="Previous hotel photo" onClick={() => move(-1)}>
            <ChevronLeft size={21} />
          </button>
          <span aria-live={paused ? "polite" : "off"}>
            <span className="sr-only">{current.label}. </span>
            {active + 1} / {available.length}
          </span>
          <button type="button" aria-label="Next hotel photo" onClick={() => move(1)}>
            <ChevronRight size={21} />
          </button>
        </div>
      )}
    </>
  );
}
