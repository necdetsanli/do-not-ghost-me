"use client";

import type { JSX } from "react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { cn } from "@/components/ui/utils";

export default function ContactPage(): JSX.Element {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent): void {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className={cn("container mx-auto px-4 py-12 max-w-2xl")}>
      <header className={cn("mb-12 text-center")}>
        <h1 className={cn("text-4xl font-bold tracking-tight text-primary mb-4")}>
          Contact Us
        </h1>
        <p className={cn("text-lg text-secondary")}>
          Have questions or feedback? We'd love to hear from you.
        </p>
      </header>

      <Card className={cn("p-8")}>
        {submitted ? (
          <div className={cn("text-center space-y-4 py-8")}>
            <div className={cn("text-4xl")}>✉️</div>
            <h2 className={cn("text-2xl font-semibold text-primary")}>Message Sent!</h2>
            <p className={cn("text-secondary")}>
              Thank you for reaching out. We'll get back to you as soon as possible.
            </p>
            <Button 
              variant="secondary" 
              onClick={() => setSubmitted(false)}
              className={cn("mt-4")}
            >
              Send another message
            </Button>
          </div>
        ) : (
          <form className={cn("space-y-6")} onSubmit={handleSubmit}>
            <div className={cn("space-y-2")}>
              <label htmlFor="name" className={cn("text-sm font-medium text-primary")}>
                Name
              </label>
              <input
                id="name"
                type="text"
                className={cn("w-full px-3 py-2 rounded-lg border border-primary bg-surface focus:outline-none focus:ring-2 focus:ring-indigo-500")}
                placeholder="Your name"
                required
              />
            </div>

            <div className={cn("space-y-2")}>
              <label htmlFor="email" className={cn("text-sm font-medium text-primary")}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className={cn("w-full px-3 py-2 rounded-lg border border-primary bg-surface focus:outline-none focus:ring-2 focus:ring-indigo-500")}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className={cn("space-y-2")}>
              <label htmlFor="message" className={cn("text-sm font-medium text-primary")}>
                Message
              </label>
              <textarea
                id="message"
                rows={5}
                className={cn("w-full px-3 py-2 rounded-lg border border-primary bg-surface focus:outline-none focus:ring-2 focus:ring-indigo-500")}
                placeholder="How can we help?"
                required
              ></textarea>
            </div>

            <Button variant="primary" size="lg" className={cn("w-full")} type="submit">
              Send Message
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
