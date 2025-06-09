// src/types/project.ts
/**
 * Project type used throughout the application
 * Represents a subset of the database project fields
 */
export interface Project {
  id: string;
  title: string;
  updatedAt: Date | null;
  userId: string;
}

/**
 * Project type for sidebar display
 * A minimal version with just id and name
 */
export interface ProjectListItem {
  id: string;
  name: string;
} 