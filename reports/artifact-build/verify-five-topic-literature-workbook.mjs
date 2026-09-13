import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/ansh0/OneDrive/Documents/medical research analysis/outputs/five-topic-literature-links/clinical_topics_literature_5_with_links.xlsx";
const input = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(input);
const check = await workbook.inspect({
  kind: "table",
  range: "Literature links!A5:I10",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 9,
});
console.log(check.ndjson);
