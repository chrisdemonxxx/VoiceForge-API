import { useState } from "react";
import { Link } from "wouter";
import { Workflow, Plus, Search, Filter, Play, Pause, Trash2, Copy, MoreVertical, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockFlows = [
  {
    id: "1",
    name: "Customer Support Agent",
    description: "Handles customer inquiries with intelligent routing",
    status: "active",
    calls: 1234,
    avgDuration: "3m 45s",
  },
  {
    id: "2",
    name: "Appointment Scheduler",
    description: "Books appointments and sends reminders",
    status: "active",
    calls: 856,
    avgDuration: "2m 12s",
  },
  {
    id: "3",
    name: "Lead Qualification",
    description: "Qualifies leads before routing to sales",
    status: "paused",
    calls: 432,
    avgDuration: "4m 30s",
  },
];

export default function AgentFlows() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Workflow className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Agent Flows</h1>
            </div>
            <p className="text-muted-foreground mt-2">
              Manage and monitor your AI voice agent workflows
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/agent-flows/ai-builder">
              <Button variant="outline" data-testid="button-ai-builder">
                <Workflow className="mr-2 h-4 w-4" />
                AI Builder
              </Button>
            </Link>
            <Link href="/agent-flows/create">
              <Button data-testid="button-create-flow">
                <Plus className="mr-2 h-4 w-4" />
                Create Flow
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Flows</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground mt-1">
                +1 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,522</div>
              <p className="text-xs text-muted-foreground mt-1">
                +15% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Pause className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3m 28s</div>
              <p className="text-xs text-muted-foreground mt-1">
                -12s from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">94.5%</div>
              <p className="text-xs text-muted-foreground mt-1">
                +2.3% from last week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search flows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-flows"
            />
          </div>
          <Button variant="outline" data-testid="button-filter">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Flows List */}
        <div className="space-y-4">
          {mockFlows.map((flow) => (
            <Card key={flow.id} className="hover-elevate" data-testid={`card-flow-${flow.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-xl">{flow.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={
                          flow.status === "active"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        }
                      >
                        {flow.status}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">{flow.description}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-menu-${flow.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Link href={`/agent-flows/builder/${flow.id}`}>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Flow
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem>
                        <Play className="mr-2 h-4 w-4" />
                        Start
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Calls:</span>{" "}
                    <span className="font-medium">{flow.calls.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Duration:</span>{" "}
                    <span className="font-medium">{flow.avgDuration}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
