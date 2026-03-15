"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Block {
  id: string;
  name: string;
  duration: number;
  category: string;
  color: string;
  description: string | null;
  constraints: any;
}

const CATEGORIES = ["general", "health", "education", "work", "personal", "social"];
const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

export default function BlocksPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const [filter, setFilter] = useState("");

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [category, setCategory] = useState("general");
  const [color, setColor] = useState("#3B82F6");
  const [description, setDescription] = useState("");
  const [timePreference, setTimePreference] = useState("");

  useEffect(() => { fetchBlocks(); }, []);

  async function fetchBlocks() {
    const res = await fetch("/api/blocks");
    if (res.ok) setBlocks(await res.json());
  }

  function openCreate() {
    setEditing(null);
    setName(""); setDuration(60); setCategory("general");
    setColor("#3B82F6"); setDescription(""); setTimePreference("");
    setDialogOpen(true);
  }

  function openEdit(block: Block) {
    setEditing(block);
    setName(block.name); setDuration(block.duration); setCategory(block.category);
    setColor(block.color); setDescription(block.description || "");
    setTimePreference(block.constraints?.timePreference || "");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name, duration, category, color,
      description: description || undefined,
      constraints: timePreference ? { timePreference } : undefined,
    };
    if (editing) {
      await fetch(`/api/blocks/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/blocks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setDialogOpen(false);
    fetchBlocks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this block?")) return;
    await fetch(`/api/blocks/${id}`, { method: "DELETE" });
    fetchBlocks();
  }

  const filtered = blocks.filter((b) => !filter || b.category === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-2">Library</p>
          <h1 className="font-display text-4xl text-foreground tracking-widest">BLOCKS</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Block
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-all border ${
            filter === ""
              ? "bg-primary/10 text-primary border-primary/30"
              : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-all border capitalize ${
              filter === cat
                ? "bg-primary/10 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((block) => (
          <Card key={block.id} className="hover:border-border-strong transition-colors">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: block.color }}
                />
                <CardTitle className="text-sm">{block.name}</CardTitle>
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(block)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(block.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="capitalize">{block.category}</Badge>
                <span className="font-mono text-xs text-muted-foreground">{formatDuration(block.duration)}</span>
              </div>
              {block.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">{block.description}</p>
              )}
              {block.constraints?.timePreference && (
                <Badge className="mt-2 capitalize">{block.constraints.timePreference}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No blocks yet. Create your first block to get started.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Block" : "New Block"}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration" type="number" min={5} max={480}
                value={duration} onChange={(e) => setDuration(Number(e.target.value))} required
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="capitalize">{cat}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full transition-all ${
                      color === c
                        ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-110"
                        : "hover:scale-105 opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="timePreference">Time Preference</Label>
              <Select id="timePreference" value={timePreference} onChange={(e) => setTimePreference(e.target.value)}>
                <option value="">Any time</option>
                <option value="morning">Morning (5AM – 12PM)</option>
                <option value="afternoon">Afternoon (12PM – 5PM)</option>
                <option value="evening">Evening (5PM – 11PM)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
