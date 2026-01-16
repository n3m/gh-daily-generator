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
import { Building2, RefreshCw, Check, Save } from "lucide-react";
import { toast } from "sonner";

interface Organization {
  id: number;
  login: string;
  avatar_url: string;
  description: string | null;
}

interface SavedOrganization {
  id: number;
  login: string;
  name: string;
  avatarUrl: string;
}

export default function SettingsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgs, setSelectedOrgs] = useState<Organization[]>([]);
  const [savedOrgs, setSavedOrgs] = useState<SavedOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchOrganizations();
    fetchSavedOrganizations();
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

  const fetchSavedOrganizations = async () => {
    setIsLoadingSaved(true);
    try {
      const res = await fetch("/api/settings/organizations");
      if (!res.ok) throw new Error("Failed to fetch saved organizations");
      const data = await res.json();
      setSavedOrgs(data.organizations || []);
    } catch {
      // Silent fail - no saved orgs yet
    } finally {
      setIsLoadingSaved(false);
    }
  };

  // Initialize selected orgs from saved orgs when both are loaded
  useEffect(() => {
    if (!isLoading && !isLoadingSaved && organizations.length > 0) {
      const savedIds = savedOrgs.map((o) => o.id);
      const initialSelected = organizations.filter((o) =>
        savedIds.includes(o.id)
      );
      setSelectedOrgs(initialSelected);
    }
  }, [isLoading, isLoadingSaved, organizations, savedOrgs]);

  const toggleOrg = (org: Organization) => {
    setSelectedOrgs((prev) =>
      prev.find((o) => o.id === org.id)
        ? prev.filter((o) => o.id !== org.id)
        : [...prev, org]
    );
  };

  const handleSave = async () => {
    if (selectedOrgs.length === 0) {
      toast.error("Please select at least one organization");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/settings/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizations: selectedOrgs }),
      });

      if (!res.ok) throw new Error("Failed to save");

      toast.success("Organizations saved successfully");
      fetchSavedOrganizations();
    } catch {
      toast.error("Failed to save organizations");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = () => {
    const savedIds = new Set(savedOrgs.map((o) => o.id));
    const selectedIds = new Set(selectedOrgs.map((o) => o.id));

    if (savedIds.size !== selectedIds.size) return true;

    for (const id of savedIds) {
      if (!selectedIds.has(id)) return true;
    }

    return false;
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
                    onClick={() => toggleOrg(org)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedOrgs.find((o) => o.id === org.id)
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
                    {selectedOrgs.find((o) => o.id === org.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedOrgs.length} organization
                  {selectedOrgs.length !== 1 ? "s" : ""} selected
                </p>
                <Button
                  onClick={handleSave}
                  disabled={isSaving || selectedOrgs.length === 0 || !hasChanges()}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
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
