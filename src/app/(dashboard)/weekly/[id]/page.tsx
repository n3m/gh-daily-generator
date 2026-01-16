"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { ArrowLeft, CalendarDays, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Weekly {
  id: string;
  weekStart: string;
  weekEnd: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function WeeklyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWeekly();
  }, [id]);

  const fetchWeekly = async () => {
    try {
      const res = await fetch(`/api/weekly/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Weekly not found");
          router.push("/weekly");
          return;
        }
        throw new Error("Failed to fetch weekly");
      }
      const data = await res.json();
      setWeekly(data.weekly);
    } catch {
      toast.error("Failed to load weekly");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this weekly report?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/weekly/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Weekly deleted successfully");
      router.push("/weekly");
    } catch {
      toast.error("Failed to delete weekly");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    if (!weekly) return;
    try {
      await navigator.clipboard.writeText(weekly.content);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!weekly) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/weekly">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              Weekly Report
            </h2>
            <p className="text-muted-foreground">
              {weekly.weekStart} to {weekly.weekEnd}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
          <CardDescription>
            Generated on{" "}
            {new Date(weekly.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MarkdownRenderer content={weekly.content} />
        </CardContent>
      </Card>
    </div>
  );
}
