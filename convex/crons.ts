import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "folio scheduled reminders",
  { hourUTC: 14, minuteUTC: 0 },
  internal.reminders.processDue,
);

export default crons;
