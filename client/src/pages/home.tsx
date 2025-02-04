import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[400px] bg-gradient-to-b from-primary/90 to-primary">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1573181759662-1c146525b21f")' }}
        />
        <div className="container mx-auto px-4 py-20 relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Policy Brief Builder
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            A guided tool to help congressional staffers create comprehensive and effective policy briefs
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Start New Brief</h2>
              <p className="text-muted-foreground mb-6">
                Create a new policy brief from scratch with our guided step-by-step process.
              </p>
              <Link href="/brief/new">
                <Button size="lg">Create New Brief</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div 
                className="absolute right-6 top-6 w-20 h-20 bg-cover rounded-lg opacity-20"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1454165804606-c3d57bc86b40")' }}
              />
              <h2 className="text-2xl font-semibold mb-4">Why Use This Tool?</h2>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Structured approach to policy writing</li>
                <li>• Professional formatting</li>
                <li>• Save and resume drafts</li>
                <li>• Export to PDF</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
