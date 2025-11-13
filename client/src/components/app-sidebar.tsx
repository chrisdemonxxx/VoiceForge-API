import { Link, useLocation } from "wouter";
import {
  Home,
  Mic2,
  Workflow,
  Play,
  Phone,
  Key,
  BarChart3,
  ChevronDown,
  User,
  Wand2,
  Sparkles,
  Zap,
  TestTube2,
  PhoneCall,
  PhoneForwarded,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Voices",
    icon: Mic2,
    items: [
      {
        title: "Voice Library",
        url: "/voice-library",
        icon: User,
      },
      {
        title: "Clone Voice",
        url: "/clone-voice",
        icon: Sparkles,
      },
      {
        title: "Voice Design",
        url: "/voice-design",
        icon: Wand2,
      },
    ],
  },
  {
    title: "Agent Flows",
    icon: Workflow,
    items: [
      {
        title: "All Flows",
        url: "/agent-flows",
        icon: Workflow,
      },
      {
        title: "Create Flow",
        url: "/agent-flows/create",
        icon: Sparkles,
      },
      {
        title: "AI Flow Builder",
        url: "/agent-flows/ai-builder",
        icon: Zap,
      },
    ],
  },
  {
    title: "Playground",
    icon: Play,
    items: [
      {
        title: "Real-time Lab",
        url: "/playground",
        icon: Play,
      },
      {
        title: "Test Console",
        url: "/playground/console",
        icon: TestTube2,
      },
    ],
  },
  {
    title: "Telephony",
    icon: Phone,
    items: [
      {
        title: "Web Dialer",
        url: "/telephony/dialer",
        icon: PhoneCall,
      },
      {
        title: "Batch Calling",
        url: "/telephony/batch",
        icon: PhoneForwarded,
      },
      {
        title: "Provider Settings",
        url: "/telephony/providers",
        icon: Settings,
      },
    ],
  },
  {
    title: "API Keys",
    url: "/api-keys",
    icon: Key,
  },
  {
    title: "Usage & Billing",
    url: "/usage",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActiveRoute = (url: string) => {
    return location === url || location.startsWith(url + "/");
  };

  return (
    <Sidebar collapsible="icon" data-testid="app-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <Mic2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-lg font-semibold text-sidebar-foreground">VoiceForge</span>
            <span className="text-xs text-sidebar-foreground/70">Voice AI Platform</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Single-level menu items
                if (!item.items) {
                  const isActive = isActiveRoute(item.url!);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.title}
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Link href={item.url!}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                // Multi-level menu items with collapsible
                const hasActiveChild = item.items.some((subItem) =>
                  isActiveRoute(subItem.url)
                );

                return (
                  <Collapsible
                    key={item.title}
                    defaultOpen={hasActiveChild}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((subItem) => {
                            const isActive = isActiveRoute(subItem.url);
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive}
                                  data-testid={`nav-${subItem.title.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  <Link href={subItem.url}>
                                    <subItem.icon />
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Quick Stats Section */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>Quick Stats</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-2 px-2 group-data-[collapsible=icon]:hidden">
              <div className="flex items-center justify-between text-sm">
                <span className="text-sidebar-foreground/70">API Calls</span>
                <Badge variant="secondary" className="text-xs">24.5K</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-sidebar-foreground/70">Uptime</span>
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  99.9%
                </Badge>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
