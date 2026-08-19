"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createUploadUrl } from "../_actions/form-actions";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface UploadedFile {
  /** Identificador estável do item na lista, gerado no cliente. */
  id?: string;
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
  /** Quando true, oculta a área de upload e mostra a mensagem. */
  disabled?: boolean;
  disabledMessage?: string;
}

let uploadSeq = 0;
function nextUploadId() {
  uploadSeq += 1;
  return `upload-${uploadSeq}`;
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
  disabled = false,
  disabledMessage = "Envio de arquivos temporariamente desativado.",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [dragOver, setDragOver] = useState(false);

  // Uploads são assíncronos: cada conclusão atualiza a lista a partir do
  // estado mais recente (via ref), não do snapshot da closure — remover um
  // arquivo ou anexar outro durante um envio não é sobrescrito.
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  const patchFiles = useCallback(
    (updater: (prev: UploadedFile[]) => UploadedFile[]) => {
      const next = updater(filesRef.current);
      filesRef.current = next;
      onChange(next);
    },
    [onChange]
  );

  const uploadFiles = useCallback(
    async (fileList: FileList) => {
      const selected = Array.from(fileList).map((file) => ({
        file,
        id: nextUploadId(),
      }));

      patchFiles((prev) => {
        const placeholders = selected.map(({ file, id }) => ({
          id,
          name: file.name,
          path: "",
          uploading: true,
        }));
        return multiple ? [...prev, ...placeholders] : placeholders;
      });

      const settle = (id: string, patch: Partial<UploadedFile>) => {
        patchFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, uploading: false, ...patch } : f
          )
        );
      };

      for (const { file, id } of selected) {
        if (file.size > MAX_UPLOAD_BYTES) {
          settle(id, { error: "Arquivo excede o limite de 10 MB." });
          continue;
        }

        if (file.size === 0) {
          settle(id, { error: "Arquivo vazio." });
          continue;
        }

        const result = await createUploadUrl(file.name, category);

        if ("error" in result) {
          settle(id, { error: result.error });
          continue;
        }

        try {
          const res = await fetch(result.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!res.ok) throw new Error("Upload falhou");

          settle(id, { path: result.path });
        } catch {
          settle(id, { error: "Erro ao enviar arquivo" });
        }
      }
    },
    [category, multiple, patchFiles]
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
      // Permite reenviar o mesmo arquivo após removê-lo.
      e.target.value = "";
    },
    [uploadFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      patchFiles((prev) => prev.filter((_, i) => i !== index));
    },
    [patchFiles]
  );

  if (disabled) {
    return (
      <div
        className="rounded-md border border-dashed border-border bg-bg px-3 py-3 text-[13px] text-muted"
        data-testid="upload-disabled"
        role="status"
      >
        {disabledMessage}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div
        role="button"
        tabIndex={0}
        aria-label={`Enviar arquivo: ${label}`}
        className={`relative cursor-pointer rounded-md border-[1.5px] border-dashed p-4 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        data-testid="upload-area"
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
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
              key={file.id ?? `${file.name}-${i}`}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ${
                file.error
                  ? "bg-danger/10 text-danger"
                  : file.uploading
                    ? "bg-muted/20 text-muted"
                    : "bg-accent/10 text-fg"
              }`}
            >
              {file.uploading ? "Enviando..." : file.name}
              {file.error ? ` — ${file.error}` : null}
              {!file.uploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="text-sm leading-none text-muted hover:text-danger"
                  title="Remover"
                  aria-label={`Remover arquivo ${file.name}`}
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
