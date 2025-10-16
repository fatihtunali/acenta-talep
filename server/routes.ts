import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateItinerary } from "./ai-service";
import { tripRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/generate-itinerary", async (req, res) => {
    try {
      // Validate request body
      const validationResult = tripRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: "Invalid request data",
          details: validationResult.error.errors,
        });
      }

      const tripRequest = validationResult.data;

      // Generate itinerary using AI
      const tripPackage = await generateItinerary(tripRequest);

      // Save to storage
      const savedPackage = await storage.saveTripPackage(tripPackage);

      return res.json({
        success: true,
        package: savedPackage,
      });
    } catch (error) {
      console.error("Error in /api/generate-itinerary:", error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred while generating the itinerary",
      });
    }
  });

  app.get("/api/trip-packages", async (req, res) => {
    try {
      const packages = await storage.getAllTripPackages();
      return res.json({
        success: true,
        packages,
      });
    } catch (error) {
      console.error("Error in /api/trip-packages:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch trip packages",
      });
    }
  });

  app.get("/api/trip-packages/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid trip package ID",
        });
      }
      
      const tripPackage = await storage.getTripPackage(id);

      if (!tripPackage) {
        return res.status(404).json({
          success: false,
          error: "Trip package not found",
        });
      }

      return res.json({
        success: true,
        package: tripPackage,
      });
    } catch (error) {
      console.error("Error in /api/trip-packages/:id:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch trip package",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
