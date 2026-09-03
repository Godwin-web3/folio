import { createFileRoute } from "@tanstack/react-router";
import { HomeFiles } from "@/components/home-files";

export const Route = createFileRoute("/")({ component: HomeFiles });
