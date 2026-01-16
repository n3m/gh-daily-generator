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
import { ArrowLeft, Calendar, Trash2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Daily {
  id: string;
  date: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function DailyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [daily, setDaily] = useState<Daily | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDaily();
  }, [id]);

  const fetchDaily = async () => {
    try {
      const res = await fetch(`/api/daily/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          toast.error("Daily not found");
          router.push("/daily");
          return;
        }
        throw new Error("Failed to fetch daily");
      }
      const data = await res.json();
      setDaily(data.daily);
    } catch {
      toast.error("Failed to load daily");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this daily report?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/daily/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Daily deleted successfully");
      router.push("/daily");
    } catch {
      toast.error("Failed to delete daily");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    if (!daily) return;
    try {
      await navigator.clipboard.writeText(daily.content);
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

  if (!daily) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/daily">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Daily Report
            </h2>
            <p className="text-muted-foreground">{daily.date}</p>
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
            {new Date(daily.createdAt).toLocaleDateString("en-US", {
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
          <MarkdownRenderer content={daily.content} />
        </CardContent>
      </Card>
    </div>
  );
}
