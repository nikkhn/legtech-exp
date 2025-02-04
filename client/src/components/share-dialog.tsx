import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Check } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BriefCollaborator } from "@db/schema";

interface ShareDialogProps {
  briefId: number;
}

export function ShareDialog({ briefId }: ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async (data: { email: string; accessLevel: string }) => {
      const res = await apiRequest(
        "POST",
        `/api/briefs/${briefId}/collaborators`,
        data
      );
      return res.json() as Promise<BriefCollaborator>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/briefs", briefId, "collaborators"] });
      toast({
        title: "Shared successfully",
        description: "An invitation has been sent to the collaborator",
      });
      setEmail("");
    },
  });

  const shareUrl = `${window.location.origin}/brief/${briefId}/view`;

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWithEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      shareMutation.mutate({ email, accessLevel: "viewer" });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Policy Brief</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div>
            <Label>Share Link</Label>
            <div className="flex gap-2 mt-2">
              <Input value={shareUrl} readOnly />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <form onSubmit={shareWithEmail}>
            <Label>Share with Email</Label>
            <div className="flex gap-2 mt-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button type="submit" disabled={!email || shareMutation.isPending}>
                Share
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
