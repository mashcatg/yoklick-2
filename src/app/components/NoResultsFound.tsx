import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface NoResultsFoundProps {
  searchTerm?: string;
  onClearSearch?: () => void;
}

export default function NoResultsFound({ searchTerm, onClearSearch }: NoResultsFoundProps) {
  return (
    <div className="text-center py-12">
      <div className="max-w-md mx-auto">
        <div className="w-24 h-24 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
          <Search className="w-12 h-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No results found</h3>
        <p className="text-muted-foreground mb-6">
          {searchTerm 
            ? `No results found for "${searchTerm}". Try different keywords or check your spelling.`
            : "No results match your search criteria."}
        </p>
        {onClearSearch && (
          <Button 
            variant="outline"
            onClick={onClearSearch}
          >
            Clear Search
          </Button>
        )}
      </div>
    </div>
  );
} 