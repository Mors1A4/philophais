import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export function BrowseGutenbergCard() {
    return (
        <Link href="/library/browse" className="block group">
            <Card className="overflow-hidden transition-all duration-300 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1 h-full">
                <CardContent className="p-0 h-full">
                    <div className="aspect-[2/3] w-full overflow-hidden flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border group-hover:border-primary transition-colors duration-300">
                       <div className="flex flex-col items-center justify-center text-center p-4">
                            <Plus className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                            <h3 className="font-headline font-bold mt-4 text-muted-foreground group-hover:text-primary transition-colors duration-300">Browse Gutenberg</h3>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
