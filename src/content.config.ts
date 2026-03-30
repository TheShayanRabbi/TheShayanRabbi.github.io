import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.date(),
    status: z.enum(["live", "building", "archive"]),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    liveUrl: z.url().optional(),
    repoUrl: z.url().optional(),
  }),
});

const writing = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/writing",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.date(),
    category: z.string(),
    readingTime: z.string(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = {
  projects,
  writing,
};
