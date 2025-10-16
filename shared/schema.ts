import { z } from "zod";
import { pgTable, serial, text, varchar, integer, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// Trip Request Schema
export const tripRequestSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  nights: z.coerce.number().min(1, "At least 1 night is required").max(30, "Maximum 30 nights allowed"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
  travelers: z.coerce.number().min(1, "At least 1 traveler is required").max(20, "Maximum 20 travelers allowed"),
  budget: z.enum(["budget", "moderate", "luxury"]),
  preferences: z.string().optional(),
});

export type TripRequest = z.infer<typeof tripRequestSchema>;

// Hotel Schema
export const hotelSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["budget", "moderate", "luxury"]),
  rating: z.number().min(1).max(5),
  pricePerNight: z.number(),
  totalPrice: z.number(),
  amenities: z.array(z.string()),
  description: z.string(),
  imageUrl: z.string().optional(),
  location: z.string(),
});

export type Hotel = z.infer<typeof hotelSchema>;

// Sightseeing Activity Schema
export const sightseeingSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  duration: z.string(),
  price: z.number(),
  category: z.enum(["cultural", "adventure", "relaxation", "entertainment", "nature"]),
  imageUrl: z.string().optional(),
  bestTimeToVisit: z.string().optional(),
});

export type Sightseeing = z.infer<typeof sightseeingSchema>;

// Transportation Schema
export const transportationSchema = z.object({
  id: z.string(),
  type: z.enum(["airport-transfer", "car-rental", "local-transport", "intercity"]),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  duration: z.string().optional(),
});

export type Transportation = z.infer<typeof transportationSchema>;

// Itinerary Day Schema
export const itineraryDaySchema = z.object({
  day: z.number(),
  date: z.string(),
  activities: z.array(z.object({
    time: z.string(),
    title: z.string(),
    description: z.string(),
    type: z.enum(["hotel", "sightseeing", "transport", "meal", "free-time"]),
    duration: z.string().optional(),
    price: z.number().optional(),
  })),
});

export type ItineraryDay = z.infer<typeof itineraryDaySchema>;

// Complete Trip Package Schema
export const tripPackageSchema = z.object({
  id: z.string(),
  tripRequest: tripRequestSchema,
  hotel: hotelSchema,
  sightseeing: z.array(sightseeingSchema),
  transportation: z.array(transportationSchema),
  itinerary: z.array(itineraryDaySchema),
  pricing: z.object({
    hotelTotal: z.number(),
    sightseeingTotal: z.number(),
    transportationTotal: z.number(),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
  }),
  createdAt: z.string(),
});

export type TripPackage = z.infer<typeof tripPackageSchema>;

// API Response Schema for AI Generation
export const aiGenerationResponseSchema = z.object({
  success: z.boolean(),
  package: tripPackageSchema.optional(),
  error: z.string().optional(),
});

export type AIGenerationResponse = z.infer<typeof aiGenerationResponseSchema>;

// Database Tables

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users Table - Replit Auth schema
export const users = pgTable("users", {
  id: varchar("id").primaryKey(), // Replit's sub claim (stable user ID)
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Trip Packages Table
export const tripPackages = pgTable("trip_packages", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  tripRequest: jsonb("trip_request").notNull().$type<TripRequest>(),
  hotel: jsonb("hotel").notNull().$type<Hotel>(),
  sightseeing: jsonb("sightseeing").notNull().$type<Sightseeing[]>(),
  transportation: jsonb("transportation").notNull().$type<Transportation[]>(),
  itinerary: jsonb("itinerary").notNull().$type<ItineraryDay[]>(),
  pricing: jsonb("pricing").notNull().$type<{
    hotelTotal: number;
    sightseeingTotal: number;
    transportationTotal: number;
    subtotal: number;
    tax: number;
    total: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations - defined after both tables are declared
export const usersRelations = relations(users, ({ many }) => ({
  tripPackages: many(tripPackages),
}));

export const tripPackagesRelations = relations(tripPackages, ({ one }) => ({
  user: one(users, {
    fields: [tripPackages.userId],
    references: [users.id],
  }),
}));

export const insertTripPackageSchema = createInsertSchema(tripPackages).omit({ id: true, createdAt: true });
export const selectTripPackageSchema = createSelectSchema(tripPackages);
export type DbTripPackage = typeof tripPackages.$inferSelect;
export type InsertTripPackage = z.infer<typeof insertTripPackageSchema>;
