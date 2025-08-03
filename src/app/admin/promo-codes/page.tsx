"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PromoCodesPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  
  // Form state
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount" | "free_credits">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [minPurchaseAmount, setMinPurchaseAmount] = useState("");

  // Fetch promo codes
  const { data: promoCodes, refetch } = api.admin.getPromoCodes.useQuery();
  
  // Create promo code mutation
  const createPromoCode = api.admin.createPromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code created successfully!");
      setIsCreating(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create promo code");
    },
  });

  // Deactivate promo code mutation
  const deactivatePromoCode = api.admin.deactivatePromoCode.useMutation({
    onSuccess: () => {
      toast.success("Promo code deactivated");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to deactivate promo code");
    },
  });

  const resetForm = () => {
    setCode("");
    setDescription("");
    setDiscountType("percentage");
    setDiscountValue("");
    setMaxUses("");
    setValidUntil("");
    setMinPurchaseAmount("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const discountVal = parseInt(discountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      toast.error("Please enter a valid discount value");
      return;
    }

    createPromoCode.mutate({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue: discountType === "percentage" ? discountVal : discountVal * 100, // Convert euros to cents for fixed amount
      maxUses: maxUses ? parseInt(maxUses) : undefined,
      validUntil: validUntil ? new Date(validUntil) : undefined,
      minPurchaseAmount: minPurchaseAmount ? parseInt(minPurchaseAmount) * 100 : undefined, // Convert to cents
    });
  };

  const getDiscountDisplay = (type: string, value: number) => {
    switch (type) {
      case "percentage":
        return `${value}% off`;
      case "fixed_amount":
        return `€${(value / 100).toFixed(2)} off`;
      case "free_credits":
        return `+${value} credits`;
      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Promo Code Management</h1>
        <p className="text-muted-foreground">Create and manage promotional codes for discounts and bonuses</p>
      </div>

      {/* Create New Promo Code */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Create New Promo Code</CardTitle>
          <CardDescription>Generate codes for marketing campaigns and special offers</CardDescription>
        </CardHeader>
        <CardContent>
          {!isCreating ? (
            <Button onClick={() => setIsCreating(true)}>Create New Code</Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Promo Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="SUMMER2024"
                    required
                    className="uppercase"
                  />
                </div>
                
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage Off</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount (€)</SelectItem>
                      <SelectItem value="free_credits">Free Credits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="discountValue">
                    {discountType === "percentage" ? "Percentage (%)" : 
                     discountType === "fixed_amount" ? "Amount (€)" : "Number of Credits"}
                  </Label>
                  <Input
                    id="discountValue"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "50" : discountType === "fixed_amount" ? "10" : "100"}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="maxUses">Max Uses (optional)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div>
                  <Label htmlFor="validUntil">Valid Until (optional)</Label>
                  <Input
                    id="validUntil"
                    type="datetime-local"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="minPurchaseAmount">Min Purchase (€) (optional)</Label>
                  <Input
                    id="minPurchaseAmount"
                    type="number"
                    value={minPurchaseAmount}
                    onChange={(e) => setMinPurchaseAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summer sale - 50% off all packages"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createPromoCode.isPending}>
                  {createPromoCode.isPending ? "Creating..." : "Create Code"}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreating(false);
                  resetForm();
                }}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Existing Promo Codes */}
      <Card>
        <CardHeader>
          <CardTitle>Active Promo Codes</CardTitle>
          <CardDescription>Monitor usage and manage existing codes</CardDescription>
        </CardHeader>
        <CardContent>
          {promoCodes && promoCodes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-mono font-bold">{promo.code}</TableCell>
                    <TableCell className="max-w-xs truncate">{promo.description || "-"}</TableCell>
                    <TableCell>{getDiscountDisplay(promo.discountType, promo.discountValue)}</TableCell>
                    <TableCell>
                      {promo.usesCount} / {promo.maxUses || "∞"}
                    </TableCell>
                    <TableCell>
                      {promo.validUntil ? format(new Date(promo.validUntil), "MMM dd, yyyy") : "No expiry"}
                    </TableCell>
                    <TableCell>
                      {new Date() > new Date(promo.validUntil || Infinity) ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : promo.maxUses && promo.usesCount >= promo.maxUses ? (
                        <Badge variant="secondary">Exhausted</Badge>
                      ) : (
                        <Badge variant="default">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deactivatePromoCode.mutate({ promoId: promo.id })}
                        disabled={new Date() > new Date(promo.validUntil || Infinity)}
                      >
                        Deactivate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No promo codes created yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}