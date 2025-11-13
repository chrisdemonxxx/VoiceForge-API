import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Mic2,
  Key,
  Activity,
  Zap,
  CheckCircle,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Copy,
  Play,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AudioPlayer } from "@/components/audio-player";
import { ModelCard } from "@/components/model-card";
import { VoiceSelector } from "@/components/voice-selector";
import { MODEL_INFO } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import type { UsageStats, ApiKey } from "@shared/schema";
import type { Voice } from "@shared/voices";

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState("indic-parler-tts");
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [ttsText, setTtsText] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Voice cloning state
  const [cloneName, setCloneName] = useState("");
  const [cloneModel, setCloneModel] = useState("chatterbox");
  const [cloneDescription, setCloneDescription] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  
  // Synthetic voice state
  const [syntheticGender, setSyntheticGender] = useState("female");
  const [syntheticAge, setSyntheticAge] = useState("middle_aged");
  const [syntheticAccent, setSyntheticAccent] = useState("");
  const [syntheticTone, setSyntheticTone] = useState("");

  // API key creation state
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("1000");

  // Fetch API keys from database (no auth required for key management)
  const { data: apiKeys = [], isLoading: apiKeysLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/keys"],
  });

  // Helper to get auth headers with active API key
  const getAuthHeaders = () => {
    const activeKey = apiKeys.find(k => k.active);
    if (!activeKey) {
      return null;
    }
    return {
      "Authorization": `Bearer ${activeKey.key}`,
    };
  };

  // Fetch real usage stats from API
  const { data: stats = {
    totalRequests: 0,
    successRate: 0,
    avgLatency: 0,
    requestsToday: 0,
    ttsRequests: 0,
    sttRequests: 0,
    vadRequests: 0,
    vllmRequests: 0,
  }, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/usage", apiKeys.length],
    queryFn: async () => {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        // Return default empty stats if no active key
        return {
          totalRequests: 0,
          successRate: 0,
          avgLatency: 0,
          requestsToday: 0,
          ttsRequests: 0,
          sttRequests: 0,
          vadRequests: 0,
          vllmRequests: 0,
        };
      }
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/usage`, {
        headers: authHeaders,
      });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized - API key may be invalid");
        }
        throw new Error("Failed to fetch usage stats");
      }
      return response.json();
    },
    enabled: apiKeys.some(k => k.active), // Only fetch when there's an active key
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Helper to get API base URL (same as in queryClient)
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    return "";
  };

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      toast({
        title: "Error",
        description: "Please enter text to synthesize",
        variant: "destructive",
      });
      return;
    }

    // Get the first active API key
    const activeKey = apiKeys.find(k => k.active);
    if (!activeKey) {
      toast({
        title: "Error",
        description: "No active API key found. Please create an API key first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedAudio(null);

    toast({
      title: "Generating speech...",
      description: `Using ${MODEL_INFO[selectedModel]?.name || selectedModel}`,
    });

    try {
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey.key}`,
        },
        body: JSON.stringify({
          text: ttsText,
          model: selectedModel,
          voice: selectedVoice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate speech");
      }

      // Get the audio blob and create a URL
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      setGeneratedAudio(audioUrl);

      toast({
        title: "Speech generated",
        description: "Your audio is ready to play",
      });
    } catch (error: any) {
      console.error("TTS error:", error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate speech",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // API Key mutations
  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { name: string; rateLimit: number }) => {
      const response = await apiRequest("POST", "/api/keys", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "API key created",
        description: "Your new API key has been generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create API key",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/keys/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      toast({
        title: "API key deleted",
        description: "The API key has been permanently deleted",
        variant: "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete API key",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Toggle API key active status mutation
  const toggleApiKeyMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await apiRequest("PATCH", `/api/keys/${id}`, { active });
      return await response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/keys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/usage", apiKeys.length] });
      toast({
        title: variables.active ? "API key activated" : "API key deactivated",
        description: variables.active 
          ? "This key is now active and will be used for API requests" 
          : "This key has been deactivated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating API key",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "API key copied",
      description: "The API key has been copied to your clipboard",
    });
  };

  const handleDeleteKey = (id: string) => {
    deleteApiKeyMutation.mutate(id);
  };

  const handleToggleKey = (id: string, currentActive: boolean) => {
    toggleApiKeyMutation.mutate({ id, active: !currentActive });
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    createApiKeyMutation.mutate({ 
      name: newKeyName, 
      rateLimit: parseInt(newKeyRateLimit) 
    });
    
    // Reset form and close dialog
    setNewKeyName("");
    setNewKeyRateLimit("1000");
    setIsKeyDialogOpen(false);
  };

  // Voice cloning mutation
  const cloneVoiceMutation = useMutation({
    mutationFn: async (data: { 
      name: string; 
      model: string; 
      description?: string; 
      file?: File;
      cloningMode: "instant" | "professional" | "synthetic";
      voiceDescription?: string;
      age?: string;
      gender?: string;
      accent?: string;
      tone?: string;
    }) => {
      // Get the first active API key
      const activeKey = apiKeys.find(k => k.active);
      if (!activeKey) {
        throw new Error("No active API key found. Please create an API key first.");
      }

      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("model", data.model);
      formData.append("cloningMode", data.cloningMode);
      
      if (data.description) {
        formData.append("description", data.description);
      }
      
      // Synthetic voice specific fields
      if (data.cloningMode === "synthetic") {
        if (data.voiceDescription) {
          formData.append("voiceDescription", data.voiceDescription);
        }
        if (data.age) formData.append("age", data.age);
        if (data.gender) formData.append("gender", data.gender);
        if (data.accent) formData.append("accent", data.accent);
        if (data.tone) formData.append("tone", data.tone);
      } else {
        // Audio file required for instant and professional modes
        if (data.file) {
          formData.append("reference", data.file);
        }
      }

      const response = await fetch("/api/clone-voice", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${activeKey.key}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clone voice");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const modeLabel = data.cloningMode === "instant" ? "Instant clone" : 
                        data.cloningMode === "professional" ? "Professional clone" :
                        "Synthetic voice";
      toast({
        title: "Voice created successfully",
        description: data.cloningMode === "professional" 
          ? `${data.name} is processing. This will take 2-4 hours.`
          : `${data.name} is ready to use (${modeLabel})`,
      });
      // Reset form
      setCloneName("");
      setCloneDescription("");
      setReferenceFile(null);
      // Invalidate voices list
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Voice cloning failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCloneVoice = (mode: "instant" | "professional" | "synthetic") => {
    if (!cloneName.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for your voice",
        variant: "destructive",
      });
      return;
    }

    // Validate based on mode
    if (mode === "synthetic") {
      if (!cloneDescription.trim()) {
        toast({
          title: "Description required",
          description: "Please provide a description for the synthetic voice",
          variant: "destructive",
        });
        return;
      }
      
      cloneVoiceMutation.mutate({
        name: cloneName,
        model: cloneModel,
        cloningMode: "synthetic",
        voiceDescription: cloneDescription,
        age: syntheticAge,
        gender: syntheticGender,
        accent: syntheticAccent,
        tone: syntheticTone,
      });
    } else {
      // Instant or Professional mode
      if (!referenceFile) {
        toast({
          title: "Reference audio required",
          description: "Please upload a reference audio file",
          variant: "destructive",
        });
        return;
      }

      cloneVoiceMutation.mutate({
        name: cloneName,
        model: cloneModel,
        description: cloneDescription,
        file: referenceFile,
        cloningMode: mode,
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReferenceFile(file);
      toast({
        title: "File selected",
        description: file.name,
      });
    }
  };

  // Fetch cloned voices (requires authentication)
  const { data: clonedVoices, isLoading: voicesLoading } = useQuery<any[]>({
    queryKey: ["/api/voices", apiKeys.length],
    queryFn: async () => {
      const authHeaders = getAuthHeaders();
      if (!authHeaders) {
        return []; // Return empty array if no active key
      }
      const response = await fetch("/api/voices", {
        headers: authHeaders,
      });
      if (!response.ok) {
        if (response.status === 401) {
          return []; // Return empty array if unauthorized
        }
        throw new Error("Failed to fetch cloned voices");
      }
      return response.json();
    },
    enabled: apiKeys.some(k => k.active), // Only fetch when there's an active key
  });

  // Fetch voice library (no authentication required)
  const { data: voiceLibrary, isLoading: voiceLibraryLoading, error: voiceLibraryError } = useQuery<Voice[]>({
    queryKey: ["/api/voice-library"],
  });

  // Delete voice mutation
  const deleteVoiceMutation = useMutation({
    mutationFn: async (voiceId: string) => {
      // Get the first active API key
      const activeKey = apiKeys.find(k => k.active);
      if (!activeKey) {
        throw new Error("No active API key found. Please create an API key first.");
      }

      const response = await fetch(`/api/voices/${voiceId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${activeKey.key}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete voice");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Voice deleted",
        description: "The cloned voice has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete voice",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Mic2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-sidebar-foreground">VoiceForge</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Button
            variant="secondary"
            className="w-full justify-start"
            data-testid="nav-overview"
          >
            <Activity className="mr-3 h-4 w-4" />
            Overview
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="nav-api-keys"
          >
            <Key className="mr-3 h-4 w-4" />
            API Keys
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="nav-analytics"
          >
            <BarChart3 className="mr-3 h-4 w-4" />
            Analytics
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="nav-settings"
          >
            <Settings className="mr-3 h-4 w-4" />
            Settings
          </Button>
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start hover-elevate"
            data-testid="button-logout"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8 space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Monitor your API usage and test voice models
            </p>
          </div>

          {/* No Active Key Warning Banner */}
          {apiKeys.length > 0 && !apiKeys.some(k => k.active) && (
            <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950" data-testid="banner-no-active-key">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                      No Active API Key
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      You have API keys but none are currently active. Please activate a key to use the API and view usage statistics.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card data-testid="card-stat-requests">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Requests Today</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.requestsToday.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  +12% from yesterday
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-success-rate">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Excellent performance
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-latency">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgLatency}ms</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sub-200ms target
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-total">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All time
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Voice Testing Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Voice Testing</CardTitle>
              <CardDescription>
                Test TTS, STT, VAD, and voice cloning in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tts" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="tts" data-testid="tab-tts">Text-to-Speech</TabsTrigger>
                  <TabsTrigger value="stt" data-testid="tab-stt">Speech-to-Text</TabsTrigger>
                  <TabsTrigger value="vad" data-testid="tab-vad">Voice Detection</TabsTrigger>
                  <TabsTrigger value="clone" data-testid="tab-clone">Voice Cloning</TabsTrigger>
                </TabsList>

                {/* TTS Tab */}
                <TabsContent value="tts" className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="tts-text">Text to Synthesize</Label>
                    <Textarea
                      id="tts-text"
                      value={ttsText}
                      onChange={(e) => setTtsText(e.target.value)}
                      placeholder="Enter text to convert to speech..."
                      className="min-h-[120px] resize-none"
                      data-testid="input-tts-text"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    {Object.values(MODEL_INFO).map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        selected={selectedModel === model.id}
                        onSelect={() => {
                          setSelectedModel(model.id);
                          if (model.id !== "indic-parler-tts") {
                            setSelectedVoice(undefined);
                          }
                        }}
                      />
                    ))}
                  </div>

                  {selectedModel === "indic-parler-tts" && (
                    <div className="space-y-2">
                      <Label>Select Voice</Label>
                      <VoiceSelector
                        voices={voiceLibrary || []}
                        selectedVoice={selectedVoice}
                        onSelectVoice={setSelectedVoice}
                        isLoading={voiceLibraryLoading}
                        error={voiceLibraryError?.message}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Select defaultValue="wav">
                      <SelectTrigger className="w-32" data-testid="select-audio-format">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="wav">WAV</SelectItem>
                        <SelectItem value="mp3">MP3</SelectItem>
                        <SelectItem value="flac">FLAC</SelectItem>
                        <SelectItem value="ogg">OGG</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleGenerateTTS}
                      disabled={!ttsText.trim() || isGenerating}
                      data-testid="button-generate-tts"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      {isGenerating ? "Generating..." : "Generate Speech"}
                    </Button>
                  </div>

                  {generatedAudio && (
                    <div className="mt-6">
                      <AudioPlayer
                        src={generatedAudio}
                        title={`${MODEL_INFO[selectedModel].name} - Generated Audio`}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* STT Tab */}
                <TabsContent value="stt" className="space-y-6 mt-6">
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Upload Audio File
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Support for WAV, MP3, FLAC, OGG formats
                    </p>
                    <Button data-testid="button-upload-audio">
                      Select File
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Transcription Result</Label>
                    <Textarea
                      readOnly
                      placeholder="Transcribed text will appear here..."
                      className="min-h-[120px] resize-none bg-muted"
                      data-testid="output-transcription"
                    />
                  </div>
                </TabsContent>

                {/* VAD Tab */}
                <TabsContent value="vad" className="space-y-6 mt-6">
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                    <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Voice Activity Detection
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Upload audio to detect speech segments using Silero VAD
                    </p>
                    <Button data-testid="button-upload-vad">
                      Select Audio File
                    </Button>
                  </div>
                </TabsContent>

                {/* Voice Cloning Tab - Three Modes */}
                <TabsContent value="clone" className="space-y-6 mt-6">
                  <div className="grid gap-6 md:grid-cols-3">
                    {/* Instant Voice Clone */}
                    <Card className="bg-card">
                      <CardHeader className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">Instant Clone</CardTitle>
                        </div>
                        <CardDescription>
                          30s - 2min audio • Fast processing • Good quality
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="instant-name">Voice Name</Label>
                          <Input
                            id="instant-name"
                            placeholder="My Voice"
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            data-testid="input-instant-name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Reference Audio (30s-2min)</Label>
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground mb-2">
                              {referenceFile ? referenceFile.name : "Upload audio"}
                            </p>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload-instant"
                            />
                            <Button 
                              size="sm"
                              variant="outline" 
                              onClick={() => document.getElementById("file-upload-instant")?.click()}
                              data-testid="button-upload-instant"
                            >
                              {referenceFile ? "Change" : "Select"}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Model</Label>
                          <Select value={cloneModel} onValueChange={setCloneModel}>
                            <SelectTrigger data-testid="select-instant-model">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chatterbox">Chatterbox</SelectItem>
                              <SelectItem value="higgs_audio_v2">Higgs Audio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => handleCloneVoice("instant")}
                          disabled={cloneVoiceMutation.isPending}
                          data-testid="button-create-instant"
                        >
                          {cloneVoiceMutation.isPending ? "Cloning..." : "Create Clone"}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Professional Voice Clone */}
                    <Card className="bg-card">
                      <CardHeader className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">Professional Clone</CardTitle>
                        </div>
                        <CardDescription>
                          30+ min audio • 2-4h processing • Best quality
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="pro-name">Voice Name</Label>
                          <Input
                            id="pro-name"
                            placeholder="Pro Voice"
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            data-testid="input-pro-name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Reference Audio (30+ min)</Label>
                          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                            <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground mb-2">
                              {referenceFile ? referenceFile.name : "Upload long audio"}
                            </p>
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={handleFileSelect}
                              className="hidden"
                              id="file-upload-pro"
                            />
                            <Button 
                              size="sm"
                              variant="outline" 
                              onClick={() => document.getElementById("file-upload-pro")?.click()}
                              data-testid="button-upload-pro"
                            >
                              {referenceFile ? "Change" : "Select"}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Model</Label>
                          <Select value={cloneModel} onValueChange={setCloneModel}>
                            <SelectTrigger data-testid="select-pro-model">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chatterbox">Chatterbox</SelectItem>
                              <SelectItem value="higgs_audio_v2">Higgs Audio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => handleCloneVoice("professional")}
                          disabled={cloneVoiceMutation.isPending}
                          data-testid="button-create-pro"
                        >
                          {cloneVoiceMutation.isPending ? "Starting..." : "Start Processing"}
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Voice Design (Synthetic) */}
                    <Card className="bg-card">
                      <CardHeader className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Mic2 className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">Voice Design</CardTitle>
                        </div>
                        <CardDescription>
                          No audio needed • AI-generated • Instant
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="synthetic-name">Voice Name</Label>
                          <Input
                            id="synthetic-name"
                            placeholder="AI Voice"
                            value={cloneName}
                            onChange={(e) => setCloneName(e.target.value)}
                            data-testid="input-synthetic-name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="voice-description">Voice Description</Label>
                          <Textarea
                            id="voice-description"
                            placeholder="e.g., Warm, professional female voice with slight British accent"
                            value={cloneDescription}
                            onChange={(e) => setCloneDescription(e.target.value)}
                            className="min-h-[80px] resize-none"
                            data-testid="input-voice-description"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Gender</Label>
                            <Select value={syntheticGender} onValueChange={setSyntheticGender}>
                              <SelectTrigger className="h-8" data-testid="select-gender">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="neutral">Neutral</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Age</Label>
                            <Select value={syntheticAge} onValueChange={setSyntheticAge}>
                              <SelectTrigger className="h-8" data-testid="select-age">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="young">Young</SelectItem>
                                <SelectItem value="middle_aged">Middle Aged</SelectItem>
                                <SelectItem value="old">Old</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={() => handleCloneVoice("synthetic")}
                          disabled={cloneVoiceMutation.isPending}
                          data-testid="button-create-synthetic"
                        >
                          {cloneVoiceMutation.isPending ? "Generating..." : "Generate Voice"}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Cloned Voices Management */}
          <Card>
            <CardHeader>
              <CardTitle>Cloned Voices</CardTitle>
              <CardDescription>
                Manage your custom cloned voices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {voicesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading voices...
                </div>
              ) : !clonedVoices || clonedVoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No cloned voices yet. Create one in the Voice Testing tab above.
                </div>
              ) : (
                <div className="space-y-4">
                  {clonedVoices.map((voice: any) => (
                    <div
                      key={voice.id}
                      className="flex items-center justify-between p-4 border border-card-border rounded-lg hover-elevate"
                      data-testid={`voice-${voice.id}`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{voice.name}</p>
                          
                          {/* Cloning Mode Badge */}
                          {voice.cloningMode && (
                            <Badge variant="outline" className="gap-1">
                              {voice.cloningMode === "instant" && <><Zap className="h-3 w-3" /> Instant</>}
                              {voice.cloningMode === "professional" && <><Clock className="h-3 w-3" /> Pro</>}
                              {voice.cloningMode === "synthetic" && <><Mic2 className="h-3 w-3" /> Synthetic</>}
                            </Badge>
                          )}
                          
                          {/* Model Badge */}
                          <Badge variant="secondary">
                            {voice.model === "chatterbox" ? "Chatterbox" : "Higgs Audio"}
                          </Badge>
                          
                          {/* Processing Status Badge */}
                          {voice.processingStatus && (
                            <Badge 
                              variant={voice.processingStatus === "completed" ? "default" : "secondary"}
                              className={
                                voice.processingStatus === "completed" 
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                                  : voice.processingStatus === "processing"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                  : voice.processingStatus === "failed"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                  : ""
                              }
                            >
                              {voice.processingStatus === "completed" && <CheckCircle className="h-3 w-3 mr-1 inline" />}
                              {voice.processingStatus === "processing" && <Clock className="h-3 w-3 mr-1 inline" />}
                              {voice.processingStatus}
                            </Badge>
                          )}
                        </div>
                        {voice.description && (
                          <p className="text-sm text-muted-foreground">{voice.description}</p>
                        )}
                        {voice.voiceDescription && (
                          <p className="text-sm text-muted-foreground italic">"{voice.voiceDescription}"</p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(voice.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteVoiceMutation.mutate(voice.id)}
                        disabled={deleteVoiceMutation.isPending}
                        data-testid={`button-delete-voice-${voice.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* API Keys Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>API Keys</CardTitle>
                  <CardDescription>
                    Manage your API keys for authentication
                  </CardDescription>
                </div>
                <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-api-key">
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Key
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New API Key</DialogTitle>
                      <DialogDescription>
                        Generate a new API key for authentication. Keep your API key secure and never share it publicly.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="key-name">Key Name</Label>
                        <Input
                          id="key-name"
                          placeholder="e.g., Production API, Development, Mobile App"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          data-testid="input-key-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rate-limit">Rate Limit (requests/hour)</Label>
                        <Select value={newKeyRateLimit} onValueChange={setNewKeyRateLimit}>
                          <SelectTrigger id="rate-limit" data-testid="select-rate-limit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="100">100 requests/hour</SelectItem>
                            <SelectItem value="500">500 requests/hour</SelectItem>
                            <SelectItem value="1000">1,000 requests/hour</SelectItem>
                            <SelectItem value="5000">5,000 requests/hour</SelectItem>
                            <SelectItem value="10000">10,000 requests/hour</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsKeyDialogOpen(false)}
                        data-testid="button-cancel-create-key"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateKey}
                        disabled={createApiKeyMutation.isPending}
                        data-testid="button-confirm-create-key"
                      >
                        {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-4 border border-card-border rounded-lg hover-elevate"
                    data-testid={`api-key-${key.id}`}
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{key.name}</p>
                        <Badge
                          variant="secondary"
                          className={
                            key.active
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : ""
                          }
                        >
                          {key.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <code className="bg-muted px-2 py-1 rounded">
                          {key.key.slice(0, 20)}...
                        </code>
                        <span>Created {key.createdAt.toLocaleDateString()}</span>
                        <span>{key.usage.toLocaleString()} requests</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={key.active ? "secondary" : "default"}
                        onClick={() => handleToggleKey(key.id, key.active)}
                        disabled={toggleApiKeyMutation.isPending}
                        data-testid={`button-toggle-key-${key.id}`}
                      >
                        {key.active ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCopyKey(key.key)}
                        data-testid={`button-copy-key-${key.id}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteKey(key.id)}
                        data-testid={`button-delete-key-${key.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Usage Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                API usage breakdown by service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Text-to-Speech</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.ttsRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${(stats.ttsRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Speech-to-Text</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.sttRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(stats.sttRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Voice Activity Detection</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.vadRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${(stats.vadRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">VLLM Conversations</span>
                    <span className="text-sm text-muted-foreground">
                      {stats.vllmRequests.toLocaleString()} requests
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${(stats.vllmRequests / stats.totalRequests) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
