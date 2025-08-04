"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { useMediaQuery } from "usehooks-ts";
import { toast } from "sonner";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export default function FeedbackUI({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to send feedback");
      }

      toast.success("Feedback sent successfully!");
      setFeedback("");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const Content = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 md:p-0">
      <div className="animate-element animate-delay-200">
        <h2 className="text-lg font-semibold">Send Feedback</h2>
      </div>
      <div className="animate-element animate-delay-300">
        <Textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Your feedback..."
          rows={4}
          required
          className="resize-none"
        />
      </div>
      <div className="animate-element animate-delay-400">
        <Button className="w-full" type="submit" disabled={loading || !feedback.trim()}>
          {loading ? "Sending Feedback..." : "Send Feedback"}
        </Button>
      </div>
    </form>
  );

  // Show skeleton or default state until hydrated
  if (!hydrated) {
    return (
      <Button variant="ghost" className={`rounded-md ${className}`}>
        Feedback
      </Button>
    );
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button variant="ghost" className={`rounded-md ${className} bg-none`}>
           Feedback
          </Button>
        </DrawerTrigger>
        <DrawerContent>{Content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={`rounded-md ${className}`}>
         Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogTitle>
          <span className="sr-only">Send Feedback</span>
        </DialogTitle>
        <DialogDescription asChild>
          <VisuallyHidden>Send feedback to help improve the application</VisuallyHidden>
        </DialogDescription>
        {Content}
      </DialogContent>
    </Dialog>
  );
}
