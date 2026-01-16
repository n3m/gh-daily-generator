"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, CalendarDays, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Organization {
  id: number;
  login: string;
  avatar_url: string;
}

interface Weekly {
  id: string;
  weekStart: string;
  weekEnd: string;
  content: string;
  createdAt: string;
}

// Get the last 8 weeks
function getWeekOptions() {
  const weeks = [];
  const today = new Date();

  for (let i = 0; i < 8; i++) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    weeks.push({
      value: weekStart.toISOString(),
      label: `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`,
      start: weekStart,
      end: weekEnd,
    });
  }

  return weeks;
}

export default function WeeklyPage() {
  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [source, setSource] = useState<"dailys" | "commits">("dailys");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [weeklys, setWeeklys] = useState<Weekly[]>([]);
  const [isLoadingWeeklys, setIsLoadingWeeklys] = useState(true);
  const [generatedWeekly, setGeneratedWeekly] = useState<Weekly | null>(null);
  const [copied, setCopied] = useState(false);

  const weekOptions = getWeekOptions();

  useEffect(() => {
    fetchOrganizations();
    fetchWeeklys();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const res = await fetch("/api/github/orgs");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const fetchWeeklys = async () => {
    try {
      const res = await fetch("/api/weekly");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWeeklys(data.weeklys || []);
    } catch {
      toast.error("Failed to load weeklys");
    } finally {
      setIsLoadingWeeklys(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedWeek) {
      toast.error("Please select a week");
      return;
    }

    if (!selectedOrg) {
      toast.error("Please select an organization");
      return;
    }

    setIsGenerating(true);
    setGeneratedWeekly(null);

    try {
      const res = await fetch("/api/weekly/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: selectedWeek.split("T")[0],
          source,
          organization: selectedOrg,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate");
      }

      const data = await res.json();
      setGeneratedWeekly(data.weekly);
      toast.success("Weekly report generated successfully");
      // Refresh the list
      fetchWeeklys();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate weekly"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Weekly Reports</h2>
        <p className="text-muted-foreground">
          Generate comprehensive weekly summaries from your dailys or commits
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Weekly</CardTitle>
            <CardDescription>
              Select a week and source for your weekly report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              {isLoadingOrgs ? (
                <Skeleton className="h-10 w-full" />
              ) : organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No organizations found.
                </p>
              ) : (
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger id="organization">
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.login}>
                        <div className="flex items-center gap-2">
                          <img
                            src={org.avatar_url}
                            alt={org.login}
                            className="h-4 w-4 rounded-full"
                          />
                          {org.login}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="week">Week</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                <SelectTrigger id="week">
                  <SelectValue placeholder="Select a week" />
                </SelectTrigger>
                <SelectContent>
                  {weekOptions.map((week) => (
                    <SelectItem key={week.value} value={week.value}>
                      {week.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select
                value={source}
                onValueChange={(v) => setSource(v as "dailys" | "commits")}
              >
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dailys">
                    From existing dailys (recommended)
                  </SelectItem>
                  <SelectItem value="commits">Directly from commits</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {source === "dailys"
                  ? "Uses your generated daily reports to create a summary"
                  : "Analyzes commits directly if no dailys exist"}
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedWeek || !selectedOrg}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Weekly
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {generatedWeekly && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Generated Weekly</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(generatedWeekly.content)}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </CardTitle>
                <CardDescription>
                  {generatedWeekly.weekStart} to {generatedWeekly.weekEnd}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto">
                  {generatedWeekly.content}
                </div>
                <div className="mt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/weekly/${generatedWeekly.id}`}>
                      View Full Report
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Previous Weeklys</CardTitle>
              <CardDescription>Your recent weekly reports</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingWeeklys ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : weeklys.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No weeklys generated yet. Select a week and click generate to
                  create your first weekly report.
                </p>
              ) : (
                <div className="space-y-3">
                  {weeklys.map((weekly) => (
                    <Link
                      key={weekly.id}
                      href={`/weekly/${weekly.id}`}
                      className="flex items-start gap-4 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <CalendarDays className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {weekly.weekStart} - {weekly.weekEnd}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {weekly.content.substring(0, 100)}...
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
