// Logger API.

export enum EIssueType {
  ERROR,
  WARNING
}

export interface IIssue {
  type: EIssueType
  description: string
}

interface IWasmIssue {
  type: { value: EIssueType }
  description: string
}

export interface IWasmIssues {
  size(): number
  get(index: number): IWasmIssue
}

export function wasmIssuesToIssues(wasmIssues: IWasmIssues): IIssue[] {
  const res = []

  for (let i = 0; i < wasmIssues.size(); ++i) {
    const issue = wasmIssues.get(i)

    res.push({
      type: issue.type.value,
      description: issue.description
    })
  }

  return res
}
