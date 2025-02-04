import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PolicyForm } from "@/components/policy-form";
import { briefSections } from "@/lib/brief-sections";
import type { PolicyBrief } from "@db/schema";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export default function BriefEditor() {
  const [currentSection, setCurrentSection] = useState(0);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id: string }>();

  const form = useForm<PolicyBrief>({
    defaultValues: {
      title: "",
      executiveSummary: "",
      background: "",
      policyOptions: "",
      recommendations: "",
      implementation: "",
      status: "draft"
    }
  });

  const { data: brief, isLoading } = useQuery<PolicyBrief>({
    queryKey: ["/api/briefs", id],
    enabled: id !== "new"
  });

  const saveMutation = useMutation({
    mutationFn: async (data: PolicyBrief) => {
      const method = id === "new" ? "POST" : "PATCH";
      const url = id === "new" ? "/api/briefs" : `/api/briefs/${id}`;
      const res = await apiRequest(method, url, data);
      return res.json();
    },
    onSuccess: (savedBrief) => {
      if (id === "new") {
        setLocation(`/brief/${savedBrief.id}/view`); // Updated navigation
      }
      toast({
        title: "Success",
        description: "Brief saved successfully"
      });
    }
  });

  const isComplete = briefSections.every(section => 
    form.getValues(section.field)?.trim().length > 0
  );

  if (isLoading && id !== "new") {
    return <div>Loading...</div>;
  }

  const onSubmit = async (data: PolicyBrief) => {
    await saveMutation.mutateAsync(data);
  };

  const viewBrief = () => {
    setLocation(`/brief/${id}/view`);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        {isComplete && (
          <div className="mb-8">
            <Button
              onClick={viewBrief}
              variant="outline"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              View Complete Brief
            </Button>
          </div>
        )}
        <PolicyForm 
          form={form}
          onSubmit={onSubmit}
          currentSection={currentSection}
          setCurrentSection={setCurrentSection}
          sections={briefSections}
          isLoading={saveMutation.isPending}
          existingBrief={brief}
        />
      </div>
    </div>
  );
}