import { useState } from "react";
import { Link } from "wouter";
import {
  Play,
  Star,
  Code,
  Zap,
  Languages,
  MessageSquare,
  Volume2,
  User,
  Mic2,
  Shield,
  Github,
  Twitter,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { CodeBlock } from "@/components/code-block";
import { ModelCard } from "@/components/model-card";
import { AudioPlayer } from "@/components/audio-player";
import { useToast } from "@/hooks/use-toast";
import { MODEL_INFO, API_EXAMPLES, FEATURES } from "@/lib/constants";

const ICON_MAP: Record<string, any> = {
  Mic2,
  User,
  Languages,
  Volume2,
  MessageSquare,
  Zap,
  Code,
  Shield,
};

export default function Home() {
  const [demoText, setDemoText] = useState(
    "Welcome to VoiceForge API - the most realistic open-source voice synthesis platform."
  );
  const [selectedModel, setSelectedModel] = useState<string>("chatterbox");
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!demoText.trim()) return;
    
    setIsGenerating(true);
    setGeneratedAudio(null);
    
    try {
      // Helper to get API base URL
      const getApiBaseUrl = () => {
        if (import.meta.env.VITE_API_URL) {
          return import.meta.env.VITE_API_URL;
        }
        return "";
      };
      
      // Use the authenticated /api/tts endpoint with public demo key
      const apiBase = getApiBaseUrl();
      const response = await fetch(`${apiBase}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer vf_demo_public_key_for_landing_page",
        },
        body: JSON.stringify({
          text: demoText,
          model: selectedModel,
          format: "wav",
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create blob URL from audio data
      const blob = await response.blob();
      const audioUrl = URL.createObjectURL(blob);
      setGeneratedAudio(audioUrl);
      
      toast({
        title: "Speech generated",
        description: `Audio created using ${MODEL_INFO[selectedModel].name}`,
      });
    } catch (error) {
      console.error("TTS generation error:", error);
      toast({
        title: "Generation failed",
        description: "Failed to generate speech. Please try again.",
        variant: "destructive",
      });
      // Fallback to placeholder for demo purposes
      setGeneratedAudio("/placeholder-audio.mp3");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-8">
              <div className="space-y-4">
                <Badge variant="secondary" className="text-sm">
                  Open Source • GPU-Accelerated • ElevenLabs Quality
                </Badge>
                <h1 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Voice AI That
                  <span className="text-primary"> Sounds Human</span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  GPU-accelerated voice API with Chatterbox, Higgs Audio V2, and StyleTTS2.
                  Real-time TTS, STT, VAD, and VLLM for production voice agents.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard">
                  <Button size="lg" className="text-base" data-testid="button-hero-try-demo">
                    Try Live Demo
                    <Play className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/realtime">
                  <Button size="lg" variant="outline" className="text-base" data-testid="button-hero-realtime-lab">
                    Real-Time Testing
                    <Zap className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="flex items-center gap-8 pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Sub-200ms latency</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span>63.75% prefer vs ElevenLabs</span>
                </div>
              </div>
            </div>

            {/* Right Column - Waveform Visualization */}
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Live Waveform</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Online
                    </Badge>
                  </div>
                  
                  <div className="h-48 bg-background/50 rounded-lg flex items-center justify-center overflow-hidden p-4">
                    <div className="flex items-end gap-1 h-full w-full">
                      {Array.from({ length: 60 }).map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary rounded-t-full transition-all duration-300"
                          style={{
                            height: `${Math.sin(i * 0.3) * 40 + 50}%`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-foreground">3</p>
                      <p className="text-xs text-muted-foreground">TTS Models</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">23+</p>
                      <p className="text-xs text-muted-foreground">Languages</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">500M</p>
                      <p className="text-xs text-muted-foreground">Parameters</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Demo Section */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Try It Live
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Compare all three state-of-the-art TTS models side by side. Experience the difference in quality.
            </p>
          </div>

          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Text-to-Speech Comparison</CardTitle>
              <CardDescription>
                Enter your text below and select a model to generate speech
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Textarea
                  value={demoText}
                  onChange={(e) => setDemoText(e.target.value)}
                  placeholder="Enter text to synthesize..."
                  className="min-h-[100px] resize-none"
                  data-testid="input-demo-text"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                {Object.values(MODEL_INFO).map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    selected={selectedModel === model.id}
                    onSelect={() => setSelectedModel(model.id)}
                  />
                ))}
              </div>

              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!demoText.trim() || isGenerating}
                  data-testid="button-generate-speech"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Speech
                    </>
                  )}
                </Button>
              </div>

              {generatedAudio && (
                <div className="mt-6">
                  <AudioPlayer
                    src={generatedAudio}
                    title={`${MODEL_INFO[selectedModel].name} Output`}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete voice AI platform with all the tools to build production-ready voice agents
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = ICON_MAP[feature.icon];
              return (
                <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technical Specifications */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Technical Specifications
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Performance metrics and model comparisons
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Model Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 pb-2 border-b border-border text-xs font-medium text-muted-foreground">
                    <div>Model</div>
                    <div>Quality</div>
                    <div>Speed</div>
                    <div>Languages</div>
                  </div>
                  {Object.values(MODEL_INFO).map((model) => (
                    <div key={model.id} className="grid grid-cols-4 gap-4 items-center text-sm">
                      <div className="font-medium">{model.name}</div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: model.quality }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <div className="text-muted-foreground text-xs">{model.speed}</div>
                      <div className="text-muted-foreground">{model.languages.length}+</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Latency (TTS)</span>
                      <span className="text-sm text-muted-foreground">&lt;200ms</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary w-[95%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Accuracy (STT)</span>
                      <span className="text-sm text-muted-foreground">98.5%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-[98.5%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">GPU Utilization</span>
                      <span className="text-sm text-muted-foreground">85%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 w-[85%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Quality vs ElevenLabs</span>
                      <span className="text-sm text-muted-foreground">63.75%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 w-[63.75%]" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* API Showcase */}
      <section id="api" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Simple, Powerful API
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our RESTful API and official SDKs
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="curl" data-testid="tab-curl">cURL</TabsTrigger>
                <TabsTrigger value="python" data-testid="tab-python">Python</TabsTrigger>
                <TabsTrigger value="javascript" data-testid="tab-javascript">JavaScript</TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-6">
                <CodeBlock code={API_EXAMPLES.curl} language="bash" />
              </TabsContent>
              <TabsContent value="python" className="mt-6">
                <CodeBlock code={API_EXAMPLES.python} language="python" />
              </TabsContent>
              <TabsContent value="javascript" className="mt-6">
                <CodeBlock code={API_EXAMPLES.javascript} language="javascript" />
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <Link href="/dashboard">
                <Button size="lg" data-testid="button-get-api-key">
                  Get Your API Key
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            {/* Column 1: Logo */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Mic2 className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold text-foreground">VoiceForge</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Open-source voice AI platform with ElevenLabs-quality output
              </p>
            </div>

            {/* Column 2: Product */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/dashboard" className="hover:text-foreground transition-colors">API Dashboard</Link></li>
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Models</a></li>
              </ul>
            </div>

            {/* Column 3: Resources */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Examples</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Community</a></li>
              </ul>
            </div>

            {/* Column 4: Connect */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Connect</h3>
              <div className="flex gap-3">
                <Button size="icon" variant="ghost" data-testid="button-github">
                  <Github className="h-5 w-5" />
                </Button>
                <Button size="icon" variant="ghost" data-testid="button-twitter">
                  <Twitter className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2025 VoiceForge API. Built with Chatterbox, Higgs Audio V2, StyleTTS2, Whisper, and Llama.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
