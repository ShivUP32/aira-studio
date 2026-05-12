import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "green" | "draft" | "live" | "warning" | "info" | "default";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  live: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  draft: "bg-white/5 text-slate-400 border-white/10",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  default: "bg-white/5 text-slate-400 border-white/10",
};

export function Badge({
  className,
  variant = "default",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
