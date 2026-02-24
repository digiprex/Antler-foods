/**
 * Dynamic FAW (Font Awesome) features component
 * Renders a features grid driven by page templates or fallback config.
 */

"use client";

import React, { useEffect, useMemo } from "react";
import { usePageDetails } from "@/hooks/use-page-details";

interface FawItem {
  id?: string;
  icon?: string; // Font Awesome class name, e.g. 'fas fa-utensils' or 'fa-solid fa-utensils'
  title: string;
  text?: string;
}

interface FawConfig {
  title?: string;
  subtitle?: string;
  items: FawItem[];
  bgColor?: string;
  textColor?: string;
  itemBg?: string;
}

interface DynamicFawProps {
  restaurantId: string;
  urlSlug?: string; // page url slug to fetch templates for (defaults to 'home')
  categoryKey?: string; // template key to look for
  fallbackConfig?: Partial<FawConfig>;
}

export default function DynamicFaw({
  restaurantId,
  urlSlug = "home",
  categoryKey = "faw",
  fallbackConfig = {},
}: DynamicFawProps) {
  const { data, loading } = usePageDetails(restaurantId, urlSlug);

  // Inject Font Awesome stylesheet once on client
  useEffect(() => {
    const id = "fa-cdn-stylesheet";
    if (typeof document === "undefined") return;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    }
  }, []);

  const config: FawConfig = useMemo(() => {
    // Default fallback
    const defaults: FawConfig = {
      title: "Why Choose Us",
      subtitle: undefined,
      items: [
        { id: "1", icon: "fa-solid fa-utensils", title: "Fresh Ingredients", text: "We source only the finest ingredients." },
        { id: "2", icon: "fa-solid fa-hat-chef", title: "Expert Chefs", text: "Experienced chefs craft every dish." },
        { id: "3", icon: "fa-solid fa-star", title: "Top Rated", text: "Consistently rated highly by customers." },
      ],
      bgColor: "#ffffff",
      textColor: "#111827",
      itemBg: "transparent",
    };

    // Merge page template config if available
    try {
      if (data && data.templates) {
        const tpl = data.templates[categoryKey] || Object.values(data.templates).find((t: any) => (t?.name || "").toLowerCase().includes("faw") || (t?.name || "").toLowerCase().includes("feature"));
        if (tpl && tpl.config) {
          const merged = { ...defaults, ...tpl.config, ...fallbackConfig } as FawConfig;
          // Ensure items shape
          if (Array.isArray(merged.items) && merged.items.length > 0) return merged;
        }
      }
    } catch (e) {
      // ignore and use fallbacks
    }

    return { ...defaults, ...fallbackConfig } as FawConfig;
  }, [data, categoryKey, fallbackConfig]);

  if (loading) return null;

  return (
    <section style={{ padding: "80px 2rem", backgroundColor: config.bgColor, color: config.textColor }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {config.title && (
          <h2 style={{ fontSize: "2rem", fontWeight: "bold", textAlign: "center", marginBottom: "3rem", color: config.textColor }}>
            {config.title}
          </h2>
        )}

        {config.subtitle && (
          <p style={{ textAlign: "center", marginBottom: "2rem", color: config.textColor, opacity: 0.85 }}>
            {config.subtitle}
          </p>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>
          {config.items.map((it, idx) => (
            <div key={it.id || idx} style={{ textAlign: "center", padding: "2rem", background: config.itemBg || "transparent", borderRadius: 8 }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem", color: config.textColor }}>
                {it.icon ? <i className={it.icon} aria-hidden /> : null}
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem", color: config.textColor }}>{it.title}</h3>
              {it.text && <p style={{ color: config.textColor, opacity: 0.8 }}>{it.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
