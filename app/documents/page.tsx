"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Globe, Trash2, Upload, Plus, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface UserDocument {
  id: string;
  name: string;
  type: "pdf" | "txt" | "url" | "note";
  size_bytes: number;
  status: "processing" | "ready" | "ready_no_search" | "error";
  chunk_count: number;
  created_at: string;
  source_url?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const TYPE_ICON: Record<string, typeof FileText> = {
  pdf: FileText, txt: FileText, url: Globe, note: FileText,
};

const STATUS_ICON = {
  processing: Loader2,
  ready: CheckCircle,
  ready_no_search: CheckCircle,
  error: AlertCircle,
};

const STATUS_COLOR = {
  processing: "text-muted-foreground",
  ready: "text-green-500",
  ready_no_search: "text-yellow-500",
  error: "text-destructive",
};

export default function DocumentsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error("로드 실패");
      return res.json() as Promise<{ documents: UserDocument[]; storage: { used: number; quota: number } }>;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/documents", { method: "POST", body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); },
  });

  const urlMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await fetch("/api/documents/url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); setUrlInput(""); setShowUrlInput(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    uploadMutation.mutate(fd);
    e.target.value = "";
  };

  const onNoteSubmit = () => {
    if (!noteInput.trim()) return;
    const fd = new FormData();
    fd.append("note", noteInput);
    uploadMutation.mutate(fd);
    setNoteInput(""); setShowNoteInput(false);
  };

  const storage = data?.storage;
  const usedPct = storage ? Math.round((storage.used / storage.quota) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">문서함</h1>
          <p className="text-sm text-muted-foreground mt-0.5">업로드한 문서를 AI 채팅에서 참조합니다</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowUrlInput(!showUrlInput)}>
            <Globe className="size-4 mr-1" /> URL
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNoteInput(!showNoteInput)}>
            <Plus className="size-4 mr-1" /> 메모
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploadMutation.isPending}>
            <Upload className="size-4 mr-1" /> 파일 업로드
          </Button>
          <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={onFileChange} />
        </div>
      </div>

      {/* 스토리지 사용량 */}
      {storage && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(storage.used)} 사용 중</span>
            <span className={usedPct >= 80 ? "text-orange-500 font-medium" : ""}>{usedPct}% / {formatBytes(storage.quota)}</span>
          </div>
          <Progress value={usedPct} className={`h-1.5 ${usedPct >= 80 ? "[&>div]:bg-orange-500" : ""}`} />
        </div>
      )}

      {/* URL 입력 */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input placeholder="https://..." value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && urlMutation.mutate(urlInput)} />
          <Button size="sm" onClick={() => urlMutation.mutate(urlInput)} disabled={!urlInput || urlMutation.isPending}>
            {urlMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "추가"}
          </Button>
        </div>
      )}

      {/* 메모 입력 */}
      {showNoteInput && (
        <div className="space-y-2">
          <textarea className="w-full h-32 rounded-md border p-3 text-sm resize-none focus:outline-none focus:ring-1"
            placeholder="텍스트를 직접 입력하세요..." value={noteInput} onChange={e => setNoteInput(e.target.value)} />
          <Button size="sm" onClick={onNoteSubmit} disabled={!noteInput.trim()}>저장</Button>
        </div>
      )}

      {/* 업로드 중 에러 */}
      {uploadMutation.isError && (
        <p className="text-sm text-destructive">{(uploadMutation.error as Error).message}</p>
      )}

      {/* 문서 목록 */}
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg border animate-pulse bg-muted/30" />
        ))}</div>
      ) : data?.documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="size-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">업로드된 문서가 없습니다</p>
          <p className="text-xs mt-1">PDF, TXT 파일 또는 URL을 추가해보세요</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg">
          {data?.documents.map((doc) => {
            const Icon = TYPE_ICON[doc.type] ?? FileText;
            const SIcon = STATUS_ICON[doc.status];
            return (
              <div key={doc.id} className="flex items-center gap-3 p-4">
                <Icon className="size-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{formatBytes(doc.size_bytes)}</span>
                    {doc.chunk_count > 0 && <span className="text-xs text-muted-foreground">· {doc.chunk_count}청크</span>}
                    <Badge variant="outline" className="text-xs py-0 px-1.5">
                      <SIcon className={`size-3 mr-1 ${STATUS_COLOR[doc.status]} ${doc.status === "processing" ? "animate-spin" : ""}`} />
                      {doc.status === "processing" ? "처리 중" : doc.status === "ready" ? "완료" : doc.status === "ready_no_search" ? "검색불가" : "오류"}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => { if (confirm(`"${doc.name}" 문서를 삭제할까요?`)) deleteMutation.mutate(doc.id); }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
