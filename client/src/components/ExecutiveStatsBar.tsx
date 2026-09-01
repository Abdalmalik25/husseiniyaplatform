import React from "react";
import { ShieldCheck, Globe, Clock, TrendingUp } from "lucide-react";

/**
 * ExecutiveStatsBar — Persistent trust bar showing live operational metrics.
 *
 * Inspired by: Statuspage indicators, enterprise SaaS trust bars (Salesforce,
 * ServiceNow), public dashboards.
 *
 * Design principles:
 * - Live uptime, customer count, response time — visible without scrolling.
 * - Animated pulse dots indicate real-time freshness.
 * - Subtle but persistent — not aggressive marketing.
 * - Helps shift perception from "vendor" to "infrastructure provider".
 *
 * Marketing-only component — uses illustrative figures that match brand.stats.
 */

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  live?: boolean;
}

function StatItem({ icon: Icon, value, label, live }: StatItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] transition-colors">
      <div className="w-9 h-9 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-brand-300" />
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-base text-white tabular-nums">
            {value}
          </span>
          {live && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <p className="text-[10px] text-white/55 leading-tight">{label}</p>
      </div>
    </div>
  );
}

export function ExecutiveStatsBar() {
  return (
    <section
      className="bg-[#0a1f20] border-y border-white/[0.06] py-5 px-4"
      aria-label="مؤشرات تشغيلية مباشرة"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatItem
            icon={TrendingUp}
            value="+1,200"
            label="مشروع منجز"
          />
          <StatItem
            icon={Globe}
            value="14"
            label="قطاع يُخدم فعلياً"
          />
          <StatItem
            icon={ShieldCheck}
            value="99.6%"
            label="وقت تشغيل فعلي"
            live
          />
          <StatItem
            icon={Clock}
            value="< 2س"
            label="استجابة الدعم"
            live
          />
        </div>
      </div>
    </section>
  );
}