"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Loader2, X, ImageIcon } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setUploadedFile(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setUploadedFile({ name: file.name });
      setValue(v => v + (v ? "\n" : "") + `[이미지: ${file.name}]`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      setUploadedFile({ name: file.name });
      setValue(v => v + (v ? "\n" : "") + `[첨부: ${file.name}]`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-2">
        {uploadedFile && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded px-3 py-1.5 w-fit">
            <Paperclip className="size-3" />
            <span>{uploadedFile.name}</span>
            <button onClick={() => setUploadedFile(null)} className="hover:text-foreground">
              <X className="size-3" />
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <Button variant="ghost" size="icon" className="shrink-0 h-[44px] w-[44px] text-muted-foreground"
            onClick={() => imageRef.current?.click()} disabled={disabled || uploading} title="이미지 첨부">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </Button>
          <input ref={imageRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImage} />
          <Button variant="ghost" size="icon" className="shrink-0 h-[44px] w-[44px] text-muted-foreground"
            onClick={() => fileRef.current?.click()} disabled={disabled || uploading} title="파일 첨부 (PDF, TXT)">
            <Paperclip className="h-4 w-4" />
          </Button>
          <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFile} />
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요..."
            disabled={disabled}
            rows={1}
            className="min-h-[44px] max-h-[200px] resize-none"
          />
          <Button size="icon" onClick={handleSend} disabled={disabled || !value.trim()}
            className="shrink-0 h-[44px] w-[44px]">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
