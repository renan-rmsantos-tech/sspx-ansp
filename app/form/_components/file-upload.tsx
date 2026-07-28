"use client";

import { useCallback, useRef, useState } from "react";
import { createUploadUrl } from "../_actions/form-actions";

export interface UploadedFile {
  name: string;
  path: string;
  uploading?: boolean;
  error?: string;
}

interface FileUploadProps {
  label: string;
  category: string;
  accept?: string;
  multiple?: boolean;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  required?: boolean;
  error?: string;
}

export function FileUpload({
  label,
  category,
  accept = "image/*,.pdf",
  multiple = false,
  files,
  onChange,
  required,
  error,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const uploadFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(fileList)) {
        const placeholder: UploadedFile = {
          name: file.name,
          path: "",
          uploading: true,
        };
        newFiles.push(placeholder);
      }

      const updated = multiple ? [...files, ...newFiles] : [...newFiles];
      onChange(updated);

      const results: UploadedFile[] = multiple ? [...files] : [];

      for (let i = 0; i < newFiles.length; i++) {
        const file = Array.from(fileList)[i];
        const result = await createUploadUrl(file.name, category);

        if ("error" in result) {
          results.push({
            name: file.name,
            path: "",
            error: result.error,
          });
          continue;
        }

        try {
          const res = await fetch(result.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!res.ok) throw new Error("Upload falhou");

          results.push({ name: file.name, path: result.path });
        } catch {
          results.push({
            name: file.name,
            path: "",
            error: "Erro ao enviar arquivo",
          });
        }
      }

      onChange(results);
    },
    [files, multiple, onChange, category]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadFiles(e.target.files);
      }
    },
    [uploadFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      onChange(files.filter((_, i) => i !== index));
    },
    [files, onChange]
  );

  return (
    <div className="space-y-1">
      <div
        className={`relative cursor-pointer rounded-md border-[1.5px] border-dashed p-4 text-center transition-colors ${
          dragOver
            ? "border-gold bg-gold/10"
            : error
              ? "border-danger bg-danger/5"
              : "border-border hover:border-gold hover:bg-gold/5"
        }`}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        data-testid="upload-area"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          data-testid="upload-input"
        />
        <p className="text-[13px] text-muted">
          <strong className="text-gold">Clique ou arraste</strong> {label}
        </p>
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1" data-testid="upload-preview">
          {files.map((file, i) => (
            <span
              key={`${file.name}-${i}`}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
                file.error
                  ? "bg-danger/10 text-danger"
                  : file.uploading
                    ? "bg-muted/20 text-muted"
                    : "bg-accent/10 text-fg"
              }`}
            >
              {file.uploading ? "Enviando..." : file.name}
              {!file.uploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-sm leading-none text-muted hover:text-danger"
                  title="Remover"
                  data-testid="remove-file"
                >
                  &times;
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      )}
      {required && files.length === 0 && !error && (
        <span className="sr-only">Obrigatório</span>
      )}
    </div>
  );
}
