"use client";

import { Languages } from "lucide-react";
import { useState } from "react";

import { greetingAt, GREETINGS, nextGreetingIndex } from "@/domain/greeting";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type GreetingCardProps = {
  buildInfo: {
    environment: "local" | "preview" | "production";
    commit: string | null;
  };
};

export function GreetingCard({ buildInfo }: GreetingCardProps) {
  const [index, setIndex] = useState(0);
  const greeting = greetingAt(index);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardDescription>{greeting.language}</CardDescription>
          <Badge
            variant={
              buildInfo.environment === "production" ? "default" : "secondary"
            }
          >
            {buildInfo.environment}
            {buildInfo.commit ? ` · ${buildInfo.commit}` : ""}
          </Badge>
        </div>
        <CardTitle className="text-4xl tracking-tight">
          {greeting.text}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          First app in the <span className="font-medium">ideation</span>{" "}
          workspace — Next.js, shadcn/ui, and a four-layer architecture.
        </p>
      </CardContent>
      <CardFooter className="justify-between">
        <Button onClick={() => setIndex(nextGreetingIndex(index))}>
          <Languages className="size-4" />
          Next language
        </Button>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {GREETINGS.length}
        </span>
      </CardFooter>
    </Card>
  );
}
