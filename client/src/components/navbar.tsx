import { Plane } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";

export function Navbar() {
  const scrollToPlanner = () => {
    const plannerSection = document.getElementById("trip-planner");
    if (plannerSection) {
      plannerSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/90 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground">
              <Plane className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold text-foreground">TravelAI</h1>
              <p className="text-xs text-muted-foreground">Powered by AI</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="default"
              onClick={scrollToPlanner}
              className="bg-accent hover:bg-accent text-accent-foreground border-accent-border hidden sm:inline-flex"
              data-testid="button-start-planning"
            >
              Start Planning
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
