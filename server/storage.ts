import { 
  type TripPackage, 
  type User, 
  type UpsertUser,
  tripPackages,
  users,
  type DbTripPackage 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Trip package methods
  saveTripPackage(tripPackage: Omit<TripPackage, "id" | "createdAt">, userId?: string): Promise<TripPackage>;
  getTripPackage(id: number): Promise<TripPackage | undefined>;
  getAllTripPackages(userId?: string): Promise<TripPackage[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Trip package methods
  async saveTripPackage(tripPackage: Omit<TripPackage, "id" | "createdAt">, userId?: string): Promise<TripPackage> {
    const [dbPackage] = await db
      .insert(tripPackages)
      .values({
        userId: userId || null,
        tripRequest: tripPackage.tripRequest,
        hotel: tripPackage.hotel,
        sightseeing: tripPackage.sightseeing,
        transportation: tripPackage.transportation,
        itinerary: tripPackage.itinerary,
        pricing: tripPackage.pricing,
      })
      .returning();
    
    return this.dbPackageToTripPackage(dbPackage);
  }

  async getTripPackage(id: number): Promise<TripPackage | undefined> {
    const [dbPackage] = await db
      .select()
      .from(tripPackages)
      .where(eq(tripPackages.id, id));
    
    return dbPackage ? this.dbPackageToTripPackage(dbPackage) : undefined;
  }

  async getAllTripPackages(userId?: string): Promise<TripPackage[]> {
    let query = db.select().from(tripPackages);
    
    if (userId) {
      query = query.where(eq(tripPackages.userId, userId)) as any;
    }
    
    const dbPackages = await query;
    return dbPackages.map(pkg => this.dbPackageToTripPackage(pkg));
  }

  private dbPackageToTripPackage(dbPackage: DbTripPackage): TripPackage {
    return {
      id: dbPackage.id.toString(),
      tripRequest: dbPackage.tripRequest as any,
      hotel: dbPackage.hotel as any,
      sightseeing: dbPackage.sightseeing as any,
      transportation: dbPackage.transportation as any,
      itinerary: dbPackage.itinerary as any,
      pricing: dbPackage.pricing as any,
      createdAt: dbPackage.createdAt.toISOString(),
    };
  }
}

export const storage = new DatabaseStorage();
