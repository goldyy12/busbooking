import prisma from "../../db.js";

/**
 * ADD NEW BUS (ADMIN)
 */
export const createBus = async (req, res) => {
  try {
    const { busNumber, capacity, type } = req.body;

    const bus = await prisma.bus.create({
      data: {
        busNumber, // e.g., "BUS-102"
        totalSeats: capacity, // e.g., 40
        // e.g., "LUXURY" or "AC"
      },
    });

    res.status(201).json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getAllBuses = async (req, res) => {
  try {
    const buses = await prisma.bus.findMany();
    res.json(buses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const { busNumber, capacity, type } = req.body;

    const updatedBus = await prisma.bus.update({
      where: { id: parseInt(id) },
      data: { busNumber, capacity, type },
    });

    res.json(updatedBus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
