import { useState } from "react";
import { PhoneForwarded, Upload, Play, Pause, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CallingCampaign {
  id: string;
  name: string;
  description: string | null;
  providerId: string | null;
  flowId: string | null;
  phoneList: string[];
  status: string;
  totalCalls: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export default function TelephonyBatch() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [phoneNumbers, setPhoneNumbers] = useState("");
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<CallingCampaign[]>({
    queryKey: ["/api/telephony/campaigns"],
  });

  const { data: providers } = useQuery<any[]>({
    queryKey: ["/api/telephony/providers"],
  });

  const { data: flows } = useQuery<any[]>({
    queryKey: ["/api/flows"],
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/telephony/campaigns", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/campaigns"] });
      toast({
        title: "Campaign Created",
        description: "Your calling campaign has been created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: error.message || "Could not create campaign",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/telephony/campaigns/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/campaigns"] });
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete campaign",
      });
    },
  });

  const handleCreateCampaign = () => {
    const phoneList = phoneNumbers
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (!campaignName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Campaign name is required",
      });
      return;
    }

    if (phoneList.length === 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "At least one phone number is required",
      });
      return;
    }

    createCampaignMutation.mutate({
      name: campaignName,
      description: campaignDescription || null,
      providerId: selectedProviderId || null,
      flowId: selectedFlowId || null,
      phoneNumbers: phoneList,
    });
  };

  const resetForm = () => {
    setCampaignName("");
    setCampaignDescription("");
    setPhoneNumbers("");
    setSelectedProviderId("");
    setSelectedFlowId("");
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "running":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "scheduled":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const activeProviders = providers?.filter(p => p.isActive) || [];
  const activeCampaigns = campaigns?.filter(c => c.status === "running") || [];
  const totalCallsToday = campaigns?.reduce((sum, c) => sum + (c.completedCalls || 0), 0) || 0;
  const totalSuccess = campaigns?.reduce((sum, c) => sum + (c.successfulCalls || 0), 0) || 0;
  const successRate = totalCallsToday > 0 ? ((totalSuccess / totalCallsToday) * 100).toFixed(1) : 0;

  if (campaignsLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <PhoneForwarded className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Batch Calling</h1>
          </div>
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading campaigns...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <PhoneForwarded className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Batch Calling</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Manage bulk calling campaigns and outbound dialing
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-campaign">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new bulk calling campaign
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    placeholder="e.g., Customer Feedback Survey"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    data-testid="input-campaign-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-description">Description (Optional)</Label>
                  <Textarea
                    id="campaign-description"
                    placeholder="Campaign description..."
                    value={campaignDescription}
                    onChange={(e) => setCampaignDescription(e.target.value)}
                    data-testid="input-campaign-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">Provider (Optional)</Label>
                  <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                    <SelectTrigger id="provider" data-testid="select-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flow">Agent Flow (Optional)</Label>
                  <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                    <SelectTrigger id="flow" data-testid="select-flow">
                      <SelectValue placeholder="Select flow" />
                    </SelectTrigger>
                    <SelectContent>
                      {flows?.map((flow) => (
                        <SelectItem key={flow.id} value={flow.id}>
                          {flow.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-numbers">Phone Numbers</Label>
                  <Textarea
                    id="phone-numbers"
                    placeholder="Enter phone numbers (one per line)&#10;+1234567890&#10;+0987654321"
                    value={phoneNumbers}
                    onChange={(e) => setPhoneNumbers(e.target.value)}
                    className="font-mono"
                    rows={6}
                    data-testid="input-phone-numbers"
                  />
                  <p className="text-xs text-muted-foreground">
                    {phoneNumbers.split('\n').filter(p => p.trim()).length} numbers
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-campaign"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCampaign}
                  disabled={createCampaignMutation.isPending}
                  data-testid="button-submit-campaign"
                >
                  {createCampaignMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeCampaigns.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <PhoneForwarded className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCallsToday}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalSuccess} successful calls
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Campaigns</h2>
          
          {!campaigns || campaigns.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No campaigns yet. Create your first campaign to get started.
              </AlertDescription>
            </Alert>
          ) : (
            campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">{campaign.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={getStatusBadgeClass(campaign.status)}
                        >
                          {campaign.status}
                        </Badge>
                      </div>
                      {campaign.description && (
                        <CardDescription className="mt-2">
                          {campaign.description}
                        </CardDescription>
                      )}
                      <p className="text-sm text-muted-foreground mt-2">
                        {campaign.completedCalls} of {campaign.totalCalls} calls completed
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {campaign.status === "scheduled" && (
                        <Button variant="outline" size="sm" data-testid={`button-start-${campaign.id}`}>
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </Button>
                      )}
                      {campaign.status === "running" && (
                        <Button variant="outline" size="sm" data-testid={`button-pause-${campaign.id}`}>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        data-testid={`button-delete-${campaign.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {campaign.totalCalls > 0
                          ? Math.round((campaign.completedCalls / campaign.totalCalls) * 100)
                          : 0}%
                      </span>
                    </div>
                    <Progress
                      value={
                        campaign.totalCalls > 0
                          ? (campaign.completedCalls / campaign.totalCalls) * 100
                          : 0
                      }
                      className="h-2"
                    />
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      <span>✓ {campaign.successfulCalls} successful</span>
                      <span>✗ {campaign.failedCalls} failed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
