"use client";

import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
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
import { Loader2, Sparkles, Building2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: number;
  login: string;
  avatar_url: string;
}

interface GeneratedDaily {
  date: string;
  content: string;
}

export default function DailyPage() {
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDailys, setGeneratedDailys] = useState<GeneratedDaily[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchOrganizations();
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

  const handleGenerate = async () => {
    if (!selectedDates || selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    if (!selectedOrg) {
      toast.error("Please select an organization");
      return;
    }

    setIsGenerating(true);
    setGeneratedDailys([]);

    try {
      const res = await fetch("/api/daily/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dates: selectedDates.map((d) => d.toISOString().split("T")[0]),
          organization: selectedOrg,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate");
      }

      const data = await res.json();
      setGeneratedDailys(data.dailys || []);
      toast.success(`Generated ${data.dailys?.length || 0} daily report(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate daily");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Daily Reports</h2>
        <p className="text-muted-foreground">
          Select dates and organization to generate daily reports from your GitHub commits
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Generate Daily</CardTitle>
            <CardDescription>
              Select organization and dates to generate reports
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              {isLoadingOrgs ? (
                <Skeleton className="h-10 w-full" />
              ) : organizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No organizations found. Make sure you have access to at least one.
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
              <Label>Dates</Label>
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={setSelectedDates}
                className="rounded-md border"
                disabled={(date) => date > new Date()}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedDates?.length || !selectedOrg}
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
                  Generate Daily{selectedDates && selectedDates.length > 1 ? "s" : ""}
                  {selectedDates?.length ? ` (${selectedDates.length})` : ""}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Dailys</CardTitle>
            <CardDescription>
              {generatedDailys.length > 0
                ? "Click to copy to clipboard"
                : "Your generated daily reports will appear here"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generatedDailys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select an organization, dates, and click generate to create your daily reports.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedDailys.map((daily, index) => (
                  <div
                    key={daily.date}
                    className="relative rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{daily.date}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(daily.content, index)}
                      >
                        {copiedIndex === index ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {daily.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
