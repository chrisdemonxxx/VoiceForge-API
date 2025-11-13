import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Play, Mic2, User, Globe, Loader2, Sparkles, Zap, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Navbar } from "@/components/navbar";
import { useToast } from "@/hooks/use-toast";
import type { Voice } from "@shared/voices";
import type { ClonedVoice } from "@shared/schema";

interface CombinedVoice {
  type: "pre-made" | "cloned";
  id?: string;
  displayName: string;
  displayLanguage: string;
  displayGender: "male" | "female";
  displayDescription: string;
  cloningMode?: string;
  processingStatus?: string;
  status?: string;
  prompt?: string;
}

// Language family categorization
const INDIAN_LANGUAGES = [
  "Hindi", "Tamil", "Telugu", "Malayalam", "Bengali", "Urdu", 
  "Kannada", "Marathi", "Gujarati", "Punjabi", "Odia", "Assamese",
  "Kashmiri", "Konkani", "Maithili", "Nepali", "Sanskrit", "Santali",
  "Sindhi", "Dogri", "Manipuri"
];

const T1_LANGUAGES = [
  "English (USA)", "English (UK)", "English (Canada)", "English (Australia)",
  "German", "French", "Spanish", "Portuguese", "Italian", "Japanese",
  "Korean", "Chinese"
];

export default function VoiceLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  // Fetch pre-made voices
  const { data: preMadeVoices = [], isLoading: isLoadingPreMade } = useQuery<Voice[]>({
    queryKey: ["/api/voice-library"],
  });

  // Fetch cloned voices
  const { data: clonedVoices = [], isLoading: isLoadingCloned } = useQuery<ClonedVoice[]>({
    queryKey: ["/api/cloned-voices"],
  });

  // Combine voices into unified format
  const combinedVoices: CombinedVoice[] = useMemo(() => {
    const preMade: CombinedVoice[] = preMadeVoices.map(v => ({
      ...v,
      type: "pre-made" as const,
      displayName: v.name,
      displayLanguage: v.language,
      displayGender: v.gender,
      displayDescription: v.description,
    }));

    const cloned: CombinedVoice[] = clonedVoices.map(v => ({
      ...v,
      type: "cloned" as const,
      displayName: v.name,
      displayLanguage: "Custom",
      displayGender: "female" as const,
      displayDescription: v.description || "Cloned voice",
    }));

    return [...preMade, ...cloned];
  }, [preMadeVoices, clonedVoices]);

  // Extract all unique languages
  const allLanguages = useMemo(() => {
    const langs = new Set(preMadeVoices.map(v => v.language));
    return Array.from(langs).sort();
  }, [preMadeVoices]);

  // Filter voices
  const filteredVoices = useMemo(() => {
    return combinedVoices.filter(voice => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = voice.displayName.toLowerCase().includes(query);
        const matchesLanguage = voice.displayLanguage.toLowerCase().includes(query);
        const matchesDescription = voice.displayDescription.toLowerCase().includes(query);
        if (!matchesName && !matchesLanguage && !matchesDescription) return false;
      }

      // Gender filter
      if (selectedGender !== "all" && voice.displayGender !== selectedGender) {
        return false;
      }

      // Category filter
      if (selectedCategory === "pre-made" && voice.type !== "pre-made") return false;
      if (selectedCategory === "cloned" && voice.type !== "cloned") return false;

      // Language filter
      if (selectedLanguages.length > 0 && !selectedLanguages.includes(voice.displayLanguage)) {
        return false;
      }

      return true;
    });
  }, [combinedVoices, searchQuery, selectedGender, selectedCategory, selectedLanguages]);

  // Categorize voices by language family
  const indianVoices = filteredVoices.filter(v => INDIAN_LANGUAGES.includes(v.displayLanguage));
  const t1Voices = filteredVoices.filter(v => T1_LANGUAGES.includes(v.displayLanguage));
  const clonedOnlyVoices = filteredVoices.filter(v => v.type === "cloned");
  const otherVoices = filteredVoices.filter(
    v => !INDIAN_LANGUAGES.includes(v.displayLanguage) && 
         !T1_LANGUAGES.includes(v.displayLanguage) &&
         v.type !== "cloned"
  );

  const handlePlayPreview = async (voice: CombinedVoice) => {
    const voiceId = voice.id || "";

    if (playingVoice === voiceId) {
      audioElement?.pause();
      setPlayingVoice(null);
      return;
    }

    try {
      setPlayingVoice(voiceId);

      // Generate sample audio
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer vf_demo_public_key_for_landing_page",
        },
        body: JSON.stringify({
          text: `Hello, I am ${voice.displayName}. This is a preview of my voice.`,
          model: "chatterbox",
          voice: voice.type === "pre-made" ? voice.prompt : voiceId,
          format: "wav",
        }),
      });

      if (!response.ok) throw new Error("Failed to generate preview");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.addEventListener("ended", () => setPlayingVoice(null));
      audio.play();
      setAudioElement(audio);
    } catch (error) {
      console.error("Preview error:", error);
      toast({
        title: "Preview unavailable",
        description: "Failed to generate voice preview",
        variant: "destructive",
      });
      setPlayingVoice(null);
    }
  };

  const handleLanguageToggle = (language: string) => {
    setSelectedLanguages(prev =>
      prev.includes(language)
        ? prev.filter(l => l !== language)
        : [...prev, language]
    );
  };

  const isLoading = isLoadingPreMade || isLoadingCloned;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-subtle">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mic2 className="h-8 w-8 text-primary" />
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground">
              Voice Library
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore our premium collection of 135+ voices across 23+ languages
          </p>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span>{allLanguages.length} Languages</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>{combinedVoices.length} Voices</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Premium Quality</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search */}
                  <div className="space-y-2">
                    <Label htmlFor="search" className="text-sm font-medium">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search voices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-voices"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Category Tabs */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Category</Label>
                    <RadioGroup value={selectedCategory} onValueChange={setSelectedCategory}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="cat-all" data-testid="radio-category-all" />
                        <Label htmlFor="cat-all" className="font-normal cursor-pointer">All Voices</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="pre-made" id="cat-premade" data-testid="radio-category-premade" />
                        <Label htmlFor="cat-premade" className="font-normal cursor-pointer">Pre-made</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cloned" id="cat-cloned" data-testid="radio-category-cloned" />
                        <Label htmlFor="cat-cloned" className="font-normal cursor-pointer">Cloned</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Gender Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Gender</Label>
                    <RadioGroup value={selectedGender} onValueChange={setSelectedGender}>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="gender-all" data-testid="radio-gender-all" />
                        <Label htmlFor="gender-all" className="font-normal cursor-pointer">All</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="male" id="gender-male" data-testid="radio-gender-male" />
                        <Label htmlFor="gender-male" className="font-normal cursor-pointer">Male</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="female" id="gender-female" data-testid="radio-gender-female" />
                        <Label htmlFor="gender-female" className="font-normal cursor-pointer">Female</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Separator />

                  {/* Language Filter */}
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <Label className="text-sm font-medium cursor-pointer">Languages</Label>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {allLanguages.map(lang => (
                            <div key={lang} className="flex items-center space-x-2">
                              <Checkbox
                                id={`lang-${lang}`}
                                checked={selectedLanguages.includes(lang)}
                                onCheckedChange={() => handleLanguageToggle(lang)}
                                data-testid={`checkbox-language-${lang.toLowerCase().replace(/\s+/g, '-')}`}
                              />
                              <Label
                                htmlFor={`lang-${lang}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {lang}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            </aside>

            {/* Voice Grid */}
            <div className="lg:col-span-3 space-y-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {/* Cloned Voices Section */}
                  {selectedCategory !== "pre-made" && clonedOnlyVoices.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Cloned Voices</h2>
                        <Badge variant="secondary">{clonedOnlyVoices.length}</Badge>
                      </div>
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {clonedOnlyVoices.map(voice => (
                          <VoiceCard
                            key={voice.id}
                            voice={voice}
                            isPlaying={playingVoice === voice.id}
                            onPlay={() => handlePlayPreview(voice)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Indian Languages Section */}
                  {selectedCategory !== "cloned" && indianVoices.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Indian Languages</h2>
                        <Badge variant="secondary">{indianVoices.length}</Badge>
                      </div>
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {indianVoices.map(voice => (
                          <VoiceCard
                            key={voice.id}
                            voice={voice}
                            isPlaying={playingVoice === voice.id}
                            onPlay={() => handlePlayPreview(voice)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* T1 Country Languages Section */}
                  {selectedCategory !== "cloned" && t1Voices.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Global Languages</h2>
                        <Badge variant="secondary">{t1Voices.length}</Badge>
                      </div>
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {t1Voices.map(voice => (
                          <VoiceCard
                            key={voice.id}
                            voice={voice}
                            isPlaying={playingVoice === voice.id}
                            onPlay={() => handlePlayPreview(voice)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Other Languages Section */}
                  {selectedCategory !== "cloned" && otherVoices.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-primary" />
                        <h2 className="text-2xl font-bold text-foreground">Other Languages</h2>
                        <Badge variant="secondary">{otherVoices.length}</Badge>
                      </div>
                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {otherVoices.map(voice => (
                          <VoiceCard
                            key={voice.id}
                            voice={voice}
                            isPlaying={playingVoice === voice.id}
                            onPlay={() => handlePlayPreview(voice)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No Results */}
                  {filteredVoices.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground">No voices found matching your filters</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Voice Card Component
interface VoiceCardProps {
  voice: CombinedVoice;
  isPlaying: boolean;
  onPlay: () => void;
}

function VoiceCard({ voice, isPlaying, onPlay }: VoiceCardProps) {
  const getCloningModeBadge = () => {
    if (voice.type !== "cloned") return null;

    const mode = voice.cloningMode;
    const icons = {
      instant: Zap,
      professional: Sparkles,
      synthetic: FlaskConical,
    };

    const Icon = icons[mode as keyof typeof icons] || Sparkles;

    return (
      <Badge variant="secondary" className="gap-1">
        <Icon className="h-3 w-3" />
        {mode === "instant" ? "Instant" : mode === "professional" ? "Pro" : "Synthetic"}
      </Badge>
    );
  };

  const getStatusBadge = () => {
    if (voice.type !== "cloned") return null;

    const status = voice.processingStatus || voice.status;
    
    if (status === "processing" || status === "pending") {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          Processing
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        Ready
      </Badge>
    );
  };

  return (
    <Card className="group hover-scale transition-smooth overflow-hidden glass-effect" data-testid={`card-voice-${voice.id}`}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{voice.displayName}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Globe className="h-3 w-3" />
              <span className="truncate">{voice.displayLanguage}</span>
              <span className="text-muted-foreground">•</span>
              <User className="h-3 w-3" />
              <span className="capitalize">{voice.displayGender}</span>
            </CardDescription>
          </div>
          {getCloningModeBadge()}
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {voice.displayDescription}
        </p>

        {getStatusBadge()}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Waveform Visualization */}
        <div className="h-16 bg-muted/50 rounded-lg flex items-center justify-center overflow-hidden p-2">
          <div className="flex items-end gap-0.5 h-full w-full">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-full transition-all duration-300 ${
                  isPlaying ? "bg-primary" : "bg-muted-foreground/40"
                }`}
                style={{
                  height: `${Math.sin(i * 0.5) * 30 + 40}%`,
                  animationDelay: isPlaying ? `${i * 30}ms` : "0ms",
                }}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onPlay}
            className="flex-1"
            data-testid={`button-preview-${voice.id}`}
          >
            {isPlaying ? (
              <>
                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                Playing
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-2" />
                Preview
              </>
            )}
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gradient-royal"
            data-testid={`button-use-${voice.id}`}
          >
            <Sparkles className="h-3 w-3 mr-2" />
            Use Voice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
