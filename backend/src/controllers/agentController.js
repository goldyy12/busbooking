import { searchTripsCore, getTripByIdCore } from "../services/tripService.js";
import { bookTripCore } from "../services/bookingService.js";

const MODEL = "openai/gpt-oss-20b";
const MAX_STEPS = 8;
const MAX_SEATS_PER_BOOKING = 6;

const tools = [
  {
    type: "function",
    function: {
      name: "search_trips",
      description:
        "Search available bus trips by origin, destination, and date",
      parameters: {
        type: "object",
        properties: {
          origin: { type: "string", description: "Departure city" },
          destination: { type: "string", description: "Arrival city" },
          date: { type: "string", description: "Date in YYYY-MM-DD format" },
        },
        required: ["origin", "destination"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_trip_details",
      description:
        "Get full details (including price and availability) for a specific trip by its ID",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "number", description: "The trip ID to look up" },
        },
        required: ["tripId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_trip",
      description:
        "Book a seat on a specific trip, once the trip and price have been confirmed with the user.",
      parameters: {
        type: "object",
        properties: {
          tripId: { type: "number", description: "The ID of the trip to book" },
          seats: {
            type: "array",
            items: { type: "number" },
            description: "Seat numbers to reserve",
          },
        },
        required: ["tripId", "seats"],
      },
    },
  },
];

const buildSystemPrompt = (
  today,
) => `You are a bus booking assistant for a Kosovo bus service. Today's date is ${today}.

Rules:
- Use get_trip_details to check a trip's price before asking the user for confirmation.
- Once the user has seen the price and clearly agrees (for example "yes", "proceed", "confirm"), call book_trip immediately. Do not call get_trip_details again and do not ask for confirmation a second time.
- After the booking succeeds, ask whether the user wants a return ticket. If yes, ask for the return date, search for return trips, show the price, and ask for confirmation before booking the return trip.
- If no return trip is found on that date, tell the user that no return trips are available on that date and continue with the original booking.
- Payment can be made in person or on the website.
- Buses do not operate on Sundays.
- If asked about the website, explain that it is a bus booking service for Kosovo and mention Kosovo cities.
- Keep a professional tone. Do not use emojis.
-If the user says thank you say "You're welcome!" and offer further assistance if not say have a nice trip.`;

// Server-side guard: the model may only book after the latest user message is an affirmative.
const AFFIRMATIVE =
  /\b(yes|yeah|yep|ok|okay|sure|proceed|confirm|confirmed|book it|go ahead|please do|po|prano|konfirmo|vazhdo|në rregull|ne rregull)\b/i;

const userConfirmed = (messages) => {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  return Boolean(lastUser && AFFIRMATIVE.test(lastUser.content));
};

const executeTool = async (toolCall, { userId, safeMessages }) => {
  const name = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments || "{}");

  if (name === "search_trips") {
    const results = await searchTripsCore({
      from: args.origin,
      to: args.destination,
      date: args.date,
    });
    return results.length ? results : { message: "No trips found." };
  }

  if (name === "get_trip_details") {
    if (!Number.isInteger(args.tripId)) throw new Error("Invalid tripId");
    return await getTripByIdCore(args.tripId);
  }

  if (name === "book_trip") {
    if (!Number.isInteger(args.tripId)) throw new Error("Invalid tripId");
    if (
      !Array.isArray(args.seats) ||
      args.seats.length === 0 ||
      args.seats.length > MAX_SEATS_PER_BOOKING ||
      !args.seats.every((s) => Number.isInteger(s) && s > 0)
    ) {
      throw new Error("Invalid seats");
    }
    if (!userConfirmed(safeMessages)) {
      return {
        error:
          "The user has not confirmed the booking yet. Show the price and ask for confirmation first.",
      };
    }
    const result = await bookTripCore({
      tripId: args.tripId,
      seats: args.seats,
      userId,
    });
    console.log("BOOK_TRIP SUCCEEDED", result);
    return result;
  }

  return { error: `Unknown tool: ${name}` };
};

export const handleAgentChat = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split("T")[0];

    // Only accept plain user/assistant text from the client.
    const safeMessages = (req.body.messages ?? []).filter(
      (m) =>
        ["user", "assistant"].includes(m.role) && typeof m.content === "string",
    );

    if (safeMessages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const messages = [
      { role: "system", content: buildSystemPrompt(today) },
      ...safeMessages,
    ];

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({ model: MODEL, tools, messages }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.choices) {
        console.error("Groq API error:", data);
        return res.status(502).json({ error: "Upstream model error" });
      }

      const message = data.choices[0].message;

      if (!message.tool_calls?.length) {
        return res.status(200).json({ reply: message.content });
      }

      messages.push(message); // record the assistant's tool-call turn

      for (const toolCall of message.tool_calls) {
        let toolResultContent;
        try {
          const result = await executeTool(toolCall, { userId, safeMessages });
          toolResultContent = JSON.stringify(result);
        } catch (err) {
          console.error(`Tool ${toolCall.function.name} failed:`, err);
          toolResultContent = JSON.stringify({ error: err.message });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResultContent,
        });
      }
    }

    res.status(200).json({ reply: "Sorry, I couldn't complete that request." });
  } catch (error) {
    next(error);
  }
};
