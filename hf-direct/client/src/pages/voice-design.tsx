import { useState } from "react";
import { Wand2, Sparkles, Play, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function VoiceDesign() {
  const [prompt, setPrompt] = useState("");
  const [age, setAge] = useState([30]);
  const [pitch, setPitch] = useState([50]);
  const [warmth, setWarmth] = useState([50]);
  const [clarity, setClarity] = useState([50]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the voice you want to create",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Voice generated",
        description: "Your custom voice has been created successfully",
      });
    }, 3000);
  };

  const handleReset = () => {
    setPrompt("");
    setAge([30]);
    setPitch([50]);
    setWarmth([50]);
    setClarity([50]);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Wand2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Voice Design Studio</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Create entirely new AI-generated voices with precise control over characteristics
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Controls Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voice Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Voice Description
                </CardTitle>
                <CardDescription>
                  Describe the voice you want to create in natural language
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="e.g., A warm and friendly female voice with a slight British accent, professional yet approachable..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                  data-testid="input-voice-prompt"
                />
              </CardContent>
            </Card>

            {/* Voice Parameters */}
            <Card>
              <CardHeader>
                <CardTitle>Voice Parameters</CardTitle>
                <CardDescription>
                  Fine-tune the characteristics of your generated voice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="age">Age</Label>
                    <Badge variant="secondary">{age[0]} years</Badge>
                  </div>
                  <Slider
                    id="age"
                    min={18}
                    max={80}
                    step={1}
                    value={age}
                    onValueChange={setAge}
                    data-testid="slider-age"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pitch">Pitch</Label>
                    <Badge variant="secondary">{pitch[0]}%</Badge>
                  </div>
                  <Slider
                    id="pitch"
                    min={0}
                    max={100}
                    step={1}
                    value={pitch}
                    onValueChange={setPitch}
                    data-testid="slider-pitch"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Lower</span>
                    <span>Higher</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="warmth">Warmth</Label>
                    <Badge variant="secondary">{warmth[0]}%</Badge>
                  </div>
                  <Slider
                    id="warmth"
                    min={0}
                    max={100}
                    step={1}
                    value={warmth}
                    onValueChange={setWarmth}
                    data-testid="slider-warmth"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Cold</span>
                    <span>Warm</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="clarity">Clarity</Label>
                    <Badge variant="secondary">{clarity[0]}%</Badge>
                  </div>
                  <Slider
                    id="clarity"
                    min={0}
                    max={100}
                    step={1}
                    value={clarity}
                    onValueChange={setClarity}
                    data-testid="slider-clarity"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Soft</span>
                    <span>Sharp</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
                data-testid="button-generate-voice"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Voice
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Voice Preview</CardTitle>
                <CardDescription>
                  Generated voice will appear here
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-muted/50 rounded-lg flex items-center justify-center">
                  <Wand2 className="h-12 w-12 text-muted-foreground" />
                </div>
                <Button variant="outline" className="w-full" disabled data-testid="button-preview">
                  <Play className="mr-2 h-4 w-4" />
                  Preview Voice
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Pro Tip</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Be specific in your description. Mention accent, tone, gender, and speaking style 
                  for more accurate results.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
