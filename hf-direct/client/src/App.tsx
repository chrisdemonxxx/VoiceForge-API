import { Switch, Route, useRoute } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard-connected";
import RealTimeLab from "@/pages/realtime-lab";
import VoiceLibrary from "@/pages/voice-library";
import CloneVoice from "@/pages/clone-voice";
import VoiceDesign from "@/pages/voice-design";
import AgentFlows from "@/pages/agent-flows";
import AgentFlowsCreate from "@/pages/agent-flows-create";
import AgentFlowsAIBuilder from "@/pages/agent-flows-ai-builder";
import AgentFlowBuilder from "@/pages/agent-flow-builder";
import Playground from "@/pages/playground";
import PlaygroundConsole from "@/pages/playground-console";
import TelephonyDialer from "@/pages/telephony-dialer";
import TelephonyBatch from "@/pages/telephony-batch";
import TelephonyProviders from "@/pages/telephony-providers";
import ApiKeys from "@/pages/api-keys";
import Usage from "@/pages/usage";
import NotFound from "@/pages/not-found";

function AppLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 p-3 border-b border-border">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">VoiceForge API Platform</span>
            </div>
          </header>
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const [isHome] = useRoute("/");

  // Home page without sidebar layout
  if (isHome) {
    return <Home />;
  }

  // All other pages with sidebar layout
  return (
    <AppLayout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/voice-library" component={VoiceLibrary} />
        <Route path="/clone-voice" component={CloneVoice} />
        <Route path="/voice-design" component={VoiceDesign} />
        <Route path="/agent-flows" component={AgentFlows} />
        <Route path="/agent-flows/create" component={AgentFlowsCreate} />
        <Route path="/agent-flows/ai-builder" component={AgentFlowsAIBuilder} />
        <Route path="/agent-flows/builder/:id" component={AgentFlowBuilder} />
        <Route path="/playground" component={Playground} />
        <Route path="/playground/console" component={PlaygroundConsole} />
        <Route path="/telephony/dialer" component={TelephonyDialer} />
        <Route path="/telephony/batch" component={TelephonyBatch} />
        <Route path="/telephony/providers" component={TelephonyProviders} />
        <Route path="/api-keys" component={ApiKeys} />
        <Route path="/usage" component={Usage} />
        <Route path="/realtime" component={RealTimeLab} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
