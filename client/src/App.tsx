import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import BriefEditor from "@/pages/brief-editor";
import BriefViewer from "@/pages/brief-viewer";
import GuidedBrief from "@/pages/guided-brief";

function Router() {
  return (
    <Switch>
      <Route path="/" component={GuidedBrief} />
      <Route path="/brief/:id" component={BriefEditor} />
      <Route path="/brief/:id/view" component={BriefViewer} />
      <Route path="/drafts" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;