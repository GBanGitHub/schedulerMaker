"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, GripVertical, Trash2, Copy, Pencil, X } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Block {
  id: string;
  name: string;
  duration: number;
  category: string;
  color: string;
}

interface TemplateBlock {
  id: string;
  blockId: string;
  order: number;
  customDuration: number | null;
  block: Block;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  templateBlocks: TemplateBlock[];
}

function SortableBlock({ item, onRemove }: { item: TemplateBlock; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card-high border border-border rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-subtle hover:text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.block.color }} />
      <span className="flex-1 text-sm text-foreground font-medium">{item.block.name}</span>
      <Badge variant="secondary">{formatDuration(item.customDuration || item.block.duration)}</Badge>
      <button onClick={onRemove} className="text-subtle hover:text-destructive transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedBlocks, setSelectedBlocks] = useState<TemplateBlock[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchTemplates(); fetchBlocks(); }, []);

  async function fetchTemplates() {
    const res = await fetch("/api/templates");
    if (res.ok) setTemplates(await res.json());
  }

  async function fetchBlocks() {
    const res = await fetch("/api/blocks");
    if (res.ok) setAllBlocks(await res.json());
  }

  function openCreate() {
    setEditing(null); setName(""); setDescription(""); setSelectedBlocks([]);
    setDialogOpen(true);
  }

  function openEdit(template: Template) {
    setEditing(template);
    setName(template.name);
    setDescription(template.description || "");
    setSelectedBlocks([...template.templateBlocks]);
    setDialogOpen(true);
  }

  function addBlock(block: Block) {
    const newItem: TemplateBlock = {
      id: `new-${Date.now()}-${Math.random()}`,
      blockId: block.id,
      order: selectedBlocks.length,
      customDuration: null,
      block,
    };
    setSelectedBlocks([...selectedBlocks, newItem]);
  }

  function removeBlock(index: number) {
    setSelectedBlocks(selectedBlocks.filter((_, i) => i !== index));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = selectedBlocks.findIndex((b) => b.id === active.id);
      const newIndex = selectedBlocks.findIndex((b) => b.id === over.id);
      setSelectedBlocks(arrayMove(selectedBlocks, oldIndex, newIndex));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      name,
      description: description || undefined,
      blocks: selectedBlocks.map((b, i) => ({
        blockId: b.blockId, order: i, customDuration: b.customDuration,
      })),
    };
    if (editing) {
      await fetch(`/api/templates/${editing.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/templates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setDialogOpen(false);
    fetchTemplates();
  }

  async function handleClone(id: string) {
    await fetch(`/api/templates/${id}/clone`, { method: "POST" });
    fetchTemplates();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/templates/${id}`, { method: "DELETE" });
    fetchTemplates();
  }

  const totalDuration = selectedBlocks.reduce(
    (sum, b) => sum + (b.customDuration || b.block.duration), 0
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[10px] text-subtle uppercase tracking-[0.4em] mb-2">Structures</p>
          <h1 className="font-display text-4xl text-foreground tracking-widest">TEMPLATES</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:border-border-strong transition-colors">
            <CardHeader className="flex flex-row items-start justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  {template.isDefault && <Badge variant="default">Default</Badge>}
                </div>
                {template.description && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{template.description}</p>
                )}
              </div>
              <div className="flex gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(template)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleClone(template.id)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {template.templateBlocks.map((tb) => (
                  <div key={tb.id} className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tb.block.color }} />
                    <span className="text-foreground">{tb.block.name}</span>
                    <span className="font-mono text-xs text-subtle ml-auto">
                      {formatDuration(tb.customDuration || tb.block.duration)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="font-mono text-[10px] text-subtle mt-3 pt-3 border-t border-border">
                {template.templateBlocks.length} blocks &middot;{" "}
                {formatDuration(
                  template.templateBlocks.reduce(
                    (sum, tb) => sum + (tb.customDuration || tb.block.duration), 0
                  )
                )}{" "}
                total
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-sm">No templates yet. Create your first template to arrange blocks into a day.</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="tname">Name</Label>
              <Input id="tname" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="tdesc">Description</Label>
              <Textarea id="tdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div>
              <Label>Add Blocks</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {allBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => addBlock(block)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border border-border text-muted-foreground hover:border-border-strong hover:text-foreground hover:bg-card-high transition-all"
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: block.color }} />
                    {block.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Block Order</Label>
                <span className="font-mono text-[10px] text-subtle">{formatDuration(totalDuration)} total</span>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={selectedBlocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {selectedBlocks.map((item, index) => (
                      <SortableBlock key={item.id} item={item} onRemove={() => removeBlock(index)} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
              {selectedBlocks.length === 0 && (
                <p className="text-xs text-subtle text-center py-6 border border-dashed border-border rounded-lg">
                  Click blocks above to add them
                </p>
              )}
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
