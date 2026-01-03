"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Shell } from "@/components/layout/shell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ActivityIcon, BarChart3Icon, ListIcon } from "lucide-react";
import { RunsListView } from "./components/runs-list-view";
import { AnalyticsView } from "./components/analytics-view";

export default function ObservabilityPage() {
  const t = useTranslations("admin.observability");
  const [activeTab, setActiveTab] = useState("runs");

  return (
    <Shell>
      <div className="flex h-full flex-col bg-terminal-cream">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border p-4">
          <div className="flex items-center gap-3">
            <ActivityIcon className="size-6 text-terminal-green" />
            <div>
              <h1 className="font-mono text-xl font-bold text-terminal-dark">
                {t("title")}
              </h1>
              <p className="font-mono text-sm text-terminal-muted">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-terminal-border px-4 pt-2">
            <TabsList className="bg-transparent h-10 p-0 gap-2">
              <TabsTrigger
                value="runs"
                className="font-mono data-[state=active]:bg-terminal-green/10 data-[state=active]:text-terminal-green data-[state=active]:shadow-none rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-terminal-green"
              >
                <ListIcon className="mr-2 size-4" />
                {t("tabs.runs")}
              </TabsTrigger>
              <TabsTrigger
                value="analytics"
                className="font-mono data-[state=active]:bg-terminal-green/10 data-[state=active]:text-terminal-green data-[state=active]:shadow-none rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-terminal-green"
              >
                <BarChart3Icon className="mr-2 size-4" />
                {t("tabs.analytics")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="runs" className="flex-1 mt-0 overflow-hidden">
            <RunsListView />
          </TabsContent>
          <TabsContent value="analytics" className="flex-1 mt-0 overflow-hidden">
            <AnalyticsView />
          </TabsContent>
        </Tabs>
      </div>
    </Shell>
  );
}

