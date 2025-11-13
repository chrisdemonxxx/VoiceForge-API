import { Star, Languages, Zap, Heart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ModelInfo } from "@shared/schema";

interface ModelCardProps {
  model: ModelInfo;
  selected?: boolean;
  onSelect?: () => void;
}

export function ModelCard({ model, selected, onSelect }: ModelCardProps) {
  const emotionColors = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    excellent: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover-elevate ${
        selected ? "ring-2 ring-primary" : ""
      }`}
      onClick={onSelect}
      data-testid={`card-model-${model.id}`}
    >
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{model.name}</CardTitle>
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < model.quality
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <CardDescription className="text-sm">{model.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Speed</p>
              <p className="font-medium">{model.speed}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Languages</p>
              <p className="font-medium">{model.languages.length}+</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-xs">
            {model.parameters}
          </Badge>
          {model.voiceCloning && (
            <Badge variant="secondary" className="text-xs">
              Voice Cloning
            </Badge>
          )}
          <Badge variant="secondary" className={`text-xs ${emotionColors[model.emotionalRange]}`}>
            <Heart className="h-3 w-3 mr-1" />
            {model.emotionalRange}
          </Badge>
        </div>

        <div className="pt-2 border-t border-card-border">
          <p className="text-xs text-muted-foreground mb-2">Features</p>
          <ul className="space-y-1">
            {model.features.slice(0, 3).map((feature, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
