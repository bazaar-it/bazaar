"use client"

import React, { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@bazaar/ui"
import { Button } from "@bazaar/ui"
import { Input } from "@bazaar/ui"

interface RenameComponentDialogProps {
  isOpen: boolean
  onClose: () => void
  onRename: (name: string) => void
  currentName: string
  isSubmitting?: boolean
}

export function RenameComponentDialog({
  isOpen,
  onClose,
  onRename,
  currentName,
  isSubmitting = false,
}: RenameComponentDialogProps) {
  const [name, setName] = useState(currentName)
  const [error, setError] = useState("")
  
  // Reset form when dialog opens with new component
  useEffect(() => {
    if (isOpen) {
      setName(currentName)
      setError("")
    }
  }, [isOpen, currentName])
  
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    // Simple validation
    if (!name.trim()) {
      setError("Component name is required")
      return
    }
    
    onRename(name)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Component</DialogTitle>
          <DialogDescription>
            Choose a new name for your component
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="component-name" className="text-sm font-medium">
              Component Name
            </label>
            <Input
              id="component-name"
              placeholder="Enter component name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (e.target.value.trim()) {
                  setError("")
                }
              }}
              autoFocus
              disabled={isSubmitting}
            />
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 