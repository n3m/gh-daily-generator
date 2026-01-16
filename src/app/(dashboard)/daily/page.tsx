"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function DailyPage() {
  const [selectedDates, setSelectedDates] = useState<Date[] | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedDates || selectedDates.length === 0) {
      toast.error("Please select at least one date");
      return;
    }

    setIsGenerating(true);
    try {
      // TODO: Implement API call to generate daily
      toast.info("Daily generation coming soon!");
    } catch {
      toast.error("Failed to generate daily");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Daily Reports</h2>
        <p className="text-muted-foreground">
          Select dates to generate daily reports from your GitHub commits
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Select Dates</CardTitle>
            <CardDescription>
              Click on one or multiple dates to generate dailys
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="multiple"
              selected={selectedDates}
              onSelect={setSelectedDates}
              className="rounded-md border"
              disabled={(date) => date > new Date()}
            />
            <div className="mt-4">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !selectedDates?.length}
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generated Dailys</CardTitle>
            <CardDescription>Your recent daily reports</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No dailys generated yet. Select dates and click generate to create
              your first daily report.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
