# File Management API Documentation

## Overview
This document outlines the tRPC API endpoints for managing files, scenes, and templates in the Bazaar video editor.

## Endpoints

### Upload Management

#### `upload.list`
- **Description**: Retrieves all uploaded files for the current user
- **Authentication**: Required
- **Returns**: Array of upload objects with metadata
  ```typescript
  {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: Date;
    updatedAt: Date;
  }[]
  ```

#### `upload.create`
- **Description**: Uploads a new file
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    name: string;
    type: string;
    size: number;
    file: FormData; // Contains the file to upload
  }
  ```
- **Returns**: Metadata for the uploaded file
  ```typescript
  {
    id: string;
    name: string;
    type: string;
    size: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

#### `upload.delete`
- **Description**: Deletes an uploaded file
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    id: string; // ID of the file to delete
  }
  ```
- **Returns**: Success indicator
  ```typescript
  {
    success: boolean;
  }
  ```

#### `upload.rename`
- **Description**: Renames an uploaded file
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    id: string; // ID of the file to rename
    name: string; // New name for the file
  }
  ```
- **Returns**: Updated file metadata
  ```typescript
  {
    id: string;
    name: string;
    updatedAt: Date;
  }
  ```

### Scene Management

#### `scene.list`
- **Description**: Retrieves all saved scenes for the current user
- **Authentication**: Required
- **Returns**: Array of scene objects with metadata
  ```typescript
  {
    id: string;
    name: string;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
  }[]
  ```

#### `scene.create`
- **Description**: Creates a new scene
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    name: string;
    duration: number;
    data: any; // Scene data structure
  }
  ```
- **Returns**: Metadata for the created scene
  ```typescript
  {
    id: string;
    name: string;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

#### `scene.delete`
- **Description**: Deletes a scene
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    id: string; // ID of the scene to delete
  }
  ```
- **Returns**: Success indicator
  ```typescript
  {
    success: boolean;
  }
  ```

#### `scene.rename`
- **Description**: Renames a scene
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    id: string; // ID of the scene to rename
    name: string; // New name for the scene
  }
  ```
- **Returns**: Updated scene metadata
  ```typescript
  {
    id: string;
    name: string;
    updatedAt: Date;
  }
  ```

### Template Management

#### `template.list`
- **Description**: Retrieves all templates for the current user
- **Authentication**: Required
- **Returns**: Array of template objects with metadata
  ```typescript
  {
    id: string;
    name: string;
    description: string;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
  }[]
  ```

#### `template.create`
- **Description**: Creates a new template
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    name: string;
    description?: string;
    duration: number;
    data: any; // Template data structure
  }
  ```
- **Returns**: Metadata for the created template
  ```typescript
  {
    id: string;
    name: string;
    description: string;
    duration: number;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

#### `template.delete`
- **Description**: Deletes a template
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    id: string; // ID of the template to delete
  }
  ```
- **Returns**: Success indicator
  ```typescript
  {
    success: boolean;
  }
  ```

#### `template.rename`
- **Description**: Renames a template
- **Authentication**: Required
- **Input**:
  ```typescript
  {
    id: string; // ID of the template to rename
    name: string; // New name for the template
  }
  ```
- **Returns**: Updated template metadata
  ```typescript
  {
    id: string;
    name: string;
    updatedAt: Date;
  }
  ```

## Error Handling
All endpoints will throw `TRPCError` with appropriate HTTP status codes for various failure scenarios:
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (not authorized for the requested resource)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (e.g., duplicate file name)
- `500`: Internal Server Error

## Future Enhancements
- Add pagination support for list endpoints
- Add filtering and sorting options
- Support for batch operations
- Add file metadata editing beyond just name changes 