import { useState } from "react";
import { TestTube2, Play, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function PlaygroundConsole() {
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<Array<{ type: string; message: string; timestamp: string }>>([
    { type: "info", message: "Test console initialized", timestamp: new Date().toISOString() },
  ]);

  const handleRunTest = () => {
    if (!input.trim()) return;

    const timestamp = new Date().toISOString();
    setLogs([
      ...logs,
      { type: "input", message: input, timestamp },
      { type: "success", message: "Test executed successfully", timestamp },
    ]);
    setInput("");
  };

  const handleClearLogs = () => {
    setLogs([{ type: "info", message: "Logs cleared", timestamp: new Date().toISOString() }]);
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TestTube2 className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Test Console</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Test and debug your voice agent flows in a controlled environment
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Input</CardTitle>
                <CardDescription>
                  Enter text to test your agent's responses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Type your test message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="min-h-[200px] resize-none font-mono"
                  data-testid="input-test-message"
                />

                <div className="flex gap-3">
                  <Button
                    onClick={handleRunTest}
                    disabled={!input.trim()}
                    className="flex-1"
                    data-testid="button-run-test"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run Test
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setInput("")}
                    data-testid="button-clear-input"
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Console Logs */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Console Output</CardTitle>
                    <CardDescription>
                      Real-time test execution logs
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClearLogs}
                      data-testid="button-clear-logs"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      data-testid="button-download-logs"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-lg border border-border bg-muted/50 p-4">
                  <div className="space-y-2 font-mono text-xs">
                    {logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            log.type === "error"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : log.type === "success"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : log.type === "input"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : ""
                          }
                        >
                          {log.type}
                        </Badge>
                        <span className="text-muted-foreground flex-1">
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
