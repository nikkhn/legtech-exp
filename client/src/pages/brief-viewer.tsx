import { useQuery, QueryClient } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareDialog } from "@/components/share-dialog";
import { useEffect, useState } from "react";
import type { PolicyBrief, BriefComment } from "@db/schema";
import { briefSections } from "@/lib/brief-sections";

const queryClient = new QueryClient(); // Initialize QueryClient

export default function BriefViewer() {
  const { id } = useParams<{ id: string }>();
  const [ws, setWs] = useState<WebSocket | null>(null);

  const { data: brief, isLoading } = useQuery<PolicyBrief>({
    queryKey: ['/api/briefs', id],
    queryClient: queryClient
  });

  const { data: comments = [] } = useQuery<BriefComment[]>({
    queryKey: ['/api/briefs', id, 'comments'],
    queryClient: queryClient
  });

  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected");
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === "update") {
        // Trigger a refetch when the brief is updated
        queryClient.invalidateQueries({ queryKey: ['/api/briefs', id] });
      } else if (update.type === "comment") {
        // Add new comment to the list
        queryClient.invalidateQueries({ queryKey: ['/api/briefs', id, 'comments'] });
      }
    };

    return () => {
      socket.close();
    };
  }, [id]);

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
          <ShareDialog briefId={parseInt(id)} />
        </div>

        <div className="space-y-8">
          {briefSections.map((section) => {
            const sectionComments = comments.filter(
              (comment) => comment.section === section.field
            );

            return (
              <Card key={section.field}>
                <CardHeader>
                  <CardTitle>{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    {brief[section.field]}
                  </div>
                  {sectionComments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Comments
                      </h4>
                      {sectionComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="bg-muted p-3 rounded-lg text-sm"
                        >
                          <div className="flex justify-between">
                            <span className="font-medium">{comment.email}</span>
                            <span className="text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}