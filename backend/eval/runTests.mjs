// Usage (Node 18+):
//   TOKEN=<jwt of a TEST user> GROQ_API_KEY=<key> RUN_LABEL="gpt-oss-20b / prompt-v1" node runTests.mjs
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = process.env.TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const JUDGE_MODEL = process.env.JUDGE_MODEL || "openai/gpt-oss-120b";
const LABEL = process.env.RUN_LABEL || "unlabeled";
const TEST_DATE = process.env.TEST_DATE;
if (!TOKEN) {
  console.error("Set TOKEN to a JWT for a test user.");
  process.exit(1);
}

// EDIT THIS to match what your /api/agent/chat route returns.
// It must give back the reply text and the names of the tools called.
function parseResponse(data) {
  return {
    reply: data.reply ?? data.message ?? "",
    toolCalls: data.toolCalls ?? [],
  };
}
if (!TEST_DATE) {
  console.error("Set TEST_DATE to a non-Sunday date that has trips.");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function chat(messages) {
  const res = await fetch(`${BASE_URL}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return parseResponse(await res.json());
}

async function judge(conversation, reply, questions) {
  const prompt =
    `You are grading a bus-booking chatbot.\n\nConversation:\n${conversation}\n\n` +
    `Answer each question with only "yes" or "no". Return a JSON array of strings, nothing else.\n\n` +
    questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: JUDGE_MODEL,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "[]";
  let arr = [];
  try {
    arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
  } catch {}
  return questions.map((_, i) => String(arr[i]).toLowerCase().startsWith("y"));
}

const tests = JSON.parse(fs.readFileSync("tests.json", "utf8"));
const results = [];
let passed = 0;
let total = 0;

for (const t of tests) {
  const messages = [];
  const tools = [];
  let reply = "";
  const checks = [];

  try {
    for (const turn of t.turns) {
      messages.push({ role: "user", content: turn });
      const r = await chat(messages);
      reply = r.reply;
      tools.push(...r.toolCalls.map((c) => c.name ?? c));
      messages.push({ role: "assistant", content: reply });
      await sleep(500);
    }

    for (const n of t.expectTools ?? [])
      checks.push({ label: `called ${n}`, pass: tools.includes(n) });
    for (const n of t.forbidTools ?? [])
      checks.push({ label: `did NOT call ${n}`, pass: !tools.includes(n) });
    for (const s of t.mustInclude ?? [])
      checks.push({
        label: `reply includes "${s}"`,
        pass: reply.toLowerCase().includes(s.toLowerCase()),
      });
    for (const s of t.mustNotInclude ?? [])
      checks.push({
        label: `reply does not include "${s}"`,
        pass: !reply.toLowerCase().includes(s.toLowerCase()),
      });

    if (t.judge?.length && GROQ_KEY) {
      const conv = messages.map((m) => `${m.role}: ${m.content}`).join("\n");
      const verdicts = await judge(conv, reply, t.judge);
      t.judge.forEach((q, i) => checks.push({ label: q, pass: verdicts[i] }));
    }
  } catch (e) {
    checks.push({ label: `request failed: ${e.message}`, pass: false });
  }

  const ok = checks.filter((c) => c.pass).length;
  passed += ok;
  total += checks.length;
  console.log(`\n[${t.id}] ${ok}/${checks.length}`);
  checks
    .filter((c) => !c.pass)
    .forEach((c) => console.log(`  FAIL: ${c.label}`));
  if (ok < checks.length) console.log(`  reply: ${reply.slice(0, 200)}`);

  results.push({ id: t.id, tools, reply, checks });
}

console.log(
  `\nScore: ${passed}/${total} (${Math.round((100 * passed) / total)}%)  [${LABEL}]`,
);

fs.mkdirSync("results", { recursive: true });
const file = `results/${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(
  file,
  JSON.stringify({ label: LABEL, passed, total, results }, null, 2),
);
console.log(`Saved ${file}`);
