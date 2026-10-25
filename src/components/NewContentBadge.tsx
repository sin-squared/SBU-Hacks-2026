import { useEffect, useRef } from "react";
import type { CityGame } from "@/hooks/useCity";

export function NewContentBadge({
  game,
  category,
  id,
  completed = false,
}: {
  game: CityGame;
  category: "research" | "contracts";
  id: string;
  completed?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const { act } = game;
  const viewed = (
    category === "research" ? game.state.viewedResearch : game.state.viewedContracts
  ).includes(id);
  useEffect(() => {
    if (viewed || completed || !ref.current || typeof IntersectionObserver === "undefined") return;
    const target = ref.current.closest("article");
    if (!target) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    const check = () => {
      clearTimeout(timer);
      if (visible && document.visibilityState === "visible")
        timer = setTimeout(() => act({ type: "viewContent", category, id }), 500);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5);
        check();
      },
      { threshold: 0.5 },
    );
    observer.observe(target);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      document.removeEventListener("visibilitychange", check);
    };
  }, [viewed, completed, act, category, id]);
  return viewed || completed ? null : (
    <span
      ref={ref}
      className="inline-block rounded border border-brass bg-brass/15 px-2 py-0.5 text-xs font-bold text-brass"
      aria-label="New item"
    >
      NEW
    </span>
  );
}
