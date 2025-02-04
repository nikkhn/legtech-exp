import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PolicyForm } from "@/components/policy-form";
import { briefSections } from "@/lib/brief-sections";
import type { PolicyBrief } from "@db/schema";
import { useParams, useLocation } from "wouter";

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
        setLocation(`/brief/${savedBrief.id}`);
      }
      toast({
        title: "Success",
        description: "Brief saved successfully"
      });
    }
  });

  if (isLoading && id !== "new") {
    return <div>Loading...</div>;
  }

  const onSubmit = async (data: PolicyBrief) => {
    await saveMutation.mutateAsync(data);
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
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
