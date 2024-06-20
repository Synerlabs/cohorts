import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CreateCohortForm() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          className="w-full"
          defaultValue="Gamer Gear Pro Controller"
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="name">Alternate name</Label>
        <Input
          id="name"
          type="text"
          className="w-full"
          defaultValue="Gamer Gear Pro Controller"
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="name">Slug</Label>
        <Input
          id="name"
          type="text"
          className="w-full"
          defaultValue="Gamer Gear Pro Controller"
        />
      </div>
      <div className="grid gap-3">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl nec ultricies ultricies, nunc nisl ultricies nunc, nec ultricies nunc nisl nec nunc."
          className="min-h-32"
        />
      </div>
    </div>
  );
}
