import "express";

declare global {
  namespace Express {
    interface User {
      id: number;
      role: string;
    }
  }
}

export {};

