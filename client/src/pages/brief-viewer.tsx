import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import type { PolicyBrief } from "@db/schema";
import { briefSections } from "@/lib/brief-sections";

export default function BriefViewer() {
  const { id } = useParams<{ id: string }>();
  
  const { data: brief, isLoading } = useQuery<PolicyBrief>({
    queryKey: ['/api/briefs', id],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!brief) {
    return <div>Brief not found</div>;
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">{brief.title}</h1>
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="space-y-8">
          {briefSections.map((section) => (
            <Card key={section.field}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  {brief[section.field]}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
