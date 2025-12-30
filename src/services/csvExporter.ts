import Papa from 'papaparse';
import type { ReleaseNote } from '../types/azureTypes';

export function exportToCSV(
  releaseNotes: ReleaseNote[],
  mainVersion: string
): void {
  const csvData = releaseNotes.map((note) => ({
    Type: note.type,
    ID: note.id,
    Title: note.title,
    URL: note.url,
  }));

  const csv = Papa.unparse(csvData, {
    quotes: true,
    header: true,
  });

  // Create a Blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `ReleaseNote-${mainVersion}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
