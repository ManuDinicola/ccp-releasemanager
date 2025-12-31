import Papa from 'papaparse';
import type { ReleaseNote } from '../types/azureTypes';

export function exportToCSV(
  releaseNotes: ReleaseNote[],
  mainVersion: string
): void {
  const csvData = releaseNotes.map((note) => ({
    Prefix: note.type,
    Id: note.id,
    Content: note.title,
    Description: note.description || '',
    Url: note.url,
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
