import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <ShieldX className="size-16 text-destructive" />
      <h1 className="text-2xl font-bold">Access Denied</h1>
      <p className="text-muted-foreground">
        You do not have permission to access the admin dashboard.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">Back to Login</Link>
      </Button>
    </div>
  );
}
