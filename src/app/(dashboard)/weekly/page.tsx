"use client";

import { useState } from "react";
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
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  const [isGenerating, setIsGenerating] = useState(false);

  const weekOptions = getWeekOptions();

  const handleGenerate = async () => {
    if (!selectedWeek) {
      toast.error("Please select a week");
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: Implement API call to generate weekly
      toast.info("Weekly generation coming soon!");
    } catch {
      toast.error("Failed to generate weekly");
    } finally {
      setIsGenerating(false);
    }
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
                  <SelectItem value="commits">
                    Directly from commits
                  </SelectItem>
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
              disabled={isGenerating || !selectedWeek}
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

        <Card>
          <CardHeader>
            <CardTitle>Generated Weeklys</CardTitle>
            <CardDescription>Your recent weekly reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No weeklys generated yet. Select a week and click generate to
              create your first weekly report.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
