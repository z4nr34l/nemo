import { z } from "zod";

export const newsletterSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

export type NewsletterFormData = z.infer<typeof newsletterSchema>;
