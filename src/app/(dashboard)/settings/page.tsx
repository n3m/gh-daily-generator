"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: number;
  login: string;
  avatar_url: string;
  description: string | null;
}

export default function SettingsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/github/orgs");
      if (!res.ok) throw new Error("Failed to fetch organizations");
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch {
      toast.error("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOrg = (orgId: number) => {
    setSelectedOrgs((prev) =>
      prev.includes(orgId)
        ? prev.filter((id) => id !== orgId)
        : [...prev, orgId]
    );
  };

  const handleSync = async () => {
    if (selectedOrgs.length === 0) {
      toast.error("Please select at least one organization");
      return;
    }

    setIsSyncing(true);
    try {
      // TODO: Implement sync API
      toast.info("Sync coming soon!");
    } catch {
      toast.error("Failed to sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure your organizations and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
          </CardTitle>
          <CardDescription>
            Select the organizations you want to track commits from
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-6">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No organizations found. Make sure you have access to at least
                one GitHub organization.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchOrganizations}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => toggleOrg(org.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedOrgs.includes(org.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <img
                      src={org.avatar_url}
                      alt={org.login}
                      className="h-10 w-10 rounded-full"
                    />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{org.login}</p>
                      {org.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {org.description}
                        </p>
                      )}
                    </div>
                    {selectedOrgs.includes(org.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSync}
                  disabled={isSyncing || selectedOrgs.length === 0}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Save & Sync Commits
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
