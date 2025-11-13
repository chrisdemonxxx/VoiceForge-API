import { useState } from "react";
import { Check, User, Globe, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female";
  description: string;
  prompt: string;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedVoice?: string;
  onSelectVoice: (voiceId: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function VoiceSelector({
  voices,
  selectedVoice,
  onSelectVoice,
  isLoading = false,
  error,
}: VoiceSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Extract unique languages from voices and sort them
  const languages = Array.from(new Set(voices.map((v) => v.language))).sort();

  // Group languages by region for better organization
  const indianLanguages = ["Hindi", "Tamil", "Telugu", "Malayalam", "Bengali", "Urdu", "Gujarati", "Kannada", "Marathi", "Punjabi", "Odia", "Assamese", "Nepali", "Sindhi", "Kashmiri", "Sanskrit", "Manipuri", "Bodo", "Dogri", "Konkani", "Maithili"];
  const europeanLanguages = ["English (USA)", "English (UK)", "English (Canada)", "English (Australia)", "German", "French", "Spanish (Spain)", "Spanish (Mexico)", "Italian", "Portuguese (Brazil)", "Portuguese (Portugal)", "Dutch", "Polish", "Russian"];
  const asianLanguages = ["Japanese", "Korean", "Chinese (Mandarin)"];

  // Categorize all languages dynamically into regional groups
  const indianLangSet = languages.filter(lang => indianLanguages.includes(lang));
  const europeanLangSet = languages.filter(lang => europeanLanguages.includes(lang));
  const asianLangSet = languages.filter(lang => asianLanguages.includes(lang));
  const otherLangSet = languages.filter(
    lang => !indianLanguages.includes(lang) && 
            !europeanLanguages.includes(lang) && 
            !asianLanguages.includes(lang)
  );

  // Filter voices based on selection and search
  const filteredVoices = voices.filter((voice) => {
    const languageMatch = selectedLanguage === "all" || voice.language === selectedLanguage;
    const genderMatch = selectedGender === "all" || voice.gender === selectedGender;
    const searchMatch = searchQuery === "" || 
      voice.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      voice.language.toLowerCase().includes(searchQuery.toLowerCase());
    return languageMatch && genderMatch && searchMatch;
  });

  // Group filtered voices by language for display
  const voicesByLanguage: Record<string, Voice[]> = {};
  filteredVoices.forEach((voice) => {
    if (!voicesByLanguage[voice.language]) {
      voicesByLanguage[voice.language] = [];
    }
    voicesByLanguage[voice.language].push(voice);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        <div className="animate-pulse">Loading voices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-destructive mb-2">Failed to load voice library</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search voices by name, language, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-voice-search"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3">
          {/* Language Filter */}
          <div className="flex items-center gap-2 flex-1 min-w-48">
            <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium whitespace-nowrap">Language:</span>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="h-8 flex-1" data-testid="select-language">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="option-language-all">All Languages</SelectItem>
                {indianLangSet.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Indian Languages
                    </div>
                    {indianLangSet.map(lang => (
                      <SelectItem key={lang} value={lang} data-testid={`option-language-${lang}`}>
                        {lang}
                      </SelectItem>
                    ))}
                  </>
                )}
                {europeanLangSet.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      European Languages
                    </div>
                    {europeanLangSet.map(lang => (
                      <SelectItem key={lang} value={lang} data-testid={`option-language-${lang}`}>
                        {lang}
                      </SelectItem>
                    ))}
                  </>
                )}
                {asianLangSet.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Asian Languages
                    </div>
                    {asianLangSet.map(lang => (
                      <SelectItem key={lang} value={lang} data-testid={`option-language-${lang}`}>
                        {lang}
                      </SelectItem>
                    ))}
                  </>
                )}
                {otherLangSet.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      Other Languages
                    </div>
                    {otherLangSet.map(lang => (
                      <SelectItem key={lang} value={lang} data-testid={`option-language-${lang}`}>
                        {lang}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Gender:</span>
            <div className="flex gap-1">
              <Button
                variant={selectedGender === "all" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedGender("all")}
                className="h-8 text-xs"
                data-testid="filter-gender-all"
              >
                All
              </Button>
              <Button
                variant={selectedGender === "male" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedGender("male")}
                className="h-8 text-xs"
                data-testid="filter-gender-male"
              >
                Male
              </Button>
              <Button
                variant={selectedGender === "female" ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSelectedGender("female")}
                className="h-8 text-xs"
                data-testid="filter-gender-female"
              >
                Female
              </Button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>
            Showing {filteredVoices.length} of {voices.length} voices
            {searchQuery && ` matching "${searchQuery}"`}
          </span>
        </div>
      </div>

      {/* Voice Grid */}
      <ScrollArea className="h-80 border rounded-md">
        <div className="p-4 space-y-6">
          {selectedLanguage === "all" ? (
            Object.entries(voicesByLanguage).map(([language, langVoices]) => (
              <div key={language} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">{language}</h4>
                  <Badge variant="outline" className="text-xs">
                    {langVoices.length} voices
                  </Badge>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {langVoices.map((voice) => (
                    <VoiceCard
                      key={voice.id}
                      voice={voice}
                      selected={selectedVoice === voice.id}
                      onSelect={() => onSelectVoice(voice.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filteredVoices.map((voice) => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  selected={selectedVoice === voice.id}
                  onSelect={() => onSelectVoice(voice.id)}
                />
              ))}
            </div>
          )}

          {filteredVoices.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No voices found for the selected filters
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedVoice && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span>
            Selected: <span className="font-medium text-foreground">
              {voices.find((v) => v.id === selectedVoice)?.name || "Unknown"}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

interface VoiceCardProps {
  voice: Voice;
  selected: boolean;
  onSelect: () => void;
}

function VoiceCard({ voice, selected, onSelect }: VoiceCardProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-md border p-3 text-left transition-all hover-elevate active-elevate-2",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-card"
      )}
      data-testid={`voice-card-${voice.id}`}
    >
      {selected && (
        <div className="absolute top-2 right-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 w-full pr-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{voice.name}</p>
          <Badge variant="outline" className="text-xs px-1.5 py-0 mt-0.5 no-default-active-elevate">
            {voice.gender === "male" ? "M" : "F"}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{voice.description}</p>
    </button>
  );
}
