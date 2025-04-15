import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as UserType, insertUserSchema } from "@shared/schema";

// Add the user interface extending the user type instead of using declaration merging
interface AuthUser {
  id: number;
  username: string;
  password: string;
  fullName: string;
  role: string;
  createdAt: Date | null;
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    // Handle undefined or empty passwords
    if (!stored || !supplied) {
      console.log("Invalid password comparison: empty passwords");
      return false;
    }
    
    // Check if stored password contains a salt
    if (!stored.includes('.')) {
      // For existing users (who don't have a salt), direct comparison
      return supplied === stored;
    }
    
    // For new users with a salt, use secure comparison
    const parts = stored.split(".");
    if (parts.length !== 2) {
      console.log("Invalid stored password format, expected hash.salt");
      return false;
    }
    
    const [hashed, salt] = parts;
    if (!hashed || !salt) {
      console.log("Invalid hashed password parts");
      return false;
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    console.error("Password comparison error:", err);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: "YashHotelBot-Secret-Key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 60 * 60 * 1000, // 1 hour
      secure: process.env.NODE_ENV === "production",
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } 
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user: AuthUser, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Register API routes - only accessible to admin users
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Check if the current user is authenticated and is an admin
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "You must be logged in to register new users" });
      }
      
      const currentUser = req.user as AuthUser;
      if (currentUser.role !== "admin") {
        return res.status(403).json({ error: "Only admin users can register new staff accounts" });
      }

      // Validate and parse user data
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create user object without sensitive information
      const userResponse = {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      };

      return res.status(201).json(userResponse);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login route
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: AuthUser | false, info: { message: string } | undefined) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info?.message || "Authentication failed" });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Return user data without sensitive information
        return res.json({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        });
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Return user data without sensitive information
    const user = req.user as AuthUser;
    return res.json({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    });
  });
}