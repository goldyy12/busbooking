import { searchTripsCore, getTripByIdCore } from "../services/tripService.js";
import { bookTripCore } from "../services/bookingService.js";
import prisma from "../../db.js";

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

export const handleAgentChat = async (req, res, next) => {
  try {
    const userMessage = req.body.messages;
    const userId = req.user.id;
    const today = new Date().toISOString().split("T")[0];

    let messages = [
      {
        role: "system",
        content: `You are a bus booking assistant. Today's date is ${today}. Use get_trip_details to check a trip's price before confirming a booking. Once the user has been shown the trip price and clearly agrees (e.g. says "yes", "proceed", "confirm", or similar), call book_trip immediately in your next response. Do not call get_trip_details again or ask for confirmation a second time once the user has already agreed.If user accepts ask if he wants a return ticket and if yes, ask for the return date and then search for return trips. If a return trip is found, show the user the price and ask for confirmation before booking the return trip. If no return trip is found, inform the user that no return trips are available on that date and if they dont ask just procceed with the booking,also do not use emojis during chat make it look proffessional and if they ask about the webpage say that its bus for kosovo country and say kosovo cities also if they ask about payment say that i can be done in person also in the website and in sunday bussess do not work`,
      },
      ...userMessage,
    ];

    const MAX_STEPS = 8;

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            tools,
            messages,
          }),
        },
      );

      const data = await response.json();

      if (!data.choices) {
        console.error("Groq API error:", data);
        return res
          .status(502)
          .json({ error: "Upstream model error", details: data });
      }

      const message = data.choices[0].message;
      // ... rest unchanged

      if (!message.tool_calls) {
        return res.status(200).json({ reply: message.content });
      }

      messages.push(message); // record the assistant's tool-call turn

      const MAX_STEPS = 8;

      const safeMessages = (req.body.messages ?? []).filter(
        (m) =>
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string",
      );

      for (const toolCall of message.tool_calls) {
        let toolResultContent;
        try {
          const args = JSON.parse(toolCall.function.arguments || "{}");
          const name = toolCall.function.name;

          if (name === "search_trips") {
            const results = await searchTripsCore({
              from: args.origin,
              to: args.destination,
              date: args.date,
            });
            toolResultContent = JSON.stringify(
              results.length ? results : { message: "No trips found." },
            );
          } else if (name === "get_trip_details") {
            toolResultContent = JSON.stringify(
              await getTripByIdCore(args.tripId),
            );
          } else if (name === "book_trip") {
            if (
              !Array.isArray(args.seats) ||
              !args.seats.every(Number.isInteger)
            ) {
              throw new Error("Invalid seats");
            }
            const result = await bookTripCore({
              tripId: args.tripId,
              seats: args.seats,
              userId,
            });
            console.log("BOOK_TRIP SUCCEEDED", result);
            toolResultContent = JSON.stringify(result);
          } else {
            toolResultContent = JSON.stringify({
              error: `Unknown tool: ${name}`,
            });
          }
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
