import {
  formatRuntimeMemoryPageDetail,
  formatRuntimeMemoryPageLabel,
  sortRuntimeMemoryPagesForPresentation
} from "@entangle/host-client";
import type {
  RuntimeMemoryInspectionResponse,
  RuntimeMemoryPageInspectionResponse,
  RuntimeMemoryPageSummary
} from "@entangle/types";

export const sortRuntimeMemoryPagesForCli =
  sortRuntimeMemoryPagesForPresentation;

export interface RuntimeMemoryPageCliSummaryRecord {
  detail: string;
  kind: RuntimeMemoryPageSummary["kind"];
  label: string;
  path: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface RuntimeMemoryCliSummaryRecord {
  focusedRegisters: RuntimeMemoryPageCliSummaryRecord[];
  memoryRoot: string;
  nodeId: string;
  pageCount: number;
  taskPageCount: number;
  taskPages: RuntimeMemoryPageCliSummaryRecord[];
}

export interface RuntimeMemoryPagePreviewCliSummaryRecord {
  page: RuntimeMemoryPageCliSummaryRecord;
  preview:
    | {
        available: true;
        bytesRead: number;
        contentType: Extract<
          RuntimeMemoryPageInspectionResponse["preview"],
          { available: true }
        >["contentType"];
        sourcePath: string;
        truncated: boolean;
      }
    | {
        available: false;
        reason: string;
      };
}

export function projectRuntimeMemoryPageSummary(
  page: RuntimeMemoryPageSummary
): RuntimeMemoryPageCliSummaryRecord {
  return {
    detail: formatRuntimeMemoryPageDetail(page),
    kind: page.kind,
    label: formatRuntimeMemoryPageLabel(page),
    path: page.path,
    sizeBytes: page.sizeBytes,
    updatedAt: page.updatedAt
  };
}

export function projectRuntimeMemorySummary(
  response: RuntimeMemoryInspectionResponse
): RuntimeMemoryCliSummaryRecord {
  return {
    focusedRegisters: sortRuntimeMemoryPagesForCli(
      response.focusedRegisters
    ).map(projectRuntimeMemoryPageSummary),
    memoryRoot: response.memoryRoot,
    nodeId: response.nodeId,
    pageCount: response.pages.length,
    taskPageCount: response.taskPages.length,
    taskPages: sortRuntimeMemoryPagesForCli(response.taskPages)
      .slice(0, 12)
      .map(projectRuntimeMemoryPageSummary)
  };
}

export function projectRuntimeMemoryPagePreviewSummary(
  response: RuntimeMemoryPageInspectionResponse
): RuntimeMemoryPagePreviewCliSummaryRecord {
  return {
    page: projectRuntimeMemoryPageSummary(response.page),
    preview: response.preview.available
      ? {
          available: true,
          bytesRead: response.preview.bytesRead,
          contentType: response.preview.contentType,
          sourcePath: response.preview.sourcePath,
          truncated: response.preview.truncated
        }
      : {
          available: false,
          reason: response.preview.reason
        }
  };
}
