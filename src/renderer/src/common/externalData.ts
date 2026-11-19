export interface ExternalCsvData {
  headers: string[];
  columns: number[][];
}

export const parseExternalCsvData = (externalCsvData: string): ExternalCsvData => {
  const lines = externalCsvData
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error('The external CSV data must contain a header and at least one row of numbers.');
  }

  const headers = lines[0]?.split(',').map((header) => header.trim()) ?? [];

  if (headers.length < 2) {
    throw new Error(
      'The external CSV data header must contain at least two columns: one VOI column and one or more data columns.'
    );
  }

  if (!headers[0]) {
    throw new Error('The external CSV data header must have a non-empty VOI column name.');
  }

  if (headers.slice(1).some((header) => !header)) {
    throw new Error('The external CSV data header must have non-empty data column names.');
  }

  const seenHeaders = new Set<string>();

  for (const header of headers.slice(1)) {
    if (seenHeaders.has(header)) {
      throw new Error(`The external CSV data header contains duplicate data column names ('${header}').`);
    }

    seenHeaders.add(header);
  }

  const columns = headers.map(() => [] as number[]);

  for (let rowIndex = 1; rowIndex < lines.length; ++rowIndex) {
    const line = lines[rowIndex];

    if (!line) {
      continue;
    }

    const valueStrings = line.split(',').map((value) => value.trim());

    if (valueStrings.length !== headers.length) {
      throw new Error(
        `The external CSV data row #${String(rowIndex + 1)} does not have the same number of columns as the header (i.e. ${headers.length}, not ${valueStrings.length}).`
      );
    }

    const values = valueStrings.map((trimmedValue, columnIndex) => {
      if (trimmedValue === '') {
        throw new Error(
          `The external CSV data row #${String(rowIndex + 1)} contains an empty value in column #${String(columnIndex + 1)}.`
        );
      }

      return {
        number: Number(trimmedValue),
        string: trimmedValue
      };
    });

    for (const [columnIndex, value] of values.entries()) {
      if (!Number.isFinite(value.number)) {
        throw new Error(
          `The external CSV data row #${String(rowIndex + 1)} contains a non-numeric value ('${value.string}').`
        );
      }

      columns[columnIndex]?.push(value.number);
    }
  }

  return {
    headers,
    columns
  };
};
