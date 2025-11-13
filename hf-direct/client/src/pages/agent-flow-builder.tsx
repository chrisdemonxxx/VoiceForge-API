import { useCallback, useState, useRef, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  EdgeProps,
  NodeProps,
  MarkerType,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  Save,
  Play,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Upload,
  LayoutGrid,
  Trash2,
  Copy,
  Settings,
  Bot,
  Wrench,
  Users,
  Phone,
  StopCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import type { AgentFlow, FlowNode as FlowNodeType, FlowEdge as FlowEdgeType } from "@shared/schema";

// Custom Node Components
function SubagentNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all ${
        selected
          ? "border-primary shadow-lg"
          : "border-purple-200 dark:border-purple-800"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.9) 0%, rgba(124, 58, 237, 0.9) 100%)",
      }}
      data-testid={`node-subagent-${data.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-4 w-4 text-white" />
        <span className="font-semibold text-white text-sm">{data.label || "Subagent"}</span>
      </div>
      <p className="text-xs text-white/80 line-clamp-2">
        {data.systemPrompt || "Configure system prompt..."}
      </p>
    </div>
  );
}

function ToolNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all ${
        selected
          ? "border-primary shadow-lg"
          : "border-blue-200 dark:border-blue-800"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%)",
      }}
      data-testid={`node-tool-${data.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Wrench className="h-4 w-4 text-white" />
        <span className="font-semibold text-white text-sm">{data.label || "Tool"}</span>
      </div>
      <p className="text-xs text-white/80">
        {data.toolName || "Select tool..."}
      </p>
    </div>
  );
}

function AgentTransferNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all ${
        selected
          ? "border-primary shadow-lg"
          : "border-green-200 dark:border-green-800"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(34, 197, 94, 0.9) 0%, rgba(22, 163, 74, 0.9) 100%)",
      }}
      data-testid={`node-agent-transfer-${data.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-white" />
        <span className="font-semibold text-white text-sm">{data.label || "Agent Transfer"}</span>
      </div>
      <p className="text-xs text-white/80">
        {data.targetAgentId || "Select target agent..."}
      </p>
    </div>
  );
}

function PhoneTransferNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all ${
        selected
          ? "border-primary shadow-lg"
          : "border-yellow-200 dark:border-yellow-800"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(234, 179, 8, 0.9) 0%, rgba(202, 138, 4, 0.9) 100%)",
      }}
      data-testid={`node-phone-transfer-${data.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Phone className="h-4 w-4 text-white" />
        <span className="font-semibold text-white text-sm">{data.label || "Phone Transfer"}</span>
      </div>
      <p className="text-xs text-white/80">
        {data.phoneNumber || "Enter phone number..."}
      </p>
    </div>
  );
}

function EndCallNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] transition-all ${
        selected
          ? "border-primary shadow-lg"
          : "border-red-200 dark:border-red-800"
      }`}
      style={{
        background: "linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)",
      }}
      data-testid={`node-end-call-${data.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <StopCircle className="h-4 w-4 text-white" />
        <span className="font-semibold text-white text-sm">{data.label || "End Call"}</span>
      </div>
      <p className="text-xs text-white/80">
        {data.message || "Goodbye message..."}
      </p>
    </div>
  );
}

const nodeTypes = {
  subagent: SubagentNode,
  tool: ToolNode,
  agent_transfer: AgentTransferNode,
  phone_transfer: PhoneTransferNode,
  end_call: EndCallNode,
};

// Node Palette Component
function NodePalette({ onDragStart }: { onDragStart: (nodeType: string, label: string) => void }) {
  const nodeTemplates = [
    {
      type: "subagent",
      icon: Bot,
      label: "Subagent",
      description: "Modify agent behavior at conversation points",
      gradient: "from-purple-500 to-purple-700",
    },
    {
      type: "tool",
      icon: Wrench,
      label: "Tool",
      description: "Execute specific actions",
      gradient: "from-blue-500 to-blue-700",
    },
    {
      type: "agent_transfer",
      icon: Users,
      label: "Agent Transfer",
      description: "Hand off to different AI agents",
      gradient: "from-green-500 to-green-700",
    },
    {
      type: "phone_transfer",
      icon: Phone,
      label: "Phone Transfer",
      description: "Transfer to human via phone",
      gradient: "from-yellow-500 to-yellow-700",
    },
    {
      type: "end_call",
      icon: StopCircle,
      label: "End Call",
      description: "Terminate conversation",
      gradient: "from-red-500 to-red-700",
    },
  ];

  return (
    <div className="w-64 border-r border-border bg-card p-4 space-y-4 overflow-y-auto">
      <div>
        <h3 className="font-semibold text-sm mb-1">Node Palette</h3>
        <p className="text-xs text-muted-foreground">Drag nodes to the canvas</p>
      </div>
      <Separator />
      <div className="space-y-3">
        {nodeTemplates.map((template) => {
          const Icon = template.icon;
          return (
            <Card
              key={template.type}
              className="hover-elevate cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={(e) => {
                onDragStart(template.type, template.label);
                e.dataTransfer.effectAllowed = "move";
              }}
              data-testid={`palette-node-${template.type}`}
            >
              <CardHeader className="p-3 space-y-0">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-gradient-to-br ${template.gradient}`}>
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <CardTitle className="text-sm">{template.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <p className="text-xs text-muted-foreground">{template.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Configuration Panel Component
function ConfigurationPanel({
  selectedNode,
  onUpdateNode,
}: {
  selectedNode: Node | null;
  onUpdateNode: (id: string, data: any) => void;
}) {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-border bg-card p-4">
        <div className="text-center text-muted-foreground text-sm py-8">
          Select a node to configure
        </div>
      </div>
    );
  }

  const updateData = (field: string, value: any) => {
    onUpdateNode(selectedNode.id, {
      ...selectedNode.data,
      [field]: value,
    });
  };

  return (
    <div className="w-80 border-l border-border bg-card p-4 space-y-4 overflow-y-auto">
      <div>
        <h3 className="font-semibold text-sm mb-1">Node Configuration</h3>
        <Badge variant="secondary">{selectedNode.type}</Badge>
      </div>
      <Separator />

      {selectedNode.type === "subagent" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label || ""}
              onChange={(e) => updateData("label", e.target.value)}
              data-testid="input-label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="systemPrompt">System Prompt</Label>
            <Textarea
              id="systemPrompt"
              value={selectedNode.data.systemPrompt || ""}
              onChange={(e) => updateData("systemPrompt", e.target.value)}
              rows={6}
              data-testid="input-system-prompt"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tools">Tools (comma-separated)</Label>
            <Input
              id="tools"
              value={selectedNode.data.tools?.join(", ") || ""}
              onChange={(e) => updateData("tools", e.target.value.split(",").map((t: string) => t.trim()))}
              placeholder="tool1, tool2, tool3"
              data-testid="input-tools"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="turnEagerness">Turn Eagerness: {selectedNode.data.turnEagerness || 0.5}</Label>
            <Slider
              id="turnEagerness"
              value={[selectedNode.data.turnEagerness || 0.5]}
              onValueChange={(value) => updateData("turnEagerness", value[0])}
              min={0}
              max={1}
              step={0.1}
              data-testid="slider-turn-eagerness"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeout">Timeout (seconds)</Label>
            <Input
              id="timeout"
              type="number"
              value={selectedNode.data.timeout || ""}
              onChange={(e) => updateData("timeout", parseInt(e.target.value) || 0)}
              data-testid="input-timeout"
            />
          </div>
        </div>
      )}

      {selectedNode.type === "tool" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label || ""}
              onChange={(e) => updateData("label", e.target.value)}
              data-testid="input-label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="toolName">Tool Name</Label>
            <Select
              value={selectedNode.data.toolName || ""}
              onValueChange={(value) => updateData("toolName", value)}
            >
              <SelectTrigger data-testid="select-tool-name">
                <SelectValue placeholder="Select tool" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="database_lookup">Database Lookup</SelectItem>
                <SelectItem value="api_call">API Call</SelectItem>
                <SelectItem value="send_email">Send Email</SelectItem>
                <SelectItem value="send_sms">Send SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="parameters">Parameters (JSON)</Label>
            <Textarea
              id="parameters"
              value={JSON.stringify(selectedNode.data.parameters || {}, null, 2)}
              onChange={(e) => {
                try {
                  updateData("parameters", JSON.parse(e.target.value));
                } catch (error) {
                  // Invalid JSON, ignore
                }
              }}
              rows={4}
              className="font-mono text-xs"
              data-testid="input-parameters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onSuccess">On Success (Node ID)</Label>
            <Input
              id="onSuccess"
              value={selectedNode.data.onSuccess || ""}
              onChange={(e) => updateData("onSuccess", e.target.value)}
              data-testid="input-on-success"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="onFailure">On Failure (Node ID)</Label>
            <Input
              id="onFailure"
              value={selectedNode.data.onFailure || ""}
              onChange={(e) => updateData("onFailure", e.target.value)}
              data-testid="input-on-failure"
            />
          </div>
        </div>
      )}

      {selectedNode.type === "agent_transfer" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label || ""}
              onChange={(e) => updateData("label", e.target.value)}
              data-testid="input-label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetAgentId">Target Agent ID</Label>
            <Input
              id="targetAgentId"
              value={selectedNode.data.targetAgentId || ""}
              onChange={(e) => updateData("targetAgentId", e.target.value)}
              data-testid="input-target-agent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="context">Context</Label>
            <Textarea
              id="context"
              value={selectedNode.data.context || ""}
              onChange={(e) => updateData("context", e.target.value)}
              rows={4}
              data-testid="input-context"
            />
          </div>
        </div>
      )}

      {selectedNode.type === "phone_transfer" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label || ""}
              onChange={(e) => updateData("label", e.target.value)}
              data-testid="input-label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={selectedNode.data.phoneNumber || ""}
              onChange={(e) => updateData("phoneNumber", e.target.value)}
              placeholder="+1234567890"
              data-testid="input-phone-number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Transfer Message</Label>
            <Textarea
              id="message"
              value={selectedNode.data.message || ""}
              onChange={(e) => updateData("message", e.target.value)}
              rows={3}
              data-testid="input-message"
            />
          </div>
        </div>
      )}

      {selectedNode.type === "end_call" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={selectedNode.data.label || ""}
              onChange={(e) => updateData("label", e.target.value)}
              data-testid="input-label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Goodbye Message</Label>
            <Textarea
              id="message"
              value={selectedNode.data.message || ""}
              onChange={(e) => updateData("message", e.target.value)}
              rows={3}
              data-testid="input-message"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="saveTranscript"
              checked={selectedNode.data.saveTranscript !== false}
              onCheckedChange={(checked) => updateData("saveTranscript", checked)}
              data-testid="switch-save-transcript"
            />
            <Label htmlFor="saveTranscript">Save Transcript</Label>
          </div>
        </div>
      )}
    </div>
  );
}

// Main Flow Builder Component
function FlowBuilderInner() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const draggedNodeType = useRef<string | null>(null);
  const draggedNodeLabel = useRef<string | null>(null);

  // Fetch flow data
  const { data: flow, isLoading } = useQuery<AgentFlow>({
    queryKey: ["/api/agent-flows", id],
    enabled: !!id,
  });

  // Fetch flow nodes and edges
  useQuery<FlowNodeType[]>({
    queryKey: ["/api/agent-flows", id, "nodes"],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(`/api/agent-flows/${id}/nodes`);
      if (!response.ok) throw new Error("Failed to fetch nodes");
      const data = await response.json();
      
      // Convert to React Flow format
      const flowNodes = data.map((node: FlowNodeType) => ({
        id: node.id,
        type: node.type,
        position: node.position as { x: number; y: number },
        data: { ...(node.data as any), id: node.id },
      }));
      
      setNodes(flowNodes);
      return data;
    },
  });

  useQuery<FlowEdgeType[]>({
    queryKey: ["/api/agent-flows", id, "edges"],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch(`/api/agent-flows/${id}/edges`);
      if (!response.ok) throw new Error("Failed to fetch edges");
      const data = await response.json();
      
      // Convert to React Flow format
      const flowEdges = data.map((edge: FlowEdgeType) => ({
        id: edge.id,
        source: edge.sourceNodeId,
        target: edge.targetNodeId,
        label: edge.label,
        type: edge.type || "default",
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }));
      
      setEdges(flowEdges);
      return data;
    },
  });

  // AI generation mutation
  const aiGenerateMutation = useMutation({
    mutationFn: async (description: string) => {
      const response = await apiRequest("POST", "/api/agent-flows/generate", { description });
      return response;
    },
    onSuccess: (data: any) => {
      // Convert generated nodes to ReactFlow format
      const generatedNodes = data.nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: { ...node.data, id: node.id },
      }));

      // Convert generated edges to ReactFlow format
      const generatedEdges = data.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        type: "smoothstep",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }));

      setNodes(generatedNodes);
      setEdges(generatedEdges);
      setAiDialogOpen(false);
      setAiPrompt("");

      toast({
        title: "Flow generated successfully",
        description: `Created "${data.name}" with ${data.nodes.length} nodes`,
      });

      // Fit view after a short delay to ensure nodes are rendered
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate flow with AI",
        variant: "destructive",
      });
    },
  });

  // Save flow mutation
  const saveFlowMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("No flow ID");
      
      // Save nodes
      await apiRequest(`/api/agent-flows/${id}/nodes`, "POST", {
        nodes: nodes.map((node) => ({
          type: node.type,
          position: node.position,
          data: node.data,
        })),
      });
      
      // Save edges
      await apiRequest(`/api/agent-flows/${id}/edges`, "POST", {
        edges: edges.map((edge) => ({
          sourceNodeId: edge.source,
          targetNodeId: edge.target,
          label: edge.label,
          type: edge.type,
        })),
      });
    },
    onSuccess: () => {
      toast({
        title: "Flow saved",
        description: "Your flow has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent-flows", id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error saving flow",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!draggedNodeType.current) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: `${draggedNodeType.current}-${Date.now()}`,
        type: draggedNodeType.current,
        position,
        data: { label: draggedNodeLabel.current || "New Node", id: `node-${Date.now()}` },
      };

      setNodes((nds) => nds.concat(newNode));
      draggedNodeType.current = null;
      draggedNodeLabel.current = null;
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeDragStart = (nodeType: string, label: string) => {
    draggedNodeType.current = nodeType;
    draggedNodeLabel.current = label;
  };

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onUpdateNode = useCallback(
    (id: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === id) {
            return { ...node, data };
          }
          return node;
        })
      );
      setSelectedNode((node) => (node?.id === id ? { ...node, data } : node));
    },
    [setNodes]
  );

  const onDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  const onDuplicateNode = useCallback(
    (node: Node) => {
      const newNode: Node = {
        ...node,
        id: `${node.type}-${Date.now()}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50,
        },
        data: { ...node.data, id: `node-${Date.now()}` },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes]
  );

  const onFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  const onExportFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
    };
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const exportFileDefaultName = `flow-${id || "export"}.json`;

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();

    toast({
      title: "Flow exported",
      description: "Your flow has been exported as JSON.",
    });
  }, [nodes, edges, id, toast]);

  const onImportFlow = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flowData = JSON.parse(e.target?.result as string);
        setNodes(flowData.nodes || []);
        setEdges(flowData.edges || []);
        toast({
          title: "Flow imported",
          description: "Your flow has been imported successfully.",
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid flow file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading flow...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <NodePalette onDragStart={onNodeDragStart} />
      
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          data-testid="react-flow-canvas"
        >
          <Background variant={BackgroundVariant.Dots} />
          <Controls />
          <MiniMap
            className="!bg-card !border-border"
            nodeColor={(node) => {
              switch (node.type) {
                case "subagent":
                  return "#8b5cf6";
                case "tool":
                  return "#3b82f6";
                case "agent_transfer":
                  return "#22c55e";
                case "phone_transfer":
                  return "#eab308";
                case "end_call":
                  return "#ef4444";
                default:
                  return "#6366f1";
              }
            }}
          />
          
          <Panel position="top-left" className="flex gap-2">
            <Button
              size="sm"
              onClick={() => saveFlowMutation.mutate()}
              disabled={saveFlowMutation.isPending}
              data-testid="button-save-flow"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveFlowMutation.isPending ? "Saving..." : "Save"}
            </Button>
            <Button size="sm" variant="outline" data-testid="button-test-flow">
              <Play className="h-4 w-4 mr-2" />
              Test
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAiDialogOpen(true)}
              data-testid="button-ai-generate"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Generate
            </Button>
          </Panel>

          <Panel position="top-right" className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => reactFlowInstance.zoomIn()}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => reactFlowInstance.zoomOut()}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onFitView}
              data-testid="button-fit-view"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onExportFlow}
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" asChild data-testid="button-import">
              <label>
                <Upload className="h-4 w-4" />
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={onImportFlow}
                />
              </label>
            </Button>
          </Panel>
        </ReactFlow>

        {/* Context Menu for Nodes */}
        {nodes.map((node) => (
          <ContextMenu key={node.id}>
            <ContextMenuTrigger asChild>
              <div />
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onDeleteNode(node.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDuplicateNode(node)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}

        {/* AI Generate Dialog */}
        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent data-testid="dialog-ai-generate">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Flow Generator
              </DialogTitle>
              <DialogDescription>
                Describe your agent flow in natural language and let AI create a complete flow diagram for you.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">Flow Description</Label>
                <Textarea
                  id="ai-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Example: Create a customer support flow that greets the user, asks about their issue, searches the knowledge base for solutions, and transfers to a human agent if no solution is found."
                  rows={6}
                  className="resize-none"
                  data-testid="input-ai-prompt"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    if (aiPrompt.trim()) {
                      aiGenerateMutation.mutate(aiPrompt);
                    }
                  }}
                  disabled={!aiPrompt.trim() || aiGenerateMutation.isPending}
                  data-testid="button-generate"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {aiGenerateMutation.isPending ? "Generating..." : "Generate Flow"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAiDialogOpen(false);
                    setAiPrompt("");
                  }}
                  disabled={aiGenerateMutation.isPending}
                  data-testid="button-cancel-generate"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ConfigurationPanel selectedNode={selectedNode} onUpdateNode={onUpdateNode} />
    </div>
  );
}

export default function AgentFlowBuilder() {
  return (
    <ReactFlowProvider>
      <FlowBuilderInner />
    </ReactFlowProvider>
  );
}
