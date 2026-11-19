import type { IssuePtrs as WasmIssues } from '@opencor/libopencor-types';

// Logger API.

export enum IssueType {
  ERROR,
  WARNING,
  INFORMATION
}

export interface Issue {
  type: IssueType;
  description: string;
}

// Convert some WASM issues to our issues.
// Note: we take ownership of the given WASM issues, i.e. we release them (and each of the WASM issues they contain)
//       once converted since every access to a WASM vector (and to its elements) yields a new handle that must be
//       deleted.

export const wasmIssuesToIssues = (wasmIssues: WasmIssues): Issue[] => {
  const res: Issue[] = [];

  for (const wasmIssue of wasmIssues) {
    if (!wasmIssue) {
      continue;
    }

    res.push({
      type: wasmIssue.type.value,
      description: wasmIssue.description
    });

    wasmIssue.delete();
  }

  wasmIssues.delete();

  return res;
};
