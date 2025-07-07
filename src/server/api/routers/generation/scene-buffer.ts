import type { SceneEntity } from "~/generated/entities";

/**
 * Scene Order Buffer
 * Manages ordered delivery of scenes for multi-scene generation.
 * Ensures scenes are delivered in the correct order even if they complete out of order.
 */
export class SceneOrderBuffer {
  private completedScenes: Map<number, SceneEntity> = new Map();
  private nextOrderToDeliver: number = 0;
  private onDeliveryCallback: (scene: SceneEntity) => void;
  
  constructor(startingOrder: number, onDelivery: (scene: SceneEntity) => void) {
    this.nextOrderToDeliver = startingOrder;
    this.onDeliveryCallback = onDelivery;
  }
  
  /**
   * Add a completed scene to the buffer
   * Will trigger delivery if this scene can be delivered immediately
   */
  addCompletedScene(scene: SceneEntity, order: number) {
    console.log(`📦 [BUFFER] Scene completed: order ${order}, name: ${scene.name}`);
    this.completedScenes.set(order, scene);
    
    // Try to deliver scenes in order
    this.deliverReadyScenes();
  }
  
  /**
   * Deliver all consecutive scenes starting from nextOrderToDeliver
   */
  private deliverReadyScenes() {
    // Deliver all consecutive scenes starting from nextOrderToDeliver
    while (this.completedScenes.has(this.nextOrderToDeliver)) {
      const scene = this.completedScenes.get(this.nextOrderToDeliver)!;
      
      console.log(`🚀 [BUFFER] Delivering scene in order: ${this.nextOrderToDeliver} - ${scene.name}`);
      this.onDeliveryCallback(scene);
      
      this.completedScenes.delete(this.nextOrderToDeliver);
      this.nextOrderToDeliver++;
    }
  }
  
  /**
   * Get count of scenes waiting in buffer
   */
  getPendingCount(): number {
    return this.completedScenes.size;
  }
  
  /**
   * Get the next order number we're waiting to deliver
   */
  getNextOrderToDeliver(): number {
    return this.nextOrderToDeliver;
  }
  
  /**
   * Check if all scenes have been delivered
   */
  isComplete(): boolean {
    return this.completedScenes.size === 0;
  }
  
  /**
   * Get list of completed but undelivered scene orders
   */
  getPendingOrders(): number[] {
    return Array.from(this.completedScenes.keys()).sort((a, b) => a - b);
  }
} 