import { useState } from "react";
import { Zap, Sparkles, Wand2, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

export default function AgentFlowsAIBuilder() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlow, setGeneratedFlow] = useState<any>(null);
  const { toast } = useToast();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the agent flow you want to create",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedFlow({
        name: "AI-Generated Flow",
        steps: 4,
        intents: 6,
        responses: 12,
      });
      toast({
        title: "Flow generated",
        description: "Your AI agent flow has been created successfully",
      });
    }, 3000);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">AI Flow Builder</h1>
            <Badge variant="secondary" className="ml-2">Beta</Badge>
          </div>
          <p className="text-muted-foreground mt-2">
            Describe your agent in natural language and let AI build the flow for you
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Describe Your Agent
                </CardTitle>
                <CardDescription>
                  Tell us what you want your voice agent to do
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., I need a customer support agent that can answer questions about product features, handle returns and exchanges, and escalate complex issues to human agents. The agent should be friendly and professional."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[200px] resize-none"
                  data-testid="input-ai-prompt"
                />

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full"
                  data-testid="button-generate-flow"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Flow...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Flow with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Flow Preview */}
            {generatedFlow && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Generated Flow
                  </CardTitle>
                  <CardDescription>
                    Your AI agent flow is ready to customize
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{generatedFlow.steps}</div>
                      <div className="text-xs text-muted-foreground mt-1">Flow Steps</div>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{generatedFlow.intents}</div>
                      <div className="text-xs text-muted-foreground mt-1">Intents</div>
                    </div>
                    <div className="text-center p-4 bg-background rounded-lg">
                      <div className="text-2xl font-bold text-foreground">{generatedFlow.responses}</div>
                      <div className="text-xs text-muted-foreground mt-1">Responses</div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button className="flex-1" data-testid="button-customize">
                      <Wand2 className="mr-2 h-4 w-4" />
                      Customize Flow
                    </Button>
                    <Button variant="outline" className="flex-1" data-testid="button-use-template">
                      Use as Template
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Examples Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Example Prompts</CardTitle>
                <CardDescription>
                  Get inspired by these examples
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <button
                    onClick={() => setPrompt("Create a restaurant reservation agent that can check availability, book tables, handle cancellations, and send confirmation messages.")}
                    className="w-full text-left p-3 text-sm rounded-lg border border-border hover-elevate transition-smooth"
                    data-testid="example-restaurant"
                  >
                    <span className="font-medium text-foreground">Restaurant Reservations</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Booking and management system
                    </p>
                  </button>

                  <button
                    onClick={() => setPrompt("Build a lead qualification agent for a SaaS company that asks about company size, budget, timeline, and pain points before routing qualified leads to sales.")}
                    className="w-full text-left p-3 text-sm rounded-lg border border-border hover-elevate transition-smooth"
                    data-testid="example-sales"
                  >
                    <span className="font-medium text-foreground">Sales Qualification</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lead scoring and routing
                    </p>
                  </button>

                  <button
                    onClick={() => setPrompt("Create an appointment reminder agent that calls patients 24 hours before their appointment, confirms attendance, and offers rescheduling options.")}
                    className="w-full text-left p-3 text-sm rounded-lg border border-border hover-elevate transition-smooth"
                    data-testid="example-healthcare"
                  >
                    <span className="font-medium text-foreground">Healthcare Reminders</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      Automated patient engagement
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">1.</span>
                    <span>Describe your agent's purpose and behavior</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">2.</span>
                    <span>AI generates conversation flow and logic</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">3.</span>
                    <span>Review and customize the generated flow</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-primary">4.</span>
                    <span>Deploy and start handling calls</span>
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
