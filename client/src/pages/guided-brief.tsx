import { ChatInterface } from "@/components/chat-interface";

export default function GuidedBriefPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">
        AI-Guided Policy Brief Creation
      </h1>
      <p className="text-muted-foreground mb-8">
        Our AI assistant will guide you through creating a comprehensive policy brief by asking targeted questions about your policy idea.
      </p>
      <ChatInterface />
    </div>
  );
}
