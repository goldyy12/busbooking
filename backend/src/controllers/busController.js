import prisma from "../../db.js";

export const createBus = async (req, res, next) => {
  try {
    const { busNumber, capacity, type } = req.body;

    const bus = await prisma.bus.create({
      data: {
        busNumber,
        totalSeats: capacity,
      },
    });

    res.status(201).json(bus);
  } catch (error) {
    next(error);
  }
};

export const getAllBuses = async (req, res, next) => {
  try {
    const buses = await prisma.bus.findMany();
    res.json(buses);
  } catch (error) {
    next(error);
  }
};

export const updateBus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { busNumber, totalSeats } = req.body;

    const updatedBus = await prisma.bus.update({
      where: { id: parseInt(id) },
      data: { busNumber, totalSeats },
    });

    res.json(updatedBus);
  } catch (error) {
    next(error);
  }
};
