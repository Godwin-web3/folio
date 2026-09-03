export async function draftWithModel(input: {
  tenant: string;
  address: string;
  inbox: string;
  owner: string;
  violations: string[];
  noticeLabel: string;
  deadlineOn: string | null;
}): Promise<{ subject: string; body: string } | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Draft a short, firm Chicago tenant demand. JSON keys: subject, body. Cite city violations. Ask for a dated repair commitment in writing. Do not claim to be a lawyer.",
          },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { subject?: string; body?: string };
    if (!parsed.body) return null;
    return {
      subject: parsed.subject || `Written demand — ${input.address}`,
      body: parsed.body,
    };
  } catch {
    return null;
  }
}
