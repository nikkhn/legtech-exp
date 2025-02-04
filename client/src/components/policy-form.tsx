import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { UseFormReturn } from "react-hook-form";
import type { PolicyBrief } from "@db/schema";
import { useEffect } from "react";

interface PolicyFormProps {
  form: UseFormReturn<PolicyBrief>;
  onSubmit: (data: PolicyBrief) => Promise<void>;
  currentSection: number;
  setCurrentSection: (section: number) => void;
  sections: Array<{
    title: string;
    field: keyof PolicyBrief;
    description: string;
  }>;
  isLoading: boolean;
  existingBrief?: PolicyBrief;
}

export function PolicyForm({
  form,
  onSubmit,
  currentSection,
  setCurrentSection,
  sections,
  isLoading,
  existingBrief
}: PolicyFormProps) {
  useEffect(() => {
    if (existingBrief) {
      form.reset(existingBrief);
    }
  }, [existingBrief, form]);

  const currentField = sections[currentSection];

  const next = async () => {
    if (currentSection < sections.length - 1) {
      const isValid = await form.trigger(currentField.field);
      if (isValid) {
        setCurrentSection(currentSection + 1);
      }
    }
  };

  const prev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const isLastSection = currentSection === sections.length - 1;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex gap-4 mb-8 flex-wrap">
          {sections.map((section, index) => (
            <Button
              key={section.field}
              variant={currentSection === index ? "default" : "outline"}
              onClick={() => setCurrentSection(index)}
              type="button"
            >
              {index + 1}. {section.title}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{sections[currentSection].title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {sections[currentSection].description}
            </p>
            {currentField.field === "title" ? (
              <Input
                {...form.register(currentField.field)}
                placeholder="Enter the brief title"
              />
            ) : (
              <Textarea
                {...form.register(currentField.field)}
                className="min-h-[200px]"
                placeholder={`Enter ${currentField.title.toLowerCase()}`}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prev}
              disabled={currentSection === 0}
            >
              Previous
            </Button>
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isLoading}
              >
                Save Progress
              </Button>
              {!isLastSection && (
                <Button
                  type="button"
                  onClick={next}
                >
                  Next
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}