import { useState } from "react";
import { Settings, Plus, Check, Trash2, Loader2, AlertCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TelephonyProvider {
  id: string;
  provider: string;
  name: string;
  credentials: any;
  configuration: any;
  isActive: boolean;
  createdAt: string;
}

interface PhoneNumber {
  id: string;
  providerId: string;
  phoneNumber: string;
  friendlyName: string;
  country: string;
  capabilities: string[];
  isActive: boolean;
}

const PROVIDER_TYPES = [
  { value: "twilio", label: "Twilio", description: "Industry-leading cloud communications" },
  { value: "telnyx", label: "Telnyx", description: "Carrier-grade voice and messaging" },
  { value: "zadarma", label: "Zadarma", description: "International VoIP provider" },
  { value: "asterisk", label: "Asterisk/PJSIP", description: "Open-source PBX" },
];

export default function TelephonyProviders() {
  const { toast } = useToast();
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [isAddNumberOpen, setIsAddNumberOpen] = useState(false);
  const [selectedProviderType, setSelectedProviderType] = useState("");
  const [providerName, setProviderName] = useState("");
  const [credentials, setCredentials] = useState({
    accountSid: "",
    authToken: "",
    apiKey: "",
    apiSecret: "",
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [friendlyName, setFriendlyName] = useState("");
  const [country, setCountry] = useState("US");
  const [selectedProviderId, setSelectedProviderId] = useState("");

  const { data: providers, isLoading: providersLoading } = useQuery<TelephonyProvider[]>({
    queryKey: ["/api/telephony/providers"],
  });

  const { data: phoneNumbers, isLoading: numbersLoading } = useQuery<PhoneNumber[]>({
    queryKey: ["/api/telephony/numbers"],
  });

  const createProviderMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/telephony/providers", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/providers"] });
      toast({
        title: "Provider Added",
        description: "Telephony provider has been configured successfully",
      });
      setIsAddProviderOpen(false);
      resetProviderForm();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Configuration Failed",
        description: error.message || "Could not add provider",
      });
    },
  });

  const toggleProviderMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return await apiRequest(`/api/telephony/providers/${id}`, "PATCH", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/providers"] });
      toast({
        title: "Provider Updated",
        description: "Provider status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update provider",
      });
    },
  });

  const deleteProviderMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/telephony/providers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/providers"] });
      toast({
        title: "Provider Deleted",
        description: "Provider has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete provider",
      });
    },
  });

  const createPhoneNumberMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/telephony/numbers", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/numbers"] });
      toast({
        title: "Phone Number Added",
        description: "Phone number has been added successfully",
      });
      setIsAddNumberOpen(false);
      resetNumberForm();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Addition Failed",
        description: error.message || "Could not add phone number",
      });
    },
  });

  const deletePhoneNumberMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/telephony/numbers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telephony/numbers"] });
      toast({
        title: "Phone Number Deleted",
        description: "Phone number has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message || "Could not delete phone number",
      });
    },
  });

  const handleAddProvider = () => {
    if (!providerName.trim() || !selectedProviderType) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Provider type and name are required",
      });
      return;
    }

    const filteredCredentials = Object.fromEntries(
      Object.entries(credentials).filter(([_, v]) => v.trim() !== "")
    );

    createProviderMutation.mutate({
      provider: selectedProviderType,
      name: providerName,
      credentials: filteredCredentials,
      configuration: {},
    });
  };

  const handleAddPhoneNumber = () => {
    if (!phoneNumber.trim() || !selectedProviderId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Provider and phone number are required",
      });
      return;
    }

    createPhoneNumberMutation.mutate({
      providerId: selectedProviderId,
      phoneNumber,
      friendlyName: friendlyName || phoneNumber,
      country,
      capabilities: ["voice", "sms"],
    });
  };

  const resetProviderForm = () => {
    setProviderName("");
    setSelectedProviderType("");
    setCredentials({
      accountSid: "",
      authToken: "",
      apiKey: "",
      apiSecret: "",
    });
  };

  const resetNumberForm = () => {
    setPhoneNumber("");
    setFriendlyName("");
    setCountry("US");
    setSelectedProviderId("");
  };

  const handleToggleProvider = (id: string, currentStatus: boolean) => {
    toggleProviderMutation.mutate({ id, isActive: !currentStatus });
  };

  const handleDeleteProvider = (id: string) => {
    if (confirm("Are you sure you want to delete this provider? This will also remove associated phone numbers.")) {
      deleteProviderMutation.mutate(id);
    }
  };

  const handleDeletePhoneNumber = (id: string) => {
    if (confirm("Are you sure you want to delete this phone number?")) {
      deletePhoneNumberMutation.mutate(id);
    }
  };

  const activeProviders = providers?.filter(p => p.isActive) || [];

  if (providersLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-8 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Provider Settings</h1>
          </div>
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading providers...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Settings className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Provider Settings</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Manage your telephony provider integrations and phone numbers
          </p>
        </div>

        <Tabs defaultValue="providers" className="space-y-6">
          <TabsList>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="numbers">Phone Numbers</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-6">
            {/* Active Providers */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Configured Providers</CardTitle>
                  <CardDescription>
                    Your telephony provider integrations
                  </CardDescription>
                </div>
                <Dialog open={isAddProviderOpen} onOpenChange={setIsAddProviderOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-provider">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Provider
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Provider</DialogTitle>
                      <DialogDescription>
                        Configure a new telephony provider
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="provider-type">Provider Type</Label>
                        <Select value={selectedProviderType} onValueChange={setSelectedProviderType}>
                          <SelectTrigger id="provider-type" data-testid="select-provider-type">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label} - {type.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="provider-name">Provider Name</Label>
                        <Input
                          id="provider-name"
                          placeholder="e.g., My Twilio Account"
                          value={providerName}
                          onChange={(e) => setProviderName(e.target.value)}
                          data-testid="input-provider-name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="account-sid">Account SID / API Key</Label>
                        <Input
                          id="account-sid"
                          placeholder="Your account identifier"
                          value={credentials.accountSid}
                          onChange={(e) => setCredentials({ ...credentials, accountSid: e.target.value })}
                          data-testid="input-account-sid"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="auth-token">Auth Token / API Secret</Label>
                        <Input
                          id="auth-token"
                          type="password"
                          placeholder="Your authentication token"
                          value={credentials.authToken}
                          onChange={(e) => setCredentials({ ...credentials, authToken: e.target.value })}
                          data-testid="input-auth-token"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddProviderOpen(false)}
                        data-testid="button-cancel-provider"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddProvider}
                        disabled={createProviderMutation.isPending}
                        data-testid="button-submit-provider"
                      >
                        {createProviderMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Provider
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {!providers || providers.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No providers configured. Add a provider to get started.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                        data-testid={`provider-${provider.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                            <Settings className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{provider.name}</h3>
                              <Badge variant="secondary" className="capitalize">
                                {provider.provider}
                              </Badge>
                              {provider.isActive && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="mr-1 h-3 w-3" />
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {PROVIDER_TYPES.find(t => t.value === provider.provider)?.description || provider.provider}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={provider.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleProvider(provider.id, provider.isActive)}
                            data-testid={`button-toggle-${provider.id}`}
                          >
                            {provider.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteProvider(provider.id)}
                            data-testid={`button-delete-${provider.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="numbers" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Phone Numbers</CardTitle>
                  <CardDescription>
                    Manage your telephony phone numbers
                  </CardDescription>
                </div>
                <Dialog open={isAddNumberOpen} onOpenChange={setIsAddNumberOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!activeProviders.length} data-testid="button-add-number">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Number
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Phone Number</DialogTitle>
                      <DialogDescription>
                        Register a new phone number
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="number-provider">Provider</Label>
                        <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                          <SelectTrigger id="number-provider" data-testid="select-number-provider">
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
                        <Label htmlFor="phone-number">Phone Number</Label>
                        <Input
                          id="phone-number"
                          placeholder="+1234567890"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          data-testid="input-phone-number"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="friendly-name">Friendly Name (Optional)</Label>
                        <Input
                          id="friendly-name"
                          placeholder="e.g., Support Line"
                          value={friendlyName}
                          onChange={(e) => setFriendlyName(e.target.value)}
                          data-testid="input-friendly-name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input
                          id="country"
                          placeholder="US"
                          value={country}
                          onChange={(e) => setCountry(e.target.value)}
                          data-testid="input-country"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsAddNumberOpen(false)}
                        data-testid="button-cancel-number"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddPhoneNumber}
                        disabled={createPhoneNumberMutation.isPending}
                        data-testid="button-submit-number"
                      >
                        {createPhoneNumberMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Add Number
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {numbersLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Loading phone numbers...</p>
                  </div>
                ) : !phoneNumbers || phoneNumbers.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No phone numbers configured. Add a number to get started.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {phoneNumbers.map((number) => (
                      <div
                        key={number.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                        data-testid={`number-${number.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                            <Phone className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold font-mono">{number.phoneNumber}</h3>
                              {number.friendlyName !== number.phoneNumber && (
                                <Badge variant="secondary">{number.friendlyName}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {number.country} • {number.capabilities.join(", ")}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePhoneNumber(number.id)}
                          data-testid={`button-delete-number-${number.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
