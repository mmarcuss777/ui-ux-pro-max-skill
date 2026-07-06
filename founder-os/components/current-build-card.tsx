"use client"

import Link from "next/link"
import { ArrowRightIcon, RocketIcon } from "@radix-ui/react-icons"

import { useT } from "@/components/locale-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Build } from "@/types/db"

type LabelKey =
  | "ecommerce" | "resell" | "service" | "content" | "digital"
  | "b2b" | "local" | "fitness_brand" | "custom"
  | "idea" | "validation" | "building" | "selling" | "scaling"
  | "high" | "medium" | "low"

// The gold-framed hero card: the one project being pushed right now.
export function CurrentBuildCard({
  build,
  showOpen = false,
}: {
  build: Build | null
  showOpen?: boolean
}) {
  const d = useT()

  function label(value: string): string {
    return d.labels[value as LabelKey] ?? value
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold-light/70 via-gold/25 to-transparent p-px shadow-lg shadow-gold/10">
      <div className="rounded-[calc(1rem-1px)] bg-card p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark">
            <RocketIcon className="h-3.5 w-3.5" />
            {d.currentBuild.title}
          </p>
          {showOpen && (
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/build">
                {d.common.open}
                <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {build ? (
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-ink">{build.name}</h2>
              <Badge variant="outline" className="border-gold/40 text-gold-dark">
                {label(build.business_type)}
              </Badge>
              <Badge variant="secondary">{label(build.stage)}</Badge>
            </div>
            <div className="space-y-1.5 text-sm">
              <p className="text-muted-foreground">
                <span className="font-medium text-ink">
                  {d.currentBuild.weekGoal}:
                </span>{" "}
                {build.week_goal || d.currentBuild.noGoal}
              </p>
              <p className="text-muted-foreground">
                <span className="font-medium text-gold-dark">
                  {d.currentBuild.nextMove}:
                </span>{" "}
                <span className="text-ink">
                  {build.next_action || d.currentBuild.noNext}
                </span>
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {d.currentBuild.priority}: {label(build.priority)}
            </p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-muted-foreground">
              {d.currentBuild.empty}
            </p>
            <Button asChild variant="outline" size="sm" className="border-gold/40 text-gold-dark hover:text-gold-dark">
              <Link href="/build">{d.currentBuild.cta}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
